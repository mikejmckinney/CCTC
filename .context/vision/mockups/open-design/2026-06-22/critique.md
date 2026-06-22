# Direction critique — 2026-06-22

## Direction A — Focused Study Tool

**Works:** Calm canvas, stem-first hierarchy, exam toolbar stays out of the way. Best match for 180-minute sessions.

**Weak:** Home screen is utilitarian; history/weak areas are not front-and-center.

## Direction B — Clinical Dashboard

**Works:** Motivating for repeat learners; category weak spots visible before starting.

**Weak:** Dashboard cards risk competing with primary “Start session” action; busier visual field during exam.

## Direction C — Mobile Flashcard Trainer

**Works:** Thumb-zone controls, Study reveal feels natural on phone.

**Weak:** Timed 175-item Exam on desktop feels secondary; less ideal for complex-combo density.

## Cross-cutting notes

- All directions use tokens from root `DESIGN.md`
- Real fixture stems (`cctc-6198` long stem, `cctc-1011` complex-combo) informed layout stress tests
- Production app already has solid a11y baseline — redesign must preserve skip link, landmarks, focus rings

## Recommended hybrid (see ui-decision.md)

A shell + B home strip + C mobile toolbar patterns.
