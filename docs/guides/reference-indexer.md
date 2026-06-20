# Reference Indexer Guide

> **Purpose**: Single architecture and operator reference for the local PDF reference indexer — how it works, how authors and SMEs use it, and how validation and CI depend on it.
>
> **Audience**: Maintainers, SMEs, and agents authoring or verifying question-bank items.
>
> **Not covered here** (see linked docs): locator policy rationale ([ADR-030](../decisions/adr-030-verifiable-question-references.md)), per-field authoring rules ([`02-author-questions.md`](../../.github/prompts/02-author-questions.md)), PDF filename table ([`docs/reference/README.md`](../reference/README.md)).

## What it is (and is not)

The **reference indexer** is a **local authoring and validation tool**. It:

- Extracts per-page text from maintainer-owned PDFs under `docs/reference/`.
- Powers `search` and `page` CLI commands for source-first question authoring.
- Lets `npm run validate` check that each item's `primary_anchor.keywords` appear on the cited PDF page.

It does **not**:

- Run in the learner app (`src/` never loads the index).
- Generate exam questions at runtime (v2 runtime generation is out of scope; see [v2 roadmap](../../.context/vision/v2-roadmap.md)).
- Replace committed question JSON — items in `questions/domain-*` are the bank the app ships.

## Architecture overview

```text
scripts/reference/sources.json     manifest (source_id → PDF filename)
        │
        ▼
docs/reference/*.pdf               local PDFs (gitignored; maintainer-owned)
        │
        │  npm run reference:index
        │  (pdftotext + pdfinfo via poppler-utils)
        ▼
docs/reference/.index/<id>.json    per-source page index (gitignored)
        │
        ├── npm run reference:search   keyword search → PDF page hits
        ├── npm run reference:page     dump one page for SME check
        │
        ▼
questions/domain-*/*.json          item JSON with primary_anchor + references
        │
        │  npm run validate (local, full index)
        ▼
scripts/lib/verify-references.mjs  format + index presence + keyword match
        │
        │  npm run reference:export-stubs
        ▼
questions/.verification/*.json     committed anchor metadata (CI substitute)
        │
        │  npm run validate:stubs (CI)
        ▼
GitHub Actions validate job        textbook anchors enforced without PDFs
```

### Core modules

| Path | Role |
|---|---|
| `scripts/reference/sources.json` | Canonical manifest: `source_id`, filename, title; OPTN bundle adds `kind` and `public_url`. |
| `scripts/lib/reference-index.mjs` | Build index (`buildSourceIndex`), search (`searchIndex`), keyword scoring (`keywordMatchScore`), OPTN policy heading detection. |
| `scripts/reference.mjs` | CLI entry: `index`, `search`, `page`. |
| `scripts/lib/verify-references.mjs` | Validates `primary_anchor` and `references` against index + format rules. |
| `scripts/lib/verification-stubs.mjs` | Exports/compares committed stubs for CI. |

### Index record shape (per source)

Each `docs/reference/.index/<source_id>.json` contains:

- Metadata: `source_id`, `filename`, `title`, `built_at`, `page_count`.
- `pages[]`: for each PDF page — `pdf_page`, extracted `text`, optional `chapter`, and for `optn-policies` — `policy` / `policies_on_page`.

Chapter and policy hints are **search aids**, not substitutes for human verification of the passage.

## Why JSON page files, not SQLite?

The original authoring decision (see [ADR-030 § Options Considered](../decisions/adr-030-verifiable-question-references.md)) compared **URLs-only** and **full PDF→markdown** conversion. **SQLite was not evaluated at implementation time**; this section records the rationale retroactively so the tradeoff is explicit.

### What we optimized for

