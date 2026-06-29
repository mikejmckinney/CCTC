#!/usr/bin/env bash
# Design-to-Code Contract enforcement — delegates to d2cc.
# Usage: ./enforce-contract.sh
#
# Requires: npm install --include=dev
# Config:  design-contract.config.js

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

D2CC="./node_modules/.bin/d2cc"
if [[ ! -x "$D2CC" ]]; then
  echo "d2cc not found. Run: npm install --include=dev"
  exit 1
fi

echo "Running d2cc verify..."
echo ""
"$D2CC" verify
