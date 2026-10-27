import { loadReports, loadMarketDaily, loadChart, loadMarkdown, VISUAL_REPORT_START_DATE } from '../../src/lib/reports';
import { loadAsiaNews } from '../../src/lib/asia-news';
import { summarizeMarketDaily } from '../../src/lib/market-daily-utils';
import { buildUsReportDocument } from '../../src/lib/us-report-document';
import { buildAsiaReportDocument } from '../../src/lib/asia-report-document';

// Read the same input root as the browser build, including explicit test overrides.
// Weekly expectations are fixed by weeklyBrowserInput; daily reports deliberately roll.
export const eveningReports = loadReports().filter(row => row.kind === 'evening' && row.date >= VISUAL_REPORT_START_DATE);
export const latestEvening = eveningReports[0];
if (!latestEvening) throw new Error('A published visual evening report is required');
export const historicalEvening = eveningReports.at(-1)!;
export const asiaNews = loadAsiaNews(latestEvening.id);
export function dailyDocuments(locale: 'en' | 'zh') {
  const market = loadMarketDaily();
  const summary = market && summarizeMarketDaily(market);
  if (!summary) throw new Error('A valid published U.S. report is required');
  return {
    us: buildUsReportDocument(summary, locale),
    asia: buildAsiaReportDocument(latestEvening, loadChart(latestEvening.id), loadMarkdown(latestEvening), locale),
  };
}
