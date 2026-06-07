# CCTE Roadmap

> **Purpose**: Track the product phases for the CCTE static practice-exam app so agents can align implementation work to the actual learner-facing outcome.
>
> **Canonical product specs**: This roadmap is a phase tracker, not a substitute for the numbered prompts. For full requirements, read in order: [`.github/prompts/00-onboarding.md`](../.github/prompts/00-onboarding.md) → [`01-build-app.md`](../.github/prompts/01-build-app.md) → [`02-author-questions.md`](../.github/prompts/02-author-questions.md) → [`03-validate.md`](../.github/prompts/03-validate.md).

## Roadmap Principles

1. Keep the product static-hostable, client-side only, and offline-capable after first load.
2. Separate exam-engine behavior, content validation, and question-bank growth so each can evolve without a backend.
3. Treat reviewed clinical content and schema validation as release gates, not cleanup tasks.
4. Prefer small, testable slices that preserve resume safety and scoring correctness.

## Current Phase

**Phase 3 — Question-bank growth and validation**

Phase 1 and Phase 2 are complete on `main` (landed via [#1](https://github.com/mikejmckinney/CCTE/pull/1)). The static app, exam engine, persistence, validation tooling, and browser resume e2e coverage are in place. The next product-critical work is authoring real question shards under `questions/domain-*` per `02-author-questions.md`.

---

## Phase 1: Bootstrap and App Scaffold

**Status**: Complete (on `main`)

**Objective**: Replace template-era context with product context and stand up the static browser app shell.

### Deliverables
- Product-specific `.context` roadmap and vision files.
- Frontend scaffold for a static React/TypeScript-style app with responsive layout.
- App shell for start screen, session creation, and top-level navigation.
- Build path ready for offline-capable static hosting.

### Acceptance Criteria
- `.context` files describe CCTE rather than `ai-repo-template`.
- The app runs locally as a static client-side project.
- The shell exposes the core settings surface: blueprint, item count, timer, and mode.

---

## Phase 2: Exam Engine and Persistence

**Status**: Complete (on `main`)

**Objective**: Implement the session engine that assembles exams, freezes order, and survives interruptions.

**Canonical spec**: [`.github/prompts/01-build-app.md`](../.github/prompts/01-build-app.md) (sampling, modes, persistence, scoring, history).

### Deliverables
- Blueprint-aware session assembly and weighted sampling.
- Frozen question order and option order per session.
- IndexedDB persistence for active session, answers, bookmarks, timer, and history.
- Resume flow that restores the exact in-progress session state.

### Acceptance Criteria
- Study and Exam modes both run end-to-end.
- Save-after-each-question and save-after-navigation behavior is verified.
- Closing and reopening the app restores the active session without reshuffling.
- Score reports show overall and per-category raw breakdowns.

### Verification (closed on `main`)
- [x] Unit proof that serialized session state preserves order, option order, answers, bookmarks, and timer fields (`src/lib/sessionResume.test.ts`).
- [x] Browser e2e resume smoke: reload restores answers, bookmarks, and item position via IndexedDB (`e2e/resume.spec.mjs`; CI runs `npm run test:e2e:playwright`).
- [x] Runtime sampler honors blueprint `domain_tolerance_items` when reporting category shortages (`getScaledDomainTolerance`).
- [x] Runtime sampler approximates `cognitive_level_targets` and `organ_targets` as soft targets during bucket selection.
- [x] Prefer unseen items over recently seen items within each blueprint bucket before soft-target ranking.
- [x] Example-bank fallback documented and implemented in `src/data/questionBank.ts` until domain shards exist.

### Deferred to Phase 4
- Richer history trend view (current UI shows a short recent-score list only).

---

## Phase 3: Question-Bank Growth and Validation

**Status**: In Progress (validation + reference index in place; 25 draft items across all blueprint tasks)

**Objective**: Make the bank safe to expand while keeping schema integrity and blueprint coverage visible.

**Canonical specs**:
- Validation and CI: [`.github/prompts/03-validate.md`](../.github/prompts/03-validate.md)
- Question authoring: [`.github/prompts/02-author-questions.md`](../.github/prompts/02-author-questions.md) and [`questions/README.md`](../questions/README.md)
- **Why** reference/locator rules: [`docs/decisions/adr-030-verifiable-question-references.md`](../docs/decisions/adr-030-verifiable-question-references.md)

This phase is **not complete** until reviewed coverage is growing toward the ~500-item target with verifiable references on every item.

### Deliverables
- Build-time validation for every question file against the schema.
- Cross-field integrity checks and duplicate-id protection.
- Coverage reporting for both blueprint versions.
- Authoring workflow support for draft versus reviewed items.
- Sharded bank layout under `questions/domain-*` (≤50 items per file).
- Local PDF reference index (`npm run reference:*`) including OPTN policies bundle — see ADR-030.
- `primary_anchor` + verifiable locator standard enforced in validator — see ADR-030.

### Acceptance Criteria
- Invalid question files fail validation and block the build.
- Coverage output shows reviewed-item availability by domain or legacy section.
- The bank structure supports steady growth toward a broad reviewed practice set.

### Authoring checklist (from `02-author-questions.md`)

Use this when expanding the bank; do not duplicate the full authoring rules here.

**Content and guardrails**
- [ ] Every new item is original expression (facts OK; no copied stems, vignettes, or brain-dump material). See `00-onboarding.md` guardrails.
- [ ] Every authored item starts as `"status": "draft"`; only a human SME promotes to `"reviewed"`.
- [ ] One defensible correct answer; plausible distractors; coordinator-level scope (not NP/PA).
- [ ] `primary_anchor` set source-first; `references` with findable locators per ADR-030 / `02-author-questions.md` (textbook outline + `PDF p. N`; OPTN Policy § + `#page=N` when citing the policies PDF; no generic OPTN index URLs).
- [ ] Add OPTN policies-PDF corroboration only when a specific Policy § is already cited and verified on the indexed page (additive — keep useful HRSA URLs).
- [ ] `notes` field states what the reviewer must verify (policy versions, lab ranges, drug interactions, etc.).

**Tagging (2026-07 blueprint; legacy via crosswalk)**
- [ ] `domain` (required), `task` (recommended), `knowledge_codes` (optional).
- [ ] `cognitive_level` tagged; bank trends toward ~35% recall / 52% application / 13% analysis.
- [ ] `organ` tagged; ~50% `general`, remainder per blueprint `organ_targets`; include some pediatric items.
- [ ] Both `one_best` and `complex_combo` formats represented across the bank.

**Structure and growth**
- [x] Shard directories created: `questions/domain-1-education/`, `domain-2-pretx/`, `domain-3-postop/` (add JSON shards at ≤50 items per file).
- [x] First draft shards landed: `batch-01.json` + `batch-02.json` in each domain (25 draft items; all `status: "draft"`; at least one item per blueprint task).
- [ ] After each batch, run `npm run validate` and fill under-represented domains, tasks, cognitive levels, and organs.
- [ ] Grow reviewed items toward ~500 so sampling has variety beyond a single exam.

**Reviewer / flag loop**
- [ ] Triage exported flags (`ccte-flags.json` from the app) alongside new authoring.
- [ ] On fix: edit item in repo, bump `version`, set back to `draft`, re-review; stale app flags drop on version mismatch.

### Validation tooling (done vs deferred)

**Done**
- [x] Decomposed validator (`scripts/validate/` modules + orchestrator).
- [x] Full local gate: `npm run validate` (schema + integrity + reference format + indexed content).
- [x] CI subset: `npm run validate:ci` (format + OPTN-indexed content; textbook content skipped with logged skips).
- [x] Authoring loop: `npm run validate:references`.
- [x] OPTN policies PDF index (`npm run reference:fetch-optn`, `reference:index -- optn-policies`).
- [x] Verification stub **design** — [`docs/reference/verification-stubs/README.md`](../docs/reference/verification-stubs/README.md), [`schema/reference-verification-stub.schema.json`](../schema/reference-verification-stub.schema.json).

**Deferred (CI hard-fail for textbook anchors without PDFs)**
- [ ] `npm run reference:export-stubs` — generate `questions/.verification/<item-id>.json` from local full validate + index.
- [ ] `npm run validate:stubs` — CI hard-fail: question JSON must match committed stubs (keywords, pages, Policy §).
- [ ] Wire `validate:stubs` into `.github/workflows/validate.yml` after stubs exist for the bank.
- [ ] PR checklist / template note: local `npm run validate` required before merge until stubs cover all items.

Until stubs ship, **local full validate is the textbook content gate**; CI alone is necessary but not sufficient (see `03-validate.md`).

---

## Phase 4: Review Feedback, Polish, and Release Readiness

**Status**: In Progress (partial — flagging and disclaimer exist in code)

**Objective**: Finish the learner experience and prepare the static app for real study use.

**Canonical spec**: [`.github/prompts/01-build-app.md`](../.github/prompts/01-build-app.md) (flagging, responsive/a11y, disclaimer, hosting).

### Deliverables
- Item flagging workflow with stable JSON export.
- Responsive polish for phone, tablet, and laptop.
- Accessibility, disclaimer, and history-review refinements.
- Release-ready validation and deployment hygiene for static hosting.

### Acceptance Criteria
- Users can flag items anywhere they review content without mutating the bank.
- Mobile and keyboard flows are usable without layout breakage.
- The app clearly states its unofficial, independent study-aid status.
- A production static build is ready for GitHub Pages or equivalent hosting.

### Open items (known gaps vs `01-build-app.md`)
- [ ] Device-level responsive and accessibility pass (focus, contrast, one-handed mobile use).
- [ ] GitHub Pages or equivalent deploy config (`vite` `base`, hosting workflow).
- [ ] Richer history trend view (current UI shows a short recent-score list only).

---

## Near-Term Sequencing

1. ~~Land Phase 1–2 bootstrap and exam engine on `main`~~ (done — [#1](https://github.com/mikejmckinney/CCTE/pull/1)).
2. **Phase 3 bank growth** per `02-author-questions.md` — expand shards; keep `npm run validate` green locally before merge.
3. **Phase 3 deferred:** verification stubs + `validate:stubs` in CI (see Phase 3 checklist).
4. **Phase 4 polish and static hosting** — GitHub Pages deploy, device/a11y pass, richer history trends after a small real bank exists.
