const test = require('node:test');
const assert = require('node:assert/strict');
const { reportLineGeometry, reportLineLabels, reportLineHasValueLabels } = require('../src/lib/report-document-geometry.ts');
const { buildReportSvg } = require('../src/lib/report-document-svg.ts');
const panel = {id:'financing',title:'融资余额',kind:'line',unit:'亿元',series:[{label:'融资余额',values:[{date:'2026-10-27',value:12345.6789},{date:'2026-10-28',value:12346},{date:'2026-10-29',value:12340.1}]}]};
test('line labels cover every original point with bounded positions and two decimals',()=>{
 const original=JSON.stringify(panel);const chart=reportLineGeometry(panel);
 for(const locale of ['zh','en']){
  const labels=reportLineLabels(chart.series[0],locale,0);
  assert.equal(labels.length,3);assert.deepEqual(labels.map(p=>p.text),['12,345.68','12,346.00','12,340.10']);
  assert.deepEqual(labels.map(p=>p.anchor),['start','middle','end']);
  assert.ok(labels.every(p=>p.x>=4&&p.x<=636&&p.y>=14&&p.y<=178));
  assert.deepEqual(labels.map(p=>p.value),panel.series[0].values.map(p=>p.value));
 }
 assert.equal(JSON.stringify(panel),original);
});
test('exported SVG carries every dated line label and formats money rows and cells',()=>{
 const svg=buildReportSvg({id:'test-evening',title:'Test',date:'2026-10-29',locale:'zh',panels:[panel,{id:'flow',title:'Flow',kind:'rows',rows:[{id:'main',label:'主力',kind:'signed',value:-123.456789,valueText:'-123.456789亿元',cells:[{label:'净额',text:'12.345678亿元'}]}]}]});
 for(const value of ['12,345.68','12,346.00','12,340.10']) assert.ok(svg.includes(value));
 assert.equal((svg.match(/data-line-label=/g)||[]).length,3);
 assert.match(svg,/data-date="2026-10-27"/);assert.match(svg,/-123.46亿元/);assert.match(svg,/12.35亿元/);
 assert.ok(svg.includes('data-value="12345.6789"'));
});
test('web view uses the same labels with a bounded horizontal chart viewport',()=>{
 const source=require('node:fs').readFileSync('src/components/ReportDocumentView.astro','utf8');
 assert.match(source,/reportLineLabels\(series,document.locale,i\)/);
 assert.match(source,/data-line-label/);assert.match(source,/overflow-x:auto/);assert.match(source,/min-width:/);
});

test('point labels target bilingual monetary histories without changing weekly lines',()=>{
 for(const title of ['成交额','成交额走势（亿）','融资余额','融资余额走势','Turnover','Turnover trend (CNY 100m)','Financing balance','Financing-balance trend']) assert.equal(reportLineHasValueLabels({...panel,title,series:[]}),true,title);
 for(const title of ['Turnover percentile','Weekly return','Price trend']) assert.equal(reportLineHasValueLabels({...panel,title,series:[]}),false,title);
 const weekly={...panel,title:'Weekly return',series:panel.series.map(series=>({...series,label:'Weekly return'}))};
 const svg=buildReportSvg({id:'weekly',title:'Weekly',date:'2026-10-29',locale:'en',panels:[weekly]});
 assert.doesNotMatch(svg,/data-line-label/);
});

test('all retained published evening documents fit the unchanged image height budget',()=>{
 const {loadReports,loadChart,loadMarkdown,VISUAL_REPORT_START_DATE}=require('../src/lib/reports.ts');
 const {buildAsiaReportDocument}=require('../src/lib/asia-report-document.ts');
 const retained=loadReports().filter(report=>report.kind==='evening'&&report.date>=VISUAL_REPORT_START_DATE);
 assert.ok(retained.length>0);
 for(const report of retained)for(const locale of ['en','zh']){
  const doc=buildAsiaReportDocument(report,loadChart(report.id),loadMarkdown(report),locale);
  const svg=buildReportSvg(doc);
  assert.ok(Number(/height="(\d+)"/.exec(svg)[1])<=8000,`${report.id} ${locale}`);
 }
});

test('compact export labels retain pixel offsets and stay within the short chart',()=>{
 const series=reportLineGeometry(panel).series[0];
 const labels=reportLineLabels(series,'en',0,72);
 assert.ok(labels.every(point=>point.y>=14&&point.y<=76));
 assert.equal(labels.length,series.values.length);
 const points=series.points.split(' ').map(point=>point.split(',').map(Number));
 const expected=8+(points[0][1]-8)/174*72-10;
 assert.equal(labels[0].y,Math.max(14,Math.min(76,expected)));
});
