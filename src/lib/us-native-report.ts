import { formatMarketNumber } from './market-number.ts';
import { displayedSession } from './equity-sessions.ts';
import type { MarketDailySummary, MarketEventEvidence } from './market-facts.ts';
import { buildMarketDailyCharts, buildMarketDailyTables, formatMarketDailyRevision, formatMarketDailyDataNotes, formatMarketDailyStatus } from './market-daily-utils.ts';
import { toEnglishPresentation } from './english-content.ts';
import { US_REPORT_LABELS, usResearchText } from './locale.ts';
import { usNativeLabel } from './us-native-locale.ts';

/** Presentation only: callers must supply the admitted summarizeMarketDaily result. */
export function buildUsNativeReport(summary: MarketDailySummary, locale: 'en' | 'zh') {
 const fullLocale = locale === 'en' ? 'en-US' : 'zh-CN';
 const index = locale === 'en' ? 1 : 0;
 const present = (value: string) => locale === 'en' ? toEnglishPresentation(value) : value;
 const publication = (event: MarketEventEvidence) => {
  const role = `${US_REPORT_LABELS[event.time_role === 'filing_acceptance' ? 'filingAcceptance' : 'sourcePublication'][index]} [${event.id}]`;
  if (event.publication_precision === 'date') return `${role}: ${event.source_date ?? ''} (${US_REPORT_LABELS.dateOnly[index]}, ${event.source_timezone === 'unknown' || !event.source_timezone ? US_REPORT_LABELS.unknownTimezone[index] : event.source_timezone})`;
  return `${role}: ${event.source_time ?? usNativeLabel('missing', locale)}`;
 };
 const sections = summary.claimSections.map(section => ({ ...section, title: present(section.title), claims: section.claims.map(claim => ({ ...claim, text: usResearchText(claim.text, fullLocale), publication: (claim.publication ?? []).map(publication) })) }));
 const keyMetrics = summary.rows.filter(row => /^index\.(spx|dow|nasdaq|russell2000)\.change_percent$/.test(row.id)
  && displayedSession(row, summary)).slice(0, 4).map(row => ({
   ...row, label: present(row.label), sourceLabel: present(row.sourceLabel),
   valueText: `${row.value >= 0 ? '+' : ''}${formatMarketNumber(row.value)}%`,
   close: summary.rows.find(close => close.id === row.id.replace(/\.change_percent$/, '.close') && close.observationDate === row.observationDate),
  }));
 return {
  equityNote: summary.equityReferenceDate ? `${usNativeLabel('equitiesClosed', locale)} ${summary.equityReferenceDate}. ${usNativeLabel('lastSessionReturn', locale)}` : '',
  keyMetrics,
  facts: summary.rows.map(row => ({ ...row, label: present(row.label), sourceLabel: present(row.sourceLabel) })),
  charts: buildMarketDailyCharts(summary).map(chart => ({ ...chart, title: present(chart.title) + (summary.equityReferenceDate && /^(index|equity)\./.test(chart.prefix ?? '') ? ` · ${usNativeLabel('lastSessionReturn', locale)} · ${summary.equityReferenceDate}` : ''), rows: chart.rows.map(row => ({ ...row, label: present(row.label) })) })),
  tables: buildMarketDailyTables(summary), sections,
  caveats: [present(formatMarketDailyStatus(summary, fullLocale)), ...formatMarketDailyRevision(summary, fullLocale), ...formatMarketDailyDataNotes(summary, fullLocale)],
  missingNews: (summary.missingNewsSections ?? []).map(present),
  treasuryNote: summary.treasuryReferenceDate ? `${US_REPORT_LABELS.treasuryClosedReference[index]} ${summary.treasuryReferenceDate}. ${US_REPORT_LABELS.treasuryHolidayReason[index]}` : '',
  treasuryChecked: summary.treasuryReferenceCheckedAt ? `${US_REPORT_LABELS.treasuryEvidenceCutoff[index]}: ${summary.treasuryReferenceCheckedAt}` : '',
 };
}
