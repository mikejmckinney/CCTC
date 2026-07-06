# CCTC Practice Exam — Redesign Handoff

This folder is a complete, self-contained package for implementing the CCTC Practice Exam redesign in the existing React + Vite + TypeScript app (`mikejmckinney/CCTC`).

## What to read first

1. **`../design.md`** (project root) — the spec and source of truth. Design tokens (day + night), screen-by-screen layout + acceptance criteria, the authoritative analytics definitions (§4.0), data-model deltas, and the executable acceptance checklist (§7). This is the canonical design doc going forward.l deltas (what to reuse vs. add), a fidelity/self-verification protocol (§0.5), and an executable acceptance checklist (§7). **Read §0 and §0.5 before writing code.**
2. **`feature-request-issue.md`** — the same scope formatted to the repo's `feature_request` issue template; paste into a new GitHub issue to track the work.

## Reference material

- **`prototype/`** — the validated interactive prototype (`CCTC Practice.dc.html` + `cctc-data.js` + `support.js`). This is the **runnable oracle**: when the brief and the prototype disagree, the prototype wins. Copy its *values* (tokens, copy strings, spacing) verbatim; re-express its *structure* as idiomatic React + `app.css` (do not paste its inline-styled markup).
  - **Run it locally over HTTP** (not `file://`): from this folder run `python3 -m http.server`, then open `http://localhost:8000/prototype/CCTC%20Practice.dc.html`. Double-clicking the file shows a "Question bank didn't load" notice because browsers block the data file over `file://`. (This is a prototype-only constraint; the real Vite app is unaffected.)
- **`screens/`** — full-page, non-clipped screenshots of the current build, captured in **two responsive sets**:
  - **`screens/desktop/`** (924px-wide viewport) and **`screens/mobile/`** (390px phone width — nav collapses to icons, cards stack single-column).
  - Same flow in both: `01-dashboard` (readiness → Quick start → collapsed Customize bar → Recent sessions), `02-customize` (the expanded "Customize a session" form inline on the dashboard; "Exam preferences & advanced" holds exam date + target score), `03-session(-exam)`, `04-session-study-reveal` (explanation + per-distractor rationale + references), `05-results`, `06-review`, `07-progress` (trend, by-domain, history rows with date-time + blueprint + per-domain N/N), `08-flags` (edit / delete / clear / export JSON). The desktop set's dashboard also shows the readiness donut + combined focus card; mobile dashboard shows the same stacked.

## Implementation guardrails (full list in brief §6)

- Reuse the existing `HistoryEntry` / `ItemFlag` / `SessionSettings` schema and IndexedDB store — **existing user records must survive the update**. Only additive persisted prefs: `theme`, `lastCustomSettings`, `examDate`, `targetThreshold`.
- No backend / no runtime model calls; questions stay static reviewed JSON; client-side persistence only.
- Do **not** ship the prototype's seeded sample history — production starts on the existing empty states.
- Independent study aid: keep the disclaimer gate; raw/unofficial scoring only.

## Prototype data note

The prototype loads 24 standard + 24 scenario **real reviewed items** pulled from the repo (trimmed for demo). Blueprint weights, the 175-item exam meta, and the 506-item bank size are the **real production values**. Production should load the full bank via the existing `questionBank.ts` loader.
