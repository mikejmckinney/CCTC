#!/usr/bin/env bash
# Re-encode README demo MP4s for smaller README-friendly size.
set -euo pipefail
OUT="$(cd "$(dirname "$0")/.." && pwd)/.outputs"
mkdir -p "$OUT"

shopt -s nullglob
for src in "$OUT"/*.mp4; do
  base="$(basename "$src" .mp4)"
  tmp="$OUT/${base}.tmp.mp4"
  echo "Optimizing $base..."
  ffmpeg -y -i "$src" -c:v libx264 -crf 24 -preset medium -pix_fmt yuv420p -movflags +faststart -an "$tmp"
  mv "$tmp" "$src"
done

echo "Optimize complete."
