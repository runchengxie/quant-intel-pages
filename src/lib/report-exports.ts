import type {MarketDailySummary} from './market-facts';
import type {ChartCard} from './chart-data';
import {buildUsReportDocument} from './us-report-document';
import {buildAsiaReportDocument} from './asia-report-document';
import {buildReportSvg} from './report-document-svg';
export function buildUsEditorialSvg(summary:MarketDailySummary,_translate?: (value:string)=>string,locale='zh-CN'):string {
 return buildReportSvg(buildUsReportDocument(summary,locale==='en-US'?'en':'zh'));
}
export function buildAsiaEditorialSvg(report:{id:string;date:string;kind:string;summary?:unknown},charts:ChartCard[],markdown:string,_translate?: (value:string)=>string,locale='zh-CN'):string|null {
 if(report.kind!=='evening')return null;
 return buildReportSvg(buildAsiaReportDocument(report,charts,markdown,locale==='en-US'?'en':'zh'));
}
