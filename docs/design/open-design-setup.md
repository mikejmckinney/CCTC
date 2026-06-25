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

**Recommended in Codespaces** (forward ports first, then two terminals):

### Step 0 — Forward ports before starting servers

In browser-based Codespaces, register the tunnels **before** starting the daemon and web UI:

1. Open the **Ports** tab.
2. Forward **`5173`** (web UI) and **`7456`** (daemon API).
3. Set both to **Public** visibility (right-click each port).

Starting the servers after forwarding avoids broken API calls from the Studio (e.g. setup repeating on refresh, “Couldn’t save changes. The local daemon may be offline.”).

### Step 1 — Daemon (terminal 1)

```bash
cd ~/.cache/cctc-tools/open-design
pnpm exec od daemon start --headless --port 7456 --no-open
```

Wait for `listening on http://127.0.0.1:7456`.

### Step 2 — Web UI (terminal 2)

```bash
cd ~/.cache/cctc-tools/open-design/apps/web
NODE_OPTIONS="--max-old-space-size=4096" OD_DAEMON_PORT=7456 PORT=5173 pnpm dev
```

Wait for `✓ Ready` and the first `GET / 200` (~30–60s on first compile).

### Step 3 — Open the Studio

Use the **Ports** tab → **Open in Browser** on the forwarded **`5173`** URL (`https://<codespace>-5173.app.github.dev`). Do not use `http://127.0.0.1:5173` in your laptop browser — that hits your local machine, not the Codespace.

Keep **both terminals running**. If either stops, saves and settings will fail.

**Single-command alternative** (works on some machines; flaky in Codespaces):

```bash
cd ~/.cache/cctc-tools/open-design
NODE_OPTIONS="--max-old-space-size=4096" pnpm tools-dev run web --daemon-port 7456 --web-port 5173
```

Use the Studio to generate redesign directions against this repo's `DESIGN.md` and fixture content.

### Verify bootstrap succeeded

```bash
cd ~/.cache/cctc-tools/open-design
git log -1 --oneline          # expect 67ade60bc (open-design-v0.11.0)
node -v                       # expect v24.x
pnpm -v                       # expect 10.33.2
pnpm exec od --help           # should print od usage (not GNU octal dump)
ls apps/daemon/dist/cli.js    # daemon build output must exist
```

Re-run from CCTC repo root if anything is missing:

```bash
bash scripts/bootstrap-open-design.sh
```

## GitHub Codespaces quick start

Open Design is installed **outside** the CCTC repo (`~/.cache/cctc-tools/open-design`). In a Codespace, run it locally and open it through **port forwarding**.

### 1. Bootstrap (once per Codespace)

From the CCTC repo root:

```bash
bash scripts/bootstrap-open-design.sh
```

### 2. Forward ports first (before starting servers)

