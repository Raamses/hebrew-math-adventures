#!/bin/bash
# Run each spec file individually with timeout, capture results
RESULTS_FILE="test-results/summary_$(date +%Y%m%d_%H%M%S).txt"
mkdir -p test-results

echo "E2E Test Summary — $(date)" > "$RESULTS_FILE"
echo "========================================" >> "$RESULTS_FILE"

TOTAL=0
PASSED=0
FAILED=0

for spec in e2e/*.spec.ts; do
    TOTAL=$((TOTAL + 1))
    name=$(basename "$spec")
    echo -n "Running $name ... "
    
    timeout 120 npx playwright test "$spec" --reporter=dot 2>&1 | tail -3 > "/tmp/test_out.txt"
    exit_code=$?
    
    if grep -q "passed" /tmp/test_out.txt && ! grep -q "failed" /tmp/test_out.txt; then
        echo "✓ PASS"
        echo "  ✓ $name" >> "$RESULTS_FILE"
        PASSED=$((PASSED + 1))
    else
        # Extract failure reason
        reason=$(grep -E "Error:|failed" /tmp/test_out.txt | head -1)
        echo "✗ FAIL: $reason"
        echo "  ✗ $name: $reason" >> "$RESULTS_FILE"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "========================================"
echo "Total: $TOTAL | Passed: $PASSED | Failed: $FAILED"
echo "========================================"
echo "Total: $TOTAL | Passed: $PASSED | Failed: $FAILED" >> "$RESULTS_FILE"
