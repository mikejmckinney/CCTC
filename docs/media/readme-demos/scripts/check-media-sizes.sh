#!/usr/bin/env bash
# Fail if any README demo MP4 exceeds 10 MB.
set -euo pipefail
OUT="$(cd "$(dirname "$0")/.." && pwd)/.outputs"
MAX_BYTES=$((10 * 1024 * 1024))
failed=0

shopt -s nullglob
for f in "$OUT"/*.mp4; do
  size=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f")
  if ((size > MAX_BYTES)); then
    echo "FAIL: $(basename "$f") is $((size / 1024 / 1024)) MB (max 10 MB)" >&2
    failed=1
  else
    echo "OK: $(basename "$f") ($((size / 1024)) KB)"
  fi
done

if ((failed)); then
  exit 1
fi

echo "All demos within size budget."
