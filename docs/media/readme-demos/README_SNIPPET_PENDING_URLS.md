## README media embeds

**Status:** merged into root `README.md` (issue [#19](https://github.com/mikejmckinney/CCTC/issues/19) asset URLs). Kept as a copy-paste reference; canonical URLs live in `media-manifest.md`.

**Formatting:** each `<video>` must be a single line inside `<p align="center">` or GitHub shows raw HTML.

### Hero

```html
<p align="center">
  <a href="https://github.com/user-attachments/assets/d19c9263-8a82-4114-b34e-c73011d04d43">
    <img src="docs/media/readme-demos/posters/00-hero-overview.png" width="960" alt="CCTC Practice Exam overview demo poster" />
  </a>
</p>

<p align="center">
  <video src="https://github.com/user-attachments/assets/d19c9263-8a82-4114-b34e-c73011d04d43" controls muted playsinline loop autoplay width="960"></video>
</p>

<p align="center"><a href="https://github.com/user-attachments/assets/d19c9263-8a82-4114-b34e-c73011d04d43">Open the overview demo video</a></p>
```

### Feature demos (collapsed)

```md
<details>
<summary>More feature demos</summary>

### Practice setup
<p align="center"><video src="https://github.com/user-attachments/assets/db0c00d6-529c-458c-ad7b-e822d09f360a" controls muted playsinline width="960"></video></p>

### Study mode
<p align="center"><video src="https://github.com/user-attachments/assets/ded2bd23-33ed-43b3-bf56-8daf0ce8c9f6" controls muted playsinline width="960"></video></p>

### Exam navigation and flagging
<p align="center"><video src="https://github.com/user-attachments/assets/58fcdee7-0a9e-43f1-8226-8e007c7d4b4f" controls muted playsinline width="960"></video></p>

### Score and history
<p align="center"><video src="https://github.com/user-attachments/assets/0fea0fcf-0352-4bcb-b62b-5761f3be3bfc" controls muted playsinline width="960"></video></p>

### Resume session
<p align="center"><video src="https://github.com/user-attachments/assets/d8d6711f-6bf5-437a-b357-de40c1ad68dd" controls muted playsinline width="960"></video></p>

</details>
```
