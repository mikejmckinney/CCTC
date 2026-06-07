# AI_REPO_GUIDE.md

> Purpose: Canonical agent reference for the CCTE repository.
> Last verified: 2026-06-01

This repository is the CCTE project: a static, client-side practice-exam app for the ABTC Certified Clinical Transplant Coordinator exam. The repo now contains an initial React + TypeScript + Vite app scaffold, local validation tooling, and CI workflows alongside the exam specification, blueprint data, schema, and example question content.

## Current State

- Product: CCTE, an independent study aid for CCTC candidates.
- Delivery model: static hosting, offline after first load, no backend, no runtime LLM calls.
- Present in repo today: prompts, schema, blueprint JSON, question-bank conventions, a React/Vite frontend scaffold under `src/`, static assets under `public/`, a package manifest with local test/build/validate scripts, and validation workflows.
- Current product maturity: the app shell, session assembly, persistence helpers, and tests exist, but the live bank is not populated yet. `src/data/questionBank.ts` falls back to `_examples` content when no non-underscore shards exist under `questions/`.
- Still pending: a substantial reviewed bank under `questions/`, plus continued implementation against the full feature set described in `.github/prompts/01-build-app.md`.

The implementation surface is still driven by the prompt set in `.github/prompts/`:

- Recommended stack: React + TypeScript + Vite.
- Styling: Tailwind CSS.
- Persistence: IndexedDB via `idb`.
- Hosting target: static files such as GitHub Pages.

## Quick Orientation

Read these in order when starting product work:

1. `.github/prompts/00-onboarding.md`
2. `.github/prompts/01-build-app.md`
3. `.github/prompts/02-author-questions.md`
4. `.github/prompts/03-validate.md`

Use these files as the current product ground truth:

- `schema/question.schema.json` defines the item contract.
- `blueprints/cctc-from-2026-07.json` is the default/current exam blueprint.
- `blueprints/cctc-thru-2026-06.json` is the legacy blueprint with the crosswalk.
- `questions/_examples/examples.json` contains illustrative items and currently serves as the fallback bank until primary non-underscore shards are added.
- `questions/README.md` defines sharding, review status, and tagging conventions.

## Repository Structure

```text
/
├── README.md
├── AI_REPO_GUIDE.md
├── AGENTS.md
├── CLAUDE.md
├── package.json
├── .github/
│   ├── copilot-instructions.md
│   ├── workflows/
│   │   ├── ci-tests.yml
│   │   └── validate.yml
│   └── prompts/
│       ├── 00-onboarding.md
│       ├── 01-build-app.md
│       ├── 02-author-questions.md
│       ├── 03-validate.md
│       └── repo-onboarding.md
├── public/
│   ├── manifest.webmanifest
│   └── sw.js
├── scripts/
│   └── validate.mjs
├── blueprints/
│   ├── cctc-from-2026-07.json
│   └── cctc-thru-2026-06.json
├── schema/
│   └── question.schema.json
├── questions/
│   ├── README.md
│   └── _examples/
│       └── examples.json
├── src/
│   ├── app/
│   ├── data/
│   ├── lib/
│   ├── types/
│   └── test/
├── docs/
│   ├── README.md
│   ├── FAQ.md
│   ├── compliance_schemas.md
│   ├── decisions/
│   ├── guides/
│   ├── postmortems/
│   ├── reference/
│   └── research/
└── .context/
    ├── 00_INDEX.md
    ├── roadmap.md
    ├── rules/
    ├── sessions/
    ├── state/
    └── vision/
```

## Product Rules That Matter

- One question bank serves both blueprints. Items are tagged to the 2026-07 blueprint; the legacy blueprint derives sections from a crosswalk in `blueprints/cctc-thru-2026-06.json`.
- Every authored item starts as `draft`. A human SME promotes an item to `reviewed` only after factual verification.
- The app may include draft items in study mode, but exam mode defaults to reviewed-only items.
- Questions, stems, options, and explanations must be original wording. Facts may be sourced; copyrighted expression may not be copied.
- The app is a study tool, not medical advice, and not an official ABTC scoring engine.

## Key Files By Purpose

### Product prompts

