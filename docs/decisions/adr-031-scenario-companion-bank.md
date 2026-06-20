# ADR-031: Scenario companion question bank

**Status:** Accepted  
**Date:** 2026-06-20

## Context

The standard bank (`questions/domain-*`) tests blueprint competencies with a mix of direct and short situational stems. Coordinators studying for CCTC requested a **scenario-first** practice mode: longer clinical vignettes in second- or third-person voice, while preserving the same blueprint coverage and validation pipeline.

We need a durable model for:

- A **selectable second bank** in the static app (no backend)
- **1:1 pairing** with existing standard items for traceability and coverage
- **Independent IDs** and storage so the reviewed standard bank is not rewritten in place

## Decision

1. **Storage:** `questions/scenario/**` — separate JSON shards, same schema as standard items plus optional `companion_of`.
2. **IDs:** `cctc-6001`–`cctc-6506` reserved for scenario companions (506 items).
3. **Pairing:** Each companion **must** set `companion_of` to a standard-bank id and match `domain`, `task`, `knowledge_codes`, and `type`.
4. **App:** `SessionSettings.questionSet` = `standard` | `scenario`; sampler and modes unchanged except input pool.
5. **Validation:** `scripts/validate/25-scenario-companions.mjs` enforces pairing; standard coverage reports stay on the standard bank; companion progress reported separately.
6. **Content cadence:** Parallel waves across domains (not domain-monolithic) until 506 companions exist.

### Stem style (authoring)

- Vignette block: **4–6 sentences** (role, patient, status, trigger, constraints)
- One clear prompt line; four options (or `complex_combo` structure mirroring parent)
- Original wording; references verified via the existing indexer (extends ADR-030, does not replace it)

## Consequences

### Positive

- Learners can practice scenario-style items without destabilizing 506 reviewed standard items
- Validator and coverage tooling can track `companions reviewed: N/506`
- Agents can author waves incrementally; app shows shortage notes when the scenario pool is incomplete

### Negative

- Maintaining **two banks** doubles authoring and stub-export work for full parity
- Partial scenario pools may not support full 150-item timed exams until enough companions are `reviewed`

## Alternatives considered

| Option | Why not |
|---|---|
| Retag/filter existing stems as “scenario” | Too few vignette-style stems; no coordinator second-person voice |
| In-place rewrite of standard bank | Invalidates SME-reviewed content and stubs |
| Runtime AI vignette generation | Clinical accuracy, copyright, and reference verification risks |

## References

- [ADR-030](./adr-030-verifiable-question-references.md) — reference indexer and anchor validation
- [`questions/scenario/README.md`](../../questions/scenario/README.md) — operator authoring rules
- [`.github/prompts/02-author-questions.md`](../../.github/prompts/02-author-questions.md) — field-level authoring
