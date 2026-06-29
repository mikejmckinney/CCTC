export default {
  prototype: "handoff/prototype/CCTC Practice.dc.html",
  implementation: {
    src: "src/app",
    css: "src/app.css",
  },
  cssSync: {
    enabled: true,
    skipList: ["--serif", "--sans"],
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
    screens: [
      // 1. Dashboard (initial load)
      { name: "dashboard", navText: "Home" },

      // 2. Setup
      { name: "setup", navText: "Setup" },

      // 3. Session — start a study session
      // text-is("Study") does EXACT match, avoiding the weak-areas preset
      // that also contains "Study" in its description text.
      {
        name: "session",
        steps: [
          { click: "Home" },
          { wait: 1000 },
          { click: "Setup" },
          { wait: 2000 },
          { click: "button:text-is('Study')" },
          { wait: 1500 },
          { click: "Start study" },
          { wait: 3000 },
        ],
      },

      // 4. Session study reveal — click first option to show explanation
      {
        name: "session-study-reveal",
        steps: [
          { waitFor: ".option-button" },
          { wait: 1000 },
          { click: ".option-button" },
          { wait: 2000 },
        ],
      },

      // 5. Results — seed IndexedDB with sample history, reload to show readiness
      {
        name: "results",
        reloadBeforeCapture: true,
        steps: [
          { click: "Home" },
          { wait: 500 },
          { seedIdb: true },
          { wait: 2000 },
        ],
      },

      // 6. Review — navigate to Progress, click Review
      {
        name: "review",
        steps: [
          { click: "Progress" },
          { wait: 2000 },
          { click: "button:has-text('Review →')" },
          { wait: 2000 },
        ],
      },

      // 7. Progress (history view)
      { name: "progress", navText: "Progress" },

      // 8. Flags — navigate to Progress, click Manage flags
      {
        name: "flags",
        steps: [
          { click: "Progress" },
          { wait: 2000 },
          { click: "Manage flags" },
          { wait: 1500 },
        ],
      },
    ],
  },
};
