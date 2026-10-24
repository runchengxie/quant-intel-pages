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
