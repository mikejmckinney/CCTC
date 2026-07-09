export default {
  prototype: "handoff/prototype/CCTC Practice.dc.html",
  implementation: {
    src: "src/app",
    css: "src/app.css",
  },
  cssSync: {
    enabled: true,
    skipList: ["--serif", "--sans", "brand-word", "nav-label"],
  },
  structural: {
    enabled: true,
    requiredTokens: [
      "--bg", "--surface", "--ink", "--muted", "--line",
      "--teal", "--tealtext", "--gold", "--goldtext",
      "--success", "--danger", "--shadow",
    ],
    patterns: {
      "night-theme": { file: "src/app.css", pattern: '[data-theme="night"]' },
      "header-component": { file: "src/app/components/Header.tsx", pattern: "app-header" },
      "confirm-modal": { file: "src/app/components/ConfirmModal.tsx", pattern: "modal-backdrop" },
      "donut-wrap-usage": { file: "src/app/views/DashboardView.tsx", pattern: "donut-wrap" },
      "focus-areas-nested": { file: "src/app/views/DashboardView.tsx", pattern: "Focus areas" },
      "nav-header-icons": { file: "src/app/components/Header.tsx", pattern: "svg viewBox" },
      "responsive-scroll-wrapper": { file: "src/app/views/DashboardView.tsx", pattern: "overflowX" },
      "results-actions-bordered": { file: "src/app/views/ResultsView.tsx", pattern: "btn-secondary" },
    },
  },
  skeleton: {
    enabled: true,
    output: "component-skeletons.md",
    sections: [
      { name: "Header", pattern: '(<!-- ============ HEADER ============ -->[\\s\\S]*?</header>)' },
      { name: "Disclaimer", pattern: '(<!-- ============ DISCLAIMER ============ -->[\\s\\S]*?</sc-if>)' },
      { name: "Dashboard", pattern: '(<!-- ============ HOME · DASHBOARD ============ -->[\\s\\S]*?<!-- ============ SETUP ============)' },
      { name: "Setup", pattern: '(<!-- ============ SETUP ============ -->[\\s\\S]*?<!-- ============ SESSION ============)' },
      { name: "Session", pattern: '(<!-- ============ SESSION ============ -->[\\s\\S]*?<!-- ============ RESULTS ============)' },
      { name: "Results", pattern: '(<!-- ============ RESULTS ============ -->[\\s\\S]*?<!-- ============ REVIEW ============)' },
      { name: "Review", pattern: '(<!-- ============ REVIEW ============ -->[\\s\\S]*?<!-- ============ HISTORY ============)' },
      { name: "History", pattern: '(<!-- ============ HISTORY ============ -->[\\s\\S]*?<!-- ============ FLAGS ============)' },
      { name: "Flags", pattern: '(<!-- ============ FLAGS ============ -->[\\s\\S]*?</x-dc>)' },
    ],
  },
  visual: {
    enabled: true,
    serverUrl: "http://localhost:5173",
    devCommand: "npx vite --port 5173",
    serverTimeout: 30000,
    viewports: [
      { name: "desktop", width: 1280, height: 800 },
      { name: "mobile", width: 390, height: 844 },
    ],
    outputDir: "visual-regression",
    skipClasses: [],
    layoutSelectors: {
      header: { proto: '[data-el="header"]', impl: "header, .app-header" },
      nav:    { proto: '[data-el="nav"]',    impl: "nav, .app-header__nav" },
    },
    customStepFiles: {
      "seed-idb": "./scripts/d2cc-seed-idb.js",
    },
    screens: [
      // 1. Dashboard — seed IndexedDB first, then reload so app picks up data
      // Prototype auto-seeds on load; React needs custom step + reload
      {
        name: "dashboard",
        steps: [
          { custom: "seed-idb" },
          { reload: true },
        ],
      },

      // 2. Setup
      { name: "setup", steps: [
        { dismiss: "I understand" },
        { wait: 1000 },
        { click: "Setup" },
        { wait: 2000 },
      ]},

      // 3. Session — start a study session from setup
      {
        name: "session",
        steps: [
          { dismiss: "I understand" },
          { click: "Home" },
          { wait: 1000 },
          { click: "Setup" },
          { wait: 2000 },
          { clickExactButton: "Study" },
          { wait: 1500 },
          { click: "Start study" },
          { wait: 3000 },
        ],
      },

      // 4. Session study reveal — click first option to show explanation
      {
        name: "session-study-reveal",
        steps: [
          { waitFor: [".option-button", "button:has(span:text-is('A'))"] },
          { wait: 1000 },
          { click: [".option-button", "button:has(span:text-is('A'))"] },
          { wait: 2000 },
        ],
      },

      // 5. Results — submit the current session
      {
        name: "results",
        steps: [
          { click: ["button:has-text('Finish session')", "button:has-text('Finish')", "button:has-text('Submit')", "button:has-text('Submit exam')"] },
          { wait: 1000 },
          { click: ["button:has-text('Finish')", "button:has-text('Submit')"] },
          { wait: 2000 },
        ],
      },

      // 6. Review — navigate to Progress, click Review
      {
        name: "review",
        steps: [
          { dismiss: "I understand" },
          { click: "Progress" },
          { wait: 2000 },
          { click: ["button:has-text('Review →')", "button:has-text('Review')"] },
          { wait: 2000 },
        ],
      },

      // 7. Progress (history view)
      {
        name: "progress",
        steps: [
          { dismiss: "I understand" },
          { click: "Progress" },
          { wait: 2000 },
        ],
      },

      // 8. Flags — navigate to Progress, click Manage flags
      {
        name: "flags",
        steps: [
          { dismiss: "I understand" },
          { click: "Progress" },
          { wait: 2000 },
          { click: ["button:has-text('Manage flags')", "button:has-text('Manage')"] },
          { wait: 2000 },
        ],
      },
    ],
  },
};
