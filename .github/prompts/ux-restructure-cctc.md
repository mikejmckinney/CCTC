---
description: Restructure the CCTC practice-exam UX around the candidate's learning loop (orient → practice → review → improve), split the learner and SME surfaces, and decompose the monolithic App.tsx. Single autonomous PR on an isolated branch — presentation only, no logic/schema changes.
agent: agent
---

# UX Restructure — CCTC Practice Exam (single-PR / autonomous)

> **Context:** Project-level restructure run **autonomously to completion as a
> single PR on the current branch.** This is an isolated experiment branch — do
> **not** merge to `main`; the maintainer compares finished branches and picks a
> winner later. Implement the full restructure end-to-end without waiting for
> sign-off mid-run.
>
> **Optional direction hint:** if a line beginning `DIRECTION:` appears in the
> invoking comment (e.g. `DIRECTION: minimal, single-column, calm`), treat it as
> the design direction to pursue. If absent, **self-select one coherent
> direction** and record it in the PR body — do not ask.
>
> Read this entire file before writing code. Deliver **one PR**, but structure it
> as **ordered commits** (decomposition first — see Procedure) so a regression
> can be bisected and the behavior-preserving checkpoint stays legible.

---

## Client-facing outcomes (this is the spec — lead with these)

After this work, a CCTC candidate can:

1. **Land and know what to do.** The home screen is a **dashboard**: latest
   unofficial practice estimate vs. target, a short score trend, and weakest
   domains — with one obvious primary action, **Start practice**, and **Resume**
   when a session is in progress. No nine-field form on arrival.
2. **Start in one tap, customize only if they want to.** Smart defaults start a
   session immediately; advanced setup (blueprint version, drafts, target
   threshold, timer, scenario companions) sits behind a **Customize**
   disclosure, not on the landing surface.
3. **Focus on the question while practicing.** The session runner keeps the
   question as the visual hero; secondary metrics present but demoted. On a
   phone, **every answer choice and the explanation are fully readable and never
   covered by the action bar.**
4. **Get a real payoff at the end.** A dedicated **Results** screen shows the
   score, a **per-domain breakdown front-and-center**, a "drill your weakest
   domain" action, and a path into answer-by-answer review.
5. **See progress over time.** A Progress/History area keeps the session list and
   trends, with the **domain-level weak/improving view elevated** as the
   throughline.

A reviewer/SME (separate persona) can still:

6. Capture flags **during a session** (unchanged), and manage/export them from a
   **clearly-labeled utility area** that is no longer a peer of the learner's
   primary navigation.

> Pre-flight check: if any screen in your plan reads "a page that shows X"
> instead of "the user can do X," rewrite it before implementing.

## Decisions already made (do not relitigate)

- **D1 — Dashboard is the new home.** (Not a slimmed-down form.)
- **D2 — Flags *management/export* demotes to a utility area; in-session
  flagging stays exactly as-is** (`App.tsx` ~1158, the "Flag this item" action
  and `openFlagComposer`).
- **D3 — Dedicated post-session Results screen** (today this is effectively
  folded into history-detail).

## Design direction

The **IA and outcomes above are fixed.** The **visual direction, layout, and
component structure are yours.** Pick the `DIRECTION:` hint if supplied, else
self-select one coherent direction that honors the existing token palette and
the app's warm, clinical, distinctive identity — not generic "AI-dashboard"
chrome. **Record the direction you chose, and why, in the PR body** so finished
branches are comparable. Do not stop to ask.

## Non-negotiables (must stay true)

1. **Bespoke CSS tokens only.** Extend the existing system in `src/app.css`
   (`--brand`, `--accent`, `--surface`, IBM Plex Sans, etc.). **Do not add
   Tailwind, PostCSS, CSS-in-JS, or any styling dependency**, and do not mix
   paradigms. New tokens fine; a new system is not.
