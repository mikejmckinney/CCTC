# CCTC Component Manifest

> **Purpose**: Single source of truth mapping prototype HTML → React components.
> **Verification**: Run `./verify-manifest.sh` to diff this manifest against the implementation.
> **Rule**: Every CSS class and structural pattern listed here MUST exist in the React output.

---

## 1. Header (`Header.tsx`)

### Source: Direction 3, lines 670–681

Prototype structure:
```html
<header class="header">
  <div class="header-brand">
    <h1>CCTC Practice Exam</h1>
    <div class="tag">Independent study aid for transplant coordinators</div>
  </div>
  <nav class="nav-pills" aria-label="Primary">
    <button class="pill active">Dashboard</button>
    <button class="pill">Setup</button>
    <button class="pill">History</button>
    <button class="pill">Flags</button>
  </nav>
</header>
```

### React mapping:

| Prototype class | React element | Notes |
|---|---|---|
| `.header` | `<header className="app-header">` → inner `.header-inner` | App uses sticky header with backdrop; `.header` maps to `.header-inner` |
| `.header-brand` | `<a className="header-brand">` | Wrapped in `<a>` for dashboard navigation |
| `.header-brand h1` | `<h1>CCTC Practice Exam</h1>` | Must use `var(--font-display)` |
| `.header-brand .tag` | `<span className="tag">` | "Independent study aid for transplant coordinators" |
| `.nav-pills` | `<nav className="nav-pills">` | Desktop only; hidden on mobile via media query |
| `.pill` / `.pill.active` | `<button className="pill {active}">` | Items: Dashboard, Setup, History (no Flags — flags demoted) |
| `.header-actions` | `<div className="header-actions">` | Contains theme toggle icon button |
| `.icon-btn` | `<button className="icon-btn">` | Sun/moon toggle |
| `.nav-mobile` | `<nav className="nav-mobile">` | Mobile only; fixed bottom bar |
| `.nav-mobile-btn` | `<button className="nav-mobile-btn">` | Icons: House, Gear, Chart, Play (Play conditional) |

### Required CSS tokens (from app.css):
- `--brand` for h1 color
- `--muted` for .tag
- `--brand` for .pill.active background

---

## 2. Dashboard — Readiness Hero (`Dashboard.tsx`)

### Source: Direction 3, lines 684–719

Prototype structure:
```html
<section class="readiness-hero">
  <div class="readiness-gauge">
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle class="gauge-bg" cx="65" cy="65" r="52" fill="none" stroke-width="10"
        stroke-dasharray="245" stroke-dashoffset="82" />
      <circle class="gauge-fill" cx="65" cy="65" r="52" fill="none" stroke-width="10"
        stroke-dasharray="245" stroke-dashoffset="73.5" />
    </svg>
    <div class="gauge-label">
      <span class="gauge-score">72</span>
      <span class="gauge-unit">Readiness</span>
    </div>
  </div>
  <div class="readiness-content">
    <h2>You're on track for the exam</h2>
    <p>Your exponential moving average is trending upward...</p>
    <div class="readiness-stats">
      <div class="rs-item">
        <div class="rs-label">Trend</div>
        <div class="rs-value positive">+4 pts</div>
      </div>
      <div class="rs-item">
        <div class="rs-label">Sessions</div>
        <div class="rs-value">18</div>
      </div>
      <div class="rs-item">
        <div class="rs-label">Best Score</div>
        <div class="rs-value">84%</div>
      </div>
      <div class="rs-item">
        <div class="rs-label">Items Reviewed</div>
        <div class="rs-value">492</div>
      </div>
    </div>
  </div>
</section>
```

### React mapping:

| Prototype class | React element | Notes |
|---|---|---|
| `.readiness-hero` | `<section className="readiness-hero">` | Grid: `auto 1fr`, gap 2rem |
| `.readiness-gauge` | `<div className="readiness-gauge">` | 130×130, position relative |
| `.readiness-gauge svg` | `<svg width="130" height="130" viewBox="0 0 130 130">` | transform: rotate(135deg) via CSS |
| `.gauge-bg` | `<circle className="gauge-bg">` | stroke-dasharray=245, offset=circumference/3 |
| `.gauge-fill` | `<circle className="gauge-fill {warn|danger}">` | stroke-dashoffset computed from EMA |
| `.gauge-label` | `<div className="gauge-label">` | Absolute centered overlay |
| `.gauge-score` | `<span className="gauge-score">` | EMA value or "—" |
| `.gauge-unit` | `<span className="gauge-unit">` | "Readiness" |
| `.readiness-content` | `<div className="readiness-content">` | Flex column, gap 0.75rem |
| `.readiness-content h2` | `<h2>` | Dynamic text based on EMA vs threshold |
| `.readiness-content p` | `<p>` | Context-aware description |
| `.readiness-stats` | `<div className="readiness-stats">` | Flex row, gap 1.5rem |
| `.rs-item` | `<div className="rs-item">` | Contains .rs-label + .rs-value |
| `.rs-label` | `<div className="rs-label">` | Uppercase, 0.65rem, muted |
| `.rs-value` | `<div className="rs-value {positive}">` | 1.05rem, semibold |

### SVG gauge math:
- circumference = 2πr = 2π(52) ≈ 245 (prototype uses 245)
- gaugeOffset = 245 - (emaScore/100) * 245
- Initial offset (no data) = 245/3 ≈ 82

---

## 3. Dashboard — Quick Start (`Dashboard.tsx`)

### Source: Direction 3, lines 722–758

Prototype structure:
```html
<section>
  <div class="section-label">Quick Start</div>
  <div class="quickstart-grid">
    <div class="qs-card">
      <div class="qs-icon-row"><div class="qs-icon teal">[SVG]</div></div>
      <h3>Full Exam</h3>
      <p>175 items, timed, exam conditions</p>
      <span class="qs-badge">2026-07 blueprint</span>
    </div>
    <!-- 3 more qs-card: amber/Quick Session, orange/Weak Areas, green/Last Settings -->
  </div>
</section>
```

### React mapping:

| Prototype class | React element | Notes |
|---|---|---|
| `.section-label` | `<div className="section-label">` | "Quick Start" |
| `.quickstart-grid` | `<div className="quickstart-grid">` | 4-col grid |
| `.qs-card` | `<div className="qs-card" onClick={...} role="button" tabIndex={0}>` | Clickable cards |
| `.qs-icon-row` | `<div className="qs-icon-row">` | Wraps icon |
| `.qs-icon` | `<div className="qs-icon {teal|amber|orange|green}">` | 32×32, border-radius 10px |
| `.qs-card h3` | `<h3>` | Card title |
| `.qs-card p` | `<p>` | Description |
| `.qs-badge` | `<span className="qs-badge">` | Metadata line |

### Icon color mapping:
- teal: `var(--brand-soft)` bg, `var(--brand)` fg → Full Exam
- amber: `var(--accent-soft)` bg, `var(--accent)` fg → Quick Session
- orange: `var(--warning-soft)` bg, `var(--warning)` fg → Weak Areas
- green: `var(--success-soft)` bg, `var(--success)` fg → Last Settings

### SVGs (exact from prototype):
- Full Exam: `<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/>`
- Quick Session: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>`
- Weak Areas: `<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>`
- Last Settings: `<polyline points="20 6 9 17 4 12"/>`

---

## 4. Dashboard — Two-Column: Category + Insights (`Dashboard.tsx`)

### Source: Direction 3, lines 761–846

Prototype structure:
```html
<div class="two-col">
  <div class="module-card">
    <h3>Category Breakdown</h3>
    <div class="cat-row">
      <div class="cat-indicator strong"></div>
      <div class="cat-info">
        <div class="cat-name">Candidate Management</div>
        <div class="cat-bar-outer"><div class="cat-bar-inner strong" style="width:84%"></div></div>
      </div>
      <div class="cat-right">
        <div class="cat-pct">84%</div>
        <span class="cat-tag strong">Strong</span>
      </div>
    </div>
    <!-- more cat-row divs -->
  </div>
  <div class="module-card">
    <h3>Am I Ready?</h3>
    <div class="insight-list">
      <div class="insight-row">
        <div class="insight-pip pass">✓</div>
        <span>EMA readiness <strong>72%</strong> exceeds your 70% target...</span>
      </div>
      <!-- more insight-row divs -->
    </div>
  </div>
