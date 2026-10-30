const test = require('node:test');
const assert = require('node:assert/strict');
const markdown = `## 亚洲市场收盘复盘（20261005）
A 股今日休市。
| 市场 | 状态 | 收盘 | 涨跌幅 |
| --- | --- | --- | --- |
| A 股 | 休市 | — | — |
| 香港 | 2026-10-05 | 25000.00 | +1.00% |
| 日本 | 2026-10-05 | 44000.00 | +1.15% |
| 韩国 | 休市 | — | — |`;

test('holiday admission returns original current-session values and explicit missing rows', async () => {
 const {holidayRows} = await import('../src/lib/asia-holiday-sessions.ts');
 const rows=holidayRows(markdown,'2026-10-05');
 assert.deepEqual(rows,[['A 股','休市','—','—'],['香港','2026-10-05','25000.00','+1.00%'],['日本','2026-10-05','44000.00','+1.15%'],['韩国','休市','—','—']]);
 const partial=holidayRows(markdown.replace('| 日本 | 2026-10-05 | 44000.00 | +1.15% |','| 日本 | 当日数据缺失 | — | — |'),'2026-10-05');
 assert.deepEqual(partial[2],['日本','当日数据缺失','—','—']);
});

test('holiday admission rejects stale, duplicated, malformed and unsupported values',async()=>{
 const {holidayRows} = await import('../src/lib/asia-holiday-sessions.ts');
 const invalid=[
  markdown.replace('（20261005）','（20261002）'),
  markdown.replace('A 股今日休市。',''),
  markdown.replace('| A 股 | 休市','| A 股 | 当日数据缺失'),
  markdown.replace('| 香港 | 2026-10-05','| 香港 | 2026-10-02'),
  markdown.replace('25000.00','0'), markdown.replace('25000.00','-1'),
  markdown.replace('25000.00','NaN'),markdown.replace('25000.00','9'.repeat(400)),
  markdown.replace('+1.00%','Infinity%'),markdown.replace('+1.00%','1e3%'),
  markdown.replace('| 韩国 | 休市 | — | — |','| 日本 | 休市 | — | — |'),
  markdown.replace('| 韩国 | 休市 | — | — |','| 韩国 | 休市 | 1 | — |'),
  markdown.replace('| 韩国 | 休市 | — | — |','| 韩国 | 休市 | — | — | extra |'),
  markdown.replace('| 香港 | 2026-10-05 | 25000.00 | +1.00% |','| 香港 | 休市 | — | — |').replace('| 日本 | 2026-10-05 | 44000.00 | +1.15% |','| 日本 | 当日数据缺失 | — | — |'),
 ];
 for(const source of invalid)assert.equal(holidayRows(source,'2026-10-05'),null,source);
});

test('active report document bundle does not include compatibility image implementation',async()=>{
 const {build}=require('esbuild');
 const result=await build({entryPoints:['src/lib/asia-report-document.ts'],bundle:true,write:false,metafile:true,platform:'node',format:'esm'});
 const modules=Object.keys(result.metafile.inputs);
 assert.ok(modules.some(file=>file.endsWith('/asia-holiday-sessions.ts')));
 assert.ok(!modules.some(file=>file.endsWith('/asia-report-image.ts')));
});

test('compatibility entry keeps its parser and renderer exports',async()=>{
 const canonical=await import('../src/lib/asia-holiday-sessions.ts');
 const compatibility=await import('../src/lib/asia-report-image.ts');
 assert.equal(compatibility.holidayRows,canonical.holidayRows);
 assert.equal(typeof compatibility.buildAsiaReportSvg,'function');
});
