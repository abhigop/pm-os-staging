import { localDateStamp, localDayDifference } from "./local-date.js";
import {
  calculateRiceScore,
  evaluatePriority,
  methodDefinition,
  normalizeItemPriority,
  normalizePriorityInputs,
  prioritizeItems as prioritizeItemsByPolicy,
  priorityInfluence as priorityInfluenceByPolicy
} from "./prioritization.js";
import {
  emptyPlanningCalendar,
  filterItemsByPeriod,
  periodSelectionLabel,
  periodSelectionRangeLabel
} from "./planning-calendar.js";

import { ENABLEMENT_AREAS, validationDecisionSummary } from "./insights.js";
import { WORKSPACE_DOCUMENT_SCHEMA, createWorkspaceDocument, encodeWorkspaceDocument } from "./workspace-document.js";

export { calculateRiceScore, evaluatePriority };

// Historical benchmarks remain available to explicit callers; no function applies them by default.
export const CAPACITY_BENCHMARKS = Object.freeze({ active: 20, period: 60 });

export function prioritizeItems(items, prioritization) {
  if (prioritization === undefined && items.some((item) => Object.prototype.hasOwnProperty.call(item || {}, "configuredPriorityScore"))) {
    return [...items].sort((left, right) => configuredScore(right) - configuredScore(left)
      || timestamp(right.updatedAt) - timestamp(left.updatedAt)
      || String(left.title || "").localeCompare(String(right.title || ""))
      || String(left.id || "").localeCompare(String(right.id || "")));
  }
  return prioritizeItemsByPolicy(items, prioritization);
}

export function priorityInfluence(items, prioritization, maximum = 50) {
  if (prioritization !== undefined || !items.some((item) => Object.prototype.hasOwnProperty.call(item || {}, "configuredPriorityScore"))) {
    return priorityInfluenceByPolicy(items, prioritization, maximum);
  }
  const ranked = prioritizeItems(items);
  const max = Math.max(0, Number(maximum) || 0);
  const denominator = Math.max(1, ranked.length - 1);
  return new Map(ranked.map((item, index) => [item.id, ranked.length === 1 ? max : Math.round(max * (ranked.length - 1 - index) / denominator)]));
}

function methodLabel(prioritization) { return methodDefinition(prioritization).label; }
function configuredScore(item) {
  const value = Number(item?.configuredPriorityScore);
  return item?.configuredPriorityScore !== null && item?.configuredPriorityScore !== "" && Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}
function timestamp(value) { const result = new Date(value || 0).getTime(); return Number.isFinite(result) ? result : 0; }

export const statusLabels = {
  intake: "Intake",
  discovery: "Discovery",
  committed: "Committed",
  shipped: "Shipped",
  parked: "Parked"
};

export const effortLabels = { 1: "XS", 2: "S", 3: "M", 5: "L", 8: "XL" };

export const riskStatusLabels = Object.freeze({ open: "Open", mitigating: "Mitigating", accepted: "Accepted", resolved: "Resolved" });
export const dependencyStatusLabels = Object.freeze({ pending: "Pending", "at-risk": "At risk", blocked: "Blocked", resolved: "Resolved" });
const activeRiskStatuses = new Set(["open", "mitigating"]);
const activeDependencyStatuses = new Set(["pending", "at-risk", "blocked"]);

export const executiveBriefLabels = Object.freeze({
  generated: "Generated",
  headline: "Headline",
  operationsHealth: "Operations health",
  activeInitiatives: "Active initiatives",
  nextAction: "Next action",
  owner: "Owner",
  dueDate: "Due date",
  priority: "Priority",
  severity: "Severity",
  sources: "Sources",
  risk: "Risk",
  leadershipAction: "Leadership action",
  status: "Status",
  readiness: "Readiness",
  stage: "Stage",
  audience: "Audience",
  context: "Context",
  decisionAsk: "Decision ask",
  reviewDate: "Review date",
  firstGap: "First gap",
  instrumentationAction: "Instrumentation action",
  supportingInitiatives: "Supporting initiatives",
  supportingSegments: "Supporting segments",
  requestedAction: "Requested action",
  neededBy: "Needed by"
});

export function normalizeRiskRecord(value = {}, options = {}) {
  const timestamp = validDate(value.updatedAt) ? new Date(value.updatedAt).toISOString()
    : validDate(options.timestamp) ? new Date(options.timestamp).toISOString()
      : new Date().toISOString();
  const createdAt = validDate(value.createdAt) ? new Date(value.createdAt).toISOString() : timestamp;
  return {
    id: String(value.id || options.id || "risk-1").trim(),
    description: String(value.description || ""),
    likelihood: Math.round(clampNumber(value.likelihood, 1, 5, 3)),
    impact: Math.round(clampNumber(value.impact, 1, 5, 3)),
    status: riskStatusLabels[value.status] ? value.status : "open",
    ownerPersonId: String(value.ownerPersonId || "").trim(),
    ownerName: String(value.ownerName || "").trim(),
    mitigation: String(value.mitigation || "").trim(),
    reviewDate: normalizeDateInput(value.reviewDate),
    needsClassification: Boolean(value.needsClassification),
    createdAt,
    updatedAt: timestamp
  };
}

export function normalizeDependencyRecord(value = {}, options = {}) {
  const timestamp = validDate(value.updatedAt) ? new Date(value.updatedAt).toISOString()
    : validDate(options.timestamp) ? new Date(options.timestamp).toISOString()
      : new Date().toISOString();
  const createdAt = validDate(value.createdAt) ? new Date(value.createdAt).toISOString() : timestamp;
  const targetType = value.targetType === "initiative" ? "initiative" : "external";
  return {
    id: String(value.id || options.id || "dependency-1").trim(),
    description: String(value.description || ""),
    targetType,
    targetInitiativeId: targetType === "initiative" ? String(value.targetInitiativeId || "").trim() : "",
    targetName: String(value.targetName || "").trim(),
    status: dependencyStatusLabels[value.status] ? value.status : "pending",
    ownerPersonId: String(value.ownerPersonId || "").trim(),
    ownerName: String(value.ownerName || "").trim(),
    neededBy: normalizeDateInput(value.neededBy),
    createdAt,
    updatedAt: timestamp
  };
}

export function activeRisks(item) {
  return normalizeItemCollections(item).risks.filter((record) => activeRiskStatuses.has(record.status));
}

export function activeDependencies(item) {
  return normalizeItemCollections(item).dependencies.filter((record) => activeDependencyStatuses.has(record.status));
}

export function riskExposure(record) {
  return clampNumber(record?.likelihood, 1, 5, 3) * clampNumber(record?.impact, 1, 5, 3);
}

export function riskSeverityScore(record) {
  return Math.round(riskExposure(record) * 4);
}

export function riskSeverityLabel(record) {
  const exposure = riskExposure(record);
  return exposure >= 16 ? "Critical" : exposure >= 8 ? "Watch" : "Monitor";
}

export function resolveRecordOwner(record, item, organization = null) {
  const personId = String(record?.ownerPersonId || "").trim();
  const person = personId && Array.isArray(organization?.people)
    ? organization.people.find((entry) => entry.id === personId)
    : null;
  return person?.displayName || String(record?.ownerName || "").trim() || String(item?.owner || "").trim() || "Unassigned";
}

export function primaryRisk(item) {
  return activeRisks(item).sort((left, right) => riskExposure(right) - riskExposure(left)
    || String(left.reviewDate || "9999").localeCompare(String(right.reviewDate || "9999")))[0] || null;
}

export function primaryRiskText(item) {
  return primaryRisk(item)?.description || "";
}
export function formatOperationalScore(value, suffix = "") {
  return typeof value === "number" && Number.isFinite(value) ? `${value}${suffix}` : "— · No data yet";
}

export function calculateHealth(items, now = new Date()) {
  const active = items.filter((item) => item.status !== "shipped" && item.status !== "parked");
  const stale = active.filter((item) => daysSince(itemActivityAt(item), now) > 14);
  const unowned = active.filter((item) => !item.owner.trim());
  const noNextStep = active.filter((item) => !item.nextStep.trim());
  const risks = stale.length + unowned.length + noNextStep.length;
  return {
    score: active.length ? Math.max(0, Math.round(100 - risks * 8 - Math.max(0, active.length - 12) * 3)) : null,
    active: active.length,
    stale: stale.length,
    unowned: unowned.length,
    noNextStep: noNextStep.length
  };
}

export function groupByStatus(items) {
  return Object.keys(statusLabels).reduce((groups, status) => {
    groups[status] = items.filter((item) => item.status === status);
    return groups;
  }, {});
}

export function buildReleasePlan(items, prioritization) {
  const prioritized = prioritizeItems(items, prioritization);
  return {
    now: prioritized.filter((item) => item.status === "committed").slice(0, 4),
    next: prioritized.filter((item) => item.status === "discovery").slice(0, 4),
    later: prioritized.filter((item) => item.status === "intake").slice(0, 4)
  };
}

export function buildFollowUps(items, prioritization) {
  return prioritizeItems(items.map(normalizeItem), prioritization)
    .filter((item) => item.status !== "shipped" && item.status !== "parked")
    .filter((item) => !item.owner.trim() || !item.nextStep.trim() || daysSince(itemActivityAt(item)) > 7 || activeRisks(item).length)
    .slice(0, 8);
}

export const ACTION_QUEUE_DEFINITIONS = Object.freeze({
  Overdue: actionQueueDefinition({
    key: "overdue",
    label: "Reset due date",
    heading: (item) => `Reset the target date for ${item.title}`,
    requestedOutcome: "Move the target date to today or later, or clear it when no date is committed.",
    editor: { surface: "initiative", field: "dueDate", disclosure: "" },
    completionCondition: { kind: "date-not-overdue", field: "dueDate" }
  }),
  Blocker: actionQueueDefinition({
    key: "blocker",
    label: "Resolve blocker",
    heading: (item) => `Resolve the blocker for ${item.title}`,
    requestedOutcome: "Accept or resolve the active risk so the initiative has a deliberate response.",
    editor: { surface: "risk", field: "status", disclosure: "risks" },
    completionCondition: { kind: "risk-inactive" }
  }),
  Owner: actionQueueDefinition({
    key: "owner",
    label: "Assign owner",
    heading: (item) => `Assign an owner to ${item.title}`,
    requestedOutcome: "Name the directly accountable owner for this initiative.",
    requiredCapability: "team-ownership",
    capabilityPolicy: "reveal",
    editor: { surface: "initiative", field: "owner", disclosure: "more-details" },
    completionCondition: { kind: "field-present", field: "owner" }
  }),
  "Next Step": actionQueueDefinition({
    key: "next-step",
    label: "Add next step",
    heading: (item) => `Add the next step for ${item.title}`,
    requestedOutcome: "Write the next concrete action that will move this initiative forward.",
    editor: { surface: "initiative", field: "nextStep", disclosure: "" },
    completionCondition: { kind: "field-present", field: "nextStep" }
  }),
  Decision: actionQueueDefinition({
    key: "decision",
    label: "Record decision",
    heading: (item) => `Record a decision for ${item.title}`,
    requestedOutcome: "Record the commit, kill, continue, or learn decision.",
    editor: { surface: "initiative", field: "decision", disclosure: "more-details" },
    completionCondition: { kind: "field-present", field: "decision" }
  }),
  Metric: actionQueueDefinition({
    key: "metric",
    label: "Define experiment",
    heading: (item) => `Define success evidence for ${item.title}`,
    requestedOutcome: "Add an experiment, target metric, success signal, or decision that closes the measurement gap.",
    editor: { surface: "initiative", field: "experiment", disclosure: "more-details" },
    completionCondition: { kind: "any-field-present", fields: ["experiment", "decision"] }
  }),
  Stale: actionQueueDefinition({
    key: "stale",
    label: "Refresh next step",
    heading: (item) => `Refresh ${item.title}`,
    requestedOutcome: "Confirm the initiative is current by saving an updated status, owner, date, or next step.",
    editor: { surface: "initiative", field: "nextStep", disclosure: "" },
    completionCondition: { kind: "fresh-update", days: 14 }
  })
});

export function buildActionQueue(items, now = new Date(), prioritization, options = {}) {
  const active = prioritizeItems(items.map(normalizeItem), prioritization).filter((item) => item.status !== "shipped" && item.status !== "parked");
  const influence = priorityInfluence(active, prioritization);
  const actions = active.flatMap((item) => {
    const itemActions = [];
    const overdueDays = localDayDifference(item.dueDate, now);
    if (item.dueDate && overdueDays > 0) itemActions.push(createActionQueueEntry("Overdue", item, `Reset date, scope, or owner after ${overdueDays} days overdue.`, 95 + overdueDays, options));
    const risk = primaryRisk(item);
    if (risk) itemActions.push(createActionQueueEntry("Blocker", item, `Resolve or explicitly accept: ${risk.description}`, 90, options, risk));
    if (!item.owner) itemActions.push(createActionQueueEntry("Owner", item, "Assign a directly accountable owner.", 82, options));
    if (!item.nextStep) itemActions.push(createActionQueueEntry("Next Step", item, "Write the next concrete action.", 78, options));
    if ((item.status === "committed" || item.status === "discovery") && !item.decision) itemActions.push(createActionQueueEntry("Decision", item, "Record the commit, kill, continue, or learn decision.", 74, options));
    if ((item.status === "committed" || item.status === "discovery") && !item.experiment && !item.decision) itemActions.push(createActionQueueEntry("Metric", item, "Add an experiment, target metric, or success signal.", 68, options));
    if (daysSince(itemActivityAt(item), now) > 14) itemActions.push(createActionQueueEntry("Stale", item, "Refresh status, owner, date, or next step.", 60, options));
    return itemActions;
  }).filter(Boolean);

  const ranked = actions.sort((a, b) => b.priority - a.priority || (influence.get(b.item.id) || 0) - (influence.get(a.item.id) || 0));
  const overdue = ranked.filter(entry => entry.type === "Overdue");
  const blockers = ranked.filter(entry => entry.type === "Blocker");
  const decisions = ranked.filter(entry => entry.type === "Decision");
  const initiativeCounts = new Map();
  for (const entry of ranked) initiativeCounts.set(entry.item.id, (initiativeCounts.get(entry.item.id) || 0) + 1);
  return {
    queue: ranked.slice(0, 12),
    overdue: overdue.slice(0, 12),
    blockers: blockers.slice(0, 12),
    decisions: decisions.slice(0, 12),
    countsByInitiative: Object.fromEntries(initiativeCounts),
    metrics: {
      initiatives: initiativeCounts.size,
      total: ranked.length,
      overdue: overdue.length,
      blockers: blockers.length,
      decisions: decisions.length
    }
  };
}

export function isActionQueueEntryComplete(entry, items, now = new Date()) {
  if (!entry?.target?.itemId || !entry.completionCondition) return false;
  const item = items.map(normalizeItem).find((candidate) => candidate.id === entry.target.itemId);
  if (!item) return true;
  const condition = entry.completionCondition;
  if (condition.kind === "field-present") return Boolean(String(item[condition.field] || "").trim());
  if (condition.kind === "any-field-present") return condition.fields.some((field) => Boolean(String(item[field] || "").trim()));
  if (condition.kind === "date-not-overdue") {
    const value = item[condition.field];
    const overdueDays = localDayDifference(value, now);
    return !value || (overdueDays !== null && overdueDays <= 0);
  }
  if (condition.kind === "risk-inactive") {
    const risk = item.risks.find((record) => record.id === entry.target.recordId);
    return !risk || !activeRiskStatuses.has(risk.status);
  }
  if (condition.kind === "fresh-update") return daysSince(itemActivityAt(item), now) <= Number(condition.days || 14);
  return false;
}

export function buildActionMemo(items, now = new Date(), prioritization) {
  const actions = buildActionQueue(items, now, prioritization);
  return [
    `# Action Queue - ${localDateStamp(now)}`,
    "",
    `${actions.metrics.total} actions across ${actions.metrics.initiatives} initiatives. Overdue: ${actions.metrics.overdue} · Blockers: ${actions.metrics.blockers} · Decisions: ${actions.metrics.decisions}.`,
    `Showing ${actions.queue.length} of ${actions.metrics.total} actions, ordered by urgency. Category previews show up to 12 each.`,
    "",
    "## Top Actions",
    actions.queue.length ? actions.queue.map((entry) => `- [${entry.type}] ${entry.title}: ${entry.action}`).join("\n") : "- No urgent actions detected.",
    "",
    `## Overdue (showing ${actions.overdue.length} of ${actions.metrics.overdue})`,
    actions.overdue.length ? actions.overdue.map((entry) => `- ${entry.title}: ${entry.dueDate}`).join("\n") : "- No overdue actions.",
    "",
    `## Blockers (showing ${actions.blockers.length} of ${actions.metrics.blockers})`,
    actions.blockers.length ? actions.blockers.map((entry) => `- ${entry.title}: ${entry.action}`).join("\n") : "- No blockers in the action queue.",
    "",
    `## Decisions (showing ${actions.decisions.length} of ${actions.metrics.decisions})`,
    actions.decisions.length ? actions.decisions.map((entry) => `- ${entry.title}: ${entry.action}`).join("\n") : "- No decision actions in the queue."
  ].join("\n");
}

export function createItem(input, now = new Date()) {
  const title = String(input.title || "").trim();
  if (!title) throw new Error("Title is required.");
  return normalizeItem({
    id: input.id || cryptoId(),
    title,
    customer: input.customer,
    customerIds: input.customerIds,
    segmentIds: input.segmentIds,
    audienceSegments: input.audienceSegments,
    problem: input.problem,
    objective: input.objective,
    primaryMetric: input.primaryMetric,
    metricTarget: input.metricTarget,
    metricReviewDate: input.metricReviewDate,
    owner: input.owner,
    pocPersonId: input.pocPersonId,
    orgUnitId: input.orgUnitId,
    status: input.status || "intake",
    statusId: input.statusId || input.status || "intake",
    reach: input.reach ?? 100,
    impact: input.impact ?? 3,
    confidence: input.confidence ?? 0.7,
    effort: input.effort ?? 3,
    startDate: input.startDate,
    dueDate: input.dueDate,
    nextStep: input.nextStep,
    risks: input.risks,
    dependencies: input.dependencies,
    legacyRisk: input.risk,
    experiment: input.experiment,
    decision: input.decision,
    priorityInputs: input.priorityInputs,
    priorityLevelId: input.priorityLevelId,
    priority: input.priority ?? normalizeItemPriority({}, { legacyRice: false, priorityInputs: input.priorityInputs, priorityLevelId: input.priorityLevelId }),
    updatedAt: validDate(input.updatedAt) ? input.updatedAt : now.toISOString()
  });
}

export function updateItem(items, id, patch, now = new Date()) {
  return items.map((item) => item.id === id ? normalizeItem({ ...item, ...patch, updatedAt: now.toISOString() }) : item);
}

export function deleteItem(items, id) {
  return items.filter((item) => item.id !== id);
}

function itemActivityAt(item) {
  return validDate(item.lastWorkUpdatedAt) && new Date(item.lastWorkUpdatedAt) > new Date(item.updatedAt) ? item.lastWorkUpdatedAt : item.updatedAt;
}

export function normalizeItem(item) {
  const updatedAt = validDate(item.updatedAt) ? new Date(item.updatedAt).toISOString() : new Date().toISOString();
  const collections = normalizeItemCollections(item, updatedAt);
  const priorityInputs = normalizePriorityInputs(item.priorityInputs, item.priorityInputs === undefined ? item : null);
  const priorityLevelId = String(item.priorityLevelId || item.priority?.tierByMethod?.levels || "").trim();
  const normalized = {
    id: String(item.id || cryptoId()),
    title: String(item.title || "Untitled initiative").trim(),
    customer: String(item.customer || "").trim(),
    customerIds: uniqueIds(item.customerIds),
    segmentIds: uniqueIds(item.segmentIds),
    audienceSegments: uniqueIds(item.audienceSegments),
    problem: String(item.problem || "").trim(),
    ...normalizeAuthoredOutcome(item),
    owner: String(item.owner || "").trim(),
    pocPersonId: String(item.pocPersonId || "").trim(),
    orgUnitId: String(item.orgUnitId || "").trim(),
    status: statusLabels[item.status] ? item.status : "intake",
    statusId: String(item.statusId || (statusLabels[item.status] ? item.status : "intake")).trim(),
    reach: clampNumber(item.reach, 0, 100000, 100),
    impact: clampNumber(item.impact, 1, 5, 3),
    confidence: clampNumber(item.confidence, 0.1, 1, 0.7),
    effort: clampNumber(item.effort, 1, 8, 3),
    startDate: String(item.startDate || "").trim(),
    dueDate: String(item.dueDate || "").trim(),
    nextStep: String(item.nextStep || "").trim(),
    risks: collections.risks,
    dependencies: collections.dependencies,
    experiment: String(item.experiment || "").trim(),
    decision: String(item.decision || "").trim(),
    priorityInputs,
    priorityLevelId,
    priority: normalizeItemPriority(item.priority, { legacyRice: item.priority === undefined, priorityInputs, priorityLevelId }),
    updatedAt
  };
  if (Object.prototype.hasOwnProperty.call(item, "configuredPriorityScore")) normalized.configuredPriorityScore = item.configuredPriorityScore;

  if (validDate(item.lastWorkUpdatedAt)) normalized.lastWorkUpdatedAt = new Date(item.lastWorkUpdatedAt).toISOString();
  if (item.configuredPriorityLabel) normalized.configuredPriorityLabel = String(item.configuredPriorityLabel);
  // Transitional, non-canonical compatibility for domain projections that still
  // consume one primary risk string. JSON and workspace allowlists omit it.
  Object.defineProperty(normalized, "risk", { enumerable: false, get: () => primaryRiskText(normalized) });
  if (new TextEncoder().encode(JSON.stringify(normalized)).length > 32768) throw new Error("Initiative exceeds the 32 KiB payload limit.");
  // Operational projections are independently bounded records, not initiative payload.
  for (const field of ["validationRecords", "decisionRecords"]) {
    if (Array.isArray(item[field])) normalized[field] = item[field].map(record => ({ ...record }));
  }
  for (const field of ["currentActionId", "currentDecisionId"]) if (item[field]) normalized[field] = String(item[field]);
  return normalized;
}

