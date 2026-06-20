# 03 — Validate the bank

Build a validation step that runs locally and in CI so the question bank cannot silently drift as items are added or removed. Read `00-onboarding.md` first.

## Two gates: CI vs local (required before merge)

| Gate | Command | What it proves |
|---|---|---|
| **CI** | `npm run validate:ci` + `npm run validate:stubs` | Schema, integrity, reference **format**, OPTN PDF **content** (live index), committed stub match for all anchors |
| **CI schedule** | `.github/workflows/validate.yml` daily on `main` | Same OPTN live check between PRs when HRSA republishes the policies PDF |
| **CI schedule (on failure)** | `optn-drift-remediate` job in `validate.yml` | Opens/updates `optn-drift` issue with page-shift table; may open/update remediation PR via `npm run reference:audit-optn -- --apply`. Optional repo variable `OPTN_DRIFT_AUTOMERGE=true` squash-merges after CI passes. |
| **Local (required before merge)** | `npm run validate` | Full textbook anchor **content** via local `docs/reference/.index/` (regenerate stubs when anchors change) |

Textbook PDFs and page indexes are gitignored (copyright + size). CI enforces textbook anchor metadata via committed stubs in `questions/.verification/` — see [verification stubs](../docs/reference/verification-stubs/README.md).

Before merging question-bank changes that touch references or anchors:

```bash
npm run reference:index              # requires docs/reference/*.pdf
npm run validate                     # hard-fails on any reference content mismatch
npm run reference:export-stubs -- --force   # when anchor metadata changed
npm run validate:stubs
```

## Implementation layout

Split into modules under `scripts/validate/` (see `scripts/validate/README.md`) — same pattern as `scripts/setup/` + `setup.sh`.

Orchestrator: `scripts/validate.mjs`.

### A. Per-item schema validation

Validate each item against the JSON Schema. Report file + item id + the specific violation.

### B. Cross-field integrity (beyond JSON Schema)

- `id` unique across the bank
- `correct` matches exactly one option
- `explanation.rationale_incorrect` complete
- `complex_combo` rules
- `task` / `domain` / `knowledge_codes` alignment

### B2. Reference verification

Runs in `scripts/validate/30-references.mjs` via `scripts/lib/verify-references.mjs`:

- **Tier A — Format:** locators, URLs, `#page=N`, no generic OPTN index URLs — **always hard fail**
- **Tier B — Index:** cited page in local index — **hard fail** in full mode; skipped in CI when index absent
- **Tier C — Content:** keywords on page, Policy § on OPTN page — **hard fail** when index present; never warn-only

Authoring loop: `npm run validate:references` (references only, full index required).

### C. Blueprint-coverage report (warn by default)

- Domain / legacy section gaps (reviewed items)
- Per-task depth vs blueprint targets (all bank items)
- Bank progress toward ~500 reviewed
- Cognitive / organ / age mix
- Reference infrastructure (PDF + index presence)

Use `npm run validate:strict` to fail on coverage warnings.

## npm scripts

```bash
npm run validate              # full local gate (required before merge)
npm run validate:coverage       # gap tables only (exam coverage dashboard)
npm run validate:ci           # CI subset (.github/workflows/validate.yml)
npm run validate:references   # reference phase only
npm run validate:strict       # full + coverage warnings fail
npm run reference:export-stubs       # regenerate questions/.verification/ (after validate passes)
npm run validate:stubs        # compare bank JSON to committed stubs
```

Flags: `--item <cctc-id>`, `--strict`, `--ci`, `--coverage-only`, `--references-only`.

Coverage output uses ASCII tables (Area / Current / Target / Gap). Use `validate:coverage` when you only want the dashboard.

## Wire it into the build and CI

- `npm run build` runs full `npm run validate` first (local gate).
- `npm run build:ci` runs `validate:ci` then `tsc` + `vite build` — used by the e2e CI job (no textbook PDFs).
- `.github/workflows/validate.yml`: **`validate` job** runs `validate:ci` then `validate:stubs` after fetching/indexing OPTN policies PDF; **`e2e` job** runs `build:ci` then Playwright.

## Output

Human-readable summary (counts, pass/fail, gap tables) plus non-zero exit on failure. CI logs list reference content checks skipped for missing textbook indexes under **Reference skips (CI — no local index)**.

## Verification stubs (CI hard-fail for textbook anchors)

[`docs/reference/verification-stubs/README.md`](../docs/reference/verification-stubs/README.md), schema: `schema/reference-verification-stub.schema.json`.

Stubs store per-item expected `source_id`, `pdf_page`, and `keywords` (no page text). Generated locally after full validate (`npm run reference:export-stubs`); compared in CI via `npm run validate:stubs`.
