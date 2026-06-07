# scripts/validate/

Modules orchestrated by [`scripts/validate.mjs`](../validate.mjs) in lexical order.
Each module owns one validation phase and can be imported independently for tests.

## npm scripts

| Script | Command | When to use |
|---|---|---|
| `validate` | Full local verification | **Required before merge** when changing questions |
| `validate:ci` | `--ci` subset | GitHub Actions (schema + integrity + format + OPTN live content) |
| `validate:stubs` | stub compare | GitHub Actions after `validate:ci`; textbook anchor metadata without PDFs |
| `reference:export-stubs` | stub generation | Local only; after full reference validate passes |
| `validate:coverage` | `--coverage-only` | Gap tables only (fast dashboard) |
| `validate:references` | `--references-only` | Fast loop while fixing locators/anchors |
| `validate:strict` | Full + coverage warnings fail | Milestone gating |

## Validation modes

### `npm run validate` (full — local gate)

- Schema + integrity: hard fail
- References format (Tier A): hard fail
- References content (Tier B/C): hard fail; **requires** `npm run reference:index` for every cited source
- Coverage: warnings (use `validate:strict` to fail)

### `npm run validate:ci` (CI subset)

- Same as full for schema, integrity, reference **format**
- Reference **content** hard-fails when an index exists in the runner (CI builds OPTN policies index)
- Skips live content checks for sources without a local index (textbooks) — logged under `Reference skips (CI — no local index)`
- Pair with `npm run validate:stubs` for committed textbook anchor metadata

### `npm run validate:references` (authoring loop)

- Reference format + content only (full index required)
- Skips schema, integrity, coverage
- Optional: `npm run validate:references -- --item cctc-2004`

## Reference verification tiers (all hard fail when applicable)

Implemented in `scripts/lib/verify-references.mjs`:

1. **Format** — locator shape, URL rules, banned generic OPTN pages, `#page=N` alignment
2. **Index presence** — cited PDF page exists in local index (full mode only)
3. **Content** — keywords on cited page; Policy § on OPTN page

## Verification stubs

See [`docs/reference/verification-stubs/README.md`](../../docs/reference/verification-stubs/README.md).
Committed stubs in `questions/.verification/` let CI hard-fail textbook anchor metadata without gitignored PDFs.

```bash
npm run reference:export-stubs
npm run reference:export-stubs -- --check
npm run reference:export-stubs -- --force
npm run validate:stubs
```

## Module ordering

| Module | Phase |
|---|---|
| `00-load-bank.mjs` | Load schema, blueprints, question shards |
| `10-schema.mjs` | JSON Schema |
| `20-integrity.mjs` | Options, task/domain, duplicate ids |
| `30-references.mjs` | `verify-references.mjs` |
| `40-coverage.mjs` | Blueprint gaps, task depth, infrastructure |
| `90-report.mjs` | Summary tables |

## CLI flags

```bash
npm run validate
npm run validate:ci
npm run validate:references
npm run validate:references -- --item cctc-2004
npm run validate:strict
```

Use `npm run validate:ci` in CI — not `--allow-missing-index` (removed; use the explicit script instead).
