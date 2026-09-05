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

export { calculateRiceScore, evaluatePriority };

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
export function calculateHealth(items, now = new Date()) {
  const active = items.filter((item) => item.status !== "shipped" && item.status !== "parked");
  const stale = active.filter((item) => daysSince(item.updatedAt, now) > 14);
  const unowned = active.filter((item) => !item.owner.trim());
  const noNextStep = active.filter((item) => !item.nextStep.trim());
  const risks = stale.length + unowned.length + noNextStep.length;
  return {
    score: Math.max(0, Math.round(100 - risks * 8 - Math.max(0, active.length - 12) * 3)),
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
    .filter((item) => !item.nextStep.trim() || daysSince(item.updatedAt) > 7 || activeRisks(item).length)
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
    const overdueDays = validDate(item.dueDate) ? daysBetween(new Date(item.dueDate), now) : 0;
    if (item.dueDate && overdueDays > 0) itemActions.push(createActionQueueEntry("Overdue", item, `Reset date, scope, or owner after ${overdueDays} days overdue.`, 95 + overdueDays, options));
    const risk = primaryRisk(item);
    if (risk) itemActions.push(createActionQueueEntry("Blocker", item, `Resolve or explicitly accept: ${risk.description}`, 90, options, risk));
    if (!item.owner) itemActions.push(createActionQueueEntry("Owner", item, "Assign a directly accountable owner.", 82, options));
    if (!item.nextStep) itemActions.push(createActionQueueEntry("Next Step", item, "Write the next concrete action.", 78, options));
    if ((item.status === "committed" || item.status === "discovery") && !item.decision) itemActions.push(createActionQueueEntry("Decision", item, "Record the commit, kill, continue, or learn decision.", 74, options));
    if ((item.status === "committed" || item.status === "discovery") && !item.experiment && !item.decision) itemActions.push(createActionQueueEntry("Metric", item, "Add an experiment, target metric, or success signal.", 68, options));
    if (daysSince(item.updatedAt, now) > 14) itemActions.push(createActionQueueEntry("Stale", item, "Refresh status, owner, date, or next step.", 60, options));
    return itemActions;
  }).filter(Boolean);

  const queue = actions.sort((a, b) => b.priority - a.priority || (influence.get(b.item.id) || 0) - (influence.get(a.item.id) || 0)).slice(0, 12);
  return {
    queue,
    overdue: queue.filter((entry) => entry.type === "Overdue"),
    blockers: queue.filter((entry) => entry.type === "Blocker"),
    decisions: queue.filter((entry) => entry.type === "Decision"),
    metrics: {
      total: queue.length,
      overdue: queue.filter((entry) => entry.type === "Overdue").length,
      blockers: queue.filter((entry) => entry.type === "Blocker").length,
      decisions: queue.filter((entry) => entry.type === "Decision").length
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
    return !value || (validDate(value) && daysBetween(new Date(value), now) <= 0);
  }
  if (condition.kind === "risk-inactive") {
    const risk = item.risks.find((record) => record.id === entry.target.recordId);
    return !risk || !activeRiskStatuses.has(risk.status);
  }
  if (condition.kind === "fresh-update") return daysSince(item.updatedAt, now) <= Number(condition.days || 14);
  return false;
}

