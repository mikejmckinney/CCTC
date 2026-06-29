# CCTC Practice Exam — Redesign Implementation Brief

**For:** the implementing agent working in `mikejmckinney/CCTC`
**Goal:** port a validated UX/visual redesign into the existing React + Vite + TypeScript app.
**Status of this doc:** detailed spec — per-change acceptance criteria, data-model deltas, file pointers, and design tokens.

---

## 0. How to use this brief

- **The prototype is the canonical, runnable oracle.** It is a single standalone HTML "Design Component" file (`CCTC Practice.dc.html` + `cctc-data.js` + `support.js`) plus screenshots in `handoff/screens/`. It is **not** React and does **not** use the repo's IndexedDB layer. Open it in a browser and use it as the source of truth for every visual and interaction decision — when this prose and the prototype disagree, **the prototype wins**.
- **Copy values verbatim; re-express structure.** This is the rule that prevents revision churn:
  - **Lift exactly, character-for-character** — all design tokens (§1), the full type scale, every UI **copy string** (button labels, headings, hints, empty-state text, modal body text), spacing, border-radii, and transition durations. Do not paraphrase a label or eyeball a color. When in doubt, read the value out of the prototype source rather than this doc.
  - **Re-express, don't transplant** — the *DOM/component structure* and styling mechanism: rebuild as idiomatic React components styled via `src/app.css` + CSS custom properties. Do **not** paste the prototype's inline-styled markup into JSX.
  - Litmus test: if a human can tell your build apart from the prototype by *value* (wrong hex, wrong px, reworded button), that's a defect. If they can only tell by reading the code, that's fine.
- **Implement in the existing app**, primarily:
  - `src/app/App.tsx` — the single screen/component scaffold (views, session engine, modals).
  - `src/app.css` — design tokens + component styles.
  - `src/types/exam.ts` — data model (extend, see §4).
  - `src/lib/storage.ts`, `src/lib/sessionAssembly.ts`, `src/lib/scoring.ts`, `src/lib/historyTrend.ts`, `src/lib/categoryHistoryTrend.ts` — reuse; minor additions only.
- **Reuse, don't duplicate.** Several "new" prototype features already exist in the codebase. See §4 for what's already there.
- **Keep the product guardrails** (§6). This is an independent study aid; do not regress them.

---

## 0.5 Fidelity & self-verification protocol (read before coding)

The prototype encodes every answer this brief describes. One-shot success comes from **measuring your build against it** and **running your own checks** — not from re-reading prose. Follow this loop; do not rely on the reviewer to catch drift.

### Work in gated stages — do not advance until the current stage matches
1. **Tokens + fonts first.** Port the full §1 token set into `app.css` (both themes) and load the two fonts. Prove it on **one** screen (the dashboard). Verify day **and** night before touching anything else.
2. **One screen at a time.** Port each screen, then immediately compare against the prototype (below) before starting the next. Order: dashboard → setup → session → results → review → progress.
3. **Behaviors last.** Wire the five interaction changes (§4 items 1–4 + start-flow) only after the screens render correctly.

### After every screen, diff against the oracle — don't eyeball from memory
- Open the prototype (`handoff/prototype/CCTC Practice.dc.html`) and your build at the **same viewport width** (do 1280px desktop **and** 390px mobile).
- Screenshot both for the same state and reconcile **every** difference: spacing, font size/weight, color, border-radius, copy text, control states. Treat any visible-by-value difference as a bug to fix now, not later.
- Repeat for **both themes** and for stateful variants (e.g. study-mode answer revealed; exam-mode locked; review correct/incorrect; resume banner present/absent).

### Pull exact values from source, not from prose
- Tokens: the `THEME` object / `:root` block in the prototype is authoritative for every hex.
- Copy strings: grep the prototype for the exact label/hint/heading text and reuse it verbatim.
- If a value isn't in this brief, **read it from the prototype** rather than inventing one.

### Self-check before declaring done
- Run the executable checklist in §7 (each item is written as something you can assert in the DOM or a test).
- Run the app's existing lint/typecheck/test scripts; add the small assertions §7 calls for.
- If any §7 item can't be made to pass, **stop and surface it** with the specific value you got vs. expected — don't silently ship a near-miss.

