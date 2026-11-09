import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";

const base = "/quant-intel-pages/";
const identity = JSON.parse(readFileSync(process.env.CONTENT_BUILD_IDENTITY!, "utf8"));
const data = (name: string) => JSON.parse(readFileSync(process.env.CONTENT_SITE_ROOT + "/data/" + name, "utf8"));
const asia = data("reports.json").reports;
const us = data("market_daily_reports.json").reports;
const weeks = data("weekly_recaps.json").reports;

for (const locale of ["en", "zh"] as const) {
  test(`external content latest and dated families, locale switch and downloads ${locale}`, async ({ page }) => {
    const prefix = locale === "en" ? "en/" : "";
    const suffix = locale === "zh" ? "?locale=zh-CN" : "";
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + prefix + suffix);
    await expect(page.locator("html")).toHaveAttribute("lang", locale === "en" ? "en-US" : "zh-CN");
    await expect(page.locator("#asia-session")).toContainText(asia[0].date);
    await expect(page.locator("#us-session")).toContainText(us[0].run_id.slice(6));
    for (const row of us.slice(1)) {
      const date = row.run_id.slice(6);
      const history = page.locator(".market-history > details").filter({ has: page.locator("summary", { hasText: date }) });
      await history.locator("summary").first().click();
      await expect(history.locator("[data-native-us]")).toBeVisible();
      await expect(history.locator(`button[data-report-date="${date}"]:not([data-report-section])`)).toBeVisible();
    }
    await page.locator("[data-locale-switch]").click();
    await expect(page.locator("html")).toHaveAttribute("lang", locale === "en" ? "zh-CN" : "en-US");
    for (const row of asia) {
      await page.goto(base + prefix + "reports/" + row.id + "/" + suffix);
      await expect(page.locator(".report-heading time")).toHaveAttribute("datetime", row.date);
      await expect(page.locator("[data-native-asia]")).toHaveAttribute("data-report-id", row.id);
    }
    await page.goto(base + prefix + "weekly/" + suffix);
    await expect(page.locator("[data-weekly-report]")).toHaveAttribute("data-report-date", weeks[0].date);
    for (const row of weeks) {
      await page.goto(base + prefix + "weekly/" + row.date + "/" + suffix);
      await expect(page.locator("[data-weekly-report]")).toHaveAttribute("data-report-date", row.date);
      await expect(page.locator("[data-weekly-static-chart] svg")).toHaveCount(4);
    }
    const row = weeks.at(-1);
    const pending = page.waitForEvent("download");
    await page.locator(`a[href*="${row.date}-weekly.png"]`).first().click();
    const bytes = await readFile((await (await pending).path())!);
    const record = identity.exported_snapshot[`reports/${row.date}-weekly.png`];
    expect(bytes.length).toBe(record.size);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(record.sha256);
    expect(errors).toEqual([]);
  });

  test(`external content is readable without JavaScript ${locale}`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    const prefix = locale === "en" ? "en/" : "";
    const suffix = locale === "zh" ? "?locale=zh-CN" : "";
    await page.goto(base + prefix + suffix);
    await expect(page.locator("[data-native-us]").first()).toBeVisible();
    await expect(page.locator("[data-native-asia]").first()).toBeVisible();
    await page.goto(base + prefix + "reports/" + asia.at(-1).id + "/" + suffix);
    await expect(page.locator("[data-native-asia]")).toBeVisible();
    await page.goto(base + prefix + "weekly/" + weeks.at(-1).date + "/" + suffix);
    await expect(page.locator("[data-weekly-static-chart] svg")).toHaveCount(4);
    await context.close();
  });
}

test("every served download and Pages marker matches the retained build identity", async ({ request }) => {
  for (const [file, record] of Object.entries(identity.exported_snapshot) as [string, {sha256: string, size: number}][]) {
    const response = await request.get(base + file);
    expect(response.status(), file).toBe(200);
    const bytes = await response.body();
    expect(bytes.length, file).toBe(record.size);
    expect(createHash("sha256").update(bytes).digest("hex"), file).toBe(record.sha256);
  }
  const response = await request.get(base + "data/site-publication.json");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual(identity.publication.marker);
  expect(identity.publication.marker.renderer_revision).toBe(identity.source.revision);
  expect(identity.publication.marker.archive_sha256).toBe(identity.content.archive_sha256);
  expect(identity.exported_snapshot["data/site-publication.json"]).toBeUndefined();
});
