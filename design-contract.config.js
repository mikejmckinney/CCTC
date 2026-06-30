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
    customStepFiles: {
      "seed-idb": "./scripts/d2cc-seed-idb.js",
    },
    screens: [
      // 1. Dashboard — fresh load, prototype auto-seeds
      { name: "dashboard", navText: "Home" },

      // 2. Setup
      { name: "setup", navText: "Setup" },

      // 3. Session — start a study session
      {
        name: "session",
        steps: [
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

      // 4. Session study reveal — click first option
      // React: .option-button class, Prototype: button:has(span:text-is("A"))
      {
        name: "session-study-reveal",
        steps: [
          { waitFor: [".option-button", "button:has(span:text-is('A'))"] },
          { wait: 1000 },
          { click: [".option-button", "button:has(span:text-is('A'))"] },
          { wait: 2000 },
        ],
      },

      // 5. Results — continue from study-reveal session: submit and confirm
      // No reload — this continues from the active session left by step 4
      // React: Finish session → ConfirmModal → Finish → setView('results')
      // Prototype: submitSession → confirmOpen → doFinalize → view='results'
      {
        name: "results",
        steps: [
          { click: ["button:has-text('Finish session')", "button:has-text('Finish')", "button:has-text('Submit')", "button:has-text('Submit exam')"] },
          { wait: 1000 },
          { click: ["button:has-text('Finish')", "button:has-text('Submit')"] },
          { wait: 2000 },
        ],
      },

      // 6. Review — seed data, reload, navigate to Progress, click Review
      // Shows the same scored-session review for both apps
      {
        name: "review",
        steps: [
          { custom: "seed-idb" },
          { reload: true },
          { click: "Progress" },
          { wait: 3000 },
          { click: ["button:has-text('Review →')", "button:has-text('Review')"] },
          { wait: 2000 },
        ],
      },

      // 7. Progress — reload for clean seeded state
      {
        name: "progress",
        steps: [
          { reload: true },
          { click: "Progress" },
          { wait: 3000 },
        ],
      },

      // 8. Flags — reload, navigate to Progress, click Manage flags
      {
        name: "flags",
        steps: [
          { reload: true },
          { click: "Progress" },
          { wait: 5000 },
          { waitForText: "Manage flags" },
          { click: ["button:has-text('Manage flags')", "button:has-text('Manage')"] },
          { wait: 2000 },
        ],
      },
    ],
  },
};