export function buildActionMemo(items, now = new Date(), prioritization) {
  const actions = buildActionQueue(items, now, prioritization);
  return [
    `# Action Queue - ${now.toISOString().slice(0, 10)}`,
    "",
    "## Top Actions",
    actions.queue.length ? actions.queue.map((entry) => `- [${entry.type}] ${entry.title}: ${entry.action}`).join("\n") : "- No urgent actions detected.",
    "",
    "## Overdue",
    actions.overdue.length ? actions.overdue.map((entry) => `- ${entry.title}: ${entry.dueDate}`).join("\n") : "- No overdue actions.",
    "",
    "## Blockers",
    actions.blockers.length ? actions.blockers.map((entry) => `- ${entry.title}: ${entry.action}`).join("\n") : "- No blockers in the action queue.",
    "",
    "## Decisions",
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
  if (item.configuredPriorityLabel) normalized.configuredPriorityLabel = String(item.configuredPriorityLabel);
  // Transitional, non-canonical compatibility for domain projections that still
  // consume one primary risk string. JSON and workspace allowlists omit it.
  Object.defineProperty(normalized, "risk", { enumerable: false, get: () => primaryRiskText(normalized) });
  if (new TextEncoder().encode(JSON.stringify(normalized)).length > 32768) throw new Error("Initiative exceeds the 32 KiB payload limit.");
  return normalized;
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

export function exportWorkspace(items, activity = []) {
  return JSON.stringify({ schema: "pm-os.workspace.v7", exportedAt: new Date().toISOString(), items: items.map(normalizeItem), activity: activity.map(normalizeActivityEntry) }, null, 2);
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

export function buildActivityDigest(activity, now = new Date()) {
  const normalized = activity.map(normalizeActivityEntry).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recent = normalized.slice(0, 12);
  return [
    `# Activity Digest - ${now.toISOString().slice(0, 10)}`,
    "",
    recent.length ? recent.map((entry) => `- ${entry.createdAt.slice(0, 10)} ${entry.actor} ${entry.action} ${entry.itemTitle}: ${describeActivityChanges(entry.changes)}`).join("\n") : "No activity recorded yet."
  ].join("\n");
}

export function describeActivityChanges(changes) {
  const entries = Object.entries(changes || {});
  if (!entries.length) return "No field changes captured.";
  return entries.map(([field, value]) => {
    const label = activityFieldLabel(field);
    if (value && typeof value === "object" && "from" in value && "to" in value) return `${label}: ${describeActivityValue(value.from)} -> ${describeActivityValue(value.to)}`;
    return `${label}: ${describeActivityValue(value)}`;
  }).join("; ");
}

function activityFieldLabel(field) {
  return String(field).replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ");
}

function describeActivityValue(value) {
  if (value === null || value === undefined || value === "") return "empty";
  if (Array.isArray(value)) return value.length ? value.map(describeActivityValue).join(", ") : "empty";
  if (typeof value === "object") {
    const entries = Object.entries(value);
    return entries.length ? entries.map(([key, nested]) => `${activityFieldLabel(key)}: ${describeActivityValue(nested)}`).join(", ") : "empty";
  }
  return String(value);
}

export function daysSince(dateValue, now = new Date()) {
  if (!validDate(dateValue)) return 0;
  return Math.floor((now.getTime() - new Date(dateValue).getTime()) / 86400000);
}

function daysBetween(start, end) {
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
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
    { area: "Customer", task: "Confirm target segment and launch audience.", done: Boolean(normalized.customer) },
    { area: "Problem", task: "Validate problem statement and success metric.", done: Boolean(normalized.problem) },
    { area: "Owner", task: "Assign accountable PM/DRI.", done: Boolean(normalized.owner) },
    { area: "Delivery", task: "Confirm due date or release window.", done: Boolean(normalized.dueDate) },
    { area: "Decision", task: "Record launch decision and tradeoffs.", done: Boolean(normalized.decision) },
    { area: "Experiment", task: "Define measurement or rollout experiment.", done: Boolean(normalized.experiment) },
    { area: "Risk", task: "Resolve or explicitly accept captured risks.", done: activeRisks(normalized).length === 0 },
    { area: "Follow-up", task: "Write the next operational step.", done: Boolean(normalized.nextStep) }
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
  const fields = ["id", "title", "customer", "customerIds", "segmentIds", "problem", "owner", "pocPersonId", "orgUnitId", "status", "statusId", "reach", "impact", "confidence", "effort", "startDate", "dueDate", "nextStep", "risks", "dependencies", "experiment", "decision", "priority", "priorityLevelId", "priorityInputs", "updatedAt"];
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

export function importGitHubIssueMarkdown(text) {
  return String(text || "")
    .split(/\n\s*---\s*\n/g)
    .map((issueText) => issueText.trim())
    .filter(Boolean)
    .map(parseGitHubIssueMarkdown);
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
      `## Success Metric
Define the measurable customer or business outcome.`,
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
      `## Rollout
${primary?.experiment || "Define rollout and measurement plan."}`,
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
    `# Escalation Review - ${now.toISOString().slice(0, 10)}`,
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

export function buildStakeholderGovernance(items, now = new Date(), prioritization) {
  const active = prioritizeItems(items.map(normalizeItem), prioritization).filter((item) => item.status !== "shipped" && item.status !== "parked");
  const map = buildStakeholderMap(active);
  const comms = buildCommunicationPlan(active, now, prioritization);
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
    ...actions.queue.slice(0, 5).map((entry) => ({ itemId: entry.item.id, target: entry.target, audience: entry.owner, title: entry.title, ask: entry.action, urgency: entry.priority })),
    ...comms.audiences.map((entry) => ({ audience: entry.audience, title: entry.focus, ask: entry.ask, urgency: 50 }))
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

export function buildStakeholderMemo(items, now = new Date(), prioritization) {
  const governance = buildStakeholderGovernance(items, now, prioritization);
  return [
    `# Stakeholder Governance - ${now.toISOString().slice(0, 10)}`,
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

export function buildOutcomeReport(items, prioritization) {
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
    topThemes: buildCustomerThemes(normalized).slice(0, 5)
  };
}

export function buildExecutiveBrief(items, now = new Date(), prioritization) {
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
    priorityLabel: methodLabel(prioritization)
  }));
  const launch = buildLaunchBoard(normalized, now, prioritization);
  const rolloutPlan = buildRolloutPlan(normalized, now, prioritization);
  const allRisks = buildBriefRisks(active, launch, rolloutPlan, now, prioritization);
  const risks = allRisks.slice(0, 5);
  const decisions = active
    .filter((item) => (item.status === "committed" || item.experiment) && !item.decision)
    .slice(0, 5)
    .map((item) => ({
      itemId: item.id,
      title: item.title,
      status: "Decision required",
      context: primaryRiskText(item) || item.experiment || item.problem || "Active work needs an explicit direction.",
      ask: item.status === "committed"
        ? `Approve, revise, or stop ${item.title}.`
        : `Decide whether the evidence supports committing, continuing discovery, or stopping ${item.title}.`,
      owner: item.owner || "Unassigned",
      dueDate: item.dueDate || "No date"
    }));
  const rollouts = buildBriefRollouts(rolloutPlan);
  const metricGaps = buildMetricsPlan(normalized, now, prioritization).gaps.filter((entry) => activeIds.has(entry.item.id)).slice(0, 5).map((entry) => ({
    itemId: entry.item.id,
    title: entry.item.title,
    status: "Needs tracking",
    gap: entry.gaps[0],
    instrumentation: entry.instrumentation,
    owner: entry.item.owner || "Unassigned",
    reviewDate: entry.reviewDate
  }));
  const themes = buildBriefThemes(normalized).slice(0, 5);
  const asks = [
    ...risks.map((risk) => ({ type: "Risk", title: risk.title, action: risk.action, owner: risk.owner, dueDate: risk.dueDate, itemId: risk.itemId })),
    ...decisions.map((decision) => ({ type: "Decision", title: decision.title, action: decision.ask, owner: decision.owner, dueDate: decision.dueDate, itemId: decision.itemId })),
    ...metricGaps.map((gap) => ({ type: "Metric", title: gap.title, action: gap.instrumentation, owner: gap.owner, dueDate: gap.reviewDate, itemId: gap.itemId }))
  ].slice(0, 6);
  const health = calculateHealth(active, now);
  const headline = active.length
    ? `${active.length} active initiative${active.length === 1 ? "" : "s"}; ${allRisks.length} risk${allRisks.length === 1 ? "" : "s"} and ${decisions.length} pending decision${decisions.length === 1 ? "" : "s"}.`
    : "No active initiatives in the workspace.";

  return { generatedAt: now.toISOString(), headline, health, priorities, risks, decisions, rollouts, metricGaps, themes, asks };
}

export function buildExecutiveBriefMemo(items, now = new Date(), prioritization) {
  const brief = buildExecutiveBrief(items, now, prioritization);
  const rolloutCount = brief.rollouts.hold.length + brief.rollouts.watch.length + brief.rollouts.ready.length;
  return [
    `# Executive Brief - ${brief.generatedAt.slice(0, 10)}`,
    "",
    "## Portfolio Summary",
    `- ${executiveBriefLabels.generated}: ${brief.generatedAt.slice(0, 10)}`,
    `- ${executiveBriefLabels.headline}: ${brief.headline}`,
    `- ${executiveBriefLabels.operationsHealth}: ${brief.health.score}/100`,
    `- ${executiveBriefLabels.activeInitiatives}: ${brief.health.active}`,
    "",
    "## Key Priorities",
    brief.priorities.length ? brief.priorities.map((entry) => `- #${entry.rank} | ${entry.status} | ${entry.title}; ${executiveBriefLabels.nextAction}: ${entry.nextStep}; ${executiveBriefLabels.owner}: ${entry.owner}; ${executiveBriefLabels.dueDate}: ${entry.dueDate}; ${entry.priorityLabel || executiveBriefLabels.priority}: ${entry.score ?? "Needs scoring"}`).join("\n") : "- No active priorities. Shipped and parked initiatives are excluded.",
    "",
    "## Risks",
    brief.risks.length ? brief.risks.map((entry) => `- ${executiveBriefLabels.severity}: ${entry.status} | ${entry.severity}/100; ${executiveBriefLabels.sources}: ${entry.sources.join(", ")}; ${entry.title}; ${executiveBriefLabels.risk}: ${entry.risk}; ${executiveBriefLabels.leadershipAction}: ${entry.action}; ${executiveBriefLabels.owner}: ${entry.owner}; ${executiveBriefLabels.dueDate}: ${entry.dueDate}`).join("\n") : "- No active risks or rollout blockers detected.",
    "",
    "## Rollout Status",
    rolloutCount ? formatBriefRollouts(brief.rollouts) : "- No initiatives currently need rollout review.",
    "",
    "## Decisions Needed",
    brief.decisions.length ? brief.decisions.map((entry) => `- Decision required; ${entry.title}; ${executiveBriefLabels.context}: ${entry.context}; ${executiveBriefLabels.decisionAsk}: ${entry.ask}; ${executiveBriefLabels.owner}: ${entry.owner}; ${executiveBriefLabels.dueDate}: ${entry.dueDate}`).join("\n") : "- No pending decisions for active work.",
    "",
    "## Measurement Gaps",
    brief.metricGaps.length ? brief.metricGaps.map((entry) => `- Needs tracking | ${executiveBriefLabels.reviewDate}: ${entry.reviewDate}; ${entry.title}; ${executiveBriefLabels.firstGap}: ${entry.gap}; ${executiveBriefLabels.instrumentationAction}: ${entry.instrumentation}; ${executiveBriefLabels.owner}: ${entry.owner}`).join("\n") : "- No measurement gaps detected.",
    "",
    "## Customer Themes",
    brief.themes.length ? brief.themes.map((entry, index) => `- #${index + 1} | ${entry.count} signals | ${entry.theme}; ${executiveBriefLabels.supportingInitiatives}: ${entry.initiatives.join(", ")}; ${executiveBriefLabels.supportingSegments}: ${entry.segments.join(", ") || "Unspecified segment"}`).join("\n") : "- No repeated customer themes yet.",
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

function buildBriefThemes(items) {
  const stopWords = new Set(["the", "and", "for", "with", "need", "needs", "from", "into", "over", "before", "after", "this", "that", "teams", "users"]);
  const themes = new Map();
  items.forEach((item) => {
    const words = new Set(`${audienceFor(item).join(" ")} ${item.problem}`.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((word) => word.length > 3 && !stopWords.has(word)));
    words.forEach((theme) => {
      const current = themes.get(theme) || [];
      current.push({ itemId: item.id, title: item.title, segment: audienceFor(item)[0] });
      themes.set(theme, current);
    });
  });
  return [...themes.entries()].filter(([, sources]) => sources.length >= 2).map(([theme, sources]) => {
    const initiatives = sources.map((source) => source.title);
    const segments = [...new Set(sources.map((source) => source.segment).filter((segment) => segment !== "Unspecified segment"))].sort();
    return { theme, count: sources.length, initiatives, segments, supportingInitiatives: initiatives, supportingSegments: segments, sources };
  }).sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme));
}

export function buildReleaseNotes(items, now = new Date(), prioritization) {
  const shipped = prioritizeItems(items, prioritization).filter((item) => item.status === "shipped");
  const committed = prioritizeItems(items, prioritization).filter((item) => item.status === "committed");
  const risks = buildRiskRegister(items, prioritization).slice(0, 3);
  return [
    `# Release Notes - ${now.toISOString().slice(0, 10)}`,
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

export function buildCustomerThemes(items) {
  const stopWords = new Set(["the", "and", "for", "with", "need", "needs", "from", "into", "over", "before", "after", "this", "that", "teams", "users"]);
  const counts = new Map();
  items.forEach((item) => {
    `${audienceFor(item).join(" ")} ${item.problem}`
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word))
      .forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  });
  return [...counts.entries()]
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme));
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
    experiments: candidates.filter((item) => item.experiment || item.confidence < 0.7).slice(0, 5).map((item) => ({
      title: item.title,
      experiment: item.experiment || "Design a lightweight validation experiment.",
      decision: item.decision || "Decision pending."
    }))
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
  const candidates = prioritizeItems(items.map(normalizeItem), prioritization).filter((item) => item.status === "intake" || item.status === "discovery" || item.status === "committed");
  const influence = priorityInfluence(candidates, prioritization);
  const experiments = candidates.filter((item) => item.experiment).map((item) => validationEntry(item, "Experiment", item.experiment, validationPriority(item, now, influence.get(item.id) || 0), prioritization));
  const evidenceGaps = candidates
    .filter((item) => !item.experiment && !item.decision)
    .map((item) => validationEntry(item, "Evidence Gap", suggestValidationTest(item), validationPriority(item, now, influence.get(item.id) || 0) + 10, prioritization));
  const decisionReady = candidates
    .filter((item) => item.experiment && !item.decision && item.confidence >= 0.7)
    .map((item) => validationEntry(item, "Decision Ready", "Record the continue, commit, kill, or learn decision.", validationPriority(item, now, influence.get(item.id) || 0) + 5, prioritization));
  const lowConfidence = candidates
    .filter((item) => item.confidence < 0.7)
    .map((item) => validationEntry(item, "Low Confidence", suggestValidationTest(item), validationPriority(item, now, influence.get(item.id) || 0), prioritization));

  return {
    experiments: experiments.slice(0, 8),
    evidenceGaps: evidenceGaps.slice(0, 8),
    decisionReady: decisionReady.slice(0, 8),
    lowConfidence: lowConfidence.slice(0, 8),
    metrics: {
      experiments: experiments.length,
      evidenceGaps: evidenceGaps.length,
      decisionReady: decisionReady.length,
      lowConfidence: lowConfidence.length
    }
  };
}

export function buildValidationMemo(items, now = new Date(), prioritization) {
  const board = buildValidationBoard(items, now, prioritization);
  return [
    `# Validation Review - ${now.toISOString().slice(0, 10)}`,
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
    `# Research Plan - ${now.toISOString().slice(0, 10)}`,
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
  const ageBoost = Math.min(20, daysSince(item.updatedAt, now));
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
  const stale = active.filter((item) => daysSince(item.updatedAt, now) > 14);
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
    score: Math.max(0, 100 - stale.length * 8 - missingOwner.length * 8 - missingProblem.length * 6 - missingNextStep.length * 6 - overloadedOwners.length * 5)
  };
}

export function buildWeeklyPlan(items, prioritization) {
  const prioritized = prioritizeItems(items, prioritization);
  const hygiene = buildBacklogHygiene(items, new Date(), prioritization);
  const risks = buildRiskRegister(items, prioritization);
  const focus = prioritized.filter((item) => item.status === "committed").slice(0, 3);
  const discover = prioritized.filter((item) => item.status === "discovery" || item.status === "intake").slice(0, 3);
  const decide = prioritized.filter((item) => !item.decision && (item.status === "committed" || item.status === "discovery")).slice(0, 3);
  const unblock = [...risks.map((risk) => risk.item), ...hygiene.missingNextStep].filter(uniqueById).slice(0, 5);

  return {
    focus,
    discover,
    decide,
    unblock,
    actions: [
      ...hygiene.missingOwner.slice(0, 2).map((item) => `Assign owner for ${item.title}`),
      ...hygiene.missingProblem.slice(0, 2).map((item) => `Clarify problem for ${item.title}`),
      ...hygiene.parkingCandidates.slice(0, 2).map((item) => `Consider parking ${item.title}`)
    ].slice(0, 6)
  };
}

export function buildQuarterlyPlan(items, now = new Date(), capacity = CAPACITY_BENCHMARKS.period, prioritization) {
  const normalized = items.map(normalizeItem);
  const release = buildReleasePlan(normalized, prioritization);
  const portfolio = buildPortfolioDashboard(normalized, now, capacity, prioritization);
  const alignment = buildOutcomeAlignment(normalized, prioritization);
  const actions = buildActionQueue(normalized, now, prioritization);
  const candidates = prioritizeItems(normalized, prioritization).filter((item) => item.status !== "shipped" && item.status !== "parked");
  const selected = [];
  let used = 0;
  candidates.forEach((item) => {
    if (used + item.effort <= capacity) {
      selected.push(item);
      used += item.effort;
    }
  });
  const deferred = candidates.filter((item) => !selected.some((selectedItem) => selectedItem.id === item.id));
  const bets = alignment.coverage.slice(0, 4).map((entry) => ({
    objective: entry.objective,
    initiatives: selected.filter((item) => inferObjective(item) === entry.objective).slice(0, 4),
    keyResult: suggestKeyResult(entry)
  }));

  return {
    generatedAt: now.toISOString(),
    capacity,
    used,
    remaining: Math.max(0, capacity - used),
    bets,
    now: release.now,
    next: release.next,
    selected,
    deferred: deferred.slice(0, 8),
    risks: portfolio.watchlist.slice(0, 6),
    actions: actions.queue.slice(0, 6),
    metrics: {
      selected: selected.length,
      deferred: deferred.length,
      capacity,
      used,
      utilization: capacity ? Math.round((used / capacity) * 100) : 0,
      objectives: bets.length
    }
  };
}

export function buildQuarterlyPlanMemo(items, now = new Date(), capacity = CAPACITY_BENCHMARKS.period, prioritization) {
  const plan = buildQuarterlyPlan(items, now, capacity, prioritization);
  return [
    `# Quarterly Plan - ${now.toISOString().slice(0, 10)}`,
    "",
    "## Capacity",
    `- Selected effort: ${plan.used} / ${plan.capacity}`,
    `- Remaining: ${plan.remaining}`,
    "",
    "## Strategic Bets",
    plan.bets.length ? plan.bets.map((bet) => `- ${bet.objective}: ${bet.keyResult}`).join("\n") : "- No strategic bets drafted.",
    "",
    "## Selected Work",
    plan.selected.length ? plan.selected.map((item) => `- ${item.title} (${statusLabels[item.status]}, effort ${item.effort})`).join("\n") : "- No work selected.",
    "",
    "## Deferred Work",
    plan.deferred.length ? plan.deferred.map((item) => `- ${item.title}: outside current capacity`).join("\n") : "- No deferred work.",
    "",
    "## Risks And Follow-Ups",
    plan.risks.length ? plan.risks.map((entry) => `- ${entry.title}: ${entry.action}`).join("\n") : "- No planning risks detected."
  ].join("\n");
}

export function buildPeriodPlan(items, selection = { kind: "all" }, calendar = emptyPlanningCalendar(), now = new Date(), capacity = CAPACITY_BENCHMARKS.period, prioritization) {
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

export function buildPeriodPlanMemo(items, selection = { kind: "all" }, calendar = emptyPlanningCalendar(), now = new Date(), capacity = CAPACITY_BENCHMARKS.period, prioritization) {
  const plan = buildPeriodPlan(items, selection, calendar, now, capacity, prioritization);
  return [
    `# ${plan.scope.label} Plan - ${now.toISOString().slice(0, 10)}`,
    "",
    `Scope: ${plan.scope.label} | ${plan.scope.rangeLabel} | ${plan.scope.itemCount} initiatives`,
    "",
    "## Capacity",
    `- Selected effort: ${plan.used} / ${plan.capacity}`,
    `- Remaining: ${plan.remaining}`,
    "",
    "## Strategic Bets",
    plan.bets.length ? plan.bets.map((bet) => `- ${bet.objective}: ${bet.keyResult}`).join("\n") : "- No strategic bets drafted.",
    "",
    "## Selected Work",
    plan.selected.length ? plan.selected.map((item) => `- ${item.title} (${statusLabels[item.status]}, effort ${item.effort})`).join("\n") : "- No work selected.",
    "",
    "## Deferred Work",
    plan.deferred.length ? plan.deferred.map((item) => `- ${item.title}: outside current capacity`).join("\n") : "- No deferred work.",
    "",
    "## Risks And Follow-Ups",
    plan.risks.length ? plan.risks.map((entry) => `- ${entry.title}: ${entry.action}`).join("\n") : "- No planning risks detected."
  ].join("\n");
}

function uniqueById(item, index, items) {
  return items.findIndex((candidate) => candidate.id === item.id) === index;
}

export function buildFeedbackInbox(items, prioritization) {
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
    themes: buildCustomerThemes(items).slice(0, 8),
    segments: buildInterviewTargets(items).slice(0, 6)
  };
}

export function buildFeedbackDigest(items, now = new Date(), prioritization) {
  const inbox = buildFeedbackInbox(items, prioritization);
  return [
    `# Feedback Digest - ${now.toISOString().slice(0, 10)}`,
    "",
    "## Top Themes",
    inbox.themes.length ? inbox.themes.map((theme) => `- ${theme.theme}: ${theme.count}`).join("\n") : "No themes captured yet.",
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
    `# Support Ops Review - ${now.toISOString().slice(0, 10)}`,
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
  const stale = daysSince(item.updatedAt, now) > 14 ? 10 : 0;
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

export function buildCapacityPlan(items, capacity = CAPACITY_BENCHMARKS.active, prioritization) {
  const active = prioritizeItems(items, prioritization).filter((item) => item.status === "committed" || item.status === "discovery");
  const committed = active.filter((item) => item.status === "committed");
  const discovery = active.filter((item) => item.status === "discovery");
  const committedEffort = sumEffort(committed);
  const discoveryEffort = sumEffort(discovery);
  const totalEffort = committedEffort + discoveryEffort;
  const overage = Math.max(0, totalEffort - capacity);
  const suggestedCuts = [...active].reverse().slice(0, overage ? 5 : 0);

  return {
    capacity,
    committedEffort,
    discoveryEffort,
    totalEffort,
    remaining: Math.max(0, capacity - totalEffort),
    overage,
    utilization: capacity ? Math.round((totalEffort / capacity) * 100) : 0,
    suggestedCuts,
    scenario: buildCapacityScenario(items, capacity, prioritization)
  };
}

export function buildCapacityScenario(items, capacity = CAPACITY_BENCHMARKS.active, prioritization) {
  const selected = [];
  let used = 0;
  prioritizeItems(items, prioritization)
    .filter((item) => item.status !== "shipped" && item.status !== "parked")
    .forEach((item) => {
      if (used + item.effort <= capacity) {
        selected.push(item);
        used += item.effort;
      }
    });
  return {
    selected,
    deferred: prioritizeItems(items, prioritization).filter((item) => item.status !== "shipped" && item.status !== "parked" && !selected.some((selectedItem) => selectedItem.id === item.id)),
    used,
    remaining: Math.max(0, capacity - used)
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
  const normalized = prioritizeItems(items, prioritization).map((item) => ({ ...item, objective: inferObjective(item) }));
  const active = normalized.filter((item) => item.status !== "shipped" && item.status !== "parked");
  const coverage = objectiveRules.map((rule) => {
    const objectiveItems = active.filter((item) => item.objective === rule.name);
    return {
      objective: rule.name,
      count: objectiveItems.length,
      effort: sumEffort(objectiveItems),
      topItems: objectiveItems.slice(0, 3)
    };
  }).filter((entry) => entry.count > 0);
  const missingMetrics = active.filter((item) => !item.experiment.trim() && !item.decision.trim()).slice(0, 8);
  const atRiskObjectives = coverage.filter((entry) => entry.topItems.some((item) => activeRisks(item).length));

  return {
    coverage,
    missingMetrics,
    atRiskObjectives,
    keyResults: coverage.slice(0, 5).map((entry) => ({
      objective: entry.objective,
      result: suggestKeyResult(entry),
      confidence: averageConfidence(entry.topItems)
    }))
  };
}

export function buildOutcomeMemo(items, now = new Date(), prioritization) {
  const alignment = buildOutcomeAlignment(items, prioritization);
  return [
    `# Outcome Review - ${now.toISOString().slice(0, 10)}`,
    "",
    "## Objective Coverage",
    alignment.coverage.length ? alignment.coverage.map((entry) => `- ${entry.objective}: ${entry.count} active initiatives, ${entry.effort} effort`).join("\n") : "No active objectives yet.",
    "",
    "## Suggested Key Results",
    alignment.keyResults.length ? alignment.keyResults.map((kr) => `- ${kr.objective}: ${kr.result}`).join("\n") : "No key results suggested yet.",
    "",
    "## Metric Gaps",
    alignment.missingMetrics.length ? alignment.missingMetrics.map((item) => `- ${item.title}: add a success metric or decision record`).join("\n") : "Every active initiative has a metric or decision note.",
    "",
    "## Objective Risks",
    alignment.atRiskObjectives.length ? alignment.atRiskObjectives.map((entry) => `- ${entry.objective}: ${entry.topItems.filter((item) => activeRisks(item).length).map((item) => item.title).join(", ")}`).join("\n") : "No objective-level risks captured."
  ].join("\n");
}

export function buildMetricsPlan(items, now = new Date(), prioritization) {
  const active = prioritizeItems(items.map(normalizeItem), prioritization).filter((item) => item.status !== "parked");
  const plans = active.map((item) => {
    const objective = inferObjective(item);
    const primaryMetric = suggestPrimaryMetric(item, objective);
    const leadingIndicator = suggestLeadingIndicator(item, objective);
    const hasTarget = Boolean(item.experiment || item.decision);
    const hasOwner = Boolean(item.owner);
    const hasDate = Boolean(item.dueDate);
    const hasEvidence = Boolean(item.problem || item.customer);
    const gaps = [
      hasTarget ? "" : "Add a target metric, experiment, or decision threshold.",
      hasOwner ? "" : "Assign an owner for metric follow-up.",
      hasDate ? "" : "Set a review date for the measurement readout.",
      hasEvidence ? "" : "Capture customer evidence behind the metric."
    ].filter(Boolean);
    return {
      item,
      objective,
      primaryMetric,
      leadingIndicator,
      instrumentation: suggestInstrumentation(item, objective),
      status: gaps.length ? "Needs tracking" : "Tracked",
      gaps,
      reviewDate: item.dueDate || addDays(now, item.status === "shipped" ? 14 : 30).toISOString().slice(0, 10)
    };
  });

  const tracked = plans.filter((plan) => plan.status === "Tracked");
  const gaps = plans.filter((plan) => plan.gaps.length);
  const launchGaps = gaps.filter((plan) => plan.item.status === "committed" || plan.item.status === "shipped").slice(0, 8);
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
    dashboard,
    metrics: {
      total: plans.length,
      tracked: tracked.length,
      gaps: gaps.length,
      launchGaps: launchGaps.length
    }
  };
}

export function buildMetricsMemo(items, now = new Date(), prioritization) {
  const plan = buildMetricsPlan(items, now, prioritization);
  return [
    `# Metrics Plan - ${now.toISOString().slice(0, 10)}`,
    "",
    "## Measurement Coverage",
    `- ${plan.metrics.tracked} of ${plan.metrics.total} active initiatives have enough tracking context.`,
    "",
    "## Primary Metrics",
    plan.plans.length ? plan.plans.slice(0, 8).map((entry) => `- ${entry.item.title}: ${entry.primaryMetric} (${entry.objective})`).join("\n") : "- No active initiatives to measure.",
    "",
    "## Tracking Gaps",
    plan.gaps.length ? plan.gaps.slice(0, 8).map((entry) => `- ${entry.item.title}: ${entry.gaps[0]}`).join("\n") : "- No tracking gaps detected.",
    "",
    "## Instrumentation",
    plan.launchGaps.length ? plan.launchGaps.map((entry) => `- ${entry.item.title}: ${entry.instrumentation}`).join("\n") : "- No launch instrumentation gaps detected."
  ].join("\n");
}

export function buildPortfolioDashboard(items, now = new Date(), capacity = CAPACITY_BENCHMARKS.active, prioritization) {
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
    metrics: {
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
    recommendations: buildPortfolioRecommendations({ capacityPlan, alignment, actions, risks, launch })
  };
}

export function buildPortfolioMemo(items, now = new Date(), capacity = CAPACITY_BENCHMARKS.active, prioritization) {
  const portfolio = buildPortfolioDashboard(items, now, capacity, prioritization);
  return [
    `# Portfolio Review - ${now.toISOString().slice(0, 10)}`,
    "",
    "## Health Signals",
    `- Active initiatives: ${portfolio.metrics.active}`,
    `- Capacity utilization: ${portfolio.metrics.utilization}%`,
    `- Active risks: ${portfolio.metrics.risks}`,
    `- Action queue: ${portfolio.metrics.actions}`,
    "",
    "## Objective Mix",
    portfolio.objectiveMix.length ? portfolio.objectiveMix.map((entry) => `- ${entry.objective}: ${entry.count} initiatives, ${entry.effort} effort`).join("\n") : "- No active objective mix yet.",
    "",
    "## Segment Mix",
    portfolio.segmentMix.length ? portfolio.segmentMix.map((entry) => `- ${entry.segment}: ${entry.count} initiatives`).join("\n") : "- No segment mix yet.",
    "",
    "## Watchlist",
    portfolio.watchlist.length ? portfolio.watchlist.map((entry) => `- [${entry.type}] ${entry.title}: ${entry.action}`).join("\n") : "- No watchlist actions.",
    "",
    "## Recommendations",
    portfolio.recommendations.length ? portfolio.recommendations.map((entry) => `- ${entry}`).join("\n") : "- Portfolio is balanced enough for the current operating view."
  ].join("\n");
}

function buildPortfolioRecommendations({ capacityPlan, alignment, actions, risks, launch }) {
  return [
    capacityPlan.overage ? `Cut, park, or resequence at least ${capacityPlan.overage} effort points.` : "",
    alignment.coverage.length > 3 ? "Confirm the portfolio is not spread across too many simultaneous objectives." : "",
    alignment.missingMetrics.length ? "Add success metrics before the next planning review." : "",
    actions.metrics.overdue ? "Reset overdue commitments before adding new scope." : "",
    risks.length ? "Escalate the highest-severity risks with explicit asks." : "",
    launch.metrics.noGo ? "Hold no-go launches until readiness gaps are closed or accepted." : ""
  ].filter(Boolean);
}

function inferObjective(item) {
  const text = `${item.title} ${item.customer} ${item.problem} ${primaryRiskText(item)} ${item.experiment}`.toLowerCase();
  const match = objectiveRules.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)));
  return match ? match.name : "Product Growth";
}

function suggestKeyResult(entry) {
  if (entry.objective === "Trust & Admin Control") return "Reduce unresolved trust or admin-control escalations by 30%.";
  if (entry.objective === "Activation & Setup") return "Improve new-workspace activation by 20%.";
  if (entry.objective === "Customer Insight") return "Close the loop on the top 3 validated customer themes.";
  if (entry.objective === "Efficiency") return "Cut repeated operational effort by 25%.";
  return "Increase qualified product adoption by 15%.";
}

function suggestPrimaryMetric(item, objective) {
  if (item.experiment) return item.experiment;
  if (item.decision) return item.decision;
  if (objective === "Trust & Admin Control") return "Admin task success rate and unresolved trust escalations.";
  if (objective === "Activation & Setup") return "Activation completion rate and time to first value.";
  if (objective === "Customer Insight") return "Validated feedback themes and closed-loop customer responses.";
  if (objective === "Efficiency") return "Workflow completion time and repeated manual steps removed.";
  return "Qualified adoption, retention, or conversion lift.";
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
  const segment = item.customer || "target segment";
  if (objective === "Activation & Setup") return `Track setup_start, setup_complete, and first_value for ${segment}.`;
  if (objective === "Trust & Admin Control") return `Track control_viewed, setting_changed, export_started, and admin_error for ${segment}.`;
  if (objective === "Customer Insight") return `Track feedback_source, theme_tagged, and customer_closed_loop for ${segment}.`;
  if (objective === "Efficiency") return `Track workflow_started, workflow_completed, time_saved, and repeat_usage for ${segment}.`;
  return `Track exposure, activation, repeated_use, and conversion for ${segment}.`;
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

export function buildReviewLoop(items, now = new Date(), prioritization) {
  const normalized = prioritizeItems(items, prioritization).map(normalizeItem);
  const active = normalized.filter((item) => item.status !== "shipped" && item.status !== "parked");
  const shipped = normalized.filter((item) => item.status === "shipped").slice(0, 6);
  const overdue = active
    .filter((item) => item.dueDate && new Date(`${item.dueDate}T23:59:59.999Z`) < now)
    .slice(0, 6);
  const decisionsNeeded = active
    .filter((item) => activeRisks(item).length || (item.status === "committed" && !item.decision.trim()))
    .slice(0, 8);
  const learningCandidates = normalized
    .filter((item) => item.status === "shipped" || item.experiment.trim() || item.decision.trim())
    .slice(0, 6);

  return {
    shipped,
    overdue,
    decisionsNeeded,
    learningCandidates,
    retroPrompts: buildRetroPrompts({ shipped, overdue, decisionsNeeded, learningCandidates }),
    metrics: {
      shipped: shipped.length,
      overdue: overdue.length,
      decisionNeeds: decisionsNeeded.length,
      learningItems: learningCandidates.length
    }
  };
}

export function buildReviewMemo(items, now = new Date(), prioritization) {
  const review = buildReviewLoop(items, now, prioritization);
  return [
    `# Product Review - ${now.toISOString().slice(0, 10)}`,
    "",
    "## Shipped",
    review.shipped.length ? review.shipped.map((item) => `- ${item.title}: ${item.decision || item.experiment || "Capture launch outcome"}`).join("\n") : "No shipped initiatives in the current workspace.",
    "",
    "## Slipped Or Overdue",
    review.overdue.length ? review.overdue.map((item) => `- ${item.title}: due ${item.dueDate}, next step ${item.nextStep || "missing"}`).join("\n") : "No overdue active initiatives.",
    "",
    "## Decisions Needed",
    review.decisionsNeeded.length ? review.decisionsNeeded.map((item) => `- ${item.title}: ${primaryRiskText(item) || "needs an explicit commit / kill / continue decision"}`).join("\n") : "No decision escalations detected.",
    "",
    "## Retro Prompts",
    review.retroPrompts.map((prompt) => `- ${prompt}`).join("\n")
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

export function buildDependencyMap(items, now = new Date(), prioritization) {
  const active = prioritizeItems(items, prioritization)
    .map(normalizeItem)
    .filter((item) => item.status !== "shipped" && item.status !== "parked");
  const influence = priorityInfluence(active, prioritization);
  const dependencies = active.flatMap((item) => activeDependencies(item).map((record) => ({
    item,
    record,
    dependency: record.description,
    owner: resolveRecordOwner(record, item),
    urgency: dependencyUrgency(record, item, now),
    priorityContribution: influence.get(item.id) || 0,
    ask: buildDependencyAsk(record, item)
  }))).sort((a, b) => b.urgency - a.urgency
    || b.priorityContribution - a.priorityContribution
    || String(a.record.neededBy || "9999").localeCompare(String(b.record.neededBy || "9999")));
  const blockers = dependencies.filter((entry) => entry.record.status === "at-risk" || entry.record.status === "blocked").slice(0, 10);
  const owners = new Map();
  dependencies.forEach((dependency) => {
    const current = owners.get(dependency.owner) || { owner: dependency.owner, count: 0, urgency: 0, items: [], references: [] };
    current.count += 1;
    current.urgency = Math.max(current.urgency, dependency.urgency);
    current.items.push(dependency.item.title);
    current.references.push({ itemId: dependency.item.id, title: dependency.item.title, recordId: dependency.record.id });
    owners.set(dependency.owner, current);
  });
  const upcoming = dependencies.filter((entry) => entry.record.neededBy)
    .sort((a, b) => a.record.neededBy.localeCompare(b.record.neededBy)).slice(0, 8);
  return {
    dependencies,
    blockers,
    owners: [...owners.values()].sort((a, b) => b.urgency - a.urgency || b.count - a.count),
    upcoming,
    metrics: {
      blockers: blockers.length,
      unassigned: dependencies.filter((entry) => entry.owner === "Unassigned").length,
      highUrgency: dependencies.filter((entry) => entry.urgency >= 70).length,
      upcoming: dependencies.filter((entry) => entry.record.neededBy).length
    }
  };
}

export function buildDependencyMemo(items, now = new Date(), prioritization) {
  const map = buildDependencyMap(items, now, prioritization);
  return [
    `# Dependency Review - ${now.toISOString().slice(0, 10)}`,
    "",
    "## Highest-Urgency Blockers",
    map.blockers.length ? map.blockers.slice(0, 5).map((blocker) => `- ${blocker.item.title} (${blocker.owner}, urgency ${blocker.urgency}): ${blocker.ask}`).join("\n") : "No blockers detected.",
    "",
    "## Owner Load",
    map.owners.length ? map.owners.map((owner) => `- ${owner.owner}: ${owner.count} blocker(s), max urgency ${owner.urgency}`).join("\n") : "No owner blockers detected.",
    "",
    "## Upcoming Commitments",
    map.upcoming.length ? map.upcoming.map((entry) => `- ${entry.record.neededBy}: ${entry.item.title} depends on ${entry.record.targetName} (${entry.owner})`).join("\n") : "No dated dependencies captured."
  ].join("\n");
}

export function buildDeliveryBoard(items, now = new Date(), prioritization) {
  const committed = prioritizeItems(items.map(normalizeItem), prioritization).filter((item) => item.status === "committed");
  const dependencies = buildDependencyMap(items, now, prioritization);
  const entries = committed.map((item) => {
    const blockers = dependencies.blockers.filter((blocker) => blocker.item.id === item.id);
    const overdue = item.dueDate && new Date(`${item.dueDate}T23:59:59.999Z`) < now;
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
    `# Delivery Review - ${now.toISOString().slice(0, 10)}`,
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
  if (record?.neededBy) {
    const due = new Date(`${record.neededBy}T00:00:00.000Z`);
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const remaining = Math.round((due.getTime() - today) / 86400000);
    dueBoost = remaining < 0 ? 15 : remaining <= 7 ? 10 : remaining <= 30 ? 5 : 0;
  }
  return Math.min(100, base + ownerBoost + dueBoost);
}


export function buildCommunicationPlan(items, now = new Date(), prioritization) {
  const prioritized = prioritizeItems(items, prioritization);
  const active = prioritized.filter((item) => item.status !== "shipped" && item.status !== "parked");
  const risks = buildRiskRegister(items, prioritization).slice(0, 5);
  const release = buildReleasePlan(items, prioritization);
  const outcome = buildOutcomeReport(items, prioritization);
  const dependencies = buildDependencyMap(items, now, prioritization).blockers.slice(0, 5);
  const audiences = [
    {
      audience: "Executives",
      cadence: "Weekly",
      focus: `${outcome.committed} committed, ${outcome.highRisk} high-risk, ${outcome.averageReadiness}% average readiness`,
      message: release.now.length ? `Current commitments: ${release.now.map((item) => item.title).join(", ")}` : "No committed initiatives need executive attention.",
      ask: risks[0]?.mitigation || "Confirm whether current priorities still match business goals."
    },
    {
      audience: "Delivery Team",
      cadence: "Twice weekly",
      focus: "Next steps, blockers, and decision clarity",
      message: active.slice(0, 4).map((item) => `${item.title}: ${item.nextStep || "needs next step"}`).join(" | ") || "No active delivery work.",
      ask: dependencies[0]?.ask || "Update next steps and owners before the next standup."
    },
    {
      audience: "Customer-facing Teams",
      cadence: "Weekly",
      focus: "Customer themes, launch notes, and feedback loops",
      message: outcome.topThemes.slice(0, 4).map((theme) => `${theme.theme} (${theme.count})`).join(" | ") || "No customer themes captured yet.",
      ask: "Add missing customer signals to the workspace before planning."
    },
    {
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

export function buildCommunicationMemo(items, now = new Date(), prioritization) {
  const plan = buildCommunicationPlan(items, now, prioritization);
  return [
    `# Communications Plan - ${now.toISOString().slice(0, 10)}`,
    "",
    "## Audience Updates",
    plan.audiences.map((entry) => `- ${entry.audience} (${entry.cadence}): ${entry.message} Ask: ${entry.ask}`).join("\n"),
    "",
    "## Escalations",
    plan.escalation.length ? plan.escalation.map((entry) => `- ${entry.title} [${entry.owner}] severity ${entry.severity}: ${entry.ask}`).join("\n") : "No escalations captured."
  ].join("\n");
}

export function buildMeetingAgenda(items, meetingType = "weekly-review", now = new Date(), prioritization) {
  const weekly = buildWeeklyPlan(items, prioritization);
  const risks = buildRiskRegister(items, prioritization).slice(0, 4);
  const release = buildReleasePlan(items, prioritization);
  const review = buildReviewLoop(items, now, prioritization);
  const comms = buildCommunicationPlan(items, now, prioritization);
  const agendas = {
    "weekly-review": {
      title: "Weekly Product Review",
      duration: 45,
      sections: [
        agendaSection("Outcomes", review.learningCandidates.slice(0, 3), "What changed in customer or business signal?"),
        agendaSection("Focus", weekly.focus, "What must move this week?"),
        agendaSection("Risks", risks.map((risk) => risk.item), "What needs escalation or mitigation?"),
        agendaSection("Decisions", weekly.decide, "What call needs to be made?")
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
        agendaSection("Pending Decisions", weekly.decide, "What decision is blocking progress?"),
        agendaSection("Escalations", comms.escalation, "Which asks require leadership attention?"),
        agendaSection("Evidence", review.learningCandidates, "What evidence should influence the decision?")
      ]
    }
  };
  const agenda = agendas[meetingType] || agendas["weekly-review"];
  return { id: meetingType, generatedAt: now.toISOString(), ...agenda };
}

export function buildMeetingAgendaMarkdown(items, meetingType = "weekly-review", now = new Date(), prioritization) {
  const agenda = buildMeetingAgenda(items, meetingType, now, prioritization);
  return [
    `# ${agenda.title} - ${now.toISOString().slice(0, 10)}`,
    "",
    `Duration: ${agenda.duration} minutes`,
    "",
    ...agenda.sections.flatMap((section) => [
      `## ${section.title}`,
      section.items.length ? section.items.map((item) => `- ${meetingItemLabel(item)}`).join("\n") : `- ${section.prompt}`,
      ""
    ])
  ].join("\n").trim();
}

function agendaSection(title, entries, prompt) {
  return { title, prompt, items: entries.slice(0, 5) };
}

function meetingItemLabel(item) {
  if (item.item) return meetingItemLabel(item.item);
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
    successMetric: normalized.experiment || "Define success metric before commitment.",
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
    `Generated: ${now.toISOString().slice(0, 10)}`,
    "",
    `## Owner\n${spec.owner}`,
    "",
    `## Customer\n${spec.customer}`,
    "",
    `## Problem\n${spec.problem}`,
    "",
    `## Objective\n${spec.objective}`,
    "",
    `## Success Metric\n${spec.successMetric}`,
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
  criteria.push(item.experiment ? `Measurement is captured through: ${item.experiment}` : "A measurable success signal is defined.");
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
    const blockers = dependencyMap.blockers.filter((blocker) => blocker.item.id === item.id);
    const readiness = calculateLaunchReadiness(item);
    return {
      item,
      readiness,
      goNoGo: readiness >= 90 && !blockers.length ? "Go" : readiness >= 70 ? "Watch" : "No-go",
      gaps,
      blockers,
      launchDate: item.dueDate || "Unscheduled"
    };
  });
  return {
    candidates,
    go: candidates.filter((candidate) => candidate.goNoGo === "Go"),
    watch: candidates.filter((candidate) => candidate.goNoGo === "Watch"),
    noGo: candidates.filter((candidate) => candidate.goNoGo === "No-go"),
    metrics: {
      candidates: candidates.length,
      go: candidates.filter((candidate) => candidate.goNoGo === "Go").length,
      watch: candidates.filter((candidate) => candidate.goNoGo === "Watch").length,
      noGo: candidates.filter((candidate) => candidate.goNoGo === "No-go").length
    }
  };
}

export function buildLaunchMemo(items, now = new Date(), prioritization) {
  const board = buildLaunchBoard(items, now, prioritization);
  return [
    `# Launch Review - ${now.toISOString().slice(0, 10)}`,
    "",
    "## Go",
    board.go.length ? board.go.map((entry) => `- ${entry.item.title}: ${entry.readiness}% ready for ${entry.launchDate}`).join("\n") : "No launch candidates are fully ready.",
    "",
    "## Watch",
    board.watch.length ? board.watch.map((entry) => `- ${entry.item.title}: ${entry.readiness}% ready; gaps: ${entry.gaps.map((gap) => gap.area).join(", ") || "none"}`).join("\n") : "No watch-list launches.",
    "",
    "## No-go",
    board.noGo.length ? board.noGo.map((entry) => `- ${entry.item.title}: ${entry.readiness}% ready; blockers: ${entry.blockers.map((blocker) => blocker.dependency).join(", ") || entry.gaps.map((gap) => gap.area).join(", ")}`).join("\n") : "No no-go launches.",
    "",
    "## Next Launch Actions",
    board.candidates.length ? board.candidates.slice(0, 6).map((entry) => `- ${entry.item.title}: ${entry.gaps[0]?.task || entry.blockers[0]?.ask || "Confirm launch owner and comms."}`).join("\n") : "No active launch candidates."
  ].join("\n");
}

export function buildRolloutPlan(items, now = new Date(), prioritization) {
  const launch = buildLaunchBoard(items, now, prioritization);
  const candidates = launch.candidates
    .filter((entry) => entry.item.status === "committed" || entry.item.status === "shipped")
    .map((entry) => {
      const gaps = buildRolloutGaps(entry.item, entry.readiness, entry.blockers);
      const stage = selectRolloutStage(entry.item, entry.readiness, gaps);
      const guardrails = buildRolloutGuardrails(entry.item);
      return {
        item: entry.item,
        owner: entry.item.owner || "Unassigned",
        readiness: entry.readiness,
        stage,
        audience: buildRolloutAudience(entry.item, stage),
        guardrails,
        rollback: buildRollbackTrigger(entry.item, guardrails),
        gaps,
        status: stage === "Hold" ? "Hold" : gaps.length ? "Watch" : "Ready",
        nextStep: gaps[0] || entry.item.nextStep || "Open the staged rollout and monitor guardrails."
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
    `# Rollout Plan - ${now.toISOString().slice(0, 10)}`,
    "",
    "## Ready",
    plan.ready.length ? plan.ready.map((entry) => `- ${entry.item.title}: ${entry.stage} to ${entry.audience}; owner ${entry.owner}`).join("\n") : "- No rollout candidates are ready.",
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

function buildRolloutGaps(item, readiness, blockers) {
  const risk = primaryRiskText(item);
  return [
    !item.owner ? "Assign a rollout owner." : "",
    !item.experiment ? "Define the rollout success metric." : "",
    risk ? `Resolve or accept risk: ${risk}` : "",
    readiness < 70 ? "Complete launch readiness before exposing users." : "",
    ...blockers.map((blocker) => blocker.ask || blocker.dependency)
  ].filter(Boolean);
}

function selectRolloutStage(item, readiness, gaps) {
  if (item.status === "shipped") return "100% rollout";
  if (readiness < 70 || gaps.length > 1) return "Hold";
  if (gaps.length) return "Beta cohort";
  return readiness >= 90 ? "50% rollout" : "Beta cohort";
}

function buildRolloutAudience(item, stage) {
  if (stage === "100% rollout") return item.customer || "all active users";
  if (stage === "Hold") return "no new users";
  if (Number(item.reach) >= 1000) return `first 10% of ${item.customer || "target users"}`;
  return item.customer || "named beta cohort";
}

function buildRolloutGuardrails(item) {
  const risk = cleanSentenceFragment(primaryRiskText(item)).toLowerCase();
  return [
    item.experiment || "Primary success metric is defined.",
    risk ? `No increase in ${risk}.` : "No material increase in support contacts.",
    "Rollback path can be executed within one business day."
  ];
}

function buildRollbackTrigger(item, guardrails) {
  const risk = cleanSentenceFragment(primaryRiskText(item)).toLowerCase();
  if (risk) return `Rollback if the risk increases: ${risk}; or if the mitigation owner is unavailable.`;
  return `Rollback if ${guardrails[0].toLowerCase()} misses target or support volume spikes.`;
}

function cleanSentenceFragment(value) {
  return String(value || "").trim().replace(/[.!?]+$/, "");
}

export function buildEnablementPlan(items, now = new Date(), prioritization) {
  const launch = buildLaunchBoard(items, now, prioritization);
  const comms = buildCommunicationPlan(items, now, prioritization);
  const candidates = launch.candidates.map((entry) => {
    const checks = buildEnablementChecks(entry.item, entry, comms);
    const gaps = checks.filter((check) => !check.done);
    const readiness = Math.round((checks.filter((check) => check.done).length / checks.length) * 100);
    return {
      item: entry.item,
      readiness,
      status: readiness >= 90 ? "Ready" : readiness >= 65 ? "Needs polish" : "Blocked",
      launchDate: entry.launchDate,
      checks,
      gaps,
      owner: entry.item.owner || "Unassigned",
      handoff: buildEnablementHandoff(entry.item, gaps)
    };
  });
  return {
    candidates,
    ready: candidates.filter((candidate) => candidate.status === "Ready"),
    needsPolish: candidates.filter((candidate) => candidate.status === "Needs polish"),
    blocked: candidates.filter((candidate) => candidate.status === "Blocked"),
    metrics: {
      candidates: candidates.length,
      ready: candidates.filter((candidate) => candidate.status === "Ready").length,
      gaps: candidates.reduce((sum, candidate) => sum + candidate.gaps.length, 0),
      blocked: candidates.filter((candidate) => candidate.status === "Blocked").length
    }
  };
}

export function buildEnablementMemo(items, now = new Date(), prioritization) {
  const plan = buildEnablementPlan(items, now, prioritization);
  return [
    `# Enablement Handoff - ${now.toISOString().slice(0, 10)}`,
    "",
    "## Ready",
    plan.ready.length ? plan.ready.map((entry) => `- ${entry.item.title}: ${entry.readiness}% ready for ${entry.launchDate}`).join("\n") : "- No launches are fully enablement-ready.",
    "",
    "## Needs Work",
    plan.candidates.filter((entry) => entry.gaps.length).length ? plan.candidates.filter((entry) => entry.gaps.length).map((entry) => `- ${entry.item.title}: ${entry.gaps.map((gap) => gap.area).join(", ")}`).join("\n") : "- No enablement gaps detected.",
    "",
    "## Team Handoffs",
    plan.candidates.length ? plan.candidates.slice(0, 8).map((entry) => `- ${entry.item.title}: ${entry.handoff}`).join("\n") : "- No active launch candidates."
  ].join("\n");
}

function buildEnablementChecks(item, launchEntry, comms) {
  const customerFacingUpdate = comms.audiences.find((entry) => entry.audience === "Customer-facing Teams");
  return [
    enablementCheck("Docs", Boolean(item.problem && item.decision), item.decision ? `Document customer value and launch decision: ${item.decision}` : "Draft customer-facing docs and the launch decision."),
    enablementCheck("Support", Boolean(activeRisks(item).length || item.nextStep), activeRisks(item).length ? `Prepare support response for: ${primaryRiskText(item)}` : `Turn next step into support guidance: ${item.nextStep || "capture support guidance."}`),
    enablementCheck("Sales", Boolean(item.customer && item.problem), item.customer ? `Frame value for ${item.customer}.` : "Name the customer segment and value message."),
    enablementCheck("Training", Boolean(item.owner && launchEntry.readiness >= 70), item.owner ? `Schedule enablement review with ${item.owner}.` : "Assign an enablement owner."),
    enablementCheck("Analytics", Boolean(item.experiment), item.experiment ? `Confirm tracking for ${item.experiment}.` : "Define adoption, activation, or success tracking."),
    enablementCheck("Comms", Boolean(customerFacingUpdate?.message), customerFacingUpdate?.message || "Draft the customer-facing team update.")
  ];
}

function enablementCheck(area, done, task) {
  return { area, done, task };
}

function buildEnablementHandoff(item, gaps) {
  if (gaps.length) return `${gaps[0].task} Owner: ${item.owner || "Unassigned"}.`;
  return `${item.title} is ready for docs, support, customer-facing teams, and measurement handoff.`;
}

function uniqueIds(value) {
  return [...new Set((Array.isArray(value) ? value : []).map((entry) => String(entry || "").trim()).filter(Boolean))];
}

function audienceFor(item) {
  const explicit = uniqueIds(item?.audienceSegments);
  return explicit.length ? explicit : [String(item?.customer || "Unspecified segment").trim() || "Unspecified segment"];
}

export function buildRetrospective(items, activity = [], now = new Date(), prioritization) {
  const review = buildReviewLoop(items, now, prioritization);
  const launch = buildLaunchBoard(items, now, prioritization);
  const followUps = buildFollowUps(items, prioritization);
  const recentActivity = activity.map(normalizeActivityEntry).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
  const followUpActions = [
    ...launch.noGo.slice(0, 4).map((entry) => ({ itemId: entry.item.id, title: entry.item.title, action: entry.gaps[0]?.task || entry.blockers[0]?.ask || "Resolve launch blocker." })),
    ...followUps.slice(0, 6).map((item) => ({ itemId: item.id, title: item.title, action: item.nextStep || primaryRiskText(item) || "Add an owner and next step." }))
  ].filter((entry, index, all) => all.findIndex((candidate) => candidate.itemId === entry.itemId) === index).slice(0, 6);

  return {
    generatedAt: now.toISOString(),
    wins: review.shipped.slice(0, 5).map((item) => ({ itemId: item.id, title: item.title, evidence: item.decision || item.experiment || "Capture customer or business outcome evidence." })),
    learnings: review.learningCandidates.slice(0, 5).map((item) => ({ itemId: item.id, title: item.title, prompt: item.experiment || item.decision || "Write down the assumption, signal, and decision." })),
    misses: review.overdue.slice(0, 5).map((item) => ({ itemId: item.id, title: item.title, recovery: item.nextStep || primaryRiskText(item) || "Reset scope, date, or owner." })),
    followUps: followUpActions,
    activity: recentActivity,
    metrics: {
      wins: review.shipped.length,
      learnings: review.learningCandidates.length,
      misses: review.overdue.length,
      followUps: followUpActions.length,
      activity: recentActivity.length
    }
  };
}

export function buildRetrospectiveMemo(items, activity = [], now = new Date(), prioritization) {
  const retro = buildRetrospective(items, activity, now, prioritization);
  return [
    `# Retrospective - ${now.toISOString().slice(0, 10)}`,
    "",
    "## Wins",
    retro.wins.length ? retro.wins.map((entry) => `- ${entry.title}: ${entry.evidence}`).join("\n") : "- No shipped wins captured yet.",
    "",
    "## Learnings",
    retro.learnings.length ? retro.learnings.map((entry) => `- ${entry.title}: ${entry.prompt}`).join("\n") : "- No learning candidates captured yet.",
    "",
    "## Misses",
    retro.misses.length ? retro.misses.map((entry) => `- ${entry.title}: ${entry.recovery}`).join("\n") : "- No slipped commitments detected.",
    "",
    "## Follow-Up Actions",
    retro.followUps.length ? retro.followUps.map((entry) => `- ${entry.title}: ${entry.action}`).join("\n") : "- No follow-up actions generated.",
    "",
    "## Recent Activity",
    retro.activity.length ? retro.activity.map((entry) => `- ${entry.action} ${entry.itemTitle} by ${entry.actor}`).join("\n") : "- No activity captured yet."
  ].join("\n");
}
