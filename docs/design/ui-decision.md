# UI Direction Decision

> **Date:** 2026-06-22 · **Status:** Recommendation for human approval (prompt 04)

## Candidates

| Direction | Strengths | Risks |
|---|---|---|
| **A — Focused Study Tool** | Best long-session readability; lowest distraction in Exam mode; clearest question hierarchy | Less motivational “dashboard” feel on home |
| **B — Clinical Dashboard** | Surfaces history/weak areas before session; good for return learners | Risk of clutter; analytics may compete with “start exam” |
| **C — Mobile Flashcard Trainer** | Excellent Study mode + phone ergonomics | Exam mode (175 items) may feel undersupported |

## Comparison matrix

| Criterion | A Focused | B Dashboard | C Mobile |
|---|---|---|---|
| Exam readability | ★★★ | ★★☆ | ★★☆ |
| Setup clarity | ★★☆ | ★★★ | ★★★ |
| History / weak areas | ★★☆ | ★★★ | ★☆☆ |
| Mobile thumb reach | ★★☆ | ★★☆ | ★★★ |
| Implementation risk | Low | Medium | Medium |

## Recommendation

**Adopt a hybrid: Direction A (Focused Study Tool) as the shell, with selective imports from B and C.**

### Rationale

1. **Primary job-to-be-done is exam practice** — users spend most time in active-question UI; Direction A optimizes the highest-traffic surface.
2. **Direction B’s home dashboard** — borrow a compact “recent scores + weak categories” strip on home, not a full analytics wall.
3. **Direction C’s mobile patterns** — sticky bottom toolbar and flashcard-style Study reveal map cleanly onto existing modes without new engine behavior.

### Not recommended as primary

- Full dashboard-first home (B alone) — competes with “start session” for attention.
- Mobile-only visual language (C alone) — under-serves timed 175-item desktop sessions.

## Next step after approval

1. File implementation issue/PR scoped to `src/app/**` + `src/app.css`
2. Map `DESIGN.md` tokens into CSS variables
3. Incremental rollout: home → session → score → history
4. Re-capture README media from production after merge

## Artifacts

- Direction A: `.context/vision/mockups/open-design/2026-06-22/direction-a-focused-study/`
- Direction B: `.context/vision/mockups/open-design/2026-06-22/direction-b-clinical-dashboard/`
- Direction C: `.context/vision/mockups/open-design/2026-06-22/direction-c-mobile-flashcard/`
- Critique: `.context/vision/mockups/open-design/2026-06-22/critique.md`
