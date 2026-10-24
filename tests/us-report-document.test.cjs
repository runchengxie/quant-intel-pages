const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeMarketDaily } = require('../src/lib/market-daily-utils.ts');
const { buildUsReportDocument } = require('../src/lib/us-report-document.ts');
function summary() { const s = summarizeMarketDaily({schema_version:'1.0',run_id:'daily-2026-10-02',facts:[
{id:'index.spx.close',metric:'index_close',unit:'points',value:6000.25},
{id:'index.spx.change_percent',metric:'daily_return',unit:'percent',value:-1.25,quality:'reviewed'},
].map(f=>({...f,observation_date:'2026-10-02',quality:f.quality??'ok',source:'Yahoo Finance',source_url:'https://finance.yahoo.com/quote/%5EGSPC/history/'})),missing_sources:['research']}); assert.ok(s); return s; }
test('one security row combines admitted level, signed change, source, units and date',()=>{
 const d=buildUsReportDocument(summary(),'en'); const p=d.panels.find(p=>p.id==='indices');
 assert.equal(p.rows.length,1); assert.equal(p.rows[0].id,'index.spx'); assert.equal(p.rows[0].value,-1.25);
 assert.match(p.rows[0].valueText,/-1.25%/); assert.match(p.rows[0].cells[0].text,/6,000.25/);
 assert.match(p.rows[0].cells[0].label,/points/); assert.equal(p.rows[0].observationDate,'2026-10-02');
 assert.equal(p.rows[0].sources[0].url,'https://finance.yahoo.com/quote/%5EGSPC/history/');
 assert.equal(d.panels.flatMap(p=>p.rows??[]).filter(r=>r.id==='index.spx').length,1);
});
test('partial pairs stay explicit and different observation dates never pair',()=>{
 const s=summary(); s.rows[0].observationDate='2026-10-01';
 const d=buildUsReportDocument(s,'en'); const r=d.panels.find(p=>p.id==='indices').rows[0];
 assert.match(r.cells[0].text,/Unavailable/); assert.equal(r.value,-1.25);
 assert.ok(d.panels.flatMap(p=>p.rows??[]).some(r=>r.observationDate==='2026-10-01'));
});
test('all reviewed claims retain date-only precision and source records',()=>{
 const s=summary(); s.claimSections=[{key:'drivers',title:'市场驱动因素',claims:Array.from({length:5},(_,i)=>({text:`Claim ${i}`,sourceUrls:['https://issuer.test/release'],sectionKey:'drivers',publication:[{id:`e${i}`,publication_precision:'date',source_date:'2026-10-02',source_timezone:'unknown'}]}))}];
 const d=buildUsReportDocument(s,'en'); const p=d.panels.find(p=>p.id==='research-drivers');
 assert.equal(p.rows.length,5); assert.match(p.rows[0].details.join(' '),/Date only.*Timezone unknown/); assert.doesNotMatch(JSON.stringify(p),/T00:00/);
 assert.ok(d.sources.some(s=>s.url==='https://issuer.test/release'));
});
test('holiday Treasury references keep last-session meaning outside same-day axes',()=>{
 const s=summary(); s.treasuryReferenceDate='2026-10-01'; s.treasuryReferenceCheckedAt='2026-10-02T12:00:00Z';
 s.rows=[{...s.rows[0],id:'treasury.10y.level_percent',label:'10 年期美债',value:4.2,unit:'percent',quality:'lagged',observationDate:'2026-10-01'}, {...s.rows[1],id:'treasury.10y.change_bp',label:'10 年期美债',value:2,unit:'basis_points',quality:'lagged',observationDate:'2026-10-01'}];
 const d=buildUsReportDocument(s,'en'); assert.ok(!d.panels.some(p=>p.id==='treasury'));
 const p=d.panels.find(p=>p.id==='treasury-reference'); assert.equal(p.rows.length,1); assert.match(p.notes.join(' '),/last trading session/); assert.match(p.notes.join(' '),/2026-10-02T12:00:00Z/);
});
test('equities, rates and cross assets keep independent change axes and pair-specific units',()=>{
 const s=summary(); const base=s.rows[0];
 s.rows.push(...[
 ['equity.aapl.close',200,'USD/share'],['equity.aapl.change_percent',1.5,'percent'],
 ['treasury.10y.level_percent',4.2,'percent'],['treasury.10y.change_bp',-3,'basis_points'],
 ['cross_asset.brent.close',85,'USD/barrel'],['cross_asset.brent.change_percent',2,'percent'],
 ].map(([id,value,unit])=>({...base,id,value,unit,label:id.startsWith('equity')?'AAPL':id.startsWith('treasury')?'10 年期美债':'布伦特原油'})));
 const d=buildUsReportDocument(s,'en');
 for(const key of ['indices','equities','treasury','crossAssets']) assert.equal(d.panels.find(p=>p.id===key).rows.length,1);
 assert.equal(d.panels.find(p=>p.id==='treasury').unit,'bp');
 assert.equal(d.panels.find(p=>p.id==='crossAssets').unit,'%');
 assert.match(d.panels.find(p=>p.id==='crossAssets').rows[0].cells[0].text,/USD\/barrel/);
 const partial=structuredClone(s); partial.rows=partial.rows.filter(r=>r.id!=='equity.aapl.change_percent');
 const row=buildUsReportDocument(partial,'en').panels.find(p=>p.id==='equities').rows[0];
 assert.equal(row.value,undefined); assert.equal(row.valueText,'Unavailable');
});
test('remaining macro facts and all revision/gap notices remain accessible',()=>{
 const s=summary(); s.rows.push({...s.rows[0],id:'macro.cpi_yoy',label:'CPI',value:3.4,unit:'percent',observationDate:'2026-08-01'});
 s.newsRevision={factCutoff:'2026-10-02T20:00:00Z',newsCutoff:'2026-10-03T09:00:00Z',revisedAt:'2026-10-03T10:00:00Z'};
 s.gaps=['research']; s.optionalGaps=['bitcoin_futures']; s.nextMorningRevision=true;
 const d=buildUsReportDocument(s,'en');
 assert.equal(d.panels.find(p=>p.id==='additional-observations').rows[0].observationDate,'2026-08-01');
 const status=d.panels.find(p=>p.id==='data-status').paragraphs.join(' ');
 for(const timestamp of Object.values(s.newsRevision)) assert.ok(status.includes(timestamp));
 assert.match(status,/research/); assert.match(status,/Bitcoin futures/);
});
