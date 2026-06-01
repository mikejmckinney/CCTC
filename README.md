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
schema/
  question.schema.json    # the question contract
blueprints/
  cctc-from-2026-07.json  # current blueprint (default)
  cctc-thru-2026-06.json  # legacy blueprint (+ task->section crosswalk)
questions/
  README.md               # sharding, naming, status workflow
  _examples/examples.json  # two worked items (not loaded into the bank)
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

Scaffold + agent prompts + schema + blueprints + example items. Next: an agent implements the app (`01`), authors the bank toward ~500 items (`02`), and wires validation/CI (`03`); a transplant SME reviews items before they count in Exam mode.
