import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || '/tmp/quant-intel-pages-playwright',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run build && npx astro preview --ignore-lock --host 127.0.0.1 --port 4321',
    url: 'http://127.0.0.1:4321/quant-intel-pages/en/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
