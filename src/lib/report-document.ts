export type ReportLocale = 'en' | 'zh';
export interface ReportCell { label: string; text: string; }
export interface ReportSource { label: string; url: string; }
export interface ReportRow {
  id: string; label: string; value?: number; valueText?: string;
  kind?: 'signed' | 'amount' | 'share' | 'score' | 'count';
  cells?: ReportCell[]; details?: string[]; records?: string[]; sources?: ReportSource[];
  observationDate?: string; tone?: 'positive' | 'negative' | 'neutral';
  scale?: [number, number];
}
export interface ReportPanel {
  id: string; title: string; kind: 'rows' | 'stack' | 'stack-history' | 'line' | 'text'; disclosure?: boolean;
  rows?: ReportRow[]; paragraphs?: string[]; notes?: string[];
  unit?: string; sources?: ReportSource[]; scale?: [number, number];
  series?: {label: string; values: {date: string; value: number}[]}[];
}
export interface ReportDocument {
  id: string; title: string; date: string; locale: ReportLocale;
  panels: ReportPanel[]; notes?: string[]; records?: string[]; sources?: ReportSource[];
}
