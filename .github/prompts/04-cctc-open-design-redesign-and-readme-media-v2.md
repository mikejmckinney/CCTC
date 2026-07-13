---
description: Prototype a CCTC redesign with Open Design and create README demo media with HyperFrames/GitHub-hosted video assets.
agent: agent
---

# 04 — CCTC Open Design Redesign + README Media

You are working in the `mikejmckinney/CCTC` repository.

Goal: prototype a redesign of the existing CCTC Practice Exam app and create README-ready demo media that shows the app in action.

This prompt has two tracks:

1. **Design track** — use Open Design to create redesign directions and a design decision.
2. **Media track** — use HyperFrames or an equivalent deterministic capture/render workflow to create short README demos.

Do **not** rewrite production React/CSS until the human project owner approves a design direction.

---

## Required startup

Read these files before doing any work:

- `AGENTS.md`
- `.context/00_INDEX.md`
- `.context/roadmap.md`
- `.context/rules/agent_ownership.md`
- `.context/rules/process_work_style.md`
- `README.md`
- `docs/FAQ.md`
- `docs/design/open-design-setup.md`
- `docs/design/open-design.lock`
- `.github/prompts/00-onboarding.md`
- `.github/prompts/01-build-app.md`
- `src/types/exam.ts`
- `src/lib/sessionAssembly.ts`
- `src/data/questionBank.ts`
- `src/app/App.tsx`
- `src/app.css`

Then report:

- whether Open Design is available through CLI or MCP
- whether HyperFrames is available through CLI or skills
- whether FFmpeg is available
- whether you are on a non-default branch

If any required design/media tool is unavailable, stop and provide exact installation/setup commands instead of improvising.

---

## Stop points

For each stop point below, stop, ask the question, give a recommendation, and explain the reasoning before proceeding.

### Stop point 1 — Design scope

Question: Is this a visual refresh only, or should the UX flows be redesigned too?

Recommendation: Treat this as a UX redesign, not just a visual theme. Prioritize exam setup clarity, active-question readability, mobile controls, score-report usefulness, history/weak-area review, and item-flagging flow.

Reasoning: The current app already has working core behavior. The largest improvement is likely learner experience and information hierarchy, not just color and typography.

### Stop point 2 — Production code boundary

Question: Should this prompt modify production React/CSS?

Recommendation: No. This prompt should produce prototypes, design docs, and media sources only. Production app implementation should be a follow-up issue/PR after the human chooses a direction.

Reasoning: The app has working, tested behavior for session assembly, scoring, persistence, flags, and history. Redesign artifacts should not destabilize the exam engine.

### Stop point 3 — README truthfulness gate

Question: Should README media show the current production app, an approved redesign that has been merged, or a prototype concept?

Recommendation: README media must show the current production app or a merged redesign. Prototype-only media may be committed under `.context/vision/mockups/` but must not be presented in the README as the live app.

Reasoning: HyperFrames can recreate media after updates, but the README must remain truthful at the time it is merged. If the media shows a prototype, label it clearly as a prototype and do not place it in the main README hero.

### Stop point 4 — Real question content subset

Question: Should design/video generation use real question-bank content?

Recommendation: Yes, use real CCTC question-bank content, but use a curated representative subset rather than dumping the entire bank into each tool call.

Reasoning: Real stems, options, explanations, and references expose layout issues that fake content misses. A subset is enough to test long stems, complex-combo items, explanation density, and reference lists.

### Stop point 5 — GitHub-hosted videos vs committed binaries

Question: Should generated MP4 files be committed under `docs/video/`, or hosted through GitHub issue/PR uploads and embedded in the README?

Recommendation: Do not commit large MP4 outputs by default. Commit the reproducible media source project and small poster images. Host final MP4s through a dedicated GitHub issue/PR upload or release asset, then embed those URLs in the README.

Reasoning: Video binaries bloat the repo. GitHub-hosted video URLs keep the README light while preserving reproducible source files in the repo.

### Stop point 6 — Number of README demos

Question: Should the README use one long video or multiple short feature demos?

Recommendation: Use one short hero demo plus 4–5 short feature demos. Prefer short H.264 MP4 embeds over GIFs when possible; create GIF/WebP only when a specific README surface requires it.

Reasoning: Multiple short demos are more scannable than one long video. GIFs are larger and less efficient than MP4 for the same quality.

---

## Project conventions (CCTC-specific)

These decisions extend the generic stop points above. They are documented in-repo so agents and contributors do not re-litigate them each session.

### Open Design is optional, installed outside the repo

- Open Design is **contributor tooling only** — not a product dependency. The app builds and runs without it.
- **Do not** vendor, submodule, or commit an `open-design/` tree inside CCTC.
- Bootstrap from the repo root:

  ```bash
  bash scripts/bootstrap-open-design.sh
  ```

