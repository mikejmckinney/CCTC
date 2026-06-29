---
name: Feature Request
about: CCTC Practice Exam — UX/visual redesign
title: '[FEATURE] CCTC redesign: Editorial visual system, dashboard/IA, day-night, session refinements'
labels: enhancement
assignees: ''
---

## Problem Statement

The current app opens directly into a 10-field settings form, mixes developer/spec copy into the learner UI, has no at-a-glance sense of readiness, and offers no theming. Candidates studying for the CCTC® exam need a calmer, more legible study tool that surfaces progress, gets them into practice quickly, and supports long study sessions (incl. night use). A validated redesign exists as an interactive prototype; this issue ports it into the app.

## Proposed Solution

Implement the redesign documented in **`handoff/CCTC-redesign-brief.md`** (committed alongside an interactive prototype + screenshots). In summary:

- **"Editorial Institutional" visual system** — Newsreader (serif headings/stems) + Public Sans (UI); warm institutional palette; full token set with **day + night themes**.
- **Dashboard home** (readiness donut, resume, quick-start, focus areas, score trend) with a retained **Dashboard ⇄ Setup-form** toggle; "Customize a session" leads to the setup form.
- **Streamlined setup** — quick-start presets, a **"your last custom setup"** relaunch tile, and a progressive-disclosure customize form (Mode, Question set, Focus, count, timer, Advanced).
- **Session/Review refinements** — in-app **resume/new/cancel** prompt on every start, in-app **submit/finish confirmation** (with unanswered count) for both modes, and a **question map in Review** colored by correct/incorrect.

Full design tokens, screen-by-screen specs, and data-model deltas are in the brief. **The prototype is the runnable oracle — copy its values (tokens, type scale, copy strings, spacing) verbatim, but re-express its structure as idiomatic React; do not paste its inline-styled markup.** The brief's §0.5 defines a fidelity/self-verification protocol (gated stages + screenshot-diff against the prototype) — follow it to avoid revision rounds.

## Alternatives Considered

