# CCTC Practice Exam — v2 Roadmap (future)

> **Purpose**: Capture intentional **v2** product features that are out of scope for the v1 static, client-side app on `main`.
>
> **v1 constraints** (unchanged): no accounts, no backend, no runtime LLM calls, static JSON bank. See [`.github/prompts/01-build-app.md`](../../.github/prompts/01-build-app.md) § Non-goals (v1).

---

## 1. Cross-device progression (sync)

**Goal:** A learner can start a practice session on one device (phone, laptop, tablet) and continue the same in-progress session on another.

**Why v2:** v1 stores all session state in **IndexedDB on the device** only. There is no account layer or server to merge state across browsers.

**Likely building blocks (TBD):**

- Authenticated user identity (even lightweight magic-link or OAuth).
- Encrypted sync of active session, history, flags, and settings to a backend or user-owned storage (e.g. cloud KV / document store).
- Conflict rules when two devices touch the same session (last-write-wins vs. explicit merge).
- Offline-first queue: changes sync when connectivity returns.

**Non-goals for a first sync slice:** cross-user leaderboards, social features, or sharing exam results publicly.

---

## 2. Deep-linked references (and optional “Further review”)

**Goal:** Each citation in an item explanation should open the **exact reference point** the item was authored from — ideally the PDF page/section already encoded in `primary_anchor` and `references[].locator`.

### Example (v1 text today — v2 should be clickable)

Item **`cctc-2016`** (kidney preoperative urine baseline) currently shows:

> Core Curriculum for Transplant Nurses, 2nd ed. (Cupples et al., 2016).  
> Ch. 1 → kidney transplantation preoperative evaluation → specific urine tests; PDF p. 46 (repo file-page index; printed margin may differ).

**v2 behavior:**

- Tap/click opens a **reference viewer** at PDF page 46 (repo-indexed), with the section heading visible in context.
- Default UX: show **source page ± 1 page** (three-page window) so the learner sees surrounding context without dumping the whole textbook.
- Reuse existing local index metadata (`npm run reference:*`, `questions/.verification/` stubs) where possible; do not reproduce full copyrighted text in the app shell.

### Copyright / licensing posture

Owned textbook PDFs live under `docs/reference/` for **authoring verification only**. Shipping page images to every learner may require licensing review.

**Mitigation — “Further review” (alternate web layer):**

- Parallel optional links to **public, authoritative** sources that cover the same teaching point (journals, OPTN/UNOS, CMS, professional societies, registry guidance).
- For `cctc-2016`, an example public supplement (not a 1:1 page replacement, but similar clinical content):

  https://www.kidneyregistry.com/for-centers/member-center-guidelines/

- Label clearly: **“Further review (public web)”** vs **“Primary source (textbook PDF)”** so learners know provenance.
- Validator should still require `primary_anchor` for bank integrity; web links are additive UX, not a substitute for SME verification.

---

## 3. Runtime-generated items (anti-memorization)

**Goal:** Reduce memorization of fixed stems/options by generating **novel** questions and answer sets at session time, while staying within blueprint domains/tasks and grounded facts.

**Why v2:** v1 loads a **static, finite** bank (~506 reviewed items). Heavy repeat users will eventually recognize items.

**Design constraints:**

- Generation must remain **offline-capable or clearly labeled online-only** — a product decision for v2.1 vs v2.2.
- If LLMs are used, they run in a **controlled pipeline** (server-side or approved client runtime), never as an unreviewed live tutor during Exam mode.
- Output still needs schema validation, citation hooks, and a `draft` → `reviewed` promotion path (or a stricter auto-verify gate).
- Exam mode should prefer **reviewed** content; any generated draft must be visibly labeled.

**Relation to v1:** v1 explicitly excludes runtime model calls ([`00-onboarding.md`](../../.github/prompts/00-onboarding.md) guardrails).

---

## 4. Organ-balance shards (bank content)

**Goal:** Close soft `organ` mix gaps flagged by `npm run validate:coverage` so practice sessions better approximate blueprint `organ_targets` (kidney, liver, lung, etc.).

**What this is:** Additional question batches under `questions/domain-*` — same authoring workflow as v1 batches — targeted at under-represented `organ` tags (e.g. more liver or kidney_pancreas items, fewer surplus pancreas/intestine items if over target).

**What this is not:** A code feature. Domain/task coverage is already met; this is **content growth** optional for sampling realism.

**ABTC / blueprint note:** The 2026-07 outline emphasizes **domain** weights; per-organ counts in `blueprints/cctc-from-2026-07.json` are **soft targets** carried from the prior outline (~50% `general` per handbook). See `organ_targets` and `_organ_note` in that file.

---

## Sequencing (draft)

| Priority | Feature | Depends on |
|----------|---------|------------|
| 1 | Organ-balance shards | Content authoring only (no new runtime) |
| 2 | Deep-linked references + Further review | Reference viewer UX; licensing review for PDF pages |
| 3 | Cross-device sync | Backend + auth |
| 4 | Runtime-generated items | Sync optional; strong validation + SME workflow |

---

## Related

- [../roadmap.md](../roadmap.md) — v1 phase tracker (Phases 1–4)
- [README.md](README.md) — vision index
- [../../docs/FAQ.md](../../docs/FAQ.md) — learner-facing FAQ
