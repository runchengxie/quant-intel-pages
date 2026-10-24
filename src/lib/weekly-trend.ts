/** Geometry only: never calculate a research signal or alter published values. */
export interface TrendField { key: string; label: string; color: string }
export function buildWeeklyTrend(
  rows: Record<string, any>[], fields: TrendField[], includeZero = false,
  bounds?: [number, number],
) {
  if (!rows.length || rows.length > 252 || !fields.length) throw new Error('Invalid weekly plot');
  let previous = '';
  const values: number[] = [];
  for (const row of rows) {
    const day = row.date;
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0,10) !== day || day <= previous) throw new Error('Invalid weekly plot date');
    previous = day;
    for (const field of fields) {
      if (typeof row[field.key] !== 'number' || !Number.isFinite(row[field.key])) throw new Error('Invalid weekly plot value');
      values.push(row[field.key]);
    }
  }
  const scale = Math.max(1,...values.map(Math.abs));
  let low = Math.min(...values)/scale, high = Math.max(...values)/scale;
  if (bounds) {
    if (!bounds.every(Number.isFinite) || bounds[0] >= bounds[1] || values.some(value => value < bounds[0] || value > bounds[1])) throw new Error('Invalid weekly plot bounds');
    low = bounds[0]/scale; high = bounds[1]/scale;
  } else if (includeZero) { low = Math.min(0,low); high = Math.max(0,high); }
  if (low === high) {
    const padding = Math.max(Math.abs(low)*0.05,1/scale);
    const limit = Number.MAX_VALUE/scale;
    low = Math.max(-limit,low-padding); high = Math.min(limit,high+padding);
  }
  const y = (value: number) => 4+(high-value/scale)/(high-low)*232;
  const tickValues = Array.from({length:5},(_,index)=>(low+(high-low)*index/4)*scale);
  if (includeZero && low < 0 && high > 0) tickValues.push(0);
  const ticks = [...new Set(tickValues)].sort((a,b)=>b-a).map(value=>({value,position:y(value)/240*100}));
  const series = fields.map(field=>({
    ...field,
    points: rows.map((row,index)=>`${(rows.length===1?380:4+index/(rows.length-1)*752).toFixed(3)},${y(row[field.key]).toFixed(3)}`).join(' '),
    last: rows.at(-1)![field.key] as number,
  }));
  return {ticks,series,count:rows.length,firstDate:rows[0].date as string,lastDate:rows.at(-1)!.date as string};
}
