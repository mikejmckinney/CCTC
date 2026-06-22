# CCTC Redesign Brief

## Context

v1 on `main` delivers a complete static practice-exam app: Study/Exam modes, IndexedDB resume, 506 reviewed items, history trends, flagging, GitHub Pages deploy. Prompt 04 explores **learner UX and README media** without changing production React until a direction is approved.

## Problems to solve

| Area | Current pain | Success signal |
|---|---|---|
| Session setup | Dense form on home hero | Blueprint/mode/count/timer understood in &lt;10s |
| Active question | Long stems + references wrap awkwardly on phone | Readable stem/options without horizontal scroll |
| Exam navigation | Toolbar competes with content on small screens | Sticky controls; navigator discoverable |
| Score report | Rich data, flat hierarchy | Overall + category story scannable in one screen |
| History | Trends added in v1; still list-heavy | Weak areas obvious; drill-down inviting |
| Flagging | Functional but modal-heavy | Fast flag from session with clear export path |

## Constraints (unchanged)

- Client-side only; no backend; no runtime LLM
- Original question wording; fixture subset for design/media only
- No ABTC/PSI affiliation in visual design
- Accessibility floor in `DESIGN.md`

## Exploration directions

Three Open Design directions (see `.context/vision/mockups/open-design/2026-06-22/`):

1. **Focused Study Tool** — minimal chrome, exam readability
2. **Clinical Dashboard** — progress, weak areas, analytics-forward home
3. **Mobile-First Flashcard Trainer** — Study mode, thumb reach, short sessions

## Fixture content

`docs/design/fixtures/representative-cctc-items.json` — 8 real reviewed items (short/long stems, complex-combo, dense explanation, multi-reference, domains 1–3).

## Out of scope (this prompt)

- Production implementation in `src/app/**`
- Question bank or validator changes
- v2 features (sync, accounts) per `v2-roadmap.md`

## Deliverables

- [x] `DESIGN.md`
- [x] This brief
- [x] `ui-decision.md`
- [x] `accessibility-checklist.md`
- [x] Mockup artifacts under `.context/vision/mockups/open-design/2026-06-22/`
- [ ] README media source + manifest (media track)
