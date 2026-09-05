export const INITIATIVE_WORKFLOW_VERSION = 1;
export const INITIATIVE_STATUS_CATEGORIES = Object.freeze(["intake", "discovery", "committed", "shipped", "parked"]);
export const INITIATIVE_STATUS_COLORS = Object.freeze(["slate", "blue", "violet", "amber", "green", "rose", "teal"]);
export const TERMINAL_STATUS_CATEGORIES = Object.freeze(["shipped", "parked"]);
export const MAX_INITIATIVE_STATUSES = 20;

const categorySet = new Set(INITIATIVE_STATUS_CATEGORIES);
const colorSet = new Set(INITIATIVE_STATUS_COLORS);
const terminalSet = new Set(TERMINAL_STATUS_CATEGORIES);

export class InitiativeWorkflowError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "InitiativeWorkflowError";
    this.details = details;
  }
}

export function defaultInitiativeWorkflow() {
  return {
    version: INITIATIVE_WORKFLOW_VERSION,
    defaultStatusId: "intake",
    statuses: [
      workflowStatus("intake", "Intake", "intake", "slate", "New opportunities waiting for triage.", "A clear problem and owner are assigned."),
      workflowStatus("discovery", "Discovery", "discovery", "blue", "Problems being validated with evidence.", "Evidence supports a commit, park, or stop decision."),
      workflowStatus("committed", "Committed", "committed", "violet", "Approved work the team intends to deliver.", "Scope, owner, and delivery plan are confirmed."),
      workflowStatus("started", "Started", "committed", "teal", "Committed work currently being delivered.", "The release is ready to ship or the work returns to planning."),
      workflowStatus("shipped", "Shipped", "shipped", "green", "Released work being measured for outcomes.", "The release and outcome evidence are recorded."),
      workflowStatus("parked", "Parked", "parked", "amber", "Valid work intentionally paused or declined.", "A revisit trigger or stop rationale is documented.")
    ]
  };
}

export function normalizeInitiativeWorkflow(input = defaultInitiativeWorkflow()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new InitiativeWorkflowError("Initiative workflow must be an object.");
  }
  if (!Number.isInteger(input.version) || input.version < 1) {
    throw new InitiativeWorkflowError("Initiative workflow version must be a positive integer.");
  }
  if (!Array.isArray(input.statuses) || input.statuses.length < 2 || input.statuses.length > MAX_INITIATIVE_STATUSES) {
    throw new InitiativeWorkflowError(`Initiative workflow requires between 2 and ${MAX_INITIATIVE_STATUSES} statuses.`);
  }
  const ids = new Set();
  const names = new Set();
  const statuses = input.statuses.map((entry, index) => normalizeStatus(entry, index, ids, names));
  if (!statuses.some((status) => terminalSet.has(status.category))) {
    throw new InitiativeWorkflowError("Initiative workflow requires at least one terminal status.");
  }
  if (!statuses.some((status) => !terminalSet.has(status.category))) {
    throw new InitiativeWorkflowError("Initiative workflow requires at least one active status.");
  }
  const defaultStatusId = String(input.defaultStatusId || "").trim();
  const defaultStatus = statuses.find((status) => status.id === defaultStatusId);
  if (!defaultStatus) throw new InitiativeWorkflowError("Default status must reference an existing workflow status.");
  if (terminalSet.has(defaultStatus.category)) {
    throw new InitiativeWorkflowError("Default status cannot be a terminal status.");
  }
  return { version: input.version, defaultStatusId, statuses };
}

export function statusForId(workflow, statusId, fallbackCategory = "intake") {
  const normalized = normalizeInitiativeWorkflow(workflow);
  const requested = String(statusId || "").trim();
  return normalized.statuses.find((status) => status.id === requested)
    || normalized.statuses.find((status) => status.category === fallbackCategory)
    || normalized.statuses.find((status) => status.id === normalized.defaultStatusId)
    || normalized.statuses[0];
}

export function statusForInitiative(workflow, item) {
  return statusForId(workflow, item?.statusId || item?.status, item?.status || "intake");
}

export function initiativeStatusUsage(workflow, items = []) {
  const normalized = normalizeInitiativeWorkflow(workflow);
  const usage = Object.fromEntries(normalized.statuses.map((status) => [status.id, 0]));
  for (const item of items) {
    const status = statusForInitiative(normalized, item);
    usage[status.id] = (usage[status.id] || 0) + 1;
  }
  return usage;
}

export function assertInitiativeStatusAssignments(workflow, items = []) {
  const normalized = normalizeInitiativeWorkflow(workflow);
  const statuses = new Map(normalized.statuses.map((status) => [status.id, status]));
  for (const item of items) {
    const statusId = String(item?.statusId || item?.status || "").trim();
    const status = statuses.get(statusId);
    if (!status) {
      throw new InitiativeWorkflowError(`Initiative ${item?.id || "unknown"} references missing status ${statusId || "unknown"}.`, { itemId: item?.id, statusId });
    }
    if (status.category !== item.status) {
      throw new InitiativeWorkflowError(`Initiative ${item?.id || "unknown"} status category does not match ${status.name}.`, { itemId: item?.id, statusId, expectedCategory: status.category, actualCategory: item?.status });
    }
  }
  return normalized;
}

export function workflowStatusId(name, existingIds = []) {
  const base = String(name || "status").toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "status";
  const used = new Set(existingIds);
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function isTerminalInitiativeStatus(status) {
  return terminalSet.has(status?.category);
}

function normalizeStatus(input, index, ids, names) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new InitiativeWorkflowError(`Workflow status at position ${index + 1} must be an object.`);
  }
  const id = String(input.id || "").trim();
  const name = String(input.name || "").trim();
  const category = String(input.category || "").trim();
  const color = String(input.color || "slate").trim();
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) throw new InitiativeWorkflowError(`Workflow status ${index + 1} has an invalid id.`);
  if (!name || name.length > 80) throw new InitiativeWorkflowError(`Workflow status ${index + 1} requires a name of 80 characters or fewer.`);
  if (ids.has(id)) throw new InitiativeWorkflowError(`Workflow status id ${id} is duplicated.`);
  if (names.has(name.toLowerCase())) throw new InitiativeWorkflowError(`Workflow status name ${name} is duplicated.`);
  if (!categorySet.has(category)) throw new InitiativeWorkflowError(`Workflow status ${name} has an unsupported reporting category.`);
  if (!colorSet.has(color)) throw new InitiativeWorkflowError(`Workflow status ${name} has an unsupported color.`);
  ids.add(id);
  names.add(name.toLowerCase());
  return {
    id,
    name,
    category,
    color,
    description: String(input.description || "").trim().slice(0, 400),
    exitCriteria: String(input.exitCriteria || "").trim().slice(0, 400),
    position: index
  };
}

function workflowStatus(id, name, category, color, description, exitCriteria) {
  return { id, name, category, color, description, exitCriteria };
}
