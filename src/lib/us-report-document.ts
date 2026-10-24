import type { MarketDailySummary, MarketDailyRow } from './market-facts.ts';
import type { ReportDocument, ReportPanel, ReportRow, ReportSource } from './report-document.ts';
import { buildMarketDailyTables } from './market-daily-utils.ts';
import { buildUsNativeReport } from './us-native-report.ts';
import { usNativeLabel } from './us-native-locale.ts';
import { US_REPORT_LABELS } from './locale.ts';
import { toEnglishPresentation } from './english-content.ts';
import { US_DOCUMENT_LOCALE, US_DOCUMENT_UNITS } from './us-document-locale.ts';

/** The admitted table builder remains the sole authority for same-session pairing. */
export function buildUsReportDocument(summary: MarketDailySummary, locale: 'en' | 'zh'): ReportDocument {
 const t = US_DOCUMENT_LOCALE[locale];
 const label = (key: Parameters<typeof usNativeLabel>[0]) => usNativeLabel(key, locale);
 const present = (text: string) => locale === 'en' ? toEnglishPresentation(text) : text;
 const unit = (value: string) => US_DOCUMENT_UNITS[value]?.[locale === 'en' ? 0 : 1] ?? present(value);
 const model = buildUsNativeReport(summary, locale);
 const panels: ReportPanel[] = [];
 const consumed = new Set<string>();
 const number = (n: number) => n.toLocaleString(locale === 'en' ? 'en-US' : 'zh-CN', {minimumFractionDigits:2,maximumFractionDigits:2});
 const source = (r: MarketDailyRow): ReportSource => ({label:present(r.sourceLabel),url:r.sourceUrl});
 const uniqueSources = (sources: ReportSource[]) => [...new Map(sources.map(s=>[s.url,s])).values()];
 for (const table of buildMarketDailyTables(summary)) {
  const rows: ReportRow[] = table.rows.map(pair => {
   const facts = [pair.value,pair.change].filter((r): r is MarketDailyRow=>Boolean(r));
   facts.forEach(r=>consumed.add(r.id));
   const fact = (pair.change ?? pair.value)!;
   return {
    id:fact.id.split('.').slice(0,2).join('.'),label:present(pair.label),
    value:pair.change?.value, valueText:pair.change ? `${pair.change.value >= 0 ? '+' : ''}${number(pair.change.value)}${table.changeHeading === 'yieldChange' ? ' bp' : '%'}` : t.missing,
    kind:'signed',observationDate:fact.observationDate,
    cells:[{label:label(table.valueHeading),text:pair.value ? `${number(pair.value.value)}${pair.valueUnit ? ` ${unit(pair.valueUnit)}` : ''}` : t.missing}],
    sources:uniqueSources(facts.map(source)),
    records:facts.map(r=>`${present(r.label)}: ${String(r.value)} ${r.unit} · ${r.observationDate} · ${present(r.sourceLabel)} · ${present(r.quality)}`),
   };
  });
  panels.push({id:table.title,title:label(table.title),kind:'rows',unit:table.changeHeading === 'yieldChange' ? 'bp' : '%',rows});
 }
 // Reuse the same admitted pairing rules on each earlier observation date, never mixing sessions.
 const olderRates = summary.rows.filter(r=>r.id.startsWith('treasury.') && !consumed.has(r.id));
 if (olderRates.length) {
  const rows: ReportRow[]=[];
  for(const date of new Set(olderRates.map(r=>r.observationDate))) {
   const dated = olderRates.filter(r=>r.observationDate===date);
   const tables=buildMarketDailyTables({...summary,date,rows:dated.map(r=>({...r,quality:'ok'}))});
   for(const pair of tables.find(p=>p.title==='treasury')?.rows??[]) {
    const facts=[pair.value,pair.change].filter((r):r is MarketDailyRow=>Boolean(r)); facts.forEach(r=>consumed.add(r.id));
    const fact=(pair.value??pair.change)!;
    rows.push({id:`${fact.id.split('.').slice(0,2).join('.')}-${date}`,label:present(pair.label),observationDate:date,
     cells:[{label:label('yieldLevel'),text:pair.value?`${number(pair.value.value)}%`:t.missing},{label:US_REPORT_LABELS.lastSessionChange[locale==='en'?1:0],text:pair.change?`${pair.change.value>=0?'+':''}${number(pair.change.value)} bp`:t.missing}],
     sources:uniqueSources(facts.map(source)),records:facts.map(r=>`${t.quality}: ${present(olderRates.find(original=>original.id===r.id)?.quality??r.quality)}`)});
   }
  }
  panels.push({id:'treasury-reference',title:t.reference,kind:'rows',rows,notes:[model.treasuryNote||t.referenceOnly,...(model.treasuryChecked?[model.treasuryChecked]:[])]});
 }
 const remaining=summary.rows.filter(r=>!consumed.has(r.id));
 if(remaining.length) panels.push({id:'additional-observations',title:t.remaining,kind:'rows',rows:remaining.map(r=>({id:r.id,label:present(r.label),valueText:`${number(r.value)} ${unit(r.unit)}`,observationDate:r.observationDate,sources:[source(r)],details:[...(r.text?[present(r.text)]:[]),`${t.quality}: ${present(r.quality)}`]}))});
 for(const section of model.sections) panels.push({id:`research-${section.key}`,title:section.title,kind:'text',rows:section.claims.map((claim,i)=>({id:`${section.key}-${i}`,label:claim.text,details:claim.publication,sources:claim.sourceUrls.map((url,i)=>({label:`${t.source} ${i+1} · ${new URL(url).hostname}`,url}))}))});
 if(!model.sections.length) panels.push({id:'research',title:label('research'),kind:'text',paragraphs:[t.noResearch]});
 panels.push({id:'data-status',title:t.status,kind:'text',paragraphs:[...model.caveats,...model.missingNews.map(title=>`${title}: ${t.noResearch}`)]});
 const sources=uniqueSources([...summary.rows.map(source),...summary.claimSections.flatMap(s=>s.claims.flatMap(c=>c.sourceUrls.map(url=>({label:new URL(url).hostname,url}))))]);
 return {id:'us',title:label('title'),date:summary.date,locale,panels,sources};
}
