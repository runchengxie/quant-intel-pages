const test = require('node:test');
const assert = require('node:assert/strict');
const sample = () => ({id:'2026-10-29-evening',date:'2026-10-29',title:'Report',locale:'en',panels:[{id:'industry',title:'TOP10',kind:'rows',rows:Array.from({length:10},(_,i)=>({id:`industry-${i}`,label:`Industry ${i}`,value:i,valueText:`${i}%`,kind:'signed',observationDate:'2026-10-29'}))}]});
test('quality check catches hidden admitted rankings and future observations', async()=>{
 const {checkReportDocument}=await import('../src/lib/report-quality.ts');
 const doc=sample();assert.equal(checkReportDocument(doc,{industry:10}).issues.length,0);
 doc.panels[0].rows=doc.panels[0].rows.slice(0,5);
 assert.ok(checkReportDocument(doc,{industry:10}).issues.some(x=>x.code==='ranking_rows_missing'));
 doc.panels[0].rows[0].observationDate='2026-10-30';
 assert.ok(checkReportDocument(doc,{industry:5}).issues.some(x=>x.code==='future_observation'));
});
test('quality check preserves old observations and tiny precision while hiding empty financing',async()=>{
 const {checkReportDocument}=await import('../src/lib/report-quality.ts');
 const doc=sample();doc.panels[0].rows[0].observationDate='2026-10-28';
 assert.equal(checkReportDocument(doc,{industry:10}).issues.length,0);
 doc.panels.push({id:'financing',title:'Financing',kind:'text',paragraphs:['两融数据暂缺（T+1延迟）']});
 assert.ok(checkReportDocument(doc,{industry:10}).issues.some(x=>x.code==='empty_financing_visible'));
});
test('locale comparison uses facts instead of translated labels',async()=>{
 const {compareReportFacts}=await import('../src/lib/report-quality.ts');
 const en=sample(),zh=structuredClone(en);zh.locale='zh';zh.title='报告';zh.panels[0].rows[0].label='行业';
 assert.equal(compareReportFacts(en,zh).length,0);
 zh.panels[0].rows[0].value=999;assert.ok(compareReportFacts(en,zh).some(x=>x.code==='locale_facts_differ'));
});
test('render checks catch dropped formatted values without rounding stored observations',async()=>{
 const {checkReportDocument}=await import('../src/lib/report-quality.ts');
 const doc=sample();doc.panels[0].rows[0].value=2.9823310000000003;doc.panels[0].rows[0].valueText='2.9823310000000003 亿元';
 const before=JSON.stringify(doc);assert.equal(checkReportDocument(doc,{industry:10}).issues.length,0);assert.equal(JSON.stringify(doc),before);
 const bad=checkReportDocument(doc,{industry:10},()=>'<svg width="960" height="100">'+doc.panels[0].rows.map(row=>`<g data-report-row-panel="industry" data-report-row="${row.id}"><text>${row.label}</text></g>`).join('')+'</svg>');
 assert.ok(bad.issues.some(x=>x.code==='image_value_missing'));
});
test('equal displayed values cannot hide a missing image row',async()=>{
 const {checkReportDocument}=await import('../src/lib/report-quality.ts');const doc=sample();doc.panels[0].rows=doc.panels[0].rows.slice(0,2).map(row=>({...row,value:1,valueText:'1%'}));
 const result=checkReportDocument(doc,{industry:2},()=>'<svg width="960" height="100"><g data-report-panel="industry"><text>Industry 0 1%</text></g></svg>');
 assert.ok(result.issues.some(issue=>issue.code==='image_row_missing'));
});
test('locale facts include numeric secondary cells and stable source URLs',async()=>{
 const {compareReportFacts}=await import('../src/lib/report-quality.ts');const en=sample();en.panels[0].rows[0].cells=[{label:'Close',text:'3,842.19 CNY 100m'}];en.panels[0].rows[0].sources=[{label:'Source',url:'https://example.com/first'}];const zh=structuredClone(en);zh.locale='zh';zh.panels[0].rows[0].cells[0]={label:'收盘',text:'3,842.19 亿元'};zh.panels[0].rows[0].sources[0].label='来源';assert.deepEqual(compareReportFacts(en,zh),[]);
 zh.panels[0].rows[0].cells[0].text='9,999.99 亿元';assert.ok(compareReportFacts(en,zh).length);
 zh.panels[0].rows[0].cells[0].text='3,842.19 亿元';zh.panels[0].rows[0].sources[0].url='https://example.com/second';assert.ok(compareReportFacts(en,zh).length);
});
test('security codes survive locale changes and SVG row rendering',async()=>{
 const {compareReportFacts,checkReportDocument}=await import('../src/lib/report-quality.ts');const en=sample();en.panels[0].rows=[{id:'turnover-0',label:'宁德时代 300750',value:100,valueText:'100 CNY 100m'}];const zh=structuredClone(en);zh.locale='zh';zh.panels[0].rows[0].label='工商银行 600900';assert.ok(compareReportFacts(en,zh).length);
 const result=checkReportDocument(en,{},()=>'<svg width="960" height="100"><g data-report-row-panel="industry" data-report-row="turnover-0"><text>100 CNY 100m</text></g></svg>');assert.ok(result.issues.some(issue=>issue.code==='image_label_missing'));
});
