const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {buildAsiaReportDocument}=require('../src/lib/asia-report-document.ts');
const {renderMarkdown}=require('../src/lib/markdown.ts');
const {toEnglishPresentation}=require('../src/lib/english-content.ts');
const report={id:'2026-10-16-evening',date:'2026-10-16',kind:'evening'};
const source='- [香港收盘数据](https://finance.yahoo.com/quote/%5EHSI/history/)；2026-10-16T08:00:00+00:00；证据：`asia.close.'+'1'.repeat(64)+'`';
const markdown=`A 股今日休市。\n### 亚洲市场概览\n| 市场 | 指数 | 数据日期 | 收盘 | 涨跌幅 | 状态 |\n| --- | --- | --- | --- | --- | --- |\n| 香港 | 恒生指数 | 2026-10-16 | 24186.83 | -0.52% | 已收盘 |\n| 日本 | 日经225 | — | — | — | 休市 |\n| 韩国 | KOSPI | — | — | — | 当日数据缺失 |\n${source}\n### 自定义证据\n未经匹配的解释与暂定评分 3/5，不代表胜率。\n[原始证据](https://example.com/evidence)\n<script>alert(1)</script>`;
function overview(body=markdown,locale='zh'){
 return buildAsiaReportDocument(report,[],body,locale).panels.find(panel=>panel.id==='asia-overview');
}
test('active document preserves independent session states, exact close and source identities',()=>{
 const doc=buildAsiaReportDocument(report,[],markdown,'en');
 const panel=doc.panels.find(panel=>panel.id==='asia-overview');
 assert.equal(panel.rows.length,3);
 assert.deepEqual(panel.rows.map(row=>row.value),[-.52,undefined,undefined]);
 assert.equal(panel.rows[0].label,'Hong Kong · Hang Seng');
 assert.equal(panel.rows[0].observationDate,report.date);
 assert.equal(panel.rows[0].cells[0].text,'24186.83');
 assert.ok(doc.sources.some(source=>source.url==='https://finance.yahoo.com/quote/%5EHSI/history/'));
 assert.ok(doc.sources.some(source=>source.url==='https://example.com/evidence'));
});
test('stale or unverified Asian rows stay outside admitted numerical document rows',()=>{
 for(const body of [markdown.replace('2026-10-16 | 24186','2026-10-15 | 24186'),markdown.replace(source,'')]){
  const doc=buildAsiaReportDocument(report,[],body,'en');
  assert.ok(overview(body,'en').rows.every(row=>row.value===undefined));
  assert.ok(doc.panels.find(panel=>panel.id==='asia-overview-fallback').paragraphs.some(line=>line.includes('24186.83')));
 }
});
test('active native original disclosure retains unmatched evidence while sanitizing source HTML',()=>{
 const html=renderMarkdown(toEnglishPresentation(markdown));
 assert.match(html,/3\/5/);assert.match(html,/https:\/\/example.com\/evidence/);
 assert.match(html,/asia\.close\.11111111/);assert.match(html,/Hong Kong/);
 assert.doesNotMatch(html,/<script|alert\(1\)/);
 const component=fs.readFileSync('src/components/AsiaNativeReport.astro','utf8');
 assert.match(component,/buildAsiaReportDocument/);assert.match(component,/renderMarkdown/);
 assert.match(component,/class="report-original"/);assert.match(component,/set:html=\{bodyHtml\}/);
});
test('mainland document admits numerical values with explicit matching metadata dates only',()=>{
 const indices='### 二、指数总览\n上证指数: 3716.28 [OK] +0.24% | 成交 7324.75亿\n深证成指: N/A N/A | 成交 N/A\n未知原始注释';
 for(const prefix of ['- 数据日期: 2026-10-16\n','数据日期: 2026-10-16\n','', '- 数据日期: 2026-10-15\n','- 数据日期: 2026-10-16\n- 数据日期: 2026-10-15\n']){
  const doc=buildAsiaReportDocument(report,[],prefix+indices,'zh');
  const rows=doc.panels.find(panel=>panel.id==='indices').rows;
  assert.equal(rows.filter(row=>row.value!==undefined).length,1);
  const admitted=rows.find(row=>row.value!==undefined);
  assert.equal(admitted.value,.24);assert.ok(admitted.cells.some(cell=>cell.text==='7324.75'));
  assert.equal(admitted.observationDate,prefix==='- 数据日期: 2026-10-16\n'||prefix==='数据日期: 2026-10-16\n'?report.date:undefined);
  assert.ok(doc.panels.find(panel=>panel.id==='indices-fallback').paragraphs.some(line=>line.includes('未知原始注释')));
 }
});