---

## 1. Design system — "Editorial Institutional"

### Typography
- **Headings, question stems, big score numbers:** `Newsreader` (serif). Weights 400/500/600/700.
- **All UI/body/labels:** `Public Sans`. Weights 400/500/600/700.
- Load via Google Fonts. Eyebrow labels: Public Sans 600, 11px, `letter-spacing:.14em`, uppercase, color `--muted`.
- Scale: page `<h1>` 30px serif; card titles 20–24px serif; stems 19px serif; body 13–14px; eyebrows 11px.

### Color tokens
Define as CSS custom properties on `:root` (day) and `[data-theme="night"]` (night). The prototype sets them on a root element; in the real app prefer `:root` + a `data-theme` attribute on `<html>`/root for the night override.

**Day (default):**
```
--bg:#f4efe6;  --surface:#fffdf9;  --surface2:#faf5ec;
--ink:#221d16; --muted:#6f6557;    --line:#e6dcc9;  --line2:#ddd2bf;
--teal:#123b3a;      /* solid fills (cards, buttons) — always pairs with #fff text */
--teal2:#0d2e2d;     /* hover/darker */
--tealtext:#123b3a;  /* teal used as TEXT/accent on light/translucent bg */
--tealsoft:#dcebe6;  /* badge / chip background */
--gold:#b07a3c;      /* solid accent fill (bars, secondary CTA) */
--goldtext:#946530;  /* gold as text on goldsoft */
--goldsoft:#f0e4cf;
--success:#2f7d5b; --successtext:#2f7d5b; --successsoft:#dcebe0; --expline:#bcdcc8;
--danger:#a8443b;  --dangertext:#a8443b;  --dangersoft:#f3ddd9;
--ring:#e9dec8;      /* donut empty arc */
--letterbg:#f0e8d8;  /* option letter chip, idle */
--switchoff:#d8cdb8; /* toggle off track */
--inputdis:#efe9dd;  /* disabled input bg */
--resumeline:#b9d7ce;/* resume-banner border */
--headerbg:rgba(255,253,249,.86);
--shadow:rgba(34,29,22,.14);
```

**Night (warm charcoal — NOT pure black):**
```
--bg:#17140f;  --surface:#211d16;  --surface2:#2a251c;
--ink:#f1ebdf; --muted:#aa9f8c;    --line:#332d24;  --line2:#443d31;
--teal:#1d544f;      --teal2:#16423e;     --tealtext:#7cc2b4;  --tealsoft:rgba(124,194,180,.16);
--gold:#c79a5a;      --goldtext:#dab06a;  --goldsoft:rgba(202,154,90,.16);
--success:#3f9d72;   --successtext:#73c79e; --successsoft:rgba(79,174,130,.16); --expline:rgba(115,199,158,.28);
--danger:#cf7a70;    --dangertext:#e49b91;  --dangersoft:rgba(207,122,112,.16);
--ring:#3a332a;  --letterbg:#383027;  --switchoff:#443d31;  --inputdis:#262119;
--resumeline:rgba(124,194,180,.4);
--headerbg:rgba(33,29,22,.86);  --shadow:rgba(0,0,0,.45);
```

**Token usage rule that matters:** distinguish **fill** vs **text**.
- Solid teal blocks (dashboard "continue" card, results hero, primary buttons, progress bar) use `--teal` with `#fff` text — these read in both themes.
- Teal used as *text/accent* on a light/translucent surface (nav active, badges, chips, links, "Start →") uses `--tealtext`. Same pattern for `--goldtext` / `--successtext` / `--dangertext`. This is what makes night mode legible — do not collapse them back to one token.

### Shape & spacing
- Cards: `border-radius:16px` (panels) / 14px (list rows) / 18px (hero, modals); `1px solid var(--line)`; background `var(--surface)`.
- Controls: radius 8–11px. Segmented controls: track `var(--surface2)` + 4px padding, active pill `var(--teal)`/#fff.
- Hit targets ≥ 44px. Page max-width 940px, centered, 20–24px gutters.
- Toggles (switches): 46×27 track, 21px knob, `--teal` on / `--switchoff` off.

---

## 2. Information architecture & navigation

