const test = require('node:test');
const assert = require('node:assert/strict');
const date = '2026-10-16';
const legacy = '来源时间为交易所日历规定的实际收盘时间；日线时间戳仅标识当地交易日。';
const marker = (value = {date, source_time_kind:'exchange_session_close'}, version='v1') => `<!-- market_intel.asia_overview.${version} ${JSON.stringify(value)} -->`;
function body(metadata='') {
 const rows=['香港|恒生指数','日本|日经225','韩国|KOSPI'].map(pair=>`| ${pair.replace('|',' | ')} | ${date} | 100.00 | +1.00% | 已收盘 |`);
 const sources=['香港','日本','韩国'].map((market,i)=>`- [${market}收盘数据](https://example.com/${i})；${date}T${i?'06:30':'08:00'}:00+00:00；证据：\`asia.close.${String(i+1).repeat(64)}\``);
 return `### 亚洲市场概览\n| 市场 | 指数 | 数据日期 | 收盘 | 涨跌幅 | 状态 |\n| --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n${sources.join('\n')}\n${metadata}\n### 后续章节\n`;
}
test('versioned metadata selects time meaning independently of explanatory prose', async()=>{
 const {asiaMarketOverview}=await import('../src/lib/asia-market-overview.ts');
 for(const locale of ['zh-CN','en-US']){
  const result=asiaMarketOverview(body(marker()+'\nA freely edited explanation.'),date,locale);
  assert.equal(result.sourceTimeKind,'exchange_session_close');
  assert.equal(result.sourceTimeMetadataStatus,'structured');
  assert.equal(result.rows.length,3);
  assert.ok(result.notes.some(note=>note.includes(locale==='en-US'?'Daily bar timestamps':'日线时间戳')));
 }
});
test('legacy source wording is independent of locale display catalog', async()=>{
 const {ASIA_IMAGE_LABELS}=await import('../src/lib/locale.ts');
 const {asiaMarketOverview}=await import('../src/lib/asia-market-overview.ts');
 const original=ASIA_IMAGE_LABELS.sourceTimeSemantics[0];
 try{ASIA_IMAGE_LABELS.sourceTimeSemantics[0]='Updated display copy';
  const result=asiaMarketOverview(body(legacy),date,'zh-CN');
  assert.equal(result.sourceTimeMetadataStatus,'legacy');
  assert.equal(result.sourceTimeKind,'exchange_session_close');
  assert.ok(result.notes.includes('Updated display copy'));
 }finally{ASIA_IMAGE_LABELS.sourceTimeSemantics[0]=original;}
});
for(const [name,text] of [
 ['wrong date',marker({date:'2026-10-15',source_time_kind:'exchange_session_close'})],
 ['unknown kind',marker({date,source_time_kind:'provider_publication'})],
 ['unknown version',marker(undefined,'v2')],
 ['duplicate metadata',marker()+'\n'+marker()],
 ['unknown field',marker({date,source_time_kind:'exchange_session_close',extra:true})],
 ['duplicate JSON key',`<!-- market_intel.asia_overview.v1 {"date":"${date}","date":"${date}","source_time_kind":"exchange_session_close"} -->`],
 ['malformed',`<!-- market_intel.asia_overview.v1 {broken} -->`],
 ['oversized',`<!-- market_intel.asia_overview.v1 ${'x'.repeat(2049)} -->`],
])test(`invalid ${name} does not borrow the legacy sentence or discard market facts`,async()=>{
 const {asiaMarketOverview}=await import('../src/lib/asia-market-overview.ts');
 const result=asiaMarketOverview(body(text+'\n'+legacy),date,'en-US');
 assert.equal(result.sourceTimeMetadataStatus,'invalid');
 assert.equal(result.sourceTimeKind,undefined);
 assert.equal(result.rows.length,3);
 assert.ok(!result.notes.some(note=>note.includes('Daily bar timestamps')));
 assert.ok(result.notes.some(note=>note.includes('could not be verified')));
});
test('metadata outside its section has no authority and locales retain the same numeric facts',async()=>{
 const {asiaMarketOverview}=await import('../src/lib/asia-market-overview.ts');
 const source=body()+'\n'+marker();
 const en=asiaMarketOverview(source,date,'en-US'),zh=asiaMarketOverview(source,date,'zh-CN');
 assert.equal(en.sourceTimeMetadataStatus,'absent');
 assert.deepEqual(en.rows.map(row=>row.slice(2,5)),zh.rows.map(row=>row.slice(2,5)));
});

test('prose mentioning the format name cannot become a second metadata marker',async()=>{
 const {asiaMarketOverview}=await import('../src/lib/asia-market-overview.ts');
 const result=asiaMarketOverview(body(marker()+'\nDetails about market_intel.asia_overview.v1 may be reworded.'),date,'en-US');
 assert.equal(result.sourceTimeMetadataStatus,'structured');
});