- Version pin: [`docs/design/open-design.lock`](../../docs/design/open-design.lock) (currently **`open-design-v0.11.0`**, commit `67ade60bced0f6f7888bf9dc487571f954e98e0d`). There is no `v0.11.1` GitHub release tag at pin time — the vendored `package.json` on `main` may read ahead of the latest release.
- Install path: `~/.cache/cctc-tools/open-design`
- Setup guide: [`docs/design/open-design-setup.md`](../../docs/design/open-design-setup.md)
- On Linux, always use `pnpm exec od` inside the install dir — never bare `od` (`/usr/bin/od` is a different program).
- OpenCode MCP: optional; the CCTC wrapper prints a dry-run by default. Apply
  only after reviewing it with `bash scripts/bootstrap-open-design.sh --apply-mcp`.

### Media capture split (README truthfulness)

| Demo type | Tool | Rule |
|---|---|---|
| Feature demos claiming real app behavior | **Playwright** live capture on `npm run dev` | Must reflect actual Study/Exam, history, flagging, IndexedDB flows |
| Hero overview (polish, transitions, callouts) | **HyperFrames** | Composite **Playwright-captured frames/clips** — do not invent UI that drifts from production |
| Redesign direction mockups | **Open Design** | Store reviewed directions under `docs/design/artifacts/direction-*/`; reserve `.context/vision/mockups/open-design/` for early sketches |

### Single branch / PR

Land design docs, mockup artifacts, media source scripts, lock/setup files, and README embed updates in **one** feature branch/PR unless the human explicitly splits work.

### Default stop-point answers (pre-approved)

Unless the project owner overrides in session:

1. UX redesign (not theme-only)
2. No production React/CSS changes in this prompt
3. README shows production app or merged redesign; prototypes labeled and kept out of hero
4. Real question-bank fixture subset
5. No committed large MP4s; GitHub issue/PR upload + `media-manifest.md`
6. One hero demo + 4–5 short feature demos (H.264 MP4)

---

## Design track

### Create or update `DESIGN.md`

Create a root `DESIGN.md` if it does not exist. If it exists, update it rather than replacing useful project-specific content.

It should define:

- product identity
- audience
- design goals
- UX principles
- accessibility floor
- typography direction
- color-token names
- spacing and radius scale
- component tone
- mobile-first layout rules
- active-question screen rules
- score/history screen rules
- item-flagging UX rules
- README/demo media visual rules

The tone should be:

- clinical but not sterile
- calm
- trustworthy
- study-focused
- readable for long sessions
- mobile-first

Avoid implying ABTC or PSI affiliation. Do not use official ABTC or PSI logos/marks.

### Use real question-bank content

Create a curated fixture file:

```text
docs/design/fixtures/representative-cctc-items.json
```

Select 6–12 real items from the existing question bank that include:

- one short one-best-answer question
- one long one-best-answer question
- one complex-combo question
- one item with a dense explanation
- one item with multiple references
- items from at least two domains
- at least one item likely to stress mobile layout

Do not edit the source question JSON while creating this fixture. The fixture is for design and media only.

### Generate Open Design directions

Use Open Design to generate three redesign directions:

1. **Focused Study Tool**
   - low-distraction, long-session readability
   - best for serious practice exams

2. **Clinical Dashboard**
   - emphasizes progress, weak areas, and history analytics
   - best for learners tracking improvement

3. **Mobile-First Flashcard Trainer**
   - optimized for short phone sessions
   - best for Study mode and quick explanation review

Each direction must include screens or frames for:

- Home / dashboard
- New practice setup
- Resume current session prompt
- Active exam question
- Active study/flashcard question with answer revealed
- Complex-combo question layout
- Question navigator / flagged / unanswered review
- Submit confirmation
- Score report
- History / trends
- Item flag dialog

Store artifacts under:

```text
.context/vision/mockups/open-design/YYYY-MM-DD/
├── README.md
├── direction-a-focused-study/
├── direction-b-clinical-dashboard/
├── direction-c-mobile-flashcard/
├── screenshots/
└── critique.md
```

Create:

```text
docs/design/redesign-brief.md
docs/design/ui-decision.md
docs/design/accessibility-checklist.md
```

`docs/design/ui-decision.md` must compare the three directions and recommend one direction or a hybrid.

---

## Media track

### Source project location

Do not store final MP4 outputs under `docs/video/` by default.

Commit reproducible media source files here:

```text
docs/media/readme-demos/
├── README.md
├── storyboard.md
├── script.md
├── frame.md
├── media-manifest.md
├── compositions/
│   ├── 00-hero-overview.html
│   ├── 01-setup.html
│   ├── 02-study-mode.html
│   ├── 03-exam-navigation-flagging.html
│   ├── 04-score-history.html
│   └── 05-resume-session.html
├── posters/
│   ├── 00-hero-overview.png
│   ├── 01-setup.png
│   ├── 02-study-mode.png
│   ├── 03-exam-navigation-flagging.png
│   ├── 04-score-history.png
│   └── 05-resume-session.png
└── scripts/
    ├── render-readme-demos.sh
    ├── optimize-readme-media.sh
    └── check-media-sizes.sh
```

Generated local binaries should go to an ignored output directory:

```text
docs/media/readme-demos/.outputs/
```