- **Sticky header:** brand (teal "C" tile + serif wordmark) · **`Home`** · **`Setup`** · **`Progress`** (each an icon + label — house / gear / bar-chart) · `Resume` (only when an unfinished session exists) · **theme toggle** (☾/☀, far right). On narrow screens (≤560px) the text labels and the brand wordmark collapse to icons only (via a media query — the one place a `<style>` rule is used instead of inline, since media queries can't be inline).
- **Views:** `dashboard` (home), `setup`, `session`, `results`, `review`, `history` (= "Progress"), `flags` (reported-items manager).
- **No Dashboard ⇄ Setup-form toggle.** (An earlier version had a segmented toggle on the home view; it was removed as redundant.) Home **is** the dashboard; **Setup** is its own top-nav destination (the gear). The dashboard's "Customize a session →" and the greeting's "Set your exam date" also route to Setup.
- **Modals (in-app, not native):** disclaimer (first run), start prompt (resume/new/cancel), submit/finish confirm, report/edit-flag, destructive confirm (delete/clear).

---

## 3. Screen specs & acceptance criteria

### 3.1 Dashboard (home)
**Purpose:** at-a-glance readiness + fast entry.
**Layout order:** (1) a **slim full-width Resume banner** — only when an unfinished session exists (compact teal strip: "Resume your session · Item X of N…" + Resume button; *not* a tall card — the earlier full-height resume card wasted vertical space on desktop); (2) a two-column grid: **left = Readiness + Focus areas combined card**, **right = Quick start card** (so both columns carry real content and balance in height); (3) **Recent sessions**. The dashboard subheader carries the bank/exam meta ("506 items · 175-item exam, 180 min").
Contents: combined readiness/focus card — **the readiness section includes a synthesized "Am I ready?" insight**: a status badge (Not measured / Below target / Nearly ready / On track), a plain-language verdict line, and a one-tap **recommended next action** button (see §4.0 + §3.8); each focus row carries a small **"N% of exam" weight chip**; **Quick start** card = **Full mock** / **Quick exam** (25 q · 30 min · exam) / **Weak areas**, plus **recent custom-setup tile** (§4) + "Customize a session →"; **Recent sessions** card (replaces the old score-trend box — see §3.7). The greeting shows a live **exam-date countdown** ("N days to your exam" / "Set your exam date" when unset — links into setup → Exam preferences).
Acceptance:
- Readiness, focus bars, and recent sessions are derived from `HistoryEntry[]` — no new persistence. **Use the exact definitions in §4.0 — do not improvise the math.**
- Donut and bars recolor by performance (≥75% teal, ≥65% gold, else danger).
- Resume appears only with an unfinished session, as a **slim banner** (not a full-height card), and deep-links into it.
- **Quick exam** preset = exam mode, 25 questions, 30-min timer (distinct from Full mock; replaces the old "Quick 10" which overlapped Weak areas).
- The raw last-8 **score-trend bar chart still lives on the Progress page** (§3.6) — it's only *removed from the dashboard*, replaced there by Recent sessions.

### 3.2 Setup ("Build a session")
Contents: resume banner (if active); **Quick start** presets + recent custom tile; **Customize** form: Mode (Exam/Study segmented) · **Question set** (Standard bank / Scenario companions segmented) · Focus (All + per-domain chips, multi-select) · Question count (number, clamped to available) · Time limit · Timed toggle · Show-timer toggle · **Advanced** disclosure (Blueprint version select, Include-draft-items toggle) · Start button (label reflects mode + count).
Acceptance:
- All controls map to existing `SessionSettings` fields (see §4) — `questionSet`, `blueprintId`, `includeDrafts` already exist; wire, don't re-invent.
- "Available for this focus" count updates live with question-set + domain filters.
- Starting from this form records `lastCustomSettings` (§4) and triggers the start-flow prompt if a session is in progress.

### 3.3 Session
Contents: header (Exit · "Item X of N" · bookmark · overflow ⋯ menu); progress bar; category + type badges; timer pill (when timed & shown); stem (serif) + optional element list; option buttons (A–D); **study mode reveals the explanation inline immediately** (correct rationale + per-distractor rationale + cited references); nav (Previous/Next) + **Map** (question grid: answered/bookmarked/current) + Submit/Finish.
Overflow menu: "Hide/Show timer", "Report an issue".
Acceptance:
- Exam mode: selection only; explanations gated until submit. Study mode: select reveals correctness + explanation.
- Bookmark maps to existing `ActiveSession.flaggedForReview`.
- Keyboard nav (←/→, A–D) preserved (already in `App.tsx`).
- Timer counts down, autosaves, auto-submits at 0 (existing behavior — keep).

### 3.4 Results
Solid-teal hero: mode, big % (serif), correct/total, time used, **unofficial pass-estimate badge vs target**. By-domain breakdown bars. Actions: Review answers / Retake (same settings) / Home.

### 3.5 Review
Per-item: category + verdict badge (Correct/Incorrect/Skipped); stem; options recolored (correct=green, your-wrong=red, with "Correct answer"/"Your answer" notes); full explanation + references. **Question map** ("Jump to item") with chips colored **correct/incorrect**, current outlined. Prev/Next. Reachable from Results and from a Progress history row.

### 3.6 Progress (history)
Trend summary (Average / Best / Latest delta) + last-8 bar chart; per-domain averages; session list. **Each session row shows: overall score (N/N · %), the full date *and time* it was taken, mode, on/below target, the blueprint version used (e.g. "2026-07 outline" / "Legacy (thru 2026-06)"), and a per-domain `N/N` correct breakdown** (one chip per domain). **The whole row is clickable → opens that session's Review; an explicit "Review →" button is also present.** Delete per row (must `stopPropagation` so it doesn't trigger the row's review navigation). **Deleting a row, clearing all history, and clearing flags each require an in-app confirmation modal (destructive red CTA) — never a silent action or `window.confirm`.** **Reviewability requires item-level data** (`HistoryEntry.items` + `answers`): real completed sessions always have it; in the prototype the seeded sample sessions are generated *with* items so they're reviewable too. Reported-items (flags) summary with Clear. Clear-history control.

### 3.7 Recent sessions (dashboard card)
Replaces the dashboard score-trend box. A compact table of the **5 most recent sessions** with columns **Date · Mode · Questions · Score · Result · Duration**, plus a **"View all history →"** link (top-right) to Progress. **Each row is clickable → opens that session's Review** (back button returns to home). Score is colored pass/below; Mode and Result are pill badges (exam=teal, study=gold; Pass=green, Below=red). **Duration** shows real elapsed minutes for timed sessions and **"Untimed"** otherwise (the model doesn't track wall-clock for untimed sessions — don't fabricate a number). Empty state when no sessions exist.

### 3.8 "Am I ready?" readiness insight + recommended action (dashboard)
Lives inside the combined readiness card, between the donut row and the focus-area bars. Three parts:
- **Status badge** beside "Practice readiness": `Not measured` (neutral) / `Below target` (danger) / `Nearly ready` (gold) / `On track` (success).
- **Verdict line** — one honest, constructive sentence synthesizing readiness EMA vs `targetThreshold`, the weakest domain, and (if set) days-to-exam. Tone: clinical-honest with a constructive push (e.g. *"At 64%, you're 6 points below your 70% target. Start with Post-op (50%), your weakest area. 9 days to go."*). Not falsely cheerful, not discouraging.
- **Recommended next action** button (one tap):
  - No exam history → *Take a quick exam* (gauge readiness).
  - Below target / nearly ready with a weak domain → *Practice {weakest} · 10 questions* → launches a focused **Study** set on that domain with `prioritizeIncorrect` (resurfaces prior misses).
  - On track, all domains at/above target → *Take a full mock exam*.
This is the payoff card for the analytics — it turns the numbers into a decision. Keep it derived (no new persistence) and reuse the existing session builders.

---

## 4. Data-model deltas & reuse

### 4.0 Analytics definitions (authoritative — match exactly)

These are deliberate product decisions; the metrics intentionally use **different windows**. Implement as written.

- **Readiness score** = **exponential moving average (EMA)** of the **exam-mode** sessions' overall percentages, in date order (oldest→newest), rounded. Smoothing factor **α = 0.3** by default (recent sessions weigh more; ~last 6 carry roughly half the weight). Study sessions are **excluded** (study reveals answers as you go, so it doesn't estimate real-exam performance). `null`/`—` with no exam sessions. *Expose α as config (prototype prop `readinessAlpha`, range 0.1–0.6); 0.3 is the chosen default.*
- **Readiness delta** = EMA(all exam %) − EMA(all-but-last exam %); needs ≥2 exam sessions, else hidden. (Compares the readiness number against what it was before the latest session — not raw session-to-session.)
- **Score trend** chart = the **last-8 exam** sessions, in date order, shown as **raw per-session bars** (not smoothed — users still see actual history); a bar is gold when below `targetThreshold`, teal otherwise.
- **Focus areas** (per-domain bars, in the combined readiness card) = **pooled accuracy across ALL history (exam + study)**: `Σ correct ÷ Σ total` for that domain over every entry's `breakdown`. This is *not* an average of session percentages, and intentionally a different window than readiness (all-time mastery by topic vs. recent exam readiness). Bars recolor ≥75 teal / ≥65 gold / else danger; unattempted → `—`. **Each row also shows a small "N% of exam" chip** = that domain's official blueprint weight (D1 31% / D2 30% / D3 39% for `cctc-from-2026-07`), so a learner sees mastery and exam-importance together. Source weights from the real blueprint (`blueprints/*.json`); in the prototype they're on each `DOMAIN` as `weightPct` (+ a `BLUEPRINT` object for the bank/exam meta in the subheader). *(There is no separate "Blueprint coverage" card — an earlier version had one, but it duplicated the focus-area accuracy bars on a slightly different window; it was removed and its one unique signal, the exam weight, folded into focus areas.)*
- **Weak areas** (Quick-start preset) = **recency-windowed pooled accuracy below `targetThreshold`**, weakest-first. Pool `Σcorrect/Σtotal` per domain over only the **most recent N sessions** (default **N = 6**, exam + study) — *not* an EMA (a per-domain EMA on a thin, irregular series is noisy and hard to explain; a recent window gives the same "recent counts more" benefit, stably). The preset launches a **Study** session focused on *all* below-target domains. If none are below target, fall back to all domains with an "on target" label. Unattempted domains (null in window) are not "weak". *Expose N as config (prototype prop `weakWindowSessions`, range 3–12).*
  - **Spaced-repetition ordering:** the Weak-areas session **front-loads items the user has previously answered incorrectly** (most-recent miss first), then fills with the rest of the weak-domain pool (shuffled). Driven by a `prioritizeIncorrect` flag on the built session; "previously incorrect" is derived by scanning `HistoryEntry.items` + `answers` for `answer !== correct`. This is **spaced-repetition-lite** — it resurfaces misses but does *not* implement true interval scheduling (SM-2/Leitner boxes with per-item due dates). **If product wants real spaced repetition, that's a separate data-model addition** (persist per-item ease/interval/next-due) layered on top of this ordering — out of scope for this redesign unless explicitly requested.
