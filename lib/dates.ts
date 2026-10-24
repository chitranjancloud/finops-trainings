export const DEFAULT_TIMEZONE = "Asia/Kolkata";
export const DEFAULT_LOCALE = "en-IN";

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function timezoneLabel(timeZone: string) {
  if (timeZone === "Asia/Kolkata") return "IST";
  return timeZone;
}

/**
 * Format a stored Date for admin/receipt display in a tenant timezone.
 * Database values remain UTC Date objects; this is presentation-only.
 */
export function formatDateTime(
  value: Date | string | number | null | undefined,
  timeZone = DEFAULT_TIMEZONE,
  locale = DEFAULT_LOCALE
): string {
  const date = toDate(value);
  if (!date) return "";

  const formatted = new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);

  return `${formatted} ${timezoneLabel(timeZone)}`;
}

/** Convenience wrapper for the current default business timezone. */
export function formatDateTimeIST(
  value: Date | string | number | null | undefined
): string {
  return formatDateTime(value, DEFAULT_TIMEZONE, DEFAULT_LOCALE);
}

/**
 * Long-form receipt date, e.g. "11 August 2026".
 */
export function formatReceiptDate(
  value: Date | string | number | null | undefined,
  timeZone = DEFAULT_TIMEZONE,
  locale = DEFAULT_LOCALE
): string {
  const date = toDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Receipt time only, e.g. "01:42:35 PM IST".
 */
export function formatReceiptTime(
  value: Date | string | number | null | undefined,
  timeZone = DEFAULT_TIMEZONE,
  locale = DEFAULT_LOCALE
): string {
  const date = toDate(value);
  if (!date) return "";

  const formatted = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);

  return `${formatted} ${timezoneLabel(timeZone)}`;
}
