export const PLANNING_CALENDAR_VERSION = 1;
export const PLANNING_PERIOD_TYPES = Object.freeze(["sprint", "month", "quarter", "year"]);
export const DEFAULT_ENABLED_PERIOD_TYPES = Object.freeze(["month", "quarter", "year"]);

export const MAX_PLANNING_CAPACITY = 1000000;

const DAY_MS = 86400000;
const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

export class PlanningCalendarError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "PlanningCalendarError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export function emptyPlanningCalendar() {
  return deepFreeze({
    version: PLANNING_CALENDAR_VERSION,
    enabledPeriodTypes: [...DEFAULT_ENABLED_PERIOD_TYPES],
    fiscalYearStartMonth: 1,
    sprintLengthWeeks: 2,
    sprintAnchorDate: "",
    capacityPlan: null
  });
}

export function normalizePlanningCalendar(input = {}) {
  const source = plainObject(input) ? input : {};
  const enabledPeriodTypes = uniqueStrings(source.enabledPeriodTypes)
    .filter((type) => PLANNING_PERIOD_TYPES.includes(type));
  const resolvedTypes = enabledPeriodTypes.length ? enabledPeriodTypes : [...DEFAULT_ENABLED_PERIOD_TYPES];
  const sprintAnchorDate = clean(source.sprintAnchorDate);
  if (resolvedTypes.includes("sprint") && !parsePlainDate(sprintAnchorDate)) {
    fail("SPRINT_ANCHOR_REQUIRED", "Choose a valid sprint anchor date before enabling sprints.");
  }
  return deepFreeze({
    version: positiveInteger(source.version, PLANNING_CALENDAR_VERSION),
    enabledPeriodTypes: PLANNING_PERIOD_TYPES.filter((type) => resolvedTypes.includes(type)),
    fiscalYearStartMonth: integerBetween(source.fiscalYearStartMonth, 1, 12, 1),
    sprintLengthWeeks: integerBetween(source.sprintLengthWeeks, 1, 6, 2),
    sprintAnchorDate,
    capacityPlan: normalizeCapacityPlan(source.capacityPlan)
  });
}

export function updatePlanningCalendar(calendar, patch) {
  const current = normalizePlanningCalendar(calendar);
  return normalizePlanningCalendar({ ...current, ...patch, version: current.version + 1 });
}

