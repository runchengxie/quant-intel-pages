const test=require('node:test');const assert=require('node:assert/strict');
test('row geometry separates score, signed, count and missing rows without invented values',()=>{
 const {reportRowGeometry}=require('../src/lib/report-document-geometry.ts');
 const panel={id:'test',title:'Test',kind:'rows',rows:[{id:'a',label:'a',value:-2,kind:'signed'},{id:'b',label:'b',value:4,kind:'signed'},{id:'c',label:'c',value:95,kind:'share'}]};
 const negative=reportRowGeometry(panel,panel.rows[0]);assert.equal(negative.zero,50);assert.equal(negative.left,25);assert.equal(negative.width,25);
 const share=reportRowGeometry(panel,panel.rows[2]);assert.equal(share.min,0);assert.equal(share.max,100);assert.equal(share.width,95);
 assert.equal(reportRowGeometry(panel,{id:'missing',label:'Missing'}),null);
 assert.equal(reportRowGeometry(panel,{id:'bad',label:'Bad',value:-5,kind:'count'}),null);
 assert.equal(reportRowGeometry(panel,{id:'bad',label:'Bad',value:Infinity,kind:'signed'}),null);
});
test('native theme CSS and inert SVG export share editorial colors and heading font',()=>{
 const {reportTheme,reportFonts,reportThemeCss}=require('../src/lib/report-theme.ts');const {buildReportSvg}=require('../src/lib/report-document-svg.ts');
 const svg=buildReportSvg({id:'test',title:'A < B',date:'2026-10-23',locale:'en',panels:[{id:'indices',title:'Indices',kind:'rows',unit:'%',rows:[{id:'spx',label:'S&P 500',value:-.52,valueText:'-0.52%',kind:'signed',cells:[{label:'Close',text:'7,623.68'}]}]}]});
 assert.match(svg,/A &lt; B/);assert.match(svg,/S&amp;P 500/);assert.match(svg,/7,623.68/);assert.match(svg,/data-table="indices"/);assert.ok(svg.includes(reportTheme.light.paper));assert.ok(svg.includes('Georgia'));
 assert.doesNotMatch(svg,/<style|<defs|foreignObject|class=|url\(/);assert.ok(reportThemeCss().includes(reportTheme.dark.paper));assert.ok(reportFonts.heading.includes('Georgia'));
});