| Goal | JSON page index | SQLite + FTS (hypothetical) |
|---|---|---|
| Page-accurate `primary_anchor.pdf_page` | Natural fit — one record per PDF page | Needs schema + import; same extracted text |
| Rebuild after PDF update | Delete `docs/reference/.index/`, rerun `reference:index` | Reimport or rebuild FTS tables |
| Tooling surface | Node + poppler only | + sqlite driver, schema, migrations |
| CI without PDFs | Committed verification stubs (`questions/.verification/`) | Would still need stubs or a committed DB snapshot |
| Authoring usage | Occasional `search` / `page` during item writing | Same interactive pattern |

### Lookup performance

**`reference:page`** — direct page dump: effectively O(1) once the JSON is loaded; no meaningful SQLite advantage.

**`reference:search`** — current implementation linearly scans every page in one source with simple substring matching (`searchIndex` in `reference-index.mjs`). At ~5k pages total across all PDFs, interactive search is typically sub-second. **SQLite FTS would likely be faster and richer** (fuzzy match, prefix search, cross-source queries) if the corpus grew large or search became a bottleneck.

The dominant cost is **index build** (`pdftotext` on every page), not search — any design must cache extracted page text.

### When to reconsider SQLite (or similar)

- Cross-source search (“search all textbooks at once”) becomes a routine need.
- Substring-only search misses too many authoring hits (stemming, typos, synonyms).
- Corpus scale or query volume makes linear scan noticeably slow.
- v2 runtime reference lookup needs a queryable store beyond known `pdf_page` values.

Until then, JSON page files stay the simpler correct tool for **verify-this-page** authoring, not a performance-optimized search engine.

## What is committed vs rebuilt

| Artifact | In git? | New clone / workspace |
|---|---|---|
| Indexer scripts + manifest | Yes | Ready to use |
| Question bank JSON | Yes | App and CI stub checks work |
| Verification stubs (`questions/.verification/`) | Yes | CI validates textbook anchors |
| Source PDFs (`docs/reference/*.pdf`) | No (gitignored) | Maintainer must obtain locally |
| Built index (`docs/reference/.index/`) | No (gitignored) | Run `npm run reference:index` after PDFs exist |

**Using the live app** requires only a clone — no indexer setup.

**Authoring or fully re-verifying references** requires local PDFs, `poppler-utils`, and a rebuilt index.

## Prerequisites

1. **PDFs** in `docs/reference/` with standard filenames — see [`docs/reference/README.md`](../reference/README.md).
2. **`poppler-utils`** — provides `pdftotext` and `pdfinfo` (used by the indexer).
3. **Node** — `npm install` for script dependencies.

OPTN policies bundle:

```bash
npm run reference:fetch-optn    # or manual browser download if 403
npm run reference:index -- optn-policies
```

## Commands

| Command | Purpose |
|---|---|
| `npm run reference:index` | Build indexes for all PDFs present locally. |
| `npm run reference:index -- <source_id>` | Rebuild one source (e.g. `cupples`, `optn-policies`). |
| `npm run reference:search -- <source_id> "<query>"` | Rank pages by keyword overlap; print snippets. |
| `npm run reference:page -- <source_id> <pdf_page>` | Print full page text for SME verification. |
| `npm run reference:fetch-optn` | Download OPTN policies PDF to `docs/reference/`. |
| `npm run reference:export-stubs` | Regenerate `questions/.verification/` after anchor changes. |
| `npm run reference:export-stubs -- --check` | Fail if stubs are stale vs bank. |
| `npm run reference:export-stubs -- --force` | Overwrite stubs after intentional anchor edits. |

### Examples

```bash
# Full rebuild (skip missing PDFs with a warning)
npm run reference:index

# Authoring loop
npm run reference:search -- cupples "Aspergillus dyspnea hypoxia"
npm run reference:page -- cupples 737

npm run reference:search -- optn-policies "Policy 18.3 refusal"
npm run reference:page -- optn-policies 412

# After editing primary_anchor on any item
npm run validate
npm run reference:export-stubs -- --force
npm run validate:stubs
```

