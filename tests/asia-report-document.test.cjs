const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const report = {id:'2026-10-23-evening',date:'2026-10-23',kind:'evening'};
test('complete current image inventory becomes numerical document panels', async () => {
 const {buildAsiaReportDocument} = await import('../src/lib/asia-report-document.ts');
 const doc = buildAsiaReportDocument(report, [], fs.readFileSync('artifacts/public/reports/2026-10-23-evening.md','utf8'), 'zh');
 for (const id of ['asia-overview','state','dimensions','indices','overview','distribution','intraday','limits','flow','financing','industry','turnover','concepts','movers','calibration']) assert.ok(doc.panels.some(p=>p.id===id),id);
 assert.equal(doc.panels.find(p=>p.id==='distribution').rows.length,12);
 assert.equal(doc.panels.find(p=>p.id==='distribution').rows[0].tone,'negative');
 assert.equal(doc.panels.find(p=>p.id==='distribution').rows[6].tone,'neutral');
 assert.equal(doc.panels.find(p=>p.id==='distribution').rows[7].tone,'positive');
 assert.ok(doc.panels.find(p=>p.id==='distribution').rows.every(row=>row.value>=0&&row.kind==='count'));
 assert.equal(doc.panels.find(p=>p.id==='indices').title,'指数总览');
 assert.equal(doc.panels.find(p=>p.id==='indices').rows.length,7);
 assert.equal(doc.panels.filter(p=>p.id==='industry'||p.id==='industry-additional').flatMap(p=>p.rows).length,10);
 assert.equal(doc.panels.filter(p=>p.id==='turnover'||p.id==='turnover-additional').flatMap(p=>p.rows).length,10);
 assert.ok(doc.panels.find(p=>p.id==='indices').rows[0].cells.some(c=>c.text==='3690.48'));
});
test('validated panels reject malformed distribution and retain warnings', async()=>{
 const {buildAsiaReportDocument}=await import('../src/lib/asia-report-document.ts');
 const source=fs.readFileSync('artifacts/public/reports/2026-10-23-evening.md','utf8');
 const doc=buildAsiaReportDocument(report,[],source.replace('-inf~-9.9%:16','-inf~-9.9%:17').replace('| 流动性 | 86.5 |','| 流动性 | 999 |'),'zh');
 assert.ok(!doc.panels.some(p=>p.id==='distribution'));
 assert.equal(doc.panels.find(p=>p.id==='dimensions').rows[0].value,undefined);
 assert.ok(doc.panels.find(p=>p.id==='overview').notes.some(s=>s.includes('涨跌分布:')));
 assert.ok(doc.panels.find(p=>p.id==='calibration').paragraphs.some(s=>s.includes('未回测')));
});
test('lower chart facts deduplicate only exact unit, value and explicit session date',async()=>{
 const {buildAsiaReportDocument}=await import('../src/lib/asia-report-document.ts');
 const point={label:'物理AI',value:8.27,unit:'%',observation_date:report.date,source_label:'Evidence',source_url:'https://example.com/evidence'};
 const source=fs.readFileSync('artifacts/public/reports/2026-10-23-evening.md','utf8');
 const cards=[{key:'topic',title:'topic',status:'ok',points:[point,{...point,observation_date:'2026-10-22'},{...point,unit:'亿'},{...point,value:8.28}]}];
 const doc=buildAsiaReportDocument(report,cards,source,'en');
 assert.equal(doc.panels.find(p=>p.id==='chart-topic').rows.length,3);
 const noDate=buildAsiaReportDocument(report,[{...cards[0],points:[point]}],source.replace('数据日期: 2026-10-23','数据日期: 2026-10-22'),'en');
 assert.equal(noDate.panels.find(p=>p.id==='chart-topic').rows.length,1);
 assert.equal(noDate.panels.find(p=>p.id==='indices').rows[0].observationDate,undefined);
});
test('stale Asia sessions and missing chart status stay visible without unsafe numbers',async()=>{
 const {buildAsiaReportDocument}=await import('../src/lib/asia-report-document.ts');
 const source=fs.readFileSync('artifacts/public/reports/2026-10-23-evening.md','utf8').replace('| 2026-10-23 | 23093.37','| 2026-10-22 | 23093.37');
 const doc=buildAsiaReportDocument(report,[{key:'dashboard',status:'missing',title:'dashboard',reason:'T+1 delayed',points:[{label:'bad',value:Infinity,unit:'亿',observation_date:report.date,source_label:'bad',source_url:'javascript:alert(1)'}]}],source,'en');
 assert.equal(doc.panels.find(p=>p.id==='asia-overview').rows.length,2);
 assert.ok(doc.panels.find(p=>p.id==='asia-overview-fallback'));
 assert.deepEqual(doc.panels.find(p=>p.id==='chart-dashboard').rows,[]);
 assert.ok(doc.panels.find(p=>p.id==='chart-dashboard').notes.includes('T+1 delayed'));
});
test('native view shares document and folds sanitized original source',()=>{
 const component=fs.readFileSync('src/components/AsiaNativeReport.astro','utf8');
 assert.match(component,/<ReportDocumentView document=\{document\}/);
 assert.match(component,/<details[^>]*><summary>/);
 assert.match(component,/renderMarkdown/);
 assert.doesNotMatch(component,/native\.bodyHtml|native\.returns/);
});
test('overview, limits and flow keep independent comparison denominators',async()=>{
 const {buildAsiaReportDocument}=await import('../src/lib/asia-report-document.ts');
 const doc=buildAsiaReportDocument(report,[],fs.readFileSync('artifacts/public/reports/2026-10-23-evening.md','utf8'),'zh');
 const panel=id=>doc.panels.find(p=>p.id===id);
 assert.deepEqual(panel('overview').rows.map(r=>r.value),[1.56,2.84]);
 assert.ok(panel('overview').rows.every(r=>r.kind==='signed'));
 assert.equal(panel('overview-turnover').rows[0].value,1.97);
 assert.equal(panel('overview-breadth').kind,'stack');
 assert.deepEqual(panel('overview-breadth').rows.map(r=>r.value),[4526,909,137]);
 assert.deepEqual(panel('overview-breadth').scale,[0,5572]);
 assert.equal(panel('overview-advance-rate').rows[0].value,81.2);
 assert.equal(panel('overview-advance-rate').rows[0].kind,'share');
 assert.deepEqual(panel('overview-advance-rate').rows[0].scale,[0,100]);
 assert.equal(panel('limits').kind,'stack');
 assert.deepEqual(panel('limits').rows.map(r=>r.value),[84,9]);
 assert.deepEqual(panel('limits-over-five').rows.map(r=>r.value),[572,95]);
 assert.equal(panel('limits-over-five').kind,'stack');
 assert.ok(panel('limits').notes.some(n=>n.includes('重叠')));
 assert.equal(panel('flow').rows[0].value,741.51);
 assert.equal(panel('flow').rows[0].kind,'signed');
 assert.equal(panel('flow').unit,'亿');
 assert.equal(panel('flow-counts').kind,'stack');
 assert.deepEqual(panel('flow-counts').rows.map(r=>r.value),[3142,2060]);
});
test('lower histories share stacked breadth and exact facts once; previews disclose remaining rows',async()=>{
 const {buildAsiaReportDocument}=await import('../src/lib/asia-report-document.ts');
 const point=(label,value,unit,observation_date)=>({label,value,unit,observation_date,source_label:'Verified',source_url:'https://example.com/source'});
 const turnover=[point('成交额 2026-10-21',12000,'亿','2026-10-21'),point('成交额 2026-10-22',15000,'亿','2026-10-22')];
 const breadth=['2026-10-21','2026-10-22'].flatMap(date=>['上涨家数','下跌家数','平盘家数'].map((label,i)=>point(`${label} ${date}`,100+i,'家',date)));
 const doc=buildAsiaReportDocument(report,[{key:'dashboard',status:'ok',title:'dashboard',points:turnover},{key:'weekly_chart',status:'degraded',title:'weekly',reason:'Partial source',points:[...turnover,...breadth,point('上涨家数 2026-10-20',90,'家','2026-10-20')]},{key:'moneyflow',status:'ok',title:'flow',points:[point('Netflow',-12,'亿',report.date)]},{key:'sentiment',status:'ok',title:'score',points:[point('Test score',23,'观察分',report.date)]}],fs.readFileSync('artifacts/public/reports/2026-10-23-evening.md','utf8'),'zh');
 const history=doc.panels.find(p=>p.id==='breadth-history');assert.equal(history.kind,'stack-history');assert.equal(history.series.length,3);assert.deepEqual(history.series[0].values.map(v=>v.date),['2026-10-21','2026-10-22']);
 assert.equal(doc.panels.filter(p=>p.kind==='line'&&p.title==='成交额').length,1);
 assert.ok(doc.panels.find(p=>p.id==='chart-weekly_chart').notes.includes('Partial source'));
 assert.ok(doc.panels.find(p=>p.id==='chart-weekly_chart').rows.some(r=>r.value===90));
 assert.equal(doc.panels.find(p=>p.id==='chart-moneyflow').rows[0].kind,'signed');
 assert.equal(doc.panels.find(p=>p.id==='chart-sentiment').rows[0].kind,'score');
 assert.deepEqual(doc.panels.find(p=>p.id==='chart-sentiment').rows[0].scale,[0,100]);
 for(const id of ['industry','turnover']){assert.equal(doc.panels.find(p=>p.id===id).rows.length,5);assert.equal(doc.panels.find(p=>p.id===`${id}-additional`).rows.length,5);assert.equal(doc.panels.find(p=>p.id===`${id}-additional`).disclosure,true);}
});
test('legacy holiday retains four independent market rows without A-share missing cards',async()=>{
 const {buildAsiaReportDocument}=await import('../src/lib/asia-report-document.ts');
 const holiday=`## 亚洲市场收盘复盘（20261023）\nA 股今日休市。\n| 市场 | 状态 | 收盘 | 涨跌幅 |\n| --- | --- | --- | --- |\n| A 股 | 休市 | — | — |\n| 香港 | 2026-10-23 | 25000.00 | +1.00% |\n| 日本 | 当日数据缺失 | — | — |\n| 韩国 | 休市 | — | — |\n## 数据来源\n- [Source](https://example.com/source)\n数据警告: 日本收盘缺项`;
 const doc=buildAsiaReportDocument(report,[],holiday,'zh');const panel=doc.panels.find(p=>p.id==='asia-sessions');
 assert.equal(panel.rows.length,4);assert.deepEqual(panel.rows.map(r=>r.value),[undefined,1,undefined,undefined]);assert.equal(panel.rows[1].observationDate,report.date);assert.equal(panel.rows[0].observationDate,undefined);
 assert.ok(!doc.panels.some(p=>p.id.startsWith('chart-')));assert.ok(doc.notes.some(s=>s.includes('日本收盘缺项')));assert.equal(doc.sources[0].url,'https://example.com/source');
 for(const source of [holiday.replace('（20261023）','（20261022）'),holiday.replace('25000.00','NaN'),holiday.replace('| 香港 | 2026-10-23','| 香港 | 2026-10-22')]){const stale=buildAsiaReportDocument(report,[],source,'zh');assert.ok(!stale.panels.some(p=>p.id==='asia-sessions'));}
});
test('modern mainland holiday renders only validated independent overview and source warnings',async()=>{
 const {buildAsiaReportDocument}=await import('../src/lib/asia-report-document.ts');
 const original=fs.readFileSync('artifacts/public/reports/2026-10-23-evening.md','utf8');
 const source=`## 亚洲市场收盘复盘（20261023）\nA 股今日休市。\n数据警告: A股休市\n${original.slice(original.indexOf('### 亚洲市场概览'))}`;
 const doc=buildAsiaReportDocument(report,[],source,'en');assert.equal(doc.panels.find(p=>p.id==='asia-overview').rows.length,3);assert.ok(!doc.panels.some(p=>p.id.startsWith('chart-')));assert.equal(doc.sources.length,3);assert.ok(doc.notes.length>0);
});
