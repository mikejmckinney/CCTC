import { defineConfig, devices } from '@playwright/test';

const previewPort = 4173;
const previewHost = '127.0.0.1';
const previewUrl = `http://${previewHost}:${previewPort}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  use: {
    baseURL: previewUrl,
    trace: 'on-first-retry',
    launchOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: process.env.CI
    ? {
        command: `npm run preview -- --host ${previewHost} --port ${previewPort}`,
        url: previewUrl,
        timeout: 120_000,
        reuseExistingServer: false
      }
    : undefined
});
