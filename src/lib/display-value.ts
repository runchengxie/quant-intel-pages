/** Format standalone decimal metrics only; never rewrite prose, IDs or source data. */
export function formatDisplayValue(text: string, locale: 'en' | 'zh'): string {
  const match = /^([+-]?)(\d+\.\d{3,})(\s*(?:%|亿|万亿|万|CNY 100m|USD|USD 100m|USD trillion|bps)?)$/.exec(text);
  if (!match || !Number.isFinite(Number(match[1] + match[2]))) return text;
  const value = Number(match[1] + match[2]);
  if (Math.abs(value) >= Number.MAX_SAFE_INTEGER) return text;
  const formatted = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'zh-CN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false,
  }).format(Math.abs(value) < 0.005 ? 0 : value);
  return (match[1] === '+' && value >= 0 ? '+' : '') + formatted + match[3];
}
