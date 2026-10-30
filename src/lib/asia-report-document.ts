import { formatStockIdentity } from './stock-display-identity.ts';
import type { ReportDocument, ReportPanel, ReportRow } from './report-document.ts';
import type { LoadedCharts } from './reports.ts';
import type { ChartPoint } from './chart-data.ts';
import { holidayRows } from './asia-holiday-sessions.ts';
import { asiaMarketOverview } from './asia-market-overview.ts';
import { reportTable, sectionLines, dailyReturn } from './asia-report-tables.ts';
import { renderReportPanel, normalizePanelLine, type Draw } from './asia-report-panels.ts';
import { toEnglishPresentation } from './english-content.ts';
import { asiaImageLabel } from './locale.ts';
import { ASIA_DOCUMENT_LOCALE } from './asia-document-locale.ts';
import { ASIA_RESEARCH_LOCALE } from './asia-research-locale.ts';

/** Published source adapters share the image validators; no market facts are inferred. */
export function buildAsiaReportDocument(report: {id:string;date:string;kind:string;summary?:unknown}, charts:LoadedCharts, markdown:string, locale:'en'|'zh'): ReportDocument {
 const labels = ASIA_DOCUMENT_LOCALE[locale];
 const present = (s:string) => locale === 'en' ? toEnglishPresentation(s) : s;
 const sectionTitle=(heading:string)=>present(heading.replace(/^#+\s*/,'').replace(/^[一二三四五六七八九十]+、/,''));
 const panels:ReportPanel[]=[];
 if(typeof report.summary==='string'&&report.summary.trim()&&!markdown.includes(report.summary.trim()))panels.push({id:'summary',title:labels.title,kind:'text',paragraphs:[present(report.summary.trim())]});
 const metadata=markdown.split(/^### /m,1)[0];
 const dates=[...metadata.matchAll(/^(?:- )?数据日期[:：]\s*(\d{4}-\d{2}-\d{2})\s*$/gm)].map(m=>m[1]);
 const date=dates.length && dates.every(d=>d===report.date)?report.date:undefined;
 const facts=new Set<string>();
 const fact=(label:string,value:number,unit:string,observationDate?:string)=>JSON.stringify([label,value,unit,observationDate]);
 const remember=(label:string,value:number,unit:string,observationDate?:string)=>{facts.add(fact(label,value,unit,observationDate));const aliases:Record<string,string>={'上涨':'上涨家数','下跌':'下跌家数','平盘':'平盘家数','涨停':'涨停家数','最高连板':'最高连板','全市场中位数涨跌':'中位数涨跌','总成交':'成交额'};if(aliases[label])facts.add(fact(aliases[label],value,unit,observationDate));};
 const fallback=(id:string,lines:string[])=>{if(lines.length) panels.push({id:`${id}-fallback`,title:labels.fallback,kind:'text',paragraphs:lines.map(present)});};
 const text=(id:string,heading:string)=>{const lines=sectionLines(markdown,heading).filter(line=>!/^N\/A$/i.test(normalizePanelLine(line)));if(id==='financing'&&lines.every(line=>/^两融数据暂缺(?:[（(]T\+1\s*延迟[）)])?[。. ]*$/.test(normalizePanelLine(line))))return;if(lines.length)panels.push({id,title:sectionTitle(heading),kind:'text',paragraphs:lines.map(line=>present(normalizePanelLine(line)))});};
 const warnings=markdown.split('\n').filter(l=>/休市|当日数据缺失|未收盘|数据警告|^\*数据:/.test(l)&&!l.startsWith('|'));
 const sources=[...markdown.matchAll(/\[([^\]]+)\]\((https:\/\/[^)]+)\)/g)].flatMap(m=>{try{const url=new URL(m[2]);return url.protocol==='https:'&&!url.username&&!url.password?[{label:present(m[1]),url:m[2]}]:[];}catch{return [];}});
 const overview=asiaMarketOverview(markdown,report.date,locale==='en'?'en-US':'zh-CN');
 if(overview){panels.push({id:'asia-overview',title:present('亚洲市场概览'),kind:'rows',rows:overview.rows.map((r,i)=>({id:`session-${i}`,label:`${r[0]} · ${r[1]}`,value:dailyReturn(r[4])??undefined,valueText:r[4],kind:'signed',observationDate:/^\d{4}-/.test(r[2])?r[2]:undefined,cells:[{label:labels.close,text:r[3]},{label:labels.status,text:r[5]}]})),notes:overview.notes});fallback('asia-overview',overview.fallback);}
 const legacySessions=holidayRows(markdown,report.date);
 const modernHoliday=overview&&new RegExp(`^## 亚洲市场收盘复盘（${report.date.replaceAll('-','')}）\\s*$`,'m').test(markdown)&&markdown.includes('A 股今日休市。');
 if(legacySessions||modernHoliday){
  if(!overview&&legacySessions)panels.push({id:'asia-sessions',title:present('亚洲市场概览'),kind:'rows',unit:'%',rows:legacySessions.map((row,index)=>({id:`holiday-session-${index}`,label:present(row[0]),value:dailyReturn(row[3])??undefined,valueText:row[3],kind:'signed',observationDate:row[1]===report.date?row[1]:undefined,cells:[{label:labels.close,text:row[2]},{label:labels.status,text:present(row[1]===report.date?'已收盘':row[1])}]}))});
  const sourceNotes=sectionLines(markdown,'## 数据来源').map(present);
  return{id:report.id,title:labels.title,date:report.date,locale,panels,sources,notes:[...new Set([asiaImageLabel('holidayNote',locale==='en'?'en-US':'zh-CN'),...warnings.map(present),...sourceNotes])]};
 }
 if(/^## 亚洲市场收盘复盘/m.test(markdown)&&!overview){const heading=markdown.split('\n').find(line=>/^## 亚洲市场收盘复盘/.test(line));if(heading)fallback('asia-sessions',sectionLines(markdown,heading));}
 text('state','## 一、市场状态');
 const dimensionNames=['流动性','广度','赚钱效应','亏钱风险','趋势确认','轮动质量'];
 const dimensionLines=sectionLines(markdown,'### 六维观察');
 if(dimensionLines.length){const rows:ReportRow[]=dimensionNames.map((label,i)=>{const cells=dimensionLines.filter(l=>l.startsWith('|')).map(l=>l.split(/(?<!\\)\|/).slice(1,-1).map(c=>c.trim())).find(c=>c[0]===label);const raw=cells?.[1]??'';const value=/^(?:0|[1-9]\d?|100)(?:\.\d+)?$/.test(raw)&&Number(raw)<=100?Number(raw):undefined;if(value!==undefined){remember(label,value,'观察分',date);remember(label,value,'观察分（风险）',date);}return{id:`dimension-${i}`,label:present(label),value,valueText:value===undefined?labels.unavailable:`${raw} / 100`,kind:'score',scale:[0,100],observationDate:date,cells:[{label:labels.status,text:present(cells?.[2]||labels.unavailable)}],details:cells?.[3]?[present(cells[3])]:[]};});panels.push({id:'dimensions',title:present('六维观察'),kind:'rows',rows,notes:[labels.score]});}
 for(const [id,heading] of [['contradiction','### 核心矛盾'],['next-session','### 明日验证'],['previous-session','### 昨日验证复盘'],['financing','### 六、融资融券'],['calibration','### 数据完整度与校准']])text(id,heading);
 for(const heading of ['### 二、指数总览','### 七、行业板块 TOP10','### 八、高成交核心票 TOP10','### 九、热门概念 TOP5','### 十、极端异动']){
  const table=reportTable(markdown,heading);if(!table)continue;
  const rows:ReportRow[]=table.rows.map((r,i)=>{const column=table.key==='indices'||table.key==='movers'?2:1;const value=dailyReturn(r[column]);const label=table.key==='movers'?r[1]:r[0];const valid=value!==null&&value>=-100&&Math.abs(value)<=Number.MAX_SAFE_INTEGER&&(table.key!=='indices'||(/^\d+(?:\.\d+)?$/.test(r[1])&&Number(r[1])>0&&Number.isSafeInteger(Math.trunc(Number(r[1])))));const numeric=table.key==='turnover'&&/^\d+(?:\.\d+)?$/.test(r[1])&&Number.isFinite(Number(r[1]))&&Number(r[1])<=Number.MAX_SAFE_INTEGER?Number(r[1]):valid?value:undefined;
  if(valid)remember(label,value!,'%',date);if(table.key==='turnover'&&numeric!==undefined)remember(label,numeric,'亿',date);
  return{id:`${table.key}-${i}`,label:present(label),value:numeric,valueText:table.key==='turnover'?`${r[1]} ${locale==='en'?'CNY 100m':'亿'}`:r[column],kind:table.key==='turnover'?'amount':'signed',observationDate:date,cells:r.flatMap((cell,j)=>j===0||j===(table.key==='turnover'?1:column)||(table.key==='movers'&&j===1)?[]:[{label:present(table.headers[j]||''),text:present(cell)}])};});
  panels.push({id:table.key,title:sectionTitle(heading),kind:'rows',rows:rows.slice(0,table.preview),notes:table.notes.map(present)});
  if(rows.length>table.preview)panels.push({id:`${table.key}-additional`,title:sectionTitle(heading),kind:'rows',disclosure:true,rows:rows.slice(table.preview)});
  fallback(table.key,table.fallback);
  if(table.key==='industry'){const index=table.notes.indexOf('跌幅靠前行业:');if(index>=0&&table.notes[index+1]){const entries=table.notes[index+1].split('、').map(s=>/^([^()]+)\(([+-]\d+(?:\.\d+)?)%\)$/.exec(s));if(entries.every(r=>r&&Number(r[2])<0&&Number(r[2])>=-100))panels.push({id:'industry-decliners',title:present('跌幅靠前行业'),kind:'rows',rows:entries.map((r,i)=>({id:`decliner-${i}`,label:present(r![1]),value:Number(r![2]),valueText:`${r![2]}%`,kind:'signed',observationDate:date}))});}}
 }
 // Drive the existing strict panel validator through a non-rendering draw adapter.
 for(const heading of ['### 三、市场总览','### 四、涨跌停','### 五、资金动向']){
  const parts:string[]=[];const notes:string[]=[];const draw:Draw={parts,y:0,present:s=>s,node:(_x,_y,s)=>`<text>${s}</text>`,text:s=>{notes.push(s);}};
  const consumed=renderReportPanel(draw,markdown,heading);
  const lines=sectionLines(markdown,heading);const id=heading.includes('市场总览')?'overview':heading.includes('涨跌停')?'limits':'flow';
  const rows:ReportRow[]=[];
  for(const line of consumed){if(line.startsWith('涨跌分布:')||line.startsWith('站上 VWAP 比例:'))continue;
   const chunks=line.split(/\s*\|\s*|\s*\/\s*(?=净流出)/);for(const [i,chunk] of chunks.entries()){const match=/^(.*?)\s*([+-]?\d+(?:\.\d+)?)(万亿|亿|万|%| 家| 板)?$/.exec(chunk);if(!match)continue;const value=Number(match[2]);const unit=(match[3]||'').trim();const label=match[1].replace(/[:：]\s*$/,'').trim();remember(label,value,unit,date);rows.push({id:`${id}-${rows.length}-${i}`,label:present(label),value,valueText:`${match[2]}${present(unit)}`,kind:unit==='%'?'signed':unit==='家'||unit==='板'?'count':'amount',observationDate:date});}}
  const imageLabel=(key:Parameters<typeof asiaImageLabel>[0])=>asiaImageLabel(key,locale==='en'?'en-US':'zh-CN');
  const stack=(panelId:string,title:string,stackRows:ReportRow[],stackNotes:string[]=[])=>{
   const total=stackRows.reduce((sum,row)=>sum+(row.value??0),0);
   panels.push({id:panelId,title,kind:'stack',unit:locale==='en'?'stocks':'家',scale:[0,total],rows:stackRows.map(row=>({...row,kind:'count',scale:[0,total]})),notes:stackNotes});
  };
  if(rows.length){
   if(id==='overview'){
    panels.push({id,title:sectionTitle(heading),kind:'rows',unit:'%',rows:rows.slice(0,2),notes:[imageLabel('weightedNote')]});
    const turnoverLine=[...consumed].find(line=>line.startsWith('全市场中位数涨跌'))!;
    const turnoverUnit=/(万亿|亿|万)?$/.exec(turnoverLine)?.[1]||'';
    panels.push({id:'overview-turnover',title:imageLabel('totalTurnover'),kind:'rows',unit:present(turnoverUnit),rows:[rows[2]]});
    stack('overview-breadth',present('市场广度'),rows.slice(3,6));
    panels.push({id:'overview-advance-rate',title:imageLabel('advanceRate'),kind:'rows',unit:'%',rows:[{...rows[6],kind:'share',scale:[0,100]}]});
   }else if(id==='limits'){
    stack('limits',sectionTitle(heading),rows.slice(0,2),[imageLabel('overlapNote')]);
    stack('limits-over-five',`${imageLabel('overFive')} / ${imageLabel('belowFive')}`,rows.slice(2,4),[imageLabel('overlapNote')]);
    if(rows[4])panels.push({id:'limits-board',title:imageLabel('maxBoard'),kind:'rows',rows:[rows[4]]});
   }else{
    const source=[...consumed].find(line=>line.startsWith('大单资金代理'))!;
    const unit=/([+-]?\d+(?:\.\d+)?)(万亿|亿|万)? \|/.exec(source)?.[2]||'';
    panels.push({id:'flow',title:imageLabel('flowProxy'),kind:'rows',unit:present(unit),rows:[{...rows[0],kind:'signed'}],notes:[imageLabel('flowDirectionNote'),imageLabel('proxyNote')]});
    stack('flow-counts',`${imageLabel('inflowCount')} / ${imageLabel('outflowCount')}`,rows.slice(1));
   }
  }
  const distribution=[...consumed].find(l=>l.startsWith('涨跌分布:'));
  if(distribution){const tokens=distribution.slice(5).trim().split(/\s+/);const total=tokens.reduce((n,t)=>n+Number(t.split(':')[1]),0);panels.push({id:'distribution',title:present('涨跌分布'),kind:'rows',unit:locale==='en'?'stocks':'家',notes:[imageLabel('distributionNote')],rows:tokens.map((token,i)=>{const [range,count]=token.split(':');const [lower,upper]=range.replace(/%$/,'').split('~').map(bound=>bound==='-inf'?-Infinity:bound==='inf'?Infinity:Number(bound));return{id:`bucket-${i}`,label:range.startsWith('-inf~')?asiaImageLabel('distributionLower',locale==='en'?'en-US':'zh-CN'):range.endsWith('~inf%')?asiaImageLabel('distributionUpper',locale==='en'?'en-US':'zh-CN'):range,value:Number(count),valueText:count,kind:'count',tone:upper<=0?'negative':lower>0?'positive':'neutral',cells:[{label:labels.share,text:`${total?(Number(count)/total*100).toFixed(1):'0.0'}%`}],observationDate:date};})});}
  const intraday=[...consumed].find(l=>l.startsWith('站上 VWAP 比例:'));
  if(intraday)panels.push({id:'intraday',title:present('日内指标'),kind:'rows',notes:[imageLabel('ratioScaleNote')],rows:intraday.split(' | ').map((chunk,i)=>{const [label,raw]=chunk.split(': ');const value=Number(raw.slice(0,-1));const signed=i===1;const maximum=i===0||i===3?100:Math.max(5,Math.abs(value));return{id:`intraday-${i}`,label:present(label),value,valueText:raw,kind:signed?'signed':'share',scale:[signed?-maximum:0,maximum],observationDate:date};})});
  const remaining=lines.filter(l=>!consumed.has(normalizePanelLine(l)));if(remaining.length){if(!rows.length)fallback(id,remaining);else panels.find(p=>p.id===id)!.notes!.push(...remaining.map(l=>present(normalizePanelLine(l))));}
 }
 const chartNames:Record<string,string>={dashboard:'综合盘面',moneyflow:'资金流向',topic:'热点概念',sentiment:'市场温度',weekly_chart:'周度概览'};
 const chartStatus:string[]=[];
 const bundleAbsent=charts.availability==='absent';
 if(bundleAbsent)chartStatus.push(labels.supplementalAbsent);
 else if(!charts.length)chartStatus.push(labels.supplementalEmpty);
 for(const key of bundleAbsent?[]:Object.keys(chartNames)){
  const chart=charts.find(c=>c.key===key);if(!chart)continue;const points=(chart&&['ok','degraded'].includes(chart.status)?chart.points:[]).filter(p=>validPoint(p));
  const remaining=points.filter(p=>!facts.has(fact(p.label,p.value,p.unit,p.observation_date)));
  const unique=remaining.filter((p,i)=>remaining.findIndex(other=>fact(p.label,p.value,p.unit,p.observation_date)===fact(other.label,other.value,other.unit,other.observation_date))===i);
  for(const point of unique)facts.add(fact(point.label,point.value,point.unit,point.observation_date));
  if(chart.status!=='ok'||chart.reason||!points.length)chartStatus.push(`${present(chartNames[key])}: ${present(({ok:'已核实',degraded:'部分缺项',missing:'缺项',skipped:'跳过'} as const)[chart.status])}${chart.reason?` · ${present(chart.reason)}`:''}${!points.length?` · ${labels.missing}`:''}`);
  if(!unique.length)continue;
  const panel:ReportPanel={id:`chart-${key}`,title:present(chartNames[key]),kind:'rows',rows:unique.map((p,i)=>({id:`${key}-${i}`,label:present(p.label),value:p.value,valueText:`${p.value} ${present(p.unit)}`,kind:['观察分','观察分（风险）'].includes(p.unit)&&p.value>=0&&p.value<=100?'score':key==='moneyflow'||p.unit==='%'?'signed':p.unit==='家'?'count':'amount',scale:['观察分','观察分（风险）'].includes(p.unit)&&p.value>=0&&p.value<=100?[0,100]:undefined,observationDate:p.observation_date,sources:[{label:present(p.source_label),url:p.source_url}]})),notes:[present(({ok:'已核实',degraded:'部分缺项',missing:'缺项',skipped:'跳过'} as const)[chart?.status||'missing']),present(chart?.reason||(!unique.length?labels.missing:''))].filter(Boolean)};

  const countNames=['上涨家数','下跌家数','平盘家数'];
  const breadthDates=new Map<string,Map<string,ChartPoint[]>>();
  for(const point of unique){
   const match=/^(上涨家数|下跌家数|平盘家数) (\d{4}-\d{2}-\d{2})$/.exec(point.label);
   if(!match||point.unit!=='家'||match[2]!==point.observation_date||!Number.isSafeInteger(point.value)||point.value<0)continue;
   const observations=breadthDates.get(point.observation_date)||new Map<string,ChartPoint[]>();
   observations.set(match[1],[...(observations.get(match[1])||[]),point]);breadthDates.set(point.observation_date,observations);
  }
  const stackedPoints:ChartPoint[]=[];
  for(const [observationDate,observations] of [...breadthDates].sort(([a],[b])=>a.localeCompare(b))){
   if(!countNames.every(label=>observations.get(label)?.length===1))continue;
   const counts=countNames.map(label=>observations.get(label)![0]);
   if(counts.reduce((total,point)=>total+point.value,0)<=0)continue;
   let history=panels.find(candidate=>candidate.id==='breadth-history');
   if(!history){history={id:'breadth-history',title:present('近几日涨跌分布'),kind:'stack-history',unit:present('家'),series:countNames.map(label=>({label:present(label),values:[]})),sources:[]};panels.push(history);}
   for(const [index,point] of counts.entries()){history.series![index].values.push({date:observationDate,value:point.value});history.sources!.push({label:point.source_label,url:point.source_url});stackedPoints.push(point);}
  }
  panel.rows=panel.rows!.filter(row=>!stackedPoints.some(point=>row.label===present(point.label)&&row.observationDate===point.observation_date&&row.value===point.value));
  const groups=new Map<string,ChartPoint[]>();for(const p of unique.filter(point=>!stackedPoints.includes(point))){const match=/^(.+) (\d{4}-\d{2}-\d{2})$/.exec(p.label);if(match){const group=JSON.stringify([match[1],p.unit]);groups.set(group,[...(groups.get(group)||[]),p]);}}
  for(const [group,values] of groups){if(values.length<2)continue;const [label,unit]=JSON.parse(group);panel.rows=panel.rows!.filter(r=>!values.some(p=>r.label===present(p.label)&&r.observationDate===p.observation_date));panels.push({id:`trend-${key}-${panels.length}`,title:present(label),kind:'line',unit:present(unit),series:[{label:present(label),values:values.map(p=>({date:p.observation_date,value:p.value})).sort((a,b)=>a.date.localeCompare(b.date))}],sources:values.map(p=>({label:p.source_label,url:p.source_url}))});}
  if(panel.rows?.length)panels.push(panel);
 }
 if(chartStatus.length)panels.push({id:'supplemental-chart-status',title:labels.supplementalTitle,kind:'text',disclosure:bundleAbsent||!charts.length,paragraphs:chartStatus});
 const research=sectionLines(markdown,'### 海外主题研究证据');
 if(research.length){const copy=ASIA_RESEARCH_LOCALE[locale];panels.push({id:'research-summary',title:copy.title,kind:'text',paragraphs:[copy.note]});panels.push({id:'research-details',title:copy.details,kind:'text',disclosure:true,paragraphs:[copy.sourceLanguage,...research]});}
 const known=new Set(['### 海外主题研究证据','## 一、市场状态','### 六维观察','### 核心矛盾','### 明日验证','### 昨日验证复盘','### 数据完整度与校准','### 二、指数总览','### 三、市场总览','### 四、涨跌停','### 五、资金动向','### 六、融资融券','### 七、行业板块 TOP10','### 八、高成交核心票 TOP10','### 九、热门概念 TOP5','### 十、极端异动','### 亚洲市场概览']);
 for(const heading of markdown.split('\n').filter(l=>/^### /.test(l)&&!known.has(l.trim())))fallback(`source-${panels.length}`,[heading,...sectionLines(markdown,heading)]);
 const order=['summary','asia-overview','state','dimensions','contradiction','next-session','previous-session','indices','overview','overview-turnover','overview-breadth','overview-advance-rate','intraday','distribution','limits','limits-over-five','limits-board','flow','flow-counts','financing','industry','industry-decliners','turnover','concepts','movers','calibration'];
 const rank=(id:string)=>{const direct=order.indexOf(id);if(direct>=0)return direct;const original=id.replace(/-(?:fallback|additional)$/,'');const fallback=order.indexOf(original);return fallback>=0?fallback+.1:100;};
 for(const panel of panels)for(const row of panel.rows??[]){
  row.label=formatStockIdentity(row.label);
  if(/^concepts(?:-additional)?$/.test(panel.id)&&row.cells?.[0])row.cells[0].text=formatStockIdentity(row.cells[0].text);
 }
 panels.sort((a,b)=>rank(a.id)-rank(b.id));
 return{id:report.id,title:labels.title,date:report.date,locale,panels,sources,notes:[...new Set(warnings.map(present))]};
}
function validPoint(point:ChartPoint):boolean {try{const url=new URL(point.source_url);return Number.isFinite(point.value)&&Math.abs(point.value)<=Number.MAX_SAFE_INTEGER&&/^\d{4}-\d{2}-\d{2}$/.test(point.observation_date)&&url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}}
