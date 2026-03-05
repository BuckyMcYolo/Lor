import { DateTime } from "luxon"

function toDateTime(date: Date | string) {
  const dt =
    typeof date === "string"
      ? DateTime.fromISO(date)
      : DateTime.fromJSDate(date)

  if (!dt.isValid) {
    const originalInput = typeof date === "string" ? date : date.toString()
    throw new Error(`Invalid date input: ${originalInput}`)
  }

  return dt
}

/**
 * Returns a relative time string (e.g. "2 hours ago", "just now").
 */
export function timeAgo(date: Date | string): string {
  const dt = toDateTime(date)
  return dt.toRelative() ?? formatDate(date)
}

/**
 * Formats a date as "Jan 1, 2024".
 */
export function formatDate(date: Date | string): string {
  const dt = toDateTime(date)
  return dt.toLocaleString(DateTime.DATE_MED)
}

/**
 * Formats a date as "Jan 1, 2024, 3:45 PM".
 */
export function formatDateTime(date: Date | string): string {
  const dt = toDateTime(date)
  return dt.toLocaleString(DateTime.DATETIME_MED)
}

/**
 * Formats a time as "3:45 PM".
 */
export function formatTime(date: Date | string): string {
  const dt = toDateTime(date)
  return dt.toLocaleString(DateTime.TIME_SIMPLE)
}

/**
 * Returns absolute difference between two timestamps in minutes.
 */
export function differenceInMinutes(
  date1: Date | string,
  date2: Date | string
): number {
  const dt1 = toDateTime(date1)
  const dt2 = toDateTime(date2)

  return Math.abs(dt1.diff(dt2, "minutes").minutes)
}

/**
 * Check if two dates are on the same local day.
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const dt1 = toDateTime(date1).toLocal()
  const dt2 = toDateTime(date2).toLocal()

  return dt1.hasSame(dt2, "day")
}

/**
 * Formats a date label for message list dividers.
 * Returns values like "Today", "Yesterday", or "Monday, December 20, 2024".
 */
export function formatDateDivider(date: Date | string): string {
  const dt = toDateTime(date).toLocal()
  const now = DateTime.now().toLocal()

  if (dt.hasSame(now, "day")) return "Today"
  if (dt.hasSame(now.minus({ days: 1 }), "day")) return "Yesterday"

  return dt.toFormat("cccc, LLLL d, yyyy")
}

/**
 * Groups timestamps by day label ("Today", "Yesterday", "Jan 1, 2024").
 */
export function getDayLabel(date: Date | string): string {
  const dt = toDateTime(date).toLocal()
  const now = DateTime.now().toLocal()

  if (dt.hasSame(now, "day")) return "Today"
  if (dt.hasSame(now.minus({ days: 1 }), "day")) return "Yesterday"
  return formatDate(date)
}