function normalizeAuthoredOutcome(input) {
  const output = {};
  for (const field of ["objective", "primaryMetric", "metricTarget", "metricReviewDate"]) {
    const value = input[field];
    if (value != null && typeof value !== "string") throw new Error(`${field} must be text.`);
    const text = (value ?? "").trim();
    if ([...text].length > (field === "metricReviewDate" ? 10 : 8000)) throw new Error(`${field} exceeds its text limit.`);
    if (field === "metricReviewDate" && text && (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00.000Z`)) || new Date(`${text}T00:00:00.000Z`).toISOString().slice(0, 10) !== text)) throw new Error("metricReviewDate must be a real YYYY-MM-DD date.");
    output[field] = text;
  }
  return output;
}

function hasAuthoredOutcome(item) {
  return [item.objective, item.primaryMetric, item.metricTarget, item.metricReviewDate].some(value => String(value || "").trim());
}

function hasAdoptedOutcome(item) {
  return [item.objective, item.primaryMetric, item.metricTarget].every(value => String(value || "").trim());
}

function outcomeSourceKey(origin, ids) {
  return `outcome:${origin}:${JSON.stringify([...ids].sort())}`;
}

function capturedKeyResult(item) {
  const sourceIds = [item.id];
  const sourceKey = outcomeSourceKey("captured", sourceIds);
  const fields = normalizeAuthoredOutcome(item);
  return { id: sourceKey, sourceKey, origin: "captured", sourceIds, initiativeId: item.id, ...fields,
    status: hasAdoptedOutcome(fields) ? "adopted" : "draft",
    result: `${fields.primaryMetric || "Metric not captured"}${fields.metricTarget ? ` — authored target: ${fields.metricTarget}` : " — target not captured"}${fields.metricReviewDate ? `; review ${fields.metricReviewDate}` : ""}` };
}
function normalizeItemCollections(item, timestamp = item?.updatedAt) {
  const normalizedTimestamp = validDate(timestamp) ? new Date(timestamp).toISOString() : new Date().toISOString();
  const legacyRisk = Array.isArray(item?.risks) ? "" : String(item?.legacyRisk || item?.risk || "");
  const risksInput = Array.isArray(item?.risks) ? item.risks : legacyRisk.trim() ? [{
    id: "legacy-risk-1",
    description: legacyRisk,
    likelihood: 3,
    impact: 3,
    status: "open",
    needsClassification: true,
    createdAt: normalizedTimestamp,
    updatedAt: normalizedTimestamp
  }] : [];
  const dependenciesInput = Array.isArray(item?.dependencies) ? item.dependencies : [];
  if (Array.isArray(item?.risks)) validateRiskInputs(risksInput);
  if (Array.isArray(item?.dependencies)) validateDependencyInputs(dependenciesInput, String(item?.id || ""));
  return {
    risks: risksInput.map((record, index) => normalizeRiskRecord(record, { id: `risk-${index + 1}`, timestamp: normalizedTimestamp })),
    dependencies: dependenciesInput.map((record, index) => normalizeDependencyRecord(record, { id: `dependency-${index + 1}`, timestamp: normalizedTimestamp }))
  };
}

function validateRiskInputs(records) {
  validateCollectionInputs(records, "risk", (record, id) => {
    if (!Number.isInteger(Number(record.likelihood)) || Number(record.likelihood) < 1 || Number(record.likelihood) > 5) throw new Error(`Risk ${id} likelihood must be an integer from 1 to 5.`);
    if (!Number.isInteger(Number(record.impact)) || Number(record.impact) < 1 || Number(record.impact) > 5) throw new Error(`Risk ${id} impact must be an integer from 1 to 5.`);
    if (!riskStatusLabels[record.status]) throw new Error(`Risk ${id} has an invalid status.`);
    validateOptionalDate(record.reviewDate, `Risk ${id} review date`);
    validateRecordText(record.mitigation, 2000, `Risk ${id} mitigation`);
  });
}

function validateDependencyInputs(records, itemId) {
  validateCollectionInputs(records, "dependency", (record, id) => {
    if (!dependencyStatusLabels[record.status]) throw new Error(`Dependency ${id} has an invalid status.`);
    if (!["initiative", "external"].includes(record.targetType)) throw new Error(`Dependency ${id} has an invalid target type.`);
    const targetId = String(record.targetInitiativeId || "").trim();
    const targetName = String(record.targetName || "").trim();
    if (!targetName || (record.targetType === "initiative" && !targetId)) throw new Error(`Dependency ${id} requires a target.`);
    if (targetId && targetId === itemId) throw new Error(`Dependency ${id} cannot target its own initiative.`);
    validateOptionalDate(record.neededBy, `Dependency ${id} needed-by date`);
    validateRecordText(record.targetName, 500, `Dependency ${id} target name`);
  });
}

function validateCollectionInputs(records, kind, validateRecord) {
  if (records.length > 100) throw new Error(`An initiative can contain at most 100 ${kind} records.`);
  const ids = new Set();
  records.forEach((record, index) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error(`${kind} ${index + 1} must be a record.`);
    const id = String(record.id || "").trim();
    if (!id || id.length > 200) throw new Error(`${kind} ${index + 1} requires a valid id.`);
    if (ids.has(id)) throw new Error(`Duplicate ${kind} id: ${id}.`);
    ids.add(id);
    if (!String(record.description || "").trim() || String(record.description).length > 1000) throw new Error(`${kind} ${id} requires a description of at most 1000 characters.`);
    validateRecordText(record.ownerPersonId, 200, `${kind} ${id} owner id`);
    validateRecordText(record.ownerName, 300, `${kind} ${id} owner name`);
    if (!validDate(record.createdAt) || !validDate(record.updatedAt)) throw new Error(`${kind} ${id} requires valid record timestamps.`);
    validateRecord(record, id);
  });
}

function validateRecordText(value, maxLength, label) {
  if (String(value || "").length > maxLength) throw new Error(`${label} exceeds ${maxLength} characters.`);
}

function validateOptionalDate(value, label) {
  const text = String(value || "").trim();
  if (text && (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !validDate(`${text}T00:00:00.000Z`))) throw new Error(`${label} is invalid.`);
}

export function exportWorkspace(items, activity = [], insightRecords = []) {
  return encodeWorkspaceDocument(createWorkspaceDocument({ schema: WORKSPACE_DOCUMENT_SCHEMA, items: items.map(normalizeItem), insightRecords, activity: activity.map(normalizeActivityEntry) }));
}

export function importWorkspace(text) {
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.items)) throw new Error("Import file must contain an items array.");
  return parsed.items.map(normalizeItem);
}

export function importActivityLog(text) {
  const parsed = JSON.parse(text);
  return Array.isArray(parsed?.activity) ? parsed.activity.map(normalizeActivityEntry) : [];
}

export function createActivityEntry(action, item, changes = {}, actor = "PM OS", now = new Date()) {
  return normalizeActivityEntry({
    id: cryptoId(),
    action,
    itemId: item?.id || "",
    itemTitle: item?.title || "Workspace",
    actor,
    changes,
    createdAt: now.toISOString()
  });
}

export function normalizeActivityEntry(entry) {
  const changes = entry?.changes && typeof entry.changes === "object" && !Array.isArray(entry.changes) ? entry.changes : {};
  return {
    id: String(entry?.id || cryptoId()),
    action: String(entry?.action || "updated").trim(),
    itemId: String(entry?.itemId || ""),
    itemTitle: String(entry?.itemTitle || "Workspace").trim(),
    actor: String(entry?.actor || "PM OS").trim(),
    changes,
    createdAt: validDate(entry?.createdAt) ? entry.createdAt : new Date().toISOString()
  };
}

export function buildActivityDigest(activity, now = new Date(), context = {}) {
  const normalized = activity.map(normalizeActivityEntry).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recent = normalized.slice(0, 12);
  return [
    `# Activity Digest - ${localDateStamp(now)}`,
    "",
    recent.length ? recent.map((entry) => `- ${entry.createdAt.slice(0, 10)} ${entry.actor} ${entry.action} ${entry.itemTitle}: ${describeActivityChanges(entry.changes, context)}`).join("\n") : "No activity recorded yet."
  ].join("\n");
}

export function describeActivityChanges(changes, context = {}) {
  const entries = Object.entries(changes || {}).flatMap(([field, value]) => {
    if (activityMetadataField(field)) return [];
    const label = activityFieldLabel(field, context);
    if (value && typeof value === "object" && "from" in value && "to" in value) return describeActivityDelta(field, value.from, value.to, context, label);
    const description = describeActivityValue(value, field, context);
    return description ? [`${label}: ${description}`] : [];
  });
  return entries.join("; ") || "No field changes captured.";
}

function activityFieldLabel(field, context = {}, parent = "") {
  if (field === "valuesByMethod") return "score inputs";
  if (field === "tierByMethod") return "priority levels";
  const labels = { customerIds: "customers", segmentIds: "segments", tagIds: "tags", pocPersonId: "point of contact", ownerPersonId: "owner", orgUnitId: "team", initiativeId: "initiative", itemId: "initiative", targetItemId: "target initiative", sourceRecordId: "source record", relatedRecordIds: "related records", statusId: "status", priorityLevelId: "priority level", priorityInputs: "priority scores", rice: "RICE", ice: "ICE", wsjf: "WSJF" };
  const definitions = [...(context.prioritization?.customFrameworks || []).flatMap(entry => [entry, ...(entry.criteria || []), ...(entry.fields || [])]), ...(context.prioritization?.customScorecard?.criteria || [])];
  const known = labels[field] || definitions.find(entry => entry.id === field)?.name;
  if (known) return known;
  if (["priorityInputs", "valuesByMethod"].includes(parent) && !["custom", "value-effort"].includes(field)) return "Unavailable scoring method";
  if (parent.startsWith("custom-") || parent === "custom") return "Unavailable score criterion";
  return ({ targetInitiativeId: "target initiative", supersedesId: "previous document", manualOrder: "initiative order" })[field] || String(field).replace(/Ids?$/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").toLowerCase();
}

function activityMetadataField(field) {
  return ["id", "version", "createdAt", "updatedAt", "updatedBy"].includes(field);
}

function activityEmpty(value) {
  if (value == null || (typeof value === "string" && !value.trim())) return true;
  if (Array.isArray(value)) return value.every(activityEmpty);
  if (typeof value === "object") return Object.entries(value).every(([field, nested]) => activityMetadataField(field) || activityEmpty(nested));
  return false;
}

function activityEqual(left, right, field) {
  if (activityEmpty(left) && activityEmpty(right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    if (/Ids$/.test(field)) return left.length === right.length && left.every(value => right.includes(value));
    return left.length === right.length && left.every((value, index) => activityEqual(value, right[index], field));
  }
  if (left && right && typeof left === "object" && typeof right === "object" && !Array.isArray(left) && !Array.isArray(right)) {
    return [...new Set([...Object.keys(left), ...Object.keys(right)])].every(key => activityMetadataField(key) || activityEqual(left[key], right[key], key));
  }
  return left === right;
}

function describeActivityDelta(field, from, to, context, label) {
  if (activityEqual(from, to, field)) return [];
  if (from && to && typeof from === "object" && typeof to === "object" && !Array.isArray(from) && !Array.isArray(to)) {
    return [...new Set([...Object.keys(from), ...Object.keys(to)])].flatMap(key => activityMetadataField(key) ? [] : describeActivityDelta(key, from[key], to[key], context, `${label} / ${activityFieldLabel(key, context, field)}`));
  }
  if (Array.isArray(from) && Array.isArray(to) && [...from, ...to].every(value => value && typeof value === "object" && value.id)) {
    const result = [];
    for (const before of from) {
      const after = to.find(value => value.id === before.id);
      const name = before.title || before.name || before.description || "record";
      if (!after) result.push(`${label}: removed ${name}`);
      else result.push(...describeActivityDelta(field, before, after, context, `${label} / ${name}`));
    }
    for (const after of to) if (!from.some(value => value.id === after.id)) result.push(`${label}: added ${describeActivityValue(after, field, context) || "record"}`);
    return result;
  }
  const before = describeActivityValue(from, field, context);
  const after = describeActivityValue(to, field, context);
  if (!before && !after) return [];
  if (before === after && (activityRelationship(field, context) || field === "manualOrder")) {
    const removed = Array.isArray(from) && Array.isArray(to) ? from.filter(value => !to.includes(value)).length : 1;
    const added = Array.isArray(from) && Array.isArray(to) ? to.filter(value => !from.includes(value)).length : 1;
    return [`${label}: changed (${removed} removed, ${added} added; ${before})`];
  }
  return [`${label}: ${!after ? `cleared (was ${before})` : !before ? after : `${before} -> ${after}`}`];
}

function activityRelationship(field, context) {
  const directory = context.customerDirectory || {}, organization = context.organization || {};
  const relationships = {
    customerIds: [directory.accounts, "customer"], segmentIds: [directory.segments, "segment"], tagIds: [directory.tags, "tag"],
    pocPersonId: [organization.people, "person"], ownerPersonId: [organization.people, "person"], orgUnitId: [organization.units, "team"],
    initiativeId: [context.items, "initiative"], itemId: [context.items, "initiative"], itemIds: [context.items, "initiative"], targetItemId: [context.items, "initiative"], targetInitiativeId: [context.items, "initiative"],
    supersedesId: [context.artifacts, "document"],
    sourceRecordId: [context.insightRecords, "record"], relatedRecordIds: [context.insightRecords, "record"],
    statusId: [context.workflow?.statuses, "status"], priorityLevelId: [context.prioritization?.levels, "priority level"], levels: [context.prioritization?.levels, "priority level"]
  };
  return relationships[field] || (/Ids?$/.test(field) ? [[], "reference"] : null);
}

function describeActivityValue(value, field, context) {
  if (activityEmpty(value)) return "";
  if (Array.isArray(value)) return value.map(entry => describeActivityValue(entry, field === "manualOrder" ? "initiativeId" : field, context)).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return Object.entries(value).flatMap(([key, nested]) => {
      if (activityMetadataField(key)) return [];
      const description = describeActivityValue(nested, key, context);
      return description ? [`${activityFieldLabel(key, context, field)}: ${description}`] : [];
    }).join(", ");
  }
  const relationship = activityRelationship(field, context);
  if (relationship) {
    const [records, kind] = relationship;
    const record = (records || []).find(entry => entry.id === value);
    return record?.displayName || record?.name || record?.title || record?.label || `Unavailable ${kind} (deleted or not in this workspace)`;
  }
  return String(value);
}

export function daysSince(dateValue, now = new Date()) {
  if (!validDate(dateValue)) return 0;
  return Math.floor((now.getTime() - new Date(dateValue).getTime()) / 86400000);
}

function actionQueueDefinition(input) {
  return Object.freeze({
    requiredCapability: null,
    capabilityPolicy: "core",
    ...input,
    editor: Object.freeze({ ...input.editor }),
    completionCondition: Object.freeze({ ...input.completionCondition })
  });
}

function createActionQueueEntry(type, item, action, priority, options = {}, targetRecord = null) {
  const definition = ACTION_QUEUE_DEFINITIONS[type];
  if (!actionQueueDefinitionSupported(definition)) return null;
  const enabledCapabilities = new Set(Array.isArray(options.enabledCapabilities) ? options.enabledCapabilities : []);
  if (definition.requiredCapability && definition.capabilityPolicy === "suppress" && !enabledCapabilities.has(definition.requiredCapability)) return null;
  const target = targetRecord
    ? { kind: "risk", itemId: item.id, recordId: targetRecord.id }
    : { kind: "initiative", itemId: item.id };
  return {
    id: `${item.id}:${definition.key}${targetRecord ? `:${targetRecord.id}` : ""}`,
    type,
    title: item.title,
    item,
    target,
    owner: item.owner || "Unassigned",
    dueDate: item.dueDate || "No date",
    priority,
    action,
    score: null,
    label: definition.label,
    heading: definition.heading(item, targetRecord),
    requestedOutcome: definition.requestedOutcome,
    requiredCapability: definition.requiredCapability,
    capabilityPolicy: definition.capabilityPolicy,
    editor: { ...definition.editor },
    completionCondition: { ...definition.completionCondition },
    availability: options.readOnlyReason ? "read-only" : "actionable",
    unavailableReason: options.readOnlyReason || ""
  };
}

function actionQueueDefinitionSupported(definition) {
  if (!definition?.key || !definition?.label || !definition?.requestedOutcome) return false;
  if (!definition.editor?.surface || !definition.editor?.field || !definition.completionCondition?.kind) return false;
  return ["initiative", "risk"].includes(definition.editor.surface);
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function validDate(value) {
  return Boolean(value) && !Number.isNaN(new Date(value).getTime());
}

function normalizeDateInput(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && validDate(`${text}T00:00:00.000Z`) ? text : "";
}

function cryptoId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function buildStakeholderUpdate(items, now = new Date(), prioritization) {
  const plan = buildReleasePlan(items, prioritization);
  const followUps = buildFollowUps(items, prioritization);
  const shipped = prioritizeItems(items, prioritization).filter((item) => item.status === "shipped").slice(0, 3);
  return {
    generatedAt: now.toISOString(),
    headline: summarizeHeadline(items),
    shipped,
    now: plan.now,
    next: plan.next,
    risks: followUps.filter((item) => activeRisks(item).length).slice(0, 5),
    asks: followUps.filter((item) => !item.owner.trim() || !item.nextStep.trim()).slice(0, 5)
  };
}

export function buildLaunchChecklist(item) {
  const normalized = normalizeItem(item);
  return [
    { area: "Customer", actions: [{ field: "customer", label: "Set launch audience" }], task: "Confirm target segment and launch audience.", done: Boolean(normalized.customer) },
    { area: "Problem", actions: [{ field: "problem", label: "Describe problem" }], task: "Capture the customer problem statement.", done: Boolean(normalized.problem) },
    { area: "Owner", actions: [{ field: "owner", label: "Assign owner" }], task: "Assign accountable PM/DRI.", done: Boolean(normalized.owner) },
    { area: "Delivery", actions: [{ field: "dueDate", label: "Set release date" }], task: "Confirm due date or release window.", done: Boolean(normalized.dueDate) },
    { area: "Decision", actions: [{ field: "decision", label: "Record decision" }], task: "Record launch decision and tradeoffs.", done: Boolean(normalized.decision) },
    { area: "Experiment", actions: [{ field: "experiment", label: "Add measurement" }], task: "Define measurement or rollout experiment.", done: Boolean(normalized.experiment) },
    { area: "Risk", actions: activeRisks(normalized).map((record) => ({ section: "risks", recordId: record.id, label: `Review risk: ${record.description}` })), task: "Resolve or explicitly accept captured risks.", done: activeRisks(normalized).length === 0 },
    { area: "Follow-up", actions: [{ field: "nextStep", label: "Add next step" }], task: "Write the next operational step.", done: Boolean(normalized.nextStep) }
  ];
}

export function calculateLaunchReadiness(item) {
  return summarizeLaunchReadiness(item).percent;
}

export function summarizeLaunchReadiness(item) {
  const checklist = buildLaunchChecklist(item);
  const completed = checklist.filter((entry) => entry.done).length;
  const total = checklist.length;
  return {
    completed,
    total,
    percent: total ? Math.round((completed / total) * 100) : 0
  };
}

function summarizeHeadline(items) {
  const health = calculateHealth(items);
  if (health.noNextStep || health.unowned) {
    return `${health.active} active initiatives need ${health.noNextStep + health.unowned} operational fixes.`;
  }
  return `${health.active} active initiatives are moving with clear ownership and next steps.`;
}

export const pmTemplates = [
  {
    id: "weekly-review",
    title: "Weekly Product Review",
    description: "A crisp operating review for active initiatives, risks, asks, and shipped work."
  },
  {
    id: "prd",
    title: "PRD Starter",
    description: "A lightweight product requirements draft grounded in the selected initiative."
  },
  {
    id: "launch-plan",
    title: "Launch Plan",
    description: "A readiness-oriented launch plan with owners, risks, rollout, and follow-up."
  }
];

export function exportCsv(items) {
  const fields = ["id", "title", "customer", "customerIds", "segmentIds", "problem", "objective", "primaryMetric", "metricTarget", "metricReviewDate", "owner", "pocPersonId", "orgUnitId", "status", "statusId", "reach", "impact", "confidence", "effort", "startDate", "dueDate", "nextStep", "risks", "dependencies", "experiment", "decision", "priority", "priorityLevelId", "priorityInputs", "updatedAt"];
  const jsonFields = new Set(["customerIds", "segmentIds", "risks", "dependencies", "priority", "priorityInputs"]);
  const rows = [fields, ...items.map((item) => {
    const normalized = normalizeItem(item);
    return fields.map((field) => jsonFields.has(field) ? JSON.stringify(normalized[field]) : normalized[field]);
  })];
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function importCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1)
    .filter((row) => row.some((value) => value.trim()))
    .map((row) => {
      const record = Object.fromEntries(headers.map((header, index) => [header, row[index] || ""]));
      for (const field of ["customerIds", "segmentIds", "risks", "dependencies", "priority", "priorityInputs"]) {
        if (!record[field]) continue;
        try { record[field] = JSON.parse(record[field]); }
        catch { throw new Error(`${field} must contain valid JSON.`); }
      }
      return createItem(record);
    });
}

// Import guidance observes the already parsed candidate; it never creates IDs or changes parser semantics.
export function buildImportFormatDisclosure({ format, text = "", items = [], workspace = {} }) {
  if (!["csv", "markdown"].includes(format)) throw new Error("Import disclosure requires csv or markdown format.");
  const csvFields = ["id", "title", "customer", "customerIds", "segmentIds", "audienceSegments", "problem", "objective", "primaryMetric", "metricTarget", "metricReviewDate", "owner", "pocPersonId", "orgUnitId", "status", "statusId", "reach", "impact", "confidence", "effort", "startDate", "dueDate", "nextStep", "risks", "risk", "dependencies", "experiment", "decision", "priority", "priorityLevelId", "priorityInputs", "updatedAt"];
  const labels = { id: "initiative IDs", title: "titles", customer: "audience text", customerIds: "customer links", segmentIds: "segment links", audienceSegments: "audience labels", primaryMetric: "primary metric", metricTarget: "metric target", metricReviewDate: "metric review date", owner: "owner names", pocPersonId: "person links", orgUnitId: "team links", status: "reporting category", statusId: "workflow stage IDs", startDate: "start dates", dueDate: "due dates", nextStep: "next steps", priorityLevelId: "priority level IDs", priorityInputs: "priority scores", updatedAt: "updated timestamps" };
  let records;
  let sourceStatuses;
  let ignoredFields;
  if (format === "csv") {
    const rows = parseCsv(String(text));
    const headers = (rows[0] || []).map(value => value.trim());
    records = rows.slice(1).filter(row => row.some(value => value.trim())).map(row => Object.fromEntries(headers.map((field, index) => [field, row[index] || ""])));
    ignoredFields = [...new Set(headers.filter(field => field && !csvFields.includes(field)))];
    sourceStatuses = records.map(record => record.statusId || record.status || "Not supplied");
  } else {
    const sections = { "Customer / Segment": "customer", Problem: "problem", "Next Step": "nextStep", Risks: "risks", "Risk / Dependency": "risk", Dependencies: "dependencies", Experiment: "experiment", Decision: "decision" };
    const opsFields = { owner: "owner", status: "status", reach: "reach", impact: "impact", confidence: "confidence", effort: "effort", "planned start": "startDate", "due date": "dueDate" };
    const issues = String(text).split(/\n\s*---\s*\n/g).map(value => value.trim()).filter(Boolean);
    sourceStatuses = issues.map(issue => parseProductOps(sectionText(issue, "Product Ops")).status || "Not supplied");
    records = issues.map(issue => {
      const record = { title: firstMarkdownHeading(issue) };
      for (const [heading, field] of Object.entries(sections)) record[field] = cleanImportedValue(sectionText(issue, heading));
      const ops = parseProductOps(sectionText(issue, "Product Ops"));
      for (const [key, field] of Object.entries(opsFields)) record[field] = ops[key] || "";
      return record;
    });
    const recognized = new Set([...Object.keys(sections), "Product Ops"].map(value => value.toLowerCase()));
    ignoredFields = [...new Set(issues.flatMap(issue => [
      ...[...issue.matchAll(/^##\s+(.+)$/gm)].map(match => match[1].trim()).filter(heading => !recognized.has(heading.toLowerCase())),
      ...Object.keys(parseProductOps(sectionText(issue, "Product Ops"))).filter(key => !Object.hasOwn(opsFields, key)).map(key => `Product Ops: ${key}`)
    ]))];
  }
  const fields = csvFields.map(field => ({ field, label: labels[field] || field, count: records.filter(record => String(record[field] ?? "").trim() !== "").length, persisted: !["nextStep", "experiment", "decision", "audienceSegments"].includes(field) })).filter(entry => entry.count);
  const ids = values => new Set((values || []).map(value => value.id));
  const available = {
    team: ids(workspace.organization?.units), person: ids(workspace.organization?.people),
    customer: ids(workspace.customerDirectory?.accounts), segment: ids(workspace.customerDirectory?.segments),
    initiative: ids(format === "markdown" ? [...(workspace.items || []), ...items] : items)
  };
  const missingReferences = [];
  const seenReferences = new Set();
  const inspect = (kind, value, item) => {
    if (!value || available[kind].has(value)) return;
    const key = `${kind}:${value}`;
    if (seenReferences.has(key)) return;
    seenReferences.add(key);
    missingReferences.push({ kind, id: value, itemId: item.id, itemTitle: item.title });
  };
  for (const item of items) {
    inspect("team", item.orgUnitId, item);
    inspect("person", item.pocPersonId, item);
    for (const id of item.customerIds || []) inspect("customer", id, item);
    for (const id of item.segmentIds || []) inspect("segment", id, item);
    for (const record of [...(item.risks || []), ...(item.dependencies || [])]) inspect("person", record.ownerPersonId, item);
    for (const record of item.dependencies || []) if (record.targetType === "initiative") inspect("initiative", record.targetInitiativeId, item);
  }
  const workflowMappings = [];
  const mappings = new Map();
  items.forEach((item, index) => {
    const source = sourceStatuses[index] || "Not supplied";
    const stage = workspace.workflow?.statuses?.find(status => status.id === item.statusId);
    const category = statusLabels[item.status] || item.status;
    const stageLabel = stage?.name || (!workspace.workflow?.statuses && statusLabels[item.statusId]) || `Unavailable stage (${item.statusId})`;
    const key = JSON.stringify([source, item.statusId, item.status]);
    if (mappings.has(key)) { mappings.get(key).count += 1; return; }
    const mapping = { source, statusId: item.statusId, status: item.status, stage: stageLabel, category, count: 1 };
    mappings.set(key, mapping);
    workflowMappings.push(mapping);
  });
  const limitations = [
    format === "markdown"
      ? "Markdown adds new initiative IDs; it does not restore original team, person, customer or segment assignments. Dependency targets become external descriptions."
      : "CSV replaces the initiative list. Linked IDs do not import their team, person, customer or segment records; those must already exist in this workspace.",
    "Owner names without a person link remain unlinked text in current workspaces; original person IDs are not recovered from names. Audience text alone does not create customer, tag or segment assignments in this import.",
    "These formats do not restore workspace settings, workflow definitions, saved documents, activity history or standalone insight records; existing workspace records and saved documents remain. Use JSON for a complete workspace backup."
  ];
  const summarize = (values, limit = 6) => values.slice(0, limit).join("; ") + (values.length > limit ? `; and ${values.length - limit} more` : "");
  const description = [
    `${format === "csv" ? "CSV" : "Markdown"} contains ${items.length} initiative${items.length === 1 ? "" : "s"}.`,
    `Fields with supplied values (rows): ${fields.filter(entry => entry.persisted).length ? fields.filter(entry => entry.persisted).map(entry => `${entry.label} (${entry.count})`).join(", ") : "none; parser defaults apply"}. Omitted or blank fields use the import parser's defaults.`,
    fields.some(entry => !entry.persisted) ? `Parsed text not restored as canonical work records or audience assignments: ${fields.filter(entry => !entry.persisted).map(entry => entry.label).join(", ")}. Use JSON to restore those records.` : "",
    ignoredFields.length ? `Not imported: ${summarize(ignoredFields)}.` : "",
    ...limitations,
    missingReferences.length ? `Missing linked records (${missingReferences.length}): ${summarize(missingReferences.map(entry => `${entry.kind} ${entry.id} used by ${entry.itemTitle}`))}. Review these links before importing.` : "No missing linked records found in the resulting initiative list and current directories.",
    `Workflow mapping: ${summarize(workflowMappings.map(entry => `${entry.source} → ${entry.stage} / ${entry.category} (${entry.count})`)) || "no initiatives"}. Workflow definitions are not imported.`
  ].filter(Boolean).join("\n\n");
  return { format, itemCount: items.length, fields, ignoredFields, missingReferences, workflowMappings, limitations, description };
}

export function importGitHubIssueMarkdown(text) {
  return String(text || "")
    .split(/\n\s*---\s*\n/g)
    .map((issueText) => issueText.trim())
    .filter(Boolean)
    .map(parseGitHubIssueMarkdown);
}

function savedSuccessMetricMarkdown(item) {
  return `## Success Metric\n${item?.primaryMetric || "Primary metric not captured."}\nAuthored target: ${item?.metricTarget || "Not captured"}\nReview date: ${item?.metricReviewDate || "Not captured"}`;
}

export function buildTemplateDraft(templateId, items, prioritization) {
  const prioritized = prioritizeItems(items, prioritization);
  const update = buildStakeholderUpdate(items, new Date(), prioritization);
  const primary = prioritized[0] || null;

  if (templateId === "prd") {
    return [
      "# Product Requirements Draft",
      "",
      `## Initiative
${primary?.title || "Untitled initiative"}`,
      `## Customer
${primary?.customer || "Target customer not captured."}`,
      `## Problem
${primary?.problem || "Problem statement not captured."}`,
      savedSuccessMetricMarkdown(primary),
      `## Scope
Start with ${primary?.nextStep || "the next validated step"}.`,
      `## Risks
${primaryRiskText(primary) || "No explicit risks captured."}`,
      `## Decision
${primary?.decision || "Pending."}`
    ].join("\n\n");
  }

  if (templateId === "launch-plan") {
    const checklist = primary ? buildLaunchChecklist(primary) : [];
    return [
      "# Launch Plan",
      "",
      `## Initiative
${primary?.title || "Untitled initiative"}`,
      `## Owner
${primary?.owner || "Owner needed."}`,
      `## Date
${primary?.dueDate || "Release window needed."}`,
      "## Readiness",
      ...checklist.map((entry) => `- [${entry.done ? "x" : " "}] ${entry.area}: ${entry.task}`),
      "",
      savedSuccessMetricMarkdown(primary),
      `## Experiment
${primary?.experiment || "Experiment not captured."}`,
      `## Rollout
Define the rollout plan.`,
      `## Risks
${primaryRiskText(primary) || "No explicit risks captured."}`
    ].join("\n");
  }

  return [
    "# Weekly Product Review",
    "",
    `## Headline
${update.headline}`,
    `## Shipped
${listTitles(update.shipped, "Nothing shipped this period.")}`,
    `## Now
${listTitles(update.now, "No committed initiatives.")}`,
    `## Next
${listTitles(update.next, "No discovery initiatives.")}`,
    `## Risks
${listTitles(update.risks, "No major risks captured.")}`,
    `## Asks
${listTitles(update.asks, "No operational asks.")}`
  ].join("\n\n");
}

function listTitles(items, fallback) {
  if (!items.length) return fallback;
  return items.map((item) => `- ${item.title}`).join("\n");
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }

  row.push(value);
  rows.push(row);
  return rows;
}

function parseGitHubIssueMarkdown(text) {
  const title = firstMarkdownHeading(text) || "Imported GitHub issue";
  const productOps = parseProductOps(sectionText(text, "Product Ops"));
  return createItem({
    title,
    customer: cleanImportedValue(sectionText(text, "Customer / Segment")),
    problem: cleanImportedValue(sectionText(text, "Problem")),
    owner: productOps.owner || "",
    status: statusFromLabel(productOps.status),
    reach: productOps.reach || 100,
    impact: productOps.impact || 3,
    confidence: productOps.confidence || 0.7,
    effort: productOps.effort || 3,
    startDate: productOps["planned start"] || "",
    dueDate: productOps["due date"] || "",
    nextStep: cleanImportedValue(sectionText(text, "Next Step")),
    risks: parseRiskMarkdown(sectionText(text, "Risks"), cleanImportedValue(sectionText(text, "Risk / Dependency"))),
    dependencies: parseDependencyMarkdown(sectionText(text, "Dependencies")),
    experiment: cleanImportedValue(sectionText(text, "Experiment")),
    decision: cleanImportedValue(sectionText(text, "Decision"))
  });
}

function firstMarkdownHeading(text) {
  const match = String(text).match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function sectionText(text, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(text).match(new RegExp(`(?:^|\\n)##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, "i"));
  return match ? match[1].trim() : "";
}

function parseProductOps(text) {
  return String(text || "").split(/\r?\n/).reduce((record, line) => {
    const match = line.match(/^-\s*([^:]+):\s*(.*)$/);
    if (match) record[match[1].trim().toLowerCase()] = cleanImportedValue(match[2]);
    return record;
  }, {});
}

function cleanImportedValue(value) {
  const text = String(value || "").trim();
  if (!text || /^(not specified|problem statement needed|define the next action|no risk captured|no experiment captured|decision pending|unowned|not set)\.?$/i.test(text)) return "";
  return text;
}

function statusFromLabel(label) {
  const normalized = String(label || "").trim().toLowerCase();
  return Object.entries(statusLabels).find(([value, text]) => value === normalized || text.toLowerCase() === normalized)?.[0] || "intake";
}

export function buildRiskRegister(items, prioritization) {
  const normalized = items.map(normalizeItem);
  const influence = priorityInfluence(normalized, prioritization);
  return prioritizeItems(normalized, prioritization)
    .flatMap((item) => activeRisks(item).map((record) => ({
      item,
      record,
      severity: riskSeverityScore(record),
      status: riskSeverityLabel(record),
      owner: resolveRecordOwner(record, item),
      priorityContribution: influence.get(item.id) || 0,
      mitigation: record.mitigation || item.nextStep || "Define mitigation owner and next action."
    })))
    .sort((a, b) => Number(b.record.needsClassification) - Number(a.record.needsClassification)
      || b.severity - a.severity
      || b.priorityContribution - a.priorityContribution
      || String(a.record.reviewDate || "9999").localeCompare(String(b.record.reviewDate || "9999")));
}

function parseRiskMarkdown(text, legacyText = "") {
  const records = markdownRecordLines(text).map((line, index) => {
    const { status, description, fields } = parseStructuredMarkdownLine(line, "open");
    return normalizeRiskRecord({
      id: `imported-risk-${index + 1}`,
      description,
      status: riskStatusLabels[status] ? status : "open",
      likelihood: Number(fields.likelihood) || 3,
      impact: Number(fields.impact) || 3,
      ownerName: fields.owner || "",
      mitigation: fields.mitigation || "",
      reviewDate: fields.review || "",
      needsClassification: fields.classification === "needed"
    });
  }).filter((record) => record.description);
  if (records.length || !legacyText) return records;
  return [normalizeRiskRecord({ id: "legacy-risk-1", description: legacyText, likelihood: 3, impact: 3, status: "open", needsClassification: true })];
}

function parseDependencyMarkdown(text) {
  return markdownRecordLines(text).map((line, index) => {
    const { status, description, fields } = parseStructuredMarkdownLine(line, "pending");
    return normalizeDependencyRecord({
      id: `imported-dependency-${index + 1}`,
      description,
      status: dependencyStatusLabels[status] ? status : "pending",
      targetType: "external",
      targetName: fields.target || "Imported dependency",
      ownerName: fields.owner || "",
      neededBy: fields.needed || ""
    });
  }).filter((record) => record.description);
}

function markdownRecordLines(text) {
  return String(text || "").split(/\r?\n/).map((line) => line.trim()).filter((line) => /^-\s+/.test(line) && !/no (active )?(risks|dependencies)/i.test(line));
}

function parseStructuredMarkdownLine(line, fallbackStatus) {
  const pieces = line.replace(/^-\s*/, "").split("|").map((piece) => piece.trim());
  const head = pieces.shift() || "";
  const match = head.match(/^\[([^\]]+)\]\s*(.*)$/);
  const fields = {};
  pieces.forEach((piece) => {
    const field = piece.match(/^([^:]+):\s*(.*)$/);
    if (field) fields[field[1].trim().toLowerCase()] = field[2].trim();
  });
  return { status: (match?.[1] || fallbackStatus).toLowerCase(), description: (match?.[2] || head).trim(), fields };
}

export function buildEscalationBoard(items, now = new Date(), prioritization) {
  const risks = buildRiskRegister(items, prioritization);
  const dependencies = buildDependencyMap(items, now, prioritization);
  const activeActions = buildActionQueue(items, now, prioritization).queue;
  const escalations = risks.map((risk) => {
    const blocker = dependencies.blockers.find((entry) => entry.item.id === risk.item.id);
    const action = activeActions.find((entry) => entry.item.id === risk.item.id);
    return {
      title: risk.item.title,
      item: risk.item,
      recordId: risk.record.id,
      severity: risk.severity,
      owner: risk.owner,
      segment: risk.item.customer || "Unspecified segment",
      risk: risk.record.description,
      ask: blocker?.ask || risk.mitigation,
      nextStep: risk.item.nextStep || action?.action || "Define mitigation owner and next action.",
      dueDate: risk.record.reviewDate || risk.item.dueDate || "No date",
      status: risk.status
    };
  });
  return {
    escalations,
    critical: escalations.filter((entry) => entry.status === "Critical"),
    watch: escalations.filter((entry) => entry.status === "Watch"),
    monitor: escalations.filter((entry) => entry.status === "Monitor"),
    metrics: {
      total: escalations.length,
      critical: escalations.filter((entry) => entry.status === "Critical").length,
      watch: escalations.filter((entry) => entry.status === "Watch").length,
      unassigned: escalations.filter((entry) => entry.owner === "Unassigned").length
    }
  };
}

export function buildEscalationMemo(items, now = new Date(), prioritization) {
  const board = buildEscalationBoard(items, now, prioritization);
  return [
    `# Escalation Review - ${localDateStamp(now)}`,
    "",
    "## Critical",
    board.critical.length ? board.critical.map((entry) => `- ${entry.title} [${entry.owner}] severity ${entry.severity}: ${entry.ask}`).join("\n") : "- No critical escalations.",
    "",
    "## Watch",
    board.watch.length ? board.watch.map((entry) => `- ${entry.title} [${entry.owner}] severity ${entry.severity}: ${entry.ask}`).join("\n") : "- No watch-list escalations.",
    "",
    "## Monitor",
    board.monitor.length ? board.monitor.map((entry) => `- ${entry.title} [${entry.owner}] severity ${entry.severity}: ${entry.nextStep}`).join("\n") : "- No monitored escalations.",
    "",
    "## Owner Gaps",
    board.escalations.filter((entry) => entry.owner === "Unassigned").length ? board.escalations.filter((entry) => entry.owner === "Unassigned").map((entry) => `- ${entry.title}: assign owner for ${entry.risk}`).join("\n") : "- Every escalation has an owner."
  ].join("\n");
}

export function buildStakeholderMap(items) {
  const owners = new Map();
  const segments = new Map();
  let unowned = 0;

  items.forEach((item) => {
    const owner = item.owner || "Unowned";
    owners.set(owner, (owners.get(owner) || 0) + 1);
    audienceFor(item).forEach((segment) => segments.set(segment, (segments.get(segment) || 0) + 1));
    if (!item.owner) unowned += 1;
  });

  return {
    owners: [...owners.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    segments: [...segments.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    unowned
  };
}

export function buildStakeholderGovernance(items, now = new Date(), prioritization, options = {}) {
  const active = prioritizeItems(items.map(normalizeItem), prioritization).filter((item) => item.status !== "shipped" && item.status !== "parked");
  const map = buildStakeholderMap(active);
  const comms = buildCommunicationPlan(active, now, prioritization, options);
  const actions = buildActionQueue(active, now, prioritization);
  const risks = buildRiskRegister(active, prioritization);
  const ownerLoad = map.owners.map((owner) => ({
    ...owner,
    items: active.filter((item) => (item.owner || "Unowned") === owner.name).slice(0, 4),
    pressure: owner.count + actions.queue.filter((entry) => entry.owner === owner.name || (!entry.item.owner && owner.name === "Unowned")).length
  })).sort((a, b) => b.pressure - a.pressure || b.count - a.count);
  const segmentAttention = map.segments.map((segment) => {
    const segmentItems = active.filter((item) => audienceFor(item).includes(segment.name));
    return {
      ...segment,
      risks: segmentItems.reduce((count, item) => count + activeRisks(item).length, 0),
      items: segmentItems.slice(0, 4),
      ask: segmentItems.find((item) => item.nextStep)?.nextStep || "Confirm segment priority and next learning target."
    };
  }).sort((a, b) => b.risks - a.risks || b.count - a.count);
  const openAsks = [
    ...actions.queue.slice(0, 5).map((entry) => ({ sourceKey: `queue-${entry.type.toLowerCase().replaceAll(" ", "-")}`, itemId: entry.item.id, target: entry.target, audience: entry.owner, title: entry.title, ask: entry.action, urgency: entry.priority })),
    ...comms.audiences.map((entry) => ({ ...entry, title: entry.focus, urgency: 50 }))
  ].slice(0, 8);

  return {
    ownerLoad,
    segmentAttention,
    openAsks,
    escalations: comms.escalation.slice(0, 6),
    riskOwners: risks.slice(0, 6).map((risk) => ({ itemId: risk.item.id, recordId: risk.record.id, owner: risk.owner, title: risk.item.title, risk: risk.record.description, severity: risk.severity, ask: risk.mitigation })),
    metrics: {
      owners: map.owners.filter((owner) => owner.name !== "Unowned").length,
      unowned: map.unowned,
      segments: map.segments.length,
      asks: openAsks.length,
      escalations: comms.escalation.length
    }
  };
}

export function buildStakeholderMemo(items, now = new Date(), prioritization, options = {}) {
  const governance = buildStakeholderGovernance(items, now, prioritization, options);
  return [
    `# Stakeholder Governance - ${localDateStamp(now)}`,
    "",
    "## Owner Load",
    governance.ownerLoad.length ? governance.ownerLoad.map((owner) => `- ${owner.name}: ${owner.count} initiative(s), pressure ${owner.pressure}`).join("\n") : "- No owner load detected.",
    "",
    "## Segment Attention",
    governance.segmentAttention.length ? governance.segmentAttention.map((segment) => `- ${segment.name}: ${segment.count} initiative(s), ${segment.risks} risk(s). Ask: ${segment.ask}`).join("\n") : "- No segment attention needed.",
    "",
    "## Open Asks",
    governance.openAsks.length ? governance.openAsks.map((entry) => `- ${entry.audience}: ${entry.title} - ${entry.ask}`).join("\n") : "- No open asks.",
    "",
    "## Escalations",
    governance.escalations.length ? governance.escalations.map((entry) => `- ${entry.title} [${entry.owner}] severity ${entry.severity}: ${entry.ask}`).join("\n") : "- No escalations."
  ].join("\n");
}

export function buildOperatingCadence(items, prioritization) {
  const followUps = buildFollowUps(items, prioritization);
  const risks = buildRiskRegister(items, prioritization);
  const stakeholderMap = buildStakeholderMap(items);
  const plan = buildReleasePlan(items, prioritization);

  return [
    {
      name: "Daily Triage",
      cadence: "Daily",
      focus: "New intake, blocked work, and missing next steps.",
      agenda: followUps.slice(0, 4).map((item) => item.title)
    },
    {
      name: "Weekly Product Review",
      cadence: "Weekly",
      focus: "Roadmap movement, risks, asks, and decisions.",
      agenda: [...plan.now, ...risks.slice(0, 2).map((risk) => risk.item)].slice(0, 5).map((item) => item.title)
    },
    {
      name: "Stakeholder Sync",
      cadence: "Biweekly",
      focus: "Customer segments, owner load, and executive asks.",
      agenda: stakeholderMap.segments.slice(0, 4).map((segment) => segment.name)
    },
    {
      name: "Launch Readiness",
      cadence: "Before release",
      focus: "Checklist gaps, rollout plan, and launch decision.",
      agenda: plan.now.map((item) => item.title)
    }
  ];
}

export function buildOutcomeReport(items, prioritization, options = {}) {
  const normalized = items.map(normalizeItem);
  const active = normalized.filter((item) => item.status !== "shipped" && item.status !== "parked");
  const shipped = normalized.filter((item) => item.status === "shipped");
  const committed = normalized.filter((item) => item.status === "committed");
  const risks = buildRiskRegister(normalized, prioritization);
  const readinessScores = committed.map(calculateLaunchReadiness);
  const averageReadiness = readinessScores.length ? Math.round(readinessScores.reduce((sum, score) => sum + score, 0) / readinessScores.length) : 0;

  return {
    active: active.length,
    shipped: shipped.length,
    committed: committed.length,
    highRisk: risks.filter((risk) => risk.severity >= 50).length,
    averageReadiness,
    topThemes: buildCustomerThemes(normalized, options).slice(0, 5)
  };
}

// Canonical collections are authoritative even when empty. Legacy scalars are
// accepted only for callers that have not projected or supplied record collections.
function synthesisRecords(item, type, options) {
  const field = type === "decision" ? "decisionRecords" : "validationRecords";
  const canonical = Array.isArray(options?.insightRecords);
  const source = canonical ? options.insightRecords : item[field];
  if (!Array.isArray(source)) return null;
  return source.filter(record => record?.id && String(record.initiativeId || "") === item.id && (record.type || type) === type);
}

function synthesisItems(items, options) {
  const scoped = items.map(normalizeItem);
  if (options.includeUnlinked === true && Array.isArray(options.insightRecords) && options.insightRecords.some(record => !record.initiativeId)) {
    scoped.push({ id: "", title: "Unlinked record", status: "intake", decision: "", experiment: "" });
  }
  return scoped;
}

export function buildDecisionSynthesis(items, options = {}) {
  const pending = [], decided = [], suggestions = [];
  for (const item of synthesisItems(items, options)) {
    const active = !["shipped", "parked"].includes(item.status);
    const records = synthesisRecords(item, "decision", options);
    for (const record of records || []) {
      const entry = { itemId: item.id, recordId: record.id, title: record.title || "Untitled decision", initiativeTitle: item.title,
        ask: record.question || "Question not captured", context: record.rationale || "Context not captured",
        outcome: record.outcome || "", owner: record.owner || "Unassigned", dueDate: record.dueDate || "No date",
        decidedAt: record.decidedAt || "", status: record.status, origin: "captured", sourceIds: [record.id] };
      if (record.status === "decided") decided.push(entry);
      else if (active && ["pending", "revisit"].includes(record.status)) pending.push(entry);
    }
    if (records === null && item.decision) decided.push({ itemId: item.id, recordId: "", title: item.title,
      initiativeTitle: item.title, ask: "", context: "Legacy initiative decision", outcome: item.decision,
      owner: item.owner || "Unassigned", dueDate: "No date", decidedAt: "", status: "decided", origin: "captured", sourceIds: [item.id] });
    const validations = synthesisRecords(item, "validation", options);
    const hasExperiment = validations === null ? Boolean(item.experiment) : validations.some(record => ["planned", "running", "unknown"].includes(record.status) && (record.method || record.successMetric));
    if (active && !(records?.length) && !(records === null && item.decision) && (item.status === "committed" || hasExperiment)) {
      suggestions.push({ itemId: item.id, recordId: "", title: item.title, initiativeTitle: item.title,
        ask: item.status === "committed" ? `Approve, revise, or stop ${item.title}.` : `Decide whether the evidence supports committing, continuing discovery, or stopping ${item.title}.`,
        context: primaryRiskText(item) || item.experiment || item.problem || "Active work needs an explicit direction.", outcome: "",
        owner: item.owner || "Unassigned", dueDate: item.dueDate || "No date", status: "suggested", origin: "suggested", sourceIds: [item.id] });
    }
  }
  return { pending, decided, suggestions };
}

function buildLearningEvidence(items, options, decisions) {
  const evidence = decisions.decided.map(entry => ({ ...entry, type: "decision", evidence: [entry.outcome, entry.context !== "Context not captured" && entry.context !== "Legacy initiative decision" ? `Rationale: ${entry.context}` : ""].filter(Boolean).join("; ") }));
  for (const item of synthesisItems(items, options)) {
    const records = synthesisRecords(item, "validation", options);
    for (const record of records || []) {
      if (record.status !== "complete" || ![record.result, record.decision, record.decisionNotes].some(value => String(value || "").trim())) continue;
      evidence.push({ itemId: item.id, recordId: record.id, title: record.title, initiativeTitle: item.title, type: "validation", status: "complete",
        evidence: [record.result ? `Reported result: ${record.result}` : "", validationDecisionSummary(record, "")].filter(Boolean).join("; "),
        origin: "captured", sourceIds: [record.id] });
    }

  }
  return evidence;
}

function buildLearningPrompts(items, options, evidence) {
  const prompts = [];
  for (const item of synthesisItems(items, options)) {
    const records = synthesisRecords(item, "validation", options);
    for (const record of records || []) {
      if (!["planned", "running", "unknown"].includes(record.status)) continue;
      prompts.push({ itemId: item.id, recordId: record.id, title: record.title, initiativeTitle: item.title, type: "validation", status: record.status,
        prompt: `Review ${record.status === "unknown" ? "experiment with unrecorded status" : `${record.status} experiment`}: ${record.title}. What evidence is still needed before recording a result and decision?`,
        origin: "suggested", sourceIds: [record.id] });
    }
    if (records === null && item.experiment) prompts.push({ itemId: item.id, recordId: "", title: item.title, initiativeTitle: item.title, type: "validation", status: "unknown",
      prompt: `Review legacy experiment context: ${item.experiment}. Capture its status, result and decision.`, origin: "suggested", sourceIds: [item.id] });
    if (item.status === "shipped" && !evidence.some(entry => entry.itemId === item.id) && !prompts.some(entry => entry.itemId === item.id)) {
      prompts.push({ itemId: item.id, recordId: "", title: item.title, initiativeTitle: item.title, type: "outcome", status: "suggested",
        prompt: "Capture customer or business outcome evidence for this shipped initiative.", origin: "suggested", sourceIds: [item.id] });
    }
  }
  return prompts;
}

function synthesisEvidenceLabel(entry) {
  return `${entry.evidence}; ${entry.origin}; sources: ${entry.sourceIds.join(", ")}`;
}

function synthesisDecisionLabel(entry) {
  return `${entry.title} (${entry.initiativeTitle}); ${entry.status === "suggested" ? "Suggested decision" : entry.status === "revisit" ? "Revisit" : "Pending"}; Decision ask: ${entry.ask}; Context: ${entry.context}; Owner: ${entry.owner}; Due date: ${entry.dueDate}; ${entry.origin}; sources: ${entry.sourceIds.join(", ")}`;
}

export function buildExecutiveBrief(items, now = new Date(), prioritization, options = {}) {
  const normalized = (Array.isArray(items) ? items : []).map((item, index) => normalizeItem({
    ...item,
    id: String(item?.id || `brief-item-${index + 1}`),
    updatedAt: validDate(item?.updatedAt) ? item.updatedAt : now.toISOString()
  }));
  const active = sortBriefItems(normalized.filter((item) => item.status !== "shipped" && item.status !== "parked"), prioritization);
  const activeIds = new Set(active.map((item) => item.id));
  const priorities = active.slice(0, 5).map((item, index) => ({
    rank: index + 1,
    itemId: item.id,
    title: item.title,
    status: statusLabels[item.status],
    nextStep: item.nextStep || "Define the next concrete action.",
    owner: item.owner || "Unassigned",
    dueDate: item.dueDate || "No date",
    score: evaluatePriority(item, prioritization).score,
    priorityLabel: methodLabel(prioritization),
    origin: "calculated", sourceIds: [item.id, ...(item.currentActionId ? [item.currentActionId] : [])]
  }));
  const launch = buildLaunchBoard(normalized, now, prioritization);
  const rolloutPlan = buildRolloutPlan(normalized, now, prioritization);
  const allRisks = buildBriefRisks(active, launch, rolloutPlan, now, prioritization);
  const risks = allRisks.slice(0, 5);
  const synthesis = buildDecisionSynthesis(active, options);
  const decisions = [...synthesis.pending, ...synthesis.suggestions].slice(0, 5);
  const rollouts = buildBriefRollouts(rolloutPlan);
  const metricGaps = buildMetricsPlan(normalized, now, prioritization).gaps.filter((entry) => activeIds.has(entry.item.id)).slice(0, 5).map((entry) => ({
    itemId: entry.item.id,
    title: entry.item.title,
    status: "Needs tracking",
    gap: entry.gaps[0],
    gapAction: entry.gapActions[0],
    instrumentation: entry.instrumentation,
    owner: entry.item.owner || "Unassigned",
    reviewDate: entry.reviewDate
  }));
  const themes = buildBriefThemes(normalized, options).slice(0, 5);
  const asks = [
    ...risks.map((risk) => ({ type: "Risk", title: risk.title, action: risk.action, owner: risk.owner, dueDate: risk.dueDate, itemId: risk.itemId })),
    ...decisions.map((decision) => ({ type: "Decision", title: decision.title, action: decision.ask, owner: decision.owner, dueDate: decision.dueDate, itemId: decision.itemId, recordId: decision.recordId, origin: decision.origin, sourceIds: [...decision.sourceIds] })),
    ...metricGaps.map((gap) => ({ type: "Metric", title: gap.title, action: gap.gap, gapAction: gap.gapAction, owner: gap.owner, dueDate: gap.reviewDate, itemId: gap.itemId }))
  ].slice(0, 6);
  const health = calculateHealth(active, now);
  const headline = active.length
    ? `${active.length} active initiative${active.length === 1 ? "" : "s"}; ${allRisks.length} risk${allRisks.length === 1 ? "" : "s"} and ${synthesis.pending.length} pending decision${synthesis.pending.length === 1 ? "" : "s"}${synthesis.suggestions.length ? `; ${synthesis.suggestions.length} suggested decision${synthesis.suggestions.length === 1 ? "" : "s"}` : ""}.`
    : synthesis.pending.length ? `No active initiatives; ${synthesis.pending.length} pending decision${synthesis.pending.length === 1 ? "" : "s"} in unlinked records.` : "No active initiatives in the workspace.";

  return { generatedAt: now.toISOString(), headline, health, priorities, risks, decisions, rollouts, metricGaps, themes, asks,
    decisionEntries: synthesis.pending, decisionSuggestions: synthesis.suggestions, decisionHistory: synthesis.decided,
    metrics: { pendingDecisions: synthesis.pending.length, decisionSuggestions: synthesis.suggestions.length } };
}

export function buildExecutiveBriefMemo(items, now = new Date(), prioritization, options = {}) {
  const brief = buildExecutiveBrief(items, now, prioritization, options);
  const rolloutCount = brief.rollouts.hold.length + brief.rollouts.watch.length + brief.rollouts.ready.length;
  return [
    `# Executive Brief - ${brief.generatedAt.slice(0, 10)}`,
    "",
    "## Portfolio Summary",
    `- ${executiveBriefLabels.generated}: ${brief.generatedAt.slice(0, 10)}`,
    `- ${executiveBriefLabels.headline}: ${brief.headline}`,
    `- ${executiveBriefLabels.operationsHealth}: ${formatOperationalScore(brief.health.score, "/100")}`,
    `- ${executiveBriefLabels.activeInitiatives}: ${brief.health.active}`,
    "",
    "## Key Priorities",
    brief.priorities.length ? brief.priorities.map((entry) => `- #${entry.rank} | ${entry.status} | ${entry.title}; ${executiveBriefLabels.nextAction}: ${entry.nextStep}; ${executiveBriefLabels.owner}: ${entry.owner}; ${executiveBriefLabels.dueDate}: ${entry.dueDate}; ${entry.priorityLabel || executiveBriefLabels.priority}: ${entry.score ?? "Needs scoring"}`).join("\n") : "- No active priorities. Shipped and parked initiatives are excluded.",
    "",
    "## Risks",
    brief.risks.length ? brief.risks.map((entry) => `- ${executiveBriefLabels.severity}: ${entry.status} | ${entry.severity}/100; ${executiveBriefLabels.sources}: ${entry.sources.join(", ")}; ${entry.title}; ${executiveBriefLabels.risk}: ${entry.risk}; ${executiveBriefLabels.leadershipAction}: ${entry.action}; ${executiveBriefLabels.owner}: ${entry.owner}; ${executiveBriefLabels.dueDate}: ${entry.dueDate}`).join("\n") : "- No active risks or rollout blockers detected.",
    "",
    "## Rollout Status",
    rolloutReadinessGuidance,
    rolloutCount ? formatBriefRollouts(brief.rollouts) : "- No initiatives currently need rollout review.",
    "",
    "## Decisions Needed",
    `Showing ${brief.decisions.length} of ${brief.metrics.pendingDecisions + brief.metrics.decisionSuggestions} entries (${brief.metrics.pendingDecisions} captured pending; ${brief.metrics.decisionSuggestions} suggested).`,
    brief.decisions.length ? brief.decisions.map((entry) => `- ${synthesisDecisionLabel(entry)}`).join("\n") : "- No pending decisions for active work.",
    "",
    "## Measurement Gaps",
    brief.metricGaps.length ? brief.metricGaps.map((entry) => `- Needs tracking | ${executiveBriefLabels.reviewDate}: ${entry.reviewDate}; ${entry.title}; ${executiveBriefLabels.firstGap}: ${entry.gap}; ${executiveBriefLabels.instrumentationAction}: ${entry.instrumentation}; ${executiveBriefLabels.owner}: ${entry.owner}`).join("\n") : "- No measurement gaps detected.",
    "",
    "## Customer Themes",
    brief.themes.length ? brief.themes.map((entry, index) => `- #${index + 1} | ${entry.count} signals | ${entry.theme}; ${themeEvidenceSummary(entry)}`).join("\n") : "- No repeated customer themes yet.",
    "",
    "## Leadership Asks",
    brief.asks.length ? brief.asks.map((entry, index) => `- #${index + 1} | ${entry.type} | ${entry.title}; ${executiveBriefLabels.requestedAction}: ${entry.action}; ${executiveBriefLabels.owner}: ${entry.owner}; ${executiveBriefLabels.neededBy}: ${entry.dueDate}`).join("\n") : "- No leadership asks. Current work can proceed without escalation."
  ].join("\n");
}

function sortBriefItems(items, prioritization) {
  return prioritizeItems(items, prioritization);
}

function buildBriefRisks(active, launch, rollout, now, prioritization) {
  const signals = [];
  const influence = priorityInfluence(active, prioritization);
  active.forEach((item) => {
    activeRisks(item).forEach((record) => signals.push({
      item,
      recordId: record.id,
      source: "Blocker",
      severity: riskSeverityScore(record),
      risk: record.description,
      owner: resolveRecordOwner(record, item),
      action: record.mitigation || item.nextStep || "Define mitigation owner and next action."
    }));
    activeDependencies(item).filter((record) => record.status === "at-risk" || record.status === "blocked").forEach((record) => signals.push({
      item,
      recordId: record.id,
      source: "Blocker",
      severity: dependencyUrgency(record, item, now),
      risk: record.description,
      owner: resolveRecordOwner(record, item),
      action: buildDependencyAsk(record, item)
    }));
    if (!item.owner || !item.nextStep) signals.push({
      item,
      source: "Blocker",
      severity: !item.owner ? 70 : 55,
      risk: !item.owner ? "No explicit risk captured; rollout ownership is unassigned." : "No explicit risk captured; the next rollout step is undefined.",
      action: !item.owner ? "Assign a rollout owner." : "Define the next rollout step."
    });
  });
  launch.candidates.filter((entry) => entry.goNoGo !== "Go").forEach((entry) => signals.push({
    item: entry.item,
    source: "Launch",
    severity: entry.goNoGo === "No-go" ? Math.max(70, 100 - entry.readiness) : Math.max(45, 100 - entry.readiness),
    risk: primaryRiskText(entry.item) || describeBriefReadinessRisk(entry.item, "Launch"),
    action: entry.blockers[0]?.ask || entry.gaps[0]?.task || "Close launch readiness gaps."
  }));
  rollout.candidates.filter((entry) => entry.status !== "Ready").forEach((entry) => signals.push({
    item: entry.item,
    source: "Rollout",
    severity: entry.status === "Hold" ? Math.max(80, 100 - entry.readiness) : Math.max(50, 100 - entry.readiness),
    risk: primaryRiskText(entry.item) || describeBriefReadinessRisk(entry.item, "Rollout"),
    action: entry.nextStep
  }));

  const byItem = new Map();
  signals.forEach((signal) => {
    const current = byItem.get(signal.item.id) || { item: signal.item, signals: [] };
    current.signals.push(signal);
    byItem.set(signal.item.id, current);
  });
  const sourceOrder = ["Blocker", "Launch", "Rollout"];
  return [...byItem.values()].map(({ item, signals: itemSignals }) => {
    const highest = itemSignals.reduce((best, signal) => signal.severity > best.severity ? signal : best);
    const recordSignals = itemSignals.filter((signal) => signal.recordId);
    const primary = recordSignals.length
      ? recordSignals.reduce((best, signal) => signal.severity > best.severity ? signal : best)
      : highest;
    const severity = Math.min(100, Math.round(highest.severity));
    return {
      itemId: item.id,
      title: item.title,
      severity,
      status: severity >= 70 ? "Critical" : severity >= 45 ? "Watch" : "Monitor",
      sources: [...new Set(itemSignals.map((signal) => signal.source))].sort((a, b) => sourceOrder.indexOf(a) - sourceOrder.indexOf(b)),
      risk: primary.risk,
      recordId: primary.recordId || "",
      action: primary.action,
      owner: primary.owner || item.owner || "Unassigned",
      dueDate: item.dueDate || "No date",
      score: influence.get(item.id) || 0
    };
  }).sort((a, b) => b.severity - a.severity || b.score - a.score || a.title.localeCompare(b.title) || a.itemId.localeCompare(b.itemId));
}

function describeBriefReadinessRisk(item, source) {
  if (source === "Rollout") {
    if (!item.owner.trim()) return "No explicit risk captured; rollout ownership is unassigned.";
    if (!item.experiment.trim()) return "No explicit risk captured; rollout success criteria are undefined.";
    if (calculateLaunchReadiness(item) < 70) {
      const gap = buildLaunchChecklist(item).find((entry) => !entry.done);
      if (gap) return `No explicit risk captured; the ${gap.area.toLowerCase()} launch-readiness check is incomplete.`;
    }
    if (!item.nextStep.trim()) return "No explicit risk captured; the next rollout step is undefined.";
    return "No explicit risk captured; rollout readiness needs review.";
  }

  const gap = buildLaunchChecklist(item).find((entry) => !entry.done);
  return gap
    ? `No explicit risk captured; the ${gap.area.toLowerCase()} launch-readiness check is incomplete.`
    : "No explicit risk captured; launch readiness needs review.";
}

function buildBriefRollouts(plan) {
  const selected = [...plan.hold, ...plan.watch, ...plan.ready].slice(0, 6);
  const mapEntry = (entry) => ({
    itemId: entry.item.id,
    title: entry.item.title,
    status: entry.status,
    readiness: entry.readiness,
    owner: entry.owner,
    stage: entry.stage,
    audience: entry.audience,
    nextStep: entry.nextStep
  });
  return {
    hold: selected.filter((entry) => entry.status === "Hold").map(mapEntry),
    watch: selected.filter((entry) => entry.status === "Watch").map(mapEntry),
    ready: selected.filter((entry) => entry.status === "Ready").map(mapEntry)
  };
}

function formatBriefRollouts(rollouts) {
  return [["Hold", rollouts.hold], ["Watch", rollouts.watch], ["Ready", rollouts.ready]].flatMap(([label, entries]) => [
    `### ${label}`,
    entries.length ? entries.map((entry) => `- ${executiveBriefLabels.status}: ${label} | ${executiveBriefLabels.readiness}: ${entry.readiness}%; ${entry.title}; ${executiveBriefLabels.owner}: ${entry.owner}; ${executiveBriefLabels.stage}: ${entry.stage}; ${executiveBriefLabels.audience}: ${entry.audience}; ${executiveBriefLabels.nextAction}: ${entry.nextStep}`).join("\n") : `- No ${label.toLowerCase()} rollouts.`
  ]).join("\n");
}

function buildBriefThemes(items, options) {
  return buildCustomerThemes(items, options).filter(theme => theme.count >= 2);
}

export function buildReleaseNotes(items, now = new Date(), prioritization) {
  const shipped = prioritizeItems(items, prioritization).filter((item) => item.status === "shipped");
  const committed = prioritizeItems(items, prioritization).filter((item) => item.status === "committed");
  const risks = buildRiskRegister(items, prioritization).slice(0, 3);
  return [
    `# Release Notes - ${localDateStamp(now)}`,
    "",
    "## Shipped",
    listReleaseItems(shipped, "No shipped items captured yet."),
    "",
    "## Coming Next",
    listReleaseItems(committed, "No committed follow-up work captured yet."),
    "",
    "## Known Risks",
    risks.length ? risks.map((risk) => `- ${risk.item.title}: ${risk.record.description}`).join("\n") : "No known risks captured."
  ].join("\n");
}

export function buildCustomerThemes(items, options = {}) {
  const itemsById = new Map((Array.isArray(items) ? items : []).map(item => [String(item.id), item]));
  const segmentsById = new Map((Array.isArray(options.customerDirectory?.segments) ? options.customerDirectory.segments : []).map(segment => [segment.id, segment.name]));
  const themes = new Map();
  const seenRecords = new Set();
  for (const record of Array.isArray(options.insightRecords) ? options.insightRecords : []) {
    if (record?.type !== "feedback" || typeof record.id !== "string" || !record.id.trim() || seenRecords.has(record.id)) continue;
    seenRecords.add(record.id);
    const initiativeId = typeof record.initiativeId === "string" ? record.initiativeId : "";
    if (initiativeId ? !itemsById.has(initiativeId) : options.includeUnlinked !== true) continue;
    const initiative = itemsById.get(initiativeId);
    // Tags are canonical authored phrases, never words extracted from initiative text.
    const tags = [...new Set((Array.isArray(record.tags) ? record.tags : []).filter(tag => typeof tag === "string").map(tag => tag.trim()).filter(Boolean))];
    const segmentIds = [...new Set((Array.isArray(record.segmentIds) ? record.segmentIds : []).filter(id => segmentsById.has(id)))];
    const segments = [...new Set(segmentIds.map(id => segmentsById.get(id)).filter(name => typeof name === "string" && name.trim()))].sort();
    const signal = { id: record.id, title: String(record.title || record.id), initiativeId, initiativeTitle: initiative ? String(initiative.title || initiativeId) : "", segmentIds, segments };
    for (const tag of tags) {
      const signals = themes.get(tag) || [];
      signals.push(signal);
      themes.set(tag, signals);
    }
  }
  return [...themes.entries()].map(([theme, signals]) => {
    const initiativeIds = [...new Set(signals.map(signal => signal.initiativeId).filter(Boolean))];
    const initiatives = initiativeIds.map(id => String(itemsById.get(id)?.title || id));
    const segments = [...new Set(signals.flatMap(signal => signal.segments))].sort();
    return { theme, count: signals.length, signalIds: signals.map(signal => signal.id), signals, initiativeIds, initiatives, segments,
      supportingInitiatives: [...initiatives], supportingSegments: [...segments],
      sources: signals.map(signal => ({ ...signal, recordId: signal.id, itemId: signal.initiativeId })) };
  }).sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme));
}

function themeEvidenceSummary(theme) {
  const signals = theme.signals.map(signal => `${signal.title} [${signal.id}]`).join(", ");
  const initiatives = theme.initiatives.map((title, index) => `${title} [${theme.initiativeIds[index]}]`).join(", ");
  return `Signals: ${signals}; ${executiveBriefLabels.supportingInitiatives}: ${initiatives || "No linked initiatives"}; ${executiveBriefLabels.supportingSegments}: ${theme.segments.join(", ") || "No linked segments"}`;
}

function listReleaseItems(items, fallback) {
  if (!items.length) return fallback;
  return items.map((item) => `- ${item.title}${item.customer ? ` (${item.customer})` : ""}`).join("\n");
}



export function buildDiscoveryBrief(items, prioritization) {
  const candidates = prioritizeItems(items, prioritization).filter((item) => item.status === "intake" || item.status === "discovery");
  return {
    opportunities: candidates.slice(0, 6).map((item) => ({
      title: item.title,
      customer: item.customer || "Unspecified segment",
      problem: item.problem || "Problem statement needed.",
      item,
      score: evaluatePriority(item, prioritization).score,
      priorityLabel: methodLabel(prioritization),
      confidence: item.confidence,
      nextStep: item.nextStep || "Define the next discovery action."
    })),
    interviewTargets: buildInterviewTargets(candidates),
    assumptions: buildAssumptionTests(candidates, prioritization),
    experiments: candidates.flatMap(item => Array.isArray(item.validationRecords) ? item.validationRecords.filter(record => ["planned", "running", "unknown"].includes(record.status)).map(record => ({ title: record.title, initiativeTitle: item.title, experiment: record.method || record.successMetric || "Method not recorded.", decision: validationDecisionSummary(record, "Decision not recorded."), status: record.status, sourceIds: [record.id], origin: "captured" })) : (item.experiment || item.confidence < 0.7 ? [{ title: item.title, experiment: item.experiment || "Design a lightweight validation experiment.", decision: item.decision || "Decision pending.", sourceIds: [item.id], origin: item.experiment ? "captured" : "suggested" }] : []))
  };
}

export function buildInterviewTargets(items) {
  const segments = new Map();
  items.forEach((item) => {
    audienceFor(item).forEach((segment) => {
      const existing = segments.get(segment) || { segment, count: 0, problems: new Set() };
      existing.count += 1;
      if (item.problem) existing.problems.add(item.problem);
      segments.set(segment, existing);
    });
  });
  return [...segments.values()]
    .map((entry) => ({ segment: entry.segment, count: entry.count, problems: [...entry.problems].slice(0, 3) }))
    .sort((a, b) => b.count - a.count || a.segment.localeCompare(b.segment));
}

export function buildAssumptionTests(items, prioritization) {
  return prioritizeItems(items, prioritization).slice(0, 8).map((item) => {
    if (!item.problem) {
      return { title: item.title, assumption: "The problem is understood clearly enough to prioritize.", test: "Run 3 customer interviews and write a one-sentence problem statement." };
    }
    if (item.confidence < 0.7) {
      return { title: item.title, assumption: "The opportunity is valuable enough to continue discovery.", test: "Validate the problem frequency and willingness to change with target users." };
    }
    if (!item.experiment) {
      return { title: item.title, assumption: "The proposed solution direction will create measurable value.", test: "Define a prototype, concierge, or smoke-test experiment." };
    }
    return { title: item.title, assumption: "The current experiment will create a clear product decision.", test: item.experiment };
  });
}

export function buildValidationBoard(items, now = new Date(), prioritization) {
  const candidates = prioritizeItems(items.map(normalizeItem), prioritization).filter(item => ["intake", "discovery", "committed"].includes(item.status));
  const influence = priorityInfluence(candidates, prioritization);
  const entries = candidates.flatMap(item => (item.validationRecords || []).map(record => ({
    ...validationEntry(item, "Experiment", record.method || record.successMetric || "Method not recorded.", validationPriority(item, now, influence.get(item.id) || 0), prioritization),
    title: record.title, initiativeTitle: item.title, recordId: record.id, sourceIds: [record.id], origin: "captured", status: record.status,
    result: record.result, decision: record.decision, decisionNotes: record.decisionNotes
  })));
  // Scalar compatibility is limited to callers supplying legacy items; current
  // application projections always carry the full validationRecords collection.
  const legacy = candidates.filter(item => !Array.isArray(item.validationRecords));
  const experiments = [...entries.filter(entry => ["planned", "running"].includes(entry.status)), ...legacy.filter(item => item.experiment).map(item => validationEntry(item, "Experiment", item.experiment, validationPriority(item, now, influence.get(item.id) || 0), prioritization))];
  const evidenceGaps = legacy.filter(item => !item.experiment && !item.decision).map(item => validationEntry(item, "Evidence Gap", suggestValidationTest(item), validationPriority(item, now, influence.get(item.id) || 0) + 10, prioritization));
  const decisionReady = entries.filter(entry => entry.status === "complete" && !entry.decision && !entry.decisionNotes);
  const lowConfidence = candidates.filter(item => item.confidence < 0.7).map(item => validationEntry(item, "Low Confidence", suggestValidationTest(item), validationPriority(item, now, influence.get(item.id) || 0), prioritization));
  return {
    experiments, evidenceGaps, decisionReady, lowConfidence,
    unknown: entries.filter(entry => entry.status === "unknown"),
    complete: entries.filter(entry => entry.status === "complete" && (entry.decision || entry.decisionNotes)),
    cancelled: entries.filter(entry => entry.status === "cancelled"),
    metrics: { experiments: experiments.length, evidenceGaps: evidenceGaps.length, decisionReady: decisionReady.length, lowConfidence: lowConfidence.length }
  };
}

export function buildValidationMemo(items, now = new Date(), prioritization) {
  const board = buildValidationBoard(items, now, prioritization);
  if (items.some(item => Array.isArray(item.validationRecords))) {
    const sections = [["Experiments In Flight", board.experiments], ["Status Not Recorded", board.unknown], ["Decision Ready", board.decisionReady], ["Completed Outcomes", board.complete], ["Cancelled History", board.cancelled]];
    return [`# Validation Review - ${localDateStamp(now)}`, ...sections.flatMap(([title, entries]) => ["", `## ${title}`, entries.length ? entries.map(entry => `- ${entry.title} [captured source: ${entry.recordId}]: ${entry.test}; result: ${entry.result || "not recorded"}; decision: ${validationDecisionSummary(entry, "not recorded")}`).join("\n") : "- None recorded."])].join("\n");
  }
  return [
    `# Validation Review - ${localDateStamp(now)}`,
    "",
    "## Experiments In Flight",
    board.experiments.length ? board.experiments.map((entry) => `- ${entry.title}: ${entry.test}`).join("\n") : "- No experiments in flight.",
    "",
    "## Evidence Gaps",
    board.evidenceGaps.length ? board.evidenceGaps.map((entry) => `- ${entry.title}: ${entry.test}`).join("\n") : "- No evidence gaps detected.",
    "",
    "## Decision Ready",
    board.decisionReady.length ? board.decisionReady.map((entry) => `- ${entry.title}: ${entry.test}`).join("\n") : "- No experiments are decision-ready.",
    "",
    "## Low Confidence",
    board.lowConfidence.length ? board.lowConfidence.map((entry) => `- ${entry.title}: ${entry.test}`).join("\n") : "- No low-confidence work in the active validation set."
  ].join("\n");
}

export function buildResearchOps(items, now = new Date(), prioritization) {
  const candidates = prioritizeItems(items.map(normalizeItem), prioritization).filter((item) => item.status === "intake" || item.status === "discovery" || item.confidence < 0.7);
  const influence = priorityInfluence(candidates, prioritization);
  const interviewTargets = buildInterviewTargets(candidates).slice(0, 8);
  const validation = buildValidationBoard(candidates, now, prioritization);
  const questions = candidates.slice(0, 8).map((item) => ({
    title: item.title,
    segment: item.customer || "Unspecified segment",
    question: researchQuestionFor(item),
    method: researchMethodFor(item),
    priority: (influence.get(item.id) || 0) + (item.confidence < 0.7 ? 20 : 0) + (activeRisks(item).length ? 10 : 0)
  })).sort((a, b) => b.priority - a.priority);
  const recruiting = interviewTargets.map((target) => ({
    segment: target.segment,
    count: target.count,
    goal: Math.min(5, Math.max(3, target.count + 2)),
    topics: target.problems.slice(0, 3)
  }));
  const evidenceGaps = validation.evidenceGaps.slice(0, 6);

  return {
    interviewTargets,
    recruiting,
    questions,
    evidenceGaps,
    lowConfidence: validation.lowConfidence.slice(0, 6),
    metrics: {
      targets: interviewTargets.length,
      recruiting: recruiting.reduce((sum, target) => sum + target.goal, 0),
      questions: questions.length,
      evidenceGaps: evidenceGaps.length
    }
  };
}

export function buildResearchMemo(items, now = new Date(), prioritization) {
  const research = buildResearchOps(items, now, prioritization);
  return [
    `# Research Plan - ${localDateStamp(now)}`,
    "",
    "## Recruiting Targets",
    research.recruiting.length ? research.recruiting.map((target) => `- ${target.segment}: recruit ${target.goal}; topics: ${target.topics.join(", ") || "confirm top problems"}`).join("\n") : "- No recruiting targets yet.",
    "",
    "## Research Questions",
    research.questions.length ? research.questions.map((entry) => `- ${entry.segment} / ${entry.title}: ${entry.question} (${entry.method})`).join("\n") : "- No research questions generated.",
    "",
    "## Evidence Gaps",
    research.evidenceGaps.length ? research.evidenceGaps.map((entry) => `- ${entry.title}: ${entry.test}`).join("\n") : "- No evidence gaps detected.",
    "",
    "## Low Confidence Bets",
    research.lowConfidence.length ? research.lowConfidence.map((entry) => `- ${entry.title}: confidence ${Math.round(entry.confidence * 100)}%`).join("\n") : "- No low-confidence bets in the research queue."
  ].join("\n");
}

function validationEntry(item, type, test, priority, prioritization) {
  return {
    type,
    title: item.title,
    item,
    customer: item.customer || "Unspecified segment",
    confidence: item.confidence,
    score: evaluatePriority(item, prioritization).score,
    priorityLabel: methodLabel(prioritization),
    priority,
    test,
    decision: item.decision || "Decision pending."
  };
}

function validationPriority(item, now, priorityContribution = 0) {
  const ageBoost = Math.min(20, daysSince(itemActivityAt(item), now));
  const riskBoost = activeRisks(item).length ? 15 : 0;
  const confidenceBoost = Math.round((1 - item.confidence) * 20);
  return Math.round(priorityContribution + ageBoost + riskBoost + confidenceBoost);
}

function suggestValidationTest(item) {
  if (!item.problem) return "Interview target users and write a crisp problem statement.";
  if (item.confidence < 0.7) return "Validate problem frequency, urgency, and willingness to change.";
  if (!item.experiment) return "Define a prototype, concierge test, smoke test, or rollout metric.";
  return item.experiment;
}

function researchQuestionFor(item) {
  if (!item.problem) return "What problem is painful enough to change current behavior?";
  if (item.confidence < 0.7) return `How often does this happen, and what workaround exists today: ${item.problem}`;
  if (!item.experiment) return "What observable behavior would prove this opportunity matters?";
  return `What evidence would confirm or falsify: ${item.experiment}`;
}

function researchMethodFor(item) {
  if (!item.problem || item.confidence < 0.6) return "Customer interviews";
  if (item.experiment) return "Prototype or rollout readout";
  return "Survey plus lightweight usability test";
}

export function buildGitHubIssueMarkdown(item, prioritization) {
  const normalized = normalizeItem(item);
  const riskLines = normalized.risks.map((record) => `- [${record.status}] ${record.description} | likelihood: ${record.likelihood} | impact: ${record.impact} | owner: ${record.ownerName || "Unassigned"} | review: ${record.reviewDate || "Not set"} | mitigation: ${record.mitigation || "Not set"}${record.needsClassification ? " | classification: needed" : ""}`);
  const dependencyLines = normalized.dependencies.map((record) => `- [${record.status}] ${record.description} | target: ${record.targetName || "Not set"} | owner: ${record.ownerName || "Unassigned"} | needed: ${record.neededBy || "Not set"}`);
  const priority = evaluatePriority(normalized, prioritization);
  return [
    `# ${normalized.title}`,
    "",
    "## Customer / Segment",
    normalized.customer || "Not specified.",
    "",
    "## Problem",
    normalized.problem || "Problem statement needed.",
    "",
    "## Product Ops",
    `- Status: ${statusLabels[normalized.status]}`,
    `- Owner: ${normalized.owner || "Unowned"}`,
    `- Planned start: ${normalized.startDate || "Not set"}`,
    `- Due date: ${normalized.dueDate || "Not set"}`,
    `- ${methodLabel(prioritization)} priority: ${priority.complete ? priority.score ?? "Ranked" : "Needs scoring"}`,
    `- Reach: ${normalized.reach}`,
    `- Impact: ${normalized.impact}`,
    `- Confidence: ${normalized.confidence}`,
    `- Effort: ${normalized.effort}`,
    "",
    "## Next Step",
    normalized.nextStep || "Define the next action.",
    "",
    "## Risks",
    riskLines.length ? riskLines.join("\n") : "- No active risks captured.",
    "",
    "## Dependencies",
    dependencyLines.length ? dependencyLines.join("\n") : "- No dependencies captured.",
    "",
    "## Experiment",
    normalized.experiment || "No experiment captured.",
    "",
    "## Decision",
    normalized.decision || "Decision pending."
  ].join("\n");
}

export function buildGitHubIssueBundle(items, prioritization) {
  return prioritizeItems(items, prioritization)
    .map((item) => buildGitHubIssueMarkdown(item, prioritization))
    .join("\n\n---\n\n");
}

export function buildBacklogHygiene(items, now = new Date(), prioritization) {
  const normalized = items.map(normalizeItem);
  const active = normalized.filter((item) => item.status !== "shipped" && item.status !== "parked");
  const stale = active.filter((item) => daysSince(itemActivityAt(item), now) > 14);
  const missingOwner = active.filter((item) => !item.owner);
  const missingProblem = active.filter((item) => !item.problem);
  const missingNextStep = active.filter((item) => !item.nextStep);
  const ownerLoad = buildStakeholderMap(active).owners.filter((owner) => owner.name !== "Unowned");
  const overloadedOwners = ownerLoad.filter((owner) => owner.count > 3);
  const bottomStart = Math.floor(active.length * 0.75);
  const bottomIds = new Set(prioritizeItems(active, prioritization).slice(bottomStart).map((item) => item.id));
  const parkingCandidates = active
    .filter((item) => bottomIds.has(item.id) && item.confidence < 0.5)
    .slice(0, 6);

  return {
    stale,
    missingOwner,
    missingProblem,
    missingNextStep,
    overloadedOwners,
    parkingCandidates,
    score: active.length ? Math.max(0, 100 - stale.length * 8 - missingOwner.length * 8 - missingProblem.length * 6 - missingNextStep.length * 6 - overloadedOwners.length * 5) : null
  };
}

export function buildWeeklyPlan(items, prioritization, options = {}) {
  const prioritized = prioritizeItems(items, prioritization);
  const hygiene = buildBacklogHygiene(items, new Date(), prioritization);
  const risks = buildRiskRegister(items, prioritization);
  const focus = prioritized.filter((item) => item.status === "committed").slice(0, 3);
  const discover = prioritized.filter((item) => item.status === "discovery" || item.status === "intake").slice(0, 3);
  const synthesis = buildDecisionSynthesis(prioritized, options);
  const decisionIds = new Set([...synthesis.pending, ...synthesis.suggestions].map(entry => entry.itemId));
  const decide = prioritized.filter(item => decisionIds.has(item.id)).slice(0, 3);
  const unblock = [...risks.map((risk) => risk.item), ...hygiene.missingNextStep].filter(uniqueById).slice(0, 5);
  const actionTargets = [
    ...hygiene.missingOwner.slice(0, 2).map((item) => ({ itemId: item.id, field: "owner", label: "Assign owner", text: `Assign owner for ${item.title}` })),
    ...hygiene.missingProblem.slice(0, 2).map((item) => ({ itemId: item.id, field: "problem", label: "Describe problem", text: `Clarify problem for ${item.title}` })),
    ...hygiene.parkingCandidates.slice(0, 2).map((item) => ({ itemId: item.id, field: "statusId", label: "Review status", text: `Consider parking ${item.title}` }))
  ].slice(0, 6);

  return {
    focus,
    discover,
    decide,
    decisionEntries: synthesis.pending, decisionSuggestions: synthesis.suggestions, decisionHistory: synthesis.decided,
    unblock,
    actionTargets,
    actions: actionTargets.map((action) => action.text)
  };
}

function hasCapacity(capacity) {
  return typeof capacity === "number" && Number.isFinite(capacity) && capacity >= 0;
}

export function buildQuarterlyPlan(items, now = new Date(), capacity, prioritization) {
  const capacityAvailable = hasCapacity(capacity);
  capacity = capacityAvailable ? capacity : null;
  const normalized = items.map(normalizeItem);
  const release = buildReleasePlan(normalized, prioritization);
  const portfolio = buildPortfolioDashboard(normalized, now, capacity, prioritization);
  const alignment = buildOutcomeAlignment(normalized, prioritization);
  const actions = buildActionQueue(normalized, now, prioritization);
  const candidates = prioritizeItems(normalized, prioritization).filter((item) => item.status !== "shipped" && item.status !== "parked");
  const selected = [];
  let used = 0;
  candidates.forEach((item) => {
    if (capacityAvailable && used + item.effort <= capacity) {
      selected.push(item);
      used += item.effort;
    }
  });
  const deferred = capacityAvailable ? candidates.filter((item) => !selected.some((selectedItem) => selectedItem.id === item.id)) : [];
  const bets = alignment.coverage.map((entry) => ({
    objective: entry.objective,
    initiatives: selected.filter((item) => entry.sourceIds.includes(item.id)),
    sourceIds: entry.sourceIds,
    origin: entry.origin,
    objectiveOrigin: entry.objectiveOrigin,
    keyResults: alignment.keyResults.filter(kr => kr.sourceIds.some(id => entry.sourceIds.includes(id))),
    keyResult: suggestKeyResult(entry, alignment.keyResults)
  }));

  return {
    generatedAt: now.toISOString(),
    capacityAvailable,
    capacity,
    used: capacityAvailable ? used : null,
    candidateCount: candidates.length,
    candidateEffort: sumEffort(candidates),
    remaining: capacityAvailable ? Math.max(0, capacity - used) : null,
    bets,
    now: release.now,
    next: release.next,
    selected,
    deferred: deferred.slice(0, 8),
    risks: portfolio.watchlist.slice(0, 6),
    actions: actions.queue.slice(0, 6),
    metrics: {
      capacityAvailable,
      selected: capacityAvailable ? selected.length : null,
      deferred: capacityAvailable ? deferred.length : null,
      candidateCount: candidates.length,
      candidateEffort: sumEffort(candidates),
      capacity,
      used: capacityAvailable ? used : null,
      utilization: capacityAvailable && capacity > 0 ? Math.round((used / capacity) * 100) : null,
      objectives: bets.length
    }
  };
}

export function buildQuarterlyPlanMemo(items, now = new Date(), capacity, prioritization) {
  const plan = buildQuarterlyPlan(items, now, capacity, prioritization);
  return [
    `# Quarterly Plan - ${localDateStamp(now)}`,
    "",
    "## Capacity",
    ...(plan.capacityAvailable ? [
      ...(plan.capacity === 0 ? ["- No capacity: 0 effort configured."] : []),
      `- Selected effort: ${plan.used} / ${plan.capacity}`,
      `- Remaining: ${plan.remaining}`
    ] : ["- Capacity is unconfigured. Supply a planning horizon and effort budget before selecting work.", `- Candidate effort: ${plan.candidateEffort} across ${plan.candidateCount} initiatives`]),
    "",
    "## Strategic Bets",
    plan.bets.length ? plan.bets.map((bet) => `- ${bet.objectiveOrigin === "suggested" ? "Suggested grouping — " : ""}${bet.objective}: ${bet.keyResult}`).join("\n") : "- No strategic bets drafted.",
    "",
    "## Selected Work",
    !plan.capacityAvailable ? "- Selection unavailable until capacity is configured." : plan.selected.length ? plan.selected.map((item) => `- ${item.title} (${statusLabels[item.status]}, effort ${item.effort})`).join("\n") : "- No work selected.",
    "",
    "## Deferred Work",
    !plan.capacityAvailable ? "- Deferral recommendations unavailable until capacity is configured." : plan.deferred.length ? plan.deferred.map((item) => `- ${item.title}: outside current capacity`).join("\n") : "- No deferred work.",
    "",
    "## Risks And Follow-Ups",
    plan.risks.length ? plan.risks.map((entry) => `- ${entry.title}: ${entry.action}`).join("\n") : "- No planning risks detected."
  ].join("\n");
}

export function buildPeriodPlan(items, selection = { kind: "all" }, calendar = emptyPlanningCalendar(), now = new Date(), capacity, prioritization) {
  const scopedItems = filterItemsByPeriod(items, selection, calendar, now);
  return {
    ...buildQuarterlyPlan(scopedItems, now, capacity, prioritization),
    scope: {
      selection,
      label: periodSelectionLabel(selection, calendar, now),
      rangeLabel: periodSelectionRangeLabel(selection, calendar, now),
      itemCount: scopedItems.length
    }
  };
}

export function buildPeriodPlanMemo(items, selection = { kind: "all" }, calendar = emptyPlanningCalendar(), now = new Date(), capacity, prioritization) {
  const plan = buildPeriodPlan(items, selection, calendar, now, capacity, prioritization);
  return [
    `# ${plan.scope.label} Plan - ${localDateStamp(now)}`,
    "",
    `Scope: ${plan.scope.label} | ${plan.scope.rangeLabel} | ${plan.scope.itemCount} initiatives`,
    "",
    "## Capacity",
    ...(plan.capacityAvailable ? [
      ...(plan.capacity === 0 ? ["- No capacity: 0 effort configured."] : []),
      `- Selected effort: ${plan.used} / ${plan.capacity}`,
      `- Remaining: ${plan.remaining}`
    ] : ["- Capacity is unconfigured. Supply a planning horizon and effort budget before selecting work.", `- Candidate effort: ${plan.candidateEffort} across ${plan.candidateCount} initiatives`]),
    "",
    "## Strategic Bets",
    plan.bets.length ? plan.bets.map((bet) => `- ${bet.objectiveOrigin === "suggested" ? "Suggested grouping — " : ""}${bet.objective}: ${bet.keyResult}`).join("\n") : "- No strategic bets drafted.",
    "",
    "## Selected Work",
    !plan.capacityAvailable ? "- Selection unavailable until capacity is configured." : plan.selected.length ? plan.selected.map((item) => `- ${item.title} (${statusLabels[item.status]}, effort ${item.effort})`).join("\n") : "- No work selected.",
    "",
    "## Deferred Work",
    !plan.capacityAvailable ? "- Deferral recommendations unavailable until capacity is configured." : plan.deferred.length ? plan.deferred.map((item) => `- ${item.title}: outside current capacity`).join("\n") : "- No deferred work.",
    "",
    "## Risks And Follow-Ups",
    plan.risks.length ? plan.risks.map((entry) => `- ${entry.title}: ${entry.action}`).join("\n") : "- No planning risks detected."
  ].join("\n");
}

function uniqueById(item, index, items) {
  return items.findIndex((candidate) => candidate.id === item.id) === index;
}

export function buildFeedbackInbox(items, prioritization, options = {}) {
  const influence = priorityInfluence(items, prioritization);
  const signals = prioritizeItems(items, prioritization).map((item) => ({
    title: item.title,
    segment: item.customer || "Unspecified segment",
    signal: item.problem || primaryRiskText(item) || "No feedback text captured.",
    status: item.status,
    owner: item.owner || "Unowned",
    urgency: feedbackUrgency(item, influence.get(item.id) || 0),
    nextStep: item.nextStep || "Triage and decide next action."
  }));
  return {
    signals,
    urgent: signals.filter((signal) => signal.urgency >= 70).slice(0, 6),
    themes: buildCustomerThemes(items, options).slice(0, 8),
    segments: buildInterviewTargets(items).slice(0, 6)
  };
}

export function buildFeedbackDigest(items, now = new Date(), prioritization, options = {}) {
  const inbox = buildFeedbackInbox(items, prioritization, options);
  return [
    `# Feedback Digest - ${localDateStamp(now)}`,
    "",
    "## Top Themes",
    inbox.themes.length ? inbox.themes.map((theme) => `- ${theme.theme}: ${theme.count} feedback records; ${themeEvidenceSummary(theme)}`).join("\n") : "No themes captured yet.",
    "",
    "## Urgent Signals",
    inbox.urgent.length ? inbox.urgent.map((signal) => `- ${signal.title} (${signal.segment}): ${signal.signal}`).join("\n") : "No urgent signals.",
    "",
    "## Segments To Follow Up",
    inbox.segments.length ? inbox.segments.map((segment) => `- ${segment.segment}: ${segment.count} signals`).join("\n") : "No segment data yet."
  ].join("\n");
}

function feedbackUrgency(item, priorityContribution = 0) {
  const riskBoost = activeRisks(item).length ? 25 : 0;
  const ownerPenalty = item.owner ? 0 : 15;
  const nextStepPenalty = item.nextStep ? 0 : 15;
  return Math.min(100, Math.round(priorityContribution + riskBoost + ownerPenalty + nextStepPenalty));
}

export function buildSupportQueue(items, now = new Date(), prioritization) {
  const normalized = items.map(normalizeItem);
  const influence = priorityInfluence(normalized, prioritization);
  const queue = prioritizeItems(normalized, prioritization)
    .filter((item) => item.status !== "parked")
    .filter((item) => activeRisks(item).length || item.problem || item.status === "shipped" || item.status === "committed")
    .map((item) => {
      const severity = supportSeverity(item, now, influence.get(item.id) || 0);
      return {
        item,
        severity,
        status: severity >= 80 ? "Critical" : severity >= 55 ? "Watch" : "Monitor",
        segment: item.customer || "Unspecified segment",
        owner: item.owner || "Unassigned",
        signal: primaryRiskText(item) || item.problem || item.decision || "Capture customer or support signal.",
        response: supportResponse(item),
        followUp: supportFollowUp(item)
      };
    })
    .sort((a, b) => b.severity - a.severity || (influence.get(b.item.id) || 0) - (influence.get(a.item.id) || 0))
    .slice(0, 12);
  const ownerLoad = Object.values(queue.reduce((owners, entry) => {
    owners[entry.owner] ||= { owner: entry.owner, count: 0, critical: 0, items: [] };
    owners[entry.owner].count += 1;
    owners[entry.owner].critical += entry.status === "Critical" ? 1 : 0;
    owners[entry.owner].items.push(entry.item.title);
    return owners;
  }, {})).sort((a, b) => b.critical - a.critical || b.count - a.count);
  return {
    queue,
    critical: queue.filter((entry) => entry.status === "Critical"),
    watch: queue.filter((entry) => entry.status === "Watch"),
    ownerLoad,
    metrics: {
      total: queue.length,
      critical: queue.filter((entry) => entry.status === "Critical").length,
      watch: queue.filter((entry) => entry.status === "Watch").length,
      unassigned: queue.filter((entry) => entry.owner === "Unassigned").length
    }
  };
}

export function buildSupportMemo(items, now = new Date(), prioritization) {
  const support = buildSupportQueue(items, now, prioritization);
  return [
    `# Support Ops Review - ${localDateStamp(now)}`,
    "",
    "## Critical",
    support.critical.length ? support.critical.map((entry) => `- ${entry.item.title} [${entry.owner}]: ${entry.response}`).join("\n") : "- No critical support items.",
    "",
    "## Watch",
    support.watch.length ? support.watch.map((entry) => `- ${entry.item.title}: ${entry.signal}`).join("\n") : "- No watch-list support items.",
    "",
    "## Owner Follow-Up",
    support.ownerLoad.length ? support.ownerLoad.map((entry) => `- ${entry.owner}: ${entry.count} items (${entry.items.join(", ")})`).join("\n") : "- No owner follow-up needed.",
    "",
    "## Response Actions",
    support.queue.length ? support.queue.slice(0, 8).map((entry) => `- ${entry.item.title}: ${entry.followUp}`).join("\n") : "- No response actions."
  ].join("\n");
}

function supportSeverity(item, now, priorityContribution = 0) {
  const risk = activeRisks(item).length ? 30 : 0;
  const shipped = item.status === "shipped" ? 18 : 0;
  const committed = item.status === "committed" ? 12 : 0;
  const unowned = item.owner ? 0 : 18;
  const stale = daysSince(itemActivityAt(item), now) > 14 ? 10 : 0;
  return Math.min(100, risk + shipped + committed + unowned + stale + priorityContribution);
}

function supportResponse(item) {
  const risk = primaryRiskText(item);
  if (risk) return `Prepare response and mitigation for: ${risk}`;
  if (item.status === "shipped") return item.decision || item.experiment || "Capture post-launch support signal and customer outcome.";
  if (!item.owner) return "Assign a support-response owner before the next customer update.";
  return item.nextStep || "Write the support response and next customer update.";
}

function supportFollowUp(item) {
  if (!item.owner) return "Assign owner and reply path.";
  if (activeRisks(item).length) return `Have ${item.owner} confirm mitigation and customer-facing wording.`;
  if (!item.nextStep) return `Ask ${item.owner} to define the support follow-up.`;
  return `${item.owner}: ${item.nextStep}`;
}

export function buildCapacityPlan(items, capacity, prioritization) {
  const capacityAvailable = hasCapacity(capacity);
  capacity = capacityAvailable ? capacity : null;
  const active = prioritizeItems(items, prioritization).filter((item) => item.status === "committed" || item.status === "discovery");
  const committed = active.filter((item) => item.status === "committed");
  const discovery = active.filter((item) => item.status === "discovery");
  const committedEffort = sumEffort(committed);
  const discoveryEffort = sumEffort(discovery);
  const totalEffort = committedEffort + discoveryEffort;
  const overage = capacityAvailable ? Math.max(0, totalEffort - capacity) : null;
  const suggestedCuts = [...active].reverse().slice(0, overage ? 5 : 0);

  return {
    capacityAvailable,
    capacity,
    committedEffort,
    discoveryEffort,
    totalEffort,
    remaining: capacityAvailable ? Math.max(0, capacity - totalEffort) : null,
    overage,
    utilization: capacityAvailable && capacity > 0 ? Math.round((totalEffort / capacity) * 100) : null,
    suggestedCuts,
    scenario: buildCapacityScenario(items, capacity, prioritization)
  };
}

export function buildCapacityScenario(items, capacity, prioritization) {
  const capacityAvailable = hasCapacity(capacity);
  capacity = capacityAvailable ? capacity : null;
  const candidates = prioritizeItems(items, prioritization).filter((item) => item.status !== "shipped" && item.status !== "parked");
  const selected = [];
  let used = 0;
  if (capacityAvailable) {
    candidates.forEach((item) => {
      if (used + item.effort <= capacity) {
        selected.push(item);
        used += item.effort;
      }
    });
  }
  return {
    capacityAvailable,
    capacity,
    candidateCount: candidates.length,
    candidateEffort: sumEffort(candidates),
    selected,
    deferred: capacityAvailable ? candidates.filter((item) => !selected.some((selectedItem) => selectedItem.id === item.id)) : [],
    used: capacityAvailable ? used : null,
    remaining: capacityAvailable ? Math.max(0, capacity - used) : null
  };
}

function sumEffort(items) {
  return items.reduce((sum, item) => sum + Number(item.effort || 0), 0);
}

const objectiveRules = [
  { name: "Trust & Admin Control", keywords: ["trust", "security", "compliance", "audit", "admin", "permission", "control", "export"] },
  { name: "Activation & Setup", keywords: ["activation", "onboarding", "setup", "import", "start", "first", "trial"] },
  { name: "Customer Insight", keywords: ["feedback", "customer", "support", "interview", "signal", "theme"] },
  { name: "Efficiency", keywords: ["speed", "faster", "bulk", "automate", "automation", "workflow", "efficiency"] },
  { name: "Product Growth", keywords: ["growth", "conversion", "adoption", "revenue", "upgrade", "expansion"] }
];

export function buildOutcomeAlignment(items, prioritization) {
  const normalized = prioritizeItems(items, prioritization).map(normalizeItem);
  const active = normalized.filter(item => item.status !== "shipped" && item.status !== "parked");
  const groups = new Map();
  for (const item of active) {
    const objective = inferObjective(item);
    const objectiveOrigin = item.objective ? "captured" : "suggested";
    const groupKey = JSON.stringify([objectiveOrigin, objective]);
    if (!groups.has(groupKey)) groups.set(groupKey, { objective, objectiveOrigin, items: [] });
    groups.get(groupKey).items.push(item);
  }
  const coverage = [...groups.values()].map(group => ({
    objective: group.objective, objectiveOrigin: group.objectiveOrigin, origin: "calculated",
    sourceIds: group.items.map(item => item.id).sort(), count: group.items.length,
    effort: sumEffort(group.items), topItems: group.items.slice(0, 3), items: group.items
  }));
  const keyResults = normalized.filter(hasAuthoredOutcome).map(capturedKeyResult);
  for (const entry of coverage) {
    const contributors = entry.items.filter(item => !hasAuthoredOutcome(item));
    if (!contributors.length) continue;
    const sourceIds = contributors.map(item => item.id).sort();
    const sourceKey = outcomeSourceKey("suggested", sourceIds);
    const primaryMetric = suggestPrimaryMetric({}, entry.objective);
    keyResults.push({ id: sourceKey, sourceKey, origin: "suggested", sourceIds, initiativeId: "",
      objective: entry.objective, primaryMetric, metricTarget: "", metricReviewDate: "", status: "suggested",
      result: `Suggested metric: ${primaryMetric} Set your own target and review date.` });
  }
  return { coverage, keyResults, missingMetrics: active.filter(item => !hasAdoptedOutcome(item)),
    atRiskObjectives: coverage.filter(entry => entry.items.some(item => activeRisks(item).length)) };
}

export function buildOutcomeMemo(items, now = new Date(), prioritization) {
  const alignment = buildOutcomeAlignment(items, prioritization);
  return [
    `# Outcome Review - ${localDateStamp(now)}`, "", "## Objective Coverage",
    alignment.coverage.length ? alignment.coverage.map(entry => `- ${entry.objectiveOrigin === "suggested" ? "Suggested grouping — " : ""}${entry.objective}: ${entry.count} active initiatives, ${entry.effort} effort`).join("\n") : "No active objectives yet.",
    "", "## Saved Measures and Suggestions",
    alignment.keyResults.length ? alignment.keyResults.map(kr => `- ${kr.origin === "suggested" ? "Suggestion" : kr.status === "adopted" ? "Saved measure" : "Draft measure"} — ${kr.objective || "Objective not captured"}: ${kr.result}`).join("\n") : "No saved measures or suggestions yet.",
    "", "## Metric Gaps",
    alignment.missingMetrics.length ? alignment.missingMetrics.map(item => `- ${item.title}: capture an objective, primary metric and authored target`).join("\n") : "Every active initiative has an authored objective, metric and target. Achievement has not been assessed.",
    "", "## Objective Risks",
    alignment.atRiskObjectives.length ? alignment.atRiskObjectives.map(entry => `- ${entry.objective}: ${entry.items.filter(item => activeRisks(item).length).map(item => item.title).join(", ")}`).join("\n") : "No objective-level risks captured."
  ].join("\n");
}
function linkedMeasurementEvidence(item, options) {
  // A supplied canonical collection is authoritative, including an empty one.
  // Projected validation records remain compatible with existing callers.
  const canonical = Array.isArray(options?.insightRecords);
  const records = canonical ? options.insightRecords : item.validationRecords || [];
  const evidence = records.filter(record => record?.id && record.initiativeId === item.id).flatMap(record => {
    const type = record.type || "validation";
    const successMetric = type === "validation" ? String(record.successMetric || "") : "";
    const result = type === "validation" ? String(record.result || "") : "";
    const learning = type === "research" ? String(record.findings || "")
      : type === "feedback" ? String(record.signal || "")
        : type === "support" ? [record.customerImpact, record.resolution].filter(Boolean).join("\n")
          : type === "discovery" ? [record.problem, record.hypothesis].filter(Boolean).join("\n") : "";
    if (!successMetric.trim() && !result.trim() && !learning.trim()) return [];
    return [{
      recordId: String(record.id), initiativeId: item.id, type, title: String(record.title || record.id),
      status: String(record.status || "unknown"), version: record.version ?? null,
      updatedAt: String(record.updatedAt || ""), source: String(record.source || ""), sourceRef: String(record.sourceRef || ""),
      successMetric, result, learning, method: String(record.method || ""),
      decision: String(record.decision || ""), decisionNotes: String(record.decisionNotes || ""),
      evidenceKind: type !== "validation" ? "learning-context" : result.trim() ? "reported-result" : "metric-definition",
      origin: "captured", adoptedAsPrimary: false, sourceAvailability: canonical ? "available" : "unverified-projection",
      provenance: { kind: "insight", recordId: String(record.id), initiativeId: item.id, type, availability: canonical ? "available" : "unverified-projection" }
    }];
  });
  // Do not choose a winning result or metric. Preserve every distinct source;
  // exact duplicate projections do not inflate coverage or review counts.
  return [...new Map(evidence.map(entry => [JSON.stringify(entry), entry])).values()]
    .sort((a, b) => a.recordId.localeCompare(b.recordId) || JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

export function buildMetricsPlan(items, now = new Date(), prioritization, options = {}) {
  const active = prioritizeItems(items.map(normalizeItem), prioritization).filter((item) => item.status !== "parked");
  const plans = active.map((item) => {
    const objective = inferObjective(item);
    const primaryMetric = suggestPrimaryMetric(item, objective);
    const leadingIndicator = suggestLeadingIndicator(item, objective);
    const hasTarget = Boolean(item.metricTarget);
    const hasOwner = Boolean(item.owner);
    const hasDate = Boolean(item.metricReviewDate);
    const hasEvidence = Boolean(item.problem || item.customer);
    const measurementEvidence = linkedMeasurementEvidence(item, options);
    const distinctSuccessMetrics = [...new Set(measurementEvidence.map(entry => entry.successMetric.trim()).filter(Boolean))];
    const distinctResults = [...new Set(measurementEvidence.map(entry => entry.result.trim()).filter(Boolean))];
    const evidenceReviewReasons = [
      distinctSuccessMetrics.length > 1 ? "Linked records name different success metrics. Review their scope; none has been selected as the primary metric." : "",
      distinctResults.length > 1 ? "Linked records contain different reported results. Review their scope and dates; they have not been reconciled." : "",
      item.primaryMetric && distinctSuccessMetrics.some(metric => metric !== item.primaryMetric)
        ? "A linked success metric differs from the authored primary metric. The authored measure remains unchanged." : ""
    ].filter(Boolean);
    const gapActions = [
      item.objective ? null : { field: "objective", label: "Define objective", description: "Capture the intended customer or business outcome." },
      item.primaryMetric ? null : { field: "primaryMetric", label: "Choose primary metric", description: "Capture the primary measure for the objective." },
      hasTarget ? null : { field: "metricTarget", label: "Set authored target", description: "Write the target you intend to pursue." },
      hasOwner ? null : { field: "owner", label: "Assign owner", description: "Assign an owner for metric follow-up." },
      hasDate ? null : { field: "metricReviewDate", label: "Set review date", description: "Optionally choose a review date for the saved measure." },
      hasEvidence ? null : { field: "problem", label: "Add customer evidence", description: "Capture customer evidence behind the metric." }
    ].filter(Boolean);
    const gaps = gapActions.map((action) => action.description);
    return {
      item,
      objective,
      primaryMetric,
      leadingIndicator,
      instrumentation: suggestInstrumentation(item, objective),
      definitionStatus: hasAdoptedOutcome(item) ? "complete" : hasAuthoredOutcome(item) ? "partial" : "missing",
      instrumentationStatus: "unverified",
      instrumentationGaps: ["Instrumentation is unverified. No installed telemetry or observed event delivery has been verified."],
      achievementStatus: "not-assessed",
      measurementEvidence,
      evidenceStatus: evidenceReviewReasons.length ? "review-required" : measurementEvidence.length ? "linked" : "none",
      evidenceReviewReasons,
      origin: item.primaryMetric ? "captured" : "suggested",
      sourceIds: [...new Set([item.id, ...measurementEvidence.map(entry => entry.recordId)])],
      sourceReferences: [{ kind: "initiative", initiativeId: item.id }, ...measurementEvidence.map(entry => entry.provenance)],
      objectiveOrigin: item.objective ? "captured" : "suggested",
      metricTarget: item.metricTarget,
      metricReviewDate: item.metricReviewDate,
      status: hasAdoptedOutcome(item) ? "Saved measure" : "Needs tracking",
      gaps,
      gapActions,
      reviewDate: item.metricReviewDate
    };
  });

  const tracked = plans.filter((plan) => plan.status === "Saved measure");
  const gaps = plans.filter((plan) => plan.gaps.length);
  const instrumentationGaps = plans.filter(plan => plan.instrumentationStatus !== "verified");
  const launchGaps = instrumentationGaps.filter((plan) => plan.item.status === "committed" || plan.item.status === "shipped");
  const dashboard = Object.entries(plans.reduce((counts, plan) => {
    counts[plan.objective] = (counts[plan.objective] || 0) + 1;
    return counts;
  }, {})).map(([objective, count]) => ({ objective, count }));

  return {
    generatedAt: now.toISOString(),
    plans,
    tracked,
    gaps,
    launchGaps,
    instrumentationGaps,
    dashboard,
    metrics: {
      total: plans.length,
      tracked: tracked.length,
      instrumentationUnknown: instrumentationGaps.length,
      linkedEvidence: plans.reduce((count, plan) => count + plan.measurementEvidence.length, 0),
      evidenceReview: plans.filter(plan => plan.evidenceStatus === "review-required").length,
      gaps: gaps.length,
      launchGaps: launchGaps.length
    }
  };
}

export function buildMetricsMemo(items, now = new Date(), prioritization, options = {}) {
  const plan = buildMetricsPlan(items, now, prioritization, options);
  return [
    `# Metrics Plan - ${localDateStamp(now)}`,
    "",
    "## Measurement Coverage",
    `- ${plan.metrics.tracked} of ${plan.metrics.total} initiatives have a saved objective, measure and authored target; achievement is not assessed.`,
    `- Instrumentation is unverified for ${plan.metrics.instrumentationUnknown} initiatives. A definition or reported result does not verify installed telemetry or achievement.`,
    "",
    "## Primary Metrics",
    plan.plans.length ? plan.plans.map((entry) => `- ${entry.item.title}: ${entry.origin === "suggested" ? "Suggested metric — " : "Saved metric — "}${entry.primaryMetric} (${entry.objectiveOrigin === "suggested" ? "suggested grouping: " : ""}${entry.objective}); ${entry.metricTarget ? `authored target: ${entry.metricTarget}` : "target not captured"}; ${entry.reviewDate ? `review: ${entry.reviewDate}` : "review date not captured"}`).join("\n") : "- No active initiatives to measure.",
    "",
    "## Tracking Gaps",
    plan.gaps.length ? plan.gaps.slice(0, 8).map((entry) => `- ${entry.item.title}: ${entry.gaps[0]}`).join("\n") : "- No metric definition gaps detected. Instrumentation and achievement remain unverified.",
    "",
    "## Linked Measurement Evidence",
    "Saved record content is supporting evidence, not an adopted primary metric, verified instrumentation or an assessment of achievement.",
    plan.plans.some(entry => entry.measurementEvidence.length) ? plan.plans.flatMap(entry => [
      ...entry.measurementEvidence.map(evidence => `- ${entry.item.title}: ${evidence.title} [${evidence.type}; source record: ${evidence.recordId}; source availability: ${evidence.sourceAvailability}; initiative: ${evidence.initiativeId}; status: ${evidence.status}${evidence.version == null ? "" : `; version: ${evidence.version}`}${evidence.updatedAt ? `; updated: ${evidence.updatedAt}` : ""}]; ${evidence.successMetric ? `success metric (not adopted): ${evidence.successMetric}; ` : ""}${evidence.result ? `reported result (not verified): ${evidence.result}; ` : ""}${evidence.learning ? `learning context: ${evidence.learning}; ` : ""}${evidence.method ? `method: ${evidence.method}; ` : ""}${evidence.sourceRef ? `source reference: ${evidence.sourceRef}; ` : ""}${evidence.decision || evidence.decisionNotes ? `recorded decision: ${validationDecisionSummary(evidence, "not recorded")}` : ""}`),
      ...entry.evidenceReviewReasons.map(reason => `- Review ${entry.item.title}: ${reason}`)
    ]).join("\n") : "- No linked measurement evidence recorded.",
    "",
    "## Instrumentation",
    plan.instrumentationGaps.length ? plan.instrumentationGaps.map((entry) => `- ${entry.item.title}: ${entry.instrumentationGaps.join(" ")} ${entry.instrumentation}`).join("\n") : "- No active initiatives to assess for instrumentation."
  ].join("\n");
}

export function buildPortfolioDashboard(items, now = new Date(), capacity, prioritization) {
  const normalized = items.map(normalizeItem);
  const active = normalized.filter((item) => item.status !== "shipped" && item.status !== "parked");
  const statusMix = Object.entries(groupByStatus(normalized)).map(([status, statusItems]) => ({ status, label: statusLabels[status], count: statusItems.length, effort: sumEffort(statusItems) }));
  const capacityPlan = buildCapacityPlan(normalized, capacity, prioritization);
  const alignment = buildOutcomeAlignment(normalized, prioritization);
  const actions = buildActionQueue(normalized, now, prioritization);
  const risks = buildRiskRegister(normalized, prioritization);
  const launch = buildLaunchBoard(normalized, now, prioritization);
  const segmentMix = buildStakeholderMap(active).segments.slice(0, 6).map((segment) => ({
    segment: segment.name,
    count: segment.count,
    topItems: active.filter((item) => audienceFor(item).includes(segment.name)).slice(0, 3)
  }));
  const warnings = [
    capacityPlan.overage ? `Capacity is over by ${capacityPlan.overage} effort points.` : "",
    actions.metrics.total ? `${actions.metrics.total} high-priority actions need follow-up.` : "",
    risks.length ? `${risks.length} risks are active across the portfolio.` : "",
    launch.metrics.noGo ? `${launch.metrics.noGo} launch candidates are no-go.` : "",
    alignment.missingMetrics.length ? `${alignment.missingMetrics.length} active initiatives need a metric or decision.` : ""
  ].filter(Boolean);

  return {
    generatedAt: now.toISOString(),
    capacityAvailable: capacityPlan.capacityAvailable,
    capacity: capacityPlan.capacity,
    metrics: {
      capacityAvailable: capacityPlan.capacityAvailable,
      active: active.length,
      capacity: capacityPlan.capacity,
      usedEffort: capacityPlan.totalEffort,
      committedEffort: capacityPlan.committedEffort,
      discoveryEffort: capacityPlan.discoveryEffort,
      utilization: capacityPlan.utilization,
      risks: risks.length,
      actions: actions.metrics.total
    },
    statusMix,
    objectiveMix: alignment.coverage,
    segmentMix,
    watchlist: actions.queue.slice(0, 6),
    warnings,
    recommendationActions: buildPortfolioRecommendationActions({ active, capacityPlan, alignment, actions, risks, launch }),
    recommendations: buildPortfolioRecommendationActions({ active, capacityPlan, alignment, actions, risks, launch }).map(entry => entry.text)
  };
}

export function buildPortfolioMemo(items, now = new Date(), capacity, prioritization) {
  const portfolio = buildPortfolioDashboard(items, now, capacity, prioritization);
  return [
    `# Portfolio Review - ${localDateStamp(now)}`,
    "",
    "## Health Signals",
    `- Active initiatives: ${portfolio.metrics.active}`,
    ...(portfolio.capacityAvailable ? [
      `- Active effort: ${portfolio.metrics.usedEffort} / ${portfolio.metrics.capacity}`,
      portfolio.metrics.capacity === 0 ? "- No capacity: 0 effort configured." : `- Capacity utilization: ${portfolio.metrics.utilization}%`
    ] : ["- Capacity is unconfigured. Supply a planning horizon and effort budget before assessing utilization.", `- Active effort: ${portfolio.metrics.usedEffort}`]),
    `- Active risks: ${portfolio.metrics.risks}`,
    `- Action queue: ${portfolio.metrics.actions}`,
    "",
    "## Objective Mix",
    portfolio.objectiveMix.length ? portfolio.objectiveMix.map((entry) => `- ${entry.objectiveOrigin === "suggested" ? "Suggested grouping — " : ""}${entry.objective}: ${entry.count} initiatives, ${entry.effort} effort`).join("\n") : "- No active objective mix yet.",
    "",
    "## Segment Mix",
    portfolio.segmentMix.length ? portfolio.segmentMix.map((entry) => `- ${entry.segment}: ${entry.count} initiatives`).join("\n") : "- No segment mix yet.",
    "",
    "## Watchlist",
    portfolio.watchlist.length ? portfolio.watchlist.map((entry) => `- [${entry.type}] ${entry.title}: ${entry.action}`).join("\n") : "- No watchlist actions.",
    "",
    "## Recommendations",
    portfolio.recommendations.length ? portfolio.recommendations.map((entry) => `- ${entry}`).join("\n") : portfolio.capacityAvailable ? "- Portfolio is balanced enough for the current operating view." : "- No non-capacity recommendations. Configure capacity to assess workload."
  ].join("\n");
}

function buildPortfolioRecommendationActions({ active, capacityPlan, alignment, actions, risks, launch }) {
  const target = (item, field, label, recordId = "") => ({ itemId: item.id, title: item.title, field, label, recordId });
  return [
    capacityPlan.overage ? { id: "capacity", text: `Cut, park, or resequence at least ${capacityPlan.overage} effort points.`, targets: active.filter(item => ["committed", "discovery"].includes(item.status)).map(item => target(item, "status", "Replan commitment")) } : null,
    alignment.coverage.length > 3 ? { id: "objectives", text: "Confirm the portfolio is not spread across too many simultaneous objectives.", targets: active.map(item => target(item, "decision", "Record focus decision")) } : null,
    alignment.missingMetrics.length ? { id: "metrics", text: "Add success metrics before the next planning review.", targets: active.filter(item => !hasAdoptedOutcome(item)).map(item => target(item, "primaryMetric", "Capture outcome measure")) } : null,
    actions.metrics.overdue ? { id: "overdue", text: "Reset overdue commitments before adding new scope.", targets: actions.overdue.map(entry => target(entry.item, "dueDate", "Reset due date")) } : null,
    risks.length ? { id: "risks", text: "Escalate the highest-severity risks with explicit asks.", targets: risks.map(entry => target(entry.item, "risks", "Edit risk", entry.record.id)) } : null,
    launch.metrics.noGo ? { id: "launch", text: "Hold no-go launches until readiness gaps are closed or accepted.", targets: launch.noGo.map(entry => target(entry.item, "status", "Hold or replan launch")) } : null
  ].filter(Boolean);
}

function inferObjective(item) {
  if (String(item.objective || "").trim()) return String(item.objective).trim();
  const text = `${item.title || ""} ${item.customer || ""} ${item.problem || ""} ${primaryRiskText(item)} ${item.experiment || ""}`.toLowerCase();
  const match = objectiveRules.find(rule => rule.keywords.some(keyword => text.includes(keyword)));
  return match ? match.name : "Objective not captured";
}

function suggestKeyResult(entry, keyResults = []) {
  const results = keyResults.filter(kr => kr.sourceIds.some(id => entry.sourceIds.includes(id)));
  return results.length ? results.map(kr => `${kr.origin === "suggested" ? "Suggestion" : kr.status === "adopted" ? "Saved measure" : "Draft measure"}: ${kr.result}`).join("; ") : "Capture an objective, primary metric and authored target.";
}

function suggestPrimaryMetric(item, objective) {
  if (item.primaryMetric) return item.primaryMetric;
  if (objective === "Trust & Admin Control") return "Admin task success rate or unresolved trust escalations";
  if (objective === "Activation & Setup") return "Activation completion rate or time to first value";
  if (objective === "Customer Insight") return "Customer feedback response rate or validated themes";
  if (objective === "Efficiency") return "Workflow completion time or repeated manual effort";
  if (objective === "Product Growth") return "Product adoption, retention or conversion";
  return "A customer or business outcome you can measure";
}
function suggestLeadingIndicator(item, objective) {
  if (item.status === "shipped") return "Post-ship readout with adoption and qualitative feedback.";
  if (item.status === "committed") return "Beta usage, completion rate, and support signal trend.";
  if (objective === "Customer Insight") return "Interview count, tagged themes, and evidence confidence.";
  if (objective === "Activation & Setup") return "Setup step completion and invite rate.";
  if (objective === "Trust & Admin Control") return "Policy configuration success and admin support tickets.";
  return "Target-user engagement with the proposed workflow.";
}

function suggestInstrumentation(item, objective) {
  return `Suggested measurement setup: choose a data source and define how to observe ${item.primaryMetric || suggestPrimaryMetric(item, objective)} for ${item.customer || "the intended audience"}. Event names have not been captured.`;
}
function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function averageConfidence(items) {
  if (!items.length) return 0;
  return Number((items.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / items.length).toFixed(2));
}

export function buildReviewLoop(items, now = new Date(), prioritization, options = {}) {
  const normalized = prioritizeItems(items, prioritization).map(normalizeItem);
  const active = normalized.filter(item => !["shipped", "parked"].includes(item.status));
  const allShipped = normalized.filter(item => item.status === "shipped");
  const allOverdue = active.filter(item => localDayDifference(item.dueDate, now) > 0);
  const synthesis = buildDecisionSynthesis(normalized, options);
  const learningEvidence = buildLearningEvidence(normalized, options, synthesis);
  const learningPrompts = buildLearningPrompts(normalized, options, learningEvidence);
  const decisionIds = new Set([...synthesis.pending, ...synthesis.suggestions].map(entry => entry.itemId));
  const riskEscalations = active.filter(item => !decisionIds.has(item.id) && activeRisks(item).length).map(item => ({
    itemId: item.id, recordId: "", title: item.title, initiativeTitle: item.title, status: "suggested", origin: "suggested",
    ask: `Review the risk and decide whether escalation is needed: ${primaryRiskText(item)}`,
    context: primaryRiskText(item), owner: item.owner || "Unassigned", dueDate: item.dueDate || "No date",
    sourceIds: activeRisks(item).map(record => record.id)
  }));
  const escalationIds = new Set(riskEscalations.map(entry => entry.itemId));
  const learningIds = new Set([...learningEvidence, ...learningPrompts].map(entry => entry.itemId));
  const decisionsNeeded = active.filter(item => decisionIds.has(item.id) || escalationIds.has(item.id)).slice(0, 8);
  const allLearningCandidates = normalized.filter(item => item.status === "shipped" || learningIds.has(item.id));
  const shipped = allShipped.slice(0, 6), overdue = allOverdue.slice(0, 6), learningCandidates = allLearningCandidates.slice(0, 6);
  return { shipped, overdue, decisionsNeeded, learningCandidates, learningEvidence, learningPrompts, riskEscalations,
    decisionEntries: synthesis.pending, decisionSuggestions: synthesis.suggestions, decisionHistory: synthesis.decided,
    retroPrompts: buildRetroPrompts({ shipped, overdue, decisionsNeeded, learningCandidates }),
    metrics: { shipped: allShipped.length, overdue: allOverdue.length, decisionNeeds: synthesis.pending.length + synthesis.suggestions.length + riskEscalations.length, riskEscalations: riskEscalations.length,
      pendingDecisions: synthesis.pending.length, decisionSuggestions: synthesis.suggestions.length, learningItems: allLearningCandidates.length, learningEvidence: learningEvidence.length, learningPrompts: learningPrompts.length }
  };
}

export function buildReviewMemo(items, now = new Date(), prioritization, options = {}) {
  const review = buildReviewLoop(items, now, prioritization, options);
  return [
    `# Product Review - ${localDateStamp(now)}`, "", "## Shipped",
    ...(review.metrics.shipped > review.shipped.length ? [`Showing ${review.shipped.length} of ${review.metrics.shipped} shipped initiatives.`] : []),
    review.shipped.length ? review.shipped.map(item => {
      const evidence = review.learningEvidence.filter(entry => entry.itemId === item.id);
      return `- ${item.title}: ${evidence.length ? evidence.map(synthesisEvidenceLabel).join(" | ") : "Capture launch outcome"}`;
    }).join("\n") : "No shipped initiatives in the current workspace.",
    "", "## Slipped Or Overdue",
    ...(review.metrics.overdue > review.overdue.length ? [`Showing ${review.overdue.length} of ${review.metrics.overdue} overdue initiatives.`] : []),
    review.overdue.length ? review.overdue.map(item => `- ${item.title}: due ${item.dueDate}, next step ${item.nextStep || "missing"}`).join("\n") : "No overdue active initiatives.",
    "", "## Decisions Needed",
    review.decisionEntries.length ? review.decisionEntries.map(entry => `- ${synthesisDecisionLabel(entry)}`).join("\n") : "No captured pending decisions.",
    "", "## Suggested Decisions",
    review.decisionSuggestions.length ? review.decisionSuggestions.map(entry => `- ${synthesisDecisionLabel(entry)}`).join("\n") : "No decision suggestions.",
    "", "## Risk Escalation Suggestions",
    review.riskEscalations.length ? review.riskEscalations.map(entry => `- ${synthesisDecisionLabel(entry)}`).join("\n") : "No additional risk escalation suggestions.",
    "", "## Captured Learning and Decision History",
    review.learningEvidence.length ? review.learningEvidence.map(entry => `- ${entry.title} (${entry.initiativeTitle}): ${synthesisEvidenceLabel(entry)}`).join("\n") : "No captured learning evidence.",
    "", "## Prospective Learning Prompts",
    review.learningPrompts.length ? review.learningPrompts.map(entry => `- ${entry.title}: ${entry.prompt}; suggested; sources: ${entry.sourceIds.join(", ")}`).join("\n") : "No prospective learning prompts.",
    "", "## Retro Prompts", review.retroPrompts.map(prompt => `- ${prompt}`).join("\n")
  ].join("\n");
}

function buildRetroPrompts({ shipped, overdue, decisionsNeeded, learningCandidates }) {
  const prompts = [];
  prompts.push(shipped.length ? "Which shipped initiative produced the clearest customer or business signal?" : "What evidence would let us call one active initiative shipped next cycle?");
  prompts.push(overdue.length ? "What scope, owner, or dependency caused the slipped commitments?" : "Which planning habit kept commitments on track this cycle?");
  prompts.push(decisionsNeeded.length ? "Which open decision should be escalated before more delivery work starts?" : "Which decision can be documented now to prevent future ambiguity?");
  prompts.push(learningCandidates.length ? "What learning should change the next roadmap or discovery bet?" : "Which initiative most needs an experiment before it receives more capacity?");
  return prompts;
}

export function findDependencyCycles(items) {
  const nodes = new Map();
  for (const item of items) {
    const id = String(item.id || "");
    if (id && !nodes.has(id)) nodes.set(id, { outgoing: [], incoming: [] });
  }
  const edges = [];
  for (const item of items) {
    const itemId = String(item.id || "");
    if (!nodes.has(itemId)) continue;
    for (const [index, record] of (Array.isArray(item.dependencies) ? item.dependencies : []).entries()) {
      const targetItemId = String(record.targetInitiativeId || "").trim();
      if (record.targetType !== "initiative" || record.status === "resolved" || !nodes.has(targetItemId)) continue;
      nodes.get(itemId).outgoing.push(targetItemId);
      nodes.get(targetItemId).incoming.push(itemId);
      edges.push({ itemId, targetItemId, recordId: String(record.id || `dependency-${index + 1}`).trim(), description: String(record.description || "") });
    }
  }

  // Iterative Kosaraju traversal avoids recursion limits and enumerating every cycle.
  const visited = new Set();
  const finished = [];
  for (const id of nodes.keys()) {
    if (visited.has(id)) continue;
    visited.add(id);
    const stack = [{ id, next: 0 }];
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const outgoing = nodes.get(frame.id).outgoing;
      if (frame.next === outgoing.length) {
        finished.push(frame.id);
        stack.pop();
      } else {
        const targetId = outgoing[frame.next++];
        if (!visited.has(targetId)) {
          visited.add(targetId);
          stack.push({ id: targetId, next: 0 });
        }
      }
    }
  }
  const componentById = new Map();
  for (let index = finished.length - 1; index >= 0; index -= 1) {
    const id = finished[index];
    if (componentById.has(id)) continue;
    componentById.set(id, id);
    const stack = [id];
    while (stack.length) {
      for (const sourceId of nodes.get(stack.pop()).incoming) {
        if (!componentById.has(sourceId)) {
          componentById.set(sourceId, id);
          stack.push(sourceId);
        }
      }
    }
  }

  // Keep groups, members and edges in supplied order without an O(V log V) sort.
  const groups = new Map();
  for (const id of nodes.keys()) {
    const componentId = componentById.get(id);
    if (!groups.has(componentId)) groups.set(componentId, { itemIds: [], edges: [] });
    groups.get(componentId).itemIds.push(id);
  }
  for (const edge of edges) {
    const componentId = componentById.get(edge.itemId);
    if (componentId === componentById.get(edge.targetItemId)) groups.get(componentId).edges.push(edge);
  }
  return [...groups.values()].filter((group) => group.itemIds.length > 1 || group.edges.length);
}

function dependencySourceReference(item, record, sourceItems) {
  const title = item.title || "Untitled initiative";
  const target = sourceItems.get(record.targetInitiativeId);
  const targetLabel = record.targetType === "initiative"
    ? `${target?.title || record.targetName || record.targetInitiativeId || "Unnamed initiative"}${target ? "" : " (unavailable)"}`
    : record.targetName || "Target not set";
  return {
    itemId: item.id, title, recordId: record.id,
    description: record.description, targetLabel, status: record.status,
    label: `${title}: ${record.description || "Dependency description not set"} → ${targetLabel}`
  };
}

export function buildDependencyMap(items, now = new Date(), prioritization, allItems = items) {
  const sourceItems = new Map([...allItems, ...items].map((item) => [String(item.id || ""), item]));
  const visibleIds = new Set(items.map((item) => String(item.id || "")));
  const cycles = findDependencyCycles(allItems).filter((group) => group.itemIds.some((id) => visibleIds.has(id)));
  const active = prioritizeItems(items, prioritization)
    .map(normalizeItem)
    .filter((item) => item.status !== "shipped" && item.status !== "parked");
  const influence = priorityInfluence(active, prioritization);
  const dependencies = active.flatMap((item) => activeDependencies(item).map((record) => ({
    item,
    record,
    dependency: record.description,
    sourceReference: dependencySourceReference(item, record, sourceItems),
    owner: resolveRecordOwner(record, item),
    urgency: dependencyUrgency(record, item, now),
    priorityContribution: influence.get(item.id) || 0,
    ask: buildDependencyAsk(record, item)
  }))).sort((a, b) => b.urgency - a.urgency
    || b.priorityContribution - a.priorityContribution
    || String(a.record.neededBy || "9999").localeCompare(String(b.record.neededBy || "9999")));
  const labelCounts = new Map();
  for (const { sourceReference } of dependencies) labelCounts.set(sourceReference.label, (labelCounts.get(sourceReference.label) || 0) + 1);
  for (const { sourceReference, record } of dependencies) {
    if (labelCounts.get(sourceReference.label) > 1) {
      sourceReference.label += ` (initiative ${sourceReference.itemId}, dependency ${sourceReference.recordId}${record.targetType === "initiative" ? `; target ${record.targetInitiativeId || "missing ID"}` : ""})`;
    }
  }
  const blockers = dependencies.filter((entry) => entry.record.status === "at-risk" || entry.record.status === "blocked");
  const owners = new Map();
  dependencies.forEach((dependency) => {
    const current = owners.get(dependency.owner) || { owner: dependency.owner, count: 0, blockerCount: 0, pendingCount: 0, urgency: 0, items: [], references: [] };
    current.count += 1;
    if (dependency.record.status === "pending") current.pendingCount += 1;
    else current.blockerCount += 1;
    current.urgency = Math.max(current.urgency, dependency.urgency);
    current.items.push(dependency.item.title);
    current.references.push({ ...dependency.sourceReference });
    owners.set(dependency.owner, current);
  });
  const upcoming = dependencies.filter((entry) => entry.record.neededBy)
    .sort((a, b) => a.record.neededBy.localeCompare(b.record.neededBy)).slice(0, 8);
  return {
    dependencies,
    cycles,
    blockers,
    owners: [...owners.values()].sort((a, b) => b.urgency - a.urgency || b.count - a.count),
    upcoming,
    metrics: {
      active: dependencies.length,
      pending: dependencies.filter((entry) => entry.record.status === "pending").length,
      blockers: blockers.length,
      unassigned: dependencies.filter((entry) => entry.owner === "Unassigned").length,
      highUrgency: dependencies.filter((entry) => entry.urgency >= 70).length,
      upcoming: dependencies.filter((entry) => entry.record.neededBy).length
    }
  };
}

export function buildDependencyMemo(items, now = new Date(), prioritization, allItems = items) {
  const map = buildDependencyMap(items, now, prioritization, allItems);
  const titles = new Map(allItems.map((item) => [String(item.id || ""), item.title || "Untitled initiative"]));
  return [
    `# Dependency Review - ${localDateStamp(now)}`,
    ...(map.cycles.length ? [
      "",
      "## Circular Dependencies",
      "Warning: unresolved circular dependencies exist. Resolve these loops before treating this plan as executable.",
      ...map.cycles.map((group, index) => [
        `### Cycle group ${index + 1}`,
        ...group.edges.map((edge) => `- ${titles.get(edge.itemId)} [${edge.itemId}] depends on ${titles.get(edge.targetItemId)} [${edge.targetItemId}]: ${edge.description} (dependency ${edge.recordId}).`)
      ].join("\n"))
    ] : []),
    "",
    "## Highest-Urgency Blockers",
    map.blockers.length ? map.blockers.slice(0, 5).map((blocker) => `- ${blocker.sourceReference.label} (initiative ${blocker.item.id}, dependency ${blocker.record.id}; ${blocker.owner}, urgency ${blocker.urgency}): ${blocker.ask}`).join("\n") : "No blockers detected.",
    "",
    "## Owner Load",
    map.owners.length ? map.owners.map((owner) => [
      `- ${owner.owner}: ${owner.count} active dependency record(s), ${owner.pendingCount} pending, ${owner.blockerCount} blocker(s), max urgency ${owner.urgency}`,
      ...owner.references.map((reference) => `  - [${dependencyStatusLabels[reference.status]}] ${reference.label} (initiative ${reference.itemId}, dependency ${reference.recordId}).`)
    ].join("\n")).join("\n") : "No active owner dependencies detected.",
    "",
    "## Upcoming Commitments",
    map.upcoming.length ? map.upcoming.map((entry) => `- ${entry.record.neededBy}: ${entry.sourceReference.label} (initiative ${entry.item.id}, dependency ${entry.record.id}; ${entry.owner})`).join("\n") : "No dated dependencies captured."
  ].join("\n");
}

export function buildDeliveryBoard(items, now = new Date(), prioritization) {
  const committed = prioritizeItems(items.map(normalizeItem), prioritization).filter((item) => item.status === "committed");
  const dependencies = buildDependencyMap(items, now, prioritization);
  const entries = committed.map((item) => {
    const blockers = dependencies.blockers.filter((blocker) => blocker.item.id === item.id);
    const overdue = localDayDifference(item.dueDate, now) > 0;
    const readiness = calculateLaunchReadiness(item);
    const state = overdue ? "Overdue" : blockers.length ? "At risk" : readiness >= 90 ? "On track" : "Watch";
    return {
      item,
      state,
      readiness,
      blockers,
      owner: item.owner || "Unassigned",
      dueDate: item.dueDate || "No date",
      nextStep: item.nextStep || blockers[0]?.ask || "Define the next delivery step.",
      milestone: deliveryMilestone(item, readiness)
    };
  });
  return {
    entries,
    onTrack: entries.filter((entry) => entry.state === "On track"),
    watch: entries.filter((entry) => entry.state === "Watch"),
    atRisk: entries.filter((entry) => entry.state === "At risk"),
    overdue: entries.filter((entry) => entry.state === "Overdue"),
    metrics: {
      committed: entries.length,
      onTrack: entries.filter((entry) => entry.state === "On track").length,
      atRisk: entries.filter((entry) => entry.state === "At risk").length,
      overdue: entries.filter((entry) => entry.state === "Overdue").length
    }
  };
}

export function buildDeliveryMemo(items, now = new Date(), prioritization) {
  const board = buildDeliveryBoard(items, now, prioritization);
  return [
    `# Delivery Review - ${localDateStamp(now)}`,
    "",
    "## On Track",
    board.onTrack.length ? board.onTrack.map((entry) => `- ${entry.item.title}: ${entry.readiness}% ready, due ${entry.dueDate}`).join("\n") : "- No committed work is fully on track.",
    "",
    "## Watch",
    board.watch.length ? board.watch.map((entry) => `- ${entry.item.title}: ${entry.milestone}; next ${entry.nextStep}`).join("\n") : "- No watch-list delivery work.",
    "",
    "## At Risk",
    board.atRisk.length ? board.atRisk.map((entry) => `- ${entry.item.title}: ${entry.blockers.map((blocker) => blocker.ask).join("; ") || entry.nextStep}`).join("\n") : "- No at-risk delivery work.",
    "",
    "## Overdue",
    board.overdue.length ? board.overdue.map((entry) => `- ${entry.item.title}: due ${entry.dueDate}; ${entry.nextStep}`).join("\n") : "- No overdue committed work."
  ].join("\n");
}

function deliveryMilestone(item, readiness) {
  if (!item.dueDate) return "Set delivery date";
  if (!item.owner) return "Assign owner";
  if (!item.nextStep) return "Define next step";
  if (readiness < 70) return "Close readiness gaps";
  if (readiness < 90) return "Confirm launch checklist";
  return "Ready for release review";
}

function buildDependencyAsk(record, item) {
  const owner = resolveRecordOwner(record, item);
  if (owner === "Unassigned") return "Assign a dependency owner and confirm accountability.";
  if (record.status === "blocked") return `Ask ${owner} to unblock: ${record.description}`;
  if (record.status === "at-risk") return `Ask ${owner} to recover or replan: ${record.description}`;
  return `Confirm ${owner} is on track for ${record.neededBy || "the needed date"}.`;
}

export function dependencyUrgency(record, item = {}, now = new Date()) {
  const base = record?.status === "blocked" ? 85 : record?.status === "at-risk" ? 60 : 25;
  const ownerBoost = resolveRecordOwner(record, item) === "Unassigned" ? 10 : 0;
  let dueBoost = 0;
  const daysPastDeadline = localDayDifference(record?.neededBy, now);
  if (daysPastDeadline !== null) {
    const remaining = -daysPastDeadline;
    dueBoost = remaining < 0 ? 15 : remaining <= 7 ? 10 : remaining <= 30 ? 5 : 0;
  }
  return Math.min(100, base + ownerBoost + dueBoost);
}


export function buildCommunicationPlan(items, now = new Date(), prioritization, options = {}) {
  const prioritized = prioritizeItems(items, prioritization);
  const active = prioritized.filter((item) => item.status !== "shipped" && item.status !== "parked");
  const risks = buildRiskRegister(items, prioritization).slice(0, 5);
  const release = buildReleasePlan(items, prioritization);
  const outcome = buildOutcomeReport(items, prioritization, options);
  const dependencies = buildDependencyMap(items, now, prioritization).blockers.slice(0, 5);
  const audiences = [
    {
      sourceKey: "audience-executives",
      ...(risks[0] ? { itemId: risks[0].item.id, target: { kind: "risk", itemId: risks[0].item.id, recordId: risks[0].record.id } } : {}),
      audience: "Executives",
      cadence: "Weekly",
      focus: `${outcome.committed} committed, ${outcome.highRisk} high-risk, ${outcome.averageReadiness}% average readiness`,
      message: release.now.length ? `Current commitments: ${release.now.map((item) => item.title).join(", ")}` : "No committed initiatives need executive attention.",
      ask: risks[0]?.mitigation || "Confirm whether current priorities still match business goals."
    },
    {
      sourceKey: "audience-delivery",
      ...(dependencies[0] ? { itemId: dependencies[0].item.id, target: { kind: "dependency", itemId: dependencies[0].item.id, recordId: dependencies[0].record.id } } : {}),
      audience: "Delivery Team",
      cadence: "Twice weekly",
      focus: "Next steps, blockers, and decision clarity",
      message: active.slice(0, 4).map((item) => `${item.title}: ${item.nextStep || "needs next step"}`).join(" | ") || "No active delivery work.",
      ask: dependencies[0]?.ask || "Update next steps and owners before the next standup."
    },
    {
      sourceKey: "audience-customer-facing",
      audience: "Customer-facing Teams",
      cadence: "Weekly",
      focus: "Customer themes, launch notes, and feedback loops",
      themes: outcome.topThemes.slice(0, 4),
      message: outcome.topThemes.slice(0, 4).map((theme) => `${theme.theme} (${theme.count} feedback records); ${themeEvidenceSummary(theme)}`).join(" | ") || "No customer themes captured yet.",
      ask: "Add missing customer signals to the workspace before planning."
    },
    {
      sourceKey: "audience-research",
      audience: "Design and Research",
      cadence: "Weekly",
      focus: "Discovery questions and validation plans",
      message: release.next.length ? `Discovery focus: ${release.next.map((item) => item.title).join(", ")}` : "No discovery initiatives queued.",
      ask: "Confirm the riskiest assumption for each discovery item."
    }
  ];
  return {
    audiences,
    escalation: risks.map((risk) => ({ itemId: risk.item.id, recordId: risk.record.id, title: risk.item.title, owner: risk.owner, ask: risk.mitigation, severity: risk.severity })),
    metrics: {
      audiences: audiences.length,
      escalations: risks.length,
      active: active.length,
      owners: new Set(active.map((item) => item.owner).filter(Boolean)).size
    }
  };
}

export function buildCommunicationMemo(items, now = new Date(), prioritization, options = {}) {
  const plan = buildCommunicationPlan(items, now, prioritization, options);
  return [
    `# Communications Plan - ${localDateStamp(now)}`,
    "",
    "## Audience Updates",
    plan.audiences.map((entry) => `- ${entry.audience} (${entry.cadence}): ${entry.message} Ask: ${entry.ask}`).join("\n"),
    "",
    "## Escalations",
    plan.escalation.length ? plan.escalation.map((entry) => `- ${entry.title} [${entry.owner}] severity ${entry.severity}: ${entry.ask}`).join("\n") : "No escalations captured."
  ].join("\n");
}

export function buildMeetingAgenda(items, meetingType = "weekly-review", now = new Date(), prioritization, options = {}) {
  const weekly = buildWeeklyPlan(items, prioritization, options);
  const risks = buildRiskRegister(items, prioritization).slice(0, 4);
  const release = buildReleasePlan(items, prioritization);
  const review = buildReviewLoop(items, now, prioritization, options);
  const comms = buildCommunicationPlan(items, now, prioritization, options);
  const agendas = {
    "weekly-review": {
      title: "Weekly Product Review",
      duration: 45,
      sections: [
        agendaSection("Outcomes", review.learningEvidence, "What changed in customer or business signal?"),
        agendaSection("Focus", weekly.focus, "What must move this week?"),
        agendaSection("Risks", risks.map((risk) => risk.item), "What needs escalation or mitigation?"),
        agendaSection("Decisions", weekly.decisionEntries, "What call needs to be made?"),
        agendaSection("Suggested Decisions", weekly.decisionSuggestions, "Are any unrecorded decisions needed?")
      ]
    },
    "daily-triage": {
      title: "Daily Product Triage",
      duration: 15,
      sections: [
        agendaSection("Unblock", weekly.unblock, "What is stuck?"),
        agendaSection("Next Steps", buildFollowUps(items, prioritization), "What needs a fresh next step?"),
        agendaSection("Today", weekly.focus.slice(0, 3), "What gets attention today?")
      ]
    },
    "launch-review": {
      title: "Launch Readiness Review",
      duration: 30,
      sections: [
        agendaSection("Now", release.now, "What is closest to launch?"),
        agendaSection("Readiness Gaps", release.now.filter((item) => calculateLaunchReadiness(item) < 100), "What launch checklist items are incomplete?"),
        agendaSection("Comms", comms.audiences, "Who needs the update?")
      ]
    },
    "decision-review": {
      title: "Decision Review",
      duration: 30,
      sections: [
        agendaSection("Pending Decisions", weekly.decisionEntries, "What decision is blocking progress?"),
        agendaSection("Escalations", comms.escalation, "Which asks require leadership attention?"),
        agendaSection("Suggested Decisions", weekly.decisionSuggestions, "Are any unrecorded decisions needed?"),
        agendaSection("Evidence", review.learningEvidence, "What evidence should influence the decision?")
      ]
    }
  };
  const agenda = agendas[meetingType] || agendas["weekly-review"];
  return { id: meetingType, generatedAt: now.toISOString(), ...agenda };
}

export function buildMeetingAgendaMarkdown(items, meetingType = "weekly-review", now = new Date(), prioritization, options = {}) {
  const agenda = buildMeetingAgenda(items, meetingType, now, prioritization, options);
  return [
    `# ${agenda.title} - ${localDateStamp(now)}`,
    "",
    `Duration: ${agenda.duration} minutes`,
    "",
    ...agenda.sections.flatMap((section) => [
      `## ${section.title}`,
      ...(section.total > section.items.length ? [`Showing ${section.items.length} of ${section.total}.`] : []),
      section.items.length ? section.items.map((item) => `- ${meetingItemLabel(item)}`).join("\n") : `- ${section.prompt}`,
      ""
    ])
  ].join("\n").trim();
}

function agendaSection(title, entries, prompt) {
  return { title, prompt, total: entries.length, items: entries.slice(0, 5) };
}

function meetingItemLabel(item) {
  if (item.item) return meetingItemLabel(item.item);
  if (item.evidence && item.sourceIds) return `${item.title} (${item.initiativeTitle}): ${synthesisEvidenceLabel(item)}`;
  if (item.ask && item.sourceIds && item.initiativeTitle) return synthesisDecisionLabel(item);
  if (item.audience && item.themes?.length) return `${item.audience}: ${item.message} Ask: ${item.ask}`;
  if (item.audience) return `${item.audience}: ${item.ask || item.message}`;
  if (item.title && item.ask) return `${item.title}: ${item.ask}`;
  if (item.title) return `${item.title}${item.nextStep ? ` - ${item.nextStep}` : ""}`;
  return String(item);
}

export function buildProductSpec(item, allItems = [], prioritization) {
  const normalized = normalizeItem(item || {});
  const checklist = buildLaunchChecklist(normalized);
  const dependencyMap = buildDependencyMap(allItems.length ? allItems : [normalized], new Date(), prioritization);
  const blockers = dependencyMap.blockers.filter((blocker) => blocker.item.id === normalized.id || blocker.item.title === normalized.title);
  return {
    title: normalized.title,
    owner: normalized.owner || "Owner needed",
    customer: normalized.customer || "Target customer needed",
    problem: normalized.problem || "Problem statement needed",
    status: normalized.status,
    score: evaluatePriority(normalized, prioritization).score,
    priorityLabel: methodLabel(prioritization),
    readiness: calculateLaunchReadiness(normalized),
    objective: inferObjective(normalized),
    objectiveOrigin: normalized.objective ? "captured" : "suggested",
    sourceIds: [normalized.id],
    metricTarget: normalized.metricTarget,
    metricReviewDate: normalized.metricReviewDate,
    successMetric: normalized.primaryMetric || "Primary metric not captured.",
    decision: normalized.decision || "Decision pending.",
    rollout: normalized.dueDate ? `Target release window: ${normalized.dueDate}` : "Release window not set.",
    risks: activeRisks(normalized).map((risk) => risk.description),
    dependencies: activeDependencies(normalized).map((dependency) => dependency.description),
    acceptanceCriteria: buildAcceptanceCriteria(normalized),
    nonGoals: buildNonGoals(normalized),
    readinessGaps: checklist.filter((entry) => !entry.done).map((entry) => entry.task)
  };
}

export function buildProductSpecMarkdown(item, allItems = [], now = new Date(), prioritization) {
  const spec = buildProductSpec(item, allItems, prioritization);
  return [
    `# ${spec.title} PRD`,
    "",
    `Generated: ${localDateStamp(now)}`,
    "",
    `## Owner\n${spec.owner}`,
    "",
    `## Customer\n${spec.customer}`,
    "",
    `## Problem\n${spec.problem}`,
    "",
    `## Objective\n${spec.objectiveOrigin === "suggested" ? "Suggested grouping — " : ""}${spec.objective}`,
    "",
    savedSuccessMetricMarkdown({ ...spec, primaryMetric: spec.successMetric }),
    "",
    "## Acceptance Criteria",
    spec.acceptanceCriteria.map((criterion) => `- ${criterion}`).join("\n"),
    "",
    "## Non-Goals",
    spec.nonGoals.map((goal) => `- ${goal}`).join("\n"),
    "",
    `## Rollout\n${spec.rollout}`,
    "",
    `## Decision\n${spec.decision}`,
    "",
    "## Risks And Dependencies",
    [...spec.risks, ...spec.dependencies].length ? [...spec.risks, ...spec.dependencies].map((entry) => `- ${entry}`).join("\n") : "- No risks or dependencies captured yet.",
    "",
    "## Readiness Gaps",
    spec.readinessGaps.length ? spec.readinessGaps.map((gap) => `- ${gap}`).join("\n") : "- Ready for launch review."
  ].join("\n");
}

function buildAcceptanceCriteria(item) {
  const criteria = [];
  criteria.push(`${item.customer || "Target users"} can complete the core workflow for ${item.title}.`);
  criteria.push(item.problem ? `The experience addresses: ${item.problem}` : "A validated problem statement is documented.");
  criteria.push(hasAdoptedOutcome(item) ? `Evaluate the saved measure ${item.primaryMetric} against the authored target: ${item.metricTarget}` : "Capture an objective, primary metric and authored target before assessing success.");
  const risk = primaryRiskText(item);
  criteria.push(risk ? `Known risk is mitigated or accepted: ${risk}` : "No unresolved launch-blocking risk remains.");
  return criteria;
}

function buildNonGoals(item) {
  return [
    "Do not expand scope beyond the stated customer and problem without a new decision.",
    item.status === "discovery" ? "Do not commit full delivery before the riskiest assumption is validated." : "Do not add unrelated platform cleanup to this launch.",
    "Do not treat internal completion as success without customer or business evidence."
  ];
}

export function buildLaunchBoard(items, now = new Date(), prioritization) {
  const active = prioritizeItems(items, prioritization).map(normalizeItem).filter((item) => item.status === "committed" || item.status === "discovery");
  const dependencyMap = buildDependencyMap(items, now, prioritization);
  const candidates = active.map((item) => {
    const checklist = buildLaunchChecklist(item);
    const gaps = checklist.filter((entry) => !entry.done);
    if (!item.primaryMetric || !item.metricTarget) gaps.push({ area: "Success measure", task: "Capture a primary metric and authored target before rollout review.", actions: [{ field: "primaryMetric", label: "Set primary metric" }, { field: "metricTarget", label: "Set metric target" }] });
    const blockers = dependencyMap.blockers.filter((blocker) => blocker.item.id === item.id);
    const readiness = calculateLaunchReadiness(item);
    return {
      item,
      readiness,
      goNoGo: readiness < 70 || blockers.length ? "Hold" : gaps.length ? "Watch" : "Ready",
      gaps,
      blockers,
      launchDate: item.dueDate || "Unscheduled"
    };
  });
  return {
    candidates,
    go: candidates.filter((candidate) => candidate.goNoGo === "Ready"),
    watch: candidates.filter((candidate) => candidate.goNoGo === "Watch"),
    noGo: candidates.filter((candidate) => candidate.goNoGo === "Hold"),
    metrics: {
      candidates: candidates.length,
      go: candidates.filter((candidate) => candidate.goNoGo === "Ready").length,
      watch: candidates.filter((candidate) => candidate.goNoGo === "Watch").length,
      noGo: candidates.filter((candidate) => candidate.goNoGo === "Hold").length
    }
  };
}

export function buildLaunchMemo(items, now = new Date(), prioritization) {
  const board = buildLaunchBoard(items, now, prioritization);
  return [
    `# Launch Review - ${localDateStamp(now)}`,
    "",
    rolloutReadinessGuidance,
    "",
    "## Ready",
    board.go.length ? board.go.map((entry) => `- ${entry.item.title}: ${entry.readiness}% checklist complete for ${entry.launchDate}`).join("\n") : "No launch candidates are fully ready.",
    "",
    "## Watch",
    board.watch.length ? board.watch.map((entry) => `- ${entry.item.title}: ${entry.readiness}% checklist complete; gaps: ${entry.gaps.map((gap) => gap.area).join(", ") || "none"}`).join("\n") : "No watch-list launches.",
    "",
    "## Hold",
    board.noGo.length ? board.noGo.map((entry) => `- ${entry.item.title}: ${entry.readiness}% checklist complete; blockers: ${entry.blockers.map((blocker) => blocker.dependency).join(", ") || entry.gaps.map((gap) => gap.area).join(", ")}`).join("\n") : "No launches are on hold.",
    "",
    "## Next Launch Actions",
    board.candidates.length ? board.candidates.slice(0, 6).map((entry) => `- ${entry.item.title}: ${entry.gaps[0]?.task || entry.blockers[0]?.ask || "Confirm launch owner and comms."}`).join("\n") : "No active launch candidates."
  ].join("\n");
}

export const rolloutReadinessGuidance = "Ready means the launch checklist and saved success measure are complete; Watch means inputs still need review; Hold means checklist completion is below 70% or a dependency is at risk or blocked. Percentages show checklist completion, not verified launch safety or approval. Stage, audience, monitoring and rollback suggestions require confirmation.";

export function buildRolloutPlan(items, now = new Date(), prioritization) {
  const launch = buildLaunchBoard(items, now, prioritization);
  const candidates = launch.candidates
    .filter((entry) => entry.item.status === "committed" || entry.item.status === "shipped")
    .map((entry) => {
      const gaps = [...entry.gaps.map((gap) => gap.task), ...entry.blockers.map((blocker) => blocker.ask || blocker.dependency)];
      const stage = entry.goNoGo === "Hold" ? "Suggested: hold new exposure" : entry.goNoGo === "Ready" ? "Suggested: staged expansion after review" : "Suggested: beta cohort after closing gaps";
      const guardrails = buildRolloutGuardrails(entry.item);
      return {
        item: entry.item,
        owner: entry.item.owner || "Unassigned",
        readiness: entry.readiness,
        stage,
        audience: buildRolloutAudience(entry.item, stage),
        guardrails,
        rollback: buildRollbackTrigger(entry.item),
        gaps,
        status: entry.goNoGo,
        nextStep: gaps[0] || entry.item.nextStep || "Confirm the suggested rollout, monitoring and rollback plan."
      };
    });

  return {
    candidates,
    ready: candidates.filter((candidate) => candidate.status === "Ready"),
    watch: candidates.filter((candidate) => candidate.status === "Watch"),
    hold: candidates.filter((candidate) => candidate.status === "Hold"),
    metrics: {
      candidates: candidates.length,
      ready: candidates.filter((candidate) => candidate.status === "Ready").length,
      watch: candidates.filter((candidate) => candidate.status === "Watch").length,
      hold: candidates.filter((candidate) => candidate.status === "Hold").length
    }
  };
}

export function buildRolloutMemo(items, now = new Date(), prioritization) {
  const plan = buildRolloutPlan(items, now, prioritization);
  return [
    `# Rollout Plan - ${localDateStamp(now)}`,
    "",
    rolloutReadinessGuidance,
    "",
    "## Ready",
    plan.ready.length ? plan.ready.map((entry) => `- ${entry.item.title}: ${entry.stage}; ${entry.audience}; owner ${entry.owner}`).join("\n") : "- No rollout candidates are ready.",
    "",
    "## Watch",
    plan.watch.length ? plan.watch.map((entry) => `- ${entry.item.title}: ${entry.gaps.join("; ")}`).join("\n") : "- No rollout candidates need watch-list handling.",
    "",
    "## Hold",
    plan.hold.length ? plan.hold.map((entry) => `- ${entry.item.title}: ${entry.gaps.join("; ")}`).join("\n") : "- No rollout candidates are on hold.",
    "",
    "## Guardrails",
    plan.candidates.length ? plan.candidates.slice(0, 6).map((entry) => `- ${entry.item.title}: ${entry.guardrails.join("; ")}`).join("\n") : "- No guardrails drafted yet.",
    "",
    "## Rollback Triggers",
    plan.candidates.length ? plan.candidates.slice(0, 6).map((entry) => `- ${entry.item.title}: ${entry.rollback}`).join("\n") : "- No rollback triggers drafted yet."
  ].join("\n");
}

function buildRolloutAudience(item, stage) {
  if (stage === "Suggested: hold new exposure") return "Suggested: no new users until review";
  return item.customer ? `Suggested: confirm a cohort within ${item.customer}` : "Audience not captured; confirm a target cohort";
}

function buildRolloutGuardrails(item) {
  const risk = cleanSentenceFragment(primaryRiskText(item)).toLowerCase();
  return [
    item.primaryMetric ? `Saved metric: ${item.primaryMetric}. Authored target: ${item.metricTarget || "not captured"}.` : "Primary success metric not captured; define a metric and target before rollout.",
    ...(item.experiment ? [`Saved measurement notes: ${item.experiment}`] : []),
    risk ? `Suggested: monitor the captured risk (${risk}); confirm a threshold and owner.` : "Suggested: agree a support-contact threshold and monitoring owner.",
    "Suggested: confirm and rehearse a rollback procedure; execution time has not been verified."
  ];
}

function buildRollbackTrigger(item) {
  const risk = cleanSentenceFragment(primaryRiskText(item)).toLowerCase();
  if (risk) return `Suggested rollback trigger: agree what change in ${risk} should stop exposure, and confirm the response owner.`;
  return item.primaryMetric && item.metricTarget
    ? `Suggested rollback trigger: review ${item.primaryMetric} against the authored target (${item.metricTarget}) and agree a stop threshold and response owner.`
    : "Rollback trigger not captured. Suggested next step: agree a measurable stop threshold and response owner.";
}

function cleanSentenceFragment(value) {
  return String(value || "").trim().replace(/[.!?]+$/, "");
}

export function buildEnablementPlan(items, now = new Date(), prioritization, records = []) {
  const launch = buildLaunchBoard(items, now, prioritization);
  const candidates = launch.candidates.map((entry) => {
    const checks = buildEnablementChecks(entry.item, records);
    const gaps = checks.filter((check) => !check.done);
    const readiness = Math.round((checks.filter((check) => check.done).length / checks.length) * 100);
    return {
      item: entry.item,
      readiness,
      status: readiness === 100 ? "Recorded complete" : readiness ? "In progress" : "Not completed",
      launchDate: entry.launchDate,
      checks,
      gaps,
      owner: entry.item.owner || "Unassigned",
      handoff: buildEnablementHandoff(entry.item, gaps)
    };
  });
  return {
    candidates,
    ready: candidates.filter((candidate) => !candidate.gaps.length),
    needsPolish: candidates.filter((candidate) => candidate.readiness > 0 && candidate.gaps.length),
    blocked: candidates.filter((candidate) => candidate.readiness === 0),
    metrics: {
      candidates: candidates.length,
      ready: candidates.filter((candidate) => !candidate.gaps.length).length,
      gaps: candidates.reduce((sum, candidate) => sum + candidate.gaps.length, 0),
      blocked: candidates.filter((candidate) => candidate.readiness === 0).length
    }
  };
}

export function buildEnablementMemo(items, now = new Date(), prioritization, records = []) {
  const plan = buildEnablementPlan(items, now, prioritization, records);
  return [
    `# Enablement Handoff - ${localDateStamp(now)}`,
    "",
    "## Recorded complete",
    plan.ready.length ? plan.ready.map((entry) => `- ${entry.item.title}: all enablement areas recorded complete for ${entry.launchDate}`).join("\n") : "- No launches have all enablement areas recorded complete.",
    "",
    "## Needs Work",
    plan.candidates.filter((entry) => entry.gaps.length).length ? plan.candidates.filter((entry) => entry.gaps.length).map((entry) => `- ${entry.item.title}: ${entry.gaps.map((gap) => gap.area).join(", ")}`).join("\n") : "- No enablement gaps detected.",
    "",
    "## Team Handoffs",
    plan.candidates.length ? plan.candidates.slice(0, 8).map((entry) => `- ${entry.item.title}: ${entry.handoff}`).join("\n") : "- No active launch candidates."
  ].join("\n");
}

function buildEnablementChecks(item, records) {
  const tasks = {
    Docs: item.decision ? `Document customer value and launch decision: ${item.decision}` : "Draft customer-facing docs and the launch decision.",
    Support: activeRisks(item).length ? `Prepare support response for: ${primaryRiskText(item)}` : `Prepare support guidance: ${item.nextStep || "capture the support handoff."}`,
    Sales: item.customer ? `Prepare the value message for ${item.customer}.` : "Name the customer segment and prepare the value message.",
    Training: item.owner ? `Schedule and complete the enablement review with ${item.owner}.` : "Assign an owner and complete the enablement review.",
    Analytics: item.experiment ? `Verify tracking for ${item.experiment}.` : "Define and verify adoption, activation, or success tracking.",
    Comms: "Prepare and deliver the customer-facing team update."
  };
  return ENABLEMENT_AREAS.map((area) => {
    const actions = records.filter((record) => record.type === "action" && record.initiativeId === item.id && record.enablementArea === area);
    const done = actions.length > 0 && actions.every((record) => record.status === "done" && (record.owner?.trim() || record.ownerPersonId) && record.completionEvidence?.trim());
    return { area, done, task: tasks[area], actions };
  });
}

function buildEnablementHandoff(item, gaps) {
  if (gaps.length) return `${gaps[0].task} Owner: ${item.owner || "Unassigned"}.`;
  return `${item.title}: all six enablement areas have saved completion evidence. Review that evidence before rollout.`;
}

function uniqueIds(value) {
  return [...new Set((Array.isArray(value) ? value : []).map((entry) => String(entry || "").trim()).filter(Boolean))];
}

function capturedAudienceFor(item) {
  const explicit = uniqueIds(item?.audienceSegments);
  return explicit.length ? explicit : uniqueIds([item?.customer]);
}

function audienceFor(item) {
  const captured = capturedAudienceFor(item);
  return captured.length ? captured : ["Unspecified segment"];
}

export function buildRetrospective(items, activity = [], now = new Date(), prioritization, options = {}) {
  const review = buildReviewLoop(items, now, prioritization, options);
  const launch = buildLaunchBoard(items, now, prioritization);
  const followUps = buildFollowUps(items, prioritization);
  const recentActivity = activity.map(normalizeActivityEntry).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
  const followUpCandidates = [
    ...launch.noGo.slice(0, 4).map((entry) => ({ itemId: entry.item.id, title: entry.item.title, action: entry.gaps[0]?.task || entry.blockers[0]?.ask || "Resolve launch blocker.", targets: [
      ...(entry.gaps[0]?.actions || []),
      ...entry.blockers.map((blocker) => ({ section: "dependencies", recordId: blocker.record.id, label: `Review dependency: ${blocker.record.description}` }))
    ] })),
    ...followUps.slice(0, 6).map((item) => ({ itemId: item.id, title: item.title, action: item.nextStep || primaryRiskText(item) || "Add an owner and next step.", targets: [
      { field: "nextStep", label: item.nextStep ? "Update next step" : "Add next step" },
      ...(!item.owner.trim() ? [{ field: "owner", label: "Assign owner" }] : []),
      ...activeRisks(item).map((record) => ({ section: "risks", recordId: record.id, label: `Review risk: ${record.description}` }))
    ] }))
  ];
  const groupedFollowUps = new Map();
  for (const entry of followUpCandidates) {
    const existing = groupedFollowUps.get(entry.itemId);
    if (existing) existing.targets.push(...entry.targets);
    else groupedFollowUps.set(entry.itemId, { ...entry, targets: [...entry.targets] });
  }
  const followUpActions = [...groupedFollowUps.values()].slice(0, 6).map((entry) => ({ ...entry,
    targets: entry.targets.filter((target, index, all) => all.findIndex((candidate) => candidate.field === target.field && candidate.section === target.section && candidate.recordId === target.recordId) === index)
  }));

  return {
    generatedAt: now.toISOString(),
    wins: review.shipped.slice(0, 5).map(item => {
      const entries = review.learningEvidence.filter(entry => entry.itemId === item.id);
      return { itemId: item.id, title: item.title, evidence: entries.length ? entries.map(entry => `${entry.title}: ${entry.evidence}`).join(" | ") : "Capture customer or business outcome evidence.",
        origin: entries.length ? "captured" : "suggested", sourceIds: entries.length ? entries.flatMap(entry => entry.sourceIds) : [item.id] };
    }),
    learnings: [...review.learningEvidence.map(entry => ({ ...entry, prompt: entry.evidence })), ...review.learningPrompts].slice(0, 5),
    learningEvidence: review.learningEvidence, learningPrompts: review.learningPrompts, decisionHistory: review.decisionHistory,
    misses: review.overdue.slice(0, 5).map((item) => ({ itemId: item.id, title: item.title, recovery: item.nextStep || primaryRiskText(item) || "Reset scope, date, or owner." })),
    followUps: followUpActions,
    activity: recentActivity,
    metrics: {
      wins: review.metrics.shipped,
      learnings: review.learningEvidence.length + review.learningPrompts.length,
      learningEvidence: review.learningEvidence.length, learningPrompts: review.learningPrompts.length,
      misses: review.metrics.overdue,
      followUps: followUpActions.length,
      activity: recentActivity.length
    }
  };
}

export function buildRetrospectiveMemo(items, activity = [], now = new Date(), prioritization, options = {}) {
  const retro = buildRetrospective(items, activity, now, prioritization, options);
  return [
    `# Retrospective - ${localDateStamp(now)}`,
    "",
    "## Wins",
    ...(retro.metrics.wins > retro.wins.length ? [`Showing ${retro.wins.length} of ${retro.metrics.wins} shipped initiatives.`] : []),
    retro.wins.length ? retro.wins.map((entry) => `- ${entry.title}: ${synthesisEvidenceLabel(entry)}`).join("\n") : "- No shipped wins captured yet.",
    "",
    "## Learnings",
    retro.learningEvidence.length ? retro.learningEvidence.map((entry) => `- ${entry.title} (${entry.initiativeTitle}): ${synthesisEvidenceLabel(entry)}`).join("\n") : "- No learning candidates captured yet.",
    "",
    "## Prospective Learning Prompts",
    retro.learningPrompts.length ? retro.learningPrompts.map(entry => `- ${entry.title}: ${entry.prompt}; suggested; sources: ${entry.sourceIds.join(", ")}`).join("\n") : "- No prospective learning prompts.",
    "",
    "## Misses",
    ...(retro.metrics.misses > retro.misses.length ? [`Showing ${retro.misses.length} of ${retro.metrics.misses} overdue initiatives.`] : []),
    retro.misses.length ? retro.misses.map((entry) => `- ${entry.title}: ${entry.recovery}`).join("\n") : "- No slipped commitments detected.",
    "",
    "## Follow-Up Actions",
    retro.followUps.length ? retro.followUps.map((entry) => `- ${entry.title}: ${entry.action}`).join("\n") : "- No follow-up actions generated.",
    "",
    "## Recent Activity",
    retro.activity.length ? retro.activity.map((entry) => `- ${entry.action} ${entry.itemTitle} by ${entry.actor}`).join("\n") : "- No activity captured yet."
  ].join("\n");
}
