import calendar from '../data/equity_sessions_v1.json';
import type { MarketDailyRow, MarketFact, MarketSourceStatus } from './market-facts.ts';

/** A file contract owned by Platform; no provider source code is imported. */
export function equityReferenceDate(reportDate: string, status?: MarketSourceStatus): string | undefined {
 const expected = (calendar.expected_observations as Record<string,string>)[reportDate];
 if (!expected || expected >= reportDate || !(calendar.session_closes as Record<string,string>)[expected]) return undefined;
 return status && ['lagged', 'degraded'].includes(status.quality ?? '') && status.session === 'closed' && status.reason === 'holiday_reference'
  && status.expected_observation_date === expected && status.observation_date === expected
  && status.calendar_version === calendar.calendar_version && status.calendar_source === calendar.calendar_source ? expected : undefined;
}
export function validEquityObservation(fact: MarketFact, date: string, status?: MarketSourceStatus): boolean {
 const expected = (calendar.expected_observations as Record<string,string>)[date];
 if (fact.observation_date === date && ['ok','reviewed'].includes(fact.quality)) return !expected || expected === date;
 return fact.quality === 'lagged' && fact.observation_date === equityReferenceDate(date,status);
}
export function displayedSession(row: MarketDailyRow, summary: {date:string;equityReferenceDate?:string}): boolean {
 return (row.observationDate === summary.date && row.quality !== 'lagged')
  || Boolean(summary.equityReferenceDate && /^(index|equity)\./.test(row.id) && row.quality === 'lagged' && row.observationDate === summary.equityReferenceDate);
}
