import type {ReportDocument,ReportPanel} from './report-document';
import {buildReportSvg,ReportImageBudgetError} from './report-document-svg';
import {reportSectionLabels} from './report-section-locale';
export type ReportSectionKey='overview'|'rankings'|'money-flow'|'history'|'research'|'other';
export interface ReportSection {key:ReportSectionKey;label:string;document:ReportDocument;}
const order:ReportSectionKey[]=['overview','rankings','money-flow','history','research','other'];
function group(panel:ReportPanel):ReportSectionKey {
 if(panel.kind==='line'||panel.kind==='stack-history')return 'history';
 if(/^(?:flow(?:-|$)|chart-moneyflow$|financing$)/.test(panel.id))return 'money-flow';
 if(/^(?:industry|turnover|concepts|movers|chart-topic)/.test(panel.id))return 'rankings';
 if(/^research(?:-|$)/.test(panel.id))return 'research';
 if(/^(?:asia-|state$|dimensions$|contradiction$|next-session$|previous-session$|indices$|overview|intraday$|distribution$|limits|treasury|commodities|crypto|fx)/.test(panel.id))return 'overview';
 return 'other';
}
/** Partition admitted presentation panels; raw facts and source identities remain intact. */
export function buildReportSections(document:ReportDocument):ReportSection[] {
 const labels=reportSectionLabels[document.locale];
 return order.flatMap(key=>{
  const panels=document.panels.filter(panel=>!panel.disclosure&&group(panel)===key);
  if(!panels.length)return [];
  const label=labels[key];
  return [{key,label,document:{...document,id:`${document.id}--${key}`,title:`${document.title} · ${label}`,panels}}];
 });
}
export function buildWholeReportImage(document:ReportDocument):string|null {
 try{return buildReportSvg(document);}catch(error){if(error instanceof ReportImageBudgetError)return null;throw error;}
}
export function buildReportSectionImages(document:ReportDocument) {
 return buildReportSections(document).map(section=>({...section,svg:buildReportSvg(section.document)}));
}
