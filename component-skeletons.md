# Component Skeletons

Generated from prototype HTML. Each section below shows the **exact markup**
that the React component must reproduce. Class names are the contract —
do not rename or restructure.

## How to use
1. For each section below, create a React component that renders the exact HTML structure.
2. Use the class names verbatim — the CSS depends on them.
3. Wire interactivity after the static structure matches.

---

### Header

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

**React component**: `Header.tsx`
**Source**: `/private/tmp/CCTC/direction-3-warm-productive.html`

---

### ReadinessHero

```html
<section class="readiness-hero" aria-label="Readiness score">
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
        <p>Your exponential moving average is trending upward. Focus on Post-Transplant Care to close your weakest domain gap — a single study session could raise it by 10+ points.</p>
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

**React component**: `ReadinessHero.tsx`
**Source**: `/private/tmp/CCTC/direction-3-warm-productive.html`

---

### QuickStartGrid

```html
<div class="quickstart-grid">
        <div class="qs-card">
          <div class="qs-icon-row"><div class="qs-icon teal">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg>
          </div></div>
```

**React component**: `QuickStartGrid.tsx`
**Source**: `/private/tmp/CCTC/direction-3-warm-productive.html`

---

### CategoryBreakdown

```html
<div class="two-col">
      <div class="module-card">
        <h3>Category Breakdown</h3>
        <div class="cat-row">
          <div class="cat-indicator strong"></div>
```

**React component**: `CategoryBreakdown.tsx`
**Source**: `/private/tmp/CCTC/direction-3-warm-productive.html`

---

### AmIReadyInsights

```html
<div class="insight-list">
          <div class="insight-row">
            <div class="insight-pip pass">&#10003;</div>
```

**React component**: `AmIReadyInsights.tsx`
**Source**: `/private/tmp/CCTC/direction-3-warm-productive.html`

---

### StudyPlan

```html
<section class="plan-section">
      <div class="section-label">Recommended Next Action</div>
      <div class="plan-card">
        <div class="plan-badge">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <div class="plan-body">
          <h3>Study Post-Transplant Care — Weak Areas Session</h3>
          <p>Your EMA in this domain dropped 8 points over the last week. A focused 15-item session targeting previously-incorrect items will reinforce the gaps using spaced repetition.</p>
        </div>
        <button class="plan-btn">Start session</button>
      </div>
    </section>
```

**React component**: `StudyPlan.tsx`
**Source**: `/private/tmp/CCTC/direction-3-warm-productive.html`

---

### SessionHistory

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
          <tr>
            <td>Jun 25, 2026</td>
            <td><span class="mode-pill study">Study</span></td>
            <td>25</td>
            <td><span class="score-badge good">84%</span></td>
            <td>0:38:12</td>
          </tr>
          <tr>
            <td>Jun 24, 2026</td>
            <td><span class="mode-pill exam">Exam</span></td>
            <td>175</td>
            <td><span class="score-badge mid">66%</span></td>
            <td>2:45:08</td>
          </tr>
          <tr>
            <td>Jun 23, 2026</td>
            <td><span class="mode-pill study">Study</span></td>
            <td>30</td>
            <td><span class="score-badge good">72%</span></td>
            <td>0:44:21</td>
          </tr>
          <tr>
            <td>Jun 22, 2026</td>
            <td><span class="mode-pill exam">Exam</span></td>
            <td>50</td>
            <td><span class="score-badge low">58%</span></td>
            <td>1:08:45</td>
          </tr>
        </tbody>
      </table>
    </section>
```

**React component**: `SessionHistory.tsx`
**Source**: `/private/tmp/CCTC/direction-3-warm-productive.html`

---
