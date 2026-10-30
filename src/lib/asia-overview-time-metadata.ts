/** Historical source wording is a wire-format compatibility value, not display copy. */
export const LEGACY_ASIA_SOURCE_TIME_SEMANTICS = '来源时间为交易所日历规定的实际收盘时间；日线时间戳仅标识当地交易日。';
export interface OverviewTimeMetadata {
  status: 'structured' | 'legacy' | 'absent' | 'invalid';
  kind?: 'exchange_session_close';
}

/** Only a section-local, canonical, date-bound marker can assert the new time kind. */
export function overviewTimeMetadata(lines: string[], date: string): OverviewTimeMetadata {
  const markers = lines.filter(line => /^<!--\s*market_intel\.asia_overview(?:[.\s]|$)/.test(line));
  if (!markers.length) return lines.includes(LEGACY_ASIA_SOURCE_TIME_SEMANTICS)
    ? { status: 'legacy', kind: 'exchange_session_close' } : { status: 'absent' };
  if (markers.length !== 1 || new TextEncoder().encode(markers[0]).byteLength > 2048) return { status: 'invalid' };
  const match = /^<!-- market_intel\.asia_overview\.v1 (.+) -->$/.exec(markers[0]);
  if (!match) return { status: 'invalid' };
  try {
    const value: unknown = JSON.parse(match[1]);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { status: 'invalid' };
    const data = value as Record<string, unknown>;
    const canonical = JSON.stringify({ date, source_time_kind: 'exchange_session_close' });
    // Canonical encoding rejects duplicate/unknown keys and escaped aliases too.
    if (data.date !== date || data.source_time_kind !== 'exchange_session_close' || match[1] !== canonical) return { status: 'invalid' };
    return { status: 'structured', kind: 'exchange_session_close' };
  } catch { return { status: 'invalid' }; }
}
