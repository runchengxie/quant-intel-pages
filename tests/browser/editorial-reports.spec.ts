import { expect, test } from '@playwright/test';
const base='/quant-intel-pages';
for(const locale of ['en','zh'] as const) for(const width of [390,768,1280]) {
  test(`editorial native reading ${locale} ${width}px`, async({page})=>{
    await page.setViewportSize({width,height:950});
    await page.goto(`${base}/${locale==='en'?'en/':'?locale=zh-CN'}`);
    for(const selector of ['[data-native-us]','[data-native-asia]']) {
      const native=page.locator(selector).first();await expect(native).toBeVisible();
      expect((await native.boundingBox())!.width).toBeLessThanOrEqual(width-24);
      for(const chart of await native.locator('.native-chart').all()) expect((await chart.boundingBox())!.width).toBeLessThanOrEqual(width-24);
    }
    await expect(page.locator('#market-daily-chart svg')).toBeHidden();
    await expect(page.locator('#asia-daily-chart svg')).toBeHidden();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const font=await page.locator('#market-title').evaluate(el=>getComputedStyle(el).fontFamily);
    expect(font).toMatch(/Georgia|Serif|serif/);
    const tokens=await page.evaluate(()=>{const s=getComputedStyle(document.documentElement);return ['--desk-paper','--desk-ink','--desk-accent'].map(k=>s.getPropertyValue(k).trim())});
    await page.goto(`${base}/${locale==='en'?'en/':''}weekly/${locale==='zh'?'?locale=zh-CN':''}`);
    await expect(page.locator('[data-weekly-summary] > div')).toHaveCount(4);
    await expect(page.locator('[data-weekly-regime]')).toBeVisible();
    await expect(page.locator('[data-weekly-static-chart] svg')).toHaveCount(4);
    expect(await page.locator('[data-weekly-report] > h1').evaluate(el=>getComputedStyle(el).fontFamily)).toBe(font);
    expect(await page.evaluate(()=>{const s=getComputedStyle(document.documentElement);return ['--desk-paper','--desk-ink','--desk-accent'].map(k=>s.getPropertyValue(k).trim())})).toEqual(tokens);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.locator('#theme-toggle').click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    await page.goto(`${base}/${locale==='en'?'en/':'?locale=zh-CN'}`);
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    await expect(page.locator('[data-native-us]').first()).toBeVisible();
  });
}
for(const locale of ['en','zh'] as const) test(`native daily reports remain readable without JavaScript ${locale}`,async({browser})=>{
  const c=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:950}});const page=await c.newPage();
  await page.goto(`${base}/${locale==='en'?'en/':'?locale=zh-CN'}`);
  await expect(page.locator('[data-native-us]').first()).toBeVisible();await expect(page.locator('[data-native-asia]').first()).toBeVisible();
  await expect(page.locator('[data-native-asia] .native-asia-body')).toContainText('2026-10');
  await expect(page.locator('#market-daily-chart svg')).toBeHidden();
  await page.locator('#market-daily-chart').locator('xpath=ancestor::details[1]').locator('summary').first().click();
  await expect(page.locator('#market-daily-chart svg')).toBeVisible();await c.close();
});
test('native reading preserves dated Asia reports and explicit image export',async({page})=>{
  await page.goto(`${base}/en/`);
  const link=page.locator('a[href*="/en/reports/"]').first();await link.click();
  await expect(page.locator('[data-native-asia]')).toBeVisible();
  await expect(page.locator('#asia-daily-chart svg')).toBeHidden();
  await page.locator('#asia-daily-chart').locator('xpath=ancestor::details[1]').locator('summary').first().click();
  await expect(page.locator('#asia-daily-chart svg')).toBeVisible();
  const download=page.waitForEvent('download');await page.locator('#download-asia-report').click();
  expect((await download).suggestedFilename()).toMatch(/-asia-daily-report\.png$/);
});