Registered `source_id` values: `cupples`, `secrets`, `organ-transplantation`, `danovitch`, `nursing-drug-handbook`, `mosbys`, `optn-policies` (see `scripts/reference/sources.json`).

## How items use the indexer (authoring flow)

Source-first workflow (required) — detail in [`02-author-questions.md`](../../.github/prompts/02-author-questions.md):

1. **Search** the index for the fact you want to test.
2. **Open** the candidate page (`reference:page`).
3. **Confirm** one passage supports exactly one defensible correct answer.
4. **Write** stem, options, and explanation in original wording (do not copy PDF prose verbatim into learner-facing text).
5. **Set `primary_anchor`** — authoring ground truth (`source_id`, `pdf_page`, `section`, `keywords`, `quote_hint`).
6. **Add `references`** — learner-facing citations with matching locators (`PDF p. N`, outline path).
7. **Validate** locally with full index; **export stubs** if anchors changed.

Example `primary_anchor` on a reviewed item:

```json
{
  "type": "pdf",
  "source_id": "cupples",
  "pdf_page": 737,
  "section": "Ch. 13 → fungal infections → Aspergillus → v.",
  "quote_hint": "Dyspnea/hypoxia",
  "keywords": ["Dyspnea", "hypoxia", "Symptoms", "Aspergillus"]
}
```

Validation checks that enough `keywords` appear in the indexed page text (`keywordMatchScore` in `reference-index.mjs`). Stubs store a hash of keyword metadata so CI can detect drift without PDFs.

## Validation tiers

| Command | When | Index required? |
|---|---|---|
| `npm run validate` | **Local gate before merge** (question changes) | Yes — all cited sources |
| `npm run validate:references` | Fast loop while fixing anchors | Yes |
| `npm run validate:ci` | CI subset (schema, format, OPTN live content) | OPTN index built in CI; textbooks skipped |
| `npm run validate:stubs` | CI textbook anchor enforcement | No — uses committed stubs |
| `npm run validate:strict` | Milestone gating (coverage warnings fail) | Yes |

See also [`scripts/validate/README.md`](../../scripts/validate/README.md) and [`docs/reference/verification-stubs/README.md`](../reference/verification-stubs/README.md).

### Live OPTN bundle drift (CI)

HRSA republishes `optn_policies.pdf` periodically; **page numbers shift** even when policy text is unchanged. CI always **re-fetches and re-indexes** the live PDF before `validate:ci`, so OPTN-primary anchors are checked against the current bundle on every push/PR.

A **daily scheduled run** on `main` (`.github/workflows/validate.yml`, noon UTC) runs the same `validate` job when no one is pushing code — early warning if HRSA updates the bundle between PRs. The job does **not** run Playwright e2e (cost/noise); use push/PR for full workflow.

When daily or PR validation fails on OPTN references:

1. `npm run reference:fetch-optn && npm run reference:index -- optn-policies`
2. `npm run validate:ci` — read failing item IDs
3. `npm run reference:page -- optn-policies <pdf_page>` — confirm correct page
4. Update item `pdf_page`, `#page=N` URLs, locators; `npm run reference:export-stubs -- --force`
5. Commit question JSON + stubs

Validator note: OPTN locators with `Policy X.Y` are checked for the subsection on the cited page (not merely the parent `Policy X` heading). Table-only pages under Policy 18.x are recognized via instrument markers (`TCR`, `TRF`, `Table 18-2`, etc.) in `scripts/lib/verify-references.mjs`.

### Automated drift response (scheduled CI)

When the **daily scheduled** `validate` job on `main` fails due to OPTN page drift, a follow-up job (`optn-drift-remediate` in `.github/workflows/validate.yml`) runs:

