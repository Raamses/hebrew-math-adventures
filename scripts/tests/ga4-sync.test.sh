#!/usr/bin/env bash
# scripts/tests/ga4-sync.test.sh - exercises the origin/main sync step of the REAL
# scripts/ga4-snapshot.sh against throwaway git repos. GA4 is never queried: GOG_BIN
# points at a stub that fails, so the script writes a "query failed" snapshot.
# Hermetic: own git config (GIT_CONFIG_GLOBAL), all repos under a mktemp dir. Bash + git only.
# Exit 0 = every case passed. Run: bash scripts/tests/ga4-sync.test.sh
set -u
SCRIPT="$(cd "$(dirname "$0")/.." && pwd)/ga4-snapshot.sh"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

export GIT_CONFIG_GLOBAL="$WORK/gitconfig" GIT_CONFIG_NOSYSTEM=1 GIT_TERMINAL_PROMPT=0
cat > "$GIT_CONFIG_GLOBAL" <<'CFG'
[user]
	name = ga4-test
	email = ga4-test@example.invalid
[init]
	defaultBranch = main
[advice]
	detachedHead = false
[core]
	autocrlf = false
[commit]
	gpgsign = false
CFG

STUB="$WORK/gog-stub"
printf '#!/usr/bin/env bash\nexit 1\n' > "$STUB"; chmod +x "$STUB"

PREFIX="chore(analytics): daily GA4 snapshot"
fails=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1: $2"; fails=$((fails + 1)); }
g() { git -C "$PI" "$@" </dev/null; }

commit_file() {   # commit_file <repo> <path> <content> <message>
  mkdir -p "$(dirname "$1/$2")"; printf '%s\n' "$3" > "$1/$2"
  git -C "$1" add "$2" && git -C "$1" commit -qm "$4" --no-verify </dev/null
}

setup() {   # fresh origin with 3 commits on main; PI = clone detached 2 behind
  local seed="$WORK/seed-$1"
  ORIGIN="$WORK/origin-$1.git"; PI="$WORK/pi-$1"
  git init -q "$seed"
  commit_file "$seed" README.md base "init"
  commit_file "$seed" vault/decisions/a.md a "docs: a"
  commit_file "$seed" vault/decisions/b.md b "docs: b"
  git clone -q --bare "$seed" "$ORIGIN"
  git clone -q "$ORIGIN" "$PI"
  g checkout -q HEAD~2
}

run_script() { REPO_DIR="$PI" GOG_BIN="$STUB" bash "$SCRIPT" </dev/null 2>&1; }
behind() { g rev-list --count HEAD..origin/main; }
ahead() { g rev-list --count origin/main..HEAD; }

# 1. detached, behind, with local snapshot commits -> rebased on main, all kept
setup s1
commit_file "$PI" vault/snapshots/ga4-2000-01-01.md one "$PREFIX 2000-01-01"
commit_file "$PI" vault/snapshots/ga4-2000-01-02.md two "$PREFIX 2000-01-02"
out=$(run_script)
if [[ $(behind) == 0 && $(ahead) == 3 && -f "$PI/vault/decisions/b.md"       && -f "$PI/vault/snapshots/ga4-2000-01-01.md" && -f "$PI/vault/snapshots/ga4-2000-01-02.md" ]]    && g rev-parse -q --verify refs/backup/ga4-pre-sync >/dev/null && grep -q "Synced:" <<<"$out"; then
  pass "detached + snapshots: rebased onto origin/main, 2 old + today's snapshot kept"
else fail "detached + snapshots" "behind=$(behind) ahead=$(ahead) out=$out"; fi

# 2. on main branch -> synced too
setup s2; g checkout -q main; g reset -q --keep HEAD~2
out=$(run_script)
if [[ $(behind) == 0 ]] && grep -q "Synced:" <<<"$out"; then pass "on main: synced"
else fail "on main" "behind=$(behind) out=$out"; fi

# 3. feature branch checked out -> untouched
setup s3; g checkout -q -b feature/x
commit_file "$PI" src/x.ts x "feat: x"
feat=$(g rev-parse HEAD); out=$(run_script)
# the snapshot itself is still committed on top (pre-existing behaviour); the branch is not rebased
if grep -q "Sync skipped — branch 'feature/x'" <<<"$out" && [[ $(g rev-parse HEAD~1) == "$feat" && $(behind) == 2 ]]; then
  pass "feature branch: skipped, not rebased"
else fail "feature branch" "out=$out"; fi

# 4. detached with a non-snapshot local commit -> skipped
setup s4
commit_file "$PI" src/y.ts y "wip: y"
out=$(run_script)
if grep -q "is not a snapshot commit" <<<"$out" && [[ $(behind) == 2 ]]; then pass "non-snapshot commit: skipped"
else fail "non-snapshot commit" "out=$out"; fi

# 5. snapshot commit that also touches other files -> skipped
setup s5
mkdir -p "$PI/vault/snapshots"; echo s > "$PI/vault/snapshots/ga4-2000-01-03.md"; echo z > "$PI/z.txt"
g add -A; g commit -qm "$PREFIX 2000-01-03" --no-verify
out=$(run_script)
if grep -q "is not a snapshot commit" <<<"$out"; then pass "snapshot commit touching other files: skipped"
else fail "mixed snapshot commit" "out=$out"; fi

# 6. conflict -> rebase aborted, HEAD restored, reason logged
setup s6
seed="$WORK/seed-s6"
commit_file "$seed" vault/snapshots/ga4-2000-01-04.md upstream "$PREFIX 2000-01-04"
git -C "$seed" push -q "$ORIGIN" HEAD:main </dev/null
commit_file "$PI" vault/snapshots/ga4-2000-01-04.md local "$PREFIX 2000-01-04"
out=$(run_script); post=$(g rev-parse HEAD)
backup=$(g rev-parse refs/backup/ga4-pre-sync)
if grep -q "Sync FAILED" <<<"$out" && grep -qi "conflict" <<<"$out" && grep -q "HEAD restored" <<<"$out" \
   && [[ "$post" == "$backup" ]] && [[ -z $(g status --porcelain) ]] \
   && ! ls -d "$PI/.git/rebase-merge" "$PI/.git/rebase-apply" >/dev/null 2>&1; then
  pass "conflict: aborted, HEAD restored, git's reason logged"
else fail "conflict" "out=$out"; fi

# 7. dirty tracked file -> skipped
setup s7; echo dirty >> "$PI/README.md"
out=$(run_script)
if grep -q "uncommitted tracked changes" <<<"$out" && [[ $(behind) == 2 ]]; then pass "dirty tree: skipped"
else fail "dirty tree" "out=$out"; fi

# 8. fetch fails -> skipped, exit 0
setup s8; g remote set-url origin "$WORK/missing.git"
out=$(run_script); rc=$?
if grep -q "git fetch origin main failed" <<<"$out" && [[ $rc == 0 ]]; then pass "fetch fails: skipped, exit 0"
else fail "fetch fails" "rc=$rc out=$out"; fi

echo
[[ $fails == 0 ]] && echo "ga4-sync: PASS" || echo "ga4-sync: FAIL ($fails)"
exit $(( fails > 0 ))
