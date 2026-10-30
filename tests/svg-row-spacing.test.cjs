const test = require('node:test');
const assert = require('node:assert/strict');

test('row separators clear the next 17px value and column titles clear the first cell', async () => {
 const {buildReportSvg} = await import('../src/lib/report-document-svg.ts');
 const document = {id:'2026-10-29-evening',date:'2026-10-29',locale:'zh',title:'晚报',panels:[{id:'flow',title:'资金流向',kind:'rows',rows:[{id:'one',label:'长江电力 600900.SH',value:11.07,valueText:'11.07 亿元',cells:[{label:'涨跌',text:'+1.00%'}]},{id:'two',label:'中国银行 601988.SH',value:4.13,valueText:'4.13 亿元',cells:[{label:'涨跌',text:'+2.00%'}]}]}]};
 const svg = buildReportSvg(document);
 const rows = [...svg.matchAll(/<g data-report-row-panel="flow"[^>]*>(.*?)<\/g>/gs)].map(match=>match[1]);
 const baseline = (row,x) => Number(new RegExp(`<text x="${x}" y="([^"]+)"`).exec(row)[1]);
 const separator = Number(/<line x1="54"[^>]* y1="([^"]+)"/.exec(rows[0])[1]);
 // Reserve a full font-size ascent and a quarter-em descent, with two pixels of clearance.
 assert.ok(separator >= baseline(rows[0],906)+17/4+2, 'separator clears preceding value descent');
 assert.ok(separator <= baseline(rows[1],906)-17-2, 'separator clears following value ascent');
 const title = Number(/<text x="410" y="([^"]+)"[^>]*>涨跌<\/text>/.exec(svg)[1]);
 assert.ok(title+10/4+2 <= baseline(rows[0],410)-13, 'column title clears first cell ascent');
 assert.equal(Number(/height="([^"]+)"/.exec(svg)[1]), 398);
});
