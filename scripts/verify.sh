#!/usr/bin/env bash
# scripts/verify.sh - the repo's own PR gate. CI (.github/workflows/pr-checks.yml) and the agent fleet's
# ci-in-container both run exactly this, so "green" means the same thing everywhere.
#
# Blocking:      typecheck, unit (vitest), build, e2e smoke against THIS checkout's build.
# Non-blocking:  lint (eslint). It runs and its summary is printed, but it never fails the gate
#                (Ram, 2026-10-17: main has ~144 lint errors; a separate cleanup card fixes them).
#
# The e2e smoke serves dist/ with `vite preview` on 127.0.0.1 and points the specs at it through
# E2E_BASE_URL (read by playwright.config.ts and e2e/helpers.ts), so it tests the PR's own code, never
# the deployed production site. The specs it runs are listed in e2e/pr-smoke.list.
#
# Every step runs even after an earlier one failed (one run shows everything); e2e is skipped only when
# the build failed. Exit 0 = every blocking step passed.
#
# Knobs: VERIFY_E2E=0 skips the e2e smoke. E2E_PORT (default 4173). E2E_WORKERS overrides the
# Playwright worker count (the config uses 1 whenever E2E_BASE_URL is set).
# Needs a Playwright chromium for the installed @playwright/test (CI: `npx playwright install chromium`).
set -u
cd "$(dirname "$0")/.." || exit 2

fail=0
summary=()
stamp() { date +%s; }
T0=$(stamp)

step() {   # step <name> <command...>; blocking
  local name=$1; shift
  local s; s=$(stamp)
  echo "=== verify: $name: $*"
  if "$@"; then
    summary+=("PASS  $name ($(( $(stamp) - s ))s)")
  else
    summary+=("FAIL  $name ($(( $(stamp) - s ))s)")
    fail=1
  fi
}

lint_report() {   # never fails the gate
  local s out rc line
  s=$(stamp)
  echo "=== verify: lint (non-blocking): npm run lint"
  out=$(npm run --silent lint 2>&1); rc=$?
  line=$(printf '%s\n' "$out" | grep -E '[0-9]+ problems? \(' | tail -1)
  if [ $rc -eq 0 ]; then
    summary+=("PASS  lint ($(( $(stamp) - s ))s)")
  else
    printf '%s\n' "$out" | grep -E '^\s+[0-9]+:[0-9]+\s+error' | awk '{print $NF}' | sort | uniq -c | sort -rn | head -10 \
      | sed 's/^/  lint rule: /'
    summary+=("WARN  lint, non-blocking: ${line:-eslint exit $rc} ($(( $(stamp) - s ))s)")
  fi
}

PREVIEW_PID=""
stop_preview() { [ -n "$PREVIEW_PID" ] && kill "$PREVIEW_PID" 2>/dev/null; PREVIEW_PID=""; }
trap stop_preview EXIT

e2e_smoke() {
  local port=${E2E_PORT:-4173} base specs i
  base="http://127.0.0.1:$port"
  specs=$(grep -vE '^\s*(#|$)' e2e/pr-smoke.list | awk '{print $1}')
  [ -n "$specs" ] || { echo "e2e/pr-smoke.list lists no specs"; return 1; }
  npx vite preview --host 127.0.0.1 --port "$port" --strictPort > /tmp/verify-preview.log 2>&1 &
  PREVIEW_PID=$!
  for i in $(seq 1 60); do
    node -e "fetch('$base/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" && break
    kill -0 "$PREVIEW_PID" 2>/dev/null || { echo "vite preview exited:"; cat /tmp/verify-preview.log; return 1; }
    sleep 1
  done
  [ "$i" -lt 60 ] || { echo "vite preview did not answer on $base in 60s"; cat /tmp/verify-preview.log; return 1; }
  echo "serving dist/ at $base"
  # shellcheck disable=SC2086  # one spec path per word
  E2E_BASE_URL=$base npx playwright test --project=mobile-chrome --reporter=list \
    ${E2E_WORKERS:+--workers=$E2E_WORKERS} $specs
  local rc=$?
  stop_preview
  return $rc
}

step typecheck npm run --silent typecheck
step unit npx vitest run
step build npm run --silent build
case "${summary[-1]}" in FAIL*) build_ok=1 ;; *) build_ok=0 ;; esac
lint_report
if [ "${VERIFY_E2E:-1}" = 0 ]; then
  summary+=("SKIP  e2e-smoke (VERIFY_E2E=0)")
elif [ "$build_ok" -ne 0 ]; then
  summary+=("FAIL  e2e-smoke (not run: the build failed)")
  fail=1
else
  step e2e-smoke e2e_smoke
fi

echo
echo "=== verify summary ($(( $(stamp) - T0 ))s total)"
printf '  %s\n' "${summary[@]}"
[ $fail -eq 0 ] && echo "verify: PASS" || echo "verify: FAIL"
exit $fail
