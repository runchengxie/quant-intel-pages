import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { loadReports, loadMarketDaily, loadMarketDailyHistory, VISUAL_REPORT_START_DATE } from "../../src/lib/reports";
import { loadWeeklyRecaps } from "../../src/lib/weekly-recap";

const base = "/quant-intel-pages/";
const identity = JSON.parse(readFileSync(process.env.CONTENT_BUILD_IDENTITY!, "utf8"));
// Use the renderer's existing admission semantics, including optional families.
// A present but invalid weekly index must still fail discovery.
process.env.ASTRO_DATA_ROOT = process.env.CONTENT_SITE_ROOT;
const asia = loadReports();
const latestEvening = asia.find(row => row.kind === "evening");
const us = loadMarketDaily();
const usHistory = loadMarketDailyHistory().filter(row => row.date >= VISUAL_REPORT_START_DATE && row.date !== us?.date);
const weeks = loadWeeklyRecaps();
const empty = {
  en: { asia: "No public Asia evening report is currently available.", us: "No public U.S. daily report is currently available.", weekly: "No public weekly report is available." },
  zh: { asia: "暂未取得可公开的亚洲收盘复盘。", us: "暂未取得可公开的美股日报。", weekly: "暂无公开周报。" },
};

async function checkHome(page: import("@playwright/test").Page, locale: "en" | "zh") {
  if (latestEvening) {
    await expect(page.locator("#asia-session")).toContainText(latestEvening.date);
    await expect(page.locator("#asia-session [data-native-asia]").first()).toBeVisible();
  } else {
    await expect(page.locator("#asia-session").getByText(empty[locale].asia, { exact: true })).toBeVisible();
    await expect(page.locator("#asia-session [data-native-asia]")).toHaveCount(0);
  }
  if (us?.markdown) {
    await expect(page.locator("#us-session")).toContainText(us.date);
    await expect(page.locator("#us-session [data-native-us]").first()).toBeVisible();
  } else {
    await expect(page.locator("#us-session").getByText(empty[locale].us, { exact: true })).toBeVisible();
    await expect(page.locator("#us-session [data-native-us]")).toHaveCount(0);
  }
}

async function checkWeeklyEmpty(page: import("@playwright/test").Page, locale: "en" | "zh") {
  await expect(page.getByText(empty[locale].weekly, { exact: true })).toBeVisible();
  await expect(page.locator("[data-weekly-report], [data-weekly-static-chart]")).toHaveCount(0);
}

for (const locale of ["en", "zh"] as const) {
  test(`external content latest and dated families, locale switch and downloads ${locale}`, async ({ page }) => {
    const prefix = locale === "en" ? "en/" : "";
    const suffix = locale === "zh" ? "?locale=zh-CN" : "";
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + prefix + suffix);
    await expect(page.locator("html")).toHaveAttribute("lang", locale === "en" ? "en-US" : "zh-CN");
    await checkHome(page, locale);
    for (const row of usHistory) {
      const history = page.locator(".market-history > details").filter({ has: page.locator("summary", { hasText: row.date }) });
      await history.locator("summary").first().click();
      await expect(history.locator("[data-native-us]")).toBeVisible();
    }
    await page.locator("[data-locale-switch]").click();
    await expect(page.locator("html")).toHaveAttribute("lang", locale === "en" ? "zh-CN" : "en-US");
    for (const row of asia) {
      await page.goto(base + prefix + "reports/" + row.id + "/" + suffix);
      await expect(page.locator(".report-heading time")).toHaveAttribute("datetime", row.date);
      if (row.kind === "evening") {
        await expect(page.locator("[data-native-asia]")).toHaveAttribute("data-report-id", row.id);
      } else {
        await expect(page.locator(".markdown-body")).toBeVisible();
      }
    }
    await page.goto(base + prefix + "weekly/" + suffix);
    if (weeks.length) {
      await expect(page.locator("[data-weekly-report]")).toHaveAttribute("data-report-date", weeks[0].date);
      for (const row of weeks) {
        await page.goto(base + prefix + "weekly/" + row.date + "/" + suffix);
        await expect(page.locator("[data-weekly-report]")).toHaveAttribute("data-report-date", row.date);
        await expect(page.locator("[data-weekly-static-chart] svg")).toHaveCount(4);
      }
      const row = weeks.at(-1)!;
      const pending = page.waitForEvent("download");
      await page.locator(`a[href*="${row.date}-weekly.png"]`).first().click();
      const bytes = await readFile((await (await pending).path())!);
      const record = identity.exported_snapshot[`reports/${row.date}-weekly.png`];
      expect(bytes.length).toBe(record.size);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(record.sha256);
    } else {
      await checkWeeklyEmpty(page, locale);
    }
    expect(errors).toEqual([]);
  });

  test(`external content is readable without JavaScript ${locale}`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    const prefix = locale === "en" ? "en/" : "";
    const suffix = locale === "zh" ? "?locale=zh-CN" : "";
    await page.goto(base + prefix + suffix);
    await checkHome(page, locale);
    const lastAsia = asia.at(-1);
    if (lastAsia) {
      await page.goto(base + prefix + "reports/" + lastAsia.id + "/" + suffix);
      await expect(page.locator(".report-heading time")).toHaveAttribute("datetime", lastAsia.date);
      await expect(page.locator(lastAsia.kind === "evening" ? "[data-native-asia]" : ".markdown-body")).toBeVisible();
    }
    const lastWeek = weeks.at(-1);
    await page.goto(base + prefix + "weekly/" + (lastWeek ? lastWeek.date + "/" : "") + suffix);
    if (lastWeek) await expect(page.locator("[data-weekly-static-chart] svg")).toHaveCount(4);
    else await checkWeeklyEmpty(page, locale);
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
