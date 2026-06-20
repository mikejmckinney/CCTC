#!/usr/bin/env bash
set -euo pipefail

REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
WORKFLOW_URL="${GITHUB_SERVER_URL}/${REPO}/actions/runs/${GITHUB_RUN_ID}"
DRIFT_JSON="${RUNNER_TEMP}/optn-drift.json"
VALIDATION_OK=0
AUTOMERGED=0
# Repo variable: only the literal string "true" enables automerge (unset/false = disabled).
OPTN_DRIFT_AUTOMERGE="${OPTN_DRIFT_AUTOMERGE:-false}"

echo "Analyzing OPTN drift..."
node scripts/reference-audit-optn.mjs --json-out "$DRIFT_JSON"

AUTO_FIX_COUNT="$(jq '.autoFixes | length' "$DRIFT_JSON")"
MANUAL_COUNT="$(jq '.manualReview | length' "$DRIFT_JSON")"
OPTN_ERROR_COUNT="$(jq '.optnReferenceErrors | length' "$DRIFT_JSON")"

echo "OPTN reference errors: ${OPTN_ERROR_COUNT}"
echo "Auto-fixable items: ${AUTO_FIX_COUNT}"
echo "Manual review entries: ${MANUAL_COUNT}"
echo "OPTN_DRIFT_AUTOMERGE: ${OPTN_DRIFT_AUTOMERGE}"

PR_URL=""
BRANCH=""
EXISTING_ISSUE="$(gh issue list --repo "$REPO" --label optn-drift --state open --limit 1 --json number --jq '.[0].number // empty' 2>/dev/null || echo "")"

upsert_drift_issue() {
  local body_file="${RUNNER_TEMP}/issue-body-final.md"
  node scripts/ci/print-drift-issue-body.mjs "$DRIFT_JSON" "$WORKFLOW_URL" "$PR_URL" >"$body_file"

  if [[ -n "$EXISTING_ISSUE" ]]; then
    gh issue comment "$EXISTING_ISSUE" --repo "$REPO" --body-file "$body_file"
    echo "Updated existing issue #${EXISTING_ISSUE}"
  else
    gh label create optn-drift --color d73a4a --description "OPTN PDF page drift detected by CI" 2>/dev/null || true
    gh label create automated --color 0e8a16 --description "Opened or updated by an automated workflow" 2>/dev/null || true
    EXISTING_ISSUE="$(gh issue create \
      --repo "$REPO" \
      --title "OPTN policy page drift — $(date -u +%Y-%m-%d)" \
      --label optn-drift \
      --label automated \
      --body-file "$body_file" \
      --json number --jq '.number')"
    echo "Opened issue #${EXISTING_ISSUE}"
  fi
}

if [[ "$AUTO_FIX_COUNT" -gt 0 ]]; then
  echo "Applying OPTN page re-anchors..."
  node scripts/reference-audit-optn.mjs --apply

  echo "Re-running validation after auto-fix..."
  if npm run validate:ci && npm run validate:stubs; then
    VALIDATION_OK=1
    DATE_STAMP="$(date -u +%Y%m%d)"

    git config user.name "github-actions[bot]"
    git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

    # Prefer updating an open remediation PR (one PR per drift incident) over
    # creating a same-day branch that would collide on re-run or manual dispatch.
    EXISTING_PR_JSON="$(gh pr list --repo "$REPO" --state open --label optn-drift-remediation \
      --json number,headRefName,url --jq 'sort_by(.number) | .[0] // empty' 2>/dev/null || echo "")"

    REUSE_PR=0
    if [[ -n "$EXISTING_PR_JSON" && "$EXISTING_PR_JSON" != "null" ]]; then
      BRANCH="$(echo "$EXISTING_PR_JSON" | jq -r '.headRefName')"
      PR_URL="$(echo "$EXISTING_PR_JSON" | jq -r '.url')"
      PR_NUMBER="$(echo "$EXISTING_PR_JSON" | jq -r '.number')"
      REUSE_PR=1
      echo "Updating open remediation PR #${PR_NUMBER} on branch ${BRANCH}..."
      git fetch origin "$BRANCH"
      git checkout "$BRANCH"
    else
      BRANCH="fix/optn-drift-${DATE_STAMP}"
      SUFFIX=2
      while git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; do
        BRANCH="fix/optn-drift-${DATE_STAMP}-${SUFFIX}"
        SUFFIX=$((SUFFIX + 1))
      done
      git checkout -b "$BRANCH"
    fi

    git add questions/
    if git diff --staged --quiet; then
      echo "No question-bank changes to commit after apply."
    else
      git commit -m "$(
        cat <<EOF