2. **Logic, data, and schema are frozen.** No behavior changes in
   `src/lib/**` (scoring, sessionAssembly, sessionPersistence, sessionResume,
   historyTrend, categoryHistoryTrend, storage), `src/data/**`, `src/types/**`,
   `schema/**`, the IndexedDB shape, or scoring/estimate semantics. You may add
   **new pure, read-only selectors** (e.g. "weakest domain from existing
   breakdown data") in `src/lib` **only** if they derive from existing data,
   change no existing function, and ship with unit tests.
3. **Accessibility preserved or improved.** Keep `role="radiogroup"`/`"radio"`,
   `aria-checked`, `aria-label`, the skip-link, the `min-height: 44px`
   tap-target rule, and the `prefers-reduced-motion` block. New interactive
   elements get equivalent semantics.
4. **Session resume must survive.** The active-session persistence/resume path
   (`activeSession`, `sessionPersistence`, `discardActiveSession`) must keep
   working across reload mid-session. Add an e2e if coverage is thin.
5. **Desktop unchanged-or-better; mobile correct.** Verify at 375px and 414px
   and at desktop width. The mobile sticky `.session-toolbar` must never occlude
   answer content (reserve scroll clearance; keep the bar opaque).
6. **No developer language on user surfaces.** Remove the "v1 guardrails in the
   UI" panel (`App.tsx` ~1029–1042) and maintainer phrasing ("static bundled
   JSON," "shards," "506 target," etc.) from learner screens. Relocate anything
   worth keeping to `README.md`/docs.

## Target information architecture

The candidate loop is **orient → practice → review → improve**:

- **Dashboard** (new home) — readiness snapshot + weakest domains + primary
  **Start practice** / **Resume**.
- **Session setup** — focused, progressive disclosure; defaults: standard bank,
  current blueprint, reviewed-only, sensible mode/timer. Advanced collapsed.
- **Session runner** — decluttered header, question-as-hero, mobile fix.
- **Results** (new) — score + domain breakdown + "drill weakest" + review.
- **Progress / History** — list + trends, domain-level view elevated.
- **Review feedback** (SME utility) — flags management/export, demoted from
  primary nav.

## Procedure (one PR, ordered commits — no mid-run sign-off)

Write a short plan into the **PR description** (chosen direction + commit list);
this is documentation, not a gate. Then implement straight through:

- **Commit 1 — Decompose `App.tsx` (behavior-preserving).** Split the
  1,599-line component into per-screen components (`Dashboard`, `SessionSetup`,
  `SessionRunner`, `Results`, `ProgressHistory`, `HistoryDetail`,
  `ReviewFeedback`) + shared bits (`QuestionCard`, `OptionList`, `Toolbar`,
  `References`, `QuestionReview`). **No UX change here** — pure extraction, same
  DOM/behavior, existing tests still green. Keep this as its own commit.
- **Commit 2 — Dashboard + progressive-disclosure setup.** (Outcomes 1–2.)
- **Commit 3 — Session runner declutter + mobile toolbar clearance.** (Outcome 3;
  folds in the known mobile overlap fix.)
- **Commit 4 — Results screen.** (Outcome 4.)
- **Commit 5 — Progress/History elevation + demote Flags management.**
  (Outcomes 5–6; D2.)
- **Commit 6 — Copy pass + move constraints to README.** (Non-negotiable 6.)

## Per-screen notes (reuse existing data; don't reinvent)

- **Dashboard:** reuse `history`, `historyTrend.points`, and per-category
  breakdown (`result.breakdown`, `categoryHistoryTrend`) for the snapshot and
  weakest-domains list. "Weakest domain" = a new pure selector over existing
  breakdown data (tested). Primary CTA calls existing `startSession` with
  defaults; show **Resume** only when `activeSession` exists.
- **Session setup:** same controls as today (`settings`, `updateSettings`,
  `handleBlueprintChange`, `handleModeChange`, `getAvailableQuestionCount`) —
  reorganized: defaults visible, the rest under **Customize**. No new fields.
- **Session runner:** keep `option-list`/`option-button` semantics and the
  study/exam reveal logic verbatim; only restructure layout and header density.
  Apply the mobile clearance fix to the sticky `.session-toolbar`.
- **Results:** drive from the completed `result` object produced on finalize;
  lead with `result.breakdown`; "drill weakest" starts a session
  filtered/weighted to that domain using existing assembly inputs (no new
  scoring math). "Review answers" routes into the existing per-item review.
- **Progress/History:** keep `historyTrend` + `categoryHistoryTrend` +
  `openCategoryTrend`; surface the category view earlier.
- **Review feedback:** same `exportFlags`/grouping/`clearFlagById` logic, just
  relocated and relabeled. Keep `cctc-flags.json` export behavior identical.

## Verification (once, before opening the PR)

1. `npm run test` (unit/integration) green.
2. `npm run test:e2e:playwright` green; add tests for: session resume across
   reload, the mobile no-overlap assertion (last `.option-button` box vs.
   `.session-toolbar` box at 375px), and the Start→Results happy path.
3. `npm run validate` and `npm run build` green.
4. Manual a11y pass: keyboard nav through options, focus-visible, screen-reader
   labels intact; reduced-motion honored.
5. Screenshots at 375px and desktop in the PR body.

## Common mistakes to avoid

- Letting the single PR become a tangle: keep **Commit 1 a pure,
  behavior-preserving decomposition** and don't interleave logic edits into it.
- Rewriting handlers or `src/lib` logic "while you're in there." Don't.
- Introducing Tailwind or a component library. Don't.
- Collapsing the radiogroup into plain buttons / dropping ARIA.
- Inventing new pass/score/estimate semantics — labels stay "unofficial
  practice estimate," math unchanged.
- Generic dashboard chrome that ignores the existing palette and voice.
- Merging to `main`. This branch is an isolated experiment.

## Deliverable

**One PR** on this branch — not merged — with ordered commits (decomposition
first), all gates green, screenshots at 375px and desktop, and a PR body that
states the chosen design direction and rationale. Logic, data, and schema
untouched; the bespoke CSS token system remains the single styling source of
truth.