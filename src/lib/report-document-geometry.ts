import type {ReportPanel,ReportRow} from './report-document';
export function reportRowGeometry(panel:ReportPanel,row:ReportRow) {
 const value=row.value;
 if(typeof value!=='number'||!Number.isFinite(value))return null;
 if(['count','amount','share','score'].includes(row.kind||'')&&value<0)return null;
 const siblings=(panel.rows||[]).filter(r=>r.kind===row.kind&&typeof r.value==='number'&&Number.isFinite(r.value));
 const magnitude=Math.max(1,...siblings.map(r=>Math.abs(r.value!)));
 const bounds=row.scale??panel.scale??(row.kind==='signed'?[-magnitude,magnitude]:[0,row.kind==='share'||row.kind==='score'?100:magnitude]);
 const [min,max]=bounds;if(!Number.isFinite(min)||!Number.isFinite(max)||min>=max||value<min||value>max)return null;
 const zero=Math.max(0,Math.min(100,(0-min)/(max-min)*100));const end=(value-min)/(max-min)*100;
 return {min,max,zero,left:Math.min(zero,end),width:Math.abs(end-zero),tone:row.tone??(row.kind==='signed'?(value<0?'negative':value>0?'positive':'neutral'):'neutral')};
}
export function reportLineGeometry(panel:ReportPanel) {
 const series=(panel.series??[]).filter(s=>s.values.length&&s.values.every(r=>Number.isFinite(r.value)&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)));
 if(!series.length)return null;
 const values=series.flatMap(s=>s.values.map(r=>r.value));const scale=Math.max(...values.map(Math.abs),1);
 let low=Math.min(...values.map(v=>v/scale)),high=Math.max(...values.map(v=>v/scale));
 if(panel.scale){low=panel.scale[0]/scale;high=panel.scale[1]/scale;}else {const pad=low===high?.05:(high-low)*.06;low-=pad;high+=pad;}
 if(!Number.isFinite(low)||!Number.isFinite(high)||low>=high)return null;
 return {min:low*scale,max:high*scale,series:series.map(s=>({...s,points:s.values.map((r,i)=>`${(4+(s.values.length===1?.5:i/(s.values.length-1))*632).toFixed(2)},${(8+(high-r.value/scale)/(high-low)*174).toFixed(2)}`).join(' ')}))};
}

/** Shared text and in-plot anchors for browser and vector exports. Raw values stay intact. */
export function reportLineLabels(series:NonNullable<ReturnType<typeof reportLineGeometry>>['series'][number],locale:'zh'|'en',seriesIndex=0,plotHeight=174) {
 const points=series.points.split(' ').map(point=>point.split(',').map(Number));
 return series.values.map((point,index)=>({
  ...point,
  x:points[index][0],
  y:Math.max(14,Math.min(plotHeight+4,8+(points[index][1]-8)/174*plotHeight+(seriesIndex%2?17:-10))),
  anchor:series.values.length===1?'middle':index===0?'start':index===series.values.length-1?'end':'middle',
  text:point.value.toLocaleString(locale==='en'?'en-US':'zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}),
 }));
}

/** Only the requested monetary histories receive point labels; long weekly charts stay unchanged. */
export function reportLineHasValueLabels(panel:ReportPanel):boolean {
 return [panel.title,...(panel.series??[]).map(series=>series.label)].some(label=>
  /^(?:成交额(?:走势)?(?:（亿(?:元)?）)?|总成交|融资余额(?:走势)?|(?:total )?turnover(?: trend)?(?: \(CNY 100m\))?|financing(?:-| )balance(?: trend)?)$/i.test(label.trim()));
}
