import { defineConfig, devices } from '@playwright/test';

/**
 * The suite runs against the *built* site, served by `astro preview`, not the
 * dev server -- so what CI checks is what deploys, base path and all.
 */
const PORT = 4321;

export default defineConfig({
  testDir: './',
  // Component specs live beside their component; shared gates live in tests/.
  testMatch: ['tests/**/*.spec.mjs', 'src/library/components/*/tests/*.spec.mjs'],

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: `http://localhost:${PORT}/a11y-component-examples/`,
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: {
    command: 'npm run build && npm run preview',
    url: `http://localhost:${PORT}/a11y-component-examples/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
