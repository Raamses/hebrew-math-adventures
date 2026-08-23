#!/bin/bash
# Stability validation: 3 consecutive full E2E runs at workers:3.
# Captures per-run JSON so we can diff WHICH tests failed across runs.
# A test that fails in one run and passes in another = shared-state leakage.

cd /Users/admin/hebrew-math-adventures || exit 1

OUT=/tmp/e2e-stability
mkdir -p "$OUT"

for i in 1 2 3; do
  echo "=============================================="
  echo "RUN $i/3 starting at $(date '+%H:%M:%S')"
  echo "=============================================="

  START=$(date +%s)
  npx playwright test \
    --workers=3 \
    --reporter=json \
    > "$OUT/run$i.json" 2> "$OUT/run$i.stderr"
  EXIT=$?
  END=$(date +%s)

  echo "RUN $i exit=$EXIT duration=$(( END - START ))s"

  # Extract pass/fail counts + names of any non-passing tests
  python3 - "$OUT/run$i.json" "$i" <<'PY'
import json, sys
path, run = sys.argv[1], sys.argv[2]
try:
    with open(path) as f:
        d = json.load(f)
except Exception as e:
    print(f"  RUN {run}: could not parse JSON ({e})")
    sys.exit(0)

st = d.get('stats', {})
print(f"  expected={st.get('expected',0)} unexpected={st.get('unexpected',0)} flaky={st.get('flaky',0)} skipped={st.get('skipped',0)}")

bad = []
def walk(suites):
    for s in suites or []:
        for spec in s.get('specs', []) or []:
            for t in spec.get('tests', []) or []:
                if t.get('status') not in ('expected',):
                    bad.append(f"{s.get('file','?')} :: {spec.get('title','?')} [{t.get('status')}]")
        walk(s.get('suites'))
walk(d.get('suites'))

if bad:
    print(f"  NON-PASSING in run {run}:")
    for b in sorted(set(bad)):
        print(f"    - {b}")
else:
    print(f"  RUN {run}: all green")
PY
  echo ""
done

echo "=============================================="
echo "CROSS-RUN COMPARISON (flake detection)"
echo "=============================================="
python3 - "$OUT" <<'PY'
import json, os, sys
out = sys.argv[1]
runs = {}
for i in (1, 2, 3):
    p = os.path.join(out, f"run{i}.json")
    if not os.path.exists(p):
        continue
    try:
        d = json.load(open(p))
    except Exception:
        continue
    status = {}
    def walk(suites):
        for s in suites or []:
            for spec in s.get('specs', []) or []:
                for t in spec.get('tests', []) or []:
                    key = f"{s.get('file','?')} :: {spec.get('title','?')}"
                    status[key] = t.get('status')
            walk(s.get('suites'))
    walk(d.get('suites'))
    runs[i] = status

if len(runs) < 2:
    print("Not enough runs captured to compare.")
    sys.exit(0)

all_keys = set()
for s in runs.values():
    all_keys |= set(s.keys())

nondeterministic = []
always_fail = []
for k in sorted(all_keys):
    vals = [runs[i].get(k, 'missing') for i in sorted(runs)]
    uniq = set(vals)
    if len(uniq) > 1:
        nondeterministic.append((k, vals))
    elif uniq and 'expected' not in uniq:
        always_fail.append((k, vals[0]))

if nondeterministic:
    print("\n!! NON-DETERMINISTIC — status differed across runs !!")
    print("   This means ONLY that the result was not reproducible.")
    print("   It does NOT by itself imply shared-state leakage. Rank causes:")
    print("     1. Math.random() in the code under test (most common)")
    print("     2. Timing/rAF sensitivity under CPU contention")
    print("     3. Wall-clock or date dependence")
    print("     4. Shared state across tests/workers (localStorage, singletons)")
    print("   Read the failure before assuming (4).")
    for k, vals in nondeterministic:
        print(f"  {k}")
        print(f"    -> {vals}")
else:
    print("\nNo non-deterministic tests across runs.")

if always_fail:
    print("\nCONSISTENTLY FAILING (real bug, not flake):")
    for k, v in always_fail:
        print(f"  {k} [{v}]")
PY
