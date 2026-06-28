#!/usr/bin/env bash
# Visual regression check: compares prototype to React app.
# Captures screenshots of both, creates side-by-side comparisons,
# and diffs CSS class names between prototype and React source.
#
# Prerequisites:
#   - npx playwright install chromium (run once, ~150MB)
#   - npm install (node_modules present)
#
# Usage: ./visual-regression.sh
#
# The script will:
#   1. Auto-start the dev server if not already running
#   2. Wait for it to be ready
#   3. Capture full-page screenshots of prototype and React app at 940px + 390px
#   4. Create side-by-side comparison images (requires ImageMagick)
#   5. Diff CSS class names between prototype and React source
#
# All steps are required — screenshots are the primary output, not optional.
# The dev server is shut down automatically if the script started it.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

PROTO="direction-3-warm-productive.html"
REACT_URL="${REACT_URL:-http://localhost:5173}"
OUT_DIR="visual-regression"
FAIL=0
STARTED_SERVER=false

if [[ ! -f "$PROTO" ]]; then echo "Prototype not found: $PROTO" >&2; exit 1; fi

# Cleanup: shut down dev server if we started it
cleanup() {
  if $STARTED_SERVER && [[ -n "${DEV_PID:-}" ]]; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
    echo "Stopped dev server (PID $DEV_PID)"
  fi
}
trap cleanup EXIT

echo "=== Visual Regression Check ==="
echo ""

# --- Ensure Playwright + Chromium browser is installed ---
echo "Checking Playwright setup..."
# Verify Chromium binary exists in the Playwright cache
CHROMIUM_CACHE="$HOME/Library/Caches/ms-playwright"
if [[ "$(uname)" == "Linux" ]]; then
  CHROMIUM_CACHE="$HOME/.cache/ms-playwright"
