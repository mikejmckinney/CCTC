# CCTE Roadmap

> **Purpose**: Track the product phases for the CCTE static practice-exam app so agents can align implementation work to the actual learner-facing outcome.

> **Canonical product specs**: This roadmap is a phase tracker, not a substitute for the numbered prompts. For full requirements, read in order: [`.github/prompts/00-onboarding.md`](../.github/prompts/00-onboarding.md) → [`01-build-app.md`](../.github/prompts/01-build-app.md) → [`02-author-questions.md`](../.github/prompts/02-author-questions.md) → [`03-validate.md`](../.github/prompts/03-validate.md).

## Roadmap Principles

1. Keep the product static-hostable, client-side only, and offline-capable after first load.
2. Separate exam-engine behavior, content validation, and question-bank growth so each can evolve without a backend.
3. Treat reviewed clinical content and schema validation as release gates, not cleanup tasks.
4. Prefer small, testable slices that preserve resume safety and scoring correctness.

## Current Phase

**Phase 2 - Exam engine and persistence** (in progress)

Phase 1 bootstrap and the static app scaffold are largely complete in the working tree. The session engine, IndexedDB persistence, validation tooling, and most learner-facing flows from `01-build-app.md` exist in code, but several Phase 2 acceptance checks (resume verification, soft sampling targets) and all real bank growth from `02-author-questions.md` remain open.

---

## Phase 1: Bootstrap and App Scaffold

**Status**: Complete (working tree; land via PR)

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

**Status**: In Progress

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

### Open items (known gaps vs `01-build-app.md`)
- [x] Automated proof that serialized session state preserves order, option order, answers, bookmarks, and remaining time (`src/lib/sessionResume.test.ts`).
- [x] Runtime sampler honors blueprint `domain_tolerance_items` when reporting category shortages (`getScaledDomainTolerance`).
- [x] Runtime sampler approximates `cognitive_level_targets` and `organ_targets` as soft targets during bucket selection.
- [x] Align `src/data/questionBank.ts` example fallback with `questions/README.md` (documented bootstrap fallback until domain shards exist).

---

## Phase 3: Question-Bank Growth and Validation

**Status**: In Progress (validation tooling present; bank growth not started)

**Objective**: Make the bank safe to expand while keeping schema integrity and blueprint coverage visible.

**Canonical specs**:
- Validation and CI: [`.github/prompts/03-validate.md`](../.github/prompts/03-validate.md)
- Question authoring: [`.github/prompts/02-author-questions.md`](../.github/prompts/02-author-questions.md) and [`questions/README.md`](../questions/README.md)

This phase is **not complete** until non-`_` shards exist under `questions/`, `npm run validate` passes on them, and reviewed coverage is growing toward the ~500-item target.

### Deliverables
- Build-time validation for every question file against the schema.
- Cross-field integrity checks and duplicate-id protection.
- Coverage reporting for both blueprint versions.
- Authoring workflow support for draft versus reviewed items.
- Sharded bank layout under `questions/domain-*` (≤50 items per file).

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
- [ ] `references` with locators; use public authoritative sources where possible (OPTN/UNOS, CMS, guidelines).
- [ ] `notes` field states what the reviewer must verify (policy versions, lab ranges, drug interactions, etc.).

**Tagging (2026-07 blueprint; legacy via crosswalk)**
- [ ] `domain` (required), `task` (recommended), `knowledge_codes` (optional).
- [ ] `cognitive_level` tagged; bank trends toward ~35% recall / 52% application / 13% analysis.
- [ ] `organ` tagged; ~50% `general`, remainder per blueprint `organ_targets`; include some pediatric items.
- [ ] Both `one_best` and `complex_combo` formats represented across the bank.

**Structure and growth**
- [x] Shard directories created: `questions/domain-1-education/`, `domain-2-pretx/`, `domain-3-postop/` (add JSON shards at ≤50 items per file).
- [ ] After each batch, run `npm run validate` and fill under-represented domains, tasks, cognitive levels, and organs.
- [ ] Grow reviewed items toward ~500 so sampling has variety beyond a single exam.

**Reviewer / flag loop**
- [ ] Triage exported flags (`ccte-flags.json` from the app) alongside new authoring.
- [ ] On fix: edit item in repo, bump `version`, set back to `draft`, re-review; stale app flags drop on version mismatch.

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

1. Land Phase 1 bootstrap work on `feature/op-ccte-bootstrap` (commit + PR).
2. Continue Phase 2 hardening: browser-level resume smoke, richer history trends, device/a11y pass.
3. Start Phase 3 bank growth per `02-author-questions.md` — add first reviewed JSON shards under `questions/domain-*`; keep `npm run validate` green.
4. Finish Phase 4 polish and static hosting after the core study/exam loops are stable on a real (not example-only) bank.
