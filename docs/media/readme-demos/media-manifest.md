# README media manifest

> MP4s hosted on GitHub issue [#19 — README media asset uploads](https://github.com/mikejmckinney/CCTC/issues/19).

| Demo | File | GitHub asset URL | Poster |
|---|---|---|---|
| 00-hero-overview | `.outputs/00-hero-overview.mp4` | https://github.com/user-attachments/assets/d79172ec-975f-4e71-abee-b9d5ce625a8f | `posters/00-hero-overview.png` |
| 01-setup | `.outputs/01-setup.mp4` | https://github.com/user-attachments/assets/e18951d3-0020-425a-882d-333581d25153 | `posters/01-setup.png` |
| 02-study-mode | `.outputs/02-study-mode.mp4` | https://github.com/user-attachments/assets/5f422553-e6d7-415a-a6aa-a551f67004e2 | `posters/02-study-mode.png` |
| 03-exam-navigation-flagging | `.outputs/03-exam-navigation-flagging.mp4` | https://github.com/user-attachments/assets/0ae26846-e0a0-49a8-8f59-82d16338e6cd | `posters/03-exam-navigation-flagging.png` |
| 04-score-history | `.outputs/04-score-history.mp4` | https://github.com/user-attachments/assets/dd620d7d-5ce0-4675-81f6-1c7d9382eefa | `posters/04-score-history.png` |
| 05-resume-session | `.outputs/05-resume-session.mp4` | https://github.com/user-attachments/assets/3c792879-fb57-432d-a538-b93fdcd9b8d8 | `posters/05-resume-session.png` |
| 06-backup-reported-items | `.outputs/06-backup-reported-items.mp4` | https://github.com/user-attachments/assets/2f51f8b2-6c86-413f-b2b2-4ed5e5f36701 | `posters/06-backup-reported-items.png` |

## Issue

Issue URL: https://github.com/mikejmckinney/CCTC/issues/19

Upload order in the issue comment matches demo IDs `00`-`06` (see `storyboard.md`).

## Embed template

GitHub only renders `<video>` when the tag is **on one line** inside a block like `<p align="center">`. Multi-line tags show up as raw HTML text.

```html
<p align="center">
  <video src="https://github.com/user-attachments/assets/ASSET_ID" controls muted playsinline width="960"></video>
</p>
```

Optional GIF-like playback: add `loop autoplay` (keep `muted`). GitHub may still require a click on some browsers; for true auto-animated previews, export a short GIF/WebP and use `![demo](...)` instead.
