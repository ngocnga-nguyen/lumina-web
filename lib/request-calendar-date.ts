/** Display a request's calendar date without interpreting YYYY-MM-DD as UTC. */
export function formatRequestCalendarDate(
  value: string | null | undefined,
  options: Pick<Intl.DateTimeFormatOptions, "weekday" | "month" | "day" | "year">
) {
  if (!value) return null;

  // Only date-only values get local calendar semantics. A timestamp, if supplied,
  // must retain its offset and continue to represent the original moment.
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value
  );
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", options);
}