| File | Purpose |
|---|---|
| `.github/prompts/00-onboarding.md` | Product context, guardrails, and definition of done |
| `.github/prompts/01-build-app.md` | App behavior: exam engine, modes, persistence, history, responsive UI |
| `.github/prompts/02-author-questions.md` | Question-authoring rules, sourcing, copyright, blueprint mapping |
| `.github/prompts/03-validate.md` | Validation requirements for schema, integrity, and coverage |

### App scaffold and validation

| File | Purpose |
|---|---|
| `package.json` | Defines local scripts: `npm test`, `npm run build`, `npm run validate`, `npm run reference:*`, plus Vite dev/preview commands |
| `src/app/App.tsx` | Current top-level app shell for starting sessions, resuming, history, and flags UI |
| `src/data/questionBank.ts` | Loads live bank shards and falls back to `_examples` when no primary shards exist |
| `src/lib/sessionAssembly.ts` | Builds weighted sessions and default settings from blueprint data |
| `src/lib/sessionPersistence.ts` | Tracks recently seen item ids and stale-flag pruning helpers |
| `scripts/validate.mjs` | Local validator for schema, integrity checks, `primary_anchor` keyword checks, and coverage warnings |
| `scripts/reference.mjs` | Builds and searches the gitignored PDF page index (`docs/reference/.index/`) |
| `.github/workflows/validate.yml` | Runs `npm ci` and `npm run validate` on push and pull request |

### Exam data

| File | Purpose |
|---|---|
| `schema/question.schema.json` | JSON Schema for a CCTE question item |
| `blueprints/cctc-from-2026-07.json` | Current blueprint, default exam settings, domain targets |
| `blueprints/cctc-thru-2026-06.json` | Legacy blueprint, section targets, task-to-section crosswalk |
| `questions/README.md` | Bank layout, sharding rules, status workflow, tagging model |
| `questions/_examples/examples.json` | Sample `one_best` and `complex_combo` items |

### Governance and process

| File | Purpose |
|---|---|
| `AGENTS.md` | Root agent contract and rule index |
| `.context/rules/agent_ownership.md` | Ownership map for role-based edits |
| `.context/rules/process_doc_maintenance.md` | Doc-sync triggers |
| `.context/rules/process_subagent_bootstrap.md` | Subagent startup and compliance contract |
| `docs/compliance_schemas.md` | Compliance block reference for plan, parent, and subagent evidence |

## What Exists Today vs. Later

### Exists now

- CCTE product definition and constraints
- React + TypeScript + Vite app scaffold
- Static app assets for install/offline hosting
- Local validation command and GitHub validation workflow
- Prompt-driven build plan
- Two blueprint JSON files
- Question JSON schema
- Example questions and bank conventions
- Tests for the app shell and session helpers
- Governance docs inherited from the bootstrap template

### Planned next

- Expand the real question bank under domain directories
- Grow reviewed-item coverage toward the target bank size
- Continue implementing and refining the full feature set described in `.github/prompts/01-build-app.md`
- Keep validation and tests green as new bank shards land

## Verified Commands

These commands were verified against the current repo contents on 2026-06-01:

```bash
npm test
npm run build
npm run validate
npm run validate                              # full local gate (required before merge)
npm run validate:ci                           # CI subset (format + OPTN content where indexed)
npm run validate:references                   # reference phase only
npm run validate:references -- --item cctc-2004
npm run validate:strict
npm run reference:fetch-optn
npm run reference:index
```

Supporting file-grounded verification for those commands:

- `package.json` defines `test`, `build`, `validate`, and `reference:*` scripts.
- `scripts/reference.mjs` builds a gitignored page index under `docs/reference/.index/` for PDF lookup during authoring.
- `scripts/validate.mjs` checks each item's `primary_anchor.keywords` against the index when present locally.
- `.github/workflows/validate.yml` runs `npm ci` and `npm run validate` on push and pull request.
- `scripts/validate.mjs` is the validator invoked by both the local script and the workflow.
- `src/data/questionBank.ts` confirms the current example fallback behavior when no primary shards exist.

## Working Notes For Agents

- Treat README as the human-facing summary and this guide as the agent-facing source of current repo reality.
- If you add build, run, validate, or deployment commands later, update this file in the same change.
- Describe the project as an early static React/TypeScript app scaffold with real validation tooling, not as a finished exam product.
