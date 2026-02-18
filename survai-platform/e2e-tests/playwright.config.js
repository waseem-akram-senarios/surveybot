// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'api-health',
      testMatch: /.*api-health\.spec\.js/,
    },
    {
      name: 'dashboard',
      testMatch: /.*dashboard\.spec\.js/,
    },
    {
      name: 'templates',
      testMatch: /.*templates\.spec\.js/,
    },
    {
      name: 'surveys',
      testMatch: /.*surveys\.spec\.js/,
    },
    {
      name: 'recipient',
      testMatch: /.*recipient\.spec\.js/,
    },
  ],
});