fi
CHROMIUM_INSTALLED=false
if ls "$CHROMIUM_CACHE"/chromium*/*/chrome* &>/dev/null 2>&1; then
  CHROMIUM_INSTALLED=true
fi
if ! $CHROMIUM_INSTALLED; then
  echo "Installing Playwright Chromium browser (~150MB, one-time)..."
  npx playwright install chromium
fi

# --- Auto-start dev server if needed ---
SERVER_UP=false
if curl -s --connect-timeout 2 "$REACT_URL" >/dev/null 2>&1; then
  SERVER_UP=true
  echo "Dev server already running at $REACT_URL"
else
  echo "Starting dev server..."
  npm run dev &>/dev/null &
  DEV_PID=$!
  STARTED_SERVER=true

  # Wait up to 30 seconds for the server
  for i in $(seq 1 30); do
    if curl -s --connect-timeout 1 "$REACT_URL" >/dev/null 2>&1; then
      SERVER_UP=true
      break
    fi
    sleep 1
  done

  if $SERVER_UP; then
    echo "Dev server started (PID $DEV_PID)"
  else
    echo "❌ Dev server failed to start within 30s" >&2
    exit 1
  fi
fi
echo ""

# --- Step 1: Capture prototype screenshots ---
mkdir -p "$OUT_DIR"
PROTO_ABS="$(cd "$(dirname "$PROTO")" && pwd)/$(basename "$PROTO")"

echo "1/4 Capturing prototype screenshots..."
npx playwright screenshot --browser chromium --viewport-size "940,800" \
  "file://$PROTO_ABS" "$OUT_DIR/proto-desktop.png" 2>/dev/null
npx playwright screenshot --browser chromium --viewport-size "390,844" \
  "file://$PROTO_ABS" "$OUT_DIR/proto-mobile.png" 2>/dev/null
npx playwright screenshot --browser chromium --viewport-size "940,800" --full-page \
  "file://$PROTO_ABS" "$OUT_DIR/proto-desktop-full.png" 2>/dev/null
npx playwright screenshot --browser chromium --viewport-size "390,844" --full-page \
  "file://$PROTO_ABS" "$OUT_DIR/proto-mobile-full.png" 2>/dev/null
echo "  ✓ proto-desktop.png, proto-mobile.png"
echo "  ✓ proto-desktop-full.png, proto-mobile-full.png"
echo ""

# --- Step 2: Capture React app screenshots ---
echo "2/4 Capturing React app screenshots..."
npx playwright screenshot --browser chromium --viewport-size "940,800" \
  "$REACT_URL" "$OUT_DIR/react-desktop.png" 2>/dev/null
npx playwright screenshot --browser chromium --viewport-size "390,844" \
  "$REACT_URL" "$OUT_DIR/react-mobile.png" 2>/dev/null
npx playwright screenshot --browser chromium --viewport-size "940,800" --full-page \
  "$REACT_URL" "$OUT_DIR/react-desktop-full.png" 2>/dev/null
npx playwright screenshot --browser chromium --viewport-size "390,844" --full-page \
  "$REACT_URL" "$OUT_DIR/react-mobile-full.png" 2>/dev/null
echo "  ✓ react-desktop.png, react-mobile.png"
echo "  ✓ react-desktop-full.png, react-mobile-full.png"
echo ""

# --- Step 3: Side-by-side comparisons ---
echo "3/4 Creating side-by-side comparisons..."
if command -v convert &>/dev/null; then
  for mode in desktop mobile; do
    for suffix in "" "-full"; do
      proto_img="$OUT_DIR/proto-${mode}${suffix}.png"
      react_img="$OUT_DIR/react-${mode}${suffix}.png"
      combined="$OUT_DIR/compare-${mode}${suffix}.png"
      if [[ -f "$proto_img" && -f "$react_img" ]]; then
        convert "$proto_img" "$react_img" +append "$combined" 2>/dev/null || true
        echo "  → $combined"
      fi
    done
  done
else
  echo "  ImageMagick not found — skipping side-by-side images."
  echo "  Install: brew install imagemagick"
fi
echo ""

# --- Step 4: Class-name diff from source files ---
echo "4/4 DOM structure comparison..."

# Extract CSS class names from the prototype's <style> block
PROTO_CSS_CLASSES=$(sed -n '/<style>/,/<\/style>/p' "$PROTO" | grep -oE '\.[a-zA-Z][a-zA-Z0-9_-]*' | sed 's/^\.//' | sort -u)

MISSING=""
for cls in $PROTO_CSS_CLASSES; do
  # Skip single-letter or pseudo-state-only classes
  if [[ ${#cls} -le 2 ]]; then continue; fi
  # Skip known prototype-only classes
  if [[ "$cls" == "direction-label" || "$cls" == "header" || "$cls" == "footer" || "$cls" == "exam" || "$cls" == "study" || "$cls" == "focus" || "$cls" == "active" || "$cls" == "pass" || "$cls" == "info" || "$cls" == "good" || "$cls" == "low" || "$cls" == "mid" || "$cls" == "weak" || "$cls" == "strong" || "$cls" == "positive" || "$cls" == "warn" || "$cls" == "teal" || "$cls" == "green" || "$cls" == "amber" || "$cls" == "orange" ]]; then continue; fi
  if ! grep -rql "$cls" src/components/ src/app/ 2>/dev/null; then
    MISSING="${MISSING}  ${cls}\n"
  fi
done

if [[ -n "$MISSING" ]]; then
  echo "Prototype CSS classes NOT found in React source:"
  echo -e "$MISSING"
  FAIL=$((FAIL + 1))
else
  echo "All prototype CSS classes found in React source."
fi

echo ""
echo "Screenshots saved to $OUT_DIR/"
echo ""

if [[ $FAIL -eq 0 ]]; then
  echo "✅ Visual regression passed"
  echo ""
  echo "Review the side-by-side images in $OUT_DIR/ to verify visual fidelity."
else
  echo "❌ Visual regression: $FAIL class discrepancies found"
fi
exit "$FAIL"
