#!/usr/bin/env bash
# Fail when README demo media exceeds its placement-specific budget.
set -euo pipefail
OUT="$(cd "$(dirname "$0")/.." && pwd)/.outputs"
HERO_MAX_BYTES=$((4 * 1024 * 1024))
FEATURE_MAX_BYTES=$((2 * 1024 * 1024))
failed=0

shopt -s nullglob
for f in "$OUT"/*.mp4; do
  size=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f")
  if [[ "$(basename "$f")" == 00-* ]]; then
    max_bytes=$HERO_MAX_BYTES
  else
    max_bytes=$FEATURE_MAX_BYTES
  fi
  if ((size > max_bytes)); then
    echo "FAIL: $(basename "$f") is $((size / 1024)) KB (max $((max_bytes / 1024)) KB)" >&2
    failed=1
  else
    echo "OK: $(basename "$f") ($((size / 1024)) KB)"
  fi
done

if ((failed)); then
  exit 1
fi

echo "All demos within size budget."
