import type {ReportDocument,ReportPanel,ReportRow} from './report-document';
import {reportTheme,reportFonts} from './report-theme';
import {reportRowGeometry,reportLineGeometry} from './report-document-geometry';
import {reportDocumentLabels} from './report-document-labels';
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function wrapReportText(value:string,width=100):string[] {
 const lines:string[]=[];let line='',used=0;
 for(const word of value.match(/[A-Za-z0-9][A-Za-z0-9.,:/%+_−-]*\s*|./gu)??[]){const size=[...word].reduce((n,c)=>n+(/[\u2e80-\uffef]/u.test(c)?1:.55),0);if(used+size>width&&line){lines.push(line.trim());line='';used=0;}if(size>width){for(const c of word){if(used>=width){lines.push(line);line='';used=0;}line+=c;used+=/[\u2e80-\uffef]/u.test(c)?1:.55;}}else{line+=word;used+=size;}}
 if(line.trim())lines.push(line.trim());return lines;
}
/** Inert vector image of the exact document rendered by ReportDocumentView. */
export function buildReportSvg(document:ReportDocument):string {
 const t=reportDocumentLabels[document.locale],colors=reportTheme.light;
 const color=(key:keyof typeof colors)=>`var(--report-${({paper:'bg',surface:'bg',soft:'track'} as Record<string,string>)[key]??key}, ${colors[key]})`;
 const parts:string[]=[];let y=54;
 const node=(x:number,at:number,text:string,size=14,fill=color('ink'),anchor='start',heading=false)=>`<text x="${x}" y="${at}" font-family="${esc(heading?reportFonts.heading:reportFonts.body)}" font-size="${size}" fill="${fill}" text-anchor="${anchor}"${heading?' font-weight="600"':''}>${esc(text)}</text>`;
 const text=(value:string,size=13,fill=color('ink'),width=100,x=54,heading=false)=>{for(const line of wrapReportText(value,Math.min(width,Math.floor((906-x)/size)))){parts.push(node(x,y,line,size,fill,'start',heading));y+=size*(heading?1.35:1.65);}};
 const line=()=>parts.push(`<line x1="54" x2="906" y1="${y}" y2="${y}" stroke="${color('line')}"/>`);
 const sources=(items:ReportDocument['sources'])=>{const labels=[...new Set((items??[]).map(s=>{try{return `${s.label} · ${new URL(s.url,'https://example.invalid').hostname.replace('example.invalid','')}`;}catch{return s.label;}}))];if(labels.length)text(labels.join(' / '),11,color('muted'));};
 parts.push(node(54,y,'Q  QUANT MARKET INTEL',15,color('ink'),'start',true));parts.push(node(906,y,document.date,13,color('muted'),'end'));y+=27;line();y+=40;text(document.title,28,color('ink'),55,54,true);y+=4;text(`${t.observed} ${document.date}`,11,color('muted'));y+=8;
 const drawRow=(panel:ReportPanel,row:ReportRow)=>{
  const labelLines=wrapReportText(row.label,20);for(const label of labelLines){parts.push(node(54,y,label,14));y+=22;}
  const base=y-22;const geometry=reportRowGeometry(panel,row);
  if(row.valueText)parts.push(node(906,base,row.valueText,17,geometry?color(geometry.tone==='neutral'?'ink':geometry.tone):color('ink'),'end',true));
  if(row.cells?.length)parts.push(node(410,base,row.cells[0].text,13,color('ink'),'end'));
  if(geometry){parts.push(`<rect x="440" y="${base-11}" width="270" height="10" fill="${color('soft')}"/>`);parts.push(`<line x1="${440+geometry.zero*2.7}" x2="${440+geometry.zero*2.7}" y1="${base-15}" y2="${base+3}" stroke="${color('muted')}"/>`);parts.push(`<rect data-metric="${esc(row.id)}" data-value="${row.value}" x="${440+geometry.left*2.7}" y="${base-11}" width="${geometry.width*2.7}" height="10" fill="${color(geometry.tone==='neutral'?'negative':geometry.tone)}"/>`);}
  if(row.cells&&row.cells.length>1)text(row.cells.slice(1).map(cell=>`${cell.label}: ${cell.text}`).join(' · '),12,color('muted'));
  for(const detail of row.details??[])text(detail,11,color('muted'));
  if(row.observationDate&&row.observationDate!==document.date&&new Set((panel.rows??[]).map(r=>r.observationDate)).size!==1)text(`${t.observed} ${row.observationDate}${panel.unit?` · ${panel.unit}`:''}`,11,color('muted'));
  if(row.scale&&geometry&&new Set((panel.rows??[]).map(r=>JSON.stringify(r.scale))).size!==1)text(`${t.axis}: ${geometry.min} … ${geometry.max}${panel.unit?` ${panel.unit}`:''}`,10,color('muted'));
  y+=2;line();y+=10;
 };
 for(const panel of document.panels){
  if(panel.disclosure)continue;
  parts.push(`<g data-report-panel="${esc(panel.id)}" data-table="${esc(panel.id)}">`);y+=6;line();y+=24;text(panel.title,19,color('ink'),65,54,true);if(panel.unit)text(panel.unit,10,color('muted'));const rowDates=[...new Set((panel.rows??[]).flatMap(r=>r.observationDate?[r.observationDate]:[]))];if(rowDates.length===1&&rowDates[0]!==document.date)text(`${t.observed} ${rowDates[0]}`,10,color('muted'));const firstCell=panel.rows?.find(r=>r.cells?.length)?.cells?.[0];if(firstCell)parts.push(node(410,y-5,firstCell.label,10,color('muted'),'end'));const commonScale=panel.rows?.length&&new Set(panel.rows.map(r=>JSON.stringify(r.scale))).size===1?panel.rows[0].scale:undefined;if(commonScale)text(`${t.axis}: ${commonScale[0]} … ${commonScale[1]}`,10,color('muted'));y+=4;
  if(panel.kind==='stack'&&panel.rows?.length){const total=panel.rows.reduce((n,r)=>n+(Number.isFinite(r.value)&&r.value!>=0?r.value!:0),0);let left=54;panel.rows.forEach((row,i)=>{const width=total?852*(row.value??0)/total:0;parts.push(`<rect data-count="${esc(row.id)}" data-value="${row.value??0}" x="${left}" y="${y}" width="${width}" height="16" fill="${color((row.tone??(['positive','negative','muted'][i%3])) as keyof typeof colors)}"/>`);left+=width;});y+=38;for(const row of panel.rows)text(`${row.label}: ${row.valueText??row.value??'—'}`,13);y+=8;}
  else if(panel.kind==='stack-history'&&panel.series?.length){
   const series=panel.series;const dates=series[0].values.map(r=>r.date);text(series.map(s=>s.label).join(' / '),11,color('muted'));
   for(const date of dates){const values=series.map(s=>s.values.find(r=>r.date===date)?.value);if(values.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0))continue;const total=values.reduce<number>((n,v)=>n+(v??0),0);parts.push(node(54,y+13,date,11,color('muted')));let x=170;values.forEach((v,i)=>{const width=total?v!/total*440:0;parts.push(`<rect x="${x}" y="${y}" width="${width}" height="15" fill="${color((['positive','negative','muted'][i%3]) as keyof typeof colors)}"/>`);x+=width;});parts.push(node(906,y+13,values.join(' / '),11,color('ink'),'end'));y+=30;}
   y+=12;
  }
  else if(panel.kind==='line'){
   const chart=reportLineGeometry(panel);if(chart){const top=y+12;const plotHeight=Math.max(...chart.series.map(s=>s.values.length))<=7?72:174;[0,.5,1].forEach(v=>{const at=top+v*plotHeight;parts.push(`<line x1="100" x2="906" y1="${at}" y2="${at}" stroke="${color('line')}"/>`);parts.push(node(88,at+4,(chart.max-(chart.max-chart.min)*v).toLocaleString(document.locale==='en'?'en-US':'zh-CN',{maximumFractionDigits:2}),10,color('muted'),'end'));});for(const [i,series]of chart.series.entries()){const points=series.points.split(' ').map(p=>{const [x,at]=p.split(',').map(Number);return `${100+(x-4)/632*806},${top+(at-8)/174*plotHeight}`;}).join(' ');parts.push(`<polyline points="${points}" fill="none" stroke="${color(i%2?'negative':'positive')}" stroke-width="2"/>`);}y=top+plotHeight+21;for(const series of chart.series)text(`${series.label} · ${series.values[0].date} — ${series.values.at(-1)!.date} · ${series.values.length} ${t.observations}`,11,color('muted'));y+=15;}else text(t.missing,12,color('muted'));
  }else for(const row of panel.rows??[]) {if(panel.kind==='text'){text(row.label);for(const detail of row.details??[])text(detail,12,color('muted'));sources(row.sources);y+=10;}else drawRow(panel,row);}
  for(const paragraph of panel.paragraphs??[]) {text(paragraph);y+=8;}
  for(const note of panel.notes??[])if(note.trim())text(note,12,color('muted'));
  sources([...(panel.sources??[]),...(panel.rows??[]).flatMap(row=>row.sources??[])]);parts.push('</g>');y+=14;
 }
 for(const note of document.notes??[])text(note,12,color('muted'));
 y+=8;line();y+=25;text(t.scope,11,color('muted'));if(document.sources?.length)text(t.source,12,color('muted'));sources(document.sources);y+=20;
 if(!Number.isFinite(y)||y>8000)throw new Error(`Report image exceeds bounded delivery height (${Math.ceil(y)})`);
 const height=Math.ceil(y);return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="${height}" viewBox="0 0 960 ${height}" role="img"><title>${esc(document.title)} · ${document.date}</title><rect width="960" height="${height}" fill="${color('paper')}"/>${parts.join('')}</svg>`;
}