- Note in copy that readiness/trend are *exam* metrics and recency-weighted (the prototype labels the donut "Weighted recent exam average"). Keep wording that signals the split + the weighting.
- **Readiness insight verdict** (§3.8) — branch on: (no exam history → "Not measured"); (readiness ≥ target AND no domain below target → "On track"); (readiness ≥ target BUT a weak domain exists → "Nearly ready"); (readiness < target → "Below target", report the point gap). Append the days-to-exam phrase when `examDate` is set (future only). Recommended action follows the branch: quick exam / full mock / focused 10-item Study set (`prioritizeIncorrect`) on the weakest domain.

**Already in `src/types/exam.ts` / `SessionSettings` — REUSE, do not duplicate:**
`mode`, `questionSet` ('standard' | 'scenario'), `blueprintId`, `includeDrafts`, `targetThreshold`, `timed`, `timeMinutes`, `showTimer`, `questionCount`; `ActiveSession.flaggedForReview` (= bookmarks), `HistoryEntry`, `ItemFlag` (= report-an-issue), `SessionResultBreakdown` (= domain/category breakdown).

**Already in `App.tsx` — REUSE:**
- The **resume/replace prompt** exists today (`sessionReplacePromptOpen` / `pendingSessionSettings`). Keep it; ensure it fires for **every** new-session entry point (presets, recent tile, custom start). Add a **Cancel** path if missing.
- Per-category trend drill-down (`categoryHistoryTrend.ts`) — surface it in Progress.

