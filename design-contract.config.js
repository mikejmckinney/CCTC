export default {
  prototype: "handoff/prototype/CCTC Practice.dc.html",
  implementation: {
    src: "src/app",
    css: "src/app.css",
  },
  cssSync: {
    enabled: true,
    skipList: ["--serif", "--sans"], // font-family aliases, not visual tokens
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
  },
};
