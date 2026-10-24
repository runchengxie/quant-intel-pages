const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeMarketDaily } = require('../src/lib/market-daily-utils.ts');
const { buildUsNativeReport } = require('../src/lib/us-native-report.ts');
const payload = () => ({ schema_version:'1.0', run_id:'daily-2026-10-02', facts:[
 { id:'index.spx.change_percent',value:-1.2345, observation_date:'2026-10-02', quality:'reviewed',source_url:'https://issuer.test/review' },
 { id:'macro.cpi_yoy',value:3.4567, observation_date:'2026-08-01',quality:'ok',unit:'percent',source_url:'https://fred.stlouisfed.org/series/CPIAUCSL' }
], missing_sources:['research','quotes'] });
test('native model preserves every admitted fact, units, source and independent dates without deriving missing closes',()=>{
 const summary=summarizeMarketDaily(payload()); const model=buildUsNativeReport(summary,'en');
 assert.deepEqual(model.facts.map(r=>r.id),summary.rows.map(r=>r.id));
 assert.equal(model.facts[1].value,3.4567); assert.equal(model.facts[1].observationDate,'2026-08-01');
 assert.equal(model.facts[1].sourceUrl,'https://fred.stlouisfed.org/series/CPIAUCSL');
 assert.equal(model.charts[0].rows[0].side,'negative');
 assert.equal(model.tables[0].rows[0].value,undefined);
 assert.equal(model.sections.length,0); assert.ok(model.caveats.length);
});
test('date-only evidence retains precision and unknown timezone without synthesizing midnight',()=>{
 const p=payload(); p.events=[{id:'release', publication_precision:'date',source_date:'2026-10-02',source_timezone:'unknown',source_time:null}];
 p.claims=[{claim:'Verified release.',evidence_ids:['release'],sources:['https://issuer.test/release']}];
 const model=buildUsNativeReport(summarizeMarketDaily(p),'en');
 assert.equal(model.sections[0].claims[0].text,'Verified release.');
 assert.match(model.sections[0].claims[0].publication[0],/Date only.*Timezone unknown/);
 assert.doesNotMatch(model.sections[0].claims[0].publication[0],/T00:00/);
});
test('holiday Treasury values remain references and cannot enter same-day charts',()=>{
 const source_url='https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/all/202610?_format=csv&field_tdr_date_value_month=202610&page=&type=daily_treasury_yield_curve';
 const p={schema_version:'1.0',run_id:'daily-2026-10-12', source_status:{rates:{quality:'lagged',reason:'holiday_reference',session:'closed',expected_observation_date:'2026-10-09',observation_date:'2026-10-09',calendar_version:'sifma.us-bonds.2026-2027.v1',calendar_source:'https://www.sifma.org/resources/general/holiday-schedule',reference_rechecked_at:'2026-10-13T12:00:00Z'}}, facts:[
 {id:'treasury.10y.level_percent',metric:'yield_level',unit:'percent',value:5.24},
 {id:'treasury.10y.change_bp',metric:'yield_change',unit:'basis_points',value:2},
 ].map(f=>({...f,observation_date:'2026-10-09',quality:'lagged',source_url}))};
 const model=buildUsNativeReport(summarizeMarketDaily(p),'en');
 assert.equal(model.facts.length,2); assert.equal(model.charts.length,0); assert.equal(model.tables.length,0);
 assert.match(model.treasuryNote,/closed.*2026-10-09.*last trading session/);
 assert.match(model.treasuryChecked,/2026-10-13T12:00:00Z/);
});
test('complete claims are not truncated to primary three, and unsafe sources never gain admission',()=>{
 const p=payload(); p.claims=Array.from({length:5},(_,i)=>({claim:`Reviewed fact ${i}`,evidence_ids:[`e${i}`],sources:['https://issuer.test/release']}));
 p.events=p.claims.map((_,i)=>({id:`e${i}`})); p.sections=[{key:'drivers',claims:p.events.map(e=>e.id)}];
 const summary=summarizeMarketDaily(p); assert.equal(summary.primaryClaims[0].claims.length,3);
 const model=buildUsNativeReport(summary,'en'); assert.equal(model.sections[0].claims.length,5);
 p.claims[0].sources=['javascript:alert(1)']; assert.equal(summarizeMarketDaily(p),null);
});
test('key metrics pair only matching admitted index and observation date; missing close remains absent',()=>{
 const p=payload(); p.facts.push({id:'index.spx.close',value:6000.25,observation_date:'2026-10-02',quality:'ok',source:'Yahoo Finance',source_url:'https://finance.yahoo.com/quote/%5EGSPC/history/',metric:'index_close',unit:'points'});
 Object.assign(p.facts[0],{source:'Yahoo Finance',source_url:'https://finance.yahoo.com/quote/%5EGSPC/history/',quality:'ok',metric:'daily_return',unit:'percent'});
 for (const [key,symbol] of [['dow','%5EDJI'],['nasdaq','%5EIXIC'],['russell2000','%5ERUT']]) p.facts.push({...p.facts[0],id:`index.${key}.change_percent`,source_url:`https://finance.yahoo.com/quote/${symbol}/history/`});
 const summary=summarizeMarketDaily(p);
 assert.ok(summary);
 assert.equal(buildUsNativeReport(summary,'en').keyMetrics[0].close.value,6000.25);
 assert.equal(buildUsNativeReport(summarizeMarketDaily(payload()),'en').keyMetrics[0].close,undefined);
 const altered=structuredClone(summary); altered.rows.find(r=>r.id==='index.spx.close').observationDate='2026-10-01';
 assert.equal(buildUsNativeReport(altered,'en').keyMetrics[0].close,undefined);
 const different=structuredClone(summary); different.rows.find(r=>r.id==='index.spx.close').id='index.dow.close';
 assert.equal(buildUsNativeReport(different,'en').keyMetrics[0].close,undefined);
});
