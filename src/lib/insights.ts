import type { JsonRecord } from './reports.ts';

export type Evidence = { id: string; report_id: string; section: string; text: string };
type Claim = { text: string; evidence_ids: string[] };
type Watchpoint = { question: string; metric: string; operator: string; threshold: number };
export type Insight = JsonRecord & {
  id?: string; date: string; as_of?: string; generated_at?: string;
  analysis: { overview?: Claim; changes: Claim[]; tensions: Claim[]; watchpoints: Watchpoint[] };
  evidence: Evidence[]; metrics: Record<string, { label: string; unit: string }>; quality_warnings: string[];
};
export type Outcome = {
  insight_id: string; watchpoint_index: number; status: 'pending' | 'met' | 'not_met' | 'unverifiable';
  report_id?: string; observed_date?: string; observed_value?: number | null; evidence: Array<Omit<Evidence, 'id'> & { id?: string }>;
};
const record = (value: unknown): value is JsonRecord => typeof value === 'object' && value !== null && !Array.isArray(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');
const evidence = (value: unknown): value is Evidence => record(value) && ['id', 'report_id', 'section', 'text'].every(key => typeof value[key] === 'string');
const outcomeEvidence = (value: unknown): value is Omit<Evidence, 'id'> & { id?: string } => record(value) && ['report_id', 'section', 'text'].every(key => typeof value[key] === 'string') && (value.id === undefined || typeof value.id === 'string');
const claim = (value: unknown): value is Claim => record(value) && typeof value.text === 'string' && strings(value.evidence_ids);
const watchpoint = (value: unknown): value is Watchpoint => record(value) && ['question', 'metric', 'operator'].every(key => typeof value[key] === 'string') && typeof value.threshold === 'number' && Number.isFinite(value.threshold);
function rows<T>(value: unknown, guard: (item: unknown) => item is T): T[] {
  return Array.isArray(value) ? value.filter(guard) : [];
}

/** Project optional presentation fields without rewriting producer identities or provenance. */
export function latestInsight(payload: unknown): Insight | null {
  const history = record(payload) && Array.isArray(payload.insights) ? payload.insights.filter(record) : [];
  const value = history.sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  if (!value || typeof value.date !== 'string') return null;
  const analysis = record(value.analysis) ? value.analysis : {};
  const metrics: Insight['metrics'] = {};
  for (const [key, metric] of Object.entries(record(value.metrics) ? value.metrics : {})) {
    if (record(metric) && typeof metric.label === 'string' && typeof metric.unit === 'string') metrics[key] = { ...metric, label: metric.label, unit: metric.unit };
  }
  return { ...value, id: typeof value.id === 'string' ? value.id : undefined, date: value.date,
    as_of: typeof value.as_of === 'string' ? value.as_of : undefined,
    generated_at: typeof value.generated_at === 'string' ? value.generated_at : undefined,
    analysis: { overview: claim(analysis.overview) ? analysis.overview : undefined,
      changes: rows(analysis.changes, claim), tensions: rows(analysis.tensions, claim), watchpoints: rows(analysis.watchpoints, watchpoint) },
    evidence: rows(value.evidence, evidence), metrics, quality_warnings: strings(value.quality_warnings) ? value.quality_warnings : [],
  };
}

export function insightOutcomes(payload: unknown): Outcome[] {
  const values = record(payload) && Array.isArray(payload.outcomes) ? payload.outcomes : [];
  return values.filter((value): value is Outcome => record(value)
    && typeof value.insight_id === 'string' && Number.isInteger(value.watchpoint_index)
    && ['pending', 'met', 'not_met', 'unverifiable'].includes(String(value.status))
    && (value.report_id === undefined || typeof value.report_id === 'string')
    && (value.observed_date === undefined || typeof value.observed_date === 'string')
    && (value.observed_value === undefined || value.observed_value === null || typeof value.observed_value === 'number'))
    .map(value => ({ ...value, evidence: rows(value.evidence, outcomeEvidence) }));
}
