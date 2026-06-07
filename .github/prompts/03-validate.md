# 03 — Validate the bank

Build a validation step that runs locally and in CI so the question bank cannot silently drift as items are added or removed. Read `00-onboarding.md` first.

## Two gates: CI vs local (required before merge)

| Gate | Command | What it proves |
|---|---|---|
| **CI** | `npm run validate:ci` | Schema, integrity, reference **format**, OPTN PDF **content** (where CI builds the index), coverage report |
| **Local (required before merge)** | `npm run validate` | Everything CI runs **plus** full textbook anchor **content** via local `docs/reference/.index/` |

**CI is necessary but not sufficient for references.** Textbook PDFs and page indexes are gitignored (copyright + size). GitHub Actions cannot run full Cupples/Danovitch keyword verification today.

Before merging question-bank changes, maintainers must run locally:

```bash
npm run reference:index    # requires docs/reference/*.pdf
npm run validate           # hard-fails on any reference content mismatch
```

Future: committed [verification stubs](../docs/reference/verification-stubs/README.md) will let CI hard-fail textbook content without PDFs.

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
```

Flags: `--item <cctc-id>`, `--strict`, `--ci`, `--coverage-only`, `--references-only`.

Coverage output uses ASCII tables (Area / Current / Target / Gap). Use `validate:coverage` when you only want the dashboard.

## Wire it into the build and CI

- `npm run build` runs full `npm run validate` first.
- `.github/workflows/validate.yml` runs `npm run validate:ci` after fetching/indexing OPTN policies PDF.

## Output

Human-readable summary (counts, pass/fail, gap tables) plus non-zero exit on failure. CI logs list reference content checks skipped for missing textbook indexes under **Reference skips (CI — no local index)**.

## Verification stubs (future CI hard-fail for textbooks)

Design: [`docs/reference/verification-stubs/README.md`](../docs/reference/verification-stubs/README.md), schema: `schema/reference-verification-stub.schema.json`.

Stubs store per-item expected `source_id`, `pdf_page`, and `keywords` (no page text). Generated locally after full validate; compared in CI via future `npm run validate:stubs`.
