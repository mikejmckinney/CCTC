## README media embeds (pending upload URLs)

Paste into `README.md` after uploading MP4s to the GitHub issue **README media asset uploads** and updating `docs/media/readme-demos/media-manifest.md`.

### Hero

```html
<video
  src="GITHUB_ASSET_URL_00"
  controls
  muted
  playsinline
  preload="metadata"
  width="100%"
  poster="docs/media/readme-demos/posters/00-hero-overview.png"
  aria-label="CCTC Practice Exam overview demo"
></video>

<p><a href="GITHUB_ASSET_URL_00">Open the overview demo video</a></p>
```

### Feature demos (collapsed)

```md
<details>
<summary>More feature demos</summary>

#### Practice setup
<video src="GITHUB_ASSET_URL_01" controls muted playsinline preload="metadata" width="100%" poster="docs/media/readme-demos/posters/01-setup.png" aria-label="Practice setup demo"></video>

#### Study mode
<video src="GITHUB_ASSET_URL_02" controls muted playsinline preload="metadata" width="100%" poster="docs/media/readme-demos/posters/02-study-mode.png" aria-label="Study mode demo"></video>

#### Exam navigation and flagging
<video src="GITHUB_ASSET_URL_03" controls muted playsinline preload="metadata" width="100%" poster="docs/media/readme-demos/posters/03-exam-navigation-flagging.png" aria-label="Exam navigation demo"></video>

#### Score and history
<video src="GITHUB_ASSET_URL_04" controls muted playsinline preload="metadata" width="100%" poster="docs/media/readme-demos/posters/04-score-history.png" aria-label="Score and history demo"></video>

#### Resume session
<video src="GITHUB_ASSET_URL_05" controls muted playsinline preload="metadata" width="100%" poster="docs/media/readme-demos/posters/05-resume-session.png" aria-label="Resume session demo"></video>

</details>
```
