# Open Design Studio brief — CCTC redesign (prompt 04)

> **Scope:** Prototype-only HTML artifacts. **Do not** modify `src/app/**`, `src/app.css`, or production behavior.

## Shared context

- Product: CCTC Practice Exam — independent ABTC CCTC study aid (not affiliated with ABTC/PSI).
- Design contract: repo root `DESIGN.md` (active design system `user:cctc-practice-exam`).
- Real item copy: `docs/design/fixtures/representative-cctc-items.json` — use verbatim stems/options/explanations where shown.
- Tone: clinical but not sterile · calm · trustworthy · study-focused · mobile-first.
- Accessibility: visible focus, 44px tap targets, labeled controls, skip link + `main` landmark in chrome.

## Required screens (each direction artifact)

Each direction must be **one self-contained HTML file** with labeled sections (`.screen` blocks) for:

1. Home / dashboard
2. New practice setup (blueprint, count, timed/untimed, Study/Exam)
3. Resume current session prompt
4. Active exam question (no explanation)
5. Active study question with explanation + references revealed
6. Complex-combo question (checkboxes, “select all that apply”)
7. Question navigator with flagged + unanswered indicators
8. Submit confirmation
9. Score report (practice estimate framing)
10. History / trends
11. Item flag dialog (reason enum: factual error, outdated policy, ambiguous, typo, broken link, other)

Add a top banner: **“Prototype — not production UI”**.

## Fixture highlights (use in layouts)

| Item ID | Use for |
|---|---|
| `cctc-1003` | Short one-best stem |
| `cctc-6198` | Long one-best stem (mobile stress) |
| `cctc-1011` | Complex-combo layout |
| `cctc-1081` | Dense explanation block |
| `cctc-2004` | Multiple references |

## Output contract

- Emit via Open Design **live-artifact** / `<artifact>` as a single HTML file.
- Save under project artifacts; filename pattern: `direction-{a|b|c}-<slug>/index.html` conceptually.
- Use tokens from active `DESIGN.md` / CCTC design system only.
- Desktop-first for A/B; mobile viewport emphasis for C.
