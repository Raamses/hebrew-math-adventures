#!/usr/bin/env bash
#
# deploy.sh — Production deploy for Hebrew Math Adventures (Firebase hosting).
#
# Pipeline:
#   1. Typecheck  (npm run typecheck)
#   2. Unit tests (npm run test)   [skippable via --skip-tests]
#   3. Production build (npm run build)
#   4. Deploy to Firebase hosting only (npx firebase deploy --only hosting)
#
# Usage:
#   npm run deploy                 # full pipeline
#   npm run deploy -- --skip-tests # skip unit tests (quick redeploys)
#
# Exit codes are non-zero on any failure so CI / callers can detect problems.
set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Options
# ---------------------------------------------------------------------------
SKIP_TESTS=0
for arg in "$@"; do
  case "$arg" in
    --skip-tests) SKIP_TESTS=1 ;;
    -h|--help)
      echo "Usage: deploy.sh [--skip-tests]"
      echo "  --skip-tests   Skip the unit-test step (for quick redeploys)."
      exit 0
      ;;
    *) die "Unknown option: $arg (run with --help)" ;;
  esac
done

# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------
command -v npm >/dev/null 2>&1 || die "npm is required but not installed."
# firebase CLI is used via npx so it always resolves from devDependencies.

cd "$(dirname "$0")/.."   # run from project root
PROJECT_ROOT="$(pwd)"
echo "Project root: $PROJECT_ROOT"

# ---------------------------------------------------------------------------
# Step 1: Typecheck
# ---------------------------------------------------------------------------
log "Step 1/4: Running typecheck..."
npm run typecheck
echo "Typecheck passed."

# ---------------------------------------------------------------------------
# Step 2: Unit tests (optional)
# ---------------------------------------------------------------------------
if [[ "$SKIP_TESTS" -eq 1 ]]; then
  echo "Skipping unit tests (--skip-tests)."
else
  log "Step 2/4: Running unit tests..."
  npm run test
  echo "Unit tests passed."
fi

# ---------------------------------------------------------------------------
# Step 3: Production build
# ---------------------------------------------------------------------------
log "Step 3/4: Building production bundle..."
npm run build
[[ -d dist ]] || die "Build produced no dist/ directory — build may have failed silently."
echo "Build complete (dist/ generated)."

# ---------------------------------------------------------------------------
# Step 4: Deploy to Firebase hosting
# ---------------------------------------------------------------------------
log "Step 4/4: Deploying to Firebase hosting..."
npx firebase deploy --only hosting
echo "Deploy complete."

log "Done ✅  Hebrew Math Adventures is live."
