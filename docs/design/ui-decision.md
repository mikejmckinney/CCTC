# UI Direction Decision

> **Date:** 2026-06-22 · **Status:** Approved (prompt 04) · **Chosen direction:** B — Clinical Dashboard

## Decision

**Adopt Direction B (Clinical Dashboard) as the primary redesign shell**, with selective mobile Study patterns from Direction C on viewports under 768px.

### Implementation requirements

1. **Light and dark mode** — user-toggleable theme (not system-only). Persist preference in `localStorage` (same key pattern as production when implemented). Dark palette defined in `DESIGN.md` at implementation time.
2. **Dashboard-first home** — recent scores, weak-area chips, and category breakdown before “Start new session”.
3. **Exam clarity preserved** — active-question screens stay stem-first with minimal chrome (borrowed from Direction A’s restraint on session surfaces).
4. **Mobile parity** — sticky bottom session toolbar and thumb-reachable controls on narrow viewports (Direction C patterns, Study mode only where applicable).

### Not in scope for v1 redesign

- Full flashcard metaphor (Direction C primary shell)
- Backend analytics or accounts
- Changing question bank or scoring engine

## Candidates (summary)

| Direction | Strengths | Risks |
|---|---|---|
| **A — Focused Study Tool** | Best long-session readability; lowest distraction in Exam mode | Less motivational “dashboard” feel on home |
| **B — Clinical Dashboard** ✓ | Surfaces history/weak areas before session; good for return learners | Risk of clutter if analytics compete with primary CTA |
| **C — Mobile Flashcard Trainer** | Excellent Study ergonomics on phone | Exam mode (175 items) undersupported as primary shell |

## Comparison matrix

| Criterion | A Focused | B Dashboard | C Mobile |
|---|---|---|---|
| Exam readability | ★★★ | ★★☆ | ★★☆ |
| Setup clarity | ★★☆ | ★★★ | ★★★ |
| History / weak areas | ★★☆ | ★★★ | ★☆☆ |
| Mobile thumb reach | ★★☆ | ★★☆ | ★★★ |
| Implementation risk | Low | Medium | Medium |

**Winner on return-learner job-to-be-done:** B — progress insight and weak-area targeting without sacrificing exam-mode readability when session chrome is tightened.

## Rationale

1. **Return learners need context before starting** — weak domains, trend, and resume strip reduce setup friction and support targeted runs.
2. **Primary CTA remains clear** — “Start new session” stays prominent; analytics sit in supporting panels, not a full analytics wall.
3. **Direction A patterns on session surfaces** — exam/study question UI keeps stem-first hierarchy and restrained chrome.
4. **Direction C on small screens** — sticky toolbar and Study reveal patterns map onto existing modes without new engine behavior.
5. **Dark mode** — long evening study sessions; must ship with the redesign, not as a follow-up.

## Artifacts

| Artifact | Path | Use |
|---|---|---|
| Direction A (review deck) | `docs/design/artifacts/direction-a-focused-study/index.html` | 11-screen comparison |
| Direction B (review deck) | `docs/design/artifacts/direction-b-clinical-dashboard/index.html` | **Approved direction** — screen catalog |
| Direction C (review deck) | `docs/design/artifacts/direction-c-mobile-flashcard/index.html` | Mobile Study reference |
| Critique (B) | `docs/design/artifacts/direction-b-clinical-dashboard/critique.json` | Panel scores |
| Early sketches (superseded) | `.context/vision/mockups/open-design/2026-06-22/` | OD first-pass only |

## Next steps (implementation)

1. File implementation issue/PR scoped to `src/app/**` + `src/app.css`
2. Map `DESIGN.md` tokens (light + dark) into CSS variables
3. Incremental rollout: home/dashboard → session → score → history → theme toggle
4. Re-capture README media from production after merge

## Supersedes

- Prior hybrid-A recommendation in this file (2026-06-22 draft)
- Sketch-only mockup paths as primary references — use `docs/design/artifacts/` instead
