import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT || "4399";
if (!process.env.CONTENT_SITE_ROOT || !process.env.CONTENT_BUILD_IDENTITY) {
  throw new Error("Content browser checks require the built site and its identity");
}
export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "content-publication.spec.ts",
  timeout: 60_000,
  workers: 1,
  reporter: "list",
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || "/tmp/quant-intel-pages-content-browser",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${port}`,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {},
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node tools/serve_content.mjs",
    env: { PLAYWRIGHT_PORT: port },
    url: `http://127.0.0.1:${port}/quant-intel-pages/en/`,
    reuseExistingServer: false,
  },
});
