/** Admit the preserved legacy holiday table without inferring missing sessions. */
export function holidayRows(markdown: string, date: string): string[][] | null {
  const heading = /^## 亚洲市场收盘复盘（(\d{8})）\s*$/m.exec(markdown);
  if (!heading || heading[1] !== date.replaceAll('-', '') || !markdown.includes('A 股今日休市。')) return null;
  const section = markdown.slice(heading.index + heading[0].length).split(/^## /m)[0];
  const rows = section.split('\n').filter((line) => /^\|/.test(line.trim()))
    .map((line) => line.trim().split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => ['A 股', '香港', '日本', '韩国'].includes(cells[0]));
  if (rows.length !== 4 || new Set(rows.map((row) => row[0])).size !== 4) return null;
  for (const row of rows) {
    if (row.length !== 4) return null;
    if (['休市', '当日数据缺失'].includes(row[1])) {
      if (row[2] !== '—' || row[3] !== '—') return null;
    } else if (row[1] !== date || !/^\d+(?:\.\d+)?$/.test(row[2])
      || !/^[+-]?\d+(?:\.\d+)?%$/.test(row[3])
      || !Number.isFinite(Number(row[2])) || Number(row[2]) <= 0
      || !Number.isFinite(Number(row[3].slice(0, -1)))) return null;
  }
  return rows[0][0] === 'A 股' && rows[0][1] === '休市' && rows.some((row) => row[1] === date) ? rows : null;
}
