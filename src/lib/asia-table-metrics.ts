import { dailyReturn, type ReportTable } from './asia-report-tables.ts';

/** Keep chart space inside the numeric column, beside the exact published text. */
export const tableColumns: Record<string, number[]> = {
  'asia-overview': [70, 120, 130, 120, 280, 132],
  indices: [210, 140, 320, 182], industry: [205, 235, 145, 115, 152],
  turnover: [220, 330, 302], concepts: [190, 300, 242, 120], movers: [220, 300, 332],
};

export function tableMetric(table: ReportTable, column: number): 'return' | 'amount' | null {
  if ((table.key === 'asia-overview' && column === 4) || (table.key === 'indices' && column === 2) || (table.key === 'movers' && column === 2)
    || (table.key === 'industry' && column === 1) || (table.key === 'concepts' && column === 1)
    || (table.key === 'turnover' && column === 2)) return 'return';
  return table.key === 'turnover' && column === 1 ? 'amount' : null;
}

export function tableMetricValue(table: ReportTable, row: string[], column: number): number | null {
  if (tableMetric(table, column) === 'return') return dailyReturn(row[column]);
  if (tableMetric(table, column) !== 'amount' || !/^\d+(?:\.\d+)?$/.test(row[column])) return null;
  const value = Number(row[column]);
  return Number.isFinite(value) ? value : null;
}

export function metricScale(table: ReportTable, column: number): number {
  const values = table.rows.map(row => tableMetricValue(table, row, column))
    .filter((value): value is number => value !== null);
  return Math.max(...values.map(Math.abs), 0.01);
}
