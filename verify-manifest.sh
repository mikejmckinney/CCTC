#!/usr/bin/env bash
# verify-manifest.sh — Verifies that the React implementation matches the component manifest.
# Checks:
#   1. Every CSS class listed in the manifest exists in app.css
#   2. Every CSS class listed in the manifest is used in at least one React component
#   3. Every CSS token referenced in the manifest exists in app.css :root
#   4. Prototype SVG paths match what's in the React components
#
# Usage: ./verify-manifest.sh
# Exit: 0 = all checks pass, 1 = mismatches found

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MANIFEST="$SCRIPT_DIR/component-manifest.md"
CSS_FILE="$SCRIPT_DIR/src/app.css"
COMPONENTS_DIR="$SCRIPT_DIR/src/components"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

errors=0
warnings=0

log_ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
log_fail() { echo -e "  ${RED}✗${NC} $1"; errors=$((errors + 1)); }
log_warn() { echo -e "  ${YELLOW}⚠${NC} $1"; warnings=$((warnings + 1)); }

# ──────────────────────────────────────────────
# 1. Extract CSS classes from manifest
# ──────────────────────────────────────────────
echo "━━━ CCTC Manifest Verification ━━━"
echo ""
echo "1. Checking CSS classes in app.css..."

# Extract class names from manifest: match `.classname` patterns
manifest_classes=$(grep -oE '\.[a-zA-Z][a-zA-Z0-9_-]+' "$MANIFEST" \
  | sed 's/^\.//' \
  | sort -u \
  | grep -vE '^(html|css|svg|tsx|ts|js|json|section|div|span|button|table|thead|tbody|tr|td|th|nav|header|a|h[1-6]|p|ul|li|ol|small|strong|article|label|select|option|input|textarea|img|md|sh|md)$')

for cls in $manifest_classes; do
  # Skip CSS property-like names and non-class tokens
  if [[ "$cls" =~ ^(px|rem|em|ch|fr|ms|ease|none|auto|grid|flex|block|inline|relative|absolute|fixed|sticky|column|row|wrap|nowrap|center|left|right|space-between|space-around|normal|bold|italic|uppercase|lowercase|capitalize|hidden|visible|scroll|pointer|border-box|content-box|fill|stroke|round|collapse|separate)$ ]]; then
    continue
  fi

  # Check in app.css
  if ! grep -q "\.$cls" "$CSS_FILE" 2>/dev/null; then
    log_fail "CSS class .$cls NOT found in app.css"
  else
    log_ok "CSS class .$cls found in app.css"
  fi
done

# ──────────────────────────────────────────────
# 2. Check CSS classes used in React components
# ──────────────────────────────────────────────
echo ""
echo "2. Checking CSS classes used in React components..."

# Dashboard-specific classes that must appear in Dashboard.tsx
dashboard_classes=(
  "readiness-hero" "readiness-gauge" "gauge-bg" "gauge-fill" "gauge-label"
  "gauge-score" "gauge-unit" "readiness-content" "readiness-stats"
  "rs-item" "rs-label" "rs-value"
  "section-label" "quickstart-grid" "qs-card" "qs-icon-row" "qs-icon" "qs-badge"
  "two-col" "module-card"
  "cat-row" "cat-indicator" "cat-info" "cat-name" "cat-bar-outer" "cat-bar-inner"
  "cat-right" "cat-pct" "cat-tag"
  "insight-list" "insight-row" "insight-pip"
  "plan-section" "plan-card" "plan-badge" "plan-body" "plan-btn"
  "history-section" "history-header" "view-all" "history-table" "score-badge" "mode-pill"
)

for cls in "${dashboard_classes[@]}"; do
  # Simple: does the class name appear anywhere in the file?
  if grep -q "$cls" "$COMPONENTS_DIR/Dashboard.tsx" 2>/dev/null; then
    log_ok "Dashboard.tsx uses class '$cls'"
  else
    log_fail "Dashboard.tsx does NOT use class '$cls'"
  fi