</div>
```

### React mapping — Category Breakdown:

| Prototype class | React element | Notes |
|---|---|---|
| `.two-col` | `<div className="two-col">` | 2-col grid, gap 0.65rem |
| `.module-card` | `<div className="module-card">` | Card with border, shadow |
| `.module-card h3` | `<h3>` | Uses `var(--font-display)` |
| `.cat-row` | `<div className="cat-row">` | Flex row, gap 0.6rem |
| `.cat-indicator` | `<div className="cat-indicator {strong|mid|weak}">` | 4×24px vertical bar |
| `.cat-info` | `<div className="cat-info">` | Flex 1 |
| `.cat-name` | `<div className="cat-name">` | 0.82rem, weight 500 |
| `.cat-bar-outer` | `<div className="cat-bar-outer">` | 6px height, bg var(--bg) |
| `.cat-bar-inner` | `<div className="cat-bar-inner {strong|mid|weak}">` | Width = emaPercent% |
| `.cat-right` | `<div className="cat-right">` | Text align right |
| `.cat-pct` | `<div className="cat-pct">` | 0.85rem, semibold |
| `.cat-tag` | `<span className="cat-tag {strong|focus|weak}">` | Pill badge |

### React mapping — Am I Ready:

| Prototype class | React element | Notes |
|---|---|---|
| `.insight-list` | `<div className="insight-list">` | Flex column, gap 0.6rem |
| `.insight-row` | `<div className="insight-row">` | Flex row, gap 0.55rem |
| `.insight-pip` | `<div className="insight-pip {pass|warn|info}">` | 22×22px, border-radius 6px |
| `.insight-row span` | `<span dangerouslySetInnerHTML>` | Contains `<strong>` tags |

### Insight pip content:
- pass: `✓` (unicode \u2713)
- warn: `!`
- info: `i`

---

## 5. Dashboard — Study Plan (`Dashboard.tsx`)

### Source: Direction 3, lines 849–861

Prototype structure:
```html
<section class="plan-section">
  <div class="section-label">Recommended Next Action</div>
  <div class="plan-card">
    <div class="plan-badge">
      <svg>...</svg>
    </div>
    <div class="plan-body">
      <h3>Study Post-Transplant Care — Weak Areas Session</h3>
      <p>Your EMA in this domain dropped 8 points...</p>
    </div>
    <button class="plan-btn">Start session</button>
  </div>
</section>
```

### React mapping:

| Prototype class | React element | Notes |
|---|---|---|
| `.plan-section` | `<section className="plan-section">` | margin-bottom 1.25rem |
| `.section-label` | `<div className="section-label">` | "Recommended Next Action" |
| `.plan-card` | `<div className="plan-card">` | Flex row, gap 1rem, align-items flex-start |
| `.plan-badge` | `<div className="plan-badge">` | 40×40px, border-radius 12px, accent-soft bg |
| `.plan-badge svg` | `<svg>` | Layers icon, color var(--accent) |
| `.plan-body` | `<div className="plan-body">` | Flex 1 |
| `.plan-body h3` | `<h3>` | Dynamic title |
| `.plan-body p` | `<p>` | Dynamic description |
| `.plan-btn` | `<button className="plan-btn">` | Brand bg, white text |

---

## 6. Dashboard — Session History (`Dashboard.tsx`)

### Source: Direction 3, lines 864–917

Prototype structure:
```html
<section class="history-section">
  <div class="history-header">
    <div class="section-label" style="margin-bottom:0">Recent Sessions</div>
    <button class="view-all">View all history →</button>
  </div>
  <table class="history-table">
    <thead>
      <tr>
        <th>Date</th>
        <th>Mode</th>
        <th>Questions</th>
        <th>Score</th>
        <th>Duration</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Jun 26, 2026</td>
        <td><span class="mode-pill exam">Exam</span></td>
        <td>50</td>
        <td><span class="score-badge good">78%</span></td>
        <td>1:12:34</td>
      </tr>
      <!-- 4 more rows -->
    </tbody>
  </table>
