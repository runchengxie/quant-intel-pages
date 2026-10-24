import { expect, test } from '@playwright/test';
const base = '/quant-intel-pages';
for (const locale of ['en', 'zh'] as const) {
  const home = locale === 'en' ? `${base}/en/` : `${base}/?locale=zh-CN`;
  const weekly = locale === 'en' ? `${base}/en/weekly/` : `${base}/weekly/?locale=zh-CN`;
  const about = locale === 'en' ? `${base}/en/about/` : `${base}/about/?locale=zh-CN`;
  for (const width of [390, 768, 1280]) {
    test(`shared navigation ${locale} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: 'light' });
      await page.goto(weekly);
      const header = page.locator('.site-header');
      await expect(header.locator('.top-nav a')).toHaveText(locale === 'en'
        ? ['U.S. Morning', 'Asia Evening', 'Weekly Style Analysis', 'About']
        : ['美股早报', '亚洲晚报', '每周风格分析', '关于此项目']);
      await expect(header.locator('[aria-current="page"]')).toHaveText(locale === 'en' ? 'Weekly Style Analysis' : '每周风格分析');
      for (const control of await header.locator('a, button').all()) await expect(control).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.locator('#theme-toggle').click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      const bg = await page.locator('.weekly-summary > div').first().evaluate(el => getComputedStyle(el).backgroundColor);
      expect(bg).toBe('rgba(0, 0, 0, 0)');
      await expect(page.locator('[data-weekly-permalink]')).toHaveCSS('color', 'rgb(219, 172, 152)');
      await header.locator('.top-nav a').nth(3).click();
      await expect(page).toHaveURL(about);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expect(page.locator('main a').first()).toHaveCSS('color', 'rgb(219, 172, 152)');
      await expect(page.locator('main h1')).toHaveText(locale === 'en' ? 'About this project' : '关于此项目');
      await expect(page.locator('main a[href="https://runchengxie.github.io/quant-intel-platform/docs/"]')).toBeVisible();
      await page.locator('[data-locale-switch]').click();
      await expect(page).toHaveURL(locale === 'en' ? `${base}/about/?locale=zh-CN` : `${base}/en/about/`);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await page.goto(home);
      await page.locator('.site-header .top-nav a').nth(1).click();
      await expect(page).toHaveURL(home + '#asia-session');
      await page.locator('[data-locale-switch]').click();
      await expect(page).toHaveURL((locale === 'en' ? `${base}/?locale=zh-CN` : `${base}/en/`) + '#asia-session');
    });
  }
  test(`weekly landing ${locale} shows latest and only earlier versions below`, async ({ page }) => {
    await page.goto(weekly);
    await expect(page.locator('[data-weekly-report]')).toHaveAttribute('data-report-date', '2026-10-23');
    const history = page.locator('[data-weekly-history]');
    await expect(history.locator('a')).toHaveText(['2026-10-16']);
    const reportBox = await page.locator('[data-weekly-report]').boundingBox();
    const historyBox = await history.boundingBox();
    expect(historyBox!.y).toBeGreaterThan(reportBox!.y + reportBox!.height);
    await page.locator('[data-weekly-permalink]').click();
    await expect(page).toHaveURL(locale === 'en' ? `${base}/en/weekly/2026-10-23/` : `${base}/weekly/2026-10-23/?locale=zh-CN`);
    await history.getByRole('link', { name: '2026-10-16', exact: true }).click();
    await expect(page.locator('[data-weekly-report]')).toHaveAttribute('data-report-date', '2026-10-16');
    await expect(page.locator('[data-weekly-history] a')).toHaveText(['2026-10-23']);
    await page.locator('[data-locale-switch]').click();
    await expect(page).toHaveURL(locale === 'en' ? `${base}/weekly/2026-10-16/?locale=zh-CN` : `${base}/en/weekly/2026-10-16/`);
  });
}
test('weekly landing remains readable with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${base}/en/weekly/`);
  await expect(page.locator('[data-weekly-report]')).toHaveAttribute('data-report-date', '2026-10-23');
  await expect(page.locator('[data-weekly-static-chart] svg')).toHaveCount(4);
  await expect(page.locator('[data-weekly-history] a')).toHaveText(['2026-10-16']);
  await context.close();
});

test('default weekly entry stays on the English latest landing', async ({ page }) => {
  await page.goto(`${base}/weekly/`);
  await expect(page).toHaveURL(`${base}/en/weekly/`);
  await expect(page.locator('[data-weekly-report]')).toHaveAttribute('data-report-date', '2026-10-23');
});
