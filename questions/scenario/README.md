# Scenario companion question bank

Parallel question bank of **clinical vignette companions** paired 1:1 with the standard bank (`questions/domain-*`).

## Target

- **506** reviewed companions (one per standard item)
- IDs **`cctc-6001`–`cctc-6506`**
- Required field **`companion_of`**: stable id of the standard item (e.g. `cctc-2041`)

## Layout

```text
questions/scenario/
  domain-1-education/
  domain-2-pretx/
  domain-3-postop/
```

Mirror the standard bank domain folders. Do not mix standard and scenario items in the same file.

## Authoring rules

| Rule | Detail |
|---|---|
| Pairing | Same `domain`, `task`, `knowledge_codes`, and `type` as `companion_of` |
| Voice | Second person (“You are managing…”) or third person (“A 25-year-old…”) |
| Vignette | **4–6 sentences** in `stem`: role/setting, patient snapshot, status, trigger event, constraints |
| Prompt | One clear decision question after the vignette |
| Type | Mirror parent (`one_best` or `complex_combo` with matching `elements` / `selects`) |
| Wording | Original prose only — do not copy copyrighted source text |
| References | Same verifier pipeline as standard bank (`primary_anchor`, `references`, stubs) |
| Status | Agents write `draft`; maintainer promotes to `reviewed` |

## Authoring workflow (use the indexer)

```bash
npm run reference:search -- <source_id> "<keywords>"
npm run reference:page -- <source_id> <pdf_page>
npm run validate
npm run reference:export-stubs -- --force
```

See [`docs/guides/reference-indexer.md`](../../docs/guides/reference-indexer.md) and [ADR-031](../../docs/decisions/adr-031-scenario-companion-bank.md).

## Pilot wave (Phase B)

First **30** companions (`cctc-6001`–`cctc-6030`) in `questions/scenario/domain-*/pilot-batch-01.json`:

| Companion id | `companion_of` | Domain |
|---|---|---|
| cctc-6001–6010 | cctc-1001, 1018, 1037, 1057, 1078, 1099, 1120, 1142, 1011, 1101 | 1 |
| cctc-6011–6020 | cctc-2001, 2023, 2045, 2067, 2089, 2111, 2133, 2136, 2148, 2160 | 2 |
| cctc-6021–6030 | cctc-3001, 3023, 3040, 3058, 3080, 3101, 3123, 3146, 3004, 3108 | 3 |

Regenerate from parents: `node scripts/scenario/build-pilot-companions.mjs` (stems live in that script).

## Wave 2 (Phase C — first content wave)

**150** companions (`cctc-6031`–`cctc-6180`) in `questions/scenario/domain-*/wave-batch-02.json` — **50 per domain**, stratified parents (excluding pilot `companion_of` targets), ~15% `complex_combo`.

Regenerate: `node scripts/scenario/build-wave-02.mjs` (parent selection in `scripts/scenario/lib/wave-selection.mjs`; stems via `scripts/scenario/lib/scenario-stem.mjs`).

Status: **`draft`** until maintainer spot-check (pilot `cctc-6001`–`6030` remain **`reviewed`**).

## App usage

Learners choose **Scenario companions** on the start screen. Study, exam, and timed modes behave the same as the standard bank; blueprint task weighting applies to the scenario pool.
