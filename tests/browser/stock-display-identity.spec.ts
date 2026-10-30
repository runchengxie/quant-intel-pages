import {expect,test} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {dailyDocuments} from './daily-source';
import {buildReportSections} from '../../src/lib/report-sections';
for(const locale of ['en','zh'] as const)for(const width of [390,1280])test(`stock names, market codes and decimals agree in web and PNG ${locale} ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:950});await page.goto(`/quant-intel-pages/${locale==='en'?'en/':'?locale=zh-CN'}`);
 const expected=dailyDocuments(locale).asia;
 const native=page.locator('[data-native-asia] [data-report-document]').first();
 const turnover=native.locator('[data-report-panel="turnover"] [data-report-row]');await expect(turnover).toHaveCount(expected.panels.find(panel=>panel.id==='turnover')?.rows?.length??0);
 for(const row of await turnover.all()){await expect(row.locator('h4')).toHaveText(/^(?:.+ )?\d{6}(?:\.(?:SH|SZ|BJ))?$/);await expect(row.locator('strong')).toHaveText(/^\d+\.\d{2}\s/);}
 const flow=native.locator('[data-report-panel="chart-moneyflow"] [data-report-row]');await expect(flow).toHaveCount(expected.panels.find(panel=>panel.id==='chart-moneyflow')?.rows?.length??0);
 if(!expected.panels.some(panel=>panel.id==='chart-moneyflow')){
  await expect(native.locator('[data-report-panel="chart-moneyflow"]')).toHaveCount(0);
  await expect(native.locator('[data-report-panel="supplemental-chart-status"]')).toHaveCount(1);
 }
 for(const row of await flow.all()){await expect(row.locator('h4')).toHaveText(/^(?:.+ )?\d{6}(?:\.(?:SH|SZ|BJ))?$/);await expect(row.locator('strong')).toHaveText(/^-?\d+\.\d{2}\s/);}
 const svg=page.locator('#asia-daily-chart svg');
 for(const panel of ['turnover','movers','chart-moneyflow'])for(const row of await native.locator(`[data-report-panel="${panel}"] [data-report-row]`).all()){
  const id=await row.getAttribute('data-report-row');const label=await row.locator('h4').textContent();const imageRow=svg.locator(`[data-report-row-panel="${panel}"][data-report-row="${id}"]`);expect((await imageRow.textContent())?.replace(/\s/g,'')).toContain(label!.replace(/\s/g,''));
 }
 const admittedSections=buildReportSections(expected);
 for(const section of ['rankings','money-flow']){
  if(!admittedSections.some(admitted=>admitted.key===section)){await expect(page.locator(`button[data-report-kind="asia-daily"][data-report-section="${section}"]`)).toHaveCount(0);continue;}
  const button=page.locator(`button[data-report-kind="asia-daily"][data-report-section="${section}"]`);const group=button.locator('xpath=ancestor::details[1]');if(!await group.evaluate(node=>(node as HTMLDetailsElement).open))await group.locator(':scope > summary').click();
  const pending=page.waitForEvent('download');await button.click();const download=await pending;const filename=info.outputPath(`${section}.png`);await download.saveAs(filename);const png=readFileSync(filename);expect(png.subarray(1,4).toString()).toBe('PNG');const w=png.readUInt32BE(16),h=png.readUInt32BE(20);expect(Math.max(w,h)).toBeLessThanOrEqual(8192);expect(w*h).toBeLessThanOrEqual(12000000);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