**NEW — to add:**
1. **Theme** `'day' | 'night'`. Persist (extend `AppMeta` in `exam.ts` + `storage.ts saveMeta`, or a small `uiPrefs` record). **Default:** on first run read `window.matchMedia('(prefers-color-scheme: dark)')`; thereafter use the stored value. Apply via `data-theme` on the root; toggle in header.
2. **`lastCustomSettings?: SessionSettings`** — persisted. Written **only** when a session is launched from the Customize form (not from presets). Surfaced as the dashboard/setup "Your last custom setup" tile (one-line summary; tap to relaunch through the start-flow).
3. **Submit/Finish confirmation** — replace the current `window.confirm` with an **in-app modal** for **both** Exam *and* Study (today Study finishes with no confirm). Show the unanswered-item count.
4. **Question map in Review** — today the map exists only in-session; add it to Review with correct/incorrect coloring.
5. **Dashboard** view — new; pure derivation from `HistoryEntry[]` (readiness avg, deltas, per-domain, trend). No new storage.
6. **Exam date** `examDate?: string` (ISO `YYYY-MM-DD`) — persisted prefs (like theme). Set via an **Exam date** picker under the setup form's **"Exam preferences & advanced"** disclosure. Drives the greeting countdown and the readiness insight's pacing phrase. Handle unset / today / past gracefully.
7. **Readiness insight + recommended action** — derived, no new storage (see §3.8 + §4.0). The recommended action reuses the preset/weak-domain session builders; the focused-domain variant launches a 10-item Study set with `prioritizeIncorrect`.
8. **Target threshold UI** — the pass goal already exists as `SessionSettings.targetThreshold` but had **no user-facing control**; add a **Target score** slider (50–90%, default 70) in the setup "Exam preferences & advanced" disclosure, persisted as a preference. `target()` reads the persisted value first, then the prop/default. It sets the pass/below line everywhere (results badge, readiness insight, weak-areas selection, trend-bar colors).

