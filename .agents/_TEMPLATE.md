---
name: <role>
description: <byte-identical description shared by all overlays>
owned_paths:
  - '<owned/path/glob>'
handoff_targets:
  - <downstream-role>
---

# <Role> Agent

This template is the canonical starting point for role files under `.agents/`.
Platform overlays under `.github/agents/` and `.claude/agents/` stay thin and
must not duplicate this role body.

## Bootstrap guidance

Before doing role work, load:

1. `AGENTS.md` and its current `AGENTS_MD_VERSION`.
2. This canonical role file.
3. `.context/rules/process_role_selection.md`.
4. `.context/rules/agent_ownership.md`.
5. Any process rules listed in the parent dispatch packet.
6. The issue, PR, plan, or diff context supplied in the dispatch packet.

If the dispatch packet omits the role, goal, expected output, required context,
or relevant issue/PR/plan/diff link, do not guess. Non-exact-output roles may
return `NEEDS_CONTEXT`; exact-output roles preserve their required first line
and use `REQUEST_CHANGES` with `NEEDS_CONTEXT` in the body.

Exact-output roles preserve their existing first-line contract. For example,
Judge begins with `DECISION:` and Critic begins with `CRITIC DECISION:`.

## Role-specific content

Add the role's responsibilities, Do/Don't lists, output format, and handoff
rules below this heading. Keep platform-specific `tools:` and `model:` fields
out of canonical role files.
