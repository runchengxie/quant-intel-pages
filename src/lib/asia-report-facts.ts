import type { ChartPoint } from './chart-data.ts';

/** Only suppress exact current-date facts from the report's known source contract. */
export function reportFactAlreadyShown(point: ChartPoint, date: string, markdown: string, svg: string): boolean {
  if (point.observation_date !== date) return false;
  const contracts: Record<string, [string, string, string]> = {
    上涨家数: ['up', 'Tushare A 股日线', '1?doc_id=27'],
    下跌家数: ['down', 'Tushare A 股日线', '1?doc_id=27'],
    平盘家数: ['flat', 'Tushare A 股日线', '1?doc_id=27'],
    涨停家数: ['limit-up', 'Tushare 涨跌停榜单', '2?doc_id=355'],
  };
  const contract = contracts[point.label];
  if (contract && point.unit === '家' && point.source_label === contract[1]
    && point.source_url === `https://tushare.pro/document/${contract[2]}`) {
    return svg.includes(`data-count="${contract[0]}" data-value="${point.value}"`);
  }
  if (point.label === '最高连板' && point.unit === '板' && point.source_label === 'Tushare 连板天梯'
    && point.source_url === 'https://tushare.pro/document/2?doc_id=356' && svg.includes('data-card="max-board"')) {
    const value = /^>?\s*最高连板:\s*(\d+) 板$/m.exec(markdown);
    return !!value && Number(value[1]) === point.value;
  }
  return false;
}
