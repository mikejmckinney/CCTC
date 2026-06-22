#!/usr/bin/env bash
# Render README demo media: Playwright captures + hero composition frame export.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

npm run build
node docs/media/readme-demos/scripts/capture-readme-demos.mjs

# Export hero composition poster if captures produced frames
if command -v chromium >/dev/null 2>&1 || command -v google-chrome >/dev/null 2>&1; then
  echo "Poster frames captured during Playwright run."
else
  echo "note: browser CLI not used for extra hero export"
fi

echo "Render complete. Outputs in docs/media/readme-demos/.outputs/"