// Validation deliberately does not resolve the calendar: authored boundaries must survive calendar edits.
function normalizeCapacityPlan(value) {
  if (value === undefined || value === null) return null;
  const horizon = value?.horizon;
  if (!plainObject(value) || Object.keys(value).some(key => !["horizon", "effort"].includes(key))
    || !plainObject(horizon) || Object.keys(horizon).some(key => !["kind", "startDate", "endDate"].includes(key))
    || !PLANNING_PERIOD_TYPES.includes(horizon.kind)
    || typeof horizon.startDate !== "string" || typeof horizon.endDate !== "string"
    || !/^\d{4}-\d{2}-\d{2}$/.test(horizon.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(horizon.endDate)
    || !parsePlainDate(horizon.startDate) || !parsePlainDate(horizon.endDate) || horizon.startDate > horizon.endDate
    || typeof value.effort !== "number" || !Number.isFinite(value.effort) || value.effort < 0 || value.effort > MAX_PLANNING_CAPACITY) {
    fail("INVALID_CAPACITY_PLAN", "Capacity requires a valid bounded horizon and numeric effort from 0 to 1,000,000.");
  }
  return { horizon: { kind: horizon.kind, startDate: horizon.startDate, endDate: horizon.endDate }, effort: value.effort };
}

export function createPlanningCapacityPlan(calendar, selection, effort) {
  const current = normalizePlanningCalendar(calendar);
  if (!plainObject(selection) || !current.enabledPeriodTypes.includes(selection.kind)
    || typeof selection.startDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(selection.startDate)
    || !parsePlainDate(selection.startDate)) {
    fail("CAPACITY_HORIZON_REQUIRED", "Choose an enabled sprint, month, quarter, or year before setting capacity.");
  }
  const period = periodForDate(selection.kind, selection.startDate, current);
  if (!period) fail("CAPACITY_HORIZON_REQUIRED", "Choose a valid planning horizon before setting capacity.");
  return deepFreeze(normalizeCapacityPlan({ horizon: { kind: selection.kind, startDate: period.startDate, endDate: period.endDate }, effort }));
}

export function resolvePlanningCapacity(calendar, selection, options = {}) {
  const current = normalizePlanningCalendar(calendar);
  const plan = current.capacityPlan;
  const label = plan ? `${plan.horizon.kind[0].toUpperCase()}${plan.horizon.kind.slice(1)} · ${plan.horizon.startDate} – ${plan.horizon.endDate}` : "Capacity not configured";
  const result = reason => deepFreeze({ available: reason === "available", capacity: reason === "available" ? plan.effort : null, plan, reason, label });
  if (!plan) return result("unset");
  if (options.filtered) return result("filtered");
  if (!current.enabledPeriodTypes.includes(plan.horizon.kind)) return result("disabled");
  const savedPeriod = periodForDate(plan.horizon.kind, plan.horizon.startDate, current);
  if (!savedPeriod || savedPeriod.startDate !== plan.horizon.startDate || savedPeriod.endDate !== plan.horizon.endDate) return result("calendar-changed");
  if (!plainObject(selection) || !PLANNING_PERIOD_TYPES.includes(selection.kind) || !parsePlainDate(selection.startDate)) return result("unbounded");
  if (!current.enabledPeriodTypes.includes(selection.kind)) return result("disabled");
  const period = periodForSelection(selection, current);
  if (!period || selection.kind !== plan.horizon.kind || period.startDate !== plan.horizon.startDate || period.endDate !== plan.horizon.endDate) return result("horizon-mismatch");
  return result("available");
}

export function normalizePeriodSelection(input, calendar = emptyPlanningCalendar(), now = new Date()) {
  const current = normalizePlanningCalendar(calendar);
  const source = input instanceof URLSearchParams
    ? { kind: input.get("period"), startDate: input.get("periodStart") }
    : plainObject(input) ? input : {};
  const kind = clean(source.kind || source.period || "all").toLowerCase();
  if (kind === "all" || kind === "unscheduled") return deepFreeze({ kind });
  if (!current.enabledPeriodTypes.includes(kind)) return deepFreeze({ kind: "all" });
  const requested = parsePlainDate(source.startDate || source.periodStart);
  if (!requested) return deepFreeze({ kind: "all" });
  const period = periodForDate(kind, formatPlainDate(requested), current);
  if (!period) return deepFreeze({ kind: "all" });
  return deepFreeze({ kind, startDate: period.startDate });
}

export function periodForSelection(selection, calendar = emptyPlanningCalendar(), now = new Date()) {
  const normalized = normalizePeriodSelection(selection, calendar, now);
  if (normalized.kind === "all" || normalized.kind === "unscheduled") return null;
  return periodForDate(normalized.kind, normalized.startDate, calendar);
}

export function periodForDate(type, value, calendar = emptyPlanningCalendar()) {
  const current = normalizePlanningCalendar(calendar);
  if (!PLANNING_PERIOD_TYPES.includes(type)) return null;
  const date = parsePlainDate(value);
  if (!date) return null;
  if (type === "sprint") return sprintPeriod(date, current);
  if (type === "month") return monthPeriod(date);
  if (type === "quarter") return quarterPeriod(date, current.fiscalYearStartMonth);
  return yearPeriod(date, current.fiscalYearStartMonth);
}

export function shiftPeriodSelection(selection, amount, calendar = emptyPlanningCalendar(), now = new Date()) {
  const normalized = normalizePeriodSelection(selection, calendar, now);
  const period = periodForSelection(normalized, calendar, now);
  const delta = Number.isInteger(Number(amount)) ? Number(amount) : 0;
  if (!period || !delta) return normalized;
  const start = parsePlainDate(period.startDate);
  if (period.type === "sprint") start.setUTCDate(start.getUTCDate() + delta * normalizePlanningCalendar(calendar).sprintLengthWeeks * 7);
  if (period.type === "month") start.setUTCMonth(start.getUTCMonth() + delta);
  if (period.type === "quarter") start.setUTCMonth(start.getUTCMonth() + delta * 3);
  if (period.type === "year") start.setUTCFullYear(start.getUTCFullYear() + delta);
  return normalizePeriodSelection({ kind: period.type, startDate: formatPlainDate(start) }, calendar, now);
}

export function filterItemsByPeriod(items = [], selection = { kind: "all" }, calendar = emptyPlanningCalendar(), now = new Date()) {
  const normalized = normalizePeriodSelection(selection, calendar, now);
  if (normalized.kind === "all") return [...items];
  if (normalized.kind === "unscheduled") return items.filter((item) => initiativeDateRange(item).unscheduled);
  const period = periodForSelection(normalized, calendar, now);
  if (!period) return [...items];
  const periodStart = parsePlainDate(period.startDate).getTime();
  const periodEnd = parsePlainDate(period.endDate).getTime();
  return items.filter((item) => {
    const range = initiativeDateRange(item);
    if (range.unscheduled) return false;
    return range.start.getTime() <= periodEnd && range.end.getTime() >= periodStart;
  });
}

export function initiativeDateRange(item = {}) {
  const rawStart = clean(item.startDate);
  const rawEnd = clean(item.dueDate);
  const start = parsePlainDate(rawStart);
  const end = parsePlainDate(rawEnd);
  if ((rawStart && !start) || (rawEnd && !end)) return deepFreeze({ start: null, end: null, unscheduled: true, invalid: true });
  if (start && end && start.getTime() > end.getTime()) return deepFreeze({ start: null, end: null, unscheduled: true, invalid: true });
  const first = start || end;
  const last = end || start;
  return deepFreeze({ start: first, end: last, unscheduled: !first, invalid: false });
}

export function periodSelectionLabel(selection, calendar = emptyPlanningCalendar(), now = new Date()) {
  const normalized = normalizePeriodSelection(selection, calendar, now);
  if (normalized.kind === "all") return "All time";
  if (normalized.kind === "unscheduled") return "Unscheduled";
  return periodForSelection(normalized, calendar, now)?.label || "All time";
}

export function periodSelectionRangeLabel(selection, calendar = emptyPlanningCalendar(), now = new Date()) {
  const normalized = normalizePeriodSelection(selection, calendar, now);
  if (normalized.kind === "all") return "Every scheduled and unscheduled initiative";
  if (normalized.kind === "unscheduled") return "Initiatives without a valid planned date";
  return periodForSelection(normalized, calendar, now)?.rangeLabel || "Every initiative";
}

export function periodSelectionSlug(selection, calendar = emptyPlanningCalendar(), now = new Date()) {
  const normalized = normalizePeriodSelection(selection, calendar, now);
  if (normalized.kind === "all" || normalized.kind === "unscheduled") return normalized.kind;
  return `${normalized.kind}-${normalized.startDate}`;
}

export function describeInitiativeTimeline(item, calendar = emptyPlanningCalendar()) {
  const range = initiativeDateRange(item);
  if (range.unscheduled) return range.invalid ? "Unscheduled · repair date range" : "Unscheduled";
  const dateLabel = range.start.getTime() === range.end.getTime()
    ? formatDisplayDate(range.start)
    : `${formatDisplayDate(range.start)} – ${formatDisplayDate(range.end)}`;
  const current = normalizePlanningCalendar(calendar);
  const periods = current.enabledPeriodTypes.map((type) => {
    const first = periodForDate(type, formatPlainDate(range.start), current);
    const last = periodForDate(type, formatPlainDate(range.end), current);
    if (!first || !last) return "";
    return first.startDate === last.startDate ? first.label : `${first.label} → ${last.label}`;
  }).filter(Boolean);
  return [dateLabel, ...periods].join(" · ");
}

export function isPlainDate(value) {
  return Boolean(parsePlainDate(value));
}

function sprintPeriod(date, calendar) {
  const anchor = parsePlainDate(calendar.sprintAnchorDate);
  if (!anchor) return null;
  const lengthDays = calendar.sprintLengthWeeks * 7;
  const index = Math.floor((date.getTime() - anchor.getTime()) / (lengthDays * DAY_MS));
  const start = new Date(anchor.getTime() + index * lengthDays * DAY_MS);
  const end = addDays(start, lengthDays - 1);
  const sprintNumber = index + 1;
  return makePeriod("sprint", start, end, `Sprint ${sprintNumber}`, `${formatDisplayDate(start)} – ${formatDisplayDate(end)}`);
}

function monthPeriod(date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return makePeriod("month", start, end, monthFormatter.format(start), `${formatDisplayDate(start)} – ${formatDisplayDate(end)}`);
}

function quarterPeriod(date, fiscalStartMonth) {
  const month = date.getUTCMonth() + 1;
  const offset = (month - fiscalStartMonth + 12) % 12;
  const quarter = Math.floor(offset / 3) + 1;
  const fiscalStartYear = month >= fiscalStartMonth ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  const startMonthIndex = (fiscalStartMonth - 1) + (quarter - 1) * 3;
  const start = new Date(Date.UTC(fiscalStartYear, startMonthIndex, 1));
  const end = new Date(Date.UTC(fiscalStartYear, startMonthIndex + 3, 0));
  const fiscalYear = fiscalStartMonth === 1 ? fiscalStartYear : fiscalStartYear + 1;
  return makePeriod("quarter", start, end, `Q${quarter} FY${fiscalYear}`, `${formatDisplayDate(start)} – ${formatDisplayDate(end)}`);
}

function yearPeriod(date, fiscalStartMonth) {
  const month = date.getUTCMonth() + 1;
  const startYear = month >= fiscalStartMonth ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  const start = new Date(Date.UTC(startYear, fiscalStartMonth - 1, 1));
  const end = new Date(Date.UTC(startYear + 1, fiscalStartMonth - 1, 0));
  return makePeriod("year", start, end, `FY${end.getUTCFullYear()}`, `${formatDisplayDate(start)} – ${formatDisplayDate(end)}`);
}

function makePeriod(type, start, end, label, rangeLabel) {
  return deepFreeze({ type, startDate: formatPlainDate(start), endDate: formatPlainDate(end), label, rangeLabel });
}

function parsePlainDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean(value));
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return formatPlainDate(date) === match[0] ? date : null;
}

function plainDateFromDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return formatPlainDate(new Date());
  return formatPlainDate(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())));
}

function formatPlainDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(date) {
  return formatter.format(date);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function positiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function integerBetween(value, min, max, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}

function uniqueStrings(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(clean).filter(Boolean))];
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fail(code, message, details) {
  throw new PlanningCalendarError(code, message, details);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const entry of Object.values(value)) deepFreeze(entry);
  return Object.freeze(value);
}
