import { sectionLines, dailyReturn, type ReportTable } from './asia-report-tables.ts';
import { ASIA_IMAGE_LABELS as labels, asiaImageLabel, type Locale } from './locale.ts';

const HEADER = ['市场', '指数', '数据日期', '收盘', '涨跌幅', '状态'];
const MARKETS = {
  香港: { index: '恒生指数', name: 'hongKong', indexName: 'hangSeng' },
  日本: { index: '日经225', name: 'japan', indexName: 'nikkei225' },
  韩国: { index: 'KOSPI', name: 'korea', indexName: 'kospi' },
} as const;
type Market = keyof typeof MARKETS;
interface Source { url: URL; time: string; evidence: string; }
const cells = (line: string) => line.split('|').slice(1, -1).map(value => value.trim());

function sourceNote(line: string, date: string): [Market, Source] | null {
  const match = /^- \[(香港|日本|韩国)收盘数据\]\(([^)]+)\)；([^；]+)；证据：`(asia\.close\.[a-f0-9]{64})`$/.exec(line);
  if (!match || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(match[3])
    || match[3].slice(0, 10) !== date || !Number.isFinite(Date.parse(match[3]))
    || new Date(match[3]).toISOString().slice(0, 10) !== date) return null;
  try {
    const url = new URL(match[2]);
    // Yahoo's producer URLs contain literal index carets; allow their percent
    // encoding while rejecting other URL normalization or credential surprises.
    if (!match[2].startsWith('https://') || url.protocol !== 'https:' || url.username || url.password
      || url.href !== match[2].replaceAll('^', '%5E')) return null;
    return [match[1] as Market, { url, time: match[3], evidence: match[4] }];
  } catch { return null; }
}

function validRow(row: string[], date: string, source: Source | undefined): boolean {
  if (row.length !== 6 || !(row[0] in MARKETS) || row[1] !== MARKETS[row[0] as Market].index) return false;
  if (['休市', '当日数据缺失', '未收盘'].includes(row[5])) return row.slice(2, 5).every(value => value === '—');
  const change = dailyReturn(row[4]);
  return row[5] === '已收盘' && row[2] === date && /^\d+(?:\.\d+)?$/.test(row[3])
    && Number.isFinite(Number(row[3])) && Number(row[3]) > 0 && change !== null && change >= -100 && !!source;
}

/** Consume the producer's published facts; never fetch prices or infer exchange sessions here. */
export function asiaMarketOverview(markdown: string, date: string, locale: Locale): ReportTable | null {
  const lines = sectionLines(markdown, '### 亚洲市场概览');
  if (!markdown.split('\n').some(line => line.trim() === '### 亚洲市场概览')) return null;
  const table: ReportTable = { key: 'asia-overview', headers: ['market', 'index', 'sessionDate', 'close', 'return', 'sessionStatus']
    .map(key => asiaImageLabel(key as keyof typeof labels, locale)), rows: [], fallback: [], notes: [], preview: Infinity };
  const sources = new Map<Market, Source>();
  const ambiguous = new Set<Market>();
  for (const line of lines) {
    const source = sourceNote(line, date);
    if (!source) continue;
    if (sources.has(source[0])) ambiguous.add(source[0]);
    sources.set(...source);
  }
  for (const market of ambiguous) sources.delete(market);
  const rows = lines.filter(line => line.startsWith('|') && !/^\|[\s|:-]+\|$/.test(line))
    .filter(line => cells(line).join('|') !== HEADER.join('|'));
  const headerValid = lines.some(line => cells(line).join('|') === HEADER.join('|'));
  const counts = new Map<string, number>();
  for (const row of rows) { const market = cells(row)[0]; counts.set(market, (counts.get(market) || 0) + 1); }
  const provided = new Set<string>();
  for (const line of rows) {
    const row = cells(line);
    const market = row[0] as Market;
    if (!headerValid || !line.endsWith('|') || counts.get(market) !== 1 || !validRow(row, date, sources.get(market))) {
      table.fallback.push(line); continue;
    }
    const spec = MARKETS[market];
    provided.add(market);
    table.rows.push([asiaImageLabel(spec.name, locale), asiaImageLabel(spec.indexName, locale), ...row.slice(2, 5),
      asiaImageLabel(({ 已收盘: 'sessionClosed', 休市: 'closed', 当日数据缺失: 'sessionMissing', 未收盘: 'sessionPending' } as const)[row[5] as '已收盘'], locale)]);
    const source = sources.get(market);
    if (row[5] === '已收盘' && source) table.notes.push(`${asiaImageLabel(spec.name, locale)} · ${source.url.hostname} · ${source.time}`);
  }
  for (const [market, spec] of Object.entries(MARKETS)) if (!provided.has(market)) {
    table.fallback.push(`${asiaImageLabel(spec.name, locale)} · ${asiaImageLabel('marketRowMissing', locale)}`);
  }
  for (const line of lines) {
    if (line === labels.sourceTimeSemantics[0]) table.notes.push(asiaImageLabel('sourceTimeSemantics', locale));
    else if (/^数据警告[:：]/.test(line)) table.notes.push(asiaImageLabel('dataWarnings', locale) + line.replace(/^数据警告[:：]\s*/, ''));
  }
  table.notes.push(asiaImageLabel('overviewSources', locale));
  return table;
}
