# 02 — Author the question bank

How to write CCTC practice items. Read `00-onboarding.md` first. Every item must conform to `schema/question.schema.json` and be written with `status: "draft"`.

> **Why these rules exist**: [`docs/decisions/adr-030-verifiable-question-references.md`](../../docs/decisions/adr-030-verifiable-question-references.md) (source-first workflow, locator standards, OPTN policies PDF indexing, additive corroboration gates).

## Source-first workflow (required)

**Do not** write a question from memory and attach references afterward.

1. Search the local reference index: `npm run reference:search -- <source_id> "<topic keywords>"`
2. Open the hit: `npm run reference:page -- <source_id> <pdf_page>`
3. Confirm one passage supports a single defensible correct answer.
4. Write the item in original wording from that passage.
5. Set `primary_anchor` to that passage (PDF page + section + `keywords` + `quote_hint`).
6. Add 1–2 corroborating `references` with matching locators (`PDF p. N` is acceptable).

Rebuild the index after adding PDFs: `npm run reference:index`. Validation checks `primary_anchor.keywords` against indexed PDF text when the index is present locally.

## Sourcing hierarchy (where the content comes from)

Author each item by testing a **fact** drawn from, in priority order:

1. **ABTC suggested references (canonical for item `references`)** — every item's learner-facing `references` array must cite sources from the CCTC list in [`docs/reference/ABTC Candidate Handbook.md`](../../docs/reference/ABTC%20Candidate%20Handbook.md) § "Suggested References for the Certification Examination for Clinical Transplant Coordinators":
   1. *Core Curriculum for Transplant Nurses*, 2nd ed. (Cupples et al., 2016)
   2. *Transplantation Nursing Secrets* (Cupples & Ohler, eds., 2003)
   3. *Organ Transplantation*, 2nd ed. (Landes Bioscience, 2003)
   4. *A Clinician's Guide to Donation and Transplantation* (NATCO; Rudow, Ohler & Shafer, eds., 2006)
   5. *Handbook of Kidney Transplantation*, 6th ed. (Danovitch, 2017) — local copy: `docs/reference/danovitch-handbook-kidney-transplantation.pdf`
   6. *Nursing Drug Handbook* (Wolters Kluwer; current annual edition)
   7. *Mosby's Diagnostic and Laboratory Test Reference*, 14th ed. (Pagana et al., 2019)
   8. **OPTN/UNOS** — https://www.hrsa.gov/optn (handbook-suggested; use when the item tests policy or national registry content). Legacy `optn.transplant.hrsa.gov` URLs redirect to a generic landing page — use `hrsa.gov/optn/...` paths and **verify each URL resolves to content that supports the item**.
   9. **HIPAA / HHS** — https://www.hhs.gov (when privacy/regulatory content is tested)

   Pick the **most relevant** handbook entry(ies) for the topic. Most items should have **2–3 references**: at least one textbook locator and, when applicable, OPTN or HHS with a verified `url`.

