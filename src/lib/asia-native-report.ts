import { asiaMarketOverview } from './asia-market-overview.ts';
import { reportTable, dailyReturn } from './asia-report-tables.ts';
import { toEnglishPresentation } from './english-content.ts';
import { renderMarkdown } from './markdown.ts';

export interface AsiaNativeReportSource { id: string; date: string; kind: string; }
export interface AsiaNativeReturn {
  label: string;
  value: number;
  display: string;
  close: string;
  date: string | null;
  turnover: string | null;
}

/** Preview only admitted rows; keep every source section in the sanitized body. */
export function buildAsiaNativeReport(report: AsiaNativeReportSource, markdown: string, locale: 'en' | 'zh') {
  const present = (text: string) => locale === 'en' ? toEnglishPresentation(text) : text;
  const overview = asiaMarketOverview(markdown, report.date, locale === 'en' ? 'en-US' : 'zh-CN');
  const mainland = reportTable(markdown, '### 二、指数总览');
  const metadata = markdown.split(/^### /m, 1)[0];
  const mainlandDates = [...metadata.matchAll(/^(?:- )?数据日期[:：]\s*(\d{4}-\d{2}-\d{2})\s*$/gm)].map(match => match[1]);
  const mainlandDate = mainlandDates.length > 0 && mainlandDates.every(date => date === report.date) ? report.date : null;
  const returns: AsiaNativeReturn[] = [];
  for (const row of overview?.rows ?? []) {
    const value = dailyReturn(row[4]);
    if (value === null) continue;
    returns.push({ label: `${row[0]} · ${row[1]}`, value, display: row[4], close: row[3], date: row[2], turnover: null });
  }
  for (const row of mainland?.rows ?? []) {
    const value = dailyReturn(row[2]);
    if (value === null || value < -100 || !/^\d+(?:\.\d+)?$/.test(row[1]) || !Number.isFinite(Number(row[1])) || Number(row[1]) <= 0) continue;
    returns.push({ label: present(row[0]), value, display: row[2], close: row[1], date: mainlandDate, turnover: row[3] === 'N/A' ? null : row[3] });
  }
  // Wrap only individual tables. Sanitization happens before adding fixed markup.
  const bodyHtml = renderMarkdown(present(markdown))
    .replace(/<table>/g, '<div class="native-table-wrap" tabindex="0"><table>')
    .replace(/<\/table>/g, '</table></div>');
  return { returns, bodyHtml, extent: Math.max(1, ...returns.map(row => Math.abs(row.value))) };
}
