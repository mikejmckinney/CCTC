# FAQ

Frequently asked questions about the CCTC practice-exam project.

## What is this project right now?

The repository is now an early app codebase rather than a spec-only repo. It contains the exam prompts, blueprint data, question schema, a React/Vite frontend scaffold, and validation tooling. The intended product scope is still defined by `.github/prompts/00-onboarding.md` through `.github/prompts/03-validate.md`.

## Is there a working web app in this repo yet?

Yes, but only as an early scaffold. The repo now has `package.json`, `src/`, `public/`, tests, and a Vite-based app shell. It is not a mature exam product yet, and the current loader falls back to the worked examples until real question shards are added under `questions/`.

## What stack is the project expected to use?

The current code uses React, TypeScript, Vite, and IndexedDB via `idb`. The prompt set also mentions Tailwind CSS as a recommendation, but that styling choice is not what is currently checked in.

## Why are there two blueprint files?

The app is meant to support both the current CCTC blueprint and the legacy blueprint:

- `blueprints/cctc-from-2026-07.json`: current outline, effective from 2026-07-01.
- `blueprints/cctc-thru-2026-06.json`: legacy outline, effective until 2026-06-30.

The default blueprint is the 2026-07 version. The legacy file includes the task-to-section crosswalk needed to sample the same bank against the older exam structure.

## Does the project keep two separate question banks for the two blueprints?

No. The intended design is one question bank tagged to the 2026-07 blueprint. The legacy blueprint derives its sections from the crosswalk in `blueprints/cctc-thru-2026-06.json`, with `legacy_section` available only as an override for edge cases.

## Where should new questions go?

They belong under `questions/`, sharded by domain rather than by arbitrary file size. `questions/README.md` describes the expected layout and recommends keeping files under a soft cap of 50 items each. Anything under `questions/_examples/` is illustrative only and should not be treated as live bank content.

If no non-underscore shards exist yet, the current app falls back to those examples so the scaffold remains usable during early development.

## What is the difference between draft and reviewed items?

Every authored item starts as `draft`. A human SME promotes it to `reviewed` only after checking the facts, confirming exactly one defensible correct answer, and verifying the references. Exam mode is intended to default to reviewed-only items, while study mode may include drafts if they are clearly labeled.

## Can questions be copied from textbooks, the ABTC handbook, or recall sites?

No. The prompts explicitly require original wording for stems, options, and explanations. Facts can be verified from authoritative sources, but copyrighted expression and real exam content cannot be copied or closely paraphrased.

## Is this app supposed to run with a backend or online service?

No. The planned product is static-hosted, client-side only, and offline-capable after first load. Persistence is intended to live in IndexedDB on the user's device.

## Will the practice app calculate an official ABTC passing score?

No. The prompts explicitly say the app should report raw performance and any pass indicator only as an unofficial practice estimate. It is not an official scoring engine and is not affiliated with ABTC or PSI.

## What does the app need to support besides taking an exam?

The current spec also requires resume-after-close behavior, score history, blueprint-weighted sampling, support for both item formats, and an item-flagging workflow so the pilot user can report factual errors, ambiguity, outdated policy, or wording problems back into the authoring loop.

## Why does this repo still contain so many workflow and ADR documents?

The repository was bootstrapped from `ai-repo-template`, so it still carries the inherited multi-agent governance system. Those files remain active for repo process, but the product-facing docs should describe the practice app rather than the template.
