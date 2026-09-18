/**
 * Date helpers for the app's `YYYY-MM-DD` strings.
 *
 * Everything here works in the browser's local time zone on purpose.
 * `new Date().toISOString()` is UTC, so between midnight and 08:00 in
 * Manila it names yesterday; and `new Date('2026-09-17')` parses as UTC
 * midnight, which some zones then display as the day before.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar date as `YYYY-MM-DD`. */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Today's local calendar date as `YYYY-MM-DD`. */
export function todayIso(): string {
  return toIsoDate(new Date())
}

/** Parses `YYYY-MM-DD` as a local-time Date. Returns null for anything else. */
export function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

/** `YYYY-MM` of a `YYYY-MM-DD` string, used to group by month. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

/** True when the ISO date falls in the current local month. */
export function isCurrentMonth(iso: string): boolean {
  return monthKey(iso) === monthKey(todayIso())
}

/** "Sep 17" style label for a `YYYY-MM-DD` string. */
export function formatDay(iso: string): string {
  const d = parseIsoDate(iso)
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : iso
}

/** "Sep 2026" style label for a `YYYY-MM-DD` string. */
export function formatMonth(iso: string): string {
  const d = parseIsoDate(iso)
  return d ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : iso
}
