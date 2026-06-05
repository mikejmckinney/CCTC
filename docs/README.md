# Documentation

This directory holds the human-readable documentation for CCTE. The repo now includes an initial app scaffold and validation tooling, but most material here is still governance, process, and reference context inherited from the bootstrap template plus the CCTE-specific top-level docs.

When documentation and implementation ever disagree, follow the repo truth order: `.context/**` first, then `docs/**`, then the codebase.

## What This Directory Covers

- `README.md`: this index for the docs tree.
- `FAQ.md`: project-specific answers about CCTE scope, blueprints, question authoring, and draft versus reviewed items.
- `compliance_schemas.md`: reference for plan, parent, and subagent compliance blocks used by the multi-agent workflow.
- `guides/`: reusable workflow and process guides inherited from the template.
- `decisions/`: ADRs for the governance framework currently shipped with this repo.
- `postmortems/`: lessons learned from the template workflow that still inform how agents operate here.
- `research/` and `reference/`: supporting material when project-specific research or external specs are added.

## CCTE-Specific Reading Path

For work on the actual product, start outside this directory with the prompt set in `.github/prompts/`:

1. `.github/prompts/00-onboarding.md`
2. `.github/prompts/01-build-app.md`
3. `.github/prompts/02-author-questions.md`
4. `.github/prompts/03-validate.md`

Then use these docs as supporting references:

- `FAQ.md` for quick project answers.
- `compliance_schemas.md` if you are returning plan or subagent evidence blocks.
- `guides/multi-agent-coordination.md` if the task spans multiple owned paths.
- `decisions/README.md` if you need the ADR index.

## Current Documentation Layout

```text
docs/
├── README.md
├── FAQ.md
├── compliance_schemas.md
├── smoke-a.md
├── smoke-e.md
├── decisions/
├── guides/
├── postmortems/
├── reference/
└── research/
```

## What Belongs Here

- Human-facing reference material and project explanation.
- ADRs and postmortems that explain why the workflow is shaped the way it is.
- Supporting guides that help contributors and agents use the repo safely.
- CCTE product docs and runbooks as the app, validation pipeline, and hosting flow grow beyond the initial scaffold.

## What Does Not Belong Here

- Live task state or claim tracking: use GitHub issue or PR state plus the latest `agent-state:v1` comment.
- Canonical roadmap, rules, or ownership data: those live under `.context/`.
- Source-of-truth app behavior: that currently lives in `.github/prompts/01-build-app.md` and related prompt files.

## Notes On Current Scope

- The repo already contains the exam schema, blueprint JSON, question-bank conventions, an initial frontend scaffold, and a local/CI validation path.
- Many docs under `guides/`, `decisions/`, and `postmortems/` still describe the inherited multi-agent workflow rather than the CCTE product domain.
- The current bank is still effectively example-backed until non-underscore question shards are added under `questions/`.
- As product code lands, update this directory with CCTE-specific runbooks and deployment notes instead of duplicating prompt content.
