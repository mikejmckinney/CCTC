#!/usr/bin/env bats

setup_file() {
  REPO_ROOT="$(cd "$BATS_TEST_DIRNAME/../.." && pwd)"
  GENERIC_SCRIPT="$REPO_ROOT/.opencode/skills/open-design/scripts/bootstrap.sh"
  WRAPPER_SCRIPT="$REPO_ROOT/scripts/bootstrap-open-design.sh"
  export REPO_ROOT GENERIC_SCRIPT WRAPPER_SCRIPT
}

setup() {
  TEST_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/open-design-bootstrap.XXXXXX")"
  FAKE_BIN="$TEST_ROOT/bin"
  COMMAND_LOG="$TEST_ROOT/commands.log"
  mkdir -p "$FAKE_BIN"
  : >"$COMMAND_LOG"
  export TEST_ROOT FAKE_BIN COMMAND_LOG
  make_fake_commands
}

teardown() {
  rm -rf "$TEST_ROOT"
}

make_fake_commands() {
  cat >"$FAKE_BIN/git" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf 'git' >>"$COMMAND_LOG"
printf ' <%s>' "$@" >>"$COMMAND_LOG"
printf '\n' >>"$COMMAND_LOG"
if [[ "${1:-}" == "clone" ]]; then
  mkdir -p "${3}/.git"
fi
if [[ "${1:-}" == "remote" && "${2:-}" == "get-url" ]]; then
  printf '%s\n' "${FAKE_GIT_ORIGIN:-https://example.test/open-design.git}"
fi
if [[ "${1:-}" == "status" && "${2:-}" == "--porcelain" ]]; then
  printf '%s' "${FAKE_GIT_STATUS:-}"
fi
EOF

  cat >"$FAKE_BIN/pnpm" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf 'pnpm' >>"$COMMAND_LOG"
printf ' <%s>' "$@" >>"$COMMAND_LOG"
printf '\n' >>"$COMMAND_LOG"
EOF

  cat >"$FAKE_BIN/corepack" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf 'corepack' >>"$COMMAND_LOG"
printf ' <%s>' "$@" >>"$COMMAND_LOG"
printf '\n' >>"$COMMAND_LOG"
EOF

  chmod +x "$FAKE_BIN/git" "$FAKE_BIN/pnpm" "$FAKE_BIN/corepack"
}

write_lock() {
  local path="$1"
  local repo="${2-https://example.test/open-design.git}"
  local ref="${3-v1.2.3}"
  local commit="${4-deadbeef}"
  local install_dir="${5-$TEST_ROOT/default-install}"

  cat >"$path" <<EOF
# Fixture lock
repo: $repo
ref: $ref
commit: $commit
install_dir: $install_dir
ignored: value
EOF
}

run_generic() {
  run env PATH="$FAKE_BIN:$PATH" HOME="$TEST_ROOT/home" COMMAND_LOG="$COMMAND_LOG" \
    bash "$GENERIC_SCRIPT" "$@"
}

assert_log_line() {
  local expected="$1"
  grep -Fxq "$expected" "$COMMAND_LOG"
}

refute_log_line() {
  local unexpected="$1"
  ! grep -Fxq "$unexpected" "$COMMAND_LOG"
}

refute_log_contains() {
  local unexpected="$1"
  ! grep -Fq "$unexpected" "$COMMAND_LOG"
}

@test "generic bootstrap requires --lock" {
  run_generic

  [ "$status" -ne 0 ]
  [[ "$output" == *"--lock"* ]]
}

@test "generic bootstrap rejects each missing required lock key" {
  local key lock_file

  for key in repo ref install_dir; do
    lock_file="$TEST_ROOT/missing-$key.lock"
    write_lock "$lock_file"
    grep -v "^${key}:" "$lock_file" >"$lock_file.tmp"
    mv "$lock_file.tmp" "$lock_file"

    run_generic --lock "$lock_file"

    [ "$status" -ne 0 ]
    [[ "$output" == *"$key"* ]]
  done
}

@test "generic bootstrap clones, checks out exact pins, builds, verifies, and prints MCP config" {
  local lock_file="$TEST_ROOT/open-design.lock"
  local install_dir="$TEST_ROOT/clone target"
  write_lock "$lock_file" "https://example.test/team/open-design.git" "release/exact" "0123456789abcdef" "$install_dir"

  run_generic --lock "$lock_file" --mcp-client opencode

  [ "$status" -eq 0 ]
  assert_log_line "git <clone> <https://example.test/team/open-design.git> <$install_dir>"
  assert_log_line "git <fetch> <--tags> <origin>"
  assert_log_line "git <checkout> <release/exact>"
  assert_log_line "git <checkout> <0123456789abcdef>"
  assert_log_line "corepack <enable>"
  assert_log_line "pnpm <install>"
  assert_log_line "pnpm <--filter> <@open-design/daemon> <build>"
  assert_log_line "pnpm <exec> <od> <--help>"
  assert_log_line "pnpm <exec> <od> <mcp> <install> <opencode> <--print>"
}

@test "generic bootstrap updates an existing checkout without cloning and allows an empty commit" {
  local lock_file="$TEST_ROOT/open-design.lock"
  local install_dir="$TEST_ROOT/existing"
  mkdir -p "$install_dir/.git"
  write_lock "$lock_file" "https://example.test/open-design.git" "main" "" "$install_dir"

  run_generic --lock "$lock_file"

  [ "$status" -eq 0 ]
  refute_log_line "git <clone> <https://example.test/open-design.git> <$install_dir>"
  assert_log_line "git <fetch> <--tags> <origin>"
  assert_log_line "git <checkout> <main>"
  [ "$(grep -Fc 'git <checkout>' "$COMMAND_LOG")" -eq 1 ]
  ! grep -Fq "<mcp>" "$COMMAND_LOG"
}

