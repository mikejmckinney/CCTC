# 02 — Author the question bank

How to write CCTC practice items. Read `00-onboarding.md` first. Every item must conform to `schema/question.schema.json` and be written with `status: "draft"`.

## Sourcing hierarchy (where the content comes from)

Author each item by testing a **fact** drawn from, in priority order:

1. **Public, authoritative, citable sources** — preferred, because they are accurate AND give the learner a clickable reference with zero copyright risk. These cover a large share of the exam (especially Domain 2 listing/allocation and the policy/regulatory/financial content):
   - **OPTN/UNOS policy** — allocation, listing/maintenance/removal, MELD/PELD, KDPI, status systems, OPTN/UNET reporting. `optn.transplant.hrsa.gov`. Deep-link the specific policy section.
   - **HHS / HIPAA**, **CMS / Medicare coverage**, **UAGA**, **NOTA**.
   - **Openly published clinical guidelines** — e.g. AAN brain-death criteria, KDIGO, AST/ASTS consensus statements, CDC infection guidance, ISHLT. Cite and link when freely available.
2. **Verified general clinical knowledge** — immunology, rejection, infection, pharmacology, complications, lab interpretation. Use for items not covered by category 1. This is where factual drift happens, so **verify before trusting** and record the verification need in `notes`.

**Owned reference texts (if the maintainer provides legitimately owned copies):** use them **only** to (a) confirm a drafted fact is correct/current and (b) produce a citation `locator` (chapter/page). Never copy or paraphrase their prose into stems, options, or explanations.

## Copyright rules (hard)

- **Original expression only.** Write every stem, option, and explanation in your own words and structure. Test the underlying fact; do not mirror any source's wording, sentence structure, selection, vignette, or arrangement.
- **Never reproduce** real ABTC exam items, the handbook's sample questions, or anything from brain-dump sites — not even reworded.
- **Facts are free; expression is owned.** "MELD uses specific lab values" is a fact you may test. A textbook's paragraph explaining MELD is protected expression you may not reproduce.
- If you cannot write an item without leaning on a source's specific expression, pick a different angle or skip it.

## Clinical accuracy rules

- One **defensible** correct answer per item. Distractors must be plausible but clearly incorrect to a competent coordinator — test competency, not trickery (the handbook is explicit that items measure competence, not tricks).
- **Verify drug regimens, lab ranges, and policy specifics** against a current source — these change. Examples of drift to watch: MELD version/components (MELD 3.0), KAS/kidney allocation changes, immunosuppression protocols, infection prophylaxis. If unsure, mark it clearly in `notes` for the reviewer and keep `status: "draft"`.
- Write at the level of a **minimally competent first-year transplant coordinator** (the handbook's standard), within legally licensed practice — not advanced-practice (NP/PA) scope.

## Item formats

Produce both, roughly matching the exam's feel:

- **`one_best`** — a stem and 4 options (A–D), one best answer. Most items.
- **`complex_combo`** — a stem, numbered `elements` (I, II, III, IV), and 4 combination `options` (e.g. "I and II only") each listing the elements it asserts via `selects`. Set `shuffle: false`. Use these for analysis-level items where the candidate must evaluate multiple statements.

See `questions/_examples/examples.json` for one worked item of each type, including how `explanation.rationale_incorrect` covers every wrong option and how `references` mix a linkable public source with a textbook locator.

## Tagging and blueprint mapping

Tag every item to the **2026-07 blueprint** (the legacy blueprint is derived via crosswalk — do not double-tag):

- `domain` (1/2/3) — **required**.
- `task` (e.g. `010500`) — recommended; enables task-level coverage and the legacy crosswalk.
- `knowledge_codes` (e.g. `["010504"]`) — optional; map to the specific outline knowledge/skill statements for fine-grained coverage auditing.
- `cognitive_level` — `recall` / `application` / `analysis`. Aim for roughly **35% / 52% / 13%** across the bank. Do not write only recall items.
- `organ` — about **50% `general`**; distribute the rest per the blueprint `organ_targets` (kidney heaviest, then liver, lung, heart, then small counts for pancreas/intestine/multi). Include some **pediatric** items (small share).

## How to reach ~500 with good coverage

- Work **domain by domain, task by task**, generating items in batches into the matching `questions/<domain>/...` file (≤50 per file; split as needed).
- After each batch, run the coverage check (`03-validate.md`) and fill the under-represented domains/tasks/cognitive levels/organs next.
- Keep a healthy surplus per category so the sampler has variety beyond a single exam's worth.

## Reviewer handoff

For each item, make the SME's job easy: precise `references` with locators, a `notes` field stating exactly what to verify (e.g. "confirm current MELD 3.0 components against OPTN policy"), and a single clearly-correct answer. The SME verifies and flips `status` to `reviewed`; you never set `reviewed` yourself.

The app's **flag export** (see `01-build-app.md` → Item flagging) is a second input to this loop: pilot-user flags arrive as a JSON list of `item_id` + `reason` + comment. Triage them alongside new authoring — fix the item, bump `version`, and re-review. A flagged `reviewed` item should drop back to `draft` until the issue is resolved.
