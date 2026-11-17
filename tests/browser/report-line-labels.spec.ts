import { expect, test } from '@playwright/test';
import { dailyDocuments } from './daily-source';
import { reportLineGeometry, reportLineHasValueLabels, reportLineLabels } from '../../src/lib/report-document-geometry';

for (const locale of ['en', 'zh'] as const) for(const width of [390,1280]) test(`monetary history point labels remain readable at ${width}px ${locale}`, async ({page}) => {
  await page.setViewportSize({width,height:950});
  await page.goto(`/quant-intel-pages/${locale === 'en' ? 'en/' : '?locale=zh-CN'}`);
  const panels=page.locator('[data-native-asia] [data-report-panel]').filter({has:page.locator('[data-line-label]')});
  // Optional histories may be absent. Require the exact admitted inventory rather
  // than inventing a minimum; dropping any available label must still fail.
  const expected=dailyDocuments(locale).asia.panels.filter(panel=>panel.kind==='line'&&reportLineHasValueLabels(panel)&&reportLineGeometry(panel));
  await expect(panels).toHaveCount(expected.length);
  for (const source of expected) {
    // Select by stable panel identity, independent of optional panel ordering.
    const view=page.locator(`[data-native-asia] [data-report-panel="${source.id}"]`);
    await expect(view).toHaveCount(1);
    const chart=reportLineGeometry(source)!;
    const expectedLabels=chart.series.flatMap((series,index)=>reportLineLabels(series,locale,index));
    await expect(view.locator('[data-line-label]')).toHaveCount(expectedLabels.length);
    expect(await view.locator('[data-line-label]').evaluateAll(nodes=>nodes.map(node=>({text:node.textContent,date:node.getAttribute('data-date'),value:node.getAttribute('data-value')}))))
      .toEqual(expectedLabels.map(point=>({text:point.text,date:point.date,value:String(point.value)})));
    const viewport=view.locator('.document-trend');
    const viewportBox=(await viewport.boundingBox())!;
    expect(viewportBox.width).toBeLessThanOrEqual(width);
    const ticks=await view.locator('.document-ticks span').evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect();return {left:box.left,top:box.top,height:box.height,lineHeight:parseFloat(getComputedStyle(node).lineHeight)};}));
    expect(ticks.every(tick=>tick.left>=viewportBox.x-1&&tick.top>=viewportBox.y-1&&tick.height<=tick.lineHeight+1)).toBe(true);
    const labels=await view.locator('[data-line-label]').evaluateAll(nodes=>nodes.map(node=>{
      const rect=node.getBoundingClientRect();return {text:node.textContent,x:rect.x,y:rect.y,right:rect.right,bottom:rect.bottom};
    }));
    expect(labels.length).toBe(expectedLabels.length);
    for(const label of labels) expect(label.text).toMatch(/^-?[\d,]+\.\d{2}$/);
    for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
      const a=labels[i],b=labels[j];
      expect(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y).toBe(true);
    }
    const plot=view.locator('.document-plot');
    const bounds=await plot.evaluate(node=>{const rect=node.getBoundingClientRect();return {left:rect.left,right:rect.right};});
    expect(labels.every(label=>label.x>=bounds.left-1&&label.right<=bounds.right+1)).toBe(true);
    await viewport.evaluate(node=>node.scrollLeft=node.scrollWidth);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
