// Convert an instant to the user's civil day. Authored YYYY-MM-DD values and
// persisted ISO timestamps have separate contracts; do not convert them here.
export function localDateStamp(now = new Date()) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new RangeError("A valid Date instant is required.");
  return `${String(now.getFullYear()).padStart(4, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Count authored calendar days, not elapsed 24-hour durations. Normalize both
// civil dates to UTC midnight only for arithmetic, so DST cannot shorten a day.
// Missing/invalid dates and full ISO timestamps are not date-only deadlines.
export function localDayDifference(dateOnly, now = new Date()) {
  if (typeof dateOnly !== "string" || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  const deadline = new Date(`${dateOnly}T00:00:00.000Z`);
  if (!Number.isFinite(deadline.getTime()) || deadline.toISOString().slice(0, 10) !== dateOnly) return null;
  const today = new Date(`${localDateStamp(now)}T00:00:00.000Z`);
  return (today.getTime() - deadline.getTime()) / 86400000;
}
