import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
const base = "/quant-intel-pages";
test("weekly routes expose static evidence, preserve locale and load charts only on demand", async ({
  page,
}) => {
  const scripts: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "script") scripts.push(request.url());
  });
  await page.goto(`${base}/en/`);
  await page
    .getByRole("link", { name: "Weekly market and style research" })
    .click();
  await expect(page).toHaveURL(/\/en\/weekly\/$/);
  await page
    .getByRole("link", { name: "2026-10-23 · Read full report" })
    .click();
  expect(
    (await page.locator("main .content").boundingBox())!.width,
  ).toBeGreaterThan(900);
  await expect(page.locator("[data-weekly-report]")).toHaveAttribute(
    "data-report-date",
    "2026-10-23",
  );
  await expect(
    page.getByAltText("Weekly market and style research · 2026-10-23"),
  ).toBeVisible();
  expect(
    await page
      .getByAltText("Weekly market and style research · 2026-10-23")
      .evaluate((image: HTMLImageElement) => image.naturalWidth),
  ).toBe(8);
  await expect(
    page.getByRole("link", { name: "Download report image" }),
  ).toHaveAttribute("href", `${base}/reports/2026-10-23-weekly.png`);
  const pendingDownload = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download report image" }).click();
  const download = await pendingDownload;
  expect(download.suggestedFilename()).toBe("2026-10-23-weekly.png");
  expect(
    createHash("sha256")
      .update(await readFile((await download.path())!))
      .digest("hex"),
  ).toBe("6f5b9de097b5e83d2f5e3923112ac9390f98b6369add29c6a8b3fa190da8dfef");
  await expect(page.locator(".markdown-body")).toContainText(
    "Synthetic market/style report.",
  );
  expect(scripts.some((url) => /chart-renderer|charts\./.test(url))).toBe(
    false,
  );
  await page
    .getByText("Explore historical observations", { exact: true })
    .click();
  await expect(page.locator("[data-weekly-value] canvas")).toBeVisible();
  await expect(page.locator("[data-weekly-size] canvas")).toBeVisible();
  await page
    .locator("[data-weekly-value] canvas")
    .hover({ position: { x: 150, y: 100 } });
  await page
    .getByText("Accessible observation tables", { exact: true })
    .click();
  await expect(page.getByRole("table")).toHaveCount(2);
  await expect(page.getByRole("table").first()).toContainText(
    "12-week return (%)",
  );
  await page.screenshot({
    path: "/tmp/weekly-pages-charts.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "中文", exact: true }).click();
  await expect(page).toHaveURL(/\/weekly\/2026-10-23\/\?locale=zh-CN$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await page.getByRole("link", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/weekly\/2026-10-23\/$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".weekly-image")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "/tmp/weekly-pages-mobile.png",
    fullPage: true,
  });
});
test("weekly default redirects to English and static report works without JavaScript", async ({
  browser,
  page,
}) => {
  await page.goto(`${base}/weekly/2026-10-23/`);
  await expect(page).toHaveURL(/\/en\/weekly\/2026-10-23\/$/);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await context.newPage();
  await staticPage.goto(`${base}/en/weekly/2026-10-23/`);
  await expect(staticPage.locator(".weekly-image")).toBeVisible();
  await expect(staticPage.locator(".markdown-body")).toContainText(
    "Public weekly facts",
  );
  await staticPage.screenshot({
    path: "/tmp/weekly-pages-static.png",
    fullPage: true,
  });
  await context.close();
});
