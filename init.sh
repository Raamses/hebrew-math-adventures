#!/usr/bin/env bash
# HMA (hebrew-math-adventures) — session init / verification gate.
#
#   ./init.sh              install + full gate (lint + tsc + unit)
#   ./init.sh --fast       skip npm install, gates only
#   ./init.sh --with-dev   additionally run the dev server boot check (RUN_START_COMMAND gate)
#
# exit 0 == green. Evidence = this script's output + date, recorded in the commit / vault ADR.
#
# NOTE on lint + unit: this repo carries a KNOWN PRE-EXISTING baseline (524 eslint errors,
# 1 failing unit test). Those are red on main and are NOT session regressions. The gates
# therefore fail on *regression above baseline*, not on absolute zero. New errors still
# block you. Fixing the baseline is its own card; see vault/roadmap/known-issues.md.

set -uo pipefail
cd "$(dirname "$0")"

FAST=0
WITH_DEV=0
for arg in "$@"; do
  case "$arg" in
    --fast) FAST=1 ;;
    --with-dev) WITH_DEV=1 ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

# Recorded baselines (2026-10-05, main @ 3ac8f97). Regenerate only when the
# baseline is intentionally cleared — record the new number in the same commit.
LINT_ERROR_BASELINE=524
UNIT_FAILING_BASELINE=1

# KNOWN FLAKY test files (pre-existing, unrelated to any session's change). A failure
# in one of these is reported as WARN, not FAIL, so the gate stays honest instead of
# going intermittently red. Each entry needs a reason + a card.
#   ParentBlitz — timing-sensitive score assertion; fails ~2 of 3 runs in isolation on
#                  main @ 3ac8f97 (verified 2026-10-05). Card: fix-card-pending.
#   useMemoryGame — load-sensitive "does not flip more than 2 cards"; passes 4/4 in
#                  isolation but failed 1 of 2 full-suite runs on main @ 3ac8f97
#                  (verified 2026-10-05). Card: fix-card-pending.
KNOWN_FLAKY_FILES=(
  "src/components/parent/games/__tests__/ParentBlitz.test.tsx"
  "src/hooks/__tests__/useMemoryGame.test.ts"
)

FAILED=()
RESULTS=()

step() { printf '\n\033[1m=== %s ===\033[0m\n' "$1"; }
ok()   { printf '\033[32m[PASS]\033[0m %s\n' "$1"; RESULTS+=("PASS  $1"); }
bad()  { printf '\033[31m[FAIL]\033[0m %s\n' "$1"; FAILED+=("$1"); RESULTS+=("FAIL  $1"); }

echo "HMA init — $(date -u +%Y-%m-%dT%H:%M:%SZ) — $(git rev-parse --abbrev-ref HEAD 2>/dev/null) @ $(git rev-parse --short HEAD 2>/dev/null)"

# 1. install ---------------------------------------------------------------
if [ "$FAST" -eq 0 ]; then
  step "npm install"
  if [ -f package-lock.json ]; then
    npm ci || npm install
  else
    npm install
  fi
  [ $? -eq 0 ] && ok "install" || bad "install"
else
  RESULTS+=("SKIP  install (--fast)")
  printf '\033[33m[SKIP]\033[0m install (--fast)\n'
fi

# 2. lint (baseline-gated) --------------------------------------------------
step "npm run lint (baseline $LINT_ERROR_BASELINE)"
LINT_OUT=$(npm run lint 2>&1); LINT_RC=$?
LINT_OUT=$(printf '%s' "$LINT_OUT" | sed -r 's/\x1B\[[0-9;]*[mGKHF]//g')
LINT_ERRORS=$(printf '%s' "$LINT_OUT" | grep -oE '[0-9]+ errors?' | tail -1 | grep -oE '^[0-9]+' || echo 0)
LINT_ERRORS=${LINT_ERRORS:-0}
printf '%s\n' "$LINT_OUT" | tail -3
if [ "$LINT_ERRORS" -le "$LINT_ERROR_BASELINE" ]; then
  ok "lint ($LINT_ERRORS errors <= baseline $LINT_ERROR_BASELINE)"
else
  bad "lint ($LINT_ERRORS errors > baseline $LINT_ERROR_BASELINE — NEW errors, fix or scope down)"
  printf '%s\n' "$LINT_OUT" > /tmp/hma-lint-new.log
  printf '  full output: /tmp/hma-lint-new.log\n'
fi

# 3. types -----------------------------------------------------------------
step "tsc -b"
npx tsc -b && ok "types (tsc -b)" || bad "types (tsc -b)"

