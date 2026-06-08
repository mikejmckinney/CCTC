# Context Pack Index

> **Purpose**: This is the entry point for AI agents to understand CCTE's product direction, constraints, and current state.

## How to Use This Directory

The `.context/` directory is CCTE's canonical planning and rules layer. It records
the product scope, repo constraints, and durable lessons for a static practice-exam
web app rather than template-maintenance work.

### priority order (when conflicts arise)

See `AGENTS.md` §"Truth hierarchy" for the canonical definition. Summary:
`.context/**` > `docs/**` > codebase.

## Directory Structure

```text
.context/
|-- 00_INDEX.md          # This file - start here (The Map)
|-- backlog.yaml         # Machine-readable task list dispatched into issues
|-- backlog.schema.json  # JSON Schema for backlog.yaml
|-- roadmap.md           # Project phases and current implementation track
|-- rules/               # Immutable constraints and process rules
|   |-- agent_ownership.md            # Canonical role -> owned paths map (read before editing)
|   |-- domain_code_quality.md        # Built-in language-neutral SOLID/TDD/clean-code floor
|   |-- process_doc_maintenance.md    # Doc-sync trigger table
|   |-- process_subagent_bootstrap.md # ADR-026 dispatch packet + subagent return contract
|   `-- process_*.md                  # Additional process rules by concern
|-- sessions/            # Durable retrospectives and feedback records
|   |-- feedback_template.md # Stakeholder feedback capture template
|   `-- latest_summary.md   # Durable retrospective lessons
|-- state/               # GitHub-first live-state guidance and comment template
|   |-- README.md        # ADR-025 state-surface guide
|   `-- agent_state_comment_template.md # GitHub live-state comment template
`-- vision/              # Design artifacts and architecture diagrams
    |-- README.md
    |-- mockups/         # UI and interaction references for the learner experience
    `-- architecture/
        `-- ...                # App and deployment diagrams as they are added
```

## Quick Start for Agents (Lazy Load Pattern)

1. Read `AGENTS.md`, then this file.
2. Read your role file (for example, `.agents/<your-role>.md`).
3. Read the assigned GitHub issue body, linked PR, latest `agent-state:v1` comment, and labels.
4. Read `rules/agent_ownership.md` before touching files.
5. Treat `state/` as the GitHub-first live-state reference surface; use `state/agent_state_comment_template.md` when updating the latest `agent-state:v1` baton.
6. Read `sessions/latest_summary.md` for durable lessons from recent work.
7. Read `roadmap.md` for the current product phase and open implementation track.
8. Pull additional `rules/` and `vision/` files only when their domain intersects your change.

**Multi-agent workflow**: See [docs/guides/multi-agent-coordination.md](../docs/guides/multi-agent-coordination.md) for the end-to-end Analyst -> Architect -> plan-gate (Critic notes + Judge approval) -> PM -> implementers -> QA -> Critic -> Judge flow.

**Compliance contracts**: See `docs/compliance_schemas.md` and `docs/decisions/adr-026-compliance-contracts.md` for the ADR-026 evidence blocks (`plan_compliance`, `parent_compliance`, `subagent_compliance`) and role-contract versioning model.

## Project Summary

**Project Name**: `CCTE`

**Description**: A client-side practice-exam web app for the ABTC Certified Clinical Transplant Coordinator (CCTC) exam. The repo is a derived implementation project, not the template itself.

**Current Phase**: Phase 3 — question-bank growth and validation (see [roadmap.md](roadmap.md); Phases 1–2 complete on `main`).

**Primary Stack**: Static web app scaffolding for a Vite-style React frontend, JSON content assets, and the inherited multi-agent governance/process files.

**Current product direction**:

- Build a responsive, offline-capable exam-prep app that runs entirely in the browser.
- Support both current and legacy ABTC blueprint configurations from static data files.
- Keep question content, schema validation, and learner-facing UI separate so the bank can grow without introducing a backend.

## Key Repo Facts

- This repo is using the template's coordination framework, but the implementation target is a product app.
- The onboarding prompt in `.github/prompts/00-onboarding.md` is the product-specific starting point for app work.
- GitHub-first live-state rules still apply when issue/PR coordination is available; for local bootstrap work, use this context pack and the working tree as the source of truth.

## Next Steps

- Continue question-bank growth under `questions/domain-*` (73 draft items across `batch-01`–`batch-06` as of 2026-06-05) per [`.github/prompts/02-author-questions.md`](../.github/prompts/02-author-questions.md) and the checklist in [roadmap.md](roadmap.md).
- Keep `npm run validate` green after each authoring batch; use `npm run validate:coverage` for gap dashboards.
- Plan Phase 4 polish (GitHub Pages deploy, device/a11y pass) as the reviewed bank grows.
