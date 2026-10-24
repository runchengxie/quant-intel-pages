const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildWeeklyTrend}=require('../src/lib/weekly-trend.ts');
const fields=[{key:'value',label:'Value',color:'#a65332'}];
test('native weekly plots preserve observation order and place zero between positive and negative values',()=>{
 const rows=[{date:'2026-10-16',value:-2},{date:'2026-10-23',value:3}];
 const chart=buildWeeklyTrend(rows,fields,true);
 assert.equal(chart.firstDate,rows[0].date);assert.equal(chart.lastDate,rows[1].date);
 assert.equal(chart.count,2);assert.ok(chart.ticks.some(t=>t.value===0));
 const points=chart.series[0].points.split(' ').map(p=>p.split(',').map(Number));
 assert.ok(points[0][0]<points[1][0]);assert.ok(points[0][1]>points[1][1]);
 assert.deepEqual(rows.map(r=>r.value),[-2,3]);
});
test('single, flat and bounded crowding plots remain finite and visible',()=>{
 for(const value of [0,7,Number.MAX_VALUE]){
  const chart=buildWeeklyTrend([{date:'2026-10-23',value}],fields);
  assert.equal(chart.count,1);assert.ok(!/NaN|Infinity/.test(chart.series[0].points));
  assert.ok(chart.ticks.every(t=>Number.isFinite(t.value)));
 }
 const chart=buildWeeklyTrend([{date:'2026-10-16',value:0},{date:'2026-10-23',value:1}],fields,false,[0,1]);
 assert.equal(chart.ticks[0].value,1);assert.equal(chart.ticks.at(-1).value,0);
});
test('invalid values, dates, order and bounds cannot turn into misleading SVG paths',()=>{
 for(const rows of [[],[{date:'bad',value:1}],[{date:'2026-02-30',value:1}],[{date:'2026-10-23',value:NaN}],[{date:'2026-10-23',value:Infinity}],[{date:'2026-10-23',value:1},{date:'2026-10-16',value:2}]]) assert.throws(()=>buildWeeklyTrend(rows,fields));
 assert.throws(()=>buildWeeklyTrend([{date:'2026-10-23',value:2}],fields,false,[0,1]));
});
