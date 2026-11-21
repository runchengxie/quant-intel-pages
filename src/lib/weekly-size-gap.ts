/** Flag long breaks in legacy series that did not ship an exchange calendar. */
export function weeklySizeGap(previous: string, next: string): boolean {
  return Date.parse(next) - Date.parse(previous) > 14 * 86_400_000;
}