- Visual reskin only (rejected — doesn't fix the IA / no-readiness-view problems).
- Either/or dashboard *vs.* setup home (rejected — product owner wants both; kept as a toggle).
- Native `window.confirm` dialogs (rejected — replaced with on-brand in-app modals).

## User Story

As a CCTC candidate, I want a dashboard that shows my readiness and lets me start the right practice in one tap — and a focused, legible (day or night) test/review experience — so that I can study efficiently and learn from every miss.

## User outcome (15-minute test)

A candidate opening the app will **experience**: landing on a dashboard showing their practice readiness and weakest domains; one-tapping a quick-start or their last custom setup (and being prompted to resume vs. replace an in-progress session); taking a timed/untimed exam or study session with inline explanations + citations; confirming submission via an in-app dialog; and reviewing every answer with a correct/incorrect jump map — all in either day or night theme, which persists.

## Acceptance Criteria

Build to the **executable checklist in brief §7** (each item is a DOM/test assertion). Headline criteria:

- [ ] Day/night toggle works, persists, and defaults to the OS `prefers-color-scheme` on first run; both themes meet AA contrast (assert in a test).
- [ ] Dashboard is the default home; Dashboard ⇄ Setup-form toggle retained.
- [ ] "Your last custom setup" tile appears only after a custom-form launch and relaunches those settings.
- [ ] Every new-session entry point routes through the resume/new/cancel prompt when a session is unfinished.
- [ ] Submit **and** Finish show an in-app confirmation with the unanswered-item count.
- [ ] Deleting a history record, clearing all history, and clearing flags each require an in-app confirm (red CTA); Cancel preserves data.
- [ ] Review screen has a working question map colored correct/incorrect.
- [ ] Standard ⇄ Scenario question set switches the bank; available counts update live.
- [ ] Readiness + score trend are **exam-only**; readiness is an **EMA (α=0.3)** of exam sessions (trend shows raw bars). Focus areas are all-time pooled (exam+study), each row showing a small **"N% of exam" weight chip** (31/30/39) from the blueprint; bank/exam meta in the dashboard subheader. See brief §4.0.
- [ ] Starting a session with an empty question pool never crashes (guarded; shows a notice).
- [ ] Dashboard combines readiness+focus into one card; top-nav = **Home / Setup / Progress** (icons ≤560px), **no** Dashboard/Setup-form toggle; resume shows as a **slim banner** (not a tall card); Quick start = Full mock / **Quick exam (25q·30min)** / Weak areas; **Recent sessions** card (latest 5) replaces the dashboard trend; Weak areas **front-loads previously-missed items** (spaced-rep-lite, see §4.0); Progress rows show full date-time + blueprint version + per-domain N/N.
- [ ] **Target score** slider (50–90) in setup preferences persists and drives the pass/below line everywhere; **exam date** picker drives the greeting countdown.
- [ ] **Flags management** restored as a view (Progress → "Manage flags"): list, edit, delete-single, clear-all, export JSON. In-context "Report an issue" stays in the question menu.
- [ ] Existing users' stored sessions/flags remain visible & reviewable after update (reuse IndexedDB store/schema; additive prefs read with fallbacks).
- [ ] **Exam date** setting (setup → Advanced) drives a live greeting countdown; a synthesized **"Am I ready?" readiness insight** (badge + verdict + one-tap recommended action) sits in the readiness card. See brief §3.8.
- [ ] Existing engine behavior preserved: timer autosave/auto-submit, resume, keyboard nav, per-category trends, ItemFlag JSON export.
- [ ] No new persistence beyond `theme` + `lastCustomSettings`; dashboard metrics derive from existing `HistoryEntry[]`.
- [ ] Product guardrails intact: disclaimer gate, no real exam items, no backend/runtime model calls, raw/unofficial scoring, client-side (IndexedDB) only.

## Design / Mockups

- Spec: `handoff/CCTC-redesign-brief.md`
- Interactive prototype: `handoff/prototype/CCTC Practice.dc.html`
- Screens: `handoff/screens/` (dashboard day & night, setup, study reveal, results, progress)

## Technical Considerations

- **Follow brief §0.5 (fidelity protocol):** work in gated stages (tokens+fonts → one screen at a time → behaviors last), and after each screen screenshot-diff your build against `handoff/prototype/CCTC Practice.dc.html` at 1280px and 390px, in both themes, before advancing.
- Implement in `src/app/App.tsx`, `src/app.css`, `src/types/exam.ts`, `src/lib/*`.
- **Reuse existing fields — do not duplicate:** `SessionSettings.questionSet`, `blueprintId`, `includeDrafts`, `targetThreshold`, `timed`, `timeMinutes`, `showTimer`; `ActiveSession.flaggedForReview` (bookmarks); `ItemFlag` (report-an-issue); `SessionResultBreakdown`. The resume/replace prompt and per-category trend logic already exist — extend them.
- **New persistence:** `theme: 'day'|'night'` (extend `AppMeta`/`storage.ts`) and `lastCustomSettings?: SessionSettings`.
- Tokens via CSS custom properties on `:root` + `[data-theme="night"]`; keep styling in `app.css` (no inline lift from the prototype).
- **Open decision for product owner:** the brief recommends demoting the standalone Flags view into in-context "Report an issue" + a Progress summary. Confirm before removing the top-level view (consider a short ADR).

## Priority

- [ ] Critical - Blocking other work
- [x] High - Needed soon
- [ ] Medium - Would be nice to have
- [ ] Low - Future consideration

## Additional Context

The prototype loads 24 standard + 24 scenario real reviewed items for demo; production should load the full bank via the existing `questionBank.ts` loader. The prototype seeds sample history to populate the dashboard — **do not ship the seed**; production starts with the existing empty states.
