import { expect, test } from '@playwright/test';

const base = '/quant-intel-pages';
for (const locale of ['en', 'zh'] as const) {
  test(`editorial hierarchy and responsive figures ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto(`${base}/${locale === 'en' ? 'en/' : '?locale=zh-CN'}`);
    const us = page.locator('[data-native-us]').first();
    const indices = us.locator('[data-report-panel="indices"]');
    const first = await indices.locator('[data-report-row]').nth(0).boundingBox();
    const second = await indices.locator('[data-report-row]').nth(1).boundingBox();
    expect(Math.abs(first!.y - second!.y)).toBeLessThan(2);
    expect(second!.x).toBeGreaterThan(first!.x + first!.width);
    const equities = await us.locator('[data-report-panel="equities"]').boundingBox();
    const treasury = await us.locator('[data-report-panel="treasury"]').boundingBox();
    expect(Math.abs(equities!.y - treasury!.y)).toBeLessThan(2);
    expect(treasury!.x).toBeGreaterThan(equities!.x + equities!.width);
    await expect(indices.locator('[data-report-row="index.spx"]')).toHaveCount(1);
    await expect(indices.locator('[data-report-row="index.spx"] .document-cells')).toContainText('7,623.68');
    await expect(indices.locator('time')).toHaveCount(1);
    await expect(indices.locator('.document-records')).toHaveCount(1);
    // Each security has its own source URL even when provider labels match.
    await expect(indices.locator('.document-evidence a')).toHaveCount(4);
    const asia = page.locator('[data-native-asia] [data-report-document]').first();
    const strayZeros = await page.locator('.document-panel-body').evaluateAll(panels => panels.flatMap(panel =>
      [...panel.childNodes].filter(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === '0')));
    expect(strayZeros).toHaveLength(0);
    await expect(asia.locator('[data-report-panel^="chart-"]')).toHaveCount(0);
    const availability = asia.locator('[data-report-panel="supplemental-chart-status"]');
    await expect(availability).toBeVisible();
    await expect(availability).not.toHaveAttribute('open');
    await availability.locator('summary').click();
    await expect(availability).toContainText(locale === 'en' ? 'supplemental' : '补充');
    await page.setViewportSize({ width: 390, height: 950 });
    const mobileEquities = await us.locator('[data-report-panel="equities"]').boundingBox();
    const mobileTreasury = await us.locator('[data-report-panel="treasury"]').boundingBox();
    expect(mobileTreasury!.y).toBeGreaterThan(mobileEquities!.y + mobileEquities!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(us.locator('[data-report-panel="indices"]')).toBeVisible();
  });
}
