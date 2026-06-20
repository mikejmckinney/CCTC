# Reference verification stubs

> **Full indexer architecture**: [`docs/guides/reference-indexer.md`](../../guides/reference-indexer.md).

Committed verification stubs let CI **hard-fail reference content** without gitignored
textbook PDFs or full page-text indexes. They are a hash-sized, committable substitute
for `docs/reference/.index/` when the full index cannot live in the repo.

## Problem

| Surface | Local dev | CI |
|---|---|---|
| Textbook PDFs | `docs/reference/*.pdf` (gitignored) | Not available |
| Full page index | `docs/reference/.index/` (gitignored) | Not available |
| Question JSON | In git | In git |
| Verification stubs | `questions/.verification/` (in git) | In git |

`npm run validate` (full) requires local indexes. `npm run validate:ci` verifies
format + OPTN-indexed live content. `npm run validate:stubs` compares question JSON
to committed stubs so textbook anchors are enforced in CI without PDFs.

## Stub file layout

One stub per item:

```text
questions/.verification/
  cctc-2004.json
  cctc-3008.json
  ...
```

Excluded from exam sampling and bank loading (like `_examples`).

## Stub shape (example)

```json
{
  "item_id": "cctc-2004",
  "schema_version": 1,
  "generated_at": "2026-06-07",
  "index_sources": {
    "danovitch": { "filename": "danovitch-handbook-kidney-transplantation.pdf", "page_count": 625 },
    "optn-policies": { "filename": "optn-policies.pdf", "page_count": 372 }
  },
  "primary_anchor": {
    "source_id": "danovitch",
    "pdf_page": 113,
    "keywords": ["DonorNet", "declined", "refusal", "code", "UNOS", "offer"],
    "keyword_hash": "sha256:…"
  },
  "references": [
    {
      "ref_index": 0,
      "source_id": "danovitch",
      "pdf_page": 113,
      "keywords": ["whenever", "offer", "declined", "reason", "refusal", "code", "must", "provided"],
      "keyword_hash": "sha256:…"
    },
    {
      "ref_index": 2,
      "source_id": "optn-policies",
      "pdf_page": 332,
      "policy": "18.3",
      "keywords": ["recording", "reporting", "outcomes", "organ", "offers", "refusal", "codes", "declined"],
      "keyword_hash": "sha256:…"
    }
  ]
}
```

### Fields

| Field | Purpose |
|---|---|
| `item_id` | Must match question `id` |
| `index_sources` | PDF bundle version used when stub was generated (`page_count` drift fails CI when index is present) |
| `primary_anchor.*` | Expected source, page, keywords for content check |
| `references[].ref_index` | Index into question `references[]` array |
| `policy` | For OPTN PDF refs — Policy § expected on page |
| `keyword_hash` | Normalized hash of keywords (integrity check on stub file) |

Stubs store **keywords and page numbers only** — never full PDF page text.

Schema: [`schema/reference-verification-stub.schema.json`](../../schema/reference-verification-stub.schema.json).

## Commands

```bash
npm run reference:index              # local, all PDFs present
npm run reference:export-stubs       # writes questions/.verification/<id>.json (after full reference validate)
npm run reference:export-stubs -- --check   # fail if stubs would change (no writes)
npm run reference:export-stubs -- --force   # overwrite changed stubs; remove orphans
npm run validate:stubs               # CI: compare question JSON vs committed stubs
```

`reference:export-stubs`:

1. Runs the same reference checks as full `validate` (all indexes required)
2. Writes stub files for passing items
3. Refuses to overwrite existing stubs unless `--force` (or use `--check` to detect drift)

`validate:stubs`:

- Hard-fails if stub missing for any bank item
- Hard-fails if `primary_anchor` / indexed `references[]` disagree with stub (source, page, keywords, Policy §)
- Hard-fails if stub `index_sources.page_count` differs from a source index present in the runner (e.g. OPTN policies PDF updates in CI)

## CI integration

`.github/workflows/validate.yml` runs `validate:ci` then `validate:stubs` after fetching/indexing OPTN policies.

When changing anchors or references, run locally:

```bash
npm run reference:index
npm run validate
npm run reference:export-stubs -- --force
npm run validate:stubs
```

## Relationship to ADR-030

Stubs are the committable enforcement layer for Tier B/C reference content when full
indexes cannot be in CI. Format rules (Tier A) stay in `verify-references.mjs` without stubs.

See also: [`docs/decisions/adr-030-verifiable-question-references.md`](../decisions/adr-030-verifiable-question-references.md).
