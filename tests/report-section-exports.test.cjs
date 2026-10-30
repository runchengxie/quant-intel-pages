const test=require('node:test');const assert=require('node:assert/strict');
const document={id:'2026-10-29-evening',date:'2026-10-29',locale:'en',title:'Asia review',notes:['Sample limitation'],sources:[{label:'Publisher',url:'https://example.com/source'}],panels:[{id:'indices',title:'Indices',kind:'rows',rows:[{id:'index',label:'Index',value:1.234,valueText:'1.23%'}]},{id:'industry',title:'Industries',kind:'rows',rows:[{id:'industry-1',label:'Industry',value:-2,valueText:'-2%'}]},{id:'chart-moneyflow',title:'Money flow',kind:'rows',rows:[{id:'flow-1',label:'Flow',value:2.9823310000000003,valueText:'2.9823310000000003亿元'}]},{id:'trend-dashboard-2',title:'Turnover',kind:'line',series:[{label:'Turnover',values:[{date:'2026-10-28',value:100},{date:'2026-10-29',value:200}]}]},{id:'research-details',title:'Details',kind:'text',disclosure:true,paragraphs:['Raw research']} ]};
test('section exports partition all admitted panels without mutating facts or dropping provenance',async()=>{
 const {buildReportSections}=await import('../src/lib/report-sections.ts');
 const before=JSON.stringify(document);const sections=buildReportSections(document);
 assert.deepEqual(sections.map(s=>s.key),['overview','rankings','money-flow','history']);
 assert.deepEqual(sections.flatMap(s=>s.document.panels.map(p=>p.id)),document.panels.filter(p=>!p.disclosure).map(p=>p.id));
 for(const section of sections){assert.equal(section.document.date,document.date);assert.equal(section.document.locale,'en');assert.deepEqual(section.document.sources,document.sources);assert.deepEqual(section.document.notes,document.notes);assert.ok(section.document.title.includes(section.label));}
 assert.equal(JSON.stringify(document),before);
 assert.equal(sections.find(s=>s.key==='money-flow').document.panels[0].rows[0].value,2.9823310000000003);
});
test('section SVGs keep dates, safe source text and locale labels with no whole-image duplication',async()=>{
 const {buildReportSectionImages}=await import('../src/lib/report-sections.ts');
 for(const locale of ['zh','en']){
  const images=buildReportSectionImages({...document,locale});
  assert.equal(images.length,4);for(const image of images){assert.match(image.svg,/2026-10-29/);assert.match(image.svg,/example.com/);assert.ok(Number(/height="(\d+)"/.exec(image.svg)[1])<=8000);assert.doesNotMatch(image.svg,/Raw research/);}
  assert.equal(images.find(s=>s.key==='rankings').label,locale==='zh'?'行业与排名':'Industries and rankings');
 }
});
test('large whole report can export admitted sections without relaxing the SVG height limit',async()=>{
 const {buildReportSectionImages,buildWholeReportImage}=await import('../src/lib/report-sections.ts');
 const long={...document,panels:document.panels.filter(p=>!p.disclosure).map(p=>({...p,rows:Array.from({length:70},(_,i)=>({id:`${p.id}-${i}`,label:`${p.id} observation ${i}`,valueText:'1.23'})),kind:'rows',series:undefined}))};
 assert.equal(buildWholeReportImage(long),null);
 assert.equal(buildReportSectionImages(long).length,4);
});
test('invalid section identity is rejected before allocating browser resources',async()=>{
 const {downloadMarketChartPng}=await import('../src/lib/market-chart-download.ts');
 for(const key of ['../private','money/flow','', 'A','a'.repeat(65),null,{},1])await assert.rejects(downloadMarketChartPng({},'2026-10-29','asia-daily',key),/section/i);
});
test('whole export suppresses only the typed height budget error',async()=>{
 const {buildWholeReportImage}=await import('../src/lib/report-sections.ts');
 const {buildReportSvg,ReportImageBudgetError}=await import('../src/lib/report-document-svg.ts');
 const long={...document,panels:[{id:'long',title:'Long',kind:'text',paragraphs:Array(600).fill('A retained paragraph')}]};
 assert.throws(()=>buildReportSvg(long),error=>error instanceof ReportImageBudgetError&&error.code==='report_image_height_exceeded'&&error.height>8000);
 assert.equal(buildWholeReportImage(long),null);
 assert.throws(()=>buildWholeReportImage({...document,locale:'invalid'}));
});
test('missing or unverified money-flow observations remain absent while source availability stays visible',async()=>{
 const fs=require('node:fs');const {buildAsiaReportDocument}=await import('../src/lib/asia-report-document.ts');const {buildReportSectionImages}=await import('../src/lib/report-sections.ts');
 const report={id:'2026-10-23-evening',date:'2026-10-23',kind:'evening'};const markdown=fs.readFileSync('tests/fixtures/asia-document/reports/2026-10-23-evening.md','utf8');
 for(const locale of ['en','zh'])for(const status of ['missing','skipped']){
  const reason='No verified money-flow observations';const chart={key:'moneyflow',title:'Money flow',status,reason,points:[{label:'Unverified stock 300308.SZ',value:123.45678,unit:'亿元',observation_date:report.date,source_label:'source',source_url:'https://example.com/source'}]};
  const doc=buildAsiaReportDocument(report,[chart],markdown,locale);assert.ok(!doc.panels.some(panel=>panel.id==='chart-moneyflow'));assert.ok(doc.panels.find(panel=>panel.id==='supplemental-chart-status').paragraphs.join(' ').includes(reason));
  const section=buildReportSectionImages(doc).find(section=>section.key==='money-flow');assert.ok(section);assert.ok(!section.document.panels.some(panel=>panel.id==='chart-moneyflow'));assert.ok(!section.svg.includes('123.45678'));
 }
});
