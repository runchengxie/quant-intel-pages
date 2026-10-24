import type { WeeklyRecap } from './weekly-recap.ts';
import type { ReportDocument, ReportPanel, ReportSource } from './report-document.ts';
import { weeklyLabels, weeklyStateLabel } from './weekly-locale.ts';
import { weeklyReportPresentation } from './weekly-report-text.ts';

/** Presentation of validated producer observations; no signals or returns are recomputed. */
export function buildWeeklyReportDocument(report: WeeklyRecap, locale: 'en'|'zh'): ReportDocument {
 const t=weeklyLabels[locale];
 const presentation=weeklyReportPresentation(report.markdown,locale);
 const sources:ReportSource[]=[];
 const safeUrl=(value:string)=>/^(https?:\/\/|\/?reports\/|\/?docs\/|\.\.?\/|#)/.test(value);
 const plain=(text:string)=>text
  .replace(/!?\[([^\]]*)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g,(_match,label:string,url:string)=>{if(safeUrl(url)) sources.push({label,url});return label;})
  .replace(/<[^>]*>/g,'')
  .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g,(_m,a:string,b:string)=>a??b)
  .replace(/`([^`]+)`/g,'$1').replace(/\*([^*\n]+)\*/g,'$1').trim();
 const number=(value:number,digits=2)=>new Intl.NumberFormat(locale==='en'?'en-US':'zh-CN',{maximumFractionDigits:digits}).format(value);
 const duration=new Intl.NumberFormat(locale==='en'?'en-US':'zh-CN',{style:'unit',unit:'week',unitDisplay:'long'}).format(report.summary.value_streak_weeks);
 const panels:ReportPanel[]=[];
 let section:ReportPanel|undefined;
 let fenced=false;
 for(const line of presentation.markdown.split('\n')) {
  if(/^\s*(`{3,}|~{3,})/.test(line)) {fenced=!fenced;continue;}
  const heading=!fenced?/^\s*#{1,6}\s+(.+?)\s*#*\s*$/.exec(line):null;
  if(heading) {
   section={id:`weekly-prose-${panels.length+1}`,title:plain(heading[1]),kind:'text',paragraphs:[]};panels.push(section);continue;
  }
  if(!line.trim()||/^\s*(?:[-*_]\s*){3,}$/.test(line)||/^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?\s*$/.test(line))continue;
  const text=plain(line.replace(/^\s*(?:>\s*)+/,'').replace(/^\s*(?:[-+*]|\d+[.)])\s+/,''));
  if(!text)continue;
  if(!section) {section={id:'weekly-prose-introduction',title:t.reportBody,kind:'text',paragraphs:[]};panels.push(section);}
  section.paragraphs!.push(text.replace(/^\|\s*|\s*\|$/g,'').replace(/\s*\|\s*/g,' · '));
 }
 // Missing catalog entries remain explicit source-language evidence, with the translation caveat.
 if(presentation.untranslated.length) panels.push({id:'weekly-untranslated',title:t.translationFallback,kind:'text',paragraphs:presentation.untranslated.map(line=>plain(line.replace(/^\s*(?:#{1,6}|[-+*>])\s+/,'')))});
 // State is concise; the complete narrative above owns all historical claims and sample caveats.
 panels.unshift({id:'weekly-state',title:t.title,kind:'text',paragraphs:[
  `${t.valueState}: ${weeklyStateLabel(report.summary.value_regime,locale)} · ${t.valueStreak}: ${duration}`,
  `${t.sizeSignal}: ${weeklyStateLabel(report.summary.size_signal,locale)}`,
  `${t.returns}: ${number(report.summary.value_return_12w_percent)}% · ${t.smallCrowding}: ${number(report.summary.small_crowding,4)} · ${t.largeCrowding}: ${number(report.summary.large_crowding,4)}`,
 ]});
 const values=report.series.value as Array<{date:string;return_12w_percent:number;wealth_index:number}>;
 const size=report.series.size as Array<{date:string;relative_strength:number;small_crowding:number;large_crowding:number}>;
 const trend=(id:string,title:string,unit:string,series:NonNullable<ReportPanel['series']>,scale?:[number,number]):ReportPanel=>({id,title,kind:'line',unit,series,...(scale?{scale}:{}),notes:[`${t.through}: ${report.date} · ${series[0].values.length} ${t.observations}`]});
 const charts:ReportPanel[]=[
  trend('weekly-value-return',t.returns,'%', [{label:t.returns,values:values.map(r=>({date:r.date,value:r.return_12w_percent}))}]),
  trend('weekly-value-wealth',t.wealth,t.unit,[{label:t.wealth,values:values.map(r=>({date:r.date,value:r.wealth_index}))}]),
  trend('weekly-size',t.strength,t.ratio,[{label:t.strength,values:size.map(r=>({date:r.date,value:r.relative_strength}))}]),
  trend('weekly-crowding',t.size,'0–1',[{label:t.small,values:size.map(r=>({date:r.date,value:r.small_crowding}))},{label:t.large,values:size.map(r=>({date:r.date,value:r.large_crowding}))}],[0,1]),
 ];
 panels.splice(1,0,...charts);
 panels.push({id:'weekly-source-identities',title:t.sources,kind:'text',paragraphs:[
  `${t.generated}: ${report.generated_at}`,
  ...(['value','size'] as const).map(key=>`${t[key]} · ${t.through}: ${report.sources[key].as_of} · ${report.sources[key].schema_version} · SHA-256: ${report.sources[key].sha256}`),
  `SHA-256: ${report.content_hash}`,
  t.limitations,
 ]});
 const records=panels.find(p=>p.id==='weekly-source-identities')?.paragraphs;
 return {id:report.report_id,title:t.title,date:report.date,locale,panels:panels.filter(p=>p.id!=='weekly-source-identities'),records,sources:[...new Map(sources.map(s=>[s.url,s])).values()]};
}
