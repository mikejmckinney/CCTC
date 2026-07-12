#!/usr/bin/env bash
# scripts/checks/046-process-discipline.sh — lightweight process invariants.
# Sourced by test.sh; relies on pass()/fail() and CWD == repo root.

echo "Checking process discipline contracts..."

if grep -q "process_subagent_bootstrap.md" .context/rules/README.md; then
  pass ".context rule catalog links practical subagent dispatch guidance"
else
  fail ".context rule catalog missing process_subagent_bootstrap.md"
fi

if grep -q "AGENTS_MD_VERSION" .context/rules/process_subagent_bootstrap.md; then
  pass "subagent dispatch guidance preserves AGENTS_MD_VERSION alignment"
else
  fail "subagent dispatch guidance missing AGENTS_MD_VERSION alignment"
fi

if grep -q "process_opportunity_feedback.md" .github/PLAN_TEMPLATE.md \
  && grep -q "process_opportunity_feedback.md" .github/pull_request_template.md; then
  pass "plan and PR templates retain opportunity-note guidance"
else
  fail "plan and PR templates must retain opportunity-note guidance"
fi

echo ""
