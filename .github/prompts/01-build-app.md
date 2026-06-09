# 01 — Build the web app

Build the CCTC practice-exam web app per this spec. Read `00-onboarding.md` first.

## Recommended stack (overridable with rationale)

- **React + TypeScript + Vite** — component model fits an exam engine; static build deploys to GitHub Pages.
- **Tailwind CSS** — fast, consistent responsive design.
- **IndexedDB via `idb`** (thin wrapper) — durable client-side storage for sessions, history, and the loaded bank. Do **not** use `localStorage` for exam state (size and durability limits).
- **No backend, no router server** — hash-based routing is fine for static hosting.

If you prefer another stack, it must still be: static-hostable, offline-capable after first load, client-side-only, and dependency-light. State your choice and why before building.

## Data loading

- Load all `questions/**/*.json` (arrays of items), **excluding** any path segment beginning with `_` (e.g. `_examples/`).
- Validate every item against `schema/question.schema.json` at build time (preferred) or load time. Invalid items must fail the build, not silently drop (see `03-validate.md`).
- Load both blueprint configs from `blueprints/`.

## Settings (start screen)

The user configures, before starting:

1. **Blueprint version** — `2026-07` (default) or `until 2026-06`. Drives sampling and the score-report categories.
2. **Number of questions** — default to the blueprint's `default_exam_items` (175). Allow any value from a small minimum (e.g. 10) up to the number of available items for that blueprint. If the bank can't fill the request under the weighting, fill as close as possible and tell the user.
3. **Timed exam** — toggle on/off. When on, default to the blueprint's `default_time_minutes` (180), **user-editable**. Per the handbook the on-screen timer can be hidden; offer a show/hide timer control.
4. **Mode** — Study (flashcard) or Exam (see below).
5. **Include draft items?** — default off in Exam mode (reviewed items only); may default on in Study mode but always visibly flag drafts.

## Sampling (how an exam is assembled)

When the user starts a session:

1. Filter the bank to the chosen blueprint and (per setting) reviewed-only.
2. Draw the requested number of items to **honor the blueprint's domain/section weighting** (`items` per domain/section, within `domain_tolerance_items`). Use `cognitive_level_targets` and `organ_targets` as **soft** targets — approximate them, don't fail if the bank can't hit them exactly.
3. For the legacy blueprint, bucket each item to a section via `crosswalk_from_new_task` (or its `legacy_section` override) and sample to the **section** totals (73/77); subsection drift is acceptable.
4. **De-prioritize recently-seen items**: prefer items the user hasn't seen in their last few sessions, to reduce memorization. Fall back to seen items only when needed to fill the count.
5. **Freeze the assembled session**: the ordered list of item ids, plus the per-item answer-option order (see randomization), is written to storage at creation time. The session is now immutable in structure.

## Randomization

- **Question order**: shuffle the sampled set (after weighting), then freeze.
- **Answer order**: for each item, shuffle `options` **unless** `shuffle` is `false` (e.g. "all of the above", ordered ranges, or `complex_combo` where element identity is fixed). Persist the resulting option order in the session so resume replays it exactly. Track the correct option by its id, not its position.
- Never re-randomize on resume.

## Exam modes

**Study / flashcard mode**
- Immediately after the user selects an answer (or hits Submit on the item), reveal: correct answer, full `explanation` (why correct is right + why each other option is wrong), and `references` (render `url` as a clickable link when present; otherwise show the citation + locator text).
- Allow free navigation back and forth; track per-item correctness for the end summary.

**Exam mode**
- Mirror the real engine: one item at a time, forward/back navigation, ability to leave an item unanswered and return, and a **bookmark/flag for review**. Show count answered vs. remaining.
- Do **not** reveal correctness until the user clicks **Submit Exam** (with a confirm step, and a warning if items are unanswered). There is no penalty for guessing.
- On submit, score and show the report.

## Persistence and resume (required)