1. **Analyze** — `npm run reference:audit-optn` compares indexed OPTN pages to item anchors and suggests high-confidence page re-anchors.
2. **Issue** — Opens or updates a GitHub issue labeled `optn-drift` with a table (`Item | Topic | Old → New page`) and any manual-review items.
3. **Remediate** — When auto-fixable drift exists, applies page updates, exports verification stubs (`reference:export-stubs -- --force`), opens a PR on `fix/optn-drift-YYYYMMDD`, and waits for CI checks.
4. **Human merge** — You review the PR and merge; automation does not merge to `main` unless the repository variable `OPTN_DRIFT_AUTOMERGE` is set to `true` (default: disabled).

Repository variable (Settings → Secrets and variables → Actions → Variables):

| Variable | Values | Default behavior |
|---|---|---|
| `OPTN_DRIFT_AUTOMERGE` | `true` / unset / anything else | Unset or not `true` → PR stays open for review. `true` → squash-merge after CI passes on the remediation PR. |

**Branch collision handling:** if an open PR already has the `optn-drift-remediation` label, the workflow pushes additional fixes to that branch instead of creating `fix/optn-drift-YYYYMMDD` again. New incidents use a date-stamped branch; if that branch name already exists without an open PR, a numeric suffix is appended (`-2`, `-3`, …).

Local preview:

```bash
npm run reference:fetch-optn && npm run reference:index -- optn-policies
npm run reference:audit-optn
npm run reference:audit-optn -- --apply   # after reviewing suggestions
```

**Scope limits:** automation handles mechanical OPTN `pdf_page` / `#page=N` / locator page shifts. Textbook anchor drift, keyword/content mismatches, or conflicting page suggestions within one item are listed under **Manual review required** on the issue only.

## Maintainer checklist (new workspace)

1. Clone the repo.
2. Place PDFs in `docs/reference/` (see filename table in [`docs/reference/README.md`](../reference/README.md)).
3. Install `poppler-utils`.
4. `npm install`
5. `npm run reference:index`
6. `npm run validate` — full local gate before editing questions.
7. After anchor edits: `npm run reference:export-stubs -- --force` and commit updated stubs with question JSON.

## SME verification workflow

SMEs do not need to run the full validation pipeline for spot checks:

1. Open the item's `primary_anchor` (`source_id`, `pdf_page`, `keywords`).
2. `npm run reference:page -- <source_id> <pdf_page>`
3. Confirm keywords / `quote_hint` match the passage that supports the keyed answer.
4. Open learner-facing `references[].locator` and confirm the outline path and `PDF p. N` match what you see.

For OPTN policy items, prefer Policy § in the locator plus `#page=N` on the policies PDF URL (see ADR-030).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Index missing for "cupples"` | No local index | `npm run reference:index` |
| `Skipping cupples: missing …pdf` | PDF not on disk | Add PDF to `docs/reference/` |
| `pdftotext failed` | `poppler-utils` not installed | Install poppler-utils |
| `validate:stubs` fails after anchor edit | Stubs stale | `npm run reference:export-stubs -- --force` |
| OPTN fetch 403 | HRSA bot protection | Manual browser download → `optn-policies.pdf` |
| Page numbers shifted | New OPTN policy bundle | Re-fetch PDF, re-index, re-verify affected items |

## Relationship to v2

[v2 deep-linked references](../../.context/vision/v2-roadmap.md) would expose PDF pages (or alternate web sources) in the learner UI. The indexer and `primary_anchor` metadata are the foundation maintainers already use to know **which page** to link; v2 would add runtime presentation, not replace the authoring model.

## See also

- [ADR-030: Verifiable Question References](../decisions/adr-030-verifiable-question-references.md) — policy and locator standards
- [`.github/prompts/02-author-questions.md`](../../.github/prompts/02-author-questions.md) — field-level authoring rules
- [`docs/reference/README.md`](../reference/README.md) — PDF filenames and fetch
- [`docs/reference/verification-stubs/README.md`](../reference/verification-stubs/README.md) — CI stub layer
- [`scripts/validate/README.md`](../../scripts/validate/README.md) — validation modes and modules
