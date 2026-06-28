#!/usr/bin/env bash
# Extracts component skeletons from prototype HTML sections.
# Usage: ./prototype-section-extractor.sh [prototype.html]
# Outputs: component-skeletons.md — maps each major section to a React component template.

set -euo pipefail

PROTO="${1:-direction-3-warm-productive.html}"
OUT="component-skeletons.md"

if [[ ! -f "$PROTO" ]]; then
  echo "Prototype not found: $PROTO" >&2
  exit 1
fi

cat > "$OUT" <<'HEADER'
# Component Skeletons

Generated from prototype HTML. Each section below shows the **exact markup**
that the React component must reproduce. Class names are the contract —
do not rename or restructure.

## How to use
1. For each section below, create a React component that renders the exact HTML structure.
2. Use the class names verbatim — the CSS depends on them.
3. Wire interactivity after the static structure matches.

---

HEADER

# Extract sections between comments or semantic containers
# We look for major structural blocks: .readiness-hero, .qs-grid, .two-col, etc.
python3 - "$PROTO" "$OUT" <<'PY'
import re, sys

proto = sys.argv[1]
out = sys.argv[2]

with open(proto) as f:
    html = f.read()

# Find major class-bearing divs that map to components
sections = [
    ("Header", r'(<header class="header".*?</header>)'),
    ("ReadinessHero", r'(<div class="readiness-hero".*?</div>\s*</div>\s*</div>)'),
    ("QuickStartGrid", r'(<div class="qs-grid".*?</div>\s*</div>)'),
    ("CategoryBreakdown", r'(<div class="cat-section".*?</div>\s*</div>\s*</div>)'),
    ("AmIReadyInsights", r'(<div class="insights".*?</div>\s*</div>\s*</div>)'),
    ("StudyPlan", r'(<div class="plan-card".*?</div>\s*</div>)'),
    ("SessionHistory", r'(<div class="history-card".*?</div>\s*</div>\s*</div>)'),
]

with open(out, 'a') as f:
    for name, pattern in sections:
        m = re.search(pattern, html, re.DOTALL)
        if m:
            snippet = m.group(1).strip()
            # Truncate overly long sections
            lines = snippet.split('\n')
            if len(lines) > 60:
                snippet = '\n'.join(lines[:60]) + '\n  <!-- ... truncated, see prototype for full markup -->'
            f.write(f"### {name}\n\n```html\n{snippet}\n```\n\n")
            f.write(f"**React component**: `{name}.tsx`\n")
            f.write(f"**Source**: `{proto}`\n\n---\n\n")
        else:
            f.write(f"### {name}\n\n")
            f.write(f"⚠️ Section not found in prototype — extract manually from `{proto}`\n\n---\n\n")

print(f"Wrote {out}")
PY

echo "Done: $OUT"