done

# Header classes
header_classes=("header-brand" "nav-pills" "pill" "header-actions" "icon-btn" "nav-mobile" "nav-mobile-btn")
for cls in "${header_classes[@]}"; do
  # Simple: does the class name appear anywhere in the file?
  if grep -q "$cls" "$COMPONENTS_DIR/Header.tsx" 2>/dev/null; then
    log_ok "Header.tsx uses class '$cls'"
  else
    log_fail "Header.tsx does NOT use class '$cls'"
  fi
done

# ──────────────────────────────────────────────
# 3. Check CSS tokens in :root
# ──────────────────────────────────────────────
echo ""
echo "3. Checking CSS tokens defined in app.css..."

required_tokens=(
  "--bg" "--surface" "--surface-raised" "--fg" "--fg-secondary" "--muted" "--border"
  "--brand" "--brand-soft" "--accent" "--accent-soft"
  "--success" "--success-soft" "--warning" "--warning-soft" "--danger" "--danger-soft"
  "--font-display" "--font-body" "--font-mono"
  "--radius" "--radius-sm" "--shadow-sm" "--shadow"
)

for token in "${required_tokens[@]}"; do
  # Match the token being DEFINED (e.g. "  --bg: ...") not just referenced in var()
  if grep -qE "^\s*${token}:" "$CSS_FILE" 2>/dev/null; then
    log_ok "Token $token defined in app.css"
  else
    log_fail "Token $token NOT defined in app.css"
  fi
done

# ──────────────────────────────────────────────
# 4. Check dark mode tokens
# ──────────────────────────────────────────────
echo ""
echo "4. Checking dark mode tokens..."

if grep -q '\[data-theme="dark"\]' "$CSS_FILE" 2>/dev/null; then
  log_ok "Dark mode [data-theme=\"dark\"] block exists"
else
  log_fail "Dark mode [data-theme=\"dark\"] block NOT found in app.css"
fi

# ──────────────────────────────────────────────
# 5. Check prototype SVG paths
# ──────────────────────────────────────────────
echo ""
echo "5. Checking SVG icons in Dashboard.tsx..."

# Full Exam icon
if grep -q 'M9 3v18M3 9h18' "$COMPONENTS_DIR/Dashboard.tsx" 2>/dev/null; then
  log_ok "Full Exam SVG path present"
else
  log_fail "Full Exam SVG path (M9 3v18M3 9h18) NOT found in Dashboard.tsx"
fi

# Quick Session icon
if grep -q 'M12 7v5l3 3' "$COMPONENTS_DIR/Dashboard.tsx" 2>/dev/null; then
  log_ok "Quick Session SVG path present"
else
  log_fail "Quick Session SVG path (M12 7v5l3 3) NOT found in Dashboard.tsx"
fi

# Weak Areas icon
if grep -q 'M12 2L2 7l10 5 10-5-10-5z' "$COMPONENTS_DIR/Dashboard.tsx" 2>/dev/null; then
  log_ok "Weak Areas SVG path present"
else
  log_fail "Weak Areas SVG path (M12 2L2 7l10 5 10-5-10-5z) NOT found in Dashboard.tsx"
fi

# Last Settings icon
if grep -q 'points="20 6 9 17 4 12"' "$COMPONENTS_DIR/Dashboard.tsx" 2>/dev/null; then
  log_ok "Last Settings SVG path present"
else
  log_fail "Last Settings SVG path (polyline points 20 6 9 17 4 12) NOT found in Dashboard.tsx"
fi

# ──────────────────────────────────────────────
# 6. Check responsive breakpoint
# ──────────────────────────────────────────────
echo ""
echo "6. Checking responsive breakpoint..."

if grep -q 'max-width: 640px' "$CSS_FILE" 2>/dev/null; then
  log_ok "Mobile breakpoint (640px) exists in app.css"
