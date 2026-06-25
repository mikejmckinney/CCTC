# Open Design Redesign Directions — 2026-06-22

Prototype screens for prompt 04. **Not production UI** — for direction review only.

## Directions

| Folder | Summary |
|---|---|
| [direction-a-focused-study](./direction-a-focused-study/index.html) | Low-distraction exam readability |
| [direction-b-clinical-dashboard](./direction-b-clinical-dashboard/index.html) | Progress + weak-area dashboard home |
| [direction-c-mobile-flashcard](./direction-c-mobile-flashcard/index.html) | Phone-first Study / flashcard flow |

## Screens represented (each direction)

- Home / dashboard
- Practice setup
- Active exam question
- Study mode with explanation revealed
- Score report (static mock)

## Regenerating with Open Design Studio

```bash
bash scripts/bootstrap-open-design.sh
cd ~/.cache/cctc-tools/open-design && pnpm tools-dev run web
```

Import `DESIGN.md` and `docs/design/fixtures/representative-cctc-items.json` as brief context.

## Decision

See [`docs/design/ui-decision.md`](../../../docs/design/ui-decision.md) — recommends **Hybrid A + selective B/C**.
