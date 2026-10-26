const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

test('browser expectations follow the visible publication window and partial daily inputs',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'daily-browser-source-'));
 const previous=process.env.ASTRO_DATA_ROOT;
 try {
  mkdirSync(path.join(root,'data'));mkdirSync(path.join(root,'reports'));
  // An older evening remains in the index but has rolled out of the five-date window.
  const reports=Array.from({length:6},(_,i)=>{
   const date=`2032-01-${String(10+i).padStart(2,'0')}`;
   return {id:`${date}-evening`,date,kind:'evening',source_url:`reports/${date}-evening.md`};
  });
  writeFileSync(path.join(root,'data/reports.json'),JSON.stringify({schema_version:'market_intel_pages.reports.v1',reports}));
  const latest=reports.at(-1);
  writeFileSync(path.join(root,latest.source_url),'### 数据完整度与校准\nOptional market sections are unavailable.\n');
  const market={schema_version:'1.0',run_id:'daily-2032-01-15',facts:[
   {id:'index.spx.close',metric:'index_close',unit:'points',value:1234.56,quality:'ok'},
   {id:'index.spx.change_percent',metric:'daily_return',unit:'percent',value:-1.25,quality:'reviewed'},
  ].map(fact=>({...fact,observation_date:'2032-01-15',source:'Yahoo Finance',source_url:'https://finance.yahoo.com/quote/%5EGSPC/history/'})),missing_sources:['research']};
  writeFileSync(path.join(root,'data/market_daily_report.json'),JSON.stringify(market));
  process.env.ASTRO_DATA_ROOT=root;
  const source=require('./browser/daily-source.ts');
  assert.equal(source.eveningReports.length,5);
  assert.equal(source.latestEvening.id,'2032-01-15-evening');
  assert.equal(source.historicalEvening.id,'2032-01-11-evening');
  assert.equal(source.asiaNews,null);
  for(const locale of ['en','zh']) {
   const docs=source.dailyDocuments(locale);
   assert.equal(docs.us.panels.find(panel=>panel.id==='indices').rows.length,1);
   assert.equal(docs.us.panels.find(panel=>panel.id==='indices').rows[0].cells[0].text,'1,234.56');
   assert.ok(!docs.us.panels.some(panel=>['equities','treasury'].includes(panel.id)));
   assert.ok(!docs.asia.panels.some(panel=>panel.id==='indices'));
   assert.ok(docs.asia.panels.some(panel=>panel.id==='calibration'));
   assert.equal(docs.asia.panels.find(panel=>panel.id==='supplemental-chart-status').disclosure,true);
  }
 } finally {
  if(previous===undefined)delete process.env.ASTRO_DATA_ROOT;else process.env.ASTRO_DATA_ROOT=previous;
  rmSync(root,{recursive:true});
 }
});
