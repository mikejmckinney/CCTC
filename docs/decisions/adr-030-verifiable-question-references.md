# ADR-030: Verifiable Question References (Source-First + OPTN Policy PDF)

## Status

Accepted

## Date

2026-06-06

## Context

CCTE practice items must be **independently checkable**: a learner or SME should
open the cited source and find the passage that supports the keyed answer. Early
authoring drifted in the opposite direction:

- References were sometimes **attached after** the question was written from
  memory.
- Textbook `locator` values used **paraphrased section titles** or page numbers
  that did not match the repo PDF (e.g. wrong heading wording on the cited
  page).
- OPTN/HRSA `url` values often pointed at **generic index pages**
  (`hrsa.gov/optn`, `…/policies-bylaws/policies`) that do not contain the fact
  under test.
- Useful **specific** HRSA pages (public-comment summaries quoting a Policy §)
  were at risk of being **replaced** by a policies-PDF link when we added OPTN
  indexing — losing readable corroboration.

The product goal is a **verifiable** bank (~500 reviewed items), not citation
theater. Validation and authoring tooling must encode the standard so agents and
SMEs apply it consistently.

## Decision

Adopt a **source-first, verifiable reference model** for the question bank with
these rules:

### 1. Source-first authoring (required)

1. Search the local reference index (`npm run reference:search`).
2. Open the PDF page (`npm run reference:page`).
3. Confirm one passage supports a single defensible correct answer.
4. Write the item in original wording from that passage.
5. Set `primary_anchor` to that passage (`source_id`, `pdf_page`, `section`,
   `keywords`, `quote_hint`).
6. Add learner-facing `references` with matching locators.

Operational detail lives in
[`.github/prompts/02-author-questions.md`](../../.github/prompts/02-author-questions.md).
Enforcement: `scripts/validate.mjs` (orchestrator) and `scripts/lib/verify-references.mjs`.
**Local gate:** `npm run validate` (full index required).
**CI gate:** `npm run validate:ci` (necessary but not sufficient for textbook anchors).
**Future CI:** committed verification stubs — [`docs/reference/verification-stubs/README.md`](../../docs/reference/verification-stubs/README.md).

### 2. Textbook locator standard

Textbook `references[].locator` (and corroborating refs) must include:

- A **findable outline path** (`Ch. → § → item/table`, etc.).
- **Exact book wording** where headings matter (do not invent section titles).
- **`PDF p. N`** from the gitignored repo copy, plus
  `(repo file-page index; printed margin may differ)`.

Validator: `hasTextbookLocator()` when `kind` is `textbook`.

### 3. Local PDF index (textbooks + OPTN policies)

- Manifest: `scripts/reference/sources.json`.
- Index build: `npm run reference:index` → `docs/reference/.index/` (gitignored).
- PDFs in `docs/reference/*.pdf` (gitignored; not committed).

**OPTN policies bundle** (canonical public URL):

`https://www.hrsa.gov/sites/default/files/hrsa/optn/optn_policies.pdf`

- Local filename: `optn-policies.pdf`
- Fetch: `npm run reference:fetch-optn`
- `source_id`: `optn-policies`
- Indexer detects `Policy N` / `Policy N.N` headings for search hints.

See [`docs/reference/README.md`](../../docs/reference/README.md).

### 4. OPTN policies PDF references (learner-facing)

When citing the policies PDF:

- `locator`: `Policy X.Y → <topic/subsection>; PDF p. N (repo file-page index; …)`.
- `url`: same canonical PDF with **`#page=N`** where `N` matches the locator’s
  `PDF p. N`.
- Validator requires Policy § + page in locator and matching `#page` on the URL.

**Do not** rely on URL fragments for Policy § anchors (`#Policy18.3`) — PDF
viewers do not resolve them reliably. The **Policy § is in the locator**; the
**URL opens the page**.

### 5. Other HRSA / OPTN URLs (non-PDF)

- Allowed when they land on **specific content** (e.g. a public-comment page
  quoting Policy 18.3).
- `locator` must name the **Policy §** and what to read there.
- **Never** use generic OPTN landing or policies index URLs as item references.

### 6. Additive OPTN PDF corroboration (not replacement)

When an item **already cites a specific Policy §** (in `references` or notes)
and the indexed policies PDF **contains that fact on a verified page**:

- **Add** a policies-PDF reference (`kind: regulation`) with Policy § + `PDF p. N`
  + `#page=N`.
- **Keep** existing useful references (textbook, readable HRSA pages).
- **Do not** remove a verified HRSA URL solely because the PDF ref exists.

**Do not add** a policies-PDF reference when:

- The item only mentions “OPTN” generically with no Policy §.
- The Policy § or page has not been verified via `reference:page` (TOC hits are
  insufficient).
- The PDF ref would duplicate an existing policies-PDF ref at the same passage.

`primary_anchor` stays on the **authoring source** (often a textbook). Policy
PDF refs are **corroboration** unless the item is written source-first from
Policy text (policy-primary items).

### 7. Re-index and re-verify on policy updates

HRSA publishes new OPTN policy bundles periodically. Page numbers shift.
Maintainers must re-fetch, re-index, and re-verify anchors when the bundle
changes.

## Options Considered

| Option | Why not (or when used) |
|---|---|
| **URLs only, no local PDF index** | Cannot keyword-validate anchors; HRSA bot protection blocks reliable automated fetch in CI; page-accurate locators need a local copy. |
| **Replace all OPTN URLs with policies PDF** | Loses readable HRSA pages that already quote the policy; PDF is harder for some learners. **Rejected** — use additive corroboration. |
| **Policy-PDF ref on every OPTN mention** | Recreates generic-reference noise. **Rejected** — gate on specific Policy § + verified page. |
| **Document only in `02-author-questions.md`** | Operational rules yes, but **reasoning and gates** get lost across sessions. **ADR captures why**; prompt captures how. |
| **Document only in `roadmap.md`** | Roadmap is phase tracking, not an audit trail. **Too easy to bury** rationale in deliverable bullets. |

## Consequences

### Positive

- SMEs and agents can **spot-check** any item via index + page commands.
- Validator blocks generic OPTN URLs and mismatched `#page` / locator pages.
- Layered references (textbook + HRSA page + policies PDF) match how
  coordinators actually research policy.

### Negative / costs

- Maintainers need local PDFs and `poppler-utils` (`pdftotext`, `pdfinfo`).
- OPTN policy page numbers require **refresh** when the bundle updates.
- Bank growth is slower (source-first) but produces fewer bad citations.

## References

- [`.github/prompts/02-author-questions.md`](../../.github/prompts/02-author-questions.md) — operational authoring rules
- [`scripts/reference/sources.json`](../../scripts/reference/sources.json) — source manifest
- [`scripts/validate.mjs`](../../scripts/validate.mjs) — locator and anchor enforcement
- [`docs/reference/README.md`](../../docs/reference/README.md) — local PDF setup
- [`.context/roadmap.md`](../../.context/roadmap.md) — Phase 3 tracker (points here)
