# 03 — Validate the bank

Build a validation step that runs locally and in CI so the question bank cannot silently drift as items are added or removed. Read `00-onboarding.md` first.

## Create `scripts/validate.mjs` (or equivalent)

A Node script (no network) that loads `schema/question.schema.json`, both blueprint configs, and every `questions/**/*.json` except `_`-prefixed paths, then reports and exits non-zero on any failure.

### A. Per-item schema validation

Validate each item against the JSON Schema (use a standard validator, e.g. `ajv` with formats). Report file + item id + the specific violation.

### B. Cross-field integrity (beyond what JSON Schema can express)

For every item, confirm:

- `id` is **unique** across the entire bank.
- `correct` matches the `id` of **exactly one** existing option.
- `explanation.rationale_incorrect` has an entry for **every non-correct option** (and none for the correct one).
- For `complex_combo`: every `options[].selects` entry references a defined `element` id; `shuffle` is `false`.
- `references` has at least one entry; any `url` is a well-formed absolute URL.
- `task` (if present) is a real task code in the 2026-07 blueprint, and its `domain` matches the task's domain prefix.
- `knowledge_codes` (if present) share the item's domain prefix.

### C. Blueprint-coverage report (warn, don't necessarily fail)

For **each** blueprint, report against `reviewed` items only:

- Items available per **domain** (2026-07) / per **section** (legacy, via `crosswalk_from_new_task` + any `legacy_section` override). Flag any domain/section that cannot fill its weighted share of a full 150-scored exam within `domain_tolerance_items`.
- Distribution vs. `cognitive_level_targets` and `organ_targets` (soft — warn on large deviations).
- Count of `draft` vs `reviewed` items per domain, so the maintainer can see review progress.
- Total reviewed items vs. the ~500 target.

Make A and B **hard failures** (exit non-zero). Make C **warnings** by default, with a `--strict` flag that turns coverage gaps into failures once the bank is mature.

## Wire it into the build and CI

- `npm run validate` runs the script. The app build (`01-build-app.md`) runs validation first and **fails the build on any A/B error**, so schema-invalid items never reach the app.
- Add a GitHub Actions workflow (`.github/workflows/validate.yml`) that runs `npm ci && npm run validate` on push and pull request. This is the review checkpoint for new questions.

## Output

Human-readable summary (counts, pass/fail, warnings) plus a non-zero exit on failure. Optionally emit a `coverage.json` the app or a dashboard can display so the maintainer can see, at a glance, which domains/tasks still need items and how many remain in `draft`.