- **Save after every answer and every navigation**, plus timer state. A crash or closed tab must lose at most the current in-flight interaction.
- On launch, if an unfinished session exists: take the user to the main menu and offer **Resume current session** (preferred) or start a new one. Resuming restores exact question order, option order, answers so far, bookmarks, and remaining time.
- Only one active session at a time; starting a new exam while one is unfinished prompts to resume or discard.

## Scoring and history

- **Score report** modeled on the real one: overall pass/fail-style result plus a **raw breakdown by content category** (domains for 2026-07; sections for legacy). Show items correct / total per category.
- **Scaled scores / official cut score are NOT something this app can compute** — the real exam uses statistically derived scaled scores and an Angoff-based cut score that ABTC does not publish. Show raw percentages and clearly label any pass indicator as an **unofficial practice estimate**, not an ABTC result. Let the user set their own target threshold (e.g. they may aim for ~70%+); do not invent ABTC's cut score.
- **History**: persist every completed session (date, blueprint, mode, item count, time used, overall score, per-category breakdown). Provide a history view with trend over time and the ability to review a past session's items and explanations. Allow deleting history and a full reset.

## Item flagging (review feedback)

The pilot user also acts as the subject-matter reviewer, so the app must capture in-context feedback that feeds the `draft → reviewed` workflow (see `02-author-questions.md` and `questions/README.md`).

- Show a **Flag this item** control wherever an item is visible: during Study mode, in Exam-mode review, and when reviewing a past session. It must not reveal the answer in Exam mode before submission (flagging an unanswered item is allowed; it just records the flag).
- On flag, capture a short structured record in IndexedDB:
  - `item_id`, item `version`, the item's `status` at flag time
  - `reason` — a required short pick-list (`factual error`, `outdated policy/guideline`, `ambiguous / >1 defensible answer`, `typo / wording`, `broken or wrong reference link`, `other`) plus an optional free-text comment
  - `session_id`, `blueprint`, `mode`, and timestamp
- Store flags in their own object store (not on the question JSON — the bank stays the source of truth and is never mutated by the app).
- Provide a **Flags** view that lists open flags grouped by item, lets the user edit/clear a flag, and **exports all flags as a single JSON file** the maintainer can hand off for review. Keep the export shape stable and documented so it can later seed an issue list or a review queue.
- This is feedback capture only: the app never edits question files. Resolving a flag happens in the repo (edit the item, bump `version`, re-review), and the next bank refresh clears stale flags whose `item_id`+`version` no longer match.

## Responsive and accessible

- Work well on phone, tablet, and laptop: legible stems on small screens, large tap targets, no horizontal scroll, timer and navigation reachable one-handed on mobile.
- Keyboard support (A–D / arrow keys / Enter), visible focus states, adequate contrast, ARIA labels on controls.

## Disclaimer

Display once (e.g. first run + footer): CCTC is an independent study aid, **not affiliated with or endorsed by ABTC or PSI**, and does not reproduce real exam questions. Practice results are estimates and not official scores.

## Non-goals (v1)

- No accounts, login, or cross-device sync.
- No backend or runtime model calls.
- No simulation of the real exam's scaled scoring or official pass/fail.

## Future (v2)

Planned enhancements (cross-device sync, deep-linked PDF references with optional public “Further review” links, runtime-generated items, organ-balance bank shards) are documented in [`.context/vision/v2-roadmap.md`](../../.context/vision/v2-roadmap.md). Do not implement v2 features in v1 PRs unless explicitly scoped.

## Acceptance criteria

- Static build runs offline after first load; responsive across device sizes.
- Both blueprints selectable; sampling honors domain/section weighting within tolerance.
- Both item formats render and score correctly, including option shuffle with frozen order.
- Save-after-each-question and accurate resume verified by closing/reopening mid-exam.
- Score report shows per-category raw breakdown; history persists and is reviewable.
- Items can be flagged with a reason in every view; flags persist separately from the bank and export as JSON.
- Schema-invalid question files fail the build.
