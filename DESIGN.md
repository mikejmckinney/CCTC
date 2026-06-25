# CCTC Practice Exam — Design Contract

> **Status:** Redesign exploration (prompt 04). Production `src/app/**` unchanged until a direction is approved.
>
> **Tone:** Clinical but not sterile · calm · trustworthy · study-focused · readable for long sessions · mobile-first.

## Product identity

**CCTC Practice Exam** is an independent study aid for the ABTC Certified Clinical Transplant Coordinator exam. It is not affiliated with or endorsed by ABTC or PSI.

Visual language should feel like a **serious medical-education tool**, not a consumer trivia app or a hospital EMR.

## Audience

- Transplant coordinators preparing for a high-stakes certification exam
- Often studying on phone during breaks and on laptop for longer sessions
- Needs confidence, clarity, and low cognitive load during 175-item practice runs

## Design goals

1. **Exam clarity** — question stem, options, and progress always scannable
2. **Session safety** — obvious save/resume state; no anxiety about lost progress
3. **Trust** — references and explanations feel authoritative without impersonating ABTC
4. **Mobile parity** — tap targets, sticky controls, readable type on 390px width
5. **Progress insight** — history and weak areas motivate study without cluttering exam mode

## UX principles

- **One primary action per screen** (start, answer, next, submit, review)
- **Progressive disclosure** — explanations and references after commit in Exam mode; immediate in Study mode
- **Persistent context** — blueprint, mode, timer, item x of y always visible in session
- **Forgiving navigation** — flag/bookmark/unanswered review without losing answers
- **No dark patterns** — disclaimer visible; unofficial status never hidden

## Accessibility floor

- WCAG 2.2 AA target for contrast, focus, and touch size (44px minimum)
- Visible `:focus-visible` on all interactive controls
- Skip link + `main` landmark (already in production; preserve in redesign)
- `prefers-reduced-motion` respected for transitions
- Form controls with programmatic labels (`Mode`, `Question count`, etc.)
- Video demos include `aria-label` on `<video>` embeds

## Typography

| Token | Use | Stack |
|---|---|---|
| `--font-display` | Page titles, score headlines | `"Fraunces", "Iowan Old Style", serif` |
| `--font-body` | Stems, explanations, UI | `"IBM Plex Sans", "Segoe UI", sans-serif` |
| `--font-mono` | Item IDs, stats, timers | `"IBM Plex Mono", ui-monospace, monospace` |

Scale (mobile-first):

- `--text-xs` 0.75rem · `--text-sm` 0.875rem · `--text-base` 1rem
- `--text-lg` 1.125rem · `--text-xl` 1.25rem · `--text-2xl` 1.5rem

Question stems: `--text-lg` minimum on mobile; long stems may drop to `--text-base` with increased line-height (`1.6`).

## Color tokens

| Token | Role | Default |
|---|---|---|
| `--color-canvas` | Page background | `#f4f1ea` |
| `--color-surface` | Cards, panels | `#ffffff` |
| `--color-surface-muted` | Secondary panels | `#eef4f1` |
| `--color-ink` | Primary text | `#102224` |
| `--color-ink-muted` | Secondary text | `#5b6c72` |
| `--color-brand` | Primary actions, links | `#123b3a` |
| `--color-brand-soft` | Selected chips, soft fills | `#d7ebe4` |
| `--color-accent` | Highlights, charts | `#d79548` |
| `--color-success` | Correct / positive trend | `#1f6a4b` |
| `--color-warning` | Flags, caution | `#8b5f18` |
| `--color-danger` | Errors, destructive | `#a0413b` |
| `--color-line` | Borders | `rgba(16, 34, 36, 0.12)` |

Do not use ABTC or PSI official brand colors as if endorsed.

## Spacing and radius

- Base unit: `4px`
- Scale: `4, 8, 12, 16, 24, 32, 48`
- Card radius: `--radius-md` `12px`
- Buttons / inputs: `--radius-sm` `10px`
- Hero panels: `--radius-lg` `20px`
- Shadow: `--shadow-card` `0 18px 50px rgba(18, 59, 58, 0.12)`

## Component tone

- **Buttons:** solid brand primary; ghost secondary; destructive only for clear data loss
- **Cards:** white surface, subtle border, generous padding
- **Chips:** blueprint/mode/timer as compact pills, not noisy badges
- **Charts:** restrained palette; category breakdown readable at phone width

## Mobile-first layout rules

- Single column default; two-column only ≥768px for setup + preview
- Session toolbar sticky at bottom on `<768px`
- Option lists: full-width tap rows, 44px min height
- Navigator drawer or bottom sheet for item grid on mobile

## Active-question screen rules

- Stem → options → primary navigation (Back / Next / Submit)
- Item progress + timer in header; flag/bookmark in toolbar
- Complex-combo: checkbox list with explicit “select all that apply”
- No explanation visible in Exam mode before submit

## Score and history screen rules

- Score report: overall %, pass-style framing as *practice estimate* not official result
- Category breakdown: table on desktop, stacked bars on mobile
- History: sparkline or bar trend + last N sessions; tap for category drill-down

## Item-flagging UX rules

- Flag from session toolbar and review surfaces
- Reasons match production enum (factual error, outdated policy, ambiguous, typo, broken link, other)
- Export path explained in Flags view (email handoff for SME)

## README / demo media visual rules

- Capture **production UI** for feature demos (Playwright)
- Hero may add **HyperFrames** polish using captured frames only
- Posters: 1280×720, brand canvas, no misleading ABTC marks
- Muted autoplay-friendly embeds; fallback link under each `<video>`

## Related artifacts

- Fixture items: `docs/design/fixtures/representative-cctc-items.json`
- Redesign brief: `docs/design/redesign-brief.md`
- Direction decision: `docs/design/ui-decision.md`
- Mockups: `.context/vision/mockups/open-design/2026-06-22/`
- Open Design setup: `docs/design/open-design-setup.md`