**Flags (restored full management):** keep the lightweight in-context capture — a **"Report an issue"** item in the session/review overflow menu — but the standalone management surface is **restored** as a dedicated **Flags view** (reached from a "Manage flags →" link on the Progress reported-items summary; not a top-level nav item). The Flags view lists every `ItemFlag` (reason badge, item id, domain, captured stem snippet, comment, date) and supports **edit** (reopens the report modal in edit mode → updates that flag), **delete single** (with destructive confirm), **clear all** (confirm), and **export JSON** (downloads a `{schema, version, exportedAt, blueprint, flags[]}` payload). This matches the original app's view/edit/clear/export capability while keeping reporting in-context. Reuse the existing `ItemFlag` model + export contract.

---

## 5. Accessibility & responsive
- Maintain existing focus-visible outlines, skip-link, `role=radiogroup`/`radio` on options, keyboard nav, and `prefers-reduced-motion` handling in `app.css`.
- Hit targets ≥44px. Verify **AA contrast in both themes** (the text-vs-fill token split in §1 is designed for this).
- Single-column below ~640px; the action bar may stick to the bottom on phones (current app already does this — keep).

---

## 6. Out of scope / guardrails (do not regress)
- **Do not reproduce real ABTC/PSI exam items.** Keep the disclaimer gate.
- **No backend, no runtime model calls.** Questions stay static, reviewed JSON; persistence stays client-side (IndexedDB via `storage.ts`).
- **Raw scoring only**; all pass/readiness labels are *unofficial estimates* against the user's target.
- **Do not ship the prototype's seeded sample history** — it exists only to make the mock's dashboard/Progress look populated. Production starts empty (with the existing empty states).
- **Preserve existing user data (back-compat).** Current users have sessions/flags/prefs in the app's IndexedDB store. The redesign **reuses the existing `HistoryEntry` / `ItemFlag` / settings schema**, so keep the same store name, keys, and shapes — existing records must remain visible and reviewable after the update. The only additive fields are persisted prefs (`theme`, `lastCustomSettings`, `examDate`, `targetThreshold`); read them with safe fallbacks so older records lacking them don't break. If you must bump a store version, write a forward migration — never drop the existing object store. (The standalone prototype uses `localStorage`; that's a prototype detail — the real app stays on its IndexedDB layer.)
- Don't lift the prototype's inline-styled markup; use `app.css` + tokens.

---

## 7. Executable acceptance checklist

Each item is written as a check you can run yourself (DOM assertion, test, or measured comparison). Don't mark done until it passes — these are the exact spots that drifted in prior attempts.

**Theme**
- [ ] Toggling the header control flips `document.documentElement` (or root) `data-theme` between unset/`"night"`; the persisted value survives a reload.
- [ ] On a first run with no stored theme, the initial theme equals `window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day'`.
- [ ] Contrast: night `--ink` (`#f1ebdf`) on `--surface` (`#211d16`) ≥ 4.5:1, and day `--ink` on `--surface` ≥ 4.5:1 — assert with a contrast helper in a unit test.
- [ ] Every token in §1 exists in both theme blocks; the four *text* tokens (`--tealtext/--goldtext/--successtext/--dangertext`) resolve to **different** values than their fill counterparts in night mode.

**IA / home**
- [ ] Default landing view is the dashboard; top-nav has **Home / Setup / Progress** (icon+label, collapsing to icons ≤560px) — **no** Dashboard/Setup-form segmented toggle. Setup is reached via the gear nav item.
- [ ] Dashboard readiness % uses the **EMA (α=0.3) of exam-mode** sessions (see §4.0); with 0 exam sessions it renders the empty/`—` state (no crash).

**Recent custom setup**
- [ ] Tile is absent until a session is launched **from the Customize form**; launching a *preset* does not create/update it.
- [ ] Tile summary string matches the launched settings; clicking it reopens the start-flow with those exact `SessionSettings`.

**Start flow**
- [ ] With an unfinished session, **each** of {preset, recent tile, custom Start} opens the resume/new/cancel modal. "Resume current" enters the existing session; "Start new" discards it and builds the pending one; "Cancel" leaves state untouched.
- [ ] With no unfinished session, the same entry points start immediately (no modal).

**Submit / finish**
- [ ] Both Exam ("Submit") and Study ("Finish") open an in-app modal (not `window.confirm`).
- [ ] With N unanswered items the modal body contains the literal count N; confirming scores and routes to results; cancelling returns to the same item.

**Review map**
- [ ] Review exposes a question map; each chip is colored correct vs. incorrect from the scored answers, the current item is outlined, and clicking a chip navigates to that item.

**Question set**
- [ ] Switching Standard ⇄ Scenario changes the candidate pool and the "available for this focus" count updates live; count input clamps to available.

**Analytics (per §4.0)**
- [ ] Readiness % equals the **EMA (α=0.3) of exam-mode** session percentages in date order; adding a study session does not change it. With no exam sessions it renders `—`. (Changing `readinessAlpha` shifts how fast it tracks recent sessions.)
- [ ] Readiness delta = EMA(all exam) − EMA(all-but-last exam); hidden with <2 exam sessions.
- [ ] Score-trend bars are the **raw** last-8 exam percentages (not smoothed), gold below target / teal at-or-above.
- [ ] Focus-area bars equal all-time pooled `Σcorrect/Σtotal` per domain across exam **and** study; they do not reconcile to readiness (different window — expected).
- [ ] "Weak areas" preset = domains whose **recency-windowed** (last N=6 sessions) pooled accuracy is below `targetThreshold`, weakest-first, launching a Study session on all of them; "on target" fallback when none qualify. Not an EMA.
- [ ] Focus-area rows show a small **"N% of exam" weight chip** (31/30/39 for `cctc-from-2026-07`) from the blueprint; bank/exam meta appears in the dashboard subheader. **No separate Blueprint-coverage card** (removed as redundant).

**Destructive-action confirms**
- [ ] Clearing all history, deleting a single session, and clearing flags each open an **in-app confirm modal** (red CTA) first; Cancel preserves data, confirm performs the action. No `window.confirm`.

**Settings & flags**
- [ ] **Target score** slider (50–90, default 70) in setup "Exam preferences & advanced" persists and drives the pass/below line everywhere (results badge, readiness insight, weak-areas, trend-bar colors).
- [ ] **Flags management view** (from Progress "Manage flags →") lists flags and supports edit (reopens report modal as "Edit flag" / "Save changes"), delete-single (confirm), clear-all (confirm), and **export JSON** (downloads a `{schema, version, flags[]}` file).
- [ ] Existing stored records remain visible/reviewable after update (no schema/store regression; additive prefs read with fallbacks).

**Dashboard layout & new cards**
- [ ] Readiness and Focus areas render in **one combined card** (donut + delta, divider, focus bars); the old separate focus/trend two-up grid is gone.
- [ ] **Exam date**: setting under setup → "Exam preferences & advanced" persists (ISO date); greeting shows "N days to your exam" (and "today"/"passed"/"Set your exam date" edge states); unset greeting links into setup → "Exam preferences & advanced".
- [ ] **Readiness insight**: card shows a status badge + verdict sentence that changes with readiness vs target, weakest domain, and days-left; the **recommended-action button** launches the matching session (focused Study set on the weakest domain with prior misses front-loaded / quick exam / full mock).
- [ ] Quick start shows **Full mock / Quick exam / Weak areas** (no "Quick 10"); Quick exam launches exam mode, 25 questions, 30-min timer.
- [ ] **Recent sessions** card lists the latest 5 (Date/Mode/Questions/Score/Result/Duration) with a "View all history" link; untimed rows show "Untimed", not a fabricated minute count; empty state when no history.
- [ ] Weak-areas session **front-loads previously-missed items** (verify: miss an item, relaunch Weak areas, that item appears early); on a profile with no prior misses it's a normal shuffled weak-domain session.

**Progress rows (§3.6)**
- [ ] Each history row shows full date **and time**, blueprint version label, and a per-domain `N/N` correct breakdown (one chip per domain).
- [ ] **Clicking anywhere on a Progress row opens that session's Review** (plus an explicit "Review →" button); the Delete button does **not** trigger review (stopPropagation).
- [ ] **Clicking a Recent-sessions row opens that session's Review** (back returns to home).
- [ ] Any session with item-level data is reviewable; seeded sample sessions in the prototype include items so they review correctly.

**Robustness**
- [ ] With an empty/failed question bank, starting any session does **not** crash (no "reading 'q'"): it stays on setup and shows a load-failure notice. (Prototype-only failure mode; the React app should likewise guard against a zero-length pool.)

**No regressions (assert via existing tests where present)**
- [ ] Timer autosaves and auto-submits at 0; resume restores exact position; keyboard nav (←/→, A–D) works; per-category trend still renders; `ItemFlag` JSON export unchanged.

**Persistence**
- [ ] Only `theme` and `lastCustomSettings` are added to storage; dashboard/progress metrics derive from existing `HistoryEntry[]` with no new persisted aggregates.
- [ ] No seeded/sample history ships — a fresh profile shows the real empty states (§6).

---

## 8. Reference assets
- **Prototype (interactive):** `CCTC Practice.dc.html` (+ `cctc-data.js`, `support.js`) — open it to click through every flow.
  - **Running it locally:** serve the folder over HTTP — browsers block loading the data file over `file://`, so double-clicking the HTML shows a "Question bank didn't load" notice. From the folder run `python3 -m http.server` and open `http://localhost:8000/CCTC%20Practice.dc.html` (or use any static server / the Live Server editor extension). The data file ships as a classic script that sets `window.CCTC_DATA`, which is why a server (not `file://`) is required. *(This constraint is specific to the standalone prototype; the real Vite app loads data through its normal bundler and is unaffected.)*
- **Screenshots:** `handoff/screens/desktop/` and `handoff/screens/mobile/` (current build, full-page) — `01-dashboard`, `02-setup`, `03-session(-exam)`, `04-session-study-reveal`, `05-results`, `06-review`, `07-progress`, `08-flags`.
- Prototype uses 24 standard + 24 scenario real reviewed items pulled from the repo; production should load the full bank via the existing `questionBank.ts` loader.
