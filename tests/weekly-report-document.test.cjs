const test=require('node:test');
const assert=require('node:assert/strict');
const {buildWeeklyReportDocument}=require('../src/lib/weekly-report-document.ts');
const fixture=()=>({date:'2026-10-23',report_id:'2026-10-23-weekly',content_hash:'a'.repeat(64),generated_at:'2026-10-24T00:00:00Z',source_url:'reports/2026-10-23-weekly.md',image:{source_url:'reports/2026-10-23-weekly.png',sha256:'b'.repeat(64),width:900,height:1200},summary:{value_regime:'NEUTRAL',value_streak_weeks:3,value_return_12w_percent:2.3,small_crowding:.493,large_crowding:.798,size_signal:'large_cap'},series:{value:[{date:'2026-10-16',return_12w_percent:2,wealth_index:1.1},{date:'2026-10-23',return_12w_percent:2.3,wealth_index:1.2}],size:[{date:'2026-10-23',relative_strength:1.5,small_crowding:.493,large_crowding:.798}]},sources:{value:{schema_version:'research.weekly_analysis.v1',as_of:'2026-10-23',sha256:'c'.repeat(64)},size:{schema_version:'research.weekly_analysis.v1',as_of:'2026-10-23',sha256:'d'.repeat(64)}},markdown:'# 市场风格周报\n\n## 价值因子\n中性，已持续 3 周。\n- 过去 12 周累计：+2.3%（高于约 52% 的历史样本）\n历史上，当前状态共出现 668 周，分布在 51 段连续时期。后续收益的统计区间有重叠，独立样本数少于周数。\n\n## 本周复盘（10月19日至10月23日）\n成交情况：周总成交额 7.88 万亿元，日均 1.58 万亿元。\n计算方法、图表说明和数据范围见[周报怎么读](https://example.test/guide)。'});
test('four trend panels retain every series, value and observation date independently',()=>{
 const r=fixture(); const d=buildWeeklyReportDocument(r,'en');
 const ids=['weekly-value-return','weekly-value-wealth','weekly-size','weekly-crowding'];
 const panels=ids.map(id=>d.panels.find(p=>p.id===id)); assert.ok(panels.every(Boolean));
 assert.deepEqual(panels[0].series[0].values,r.series.value.map(r=>({date:r.date,value:r.return_12w_percent})));
 assert.deepEqual(panels[1].series[0].values,r.series.value.map(r=>({date:r.date,value:r.wealth_index})));
 assert.equal(panels[2].series[0].values[0].value,1.5); assert.equal(panels[3].series.length,2);
 assert.deepEqual(panels[3].scale,[0,1]); assert.equal(d.date,r.date);
});
test('full translated prose preserves sample caveats, market background and evidence without Markdown syntax',()=>{
 const d=buildWeeklyReportDocument(fixture(),'en'); const text=d.panels.flatMap(p=>[p.title,...p.paragraphs??[]]).join('\n');
 assert.match(text,/668 weeks across 51 continuous episodes/); assert.match(text,/Forward-return windows overlap/);
 assert.match(text,/7.88 trillion/); assert.match(text,/52%/); assert.doesNotMatch(text,/(^|\n)[#>-] /);
 assert.ok(d.sources.some(s=>s.url==='https://example.test/guide'));
 assert.ok(JSON.stringify(d).includes('c'.repeat(64))); assert.ok(JSON.stringify(d).includes('d'.repeat(64)));
});
test('Chinese text and unknown English passages retain evidence rather than disappear',()=>{
 const r=fixture();r.markdown+='\n新增证据：样本只有 7 个。';
 assert.match(JSON.stringify(buildWeeklyReportDocument(r,'zh')),/样本只有 7 个/);
 const d=buildWeeklyReportDocument(r,'en'); assert.match(JSON.stringify(d),/样本只有 7 个/); assert.match(JSON.stringify(d),/translation unavailable/i);
});
