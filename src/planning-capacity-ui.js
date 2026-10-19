import { periodForSelection, periodForDate, resolvePlanningCapacity } from "./planning-calendar.js";
import { localDateStamp } from "./local-date.js";

const esc = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const title = value => value ? value[0].toUpperCase() + value.slice(1) : "";

export function planningCapacityMessage(context) {
  return ({
    unset: "Set a planning horizon and effort budget before using capacity recommendations.",
    filtered: "Clear the search to compare the complete planning horizon with its saved budget.",
    unbounded: "Open the saved planning horizon to use its capacity budget.",
    disabled: "The saved planning layer is disabled. Choose and save an enabled horizon.",
    "calendar-changed": "Calendar boundaries changed. Review and save the horizon and budget again.",
    "horizon-mismatch": "This view is outside the saved planning horizon. Open that horizon or save a new budget.",
    available: context.capacity === 0 ? "No capacity is available in this horizon: the saved effort budget is zero." : "Recommendations use your saved effort budget for this horizon."
  })[context.reason] || context.reason || "Capacity recommendations are unavailable.";
}

export function capacityNumber(value, available = true, suffix = "") {
  return available && typeof value === "number" && Number.isFinite(value) ? String(value) + suffix : "—";
}

export function capacityFormDefaults(calendar, selection, now = new Date()) {
  const plan = calendar.capacityPlan;
  return { kind: plan?.horizon.kind || (calendar.enabledPeriodTypes.includes(selection.kind) ? selection.kind : calendar.enabledPeriodTypes[0]),
    date: plan?.horizon.startDate || selection.startDate || localDateStamp(now),
    effort: plan ? String(plan.effort) : "", version: calendar.version, error: "", status: "", editing: false, dirty: false, saving: false };
}

export function capacityDraftPreview(calendar, draft) {
  const period = periodForDate(draft.kind, draft.date, calendar);
  return period ? period.label + " · " + period.startDate + " to " + period.endDate : "Choose a valid date within the planning horizon.";
}

export function planningCapacityMarkup(calendar, selection, draft, canManage, filtered = false, readOnlyReason = "") {
  const context = resolvePlanningCapacity(calendar, selection, { filtered });
  const saved = calendar.capacityPlan;
  const period = periodForSelection(selection, calendar);
  const message = planningCapacityMessage(context);
  const disabled = !canManage || draft.saving;
  const optionTypes = [...new Set([...calendar.enabledPeriodTypes, draft.kind])];
  return '<section class="panel planning-capacity-settings" aria-labelledby="planningCapacityTitle">'
    + '<div class="panel-header"><h3 id="planningCapacityTitle">Planning capacity</h3><span class="muted">' + (saved ? 'Saved budget' : 'Not configured') + '</span></div>'
    + '<p>' + esc(message) + '</p>'
    + (saved ? '<p class="saved-capacity"><strong>' + esc(saved.effort) + ' effort</strong> · ' + esc(title(saved.horizon.kind)) + ' · ' + esc(saved.horizon.startDate) + ' to ' + esc(saved.horizon.endDate) + '</p>' : '')
    + (period ? '<p>Viewing ' + esc(period.label) + ' · ' + esc(period.startDate) + ' to ' + esc(period.endDate) + '</p>' : '')
    + (saved && !context.available && !["disabled", "calendar-changed"].includes(context.reason) ? '<button class="secondary" id="openCapacityHorizon" type="button">Open saved horizon</button>' : '')
    + '<p id="planningCapacityStatus" role="status" aria-live="polite" aria-atomic="true" tabindex="-1">' + esc(draft.error || draft.status) + '</p>'
    + (!canManage ? '<p class="readonly-banner">' + esc(readOnlyReason || 'Only a connected workspace owner can change this budget. You can review the saved capacity.') + '</p>' : '')
    + '<details id="planningCapacityDetails"' + (draft.editing ? ' open' : '') + '><summary>' + (canManage ? (saved ? 'Edit planning capacity' : 'Set planning capacity') : 'Review planning capacity') + '</summary>'
    + '<form id="planningCapacityForm" novalidate><fieldset' + (disabled ? ' disabled' : '') + '><legend>One horizon and effort budget</legend><div class="calendar-form-grid">'
    + '<label><span>Planning horizon</span><select name="capacityKind">' + optionTypes.map(kind => '<option value="' + esc(kind) + '"' + (draft.kind === kind ? ' selected' : '') + (!calendar.enabledPeriodTypes.includes(kind) ? ' disabled' : '') + '>' + esc(title(kind)) + '</option>').join('') + '</select></label>'
    + '<label><span>Date within horizon</span><input name="capacityDate" type="date" required value="' + esc(draft.date) + '"></label>'
    + '<label><span>Effort budget</span><input name="capacityEffort" type="number" min="0" max="1000000" step="any" required value="' + esc(draft.effort) + '"></label></div>'
    + '<p id="capacityDraftPreview">' + esc(capacityDraftPreview(calendar, draft)) + '</p>'
    + '<p>Use the same effort units as your initiatives. Zero means no capacity. This budget applies only to the saved horizon; it does not change commitments.</p>'
    + '</fieldset>' + (canManage ? '<div class="calendar-actions"><button class="primary" type="submit"' + (draft.saving ? ' disabled' : '') + '>' + (draft.saving ? 'Saving…' : 'Save capacity') + '</button><button class="secondary" id="cancelPlanningCapacity" type="button"' + (draft.saving ? ' disabled' : '') + '>Cancel changes</button>' + (saved ? '<button class="secondary" id="clearPlanningCapacity" type="button"' + (draft.saving ? ' disabled' : '') + '>Clear saved capacity</button>' : '') + '</div>' : '')
    + '</form></details></section>';
}
