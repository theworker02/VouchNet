/** Adds working days without treating Saturday or Sunday as a response day. */
export function addBusinessDays(from: Date, days: number): Date {
  if (!Number.isSafeInteger(days) || days < 0) throw new Error('BUSINESS_DAY_COUNT_INVALID');
  const result = new Date(from.getTime());
  let remaining = days;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const day = result.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return result;
}
