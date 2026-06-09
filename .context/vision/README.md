# CCTC Vision Index

> **Purpose**: Point agents to the product-design surfaces that matter for a static, client-side exam-prep app.

## What Belongs Here

- `mockups/` is the primary home for future screen flows, layout references, and learner-experience sketches.
- `architecture/` is reserved for app-specific diagrams only when they explain a real product concern such as data loading, offline persistence, or exam-session state.

## Current Direction

CCTC is a browser-based study tool, not a process-template repo. The important design questions are learner flow, exam-session behavior, offline persistence, and how static question content moves through validation into the app.

## Current Artifacts

- [`v2-roadmap.md`](v2-roadmap.md) — future product features (sync, deep-linked references, runtime generation, organ-balance content).
- No architecture diagrams are kept by default after the Mode B reset.
- Add a focused diagram only when an app-specific design becomes complex enough that prose is no longer sufficient.

## Design Priorities

1. Fast start into Study or Exam mode.
2. Clear progress, timing, and resume behavior on small screens.
3. Strong separation between static content assets, validation, and runtime session state.

## Related References

- [../00_INDEX.md](../00_INDEX.md)
- [../roadmap.md](../roadmap.md)
- [../../README.md](../../README.md)
- [../../.github/prompts/00-onboarding.md](../../.github/prompts/00-onboarding.md)
