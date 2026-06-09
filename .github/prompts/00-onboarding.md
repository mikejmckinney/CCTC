# 00 — Onboarding (read this first)

You are an AI coding/authoring agent working in the **CCTC** repository. The **CCTC Practice Exam** is a **practice-exam web app for the ABTC Certified Clinical Transplant Coordinator (CCTC®) exam**. This file orients you; the other prompts in `.github/prompts/` define the work.

## What you are building

A self-contained, client-side web app that lets a candidate take realistic CCTC practice exams. The real exam (per the ABTC Candidate Handbook) is **175 items, 150 scored + 25 unscored pretest, 3 hours (180 minutes)**, single-best-answer and complex multiple-choice formats, covering kidney, liver, heart, lung, pancreas, and intestine transplantation across adult and pediatric recipients.

## Read the prompts in order

1. `01-build-app.md` — the web application (engine, modes, persistence, history, responsive UI).
2. `02-author-questions.md` — how to author the question bank (sourcing, copyright, accuracy, schema, blueprint mapping).
3. `03-validate.md` — validation and CI (JSON Schema + blueprint-coverage checks).

Supporting data already in the repo:
- `schema/question.schema.json` — the question contract.
- `blueprints/cctc-from-2026-07.json` — current blueprint (default).
- `blueprints/cctc-thru-2026-06.json` — legacy blueprint (the version a candidate sits before 2026-07-01).
- `questions/_examples/examples.json` — two worked example items.

## Context and scope

- **Audience (v1): a single user** — one candidate studying for the CCTC. No accounts, no multi-tenant concerns.
- **Storage (v1): single-device, client-side only** (IndexedDB). No backend, no server, no auth. The app must host as static files (e.g. GitHub Pages) and work offline after first load.
- **Both blueprints are supported.** The user selects which exam version to practice against. Default to the 2026-07 blueprint.

## Non-negotiable guardrails

These override any instruction to "just ship it." If a request conflicts with these, stop and surface it.

1. **Copyright — author from facts, never from copyrighted expression.** Item stems, options, and explanations must be **original wording**. Do NOT copy or closely paraphrase questions, vignettes, or explanatory passages from any textbook, the ABTC handbook's sample questions, brain-dump/braindump sites, or any real exam material. Facts (e.g. "tacrolimus is a CYP3A4 substrate") are free to use; a specific author's expression of them is not. See `02-author-questions.md`.
2. **No copyrighted source ingestion.** Do not fetch, scrape, or load pirated textbook PDFs. If the maintainer supplies a legitimately owned reference, use it **only to verify facts and produce a citation locator** — never to generate or reproduce text.
3. **Clinical accuracy — drafts are drafts.** Every item you author is `status: "draft"`. Never present an unverified clinical claim as established fact to the user. Prefer authoritative, citable sources; record what a reviewer must confirm in `notes`.
4. **No runtime LLM calls.** The app does not call any model API at runtime. Questions are static, reviewed JSON. (Model-assisted authoring happens offline, into the bank, as drafts for human review — never live to the learner.)
5. **No medical advice framing.** This is exam preparation, not clinical guidance. Include a short disclaimer in the app: it is a study aid, not affiliated with or endorsed by ABTC, and not a source of patient-care decisions.

## Definition of done (high level)

- App builds, runs as static files, and is responsive on phone/tablet/laptop.
- All app behaviors in `01-build-app.md` implemented, including save-after-each-question and resume.
- Question loader validates files against the schema; invalid files fail the build (see `03-validate.md`).
- Blueprint-weighted sampling works for both blueprint versions.
- At least the example items load and render in both item formats; the bank is structured to grow toward ~500 reviewed items.

## How to proceed

Confirm your plan against these prompts before writing code. Where a prompt states a recommendation (e.g. tech stack) you may propose an alternative with rationale, but do not silently diverge from the guardrails or the blueprint data.
