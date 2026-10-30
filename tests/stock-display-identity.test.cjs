const test=require('node:test');const assert=require('node:assert/strict');
test('A-share identity puts the supplied name before its supplied full market code',async()=>{
 const {formatStockIdentity}=await import('../src/lib/stock-display-identity.ts');
 for(const [input,output] of [['300308.SZ 中际旭创','中际旭创 300308.SZ'],['中际旭创 300308.SZ','中际旭创 300308.SZ'],['中际旭创 300308','中际旭创 300308'],['300308.SZ','300308.SZ'],['300308','300308'],['NVDA','NVDA'],['2026-10-29','2026-10-29']])assert.equal(formatStockIdentity(input),output);
});
test('named turnover, movers and money flow share an identity in both languages and exported images',async()=>{
 const {buildAsiaReportDocument}=await import('../src/lib/asia-report-document.ts');const {buildReportSvg}=await import('../src/lib/report-document-svg.ts');const {buildReportSectionImages}=await import('../src/lib/report-sections.ts');
 const markdown='数据日期: 2026-10-29\n### 八、高成交核心票 TOP10\n| 名称 | 代码 | 成交额(亿) | 涨跌 |\n|---|---|---|---|\n| 中际旭创 | 300308.SZ | 194.8 | -8.53% |\n### 十、极端异动\n跌幅前五: 300308.SZ 中际旭创(-8.53%)';
 const charts=[{key:'moneyflow',title:'资金流向',status:'ok',points:[{label:'300308.SZ 中际旭创',value:-15.812498999999999,unit:'亿元',observation_date:'2026-10-29',source_label:'source',source_url:'https://example.com/source'}]}];
 for(const locale of ['en','zh']){const doc=buildAsiaReportDocument({id:'2026-10-29-evening',date:'2026-10-29',kind:'evening'},charts,markdown,locale);for(const id of ['turnover','movers','chart-moneyflow']){const row=doc.panels.find(p=>p.id===id)?.rows[0];assert.equal(row?.label,'中际旭创 300308.SZ',id);}
 const svg=buildReportSvg(doc);assert.ok(svg.includes('中际旭创 300308.SZ'));assert.ok(!svg.includes('300308.SZ 中际旭创'));assert.ok(svg.includes('194.80'));assert.ok(svg.includes('-15.81'));assert.ok(!svg.replace(/<[^>]*>/g,'').includes('-15.812498999999999'));for(const section of buildReportSectionImages(doc))assert.ok(!section.svg.includes('300308.SZ 中际旭创'));
 }
});
test('legacy turnover remains readable and unnamed new rows retain their explicit market code',async()=>{
 const {reportTable}=await import('../src/lib/asia-report-tables.ts');const heading='### 八、高成交核心票 TOP10';
 assert.deepEqual(reportTable(heading+'\n| 代码 | 成交额(亿) | 涨跌 |\n|---|---|---|\n| 300308 | 194.8 | -8.53% |',heading).rows,[['300308','194.8','-8.53%']]);
 assert.deepEqual(reportTable(heading+'\n| 名称 | 代码 | 成交额(亿) | 涨跌 |\n|---|---|---|---|\n| N/A | 300308.SZ | 194.8 | -8.53% |',heading).rows,[['300308.SZ','194.8','-8.53%']]);
});
test('locale parity includes the explicitly supplied exchange suffix',async()=>{
 const {compareReportFacts}=await import('../src/lib/report-quality.ts');const en={id:'2026-10-29-evening',date:'2026-10-29',locale:'en',title:'Report',panels:[{id:'turnover',title:'Turnover',kind:'rows',rows:[{id:'turnover-0',label:'中际旭创 300308.SZ',value:194.8}]}]};const zh=structuredClone(en);zh.locale='zh';zh.panels[0].rows[0].label='中际旭创 300308.SH';assert.ok(compareReportFacts(en,zh).length);
});
