import type { Draw } from './asia-report-panels.ts';
import { ASIA_IMAGE_LABELS as labels } from './locale.ts';

const BOUNDS = [-100, -9.9, -7, -5, -3, -1, 0, 1, 3, 5, 7, 9.9, 100];
const UP = '#b54839';
const DOWN = '#248072';
const FLAT = '#777777';
const TRACK = '#efe2d5';

/** Reject partial, overlapping, reordered or non-reconciling report buckets. */
export function renderDistribution(draw: Draw, lines: string[], coverage: number): void {
  const source = lines.find(line => line.startsWith('涨跌分布:'));
  if (!source) return;
  const tokens = source.slice('涨跌分布:'.length).trim().split(/\s+/);
  if (tokens.length !== BOUNDS.length - 1) return;
  const rows = tokens.map(token => /^(-?\d+(?:\.\d+)?)~(-?\d+(?:\.\d+)?)%:(\d+)$/.exec(token));
  if (rows.some((row, i) => !row || Number(row[1]) !== BOUNDS[i] || Number(row[2]) !== BOUNDS[i + 1]
    || !Number.isSafeInteger(Number(row[3])))) return;
  const valid = rows as RegExpExecArray[];
  if (valid.reduce((total, row) => total + Number(row[3]), 0) !== coverage) return;
  const max = Math.max(...valid.map(row => Number(row[3])), 1);
  draw.parts.push('<g data-report-panel="distribution">');
  draw.text(labels.distribution[0]);
  for (const row of valid) {
    const value = Number(row[3]);
    const color = Number(row[2]) <= 0 ? DOWN : Number(row[1]) > 0 ? UP : FLAT;
    draw.parts.push(draw.node(54, draw.y, `${row[1]} ~ ${row[2]}%`, { size: 12 }));
    draw.parts.push(`<rect x="240" y="${draw.y - 12}" width="570" height="14" fill="${TRACK}"/>`);
    draw.parts.push(`<rect data-metric="distribution" data-value="${value}" x="240" y="${draw.y - 12}" width="${570 * value / max}" height="14" fill="${color}"/>`);
    draw.parts.push(draw.node(906, draw.y, `${value.toLocaleString('en-US')}${draw.present(labels.countUnit[0])}`, { size: 12, anchor: 'end' }));
    draw.y += 26;
  }
  draw.text(labels.distributionNote[0], FLAT, 12);
  draw.parts.push('</g>');
}

export function renderIntraday(draw: Draw, lines: string[]): void {
  const source = lines.find(line => line.startsWith('站上 VWAP 比例:'));
  const row = source && /^站上 VWAP 比例: (\d+(?:\.\d+)?)% \| 开盘跳空: ([+-]?\d+(?:\.\d+)?)% \| 日内振幅中位数: (\d+(?:\.\d+)?)% \| 收盘位置: (\d+(?:\.\d+)?)%$/.exec(source);
  if (!row) return;
  const values = row.slice(1).map(Number);
  if (!values.every(Number.isFinite) || values.some(value => Math.abs(value) > 100)) return;
  draw.parts.push('<g data-report-panel="intraday">');
  const keys = ['vwap-share', 'opening-gap', 'intraday-range', 'close-position'];
  const titles = [labels.vwapShare[0], labels.openingGap[0], labels.intradayRange[0], labels.closePosition[0]];
  for (const [i, value] of values.entries()) {
    const signed = i === 1;
    const range = i === 2;
    const scale = signed || range ? Math.max(5, Math.abs(value)) : 100;
    const zero = signed ? 535 : 310;
    const width = (signed ? 225 : 450) * Math.abs(value) / scale;
    draw.parts.push(draw.node(54, draw.y, draw.present(titles[i]), { size: 13 }));
    draw.parts.push(`<rect x="310" y="${draw.y - 11}" width="450" height="13" fill="${TRACK}"/>`);
    draw.parts.push(`<line x1="${zero}" y1="${draw.y - 14}" x2="${zero}" y2="${draw.y + 3}" stroke="${FLAT}"/>`);
    draw.parts.push(`<rect data-metric="${keys[i]}" data-value="${value}" x="${value < 0 ? zero - width : zero}" y="${draw.y - 11}" width="${width}" height="13" fill="${value < 0 ? DOWN : signed ? UP : DOWN}"/>`);
    draw.parts.push(draw.node(906, draw.y, `${row[i + 1]}%`, { size: 13, anchor: 'end' }));
    draw.y += 30;
    if (signed || range) {
      draw.parts.push(draw.node(310, draw.y - 10, signed ? `−${scale}%` : '0%', { size: 10 }));
      draw.parts.push(draw.node(760, draw.y - 10, `+${scale}%`, { size: 10, anchor: 'end' }));
      draw.y += 14;
    }
  }
  draw.text(labels.ratioScaleNote[0], FLAT, 12);
  draw.parts.push('</g>');
}
