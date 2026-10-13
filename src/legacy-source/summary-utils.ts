export type Report = { id: string; date: string; kind: string };
export type Summary = { date: string; morning_report_id: string; evening_report_id: string };
type Health = { status?: string; latest_source_generated_at?: string; latest_target_date?: string; max_age_hours: number; expected_date?: string };

export function selectVisibleSummaries<T extends Summary>(summaries: T[], reports: Report[], selectedDate?: string, limit = 5) {
  const reportsById = new Map(reports.map((report) => [report.id, report]));
  const publicDates = [...new Set(reports.map((report) => report.date))]
    .sort((left, right) => right.localeCompare(left))
    .slice(0, limit);
  const allowedDates = selectedDate ? [selectedDate] : publicDates;

  return summaries
    .filter((summary) => {
      const morning = reportsById.get(summary.morning_report_id);
      const evening = reportsById.get(summary.evening_report_id);
      return Boolean(morning) && ["morning", "evening"].includes(morning?.kind ?? "")
        && evening?.kind === "evening"
        && summary.date === morning?.date
        && (morning?.kind === "evening" ? evening.date < morning.date : evening.date <= (morning?.date ?? ""))
        && allowedDates.includes(summary.date);
    })
    .sort((left, right) => right.date.localeCompare(left.date));
}

export function selectVisibleReports<T extends Report>(reports: T[], selectedDate: string | undefined, kind: string) {
  const latestDate = [...new Set(reports.map((report) => report.date))]
    .sort((left, right) => right.localeCompare(left))[0];
  const targetDate = selectedDate || latestDate;
  return reports
    .filter((report) => report.date === targetDate && (kind === "all" || report.kind === kind))
    .sort((left, right) => {
      if (left.kind !== right.kind) return left.kind === "morning" ? -1 : 1;
      return left.id.localeCompare(right.id);
    });
}

export function selectVisibleInsights<T extends Summary & { source_report_ids?: unknown }>(insights: T[], reports: Report[], selectedDate?: string) {
  const ids = new Set(reports.map((report) => report.id));
  return selectVisibleSummaries(insights, reports, selectedDate)
    .filter((insight) => Array.isArray(insight.source_report_ids)
      && insight.source_report_ids.every((id) => typeof id === 'string' && ids.has(id)));
}

export function isHealthDelayed(health: Health, now = Date.now()) {
  const elapsed = (now - Date.parse(health.latest_source_generated_at ?? '')) / 3600000;
  // Compare target-day age in Beijing, independent of the browser timezone.
  const targetEnd = Date.parse(`${health.latest_target_date}T23:59:59.999+08:00`);
  const targetAge = (now - targetEnd) / 3600000;
  return ["stale", "behind", "missing", "invalid_timestamp"].includes(health.status ?? '')
    || (Number.isFinite(elapsed) && elapsed > health.max_age_hours)
    || (!health.expected_date && Number.isFinite(targetAge) && targetAge > health.max_age_hours);
}

