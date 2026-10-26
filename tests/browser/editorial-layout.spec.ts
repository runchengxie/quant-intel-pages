import { expect, test } from '@playwright/test';
import { dailyDocuments } from './daily-source';

const base = '/quant-intel-pages';
for (const locale of ['en', 'zh'] as const) {
  test(`editorial hierarchy and responsive figures ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto(`${base}/${locale === 'en' ? 'en/' : '?locale=zh-CN'}`);
    const us = page.locator('[data-native-us]').first();
    const documents = dailyDocuments(locale);
    const indexPanel = documents.us.panels.find(panel => panel.id === 'indices');
    const indices = us.locator('[data-report-panel="indices"]');
    // Source-backed parity separately asserts the full inventory, including absent panels.
    if (indexPanel && (indexPanel.rows?.length ?? 0) >= 2) {
      const first = await indices.locator('[data-report-row]').nth(0).boundingBox();
      const second = await indices.locator('[data-report-row]').nth(1).boundingBox();
      expect(Math.abs(first!.y - second!.y)).toBeLessThan(2);
      expect(second!.x).toBeGreaterThan(first!.x + first!.width);
    }
    const hasPair = ['equities', 'treasury'].every(id => documents.us.panels.some(panel => panel.id === id));
    if (hasPair) {
      const equities = await us.locator('[data-report-panel="equities"]').boundingBox();
      const treasury = await us.locator('[data-report-panel="treasury"]').boundingBox();
      expect(equities).not.toBeNull();
      expect(treasury).not.toBeNull();
      expect(Math.abs(equities!.y - treasury!.y)).toBeLessThan(2);
      expect(treasury!.x).toBeGreaterThan(equities!.x + equities!.width);
    }
    const asia = page.locator('[data-native-asia] [data-report-document]').first();
    const strayZeros = await page.locator('.document-panel-body').evaluateAll(panels => panels.flatMap(panel =>
      [...panel.childNodes].filter(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === '0')));
    expect(strayZeros).toHaveLength(0);
    for (const panel of await asia.locator('[data-report-panel^="chart-"]').all()) {
      await expect(panel).toBeVisible();
      expect(await panel.locator('[data-report-row]').count()).toBeGreaterThan(0);
      await expect(panel.locator('.document-evidence a').first()).toHaveAttribute('href', /^https:\/\//);
      await expect(panel.locator('time').first()).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);
    }
    if (documents.asia.panels.some(panel => panel.id === 'supplemental-chart-status')) {
      const availability = asia.locator('[data-report-panel="supplemental-chart-status"]');
      await expect(availability).toBeVisible();
      if (await availability.evaluate(element => element.tagName === 'DETAILS')) {
        await expect(availability).not.toHaveAttribute('open');
        await availability.locator('summary').click();
        await expect(availability).toHaveAttribute('open', '');
      }
      await expect(availability.locator('.document-panel-body')).toBeVisible();
    }
    await page.setViewportSize({ width: 390, height: 950 });
    if (hasPair) {
      const equities = await us.locator('[data-report-panel="equities"]').boundingBox();
      const treasury = await us.locator('[data-report-panel="treasury"]').boundingBox();
      expect(treasury!.y).toBeGreaterThan(equities!.y + equities!.height);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(us).toBeVisible();
  });
}
