#!/usr/bin/env bash
# Bootstrap Open Design outside the CCTC repo (optional contributor tooling).
# Reads pins from docs/design/open-design.lock unless overridden by env vars.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCK_FILE="${LOCK_FILE:-$REPO_ROOT/docs/design/open-design.lock}"

if [[ ! -f "$LOCK_FILE" ]]; then
  echo "error: lock file not found: $LOCK_FILE" >&2
  exit 1
fi

read_lock() {
  local key="$1"
  grep -E "^${key}:" "$LOCK_FILE" | head -1 | sed -E "s/^${key}:[[:space:]]*//" | sed 's/[[:space:]]*$//'
}

expand_home() {
  local path="$1"
  case $path in
    ~)
      printf '%s\n' "$HOME"
      ;;
    ~/*)
      printf '%s\n' "$HOME/${path#~/}"
      ;;
    *)
      printf '%s\n' "$path"
      ;;
  esac
}

OD_REPO="${OD_REPO:-$(read_lock repo)}"
OD_REF="${OD_REF:-$(read_lock ref)}"
OD_COMMIT="${OD_COMMIT:-$(read_lock commit)}"
OD_DIR="${OD_DIR:-$(expand_home "$(read_lock install_dir)")}"

echo "Open Design bootstrap"
echo "  repo:        $OD_REPO"
echo "  ref:         $OD_REF"
echo "  commit:      $OD_COMMIT"
echo "  install_dir: $OD_DIR"
echo

mkdir -p "$(dirname "$OD_DIR")"

if [[ ! -d "$OD_DIR/.git" ]]; then
  git clone "$OD_REPO" "$OD_DIR"
fi

cd "$OD_DIR"

git fetch --tags origin
git checkout "$OD_REF"
if [[ -n "$OD_COMMIT" ]]; then
  git checkout "$OD_COMMIT"
fi

if command -v corepack >/dev/null 2>&1; then
  corepack enable
fi

pnpm install

# Build daemon/CLI. Use pnpm exec to avoid Linux /usr/bin/od name conflict.
pnpm --filter @open-design/daemon build

echo
echo "Verifying od CLI..."
pnpm exec od --help >/dev/null

echo
echo "Cursor MCP dry-run (review output before applying):"
pnpm exec od mcp install cursor --print || true

echo
echo "Bootstrap complete."
echo "  Start web UI:  cd $OD_DIR && pnpm tools-dev run web"
echo "  Install MCP:   cd $OD_DIR && pnpm exec od mcp install cursor"
echo "  Setup guide:   $REPO_ROOT/docs/design/open-design-setup.md"