else
  log_fail "Mobile breakpoint (max-width: 640px) NOT found in app.css"
fi

# ──────────────────────────────────────────────
# 7. Check shell width
# ──────────────────────────────────────────────
echo ""
echo "7. Checking shell max-width..."

if grep -q 'max-width: 940px' "$CSS_FILE" 2>/dev/null; then
  log_ok "Shell max-width 940px matches prototype"
else
  log_fail "Shell max-width is NOT 940px (prototype uses 940px)"
fi

# ──────────────────────────────────────────────
# 8. Check font families
# ──────────────────────────────────────────────
echo ""
echo "8. Checking font families..."

if grep -q "Fraunces" "$CSS_FILE" 2>/dev/null; then
  log_ok "Fraunces display font referenced in app.css"
else
  log_fail "Fraunces display font NOT found in app.css"
fi

if grep -q "IBM Plex Sans" "$CSS_FILE" 2>/dev/null; then
  log_ok "IBM Plex Sans body font referenced in app.css"
else
  log_fail "IBM Plex Sans body font NOT found in app.css"
fi

# ──────────────────────────────────────────────
# 9. Check key structural patterns in Dashboard
# ──────────────────────────────────────────────
echo ""
echo "9. Checking Dashboard structural patterns..."

# Gauge SVG with correct dimensions
if grep -q 'width="130".*height="130"' "$COMPONENTS_DIR/Dashboard.tsx" 2>/dev/null || \
   grep -q 'height="130".*width="130"' "$COMPONENTS_DIR/Dashboard.tsx" 2>/dev/null; then
  log_ok "Gauge SVG uses 130x130 dimensions"
else
  log_fail "Gauge SVG does NOT use 130x130 dimensions (prototype uses 130x130)"
fi

# Gauge circumfernce
if grep -q '245' "$COMPONENTS_DIR/Dashboard.tsx" 2>/dev/null; then
  log_ok "Gauge circumference 245 present"
else
  log_fail "Gauge circumference 245 NOT found in Dashboard.tsx"
fi

# r=52 (gauge radius)
if grep -q 'r="52"' "$COMPONENTS_DIR/Dashboard.tsx" 2>/dev/null; then
  log_ok "Gauge radius r=52 matches prototype"
else
  log_fail "Gauge radius r=52 NOT found (prototype uses r=52)"
fi

# rotate(135deg) in CSS
if grep -q 'rotate(135deg)' "$CSS_FILE" 2>/dev/null; then
  log_ok "Gauge rotation 135deg in CSS"
else
  log_fail "Gauge rotation rotate(135deg) NOT found in app.css"
fi

# ──────────────────────────────────────────────
# 10. Check reported items naming
# ──────────────────────────────────────────────
echo ""
echo "10. Checking 'Reported items' naming..."

if grep -qi "reported.items" "$COMPONENTS_DIR/HistoryPage.tsx" 2>/dev/null; then
  log_ok "HistoryPage.tsx references 'Reported items'"
else
  log_fail "HistoryPage.tsx does NOT reference 'Reported items'"
fi

if grep -qi "report.item" "$COMPONENTS_DIR/SessionView.tsx" 2>/dev/null; then
  log_ok "SessionView.tsx uses 'Report item' (not 'Flag')"
else
  log_fail "SessionView.tsx does NOT use 'Report item'"
fi

if [[ -f "$COMPONENTS_DIR/ReportedItems.tsx" ]]; then
  log_ok "ReportedItems.tsx component exists"
else
  log_fail "ReportedItems.tsx component NOT found"
fi

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $errors -eq 0 ]]; then
  echo -e "${GREEN}All checks passed.${NC} ($warnings warnings)"
  exit 0
else
  echo -e "${RED}$errors failures${NC}, $warnings warnings"
  echo ""
  echo "Fix failures before shipping. Update component-manifest.md if the spec changed."
  exit 1
fi
