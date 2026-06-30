---
name: d2cc
description: Run design-to-code contract verification to compare a prototype against the React implementation. Use when working on UI/CSS changes, visual redesigns, or before PRs that touch styling or component structure.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: design-verification
  tool: d2cc
---

# d2cc — Design-to-Code Contract Enforcement

d2cc verifies your implementation matches a prototype HTML file. The prototype is the source of truth.

## When to use this skill

Load this skill when:
- Working on UI, CSS, or visual redesign tasks
- After making changes to `src/app.css`, `src/app/**/*.tsx`, or component styles
- Before opening a PR that touches styling or layout
- When the user asks to verify visual fidelity against a prototype

## How to run d2cc

d2cc is installed at `/workspaces/d2cc`. Run from the d2cc directory with the `-p` flag pointing to the project:

```bash
cd /workspaces/d2cc && node bin/d2cc.js verify -p /path/to/project
```

Or run individual checks:

```bash
node bin/d2cc.js css-sync -p /path/to/project    # CSS tokens + class sync
node bin/d2cc.js structural -p /path/to/project   # required tokens, patterns
node bin/d2cc.js skeleton -p /path/to/project     # HTML structure extraction
node bin/d2cc.js visual -p /path/to/project       # multi-screen screenshots + comparisons
```

## Configuration

d2cc reads `design-contract.config.js` from the project root. Key sections:

- **cssSync** — checks CSS custom property values match between prototype and implementation (inline styles, JS THEME objects, and `<style>` block classes)
- **structural** — verifies required tokens exist in `:root`, patterns exist in source files
- **skeleton** — extracts HTML sections from prototype for comparison
- **visual** — captures screenshots of all screens on both prototype and implementation, generates side-by-side comparisons

## Interpreting results

- **CSS Sync failures** — token value mismatch: check that your CSS custom properties match the prototype's values exactly. RGBA normalization handles `0.86` vs `.86` differences.
- **Structural failures** — missing token in `:root` or missing pattern in source file
- **Skeleton warnings** — section not found in prototype: check the regex pattern in config
- **Visual failures** — screenshot capture failed: check that dev server is running and Playwright chromium is installed (`npx playwright install chromium`)

## Multi-screen visual config

Define screens with step sequences in `design-contract.config.js`:

```js
screens: [
  { name: "dashboard", navText: "Home" },
  { name: "session", steps: [
    { click: "Setup" },
    { wait: 2000 },
    { clickExactButton: "Study" },
    { click: "Start study" },
    { wait: 3000 },
  ]},
  { name: "results", steps: [
    { custom: "seed-idb" },     // run project-defined seed script
    { reload: true },       // reload page (both platforms)
    { click: "Progress" },
  ]},
]
```

Step types: `click` (string or array fallback), `clickExactButton` (exact role match), `waitFor`, `waitForText`, `wait`, `dismiss`, `custom` (project-defined script), `reload`.

## Common fixes

| Failure | Fix |
|---|---|
| Token value mismatch | Update CSS custom property to match prototype value |
| `.class-name` not in CSS | Add the class to `app.css` or add to `skipList` in config |
| Prototype section not found | Update the regex pattern in config `skeleton.sections` |
| `button:has-text("X")` matches wrong element | Use `clickExactButton` for exact match, or array fallback `[".class", "button:has-text('X')"]` |
| Screenshots not captured | Check Playwright installed (`npx playwright install chromium`), dev server running |
| `Manage flags` button not visible after reload | Prototype runtime needs more time — increase post-reload wait in config |
