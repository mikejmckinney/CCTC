# README demo media (reproducible source)

Committed sources for short README videos. **Final MP4s are not committed** — host via GitHub issue/PR upload and record URLs in `media-manifest.md`.

## Generate locally

```bash
npm run build
node docs/media/readme-demos/scripts/capture-readme-demos.mjs
bash docs/media/readme-demos/scripts/render-readme-demos.sh
bash docs/media/readme-demos/scripts/optimize-readme-media.sh
bash docs/media/readme-demos/scripts/check-media-sizes.sh
```

Outputs land in `docs/media/readme-demos/.outputs/` (gitignored).

## Capture strategy

| Demo | Source |
|---|---|
| Feature clips (01–05, resume) | Playwright live capture of production preview |
| Hero (00) | HyperFrames-style HTML composition using poster frames from captures |

## Upload workflow

1. Open GitHub issue **README media asset uploads**
2. Drag each `.outputs/*.mp4` into a comment
3. Copy `user-attachments` URLs into `media-manifest.md` (see issue [#19](https://github.com/mikejmckinney/CCTC/issues/19))
4. Merge README embeds from `README_SNIPPET_PENDING_URLS.md` (or edit `README.md` directly)

### README formatting rules

- Put each `<video>` tag on **one line** inside `<p align="center">…</p>`. Multi-line tags render as literal text on GitHub.
- Use `https://github.com/user-attachments/assets/…` URLs only (not raw blob URLs).
- Hero poster: commit PNG under `posters/` and reference with a normal `<img>` (optionally linked to the MP4).
- GIF-like autoplay: try `autoplay loop muted playsinline` on the hero video; for guaranteed motion without click, export a short GIF (&lt;10 MB) via FFmpeg and embed with `![alt](url)`.

See [`.github/prompts/04-cctc-open-design-redesign-and-readme-media-v2.md`](../../.github/prompts/04-cctc-open-design-redesign-and-readme-media-v2.md).
