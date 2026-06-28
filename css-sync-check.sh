#!/usr/bin/env bash
# Extracts CSS class rules from the prototype's <style> block and verifies
# each is defined in app.css. This catches real CSS drift, not HTML text noise.
# Usage: ./css-sync-check.sh [prototype.html] [app.css]

set -euo pipefail

PROTO="${1:-direction-3-warm-productive.html}"
CSS="${2:-src/app.css}"
FAIL=0
PASS=0

if [[ ! -f "$PROTO" ]]; then echo "Prototype not found: $PROTO" >&2; exit 1; fi
if [[ ! -f "$CSS" ]]; then echo "CSS not found: $CSS" >&2; exit 1; fi

# Extract class selectors from the prototype's <style> block only
# This catches .foo { } patterns — the real CSS contract
# SKIP_LIST: classes exempted from sync check
# - direction-label: prototype-only marker tag, not part of product UI
# - footer: renamed to .app-footer in React (different sticky pattern)
SKIP_LIST="direction-label footer"

proto_rules=$(python3 -c "
import re, sys
with open('$PROTO') as f:
    html = f.read()
# Grab everything between <style> and </style>
styles = re.findall(r'<style[^>]*>(.*?)</style>', html, re.DOTALL)
for block in styles:
    # Find .classname selectors (not inside comments)
    classes = re.findall(r'\.([a-zA-Z][a-zA-Z0-9_-]*)', block)
    for c in sorted(set(classes)):
        print(c)
")

count=$(echo "$proto_rules" | wc -l | tr -d ' ')
echo "Checking $count CSS rules from prototype <style> against $CSS..."
echo ""

while IFS= read -r cls; do
  [[ -z "$cls" ]] && continue
  # Skip prototype-only artifacts listed in SKIP_LIST
  if echo "$SKIP_LIST" | tr ' ' '\n' | grep -qx "$cls" 2>/dev/null; then
    continue
  fi
  # Check if the class is defined as a CSS rule in app.css
  # Just check if .classname appears anywhere — close enough for contract checking
  if grep -q "\.${cls}" "$CSS" 2>/dev/null; then
    PASS=$((PASS + 1))
  else
    echo "  MISSING: .$cls (defined in prototype but not in app.css)"
    FAIL=$((FAIL + 1))
  fi
done <<< "$proto_rules"

echo ""
echo "Results: $PASS defined, $FAIL missing"
if [[ $FAIL -eq 0 ]]; then
  echo "✅ CSS sync: all prototype CSS rules exist in app.css"
else
  echo "❌ CSS sync: $FAIL prototype rules missing from app.css"
fi
exit "$FAIL"
