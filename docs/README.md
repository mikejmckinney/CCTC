# Documentation

This directory holds the human-readable documentation for CCTC. The repo ships a v1-complete practice-exam app, a 506-item reviewed question bank, validation tooling, and governance docs inherited from the bootstrap template.

When documentation and implementation ever disagree, follow the repo truth order: `.context/**` first, then `docs/**`, then the codebase.

## What This Directory Covers

- `README.md`: this index for the docs tree.
- `FAQ.md`: project-specific answers about CCTC scope, blueprints, question authoring, and draft versus reviewed items.
- `guides/`: workflow guides (template multi-agent docs plus CCTC product runbooks such as the reference indexer).
- `decisions/`: ADRs for the governance framework currently shipped with this repo.
- `postmortems/`: lessons learned from the template workflow that still inform how agents operate here.
- `research/` and `reference/`: supporting material when project-specific research or external specs are added.

## CCTC-Specific Reading Path

For work on the actual product, start outside this directory with the prompt set in `.github/prompts/`:

1. `.github/prompts/00-onboarding.md`
2. `.github/prompts/01-build-app.md`
3. `.github/prompts/02-author-questions.md`
4. `.github/prompts/03-validate.md`

**v2 features** (future): `.context/vision/v2-roadmap.md`

Then use these docs as supporting references:

- `FAQ.md` for quick project answers.
- `guides/reference-indexer.md` for PDF index architecture, authoring commands, and validation tiers.
- `guides/multi-agent-coordination.md` if the task spans multiple owned paths.
- `decisions/README.md` if you need the ADR index.

## Current Documentation Layout

```text
docs/
├── README.md
├── FAQ.md
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
- CCTC product docs and runbooks (reference indexer, sandbox verification, deployment notes).

## What Does Not Belong Here

- Live task state or claim tracking: use GitHub issue or PR state plus the latest `agent-state:v1` comment.
- Canonical roadmap, rules, or ownership data: those live under `.context/`.
- Source-of-truth app behavior: that currently lives in `.github/prompts/01-build-app.md` and related prompt files.

## Notes On Current Scope

- The repo contains the exam schema, blueprint JSON, **506 reviewed question shards**, a React/Vite practice app, GitHub Pages hosting, and local/CI validation (including reference stubs).
- Many docs under `guides/`, `decisions/`, and `postmortems/` still describe the inherited multi-agent workflow rather than the CCTC product domain.
- Product-specific runbooks live under `guides/` (e.g. `reference-indexer.md`, `sandbox-verification.md`); prompt files under `.github/prompts/` remain the build/authoring contract.
