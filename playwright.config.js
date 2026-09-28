import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',

  reporter: [
    ['list'],
    ['html', { open: 'on-failure' }]
  ],
  workers: 2,
  fullyParallel: false,

  // The demo has no backend, so the dev server is all the suite needs.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },

  use: {
    baseURL: 'http://localhost:5173',

    browserName: 'chromium',
    channel: 'chrome',

    headless: false,

    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry'
  }
});