Add or update `.gitignore` so generated video outputs are not committed unless explicitly approved:

```gitignore
docs/media/readme-demos/.outputs/
*.tmp.mp4
*.tmp.webm
```

Small poster PNGs may be committed.

### Demos to create

Create these short demos:

1. **Hero overview** — 12–20 seconds
   - setup → active question → score report
   - intended for top of README

2. **Practice setup** — 6–10 seconds
   - blueprint, question count, timed/untimed, Study/Exam mode

3. **Study mode** — 6–10 seconds
   - answer question → reveal explanation + references

4. **Exam navigation and flagging** — 6–10 seconds
   - navigate, flag, unanswered/flagged tracker, no answer reveal before submit

5. **Score and history** — 8–12 seconds
   - score report, category breakdown, history trend

6. **Resume session** — 6–8 seconds
   - close/reopen or return to home → resume current session

Use real question-bank content from `docs/design/fixtures/representative-cctc-items.json` when it improves fidelity.

Keep each uploaded MP4 target under 10 MB unless the project owner explicitly confirms a paid GitHub plan and a larger limit.

Use H.264 MP4 for the primary embed target.

### GitHub issue/PR upload workflow

Use the GitHub upload workaround for README video hosting:

1. Render local MP4s into `docs/media/readme-demos/.outputs/`.
2. Stop for human upload unless the agent has a safe browser/UI path for GitHub file upload.
3. Create or ask the human to create a dedicated issue or PR comment named:

   ```text
   README media asset uploads
   ```

4. Upload each MP4 by dragging it into the issue/PR comment box.
5. Copy the generated GitHub asset URL for each upload.
6. Record those URLs in:

   ```text
   docs/media/readme-demos/media-manifest.md
   ```

7. Use those URLs in README embeds.

Do not depend on untracked local file paths for README media.

### README embed pattern

Use HTML5 video embeds with fallback links.

Example:

```html
<video
  src="https://github.com/user-attachments/assets/REPLACE_WITH_ASSET_ID"
  controls
  muted
  playsinline
  preload="metadata"
  width="100%"
  poster="docs/media/readme-demos/posters/00-hero-overview.png"
  aria-label="CCTC Practice Exam overview demo"
></video>

<p>
  <a href="https://github.com/user-attachments/assets/REPLACE_WITH_ASSET_ID">
    Open the overview demo video
  </a>
</p>
```

For additional feature demos, use a collapsed section to avoid overwhelming the README:

```md
<details>
<summary>More feature demos</summary>

### Practice setup

<video ...></video>

### Study mode

<video ...></video>

### Exam navigation and flagging

<video ...></video>

### Score and history

<video ...></video>

</details>
```

### Optional GIF/WebP derivatives

If the project owner wants animated GIFs or WebPs in addition to MP4:

- create optimized derivatives from the MP4s
- keep GIFs under 10 MB
- prefer animated WebP where practical
- do not replace H.264 MP4 as the primary source unless README rendering requires it

---

## Production app capture option

**Default for CCTC:** use Playwright for feature demos that claim real app behavior. Use HyperFrames only for the polished hero composition built from Playwright captures (see **Project conventions** above).

If using the actual app for Playwright capture:

1. Run the app locally.
2. Use deterministic seeded demo state where possible.
3. Capture the current production app, not a prototype.
4. Ensure the captured flow uses only app-supported interactions.
5. Do not modify app data permanently.

Recommended commands:

```bash
npm install
npm run validate
npm run test
npm run build
npm run dev
```

If Playwright is used for capture, store scripts under:

```text
docs/media/readme-demos/scripts/
```

Do not put capture scripts under `tests/` unless they are intended to run as CI tests.

---

## README update rules

Only update `README.md` after:

- the media exists and URLs are known, or
- the README section is clearly marked as a placeholder PR awaiting uploaded asset URLs

The README should include:

- one hero demo near the top
- feature demo section lower down
- accurate claims only
- no ABTC/PSI affiliation implication
- no statement that prototype-only media is production

If the media URLs are not yet available, create:

```text
docs/media/readme-demos/README_SNIPPET_PENDING_URLS.md
```

instead of editing the main README.

---

## Verification

Run the relevant checks before reporting done:

```bash
npm run validate
npm run test
npm run build
```

For media:

```bash
bash docs/media/readme-demos/scripts/render-readme-demos.sh
bash docs/media/readme-demos/scripts/optimize-readme-media.sh
bash docs/media/readme-demos/scripts/check-media-sizes.sh
```

If HyperFrames is unavailable, document that and provide exact commands to run after installation.

If FFmpeg is unavailable, document that and skip GIF/WebP conversion rather than creating unverified binaries.

---

## Final response required

Return:

1. Stop-point decisions and any unresolved questions
2. Tools detected
3. Files created or updated
4. Open Design directions created
5. Recommended design direction
6. README media generated
7. Whether MP4s were uploaded or are awaiting human upload
8. README changes made or pending snippet path
9. Verification commands run and results
10. Risks, especially any mismatch between media and current production behavior
