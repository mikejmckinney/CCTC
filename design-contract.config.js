// design-to-code-contract configuration for CCTC
export default {
  prototype: "direction-3-warm-productive.html",
  implementation: {
    src: "src",
    css: "src/app.css",
  },
  cssSync: {
    enabled: true,
    skipList: ["direction-label", "footer"],
  },
  structural: {
    enabled: true,
    components: {
      "Dashboard.tsx": [
        "readiness-hero", "readiness-gauge", "gauge-bg", "gauge-fill", "gauge-label",
        "gauge-score", "gauge-unit", "readiness-content", "readiness-stats",
        "rs-item", "rs-label", "rs-value",
        "section-label", "quickstart-grid", "qs-card", "qs-icon-row", "qs-icon", "qs-badge",
        "two-col", "module-card",
        "cat-row", "cat-indicator", "cat-info", "cat-name", "cat-bar-outer", "cat-bar-inner",
        "cat-right", "cat-pct", "cat-tag",
        "insight-list", "insight-row", "insight-pip",
        "plan-section", "plan-card", "plan-badge", "plan-body", "plan-btn",
        "history-section", "history-header", "view-all", "history-table", "score-badge", "mode-pill",
      ],
      "Header.tsx": [
        "header-brand", "nav-pills", "pill", "header-actions", "icon-btn", "nav-mobile", "nav-mobile-btn",
      ],
    },
    requiredTokens: [
      "--bg", "--surface", "--surface-raised", "--fg", "--fg-secondary", "--muted", "--border",
      "--brand", "--brand-soft", "--accent", "--accent-soft",
      "--success", "--success-soft", "--warning", "--warning-soft", "--danger", "--danger-soft",
      "--font-display", "--font-body", "--font-mono",
      "--radius", "--radius-sm", "--shadow-sm", "--shadow",
    ],
    svgPaths: {
      "Full Exam": "M9 3v18M3 9h18",
      "Quick Session": "M12 7v5l3 3",
      "Weak Areas": "M12 2L2 7l10 5 10-5-10-5z",
      "Last Settings": "points=\"20 6 9 17 4 12\"",
    },
    patterns: {
      "dark-mode": { file: "src/app.css", pattern: '[data-theme="dark"]' },
      "gauge-130x130": { file: "Dashboard.tsx", pattern: 'width="130"' },
      "gauge-circumference": { file: "Dashboard.tsx", pattern: "245" },
      "gauge-radius": { file: "Dashboard.tsx", pattern: 'r="52"' },
      "gauge-rotation": { file: "src/app.css", pattern: "rotate(135deg)" },
      "mobile-breakpoint": { file: "src/app.css", pattern: "max-width: 640px" },
      "shell-width": { file: "src/app.css", pattern: "max-width: 940px" },
      "font-fraunces": { file: "src/app.css", pattern: "Fraunces" },
      "font-ibm-plex": { file: "src/app.css", pattern: "IBM Plex Sans" },
      "reported-items": { file: "HistoryPage.tsx", pattern: "Reported" },
      "report-item": { file: "SessionView.tsx", pattern: "report" },
    },
  },
  skeleton: {
    enabled: true,
    output: "component-skeletons.md",
  },
  visual: {
    enabled: true,
    serverUrl: "http://localhost:5173",
    devCommand: "npm run dev",
    serverTimeout: 30000,
    viewports: [
      { name: "desktop", width: 940, height: 800 },
      { name: "mobile", width: 390, height: 844 },
    ],
    outputDir: "visual-regression",
    skipClasses: [
      "direction-label", "header", "footer", "exam", "study", "focus", "active",
      "pass", "info", "good", "low", "mid", "weak", "strong", "positive", "warn",
      "teal", "green", "amber", "orange",
    ],
  },
};