2. **Maintainer-owned textbook PDFs** (local only) — owned copies live in `docs/reference/` (gitignored; see `.gitignore`). Standard filenames:

   | File | Source |
   |---|---|
   | `cupples-core-curriculum-2e.pdf` | Core Curriculum for Transplant Nurses, 2nd ed. |
   | `transplantation-nursing-secrets.pdf` | Transplantation Nursing Secrets |
   | `organ-transplantation-2e.pdf` | Organ Transplantation, 2nd ed. |
   | `danovitch-handbook-kidney-transplantation.pdf` | Handbook of Kidney Transplantation, 6th ed. |
   | `nursing-drug-handbook-2024.pdf` | Saunders Nursing Drug Handbook 2024 (ABTC lists 2020 ed.) |
   | `mosbys-diagnostic-lab-reference-14e.pdf` | Mosby's Diagnostic and Laboratory Test Reference, 14th ed. |
   | `optn-policies.pdf` | [OPTN Policies bundle (HRSA)](https://www.hrsa.gov/sites/default/files/hrsa/optn/optn_policies.pdf) — fetch: `npm run reference:fetch-optn` |

   Use PDFs to **verify facts** and fill in precise `locator` values (`ch.`, `§`, `pp.`). Never copy or paraphrase their prose into stems, options, or explanations. PDF is preferred over EPUB or markdown for page-accurate locators.

3. **Supplementary public sources** (KDIGO, AST, CDC, FDA labels, etc.) — use in the `notes` field for SME verification when policy or practice may have drifted. Do **not** list these as learner-facing `references` unless they also appear on the ABTC CCTC list above.

4. **Verified general clinical knowledge** — only when categories 1–3 do not cover the fact. Record verification needs in `notes`.

## `primary_anchor` (required on every item)

| Field | PDF anchor | URL anchor (OPTN/HHS) |
|---|---|---|
| `type` | `"pdf"` | `"url"` |
| `source_id` | e.g. `cupples`, `danovitch`, `optn-policies` (see `scripts/reference/sources.json`) | — |
| `pdf_page` | 1-based page in repo PDF | — |
| `url` | — | verified policy URL |
| `section` | chapter/§ heading at the anchor | policy section name |
| `quote_hint` | short phrase from the passage | optional |
| `keywords` | 2–8 terms that appear on that PDF page | 2–8 terms describing the policy fact |

## Reference locator rules

- **Textbooks** — `locator` must give a **findable outline path** (chapter → section → numbered item/table row), the **exact phrase or table entry** when helpful, and **PDF p. N** from the repo copy. Append `(repo file-page index; printed margin may differ)` so learners do not confuse PDF page with the book’s printed page number. Prefer `primary_anchor.pdf_page` as the canonical page.
- **Do not invent section titles** — copy the book’s heading/numbering (e.g. Cupples Ch. 4 uses “Risks associated *to* immunosuppression”, not “with”). If the fact lives under a numbered list item, cite the item (§3.a), not a paraphrased section name.
- **Corroborating references** must also point to the relevant passage — do not cite a chapter/page that does not contain the fact (e.g. do not cite “evaluation overview” for a DonorNet refusal code).
- **OPTN Policies PDF** (`source_id: optn-policies`) — preferred for policy-primary items. Workflow: `reference:search -- optn-policies "Policy 18.3 …"` → `reference:page` → confirm passage → write item. `locator` format: `Policy 18.3 → <subsection or topic>; PDF p. N (repo file-page index; printed margin may differ).` Learner-facing `references[].url` should be the canonical HRSA PDF with a page fragment: `https://www.hrsa.gov/sites/default/files/hrsa/optn/optn_policies.pdf#page=N` where `N` matches the locator’s `PDF p. N`. The **Policy § number** is the findable outline path; PDF viewers open the page, not an in-document § anchor (those are unreliable across viewers).
- **OPTN / HHS (other URLs)** — include a `url` only when it lands on the **specific policy §, document, or page** that states the fact (e.g. a public-comment page quoting Policy 18.3), not the policies index. The `locator` must name the policy number/section **and** what to read there. If you cannot deep-link to that passage, omit the URL and cite the indexed OPTN PDF or a textbook anchor only. Use `primary_anchor.type: "url"` only when the URL passage is the authoring source.
- **Never cite generic landing pages** (`hrsa.gov/optn`, `…/policies-bylaws/policies`) as item references — they do not verify the answer.
- **Newer textbook editions** — cite the edition you verified (e.g. Danovitch 7th ed., 2026); note in `notes` if the handbook lists an older edition

## Copyright rules (hard)

- **Original expression only.** Write every stem, option, and explanation in your own words and structure. Test the underlying fact; do not mirror any source's wording, sentence structure, selection, vignette, or arrangement.
- **Never reproduce** real ABTC exam items, the handbook's sample questions, or anything from brain-dump sites — not even reworded.
- **Facts are free; expression is owned.** "MELD uses specific lab values" is a fact you may test. A textbook's paragraph explaining MELD is protected expression you may not reproduce.
- **Do not commit copyrighted textbook PDFs** to the public repo. Keep them in gitignored `docs/reference/*.pdf` for local agent/SME use only.
- If you cannot write an item without leaning on a source's specific expression, pick a different angle or skip it.

## Clinical accuracy rules

- One **defensible** correct answer per item. Distractors must be plausible but clearly incorrect to a competent coordinator — test competency, not trickery (the handbook is explicit that items measure competence, not tricks).
- **Verify drug regimens, lab ranges, and policy specifics** against a current source — these change. Examples of drift to watch: MELD version/components (MELD 3.0), KAS/kidney allocation changes, immunosuppression protocols, infection prophylaxis. If unsure, mark it clearly in `notes` for the reviewer and keep `status: "draft"`.
- Write at the level of a **minimally competent first-year transplant coordinator** (the handbook's standard), within legally licensed practice — not advanced-practice (NP/PA) scope.

## Item formats

Produce both, roughly matching the exam's feel:

- **`one_best`** — a stem and 4 options (A–D), one best answer. Most items.
- **`complex_combo`** — a stem, numbered `elements` (I, II, III, IV), and 4 combination `options` (e.g. "I and II only") each listing the elements it asserts via `selects`. Set `shuffle: false`. Use these for analysis-level items where the candidate must evaluate multiple statements.

See `questions/_examples/examples.json` for one worked item of each type, including how `explanation.rationale_incorrect` covers every wrong option and how `references` cite ABTC suggested sources with locators.

## Tagging and blueprint mapping

Tag every item to the **2026-07 blueprint** (the legacy blueprint is derived via crosswalk — do not double-tag):

- `domain` (1/2/3) — **required**.
- `task` (e.g. `010500`) — recommended; enables task-level coverage and the legacy crosswalk.
- `knowledge_codes` (e.g. `["010504"]`) — optional; map to the specific outline knowledge/skill statements for fine-grained coverage auditing.
- `cognitive_level` — `recall` / `application` / `analysis`. Aim for roughly **35% / 52% / 13%** across the bank. Do not write only recall items.
- `organ` — about **50% `general`**; distribute the rest per the blueprint `organ_targets` (kidney heaviest, then liver, lung, heart, then small counts for pancreas/intestine/multi).
- `recipient_age` — tag every item `adult`, `pediatric`, or `both`. Aim for **`pediatric` at 5–7% of the bank** (scales with bank size — e.g. ~25–35 of 500 items) so the practice bank reflects the share of pediatric solid-organ recipients in population estimates. The live **CCTC exam** pediatric mix is ~**5%** on a scored form; the bank band allows a modest buffer above exam under-representation so the sampler has enough pediatric-only stems without over-weighting them on every practice session. Use `pediatric` when the vignette or teaching point is specific to children; use `both` when content applies equally to all ages (do **not** count `both` toward the pediatric share). After each batch, check `npm run validate:coverage` — pediatric share should stay in the 5–7% band.

## How to reach ~500 with good coverage

- Work **domain by domain, task by task**, generating items in batches into the matching `questions/<domain>/...` file (≤50 per file; split as needed).
- After each batch, run the coverage check (`03-validate.md`) and fill the under-represented domains/tasks/cognitive levels/organs next.
- Keep a healthy surplus per category so the sampler has variety beyond a single exam's worth.

## Reviewer handoff

For each item, make the SME's job easy: precise `references` with locators from the ABTC suggested list, a `notes` field stating exactly what to verify (e.g. "confirm current MELD 3.0 components against OPTN policy"), and a single clearly-correct answer. The SME verifies and flips `status` to `reviewed`; you never set `reviewed` yourself.

The app's **flag export** (see `01-build-app.md` → Item flagging) is a second input to this loop: pilot-user flags arrive as a JSON list of `item_id` + `reason` + comment. Triage them alongside new authoring — fix the item, bump `version`, and re-review. A flagged `reviewed` item should drop back to `draft` until the issue is resolved.
