#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCK_PATH="${LOCK_FILE:-$REPO_ROOT/docs/design/open-design.lock}"
ARGS=(--lock "$LOCK_PATH" --mcp-client opencode)

if [[ -n "${OD_DIR:-}" ]]; then
  ARGS+=(--install-dir "$OD_DIR")
fi

exec "$REPO_ROOT/.opencode/skills/open-design/scripts/bootstrap.sh" \
  "${ARGS[@]}" \
  "$@"