# 4. unit tests (baseline-gated) -------------------------------------------
step "npm run test"
UNIT_OUT=$(npm run test 2>&1); UNIT_RC=$?
# strip ANSI (vitest dims the "Tests" label) before counting, or the grep misses
UNIT_PLAIN=$(printf '%s' "$UNIT_OUT" | sed -r 's/\x1B\[[0-9;]*[mGKHF]//g')
printf '%s' "$UNIT_PLAIN" | tail -6
UNIT_FAILED=$(printf '%s' "$UNIT_PLAIN" | grep -oE 'Tests +[0-9]+ failed' | grep -oE '[0-9]+' | tail -1)
UNIT_SUMMARY_SEEN=$(printf '%s' "$UNIT_PLAIN" | grep -cE 'Test Files +[0-9]+ (failed|passed)')
if [ -z "$UNIT_FAILED" ] && [ "$UNIT_SUMMARY_SEEN" -eq 0 ]; then
  # No summary line at all => the run crashed, not a clean pass. Never read as green.
  bad "unit (no vitest summary — run crashed or was killed; exit $UNIT_RC)"
  printf '%s' "$UNIT_PLAIN" | tail -25
else
  UNIT_FAILED=${UNIT_FAILED:-0}
  # Split failures into real vs known-flaky-file failures.
  FLAKY_FAILED=0
  for f in "${KNOWN_FLAKY_FILES[@]}"; do
    N=$(printf '%s' "$UNIT_PLAIN" | grep -cE "FAIL +$(printf '%s' "$f" | sed 's/\//\\\//g')")
    FLAKY_FAILED=$((FLAKY_FAILED + N))
  done
  REAL_FAILED=$((UNIT_FAILED - FLAKY_FAILED))
  if [ "$REAL_FAILED" -lt 0 ]; then REAL_FAILED=0; fi
  if [ "$FLAKY_FAILED" -gt 0 ]; then
    printf '\033[33m[WARN]\033[0m %s known-flaky failure(s) in: %s\n' "$FLAKY_FAILED" "${KNOWN_FLAKY_FILES[*]}"
  fi
  if [ "$REAL_FAILED" -le "$UNIT_FAILING_BASELINE" ]; then
    ok "unit ($REAL_FAILED real failing <= baseline $UNIT_FAILING_BASELINE; $FLAKY_FAILED flaky)"
  else
    bad "unit ($REAL_FAILED real failing > baseline $UNIT_FAILING_BASELINE — NEW failures, fix or scope down)"
    printf '%s' "$UNIT_PLAIN" | grep -E 'FAIL|✕' | grep -vF "${KNOWN_FLAKY_FILES[0]}" | head -20
  fi
fi

# 5. dev boot gate (opt-in; only meaningful with a server) ------------------
if [ "$WITH_DEV" -eq 1 ]; then
  step "RUN_START_COMMAND gate (dev server boot)"
  DEV_CMD=$(python3 -c "import json;print(json.load(open('package.json'))['scripts']['dev'])" 2>/dev/null)
  DEV_CMD=${DEV_CMD:-vite}
  printf '  booting: %s\n' "$DEV_CMD"
  PORT=5199
  (npm run dev -- --port "$PORT" > /tmp/hma-dev-boot.log 2>&1 &) ; echo $! > /tmp/hma-dev.pid
  READY=0
  for _ in $(seq 1 40); do
    if curl -sf -o /dev/null "http://localhost:$PORT/"; then READY=1; break; fi
    sleep 0.5
  done
  if [ "$READY" -eq 1 ]; then
    ok "dev server boots and serves / on :$PORT (RUN_START_COMMAND satisfied)"
  else
    bad "dev server did not become ready on :$PORT — see /tmp/hma-dev-boot.log"
    tail -20 /tmp/hma-dev-boot.log
  fi
  pkill -f "vite.*$PORT" 2>/dev/null
  rm -f /tmp/hma-dev.pid
fi

# summary ------------------------------------------------------------------
printf '\n\033[1m=== SUMMARY ===\033[0m\n'
printf '  %s\n' "${RESULTS[@]}"
if [ "${#FAILED[@]}" -eq 0 ]; then
  printf '\n\033[32mINIT GREEN\033[0m — no gate regressed. Evidence: %s @ %s\n' \
    "$(git rev-parse --short HEAD 2>/dev/null)" "$(date -u +%Y-%m-%d)"
  exit 0
fi
printf '\n\033[31mINIT RED\033[0m — failed: %s\n' "${FAILED[*]}"
exit 1