1. Open the **Ports** tab.
2. **Add port** `5173` and **Add port** `7456` if they are not listed yet.
3. Set visibility on both to **Public**.
4. Only then start the daemon and web UI (see [Start the Open Design web UI](#start-the-open-design-web-ui) above).

### 3. Start the dev stack

Prefer the **two-terminal** workflow (daemon + `apps/web` `pnpm dev`). `tools-dev run web` is a single-command alternative but is flaky in Codespaces:

```bash
cd ~/.cache/cctc-tools/open-design
NODE_OPTIONS="--max-old-space-size=4096" pnpm tools-dev run web --daemon-port 7456 --web-port 5173
```

Leave this terminal running. When ready, you should see:

```text
Open Design dev server ready
➜  Web:    http://127.0.0.1:5173/
➜  Daemon: http://127.0.0.1:7456/
```

The first Next.js compile on a fresh Codespace can take **1–3 minutes** — wait until the forwarded `5173` URL responds before assuming failure.

### 4. Open in the browser

1. Use **Ports** → **Open in Browser** on the forwarded **`5173`** entry (`*.app.github.dev`).
2. Keep **`7456`** forwarded as well so API/settings calls succeed.
3. Do not use Simple Browser for the Studio — use an external tab.

### 5. Point Open Design at this repo

In the Studio, create or open a project whose workspace is the Codespace clone, e.g. `/workspaces/CCTE`. Import or reference:

- `DESIGN.md`
- `docs/design/fixtures/representative-cctc-items.json`
- Existing prototypes under `docs/design/artifacts/`

### Single-port fallback (daemon serves web UI)

If `tools-dev run web` is slow or the web sidecar misbehaves, start the daemon alone:

```bash
cd ~/.cache/cctc-tools/open-design
pnpm exec od daemon start --headless --serve-web --port 7456 --no-open
```

Forward port **`7456`** only and open `http://127.0.0.1:7456/` in the browser. Press `Ctrl+C` to stop.

## Troubleshooting

### `daemon did not expose status in time`

Usually a **stale dev runtime** under Open Design's local `.tmp` tree from a prior failed start.

```bash
cd ~/.cache/cctc-tools/open-design
pnpm tools-dev stop          # stop stamped daemon/web/desktop processes
rm -rf .tmp/tools-dev/default
pnpm tools-dev run web --daemon-port 7456 --web-port 5173
```

If it still fails, inspect logs:

```bash
cd ~/.cache/cctc-tools/open-design
pnpm tools-dev check
pnpm tools-dev logs daemon
pnpm tools-dev logs web
```

**Codespaces workaround:** `tools-dev run web` spawns the Next.js UI through a sidecar process that often dies during the first compile (memory pressure, no swap). The **daemon is fine**; the **web sidecar** is the flaky part. Use two terminals instead:

```bash
# Terminal 1
cd ~/.cache/cctc-tools/open-design
pnpm exec od daemon start --headless --port 7456 --no-open

# Terminal 2 (wait for "listening on", then first page compile can take ~45s)
cd ~/.cache/cctc-tools/open-design/apps/web
NODE_OPTIONS="--max-old-space-size=4096" OD_DAEMON_PORT=7456 PORT=5173 pnpm dev
```

Forward **5173** in the Ports tab. Do not use `od daemon start --serve-web` alone — in v0.11.0 it does not serve the Studio UI at `/` (API only).

### Studio repeats setup on refresh / “daemon may be offline” when saving

Usually the **web UI cannot reach the daemon**, or you opened the Studio before ports were forwarded.

**Checklist:**

1. **Both ports forwarded first** — `5173` and `7456`, visibility **Public**, before starting servers.
2. **Both terminals still running** — daemon (`listening on …7456`) and `pnpm dev` (`Ready` / `GET / 200`).
3. **Open via forwarded URL** — Ports → globe on `5173`, not `localhost` on your laptop.
4. **Verify daemon from the Codespace terminal:**

```bash
curl -s http://127.0.0.1:7456/api/health
# expect: {"ok":true,"version":"0.11.0"}
```

If health fails, restart terminal 1 (daemon). If health passes but the Studio still errors, restart terminal 2 (`pnpm dev`) and hard-refresh the forwarded `5173` tab.

**Why setup repeats:** onboarding and project settings are stored by the **daemon** (SQLite under Open Design’s data dir). When API calls fail, the UI falls back to first-run setup and cannot persist changes — even if you can still see files in the project tree from a prior partial session.

### Port already in use

Pick alternate ports and forward those in the Ports tab:

```bash
pnpm tools-dev run web --daemon-port 17456 --web-port 15173
```

### Preview direction artifacts (HTML prototypes)

**Do not use** editor right-click → **Open Preview** / **Show Preview** for artifact HTML. In browser-based Codespaces that webview is often blocked (`This content is blocked`) because:

- `file://` and embedded previews run inside a restricted iframe
- Artifacts load Google Fonts and other external URLs that fail CSP in the preview webview

**Recommended — local static server + Ports tab:**

```bash
cd docs/design/artifacts
python3 -m http.server 8080 --bind 127.0.0.1
```

Forward port **`8080`** in the **Ports** tab, then open in an **external browser tab** (not Simple Browser — same iframe limits as above):

| Direction | URL path (after forwarding 8080) |
|---|---|
| A — Focused Study | `/direction-a-focused-study/index.html` |
| B — Clinical Dashboard | `/direction-b-clinical-dashboard/index.html` |
| C — Mobile Flashcard | `/direction-c-mobile-flashcard/index.html` |

Example forwarded URL:

`https://<your-codespace>-8080.app.github.dev/direction-b-clinical-dashboard/index.html`

**Simple Browser** may still refuse to connect for the same iframe/CSP reasons as Open Design Studio — use the Ports **Open in Browser** (external tab) action.

### Live Server / Live Preview extensions

You can use **Live Server**, but in a **browser-based Codespace** it often opens a tab that looks blank:

1. **Wrong host** — Live Server may open `http://127.0.0.1:5500/...` on **your laptop**, not the Codespace. The tab loads but shows nothing.
2. **Wrong path** — If the server root is the repo root, "Go Live" opens `/` instead of the artifact path. You need the full path, e.g. `/docs/design/artifacts/direction-b-clinical-dashboard/index.html`.
3. **Port not forwarded** — Forward Live Server's port (default **5500**) in the **Ports** tab, then open the **`*.app.github.dev`** URL from there — not the `localhost` link Live Server prints.

**Reliable Live Server workflow in Codespaces:**

1. Add to `.vscode/settings.json` (workspace) so the server root is the artifacts folder:

```json
{
  "liveServer.settings.root": "/docs/design/artifacts",
  "liveServer.settings.port": 5500
}
```

2. Right-click `direction-b-clinical-dashboard/index.html` → **Open with Live Server**.
3. In **Ports**, forward **5500** → **Open in Browser** (use the forwarded URL).
4. If the tab is still blank, check the address bar ends with `/direction-b-clinical-dashboard/index.html`.

**Live Preview** has the same iframe/CSP limits as Simple Browser — prefer Live Server + external forwarded tab, or the `python3 -m http.server 8080` flow above.

## Direction artifact format (11 sections vs standalone app)

Prompt 04 artifacts under `docs/design/artifacts/direction-*/index.html` use **labeled `.screen` sections in one scrollable file** plus a **screen-nav** jump list. That is intentional per [`open-design-studio-brief.md`](open-design-studio-brief.md):

- **Review contract** — stakeholders compare directions on the same 11 required screens (home, setup, exam, study, navigator, score, history, flag, etc.) without clicking through a simulated app.
- **Single HTML file** — easy to diff, forward on port 8080, and gate in PR review.
- **Open Design emit pattern** — the Web Prototype skill and studio brief ask for one self-contained artifact with explicit screen labels, not a routed SPA.

[`CCTC-Practice-standalone.html`](artifacts/CCTC-Practice-standalone.html) is a different deliverable: an Open Design **bundled export** (embedded manifest, client-side unpack, in-app navigation) that behaves like one interactive app. Use that when you want a click-through prototype; use `direction-*/index.html` when you want side-by-side screen review for the redesign decision.

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
| `docs/design/artifacts/direction-*/` | Full-fidelity Open Design direction prototypes (11 screens each) |
| `.context/vision/mockups/open-design/YYYY-MM-DD/` | Early sketch mockups (superseded by `docs/design/artifacts/` where present) |
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
