import { expect, test } from '@playwright/test';
for (const locale of ['en', 'zh'] as const) {
  test(`dates, disclosure and readable evidence ${locale}`, async ({page}, testInfo) => {
    await page.setViewportSize({width:390,height:844});
    await page.goto(`/quant-intel-pages/${locale === 'en' ? 'en/' : '?locale=zh-CN'}`);
    await expect(page.locator('.session-nav')).toContainText(locale === 'en' ? 'U.S. trading day (America/New_York)' : '美股交易日（美东时间）');
    await expect(page.locator('.session-nav')).toContainText(locale === 'en' ? 'Planned publication 07:00' : '计划发布 07:00');
    for (const panel of await page.locator('[data-native-asia] details[data-report-panel$="-additional"]').all()) {
      const count = await panel.locator('[data-report-row]').count();
      await expect(panel.locator('summary')).toContainText(locale === 'en' ? `Show remaining ${count} items` : `展开其余 ${count} 项`);
      await panel.locator('summary').click();
      await expect(panel.locator('[data-report-row]').last()).toBeVisible();
    }
    const source = page.locator('.document-evidence').first();
    expect(await source.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(14);
    expect(await page.locator('.hero p').evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({path:testInfo.outputPath(`${locale}-disclosure-mobile.png`)});
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({path:testInfo.outputPath(`${locale}-mobile.png`)});
    await page.setViewportSize({width:1440,height:1000});
    await page.screenshot({path:testInfo.outputPath(`${locale}-desktop.png`)});
  });
}
