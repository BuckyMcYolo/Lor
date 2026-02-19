import { DateTime } from "luxon"

/**
 * Returns a relative time string (e.g. "2 hours ago", "just now").
 */
export function timeAgo(date: Date | string): string {
  const dt =
    typeof date === "string"
      ? DateTime.fromISO(date)
      : DateTime.fromJSDate(date)
  return dt.toRelative() ?? formatDate(date)
}

/**
 * Formats a date as "Jan 1, 2024".
 */
export function formatDate(date: Date | string): string {
  const dt =
    typeof date === "string"
      ? DateTime.fromISO(date)
      : DateTime.fromJSDate(date)
  return dt.toLocaleString(DateTime.DATE_MED)
}

/**
 * Formats a date as "Jan 1, 2024, 3:45 PM".
 */
export function formatDateTime(date: Date | string): string {
  const dt =
    typeof date === "string"
      ? DateTime.fromISO(date)
      : DateTime.fromJSDate(date)
  return dt.toLocaleString(DateTime.DATETIME_MED)
}

/**
 * Formats a time as "3:45 PM".
 */
export function formatTime(date: Date | string): string {
  const dt =
    typeof date === "string"
      ? DateTime.fromISO(date)
      : DateTime.fromJSDate(date)
  return dt.toLocaleString(DateTime.TIME_SIMPLE)
}

/**
 * Groups timestamps by day label ("Today", "Yesterday", "Jan 1, 2024").
 */
export function getDayLabel(date: Date | string): string {
  const dt =
    typeof date === "string"
      ? DateTime.fromISO(date)
      : DateTime.fromJSDate(date)
  const now = DateTime.now()

  if (dt.hasSame(now, "day")) return "Today"
  if (dt.hasSame(now.minus({ days: 1 }), "day")) return "Yesterday"
  return formatDate(date)
}
