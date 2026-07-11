#!/usr/bin/env bash

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=.opencode/skills/local-consensus/scripts/common.sh
source "$SCRIPT_DIR/common.sh"

PROMPT_FILE=
INVOKING_SESSION=
TITLE="local-fusion-$(date +%Y%m%d-%H%M%S)"
OUTPUT_DIR=

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prompt-file) require_value "$1" "${2:-}"; PROMPT_FILE="$2"; shift 2 ;;
    --invoking-session) require_value "$1" "${2:-}"; INVOKING_SESSION="$2"; shift 2 ;;
    --title) require_value "$1" "${2:-}"; TITLE="$2"; shift 2 ;;
    --output-dir) require_value "$1" "${2:-}"; OUTPUT_DIR="$2"; shift 2 ;;
    *) fail "unknown argument: $1" ;;
  esac
done

[[ -f "$PROMPT_FILE" ]] || fail "--prompt-file must name a readable file"
[[ -n "$INVOKING_SESSION" ]] || fail "--invoking-session is required"
OUTPUT_DIR="${OUTPUT_DIR:-$(mktemp -d "${TMPDIR:-/tmp}/local-fusion.XXXXXX")}"
mkdir -p "$OUTPUT_DIR"

RUNTIME_PROMPT="$OUTPUT_DIR/panel-prompt.md"
append_session_context "$PROMPT_FILE" "$INVOKING_SESSION" "$RUNTIME_PROMPT"

models=(
  "mi:openrouter/xiaomi/mimo-v2.5-pro@preset/default"
  "ds:openrouter/deepseek/deepseek-v4-pro@preset/default"
  "mm:openrouter/minimax/minimax-m3@preset/default"
)
pids=()
for spec in "${models[@]}"; do
  name="${spec%%:*}"
  model="${spec#*:}"
  run_with_timeout 600 opencode run --title "${TITLE}-${name}" --model "$model" \
    <"$RUNTIME_PROMPT" >"$OUTPUT_DIR/panel-${name}.md" \
    2>"$OUTPUT_DIR/panel-${name}.err" &
  pids+=("$!")
done

PANELS_SUCCEEDED=0
for index in "${!pids[@]}"; do
  name="${models[$index]%%:*}"
  if wait "${pids[$index]}" && [[ -s "$OUTPUT_DIR/panel-${name}.md" ]]; then
    PANELS_SUCCEEDED=$((PANELS_SUCCEEDED + 1))
  fi
done
[[ "$PANELS_SUCCEEDED" -ge 2 ]] \
  || fail "fewer than two panels succeeded; inspect $OUTPUT_DIR"

JUDGE_PROMPT="$OUTPUT_DIR/judge-prompt.md"
cat "$SKILL_ROOT/prompts/judge.md" >"$JUDGE_PROMPT"
for spec in "${models[@]}"; do
  name="${spec%%:*}"
  if [[ -s "$OUTPUT_DIR/panel-${name}.md" ]]; then
    panel_label=$(printf '%s' "$name" | tr '[:lower:]' '[:upper:]')
    printf '\n## Panel %s\n' "$panel_label" >>"$JUDGE_PROMPT"
    cat "$OUTPUT_DIR/panel-${name}.md" >>"$JUDGE_PROMPT"
  fi
done

ANSWER_FILE="$OUTPUT_DIR/answer.md"
invoke_with_fallback "${TITLE}-judge" "$JUDGE_PROMPT" "$ANSWER_FILE" \
  || fail "all judge engines failed; inspect $OUTPUT_DIR"
emit_result fusion "$ANSWER_FILE" "$PANELS_SUCCEEDED"
