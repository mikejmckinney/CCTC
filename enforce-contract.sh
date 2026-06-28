#!/usr/bin/env bash
# Master enforcement script — runs all contract checks.
# Usage: ./enforce-contract.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

PASS=0
FAIL=0
RESULTS=""

run_check() {
  local name="$1"
  local cmd="$2"
  echo "━━━ $name ━━━"
  if output=$(eval "$cmd" 2>&1); then
    RESULTS="${RESULTS}✅ ${name}\n"
    PASS=$((PASS + 1))
    echo "$output"
  else
    RESULTS="${RESULTS}❌ ${name}\n"
    FAIL=$((FAIL + 1))
    echo "$output"
  fi
  echo ""
}

run_check "1. Component Manifest Verification" "./verify-manifest.sh"
run_check "2. CSS Sync (prototype → app.css)" "./css-sync-check.sh"
run_check "3. Prototype Section Skeletons" "./prototype-section-extractor.sh"
run_check "4. Visual Regression (prototype vs React)" "./visual-regression.sh"

echo "━━━ Summary ━━━"
echo -e "$RESULTS"
echo "$PASS passed, $FAIL failed"
if [[ $FAIL -eq 0 ]]; then
  echo "✅ All contract checks pass"
else
  echo "❌ Contract violations found — fix before shipping"
fi
exit "$FAIL"
