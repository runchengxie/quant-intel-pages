const test=require('node:test');const assert=require('node:assert/strict');
const {formatMarketNumber}=require('../src/lib/market-number.ts');
test('decimal half increments match Python ROUND_HALF_UP and normalize negative zero',()=>{
 for(const [value,expected] of [[41.235,'41.24'],[-41.235,'-41.24'],[1.005,'1.01'],[-1.005,'-1.01'],[-0.004,'0.00'],[-0,'0.00']])assert.equal(formatMarketNumber(value),expected);
});
