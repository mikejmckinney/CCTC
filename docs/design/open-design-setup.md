# Open Design Setup for CCTC

## Purpose

Open Design is **optional contributor tooling** for redesign prototypes and README/demo media. It is **not** required to run, build, test, or maintain the CCTC practice-exam app.

The product is a static React/Vite app with IndexedDB persistence. Normal workflows use:

```bash
npm install
npm run dev
npm run validate
npm run test
npm run build
```

Use Open Design only when executing [`.github/prompts/04-cctc-open-design-redesign-and-readme-media-v2.md`](../../.github/prompts/04-cctc-open-design-redesign-and-readme-media-v2.md).

## Version pin

Do not guess which Open Design version to use. Read:

- [`docs/design/open-design.lock`](open-design.lock) — canonical repo/ref/commit/install path
- [`scripts/bootstrap-open-design.sh`](../../scripts/bootstrap-open-design.sh) — bootstrap entrypoint

Current pin (at last verification): **`open-design-v0.11.0`** (`67ade60bced0f6f7888bf9dc487571f954e98e0d`).

## Install location

Install **outside** the CCTC repository:

```text
~/.cache/cctc-tools/open-design
```

Do **not** vendor or submodule Open Design inside the CCTC repo.

## Prerequisites

- **Node.js ~24** (matches CCTC Codespaces baseline)
- **corepack** enabled for **pnpm@10.33.2**
- **git**, **ffmpeg** (for README media optimize scripts — install with `sudo apt-get install -y ffmpeg` on Debian/Ubuntu)

## Install

From the CCTC repo root:

```bash
bash scripts/bootstrap-open-design.sh
```

Override paths only when debugging:

```bash
OD_DIR=/custom/path bash scripts/bootstrap-open-design.sh
```

## Linux `od` name conflict

GNU coreutils provides `/usr/bin/od` (octal dump). Open Design's CLI is also named `od`.

Always invoke through pnpm:

```bash
cd ~/.cache/cctc-tools/open-design
pnpm exec od --help
```

Do not rely on a bare `od` on `PATH`.

## Cursor MCP setup

Dry-run first (prints config without writing):

```bash
cd ~/.cache/cctc-tools/open-design
pnpm exec od mcp install cursor --print
```

If the output looks correct, apply:

```bash
pnpm exec od mcp install cursor
```

MCP is optional. You can also run Open Design via its web UI without MCP.

## Start the Open Design web UI

```bash
cd ~/.cache/cctc-tools/open-design
pnpm tools-dev run web
```

Use the Studio to generate redesign directions against this repo's `DESIGN.md` and fixture content.

## Media workflow split (CCTC convention)

| Output | Tool | Why |
|---|---|---|
| Feature demos in README | **Playwright** live capture of `npm run dev` | Truthful to shipped Study/Exam/history/flag behavior |
| Hero demo (polish, transitions) | **HyperFrames** compositing **Playwright captures** | Polished README hero without inventing UI that drifted from production |
| Redesign direction mockups | **Open Design** | Prototypes only — not README hero unless merged to production |

## Artifact locations (commit in CCTC)

| Path | Contents |
|---|---|
| `DESIGN.md` | Brand/UX contract for redesign work |
| `docs/design/**` | Briefs, decisions, fixtures, lock file, this guide |
| `.context/vision/mockups/open-design/YYYY-MM-DD/` | Open Design direction artifacts |
| `docs/media/readme-demos/**` | Reproducible media source (HTML, scripts, posters, manifest) |

## Do not commit

- Cloned Open Design repository (`~/.cache/cctc-tools/open-design`)
- `open-design/` at repo root (add to `.gitignore` if recreated locally)
- Generated video outputs under `docs/media/readme-demos/.outputs/`
- `*.tmp.mp4`, `*.tmp.webm`
- Local Open Design caches under `~/.cache` / `.tmp` inside the OD clone

## Updating the pin

After a successful bootstrap on a new Open Design release:

1. Update `ref` and `commit` in `docs/design/open-design.lock`
2. Set `last_verified` to the verification date
3. Note the change in the PR that re-ran redesign/media workflows