fix: re-anchor OPTN policy pages after HRSA bundle drift

Automated remediation from scheduled validate workflow.
EOF
      )"
    fi

    if [[ "$REUSE_PR" -eq 1 ]]; then
      git push origin "$BRANCH"
      gh pr comment "$PR_URL" --repo "$REPO" \
        --body "🔄 Updated with additional OPTN page re-anchors from scheduled drift check (${WORKFLOW_URL})."
    else
      git push -u origin "$BRANCH"

      gh label create optn-drift-remediation --color 1d76db \
        --description "Automated OPTN page-drift remediation PR" 2>/dev/null || true

      PR_URL="$(gh pr create \
        --title "fix: re-anchor OPTN policy pages after bundle drift" \
        --label optn-drift-remediation \
        --body "$(
          cat <<EOF
## Summary

Automated remediation for OPTN \`optn_policies.pdf\` page drift detected by the daily validate workflow on \`main\`.

- Re-anchored **${AUTO_FIX_COUNT}** item(s) to updated PDF pages
- Regenerated verification stubs

## Review checklist

- [ ] Page shifts match the policy topics in the issue table
- [ ] \`validate\` CI is green on this PR
- [ ] No unrelated question content changed

Workflow run: ${WORKFLOW_URL}
EOF
        )")"

      echo "Opened remediation PR: ${PR_URL}"
    fi

    upsert_drift_issue

    echo "Waiting for CI checks on PR..."
    if ! gh pr checks "$PR_URL" --repo "$REPO" --watch --fail-fast; then
      gh pr comment "$PR_URL" --repo "$REPO" --body "⚠️ Automated remediation updated this PR, but CI did not pass on the latest run. Please review failures and push fixes before merge."
      VALIDATION_OK=0
    elif [[ "$OPTN_DRIFT_AUTOMERGE" == "true" ]]; then
      echo "OPTN_DRIFT_AUTOMERGE=true — attempting squash merge..."
      if gh pr merge "$PR_URL" --repo "$REPO" --squash --delete-branch; then
        AUTOMERGED=1
        echo "Squash-merged remediation PR automatically."
      else
        gh pr comment "$PR_URL" --repo "$REPO" --body "⚠️ \`OPTN_DRIFT_AUTOMERGE=true\` but merge failed (branch protection or merge conflicts). Merge manually after review."
        VALIDATION_OK=0
      fi
    else
      echo "OPTN_DRIFT_AUTOMERGE is not true — PR left open for manual review."
    fi
  else
    echo "::warning::Auto-fix applied but validation still failed."
    upsert_drift_issue
  fi
else
  upsert_drift_issue
fi

if [[ "$AUTOMERGED" -eq 1 && -n "$EXISTING_ISSUE" ]]; then
  gh issue close "$EXISTING_ISSUE" --repo "$REPO" \
    --comment "Closed after automated merge of remediation PR ${PR_URL}."
fi

if [[ "$VALIDATION_OK" -eq 0 && "$AUTO_FIX_COUNT" -eq 0 ]]; then
  echo "::error::OPTN drift detected with no auto-fixable items."
  exit 1
fi

if [[ "$VALIDATION_OK" -eq 0 && "$AUTO_FIX_COUNT" -gt 0 ]]; then
  echo "::warning::OPTN drift partially remediated; manual follow-up required."
  exit 1
fi

echo "OPTN drift remediation complete."
