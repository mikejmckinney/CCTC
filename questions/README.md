# Question bank

This directory holds the CCTC practice-exam item bank as **sharded JSON files**.

## Layout

```
questions/
  _examples/examples.json     # illustrative items only — excluded from the production bank path
  domain-1-education/         # tasks 0101xx–0107xx
  domain-2-pretx/            # tasks 0201xx–0207xx
  domain-3-postop/           # tasks 0301xx–0308xx
```

- **Shard by domain** (and optionally by task within a domain), not by arbitrary file size. A content update then touches one predictable place and per-domain coverage is trivial to audit.
- **Soft cap of 50 items per file.** When a file exceeds it, split it (e.g. `domain-3-postop/030100-030400.json`, `domain-3-postop/030500-030800.json`). This keeps diffs small and the app loads gracefully as the bank grows.
- Anything under `_examples/` is for authors/reviewers and is excluded from the production bank path (the loader ignores paths beginning with `_`).
- `questions/.verification/` holds per-item reference verification stubs (CI enforcement); excluded from exam sampling and bank loading.
- **Bootstrap fallback:** when no non-`_` shards exist yet, the app may temporarily load `_examples` so both item formats can be exercised while the real bank is authored. Once domain shards land under `questions/domain-*`, only those files are used (currently **505 draft items** across `batch-01.json`–`batch-42.json` in each domain directory).

## File format

Each file is a **JSON array of question objects**, each conforming to `schema/question.schema.json`. See `_examples/examples.json` for a worked `one_best` item and a worked `complex_combo` item.

## Status workflow

- Every item the agent authors is written with `"status": "draft"`.
- The app may surface drafts in study mode but should visibly mark them and (configurably) exclude them from exam-mode scoring until reviewed.
- A human SME flips an item to `"status": "reviewed"` only after verifying its facts against an authoritative source and confirming exactly one defensible answer.

## Tagging (one bank, both blueprints)

Tag every item to the **2026-07 blueprint**: `domain` (required), `task` (recommended), `knowledge_codes` (optional, for coverage auditing). The legacy (until 2026-06) blueprint derives its section via the crosswalk in `blueprints/cctc-thru-2026-06.json`, so you do **not** tag items twice. Use `legacy_section` only to override the crosswalk for an edge-case item.

Also tag `cognitive_level`, `organ`, and `recipient_age` so the sampler can mirror the real exam's mix.

### Recipient age (`recipient_age`)

| Tag | When to use |
|---|---|
| `adult` | Default when the stem is adult-specific or age-neutral coordinator practice |
| `pediatric` | Child/adolescent vignette or teaching point specific to pediatric transplant populations |
| `both` | Content that applies equally across ages (does **not** count toward the pediatric bank target) |

**Bank soft target:** `pediatric` items at **5–7%** of the full bank (population-based estimate of pediatric recipient share). The live CCTC exam pediatric mix is ~**5%**; the bank band allows a modest buffer above exam under-representation so practice sessions have enough pediatric-only items without over-weighting them on every session. At ~500 items that is about **25–35** pediatric-tagged questions. Run `npm run validate:coverage` after each batch to see current share vs target.

## Current bank (draft)

| Domain | Shards | Item IDs | Count |
|---|---|---|---|
| `domain-1-education` | `batch-01`–`16` | `cctc-1001`–`1065` | 65 |
| `domain-2-pretx` | `batch-01`–`16` | `cctc-2001`–`2064` | 64 |
| `domain-3-postop` | `batch-01`–`16` | `cctc-3001`–`3064` | 64 |

All items are `status: "draft"`. Run `npm run validate:coverage` for live gap tables after each batch.

## Target size

~500 reviewed items. A 150/175-item exam then samples well under a third of the bank, so repeated practice sessions stay fresh and blueprint weighting can be honored without reusing the same items every time.
