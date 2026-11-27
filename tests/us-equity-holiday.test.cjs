const test=require('node:test');
const assert=require('node:assert/strict');
const {summarizeMarketDaily,buildMarketDailyTables,buildMarketDailyCharts,buildMarketDailyChartSvg,formatMarketDailyStatus}=require('../src/lib/market-daily-utils.ts');
const {buildUsReportDocument}=require('../src/lib/us-report-document.ts');
const {buildUsNativeReport}=require('../src/lib/us-native-report.ts');
function payload(date='2026-11-26',observed='2026-11-25'){
 const status={quality:'lagged',session:'closed',reason:'holiday_reference',expected_observation_date:observed,observation_date:observed,calendar_version:'xnys.2025-2027.v1',calendar_source:'https://www.nyse.com/markets/hours-calendars'};
 const facts=[];
 for(const [key,symbol] of [['spx','%5EGSPC'],['dow','%5EDJI'],['nasdaq','%5EIXIC'],['russell2000','%5ERUT']])for(const field of ['close','change_percent'])facts.push({id:`index.${key}.${field}`,value:field==='close'?6000.25:1.005,metric:field==='close'?'index_close':'daily_return',unit:field==='close'?'points':'percent',source:'Yahoo Finance',source_url:`https://finance.yahoo.com/quote/${symbol}/history/`,observation_date:observed,quality:'lagged'});
 for(const field of ['close','change_percent'])facts.push({id:`equity.msft.${field}`,value:field==='close'?41.235:-1.005,metric:field==='close'?'stock_close':'daily_return',unit:field==='close'?'USD/share':'percent',instrument:'MSFT',source:'Yahoo Finance',source_url:'https://finance.yahoo.com/quote/MSFT/history/',observation_date:observed,quality:'lagged'});
 return {schema_version:'1.0',run_id:`daily-${date}`,facts,source_status:{quotes:{...status},equities:{...status}},missing_sources:[]};
}
test('Thanksgiving references survive validation, paired panels and both report languages',()=>{
 const p=payload();const s=summarizeMarketDaily(p);assert.ok(s);assert.equal(s.equityReferenceDate,'2026-11-25');assert.match(formatMarketDailyStatus(s),/休市.*2026-11-25/);
 assert.equal(buildMarketDailyTables(s).find(t=>t.title==='indices').rows.length,4);
 assert.equal(buildMarketDailyCharts(s).find(t=>t.prefix==='equity.').rows.length,1);
 for(const locale of ['en','zh']){
  const doc=buildUsReportDocument(s,locale);const panel=doc.panels.find(p=>p.id==='equities');assert.ok(panel);assert.equal(panel.rows[0].observationDate,'2026-11-25');assert.match(panel.rows[0].cells[0].text,/41.24/);assert.match(panel.rows[0].valueText,/-1.01/);
  assert.match(panel.notes.join(' '),locale==='en'?/closed.*2026-11-25/:/休市.*2026-11-25/);
  assert.match(buildMarketDailyChartSvg(s,undefined,locale==='en'?'en-US':'zh-CN'),locale==='en'?/last.session/i:/上一交易日/);
 }
 assert.equal(buildUsNativeReport(s,'en').keyMetrics.length,4);
 assert.equal(p.facts.at(-2).value,41.235);
});
test('forged dates, calendar identity and open-day stale references fail closed',()=>{
 for(const mutate of [p=>p.source_status.quotes.calendar_version='forged',p=>p.source_status.equities.calendar_source='https://example.com',p=>p.source_status.quotes.expected_observation_date='2026-11-24',p=>p.facts[0].observation_date='2026-11-24',p=>p.facts[0].quality='ok',p=>p.source_status.quotes.session='open']){const p=payload();mutate(p);assert.equal(summarizeMarketDaily(p),null);}
 assert.equal(summarizeMarketDaily(payload('2026-11-27')),null);
 assert.equal(summarizeMarketDaily(payload('2026-10-12','2026-10-09')),null);
});
test('bond-only holiday and early stock close retain current stock observations',()=>{
 for(const date of ['2026-10-12','2026-11-27']){const p=payload(date,date);delete p.source_status;for(const f of p.facts)f.quality='ok';const s=summarizeMarketDaily(p);assert.ok(s);assert.equal(s.equityReferenceDate,undefined);assert.equal(buildMarketDailyTables(s)[0].rows.length,4);}
 const artifact=require('../src/data/equity_sessions_v1.json');assert.equal(artifact.session_closes['2026-11-27'],'2026-11-27T18:00:00+00:00');
});
test('whole-report images and downloadable document retain reference labels and rounded prices',()=>{
 const {buildUsEditorialSvg}=require('../src/lib/report-exports.ts');const {buildWholeReportImage}=require('../src/lib/report-sections.ts');
 const s=summarizeMarketDaily(payload());
 for(const locale of ['en','zh']){const document=buildUsReportDocument(s,locale);const svg=buildWholeReportImage(document);assert.match(svg,/41.24/);assert.match(svg,locale==='en'?/closed; reference from 2026-11-25/:/休市；参考上一交易日 2026-11-25/);assert.equal(buildUsEditorialSvg(s,undefined,locale==='en'?'en-US':'zh-CN'),svg);assert.match(document.panels.find(p=>p.id==='equities').rows[0].records.join(' '),/41.235/);}
});
test('forged holiday metadata is rejected even when the attached quotes look current',()=>{
 const p=payload('2026-11-27','2026-11-27');for(const f of p.facts)f.quality='ok';assert.equal(summarizeMarketDaily(p),null);
});
test('degraded holiday groups retain verified available references and their missing-data warning',()=>{
 const p=payload();p.source_status.equities.quality='degraded';p.missing_sources=['equities'];
 const s=summarizeMarketDaily(p);assert.ok(s);assert.equal(s.equityRows[0].symbol,'MSFT');assert.equal(s.equityReferenceDate,'2026-11-25');assert.match(s.gaps.join(' '),/个股/);assert.equal(buildMarketDailyTables(s).find(t=>t.title==='equities').rows.length,1);
 p.facts.at(-1).observation_date='2026-11-24';assert.equal(summarizeMarketDaily(p),null);
});
test('US image header identifies report date while panels retain their separate observation dates',()=>{
 const {buildWholeReportImage}=require('../src/lib/report-sections.ts');
 const {buildReportSvg}=require('../src/lib/report-document-svg.ts');
 for(const locale of ['en','zh']){
  const document=buildUsReportDocument(summarizeMarketDaily(payload()),locale);const svg=buildWholeReportImage(document);
  const header=svg.split('<g data-report-panel=')[0];
  assert.match(header,new RegExp(`${locale==='en'?'Report date':'报告日'} 2026-11-26`));
  assert.doesNotMatch(header,new RegExp(`${locale==='en'?'Observed':'观测日'} 2026-11-26`));
  assert.match(svg,new RegExp(`${locale==='en'?'Observed':'观测日'} 2026-11-25`));
  const other={id:'asia',title:'Independent market observations',date:'2026-11-26',locale,panels:[]};
  assert.match(buildReportSvg(other),new RegExp(`${locale==='en'?'Observed':'观测日'} 2026-11-26`));
 }
});