@test "generic bootstrap rejects an existing checkout with a different origin" {
  local lock_file="$TEST_ROOT/open-design.lock"
  local install_dir="$TEST_ROOT/existing"
  mkdir -p "$install_dir/.git"
  write_lock "$lock_file" "https://example.test/open-design.git" "main" "" "$install_dir"

  run env PATH="$FAKE_BIN:$PATH" HOME="$TEST_ROOT/home" COMMAND_LOG="$COMMAND_LOG" \
    FAKE_GIT_ORIGIN="https://example.test/unrelated.git" \
    bash "$GENERIC_SCRIPT" --lock "$lock_file"

  [ "$status" -ne 0 ]
  [[ "$output" == *"origin"* ]]
  refute_log_contains "git <fetch>"
  refute_log_contains "pnpm"
}

@test "generic bootstrap rejects a dirty existing checkout" {
  local lock_file="$TEST_ROOT/open-design.lock"
  local install_dir="$TEST_ROOT/existing"
  mkdir -p "$install_dir/.git"
  write_lock "$lock_file" "https://example.test/open-design.git" "main" "" "$install_dir"

  run env PATH="$FAKE_BIN:$PATH" HOME="$TEST_ROOT/home" COMMAND_LOG="$COMMAND_LOG" \
    FAKE_GIT_STATUS=" M package.json" \
    bash "$GENERIC_SCRIPT" --lock "$lock_file"

  [ "$status" -ne 0 ]
  [[ "$output" == *"uncommitted"* ]]
  refute_log_contains "git <fetch>"
  refute_log_contains "pnpm"
}

@test "generic bootstrap expands lock tilde and lets the last install override win" {
  local lock_file="$TEST_ROOT/open-design.lock"
  local override_dir="$TEST_ROOT/override target"
  # shellcheck disable=SC2088 # Intentional literal tests script expansion.
  write_lock "$lock_file" "https://example.test/open-design.git" "stable" "" "~/tools/open-design"

  run_generic --lock "$lock_file" --install-dir "$TEST_ROOT/first" --install-dir "$override_dir"

  [ "$status" -eq 0 ]
  assert_log_line "git <clone> <https://example.test/open-design.git> <$override_dir>"
  [ ! -e "$TEST_ROOT/home/tools/open-design/.git" ]
}

@test "generic bootstrap expands a tilde install directory from the lock" {
  local lock_file="$TEST_ROOT/open-design.lock"
  local expanded_dir="$TEST_ROOT/home/tools/open-design"
  # shellcheck disable=SC2088 # Intentional literal tests script expansion.
  write_lock "$lock_file" "https://example.test/open-design.git" "stable" "" "~/tools/open-design"

  run_generic --lock "$lock_file"

  [ "$status" -eq 0 ]
  assert_log_line "git <clone> <https://example.test/open-design.git> <$expanded_dir>"
}

@test "--apply-mcp installs MCP config without --print" {
  local lock_file="$TEST_ROOT/open-design.lock"
  write_lock "$lock_file"

  run_generic --lock "$lock_file" --mcp-client cursor --apply-mcp

  [ "$status" -eq 0 ]
  assert_log_line "pnpm <exec> <od> <mcp> <install> <cursor>"
  ! grep -Fq '<--print>' "$COMMAND_LOG"
}

@test "--apply-mcp requires an MCP client" {
  local lock_file="$TEST_ROOT/open-design.lock"
  write_lock "$lock_file"

  run_generic --lock "$lock_file" --apply-mcp

  [ "$status" -ne 0 ]
  [[ "$output" == *"--mcp-client"* ]]
  [ ! -s "$COMMAND_LOG" ]
}

@test "CCTC wrapper supplies defaults before user overrides" {
  local override_dir="$TEST_ROOT/wrapper target"

  run env PATH="$FAKE_BIN:$PATH" HOME="$TEST_ROOT/home" COMMAND_LOG="$COMMAND_LOG" \
    bash "$WRAPPER_SCRIPT" --install-dir "$override_dir" --mcp-client cursor --apply-mcp

  [ "$status" -eq 0 ]
  assert_log_line "git <clone> <https://github.com/nexu-io/open-design.git> <$override_dir>"
  assert_log_line "git <checkout> <open-design-v0.11.0>"
  assert_log_line "git <checkout> <67ade60bced0f6f7888bf9dc487571f954e98e0d>"
  assert_log_line "pnpm <exec> <od> <mcp> <install> <cursor>"
  ! grep -Fq '<--print>' "$COMMAND_LOG"
}

@test "CCTC wrapper preserves documented environment overrides" {
  local lock_file="$TEST_ROOT/custom.lock"
  local env_dir="$TEST_ROOT/environment target"
  local cli_dir="$TEST_ROOT/cli target"
  write_lock "$lock_file" "https://example.test/custom/open-design.git" "custom-ref" "custom-commit" "$TEST_ROOT/lock-target"

  run env PATH="$FAKE_BIN:$PATH" HOME="$TEST_ROOT/home" COMMAND_LOG="$COMMAND_LOG" \
    LOCK_FILE="$lock_file" OD_DIR="$env_dir" \
    bash "$WRAPPER_SCRIPT" --install-dir "$cli_dir"

  [ "$status" -eq 0 ]
  assert_log_line "git <clone> <https://example.test/custom/open-design.git> <$cli_dir>"
  assert_log_line "git <checkout> <custom-ref>"
  assert_log_line "git <checkout> <custom-commit>"
  [ ! -e "$env_dir/.git" ]
}
