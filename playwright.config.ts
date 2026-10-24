import { defineConfig, devices } from "@playwright/test";
import { weeklyBrowserInput } from "./tests/weekly-browser-input.ts";
import { mkdtempSync } from "node:fs";
import path from "node:path";

const port = process.env.PLAYWRIGHT_PORT || "4321";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  outputDir:
    process.env.PLAYWRIGHT_OUTPUT_DIR || "/tmp/quant-intel-pages-playwright",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    env: {
      ASTRO_DATA_ROOT: weeklyBrowserInput(),
      ASTRO_OUT_DIR:
        process.env.ASTRO_OUT_DIR ||
        mkdtempSync(
          path.join(path.dirname(process.cwd()), ".weekly-browser-build-"),
        ),
    },
    command: `npm run build && cp -a "$ASTRO_DATA_ROOT/reports/." "$ASTRO_OUT_DIR/reports/" && npx astro preview --ignore-lock --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/quant-intel-pages/en/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
