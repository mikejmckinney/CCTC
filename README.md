# CCTE — CCTC Practice Exam

A client-side practice-exam web app for the ABTC **Certified Clinical Transplant Coordinator (CCTC®)** exam. Built from `ai-repo-template`; the app is intended to be implemented by an AI agent reading the prompts in `.github/prompts/`.

> **Independent study aid.** CCTE is **not affiliated with or endorsed by ABTC or PSI** and does not reproduce real exam questions. All items are original, written to the published content outline. Practice scores are estimates, not official results.

## What it does

- Timed or untimed practice exams; timer defaults to the real exam's **180 minutes**, user-adjustable.
- User-set question count (defaults to the real exam's **175 items**).
- Two modes: **Study/flashcard** (answer + explanation revealed immediately) and **Exam** (results only after Submit).
- Both ABTC item formats: single-best-answer and complex multiple-choice.
- **Both blueprint versions**: the current outline (effective 2026-07-01) and the legacy outline (effective until 2026-06-30), selectable per session.
- Blueprint-weighted sampling, randomized question + answer order, recently-seen de-prioritization.
- **Save-after-each-question with resume.** Score history with per-content-category breakdown.
- Responsive (phone/tablet/laptop), client-side only (IndexedDB), static-hostable, offline after first load.

## Repository layout

```
.github/prompts/
  00-onboarding.md        # start here — context + guardrails
  01-build-app.md         # web app functional spec
  02-author-questions.md  # how to author the item bank
  03-validate.md          # schema + blueprint-coverage validation + CI
package.json             # React/Vite scripts: test, build, validate
public/
  manifest.webmanifest   # install metadata for the static app shell
  sw.js                  # service worker for offline/static hosting
src/
  app/App.tsx            # current app scaffold and session UI
  data/questionBank.ts   # bank loader with example fallback
  lib/                   # assembly, persistence, scoring, storage helpers
scripts/
  validate.mjs           # local bank validator used by build + CI
.github/workflows/
  validate.yml           # npm ci && npm run validate on push / PR
schema/
  question.schema.json    # the question contract
blueprints/
  cctc-from-2026-07.json  # current blueprint (default)
  cctc-thru-2026-06.json  # legacy blueprint (+ task->section crosswalk)
questions/
  README.md               # sharding, naming, status workflow
  _examples/examples.json  # two worked items; current fallback bank during early scaffold stage
  domain-1-education/ ...  # the bank, sharded by domain
```

## Key design decisions

- **One bank, two blueprints.** Items are tagged to the 2026-07 blueprint (`domain`/`task`/`knowledge_codes`); the legacy blueprint derives its sections via a crosswalk in its config. A future outline change is a new config file, not a re-tag of every item.
- **JSON, sharded by domain.** Structured, validatable, git-friendly; ≤50 items per file.
- **Grounded + reviewed.** Items are authored from public/authoritative sources (OPTN/UNOS, HHS/HIPAA, CMS, open guidelines) plus verified general clinical knowledge, with citations (clickable where the source is public). Owned reference texts are used only to **verify facts and cite**, never to reproduce text. Every item starts `status: "draft"`; a human SME promotes to `reviewed`.
- **No backend, no runtime model calls.** Questions are static, reviewed JSON. Model-assisted authoring happens offline as drafts for human review — never live to the learner.

## Content source

Blueprint data is transcribed from the ABTC Candidate Handbook (rev. 3/12/2026), CCTC content outlines. The real exam is 175 items (150 scored + 25 unscored pretest), 3 hours. The app does **not** compute ABTC's scaled scores or official cut score (ABTC does not publish them); it reports raw, per-category results labeled as unofficial estimates.

## Status

The repo now contains the first React/Vite app scaffold, local validation script, and CI validation workflow alongside the prompts, schema, and blueprint data. The question bank has **73 draft items** in eighteen shards under `questions/domain-*` (`batch-01` through `batch-06` per domain); the app loads these shards automatically. All items remain `status: "draft"` — no reviewed items yet — so exam mode still has no reviewed pool until SME promotion.

Next: continue batch authoring toward reviewed coverage, keep `npm run validate` green locally before merge, and continue hardening the app against the full `01-build-app.md` product spec.

## Limitations

- The current bank is small (73 draft items) and not representative of a full 150-item exam; exam mode excludes drafts by default.
- Practice results are unofficial estimates and are not ABTC scaled scores or pass/fail decisions.
- The app is an exam-prep tool, not medical advice, and should not be used for patient-care decisions.
- Content coverage and reviewed-item balance will remain incomplete until the bank grows substantially.

## Future Improvements

- Expand the authored and reviewed question bank across all blueprint domains.
- Improve category-level reporting and history review once the live bank is large enough to make trends meaningful.
- Continue aligning the UI and session behaviors with the full scope in `.github/prompts/01-build-app.md`.
- Add more targeted validation and tests as new question shards and workflow paths land.

## FAQ

See [docs/FAQ.md](docs/FAQ.md) for repo and product details.
