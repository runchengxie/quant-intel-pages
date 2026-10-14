import { latestInsight, insightOutcomes, type Insight, type Outcome } from '../lib/insights';
import type { Summary } from './summary-utils';

export interface Report {
  id: string; date: string; kind: string; title: string; summary: string;
  generation_mode?: string; source_url?: string;
  sections: { title: string; paragraphs: string[] }[];
}
export type DailySummary = Summary & { text: string };
export type LegacyInsight = Insight & Summary & { analysis: Insight['analysis'] & { overview: { text: string; evidence_ids: string[] } } };
export type LegacyOutcome = Outcome & { evidence_ids: string[] };
export interface Health {
  status?: string; latest_source_generated_at?: string; latest_target_date?: string;
  max_age_hours: number; expected_date?: string; pair_available?: boolean;
}
export const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): string => typeof value === 'string' ? value : '';
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const rows = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.filter(record) : [];
export function reports(value: unknown): Report[] {
  return rows(value).filter(row => ['id', 'date', 'kind'].every(key => typeof row[key] === 'string')).map(row => ({
    id: text(row.id), date: text(row.date), kind: text(row.kind), title: text(row.title), summary: text(row.summary),
    generation_mode: text(row.generation_mode), source_url: text(row.source_url),
    sections: rows(row.sections).map(section => ({ title: text(section.title), paragraphs: strings(section.paragraphs) })),
  }));
}
export function summaries(value: unknown): DailySummary[] {
  return rows(value).filter(row => ['date', 'morning_report_id', 'evening_report_id', 'text'].every(key => typeof row[key] === 'string')).map(row => ({
    date: text(row.date), morning_report_id: text(row.morning_report_id), evening_report_id: text(row.evening_report_id), text: text(row.text),
  }));
}
export function insights(value: unknown): LegacyInsight[] {
  return rows(value).flatMap(row => {
    const note = latestInsight({ insights: [row] });
    if (!note?.analysis.overview || typeof row.morning_report_id !== 'string' || typeof row.evening_report_id !== 'string') return [];
    return [{ ...note, morning_report_id: row.morning_report_id, evening_report_id: row.evening_report_id,
      analysis: { ...note.analysis, overview: note.analysis.overview },
    }];
  });
}
export function outcomes(value: Record<string, unknown>): LegacyOutcome[] {
  return insightOutcomes(value).map(row => {
    const original = rows(value.outcomes).find(item => item.insight_id === row.insight_id && item.watchpoint_index === row.watchpoint_index);
    return { ...row, evidence_ids: strings(original?.evidence_ids) };
  });
}
export function health(value: unknown): Health | null {
  if (!record(value) || typeof value.max_age_hours !== 'number') return null;
  return { status: text(value.status), latest_source_generated_at: text(value.latest_source_generated_at),
    latest_target_date: text(value.latest_target_date), max_age_hours: value.max_age_hours,
    expected_date: text(value.expected_date), pair_available: value.pair_available === true };
}
