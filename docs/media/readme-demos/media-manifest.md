# README media manifest

> MP4s hosted on GitHub issue [#19 — README media asset uploads](https://github.com/mikejmckinney/CCTC/issues/19).

| Demo | File | GitHub asset URL | Poster |
|---|---|---|---|
| 00-hero-overview | `.outputs/00-hero-overview.mp4` | https://github.com/user-attachments/assets/ebc4ea29-28c9-4717-bdf4-1bc1303d57b7 | `posters/00-hero-overview.png` |
| 01-setup | `.outputs/01-setup.mp4` | https://github.com/user-attachments/assets/8dfbeb6a-be3b-4832-b2b7-fe595f71cbbd | `posters/01-setup.png` |
| 02-study-mode | `.outputs/02-study-mode.mp4` | https://github.com/user-attachments/assets/430d014a-65f7-4c67-b83c-07f9200ca841 | `posters/02-study-mode.png` |
| 03-exam-navigation-flagging | `.outputs/03-exam-navigation-flagging.mp4` | https://github.com/user-attachments/assets/02670582-828c-4d9f-be3e-ce124b89dbd2 | `posters/03-exam-navigation-flagging.png` |
| 04-score-history | `.outputs/04-score-history.mp4` | https://github.com/user-attachments/assets/810424d2-516f-46b3-8556-07bbc4196d41 | `posters/04-score-history.png` |
| 05-resume-session | `.outputs/05-resume-session.mp4` | https://github.com/user-attachments/assets/ec8a8f18-bcd5-4cce-abc1-93dc4f35ede2 | `posters/05-resume-session.png` |
| 06-backup-reported-items | `.outputs/06-backup-reported-items.mp4` | https://github.com/user-attachments/assets/c5f14614-586b-4e4e-8387-95dcb01eabfb | `posters/06-backup-reported-items.png` |

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