</section>
```

### React mapping:

| Prototype class | React element | Notes |
|---|---|---|
| `.history-section` | `<section className="history-section">` | margin-bottom 1.25rem |
| `.history-header` | `<div className="history-header">` | Flex row, space-between |
| `.section-label` | `<div className="section-label">` | "Recent Sessions" |
| `.view-all` | `<button className="view-all">` | "View all history →" |
| `.history-table` | `<table className="history-table">` | border-collapse separate, rounded |
| `.history-table th` | `<th>` | Uppercase, 0.65rem, muted |
| `.history-table td` | `<td>` | 0.82rem |
| `.mode-pill` | `<span className="mode-pill {exam|study}">` | Pill badge |
| `.score-badge` | `<span className="score-badge {good|mid|low}">` | Rounded badge |

---

## 7. Setup (`Setup.tsx`)

### No prototype source — derived from brief requirements

Required features:
- Blueprint version select
- Question set select (standard / scenario)
- Question count input
- Mode select (exam / study)
- Timed toggle + minutes input
- **Advanced options** (toggle reveal):
  - Exam date (date input)
  - Target score (number input, %)
  - Blueprint version display
  - Draft items toggle
- Settings summary
- Start / Resume / Discard buttons

### CSS classes used:
- `.card`, `.card-header`, `.card-stack`
- `.eyebrow`, `.badge`, `.badge-default`
- `.form-grid`, `.form-label`, `.field-hint`
- `.toggle-row`
- `.advanced-toggle`, `.advanced-toggle.open`
- `.settings-summary`
- `.btn-primary`, `.btn-secondary`, `.btn-ghost`
- `.notice-block`

---

## 8. Session View (`SessionView.tsx`)

### No prototype source — existing app feature, adapted

Required features:
- Question display with stem, elements, options
- Answer selection with correct/incorrect feedback (study mode)
- Explanation card with rationale
- **Report item** button (renamed from "Flag")
- Bookmark toggle
- Tracker grid
- Timer display
- Submit / Complete button

### CSS classes used:
- `.card`, `.card-stack`, `.card-header`
- `.session-header`, `.session-stats`
- `.question-card`, `.question-meta`, `.question-stem`
- `.element-list`
- `.option-list`, `.option-button`, `.option-letter`, `.option-helper`
- `.option-button.is-selected`, `.is-correct`, `.is-incorrect`
- `.explanation-card`
- `.reference-list`, `.reference-citation`, `.reference-locator`
- `.tracker-grid`, `.tracker-chip`, `.is-current`, `.is-answered`, `.is-bookmarked`
- `.badge`, `.badge-accent`, `.badge-default`, `.badge-warning`, `.badge-success`
- `.btn-primary`, `.btn-secondary`, `.btn-ghost`
- `.modal-backdrop`, `.modal-card`, `.modal-actions`
- `.form-label`

---

## 9. History Page (`HistoryPage.tsx`)

### No prototype source — derived from brief requirements

Required features:
- Session list with full date/time, blueprint version, N/N per domain
- Score trend chart
- Category drill-down
- **Reported Items** link at bottom

### CSS classes used:
- `.dashboard-grid`
- `.card`, `.card-stack`, `.card-header`
- `.eyebrow`, `.badge`, `.badge-default`
- `.history-list-card`
- `.trend-chart`, `.trend-chart__plot`, `.trend-chart__bar`, `.trend-chart__labels`, `.trend-chart__label`
- `.trend-chart__target`, `.trend-chart__target-label`
- `.trend-summary`, `.trend-row`
- `.category-pills`, `.category-pill`, `.category-pill.active`
- `.btn-ghost`, `.btn-secondary`

---

## 10. History Detail (`HistoryDetail.tsx`)

### CSS classes used:
- `.card`, `.card-stack`, `.card-header`
- `.eyebrow`, `.badge`, `.badge-default`, `.badge-accent`
- `.breakdown-grid`
- `.btn-primary`, `.btn-secondary`, `.btn-ghost`

---

## 11. Reported Items (`ReportedItems.tsx`)

### CSS classes used:
- `.card`, `.card-stack`, `.card-header`
- `.eyebrow`
- `.flag-row`
- `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`
- `.modal-backdrop`, `.modal-card`, `.modal-actions`

---

## CSS Token Contract

All CSS custom properties MUST be defined in `app.css` `:root` / `[data-theme="light"]` and `[data-theme="dark"]`.

### Light mode (Direction 3 — Warm Productive):
```
--bg: oklch(96% 0.008 80)
--bg-warm: oklch(95% 0.012 70)
--surface: oklch(99.5% 0.003 80)
--surface-raised: oklch(100% 0.002 80)
--fg: oklch(18% 0.02 60)
--fg-secondary: oklch(38% 0.02 60)
--muted: oklch(52% 0.018 60)
--border: oklch(88% 0.01 70)
--brand: oklch(32% 0.06 185)
--brand-soft: oklch(90% 0.04 185)
--accent: oklch(58% 0.14 65)
--accent-soft: oklch(92% 0.04 65)
--success: oklch(48% 0.12 160)
--success-soft: oklch(92% 0.04 160)
--warning: oklch(52% 0.14 75)
--warning-soft: oklch(92% 0.04 75)
--danger: oklch(48% 0.16 25)
--danger-soft: oklch(92% 0.04 25)
--font-display: 'Fraunces', Georgia, serif
--font-body: 'IBM Plex Sans', system-ui, sans-serif
--font-mono: 'IBM Plex Mono', ui-monospace, monospace
```

### Dark mode (Direction 1 — Clinical Precision):
```
--bg: oklch(14% 0.015 240)
--surface: oklch(18% 0.015 240)
--surface-raised: oklch(22% 0.015 240)
--fg: oklch(93% 0.008 200)
--muted: oklch(60% 0.018 210)
--border: oklch(28% 0.012 240)
--accent: oklch(72% 0.12 185)
--success: oklch(68% 0.14 155)
--warning: oklch(72% 0.12 80)
--danger: oklch(62% 0.16 25)
--font-display: 'Fraunces', Georgia, serif
--font-body: 'IBM Plex Sans', system-ui, sans-serif
--font-mono: 'IBM Plex Mono', ui-monospace, monospace
```

---

## Layout Rules

- `.shell`: max-width 940px, margin auto, padding 1.5rem
- `.readiness-hero`: grid `auto 1fr`, gap 2rem (stacks on mobile)
- `.quickstart-grid`: 4-col grid (2-col on mobile)
- `.two-col`: 2-col grid (1-col on mobile)
- `.history-table`: border-collapse separate, rounded corners, overflow hidden
- Mobile breakpoint: 640px

---

## Naming Convention Map

| Prototype class | React CSS class | Status |
|---|---|---|
| `.header` | `.header-inner` | ✅ Mapped (sticky header wrapper) |
| `.header-brand` | `.header-brand` | ✅ Exact match |
| `.nav-pills` | `.nav-pills` | ✅ Exact match |
| `.pill` | `.pill` | ✅ Exact match |
| `.readiness-hero` | `.readiness-hero` | ✅ Exact match |
| `.readiness-gauge` | `.readiness-gauge` | ✅ Exact match |
| `.gauge-bg` | `.gauge-bg` | ✅ Exact match |
| `.gauge-fill` | `.gauge-fill` | ✅ Exact match |
| `.gauge-label` | `.gauge-label` | ✅ Exact match |
| `.gauge-score` | `.gauge-score` | ✅ Exact match |
| `.gauge-unit` | `.gauge-unit` | ✅ Exact match |
| `.readiness-content` | `.readiness-content` | ✅ Exact match |
| `.readiness-stats` | `.readiness-stats` | ✅ Exact match |
| `.rs-item` | `.rs-item` | ✅ Exact match |
| `.rs-label` | `.rs-label` | ✅ Exact match |
| `.rs-value` | `.rs-value` | ✅ Exact match |
| `.section-label` | `.section-label` | ✅ Exact match |
| `.quickstart-grid` | `.quickstart-grid` | ✅ Exact match |
| `.qs-card` | `.qs-card` | ✅ Exact match |
| `.qs-icon-row` | `.qs-icon-row` | ✅ Exact match |
| `.qs-icon` | `.qs-icon` | ✅ Exact match |
| `.qs-badge` | `.qs-badge` | ✅ Exact match |
| `.two-col` | `.two-col` | ✅ Exact match |
| `.module-card` | `.module-card` | ✅ Exact match |
| `.cat-row` | `.cat-row` | ✅ Exact match |
| `.cat-indicator` | `.cat-indicator` | ✅ Exact match |
| `.cat-info` | `.cat-info` | ✅ Exact match |
| `.cat-name` | `.cat-name` | ✅ Exact match |
| `.cat-bar-outer` | `.cat-bar-outer` | ✅ Exact match |
| `.cat-bar-inner` | `.cat-bar-inner` | ✅ Exact match |
| `.cat-right` | `.cat-right` | ✅ Exact match |
| `.cat-pct` | `.cat-pct` | ✅ Exact match |
| `.cat-tag` | `.cat-tag` | ✅ Exact match |
| `.insight-list` | `.insight-list` | ✅ Exact match |
| `.insight-row` | `.insight-row` | ✅ Exact match |
| `.insight-pip` | `.insight-pip` | ✅ Exact match |
| `.plan-section` | `.plan-section` | ✅ Exact match |
| `.plan-card` | `.plan-card` | ✅ Exact match |
| `.plan-badge` | `.plan-badge` | ✅ Exact match |
| `.plan-body` | `.plan-body` | ✅ Exact match |
| `.plan-btn` | `.plan-btn` | ✅ Exact match |
| `.history-section` | `.history-section` | ✅ Exact match |
| `.history-header` | `.history-header` | ✅ Exact match |
| `.view-all` | `.view-all` | ✅ Exact match |
| `.history-table` | `.history-table` | ✅ Exact match |
| `.score-badge` | `.score-badge` | ✅ Exact match |
| `.mode-pill` | `.mode-pill` | ✅ Exact match |

---

## Enforcement Workflow

Four automated checks prevent prototype → implementation drift. Run before shipping.

### 1. Component Manifest Verification
```bash
./verify-manifest.sh [--verbose]
```
Checks that every CSS class in this manifest exists in `app.css` and is used in the React components. Also validates tokens, SVG paths, structural patterns, and naming conventions.

### 2. CSS Sync (prototype → app.css)
```bash
./css-sync-check.sh [prototype.html] [app.css]
```
Extracts CSS class selectors from the prototype's `<style>` block and verifies each exists in `app.css`. Catches rules that were in the prototype but never ported.

### 3. Prototype Section Skeletons
```bash
./prototype-section-extractor.sh [prototype.html]
```
Extracts the exact HTML structure of each major prototype section into `component-skeletons.md`. Use this as a reference when building or modifying React components — the markup must match.

### 4. Visual Regression
```bash
# Requires: npx playwright install chromium (one-time)
./visual-regression.sh [prototype.html] [react-url]
```
Captures screenshots of both the prototype and the running React app at desktop (940px) and mobile (390px) viewports. Creates side-by-side comparisons and diffs class names between prototype and React source.

### 5. Master Enforcement (all checks)
```bash
./enforce-contract.sh [--verbose]
```
Runs checks 1–3 in sequence. Exit 0 = all pass, exit 1 = violations found.

### Workflow
1. **Prototype → Manifest**: Update `component-manifest.md` when the prototype changes
2. **Manifest → Implementation**: Build React components using the manifest's class names and structure
3. **Verify**: `./enforce-contract.sh` — must pass before shipping
4. **Visual check**: `./visual-regression.sh` — compare screenshots for visual drift

### What each check catches

| Check | Catches | False positive risk |
|---|---|---|
| `verify-manifest.sh` | Missing CSS classes, wrong tokens, wrong SVG paths, wrong dimensions | Low — exact string match |
| `css-sync-check.sh` | Prototype CSS rules not ported to app.css | Low — extracts from `<style>` only |
| `prototype-section-extractor.sh` | Missing sections, restructured markup | Medium — regex extraction, review output |
| `visual-regression.sh` | Visual drift, missing elements, layout differences | Low — screenshots are ground truth |

### When to update this file
- When the prototype HTML changes (new sections, class renames, layout restructuring)
- When adding new React components not covered by existing sections
- When changing the CSS token set
- Do NOT update to match broken implementation — fix the implementation to match this file
