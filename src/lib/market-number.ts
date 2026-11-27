/** Display only: decimal half-away-from-zero, matching Python Decimal(str(value)). */
export function formatMarketNumber(value: number, locale = 'en-US', digits = 2, grouping = false): string {
 const formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: grouping, roundingMode: 'halfExpand' });
 const zero = new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, useGrouping: false, roundingMode: 'halfExpand' }).format(value);
 return formatter.format(Number(zero) === 0 ? 0 : value);
}
