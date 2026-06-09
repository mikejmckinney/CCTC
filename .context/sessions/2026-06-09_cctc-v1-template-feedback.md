# Session feedback — CCTC v1 bootstrap lessons for `ai-repo-template`

**Status**: done (capture for upstream sync)  
**Project**: `mikejmckinney/CCTC` (derived from `ai-repo-template`)  
**Date**: 2026-06-09

## What generalizes?

**Yes** — several process and scaffolding lessons should flow back to `ai-repo-template` (issues or docs PRs there). **No** for exam-domain content (question bank, ABTC blueprints, reference PDFs).

---

## Lessons to sync into `ai-repo-template`

### 1. Product fork onboarding checklist

**Observation:** CCTC spent early cycles with template-era `.context` still describing template maintenance instead of the product.

**Proposal for template:** Add a short **“Mode B product fork”** checklist in template onboarding:

- Repoint `.context/00_INDEX.md` and `.context/roadmap.md` to product phases on day one.
- Keep inherited multi-agent governance docs but label them **process**, not product domain.
- Add `AI_REPO_GUIDE.md` “Current State” block template for product maturity.

### 2. GitHub Pages + Vite base path early

**Observation:** Repo rename `CCTE` → `CCTC` required touching `VITE_BASE_PATH`, manifest, IndexedDB name, flags export filename, and live URL docs.

**Proposal:** Template static-app scaffold should document:

- `VITE_BASE_PATH=/<repo-name>/` convention in `vite.config.ts` and deploy workflow from the first Pages PR.
- Checklist for rename: package name, storage keys, SW cache name, schema `$id` URLs, README demo link.

### 3. Private repo + public Pages visibility

**Observation:** Pilot users hit **404** when using the old `/CCTE/` URL after rename; private-repo Pages also confuses logged-out access if visibility is not **Public**.

**Proposal:** Template hosting doc snippet:

- Settings → Pages → visibility **Public** if the demo must work for anonymous users while the repo stays private (plan-dependent).
- Call out that **URL path tracks repo name** for `username.github.io/<repo>/` sites.

### 4. Agent / CI session hygiene (Cursor, Codespaces)

**Observation:** Long agent turns crashed on unbounded `grep -r` (including `node_modules`), `build:ci` + `gh pr checks --watch` babysit loops, and multi-hour tool timeouts.

**Proposal:** Add to template `process_work_style.md` or agent guide:

- Prefer `git grep` / scoped paths; never repo-wide grep without excludes.
- CI verification: one-shot `gh pr checks`, not `--watch`, in agent sessions.
- Split **docs-only PRs** from **feature PRs** when sessions are fragile.
- Local pre-push: `npm test` often sufficient; defer full `build:ci` to CI for large banks.

### 5. E2E in constrained environments (Playwright hang)

**Observation:** In GitHub Codespaces / Cursor agent sessions, `npx playwright test --list` and the Playwright CLI appeared to hang indefinitely on **`@playwright/test@1.52.x`**. Symptoms included no output for 60+ seconds and stuck agent turns while debugging e2e.

**Fix that worked:** Upgrade to **`@playwright/test@^1.60.0`** (resolved `1.60.0` in `package-lock.json`), reinstall browsers, and use the **`.mjs` config + specs** (`playwright.config.mjs`, `e2e/*.spec.mjs`):

```bash
npm install -D @playwright/test@^1.60.0
npx playwright install chromium   # CI: npx playwright install --with-deps chromium
npx playwright test -c playwright.config.mjs --list   # should return quickly
```

After the upgrade, CI runs `npm run test:e2e:playwright` successfully (see `.github/workflows/validate.yml`).

**Interim workaround (still in repo):** While diagnosing the hang, we added a **library-level smoke runner** (`scripts/run-resume-smoke.mjs`, `scripts/run-e2e.mjs`) that starts `vite preview` and drives Chromium via `playwright` core directly. Keep as a fallback if a future environment regresses, but **prefer the official test runner at 1.60+**.

**Proposal for template:**

- Pin or document a **minimum Playwright version** (≥ 1.60) in the frontend/QA bootstrap notes.
- CI step: `npx playwright install --with-deps chromium` before `playwright test`.
- If CLI still hangs after upgrade: fall back to the CCTC smoke-runner pattern (`scripts/run-resume-smoke.mjs`).

### 6. Decomposed validation pipeline for content repos

**Observation:** Product repos with large JSON banks benefit from:

- `validate:ci` (fast subset) vs full `validate` (local, with indexes).
- Committed verification stubs (`validate:stubs`) for textbook anchors.
- Separate CI jobs: **validate** vs **e2e**.

**Proposal:** Template could offer an optional `content-bank` profile in docs (not necessarily code) describing this split.

### 7. Roadmap structure: phases vs v2 vision

**Observation:** `.context/roadmap.md` worked well as a **phase gate** tracker; future ideas cluttered near-term sequencing until moved to `.context/vision/v2-roadmap.md`.

**Proposal:** Template `.context/vision/` should mention optional `v2-roadmap.md` for product forks so v1 scope stays closed.

---

## Lessons that stay CCTC-specific (do not upstream verbatim)

- ABTC blueprint transcription, organ soft targets, pediatric band.
- Reference PDF index layout and ADR-030 locator rules.
- 506-item authoring batch cadence and SME `draft` → `reviewed` loop.
- CCTC disclaimer / ABTC non-affiliation copy.

---

## Suggested upstream actions (`ai-repo-template`)

| Action | Type |
|--------|------|
| “Product fork day-one” checklist in prompts or `.context/00_INDEX` template | Docs PR |
| Pages base-path + rename checklist in hosting guide | Docs PR |
| Agent timeout hygiene bullets in work-style rules | Rules PR |
| Playwright ≥ 1.60 + browser install in CI; optional smoke-runner fallback note | Docs PR |
| Issue: evaluate `content-bank` CI profile example | Issue |

---

## Related CCTC docs

- [../vision/v2-roadmap.md](../vision/v2-roadmap.md) — v2 features captured 2026-06-09
- [../roadmap.md](../roadmap.md) — v1 phases complete
