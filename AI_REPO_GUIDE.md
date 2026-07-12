# AI_REPO_GUIDE.md

> Purpose: Canonical agent reference for the CCTC repository.
> Last verified: 2026-07-09

This repository is the CCTC project: a static, client-side practice-exam app for the ABTC Certified Clinical Transplant Coordinator exam. The repo now contains a React + TypeScript + Vite + Tailwind v4 app with IndexedDB persistence, design system, Playwright e2e, and CI workflows alongside the exam specification, blueprint data, schema, and reviewed question bank.

## Current State

- Product: CCTC Practice Exam, an independent study aid for CCTC exam candidates.
- Delivery model: static hosting, offline after first load, no backend, no runtime LLM calls.
- Stack: React 19 + TypeScript + Vite 6 + Tailwind CSS v4 (no `tailwind.config.js`; tokens live in `src/index.css` under `@theme`).
- Persistence: IndexedDB via `idb` (`src/lib/storage.ts`); active session auto-saves on user actions (not on every timer tick).
- Design system: three theme presets (clinical, warm, modern) × light/dark, switchable via `data-theme` on `<html>`. Warm Professional is the default. Token set and reduced-motion handling live in `src/index.css` and `src/components/ThemeProvider.tsx`.
- Current product maturity: **v1 complete on `main`** — exam engine, persistence, flagging, history/category trends, GitHub Pages.
- **Redesign (`redesign/OC2`, PR #30) in review** — adds EMA-based readiness, three-theme design system, dashboard-as-landing, shared `useConfirm`, reported-items page, File System Access API backup, Playwright e2e, and the rest of the file map in this guide.
- Hosting: `.github/workflows/deploy-pages.yml` builds with `VITE_BASE_PATH=/CCTC/` for https://mikejmckinney.github.io/CCTC/
- **v2 (planned):** `.context/vision/v2-roadmap.md` — sync, deep-linked references, runtime generation, organ-balance shards.
- **Template feedback:** `.context/sessions/2026-06-09_cctc-v1-template-feedback.md` — lessons for upstream `ai-repo-template`.

The implementation surface is still driven by the prompt set in `.github/prompts/`:

- Recommended stack: React + TypeScript + Vite.
- Styling: Tailwind CSS v4 (`@theme` blocks, no JS config).
- Persistence: IndexedDB via `idb`.
- Hosting target: static files such as GitHub Pages.

## Quick Orientation

Read these in order when starting product work:

1. `AGENTS.md` (root contract — start every session with the session handshake)
2. `.github/prompts/00-onboarding.md`
3. `.github/prompts/01-build-app.md`
4. `.github/prompts/02-author-questions.md`
5. `.github/prompts/03-validate.md`
6. `docs/guides/reference-indexer.md` when authoring or verifying `primary_anchor` / references

Use these files as the current product ground truth:

- `schema/question.schema.json` defines the item contract.
- `blueprints/cctc-from-2026-07.json` is the default/current exam blueprint.
- `blueprints/cctc-thru-2026-06.json` is the legacy blueprint with the crosswalk.
- `questions/_examples/examples.json` contains illustrative items and serves as the fallback bank when no primary shards match the active blueprint.
- `questions/README.md` defines sharding, review status, and tagging conventions.
- `src/index.css` defines the design tokens (color, type, radius, motion) — read this before adding new colors.

## Repository Structure

> **Branch note:** This tree reflects the state on the `redesign/OC2` branch (PR #30). On `main`, `src/` is flatter (no `components/`, `pages/`, `lib/useConfirm.ts`, `lib/backup.ts`, `lib/demoData.ts`, etc.) and `e2e/` is minimal. The redesign adds the missing paths; once merged, the descriptions in this guide apply to `main` as well. Verify with `git ls-tree` if a specific file is missing from your working tree.

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
│   │   ├── validate.yml
│   │   └── deploy-pages.yml
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
│   ├── validate.mjs
│   ├── run-e2e.mjs
│   ├── run-resume-smoke.mjs
│   └── reference.mjs
├── e2e/
│   ├── helpers.mjs
│   ├── resume.spec.mjs
│   ├── confirm-dialog.spec.mjs
│   └── reported-items.spec.mjs
├── blueprints/
│   ├── cctc-from-2026-07.json
│   └── cctc-thru-2026-06.json
├── schema/
│   └── question.schema.json
├── questions/
│   ├── README.md
│   ├── _examples/
│   │   └── examples.json
│   └── domain-{1,2,3}-*/        # reviewed bank
├── src/
│   ├── app/App.tsx
│   ├── components/
│   │   ├── Navigation.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── ui/                   # Button, Card, Modal, Input, Badge, Progress, RadialGauge
│   ├── data/
│   ├── lib/                      # assembly, persistence, scoring, readiness, backup, useConfirm
│   ├── pages/                    # Dashboard, Session, History, Review, ReportedItems
│   ├── types/
│   └── index.css                 # Tailwind v4 @theme tokens (colors, type, motion)
├── docs/
│   ├── README.md
│   ├── FAQ.md
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
| `.github/prompts/04-cctc-open-design-redesign-and-readme-media-v2.md` | Redesign prototypes + README demo media (optional Open Design tooling) |

### Optional design / README media tooling

| File | Purpose |
|---|---|
| `scripts/bootstrap-open-design.sh` | Clone/build pinned Open Design outside the repo (`docs/design/open-design.lock`) |
| `docs/design/open-design-setup.md` | Human/agent setup for optional Open Design contributor tooling |
| `docs/media/readme-demos/scripts/capture-readme-demos.mjs` | Playwright live captures for README feature demos |
| `DESIGN.md` | UX/design contract for redesign exploration |

### App scaffold and validation

| File | Purpose |
|---|---|
| `package.json` | Defines local scripts: `npm test`, `npm run build`, `npm run validate`, `npm run reference:*`, `npm run test:e2e`, plus Vite dev/preview commands |
| `src/app/App.tsx` | Top-level app shell: routes, session lifecycle, persistence, demo seeding, auto-submit on timer expiry. Wires `useConfirm` for shared confirm dialogs |
| `src/pages/Dashboard.tsx` | Readiness gauge, domain breakdown, recommended next action, quick start, expandable custom settings, recent sessions |
| `src/pages/Session.tsx` | Exam UI: roving radio group (arrow keys), bookmark/report, question tracker, auto-submit on timer expiry |
| `src/pages/History.tsx` | Stacked-area trend chart, All/Exam/Study filter, EMA delta, session list, Clear All, File System Access API backup, link to Reported Items |
| `src/pages/Review.tsx` | Searchable review of a past session with domain/correct/incorrect filters |
| `src/pages/ReportedItems.tsx` | Flag management: edit, delete (via `useConfirm`), export, clear all |
| `src/components/Navigation.tsx` | Header (desktop) + bottom nav (mobile), theme toggle (circular reveal), exam/target pills |
| `src/components/ThemeProvider.tsx` | Theme context, localStorage persistence, `prefers-color-scheme` |
| `src/components/ui/Button.tsx` | CVA variants (primary/secondary/accent/ghost/destructive/link) × sizes |
| `src/components/ui/Modal.tsx` | Focus trap, `useId()`, `dismissible` prop (used by disclaimer) |
| `src/lib/useConfirm.ts` | Shared confirm dialog hook (title/description/confirmLabel/variant) |
| `src/lib/circularReveal.ts` | Old-theme overlay shrinks to click point via `clip-path` animation |
| `src/lib/readiness.ts` | EMA (α=0.3), `computeReadiness(history, target)`, `computeSpacedRepetition` |
| `src/lib/historyTrend.ts` | `buildHistoryTrend` with same-mode-only `recentDelta` |
| `src/lib/backup.ts` | JSON export/import + File System Access API folder sync + active session payload |
| `src/lib/demoData.ts` | 12 sessions (62%→85%) + 3 flags, seeded on first IndexedDB load (`demoSeeded` flag) |
| `src/data/questionBank.ts` | Loads live bank shards and falls back to `_examples` when no primary shards exist |
| `src/lib/sessionAssembly.ts` | Builds weighted sessions and default settings from blueprint data |
| `src/lib/sessionPersistence.ts` | Tracks recently seen item ids and stale-flag pruning helpers |
| `scripts/validate.mjs` | Local validator for schema, integrity checks, `primary_anchor` keyword checks, and coverage warnings |
| `scripts/run-e2e.mjs` | Boots `vite preview` and runs `scripts/run-resume-smoke.mjs` (used by `npm run test:e2e`) |
| `scripts/reference.mjs` | Builds and searches the gitignored PDF page index (`docs/reference/.index/`) |
| `e2e/resume.spec.mjs` | Playwright: reload restores answers, bookmarks, item order via IndexedDB |
| `e2e/confirm-dialog.spec.mjs` | Playwright: submit exam + clear-all-history confirm modals open with correct labels |
| `e2e/reported-items.spec.mjs` | Playwright: Reported Items page reachable from History; demo flags render |
| `.github/workflows/validate.yml` | Runs `npm ci` and `npm run validate` on push and pull request |

### Exam data

| File | Purpose |
|---|---|
| `schema/question.schema.json` | JSON Schema for a CCTC question item |
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
| `.context/rules/process_subagent_bootstrap.md` | Practical subagent dispatch and verification guidance |

## What Exists Today vs. Later

### Exists now

- CCTC product definition and constraints
- React 19 + TypeScript + Vite 6 + Tailwind v4 app
- Static app assets for install/offline hosting
- Local validation command and GitHub validation/e2e/workflows
- Prompt-driven build plan
- Two blueprint JSON files
- Question JSON schema
- Example questions and bank conventions
- Tests for the app shell, session helpers, and useConfirm
- Governance docs inherited from the bootstrap template
- Playwright e2e suite (resume, confirm dialog, reported items)

### Question bank (current)

- **506 reviewed items** in `questions/domain-*/batch-01.json` through `batch-42.json` (IDs `cctc-1001`–`1169`, `2001`–`2168`, `3001`–`3169`).
- **Scenario companions** (in progress): paired vignette bank under `questions/scenario/` (IDs `cctc-6001`–`cctc-6506`, field `companion_of` → standard id). See [ADR-031](docs/decisions/adr-031-scenario-companion-bank.md) and `questions/scenario/README.md`.
- All production-bank items `status: "reviewed"` (SME promotion 2026-06-08); `_examples/` stays `draft`. Validator enforces schema, integrity, and verifiable references per ADR-030.
- Bank authoring soft targets (see `questions/README.md`, `02-author-questions.md`): cognitive mix ~35/52/13%; `recipient_age: pediatric` **5–7%** of bank (`both` excluded; live CCTC exam ~5% pediatric).
- Batch 03 (2026-06-06): depth on high-weight tasks, first lung item, second pediatric item, second `complex_combo`, OPTN-primary inactive waitlist items (Policy 3.4.E).
- Batch 04 (2026-06-05): first `heart_lung`, `pancreas`, `intestine`, `kidney_pancreas` organ tags; SPK rejection `complex_combo`; living donor and preop evaluation depth.
- Batch 05 (2026-06-05): evaluation/screening depth, OPTN HLA/WHO listing, UNet data, FAST stroke urgent contact, tacrolimus nephrotoxicity (Nursing Drug Handbook), late-mortality `complex_combo`.
- Batch 06 (2026-06-05): LAS updates, PHS donor consent, CMV prophylaxis, cyclosporine gingival hypertrophy, infection-prevention `complex_combo`, deeper lung/heart/liver organ coverage.
- Batch 07 (2026-06-08): waitlist LAS/MELD testing, liver cardiac stress, LFT/biopsy monitoring, OPTN TRR timely data, post-transplant diabetes incidence.
- Batch 08 (2026-06-08): living-donor follow-up commitment, medication teaching `complex_combo`, pancreas/lung waitlist depth, chest-pain urgent contact, grapefruit–IS interaction, mycophenolate adverse effects.
- Batch 09 (2026-06-05): heart/liver smoking risks, lung pulmonary rehab, pediatric HPV teaching, cardiology referral after positive stress test, indeterminate evaluation outcome, kidney urinary-leak pattern/management, OPTN TCR timing.
- Batch 10 (2026-06-05): nutritional hyperlipidemia risk, living-donor ESRD counseling, long-term IS `complex_combo`, OPTN inactive kidney waiting-time accrual, SPK suitability, liver HCC surveillance, cholangitis pattern/management, OPTN TRF timing.
- Batch 11 (2026-06-05): living-donor benefit/risk depth, OPTN registration notification, lung waitlist reporting, malignancy-prevention `complex_combo`, PCP prophylaxis, cyclosporine cosmetic effects.
- Batch 12 (2026-06-05): vaccination household precautions, heart inactive waiting-time rule, intestine standard of care, ostomy urgent contact, azathioprine cytopenias, ureteral obstruction.
- Batch 13 (2026-06-05): obesity contraindication, unpasteurized-dairy teaching, dietary `complex_combo`, hot-tub guidance, OPTN waitlist removal, PAK evaluation, skin/dentition screening, bone densitometry, wound-drainage urgent contact, surgical wound infection, tacrolimus tremor, lymphocele monitoring.
- Batch 14 (2026-06-05): transplantation-risk `complex_combo`, discharge insulin teaching, pediatric community infections, PCP waitlist coordination, waitlist testing priority, pediatric transition, fever septic workup, skin-cancer long-term risk, day-after-discharge call, PPI–MMF interaction; all `general` organ (blueprint organ gap closed).
- Batch 15 (2026-06-05): liver alcohol abstinence/contract, heart activity limits, lifestyle `complex_combo`, living-liver donor discharge, heart RHC monitoring, lung referral timing, kidney hypercoagulability screening, metabolic bone disease, medication-box teaching, return-to-work counseling, lung BOS; **all per-task blueprint targets met**.
- Batch 16 (2026-06-05): pancreas indications/evaluation/complications, heart-lung Eisenmenger and toxoplasmosis teaching, intestine oral aversion (pediatric), child-development consult, two new `complex_combo` items (toxoplasmosis, pancreas fluid management).
- Batch 17 (2026-06-05): pediatric kidney ATN, intestine GVHD, heart CAV/chronic rejection, CMV prevention `complex_combo`, DSA post-transplant monitoring, rituximab desensitization risks, SPK indication, heart preop emotional support, pediatric ATN monitoring `complex_combo`, TMP-SMX toxoplasma benefit.
- Batch 18 (2026-06-05): liver hepatopulmonary syndrome, CMV organ-specific `complex_combo`, living-liver surgical risk, EBV/PTLD screening, belatacept EBV requirement, OPTN lung inactive waiting time, CMV vanishing bile duct/glomerulopathy, adult ATN signs `complex_combo`.
- Batch 19 (2026-06-05): living-donor decline right, BK virus teaching/monitoring `complex_combo`, lung CMV bronchiolitis, live-vaccine interval, OPTN liver/intestine inactive waiting time, donor chart review, sirolimus wound healing, vaccination restart timing, BK nephropathy.
- Batch 20 (2026-06-05): federal organ-sales prohibition, JC virus/PML `complex_combo`, pediatric thrombosis risk/urgent anuria, pretransplant vaccine response, OPTN pancreas inactive waiting time, mTOR classification, sirolimus/everolimus black-box warnings, sirolimus adverse-effect `complex_combo`.
- Batch 21 (2026-06-05): PTA criteria, parvovirus B19, hepatorenal failure, living-donor written consent, OPTN pancreas-islet inactive waiting time, donor risk assessment, heart CNI-to-sirolimus CAV benefit, donor-transmitted infection combo.
- Batch 22 (2026-06-05): rabies vocation vaccination, pediatric HPV/hepatitis B sexual-health teaching, adenovirus `complex_combo`, HHV-6 timing, DSA-versus-PRA, evaluation viral studies/biopsies, prospective crossmatch, pediatric kidney rejection, delayed graft function supportive care.
- Batch 23 (2026-06-05): meningococcal vaccination, pregnancy timing, visitor precautions, RSV combo, OPTN waiting-time modification, ischemia definitions, parainfluenza counseling, cardiac cath requirement, chronic rejection depth.
- Batch 24 (2026-06-05): fixed pulmonary hypertension, well-water Cryptosporidium, pediatric acetaminophen, heart cath combo, coronary angiography purpose, vasodilator testing, liver smoking risks, ankle-brachial screening, pediatric PCP/TB/UTI depth.
- Batch 25 (2026-06-05): kidney/heart smoking risks, pet-safety teaching, Listeria/Nocardia combo, EPTS/KDPI, kidney paired donation, CARV/influenza post-transplant depth (adult/both batch to nudge pediatric share toward 5–7%).
- Batch 26 (2026-06-05): squamous-cell/sun-protection teaching, boil-water advisories, cryptococcosis pretransplant therapy, kidney perfusion allocation, colonoscopy/dental health maintenance, long-term skin surveillance combos.
- Batch 27 (2026-06-05): gender-specific screening teaching, BCC/SCC epidemiology, baseline/post-transplant DEXA, skin-cancer behavior/distribution combos; pediatric soft target revised to 5–7% (adult/both batch).
- Batch 28 (2026-06-05): tobacco/marijuana avoidance, diabetes glucose teaching, hepatitis B HCC prevention, visitor precautions, PTLD risk/presentation/treatment/prevention depth (adult/both batch).
- Batch 29 (2026-06-05): tanning-bed avoidance, hyperlipidemia/hypertension long-term care, pet safety, food cross-contamination, PTLD CMV/mTOR depth, ACS cancer screening combos (adult/both batch).
- Batch 30 (2026-06-05): exercise counseling, dietary egg/outbreak teaching, hand-hygiene combo, aquarium avoidance, EBV/IVIG PTLD depth, bisphosphonate/DEXA bone-health combo (adult/both batch; pediatric share within 5–7%).
- Batch 31 (2026-06-05): sexual/reproductive health, PTLD rituximab/R-CHOP/surgery depth, denosumab/calcitonin bone therapy, renal-dysfunction progression (adult/both batch).
- Batch 32 (2026-06-05): IUD/libido/pregnancy-registry teaching, EBV incidence depth, pediatric PTLD age risk, antirejection prophylaxis, radiotherapy/interferon therapy, visitor hygiene combo.

- Batch 39–42 (2026-06-05): final authoring push to **505 items**; hand-hygiene, skin-cancer prevention, fungal infection depth; SME bulk review completed 2026-06-08.
- PR #3 triage (2026-06-08): `QuestionReview` parity with active session, optional chaining on `rationale_incorrect`, examples `primary_anchor` + locator standards, `cctc-3019` retagged to D2/`020500`, `.cursor/mcp.json` removed, ABTC handbook excluded from blocking markdownlint.

### Phase 4 (shipped on `main`)

- History trend chart + per-domain breakdown (`src/lib/historyTrend.ts`, `src/pages/History.tsx`)
- GitHub Pages deploy workflow (`deploy-pages.yml`, `VITE_BASE_PATH`)
- CSS dedup + `:focus-visible` + mobile sticky session toolbar
- Trend chart uses fixed plot area (0–100% scale); `historyTrend.test.ts` matches `HistoryEntry` schema
- Category-level history drill-down via `onViewSession` from the list

### `redesign/OC2` branch (PR #30, in review)

- Three-theme design system (`data-theme` attribute) × light/dark, switchable at runtime; Warm Professional is default
- Tailwind v4 `@theme` tokens in `src/index.css` (no `tailwind.config.js`)
- Decomposed App.tsx: pages split into `src/pages/{Dashboard,Session,History,Review,ReportedItems}.tsx`
- Dashboard: EMA-based readiness score, domain breakdown with "Largest gap" badge, recommended next action, expandable custom settings
- Session: arrow-key roving `role="radiogroup"`, bookmark/report buttons, auto-submit on timer expiry (uses `performance.now()` delta to avoid drift when tab is throttled)
- History: stacked-area chart with weighted domain contributions, All/Exam/Study filter, EMA delta, File System Access API folder sync, link to Reported Items
- Reported Items: edit/delete/export, Clear All
- Shared `useConfirm` hook for all destructive dialogs (clear history, clear flags, delete report, submit session)
- Circular-reveal theme toggle animation
- Mobile bottom nav, 44px min touch targets, `safe-area-inset-bottom`
- Demo data seeds 12 sessions (62%→85%) + 3 flags on first IndexedDB load via `demoSeeded` flag in `AppMeta`
- Playwright e2e: `e2e/resume.spec.mjs`, `e2e/confirm-dialog.spec.mjs`, `e2e/reported-items.spec.mjs` + `scripts/run-resume-smoke.mjs`

### Planned next

- Cross-device sync (File System Access API is the first step; v2 is server-mediated)
- Deep-linked references (PDF page viewer ± context; optional public "Further review" links)
- Runtime-generated questions to reduce memorization
- Organ-balance content shards for blueprint organ mix
- Optional bank growth beyond ~506 reviewed items for fresher repeat sessions

## Verified Commands

These commands were verified against the current repo contents on 2026-06-01:

```bash
npm test
npm run build
npm run build:ci                          # CI e2e build (validate:ci, no textbook PDFs)
npm run validate
npm run validate                              # full local gate (required before merge)
npm run validate:ci                           # CI subset (format + OPTN live content)
npm run validate:stubs                        # compare bank JSON to questions/.verification/
npm run validate:coverage                   # gap tables only (dashboard)
npm run validate:references                   # reference phase only
npm run validate:references -- --item cctc-2004
npm run validate:strict
npm run reference:fetch-optn
npm run reference:audit-optn                  # OPTN page drift analysis (CI uses on schedule failure)
npm run reference:index
npm run reference:export-stubs                # regenerate stubs after anchor changes (--force)
```

Supporting file-grounded verification for those commands:

- `package.json` defines `test`, `build`, `validate`, and `reference:*` scripts.
- `docs/guides/reference-indexer.md` — single architecture/operator guide for the PDF index pipeline.
- `scripts/reference.mjs` builds a gitignored page index under `docs/reference/.index/` for PDF lookup during authoring.
- `scripts/validate.mjs` checks each item's `primary_anchor.keywords` against the index when present locally.
- `.github/workflows/validate.yml` runs `validate:ci` + `validate:stubs` in the validate job and `build:ci` + Playwright in the e2e job on push and pull request; on **scheduled failure** on `main`, `optn-drift-remediate` opens/updates an `optn-drift` issue and may open a remediation PR. Optional repo variable `OPTN_DRIFT_AUTOMERGE=true` squash-merges the remediation PR after CI passes (default: off).
- `scripts/validate.mjs` is the validator invoked by both the local script and the workflow.
- `src/data/questionBank.ts` confirms the current example fallback behavior when no primary shards exist.

## Working Notes For Agents

- Treat README as the human-facing summary and this guide as the agent-facing source of current repo reality.
- If you add build, run, validate, or deployment commands later, update this file in the same change.
- Describe the project as a v1-complete static practice-exam app with 506 reviewed items, not as a scaffold.
- When refactoring `App.tsx`, prefer extracting hooks (e.g. `useConfirm`) over per-page confirm state. See `src/lib/useConfirm.ts` for the current pattern.
- All new colors must come from the `src/index.css` `@theme` token set. Do not introduce inline hex values.
- When the active branch is `redesign/OC2`, expect new code under `src/components/ui/`, `src/pages/`, and `src/lib/` that does not exist on `main`. Verify by reading the file before citing.
