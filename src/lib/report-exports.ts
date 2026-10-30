import type {MarketDailySummary} from './market-facts';
import type {ChartCard} from './chart-data';
import {buildUsReportDocument} from './us-report-document';
import {buildAsiaReportDocument} from './asia-report-document';
import {buildWholeReportImage} from './report-sections';
export function buildUsEditorialSvg(summary:MarketDailySummary,_translate?: (value:string)=>string,locale='zh-CN'):string|null {
 return buildWholeReportImage(buildUsReportDocument(summary,locale==='en-US'?'en':'zh'));
}
export function buildAsiaEditorialSvg(report:{id:string;date:string;kind:string;summary?:unknown},charts:ChartCard[],markdown:string,_translate?: (value:string)=>string,locale='zh-CN'):string|null {
 if(report.kind!=='evening')return null;
 return buildWholeReportImage(buildAsiaReportDocument(report,charts,markdown,locale==='en-US'?'en':'zh'));
}
