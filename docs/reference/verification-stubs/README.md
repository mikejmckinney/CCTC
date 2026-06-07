# Reference verification stubs (design)

Committed verification stubs let CI **hard-fail reference content** without gitignored
textbook PDFs or full page-text indexes. They are a hash-sized, committable substitute
for `docs/reference/.index/` when the full index cannot live in the repo.

## Problem

| Surface | Local dev | CI |
|---|---|---|
| Textbook PDFs | `docs/reference/*.pdf` (gitignored) | Not available |
| Full page index | `docs/reference/.index/` (gitignored) | Not available |
| Question JSON | In git | In git |

`npm run validate` (full) requires local indexes. `npm run validate:ci` verifies
format + OPTN-indexed content only. Stubs close the gap for textbook anchors in CI.

## Stub file layout (proposed)

One stub per item, sharded by id prefix:

```text
questions/.verification/
  cctc-2004.json
  cctc-3008.json
  ...
```

Or a single manifest (less merge-friendly):

```text
questions/.verification/manifest.json
```

**Recommendation:** one file per item under `questions/.verification/` (same shard
discipline as the bank; excluded from exam sampling like `_examples`).

## Stub shape (example)

```json
{
  "item_id": "cctc-2004",
  "schema_version": 1,
  "generated_at": "2026-06-06",
  "index_sources": {
    "danovitch": { "filename": "danovitch-handbook-kidney-transplantation.pdf", "page_count": 512 },
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
      "keywords": ["DonorNet", "declined", "refusal"],
      "keyword_hash": "sha256:…"
    },
    {
      "ref_index": 2,
      "source_id": "optn-policies",
      "pdf_page": 332,
      "policy": "18.3",
      "keywords": ["Policy 18.3", "refusal", "PTR"],
      "keyword_hash": "sha256:…"
    }
  ]
}
```

### Fields

| Field | Purpose |
|---|---|
| `item_id` | Must match question `id` |
| `index_sources` | Records PDF bundle version used when stub was generated |
| `primary_anchor.*` | Expected source, page, keywords for content check |
| `references[].ref_index` | Index into question `references[]` array |
| `policy` | For OPTN PDF refs — Policy § expected on page |
| `keyword_hash` | Optional — normalized hash of matched terms on page (detect index drift without storing page text) |

Stubs store **keywords and page numbers only** — never full PDF page text.

## Generation (proposed command)

```bash
npm run reference:index              # local, all PDFs present
npm run reference:export-stubs       # writes/updates questions/.verification/<id>.json
npm run validate:stubs               # CI: compare question JSON vs stubs
```

`reference:export-stubs` would:

1. Run the same checks as full `validate` references phase
2. Write stub files for passing items
3. Fail if an existing stub would change (forces intentional regen when sources shift)

## CI integration (future)

```yaml
# After validate:ci
- run: npm run validate:stubs
```

`validate:stubs` would:

- Hard-fail if stub missing for any bank item with PDF anchor
- Hard-fail if `primary_anchor` / indexed `references[]` disagree with stub (source, page, keywords)
- Hard-fail if stub `index_sources.page_count` differs from committed optn bundle metadata (policy PDF updates)

Until `reference:export-stubs` is implemented, use **local full `npm run validate`** before merge.

## Relationship to ADR-030

Stubs are the committable enforcement layer for Tier B/C reference content when full
indexes cannot be in CI. Format rules (Tier A) stay in `verify-references.mjs` without stubs.

See also: [`docs/decisions/adr-030-verifiable-question-references.md`](../decisions/adr-030-verifiable-question-references.md).
