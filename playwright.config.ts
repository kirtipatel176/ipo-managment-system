import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration.
 * Runs against the Vite dev server.
 * Tests 3 viewports: Desktop (1440), Tablet (768), Mobile (390).
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'tablet',
      use: {
        ...devices['iPad (gen 7)'],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 14 Pro'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5174',
  //   reuseExistingServer: true,
  // },
});
