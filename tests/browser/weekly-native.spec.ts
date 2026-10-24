import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
const base = "/quant-intel-pages";
const date = "2026-10-23";
const path = (locale: "en" | "zh") => `${base}/${locale === "en" ? "en/" : ""}weekly/${date}/${locale === "zh" ? "?locale=zh-CN" : ""}`;
for (const locale of ["en", "zh"] as const) {
  for (const width of [390, 768, 1280]) {
    test(`native weekly ${locale} at ${width}px is readable and does not fetch PNG`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const png: string[] = [];
      page.on("request", request => { if (/weekly\.png/.test(request.url())) png.push(request.url()); });
      await page.goto(path(locale));
      await expect(page.locator("[data-weekly-native]")).toHaveAttribute("data-report-date", date);
      await expect(page.locator("[data-weekly-summary] > div")).toHaveCount(4);
      await expect(page.locator("[data-weekly-static-chart] svg")).toHaveCount(4);
      await expect(page.locator("[data-weekly-report-body] .markdown-body")).toContainText("Public weekly facts");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect(png).toEqual([]);
      expect(await page.locator("[data-weekly-trend-grid]").evaluate(node => getComputedStyle(node).gridTemplateColumns.split(" ").length)).toBe(width < 600 ? 1 : 2);
      await page.screenshot({ path: `/tmp/weekly-native-${locale}-${width}.png`, fullPage: true });
    });
  }
  test(`native weekly ${locale} works without JavaScript`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(path(locale));
    await expect(page.locator("[data-weekly-static-chart] svg")).toHaveCount(4);
    await expect(page.locator("[data-weekly-report-body]")).toContainText("Public weekly facts");
    await expect(page.locator("[data-weekly-original]")).not.toHaveAttribute("open", "");
    await page.locator("[data-weekly-original] summary").click();
    await expect(page.locator("[data-weekly-original] .markdown-body")).toBeVisible();
    await expect(page.locator("[data-weekly-report] img")).toHaveCount(0);
    await context.close();
  });
}
test("native weekly retains dated language navigation and lazy chart controls", async ({ page }) => {
  const scripts: string[] = [];
  page.on("request", request => { if (request.resourceType() === "script") scripts.push(request.url()); });
  await page.goto(path("en"));
  expect(scripts.some(url => /chart-renderer|charts\./.test(url))).toBe(false);
  await page.getByRole("link", { name: "中文", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/weekly/${date}/\\?locale=zh-CN$`));
  await page.getByRole("link", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/en/weekly/${date}/$`));
  await page.locator("[data-weekly-interactive] summary").click();
  await expect(page.locator("[data-weekly-value] canvas")).toBeVisible();
  await expect(page.locator("[data-weekly-size] canvas")).toBeVisible();
});

test("native weekly PNG stays an explicit download with the source identity", async ({ page }) => {
  await page.goto(path("en"));
  const link = page.getByRole("link", { name: "Download report image", exact: true });
  const sha = "6f5b9de097b5e83d2f5e3923112ac9390f98b6369add29c6a8b3fa190da8dfef";
  await expect(link).toHaveAttribute("href", `${base}/reports/${date}-weekly.png?v=${sha}`);
  const pending = page.waitForEvent("download");
  await link.click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe(`${date}-weekly.png`);
  expect(createHash("sha256").update(await readFile((await download.path())!)).digest("hex")).toBe(sha);
});
