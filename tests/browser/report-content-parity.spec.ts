import {expect,test} from '@playwright/test';
const base='/quant-intel-pages';
for(const locale of ['en','zh'] as const)for(const width of [390,1280])test(`shared report content ${locale} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:950});await page.goto(`${base}/${locale==='en'?'en/':'?locale=zh-CN'}`);
 const us=page.locator('[data-native-us]').first();
 await expect(us.locator('[data-report-row="index.spx"]')).toHaveCount(1);
 await expect(us.locator('[data-report-panel="indices"] [data-report-row]')).toHaveCount(4);
 await expect(us.locator('[data-key-metric]')).toHaveCount(0);
 await expect(us.locator('[data-report-row="index.spx"] .document-cells')).toContainText('7,623.68');
 const asia=page.locator('[data-native-asia] [data-report-document]').first();
 for(const id of ['dimensions','indices','overview','overview-breadth','overview-advance-rate','intraday','distribution','limits','flow','industry','turnover','concepts','movers','calibration'])await expect(asia.locator(`[data-report-panel="${id}"]`)).toBeVisible();
 await expect(asia.locator('[data-report-panel="distribution"] [data-report-row]')).toHaveCount(12);
 await expect(asia.locator('[data-report-panel="overview-breadth"] .document-stack')).toBeVisible();
 await expect(asia.locator('[data-report-panel="indices"] [data-report-row]')).toHaveCount(7);
 const visible=await asia.innerText();expect(visible).not.toMatch(/3690\.48 \[OK\]|涨跌分布: -inf/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 // The image uses the same panel and row IDs, never a second content interpretation.
 for(const selector of ['#market-daily-chart','#asia-daily-chart']){
  const svg=page.locator(selector+' svg');await expect(svg).toBeHidden();
  for(const id of selector.includes('market')?['indices','equities','treasury']:['dimensions','indices','overview-breadth','intraday','distribution','limits','flow','industry','turnover','concepts','movers'])await expect(svg.locator(`[data-report-panel="${id}"]`)).toHaveCount(1);
 }
});
test('weekly styled image is separate from immutable source PNG',async({page})=>{
 await page.goto(`${base}/en/weekly/2026-10-23/`);
 const original=page.getByRole('link',{name:'Original published image',exact:true});await expect(original).toHaveAttribute('download','2026-10-23-weekly.png');
 const button=page.locator('button[data-report-kind="weekly"]');await expect(button).toHaveAttribute('data-report-content-hash','605277c1995edf5fbca346957eb6b52cf9fdcdd006b056abde0eed104158ac54');
 await expect(page.locator('#weekly-report-chart svg')).toBeHidden();
 const pending=page.waitForEvent('download');await button.click();expect((await pending).suggestedFilename()).toBe('2026-10-23-weekly-report.png');
});
