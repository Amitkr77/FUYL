const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const INDIA_OFFSET = '+05:30';

/**
 * Convert date-picker values into an inclusive reporting range in IST.
 * Full ISO timestamps retain their explicit instant; date-only end values
 * include the complete selected calendar day.
 */
export function reportingDateRange(from?: string, to?: string, fallbackDays = 30) {
  const now = new Date();
  const since = from
    ? new Date(DATE_ONLY.test(from) ? `${from}T00:00:00.000${INDIA_OFFSET}` : from)
    : new Date(now.getTime() - fallbackDays * 86_400_000);
  const until = to
    ? new Date(DATE_ONLY.test(to) ? `${to}T23:59:59.999${INDIA_OFFSET}` : to)
    : now;
  return { since, until };
}

/** UTC cursor used only to enumerate YYYY-MM-DD labels without timezone drift. */
export function calendarDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}
