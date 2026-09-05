import {
  WORKSPACE_REPOSITORY_ERROR_CODES,
  WorkspaceRepositoryError,
  immutableWorkspaceValue
} from "./workspace-contract.js";
import {
  OrganizationError,
  emptyOrganization,
  migrateLegacyOwners,
  normalizeOrganization
} from "./organization.js";
import {
  CustomerDirectoryError,
  emptyCustomerDirectory,
  migrateLegacyCustomers,
  normalizeCustomerDirectory
} from "./customers.js";
import {
  InitiativeWorkflowError,
  assertInitiativeStatusAssignments,
  defaultInitiativeWorkflow,
  normalizeInitiativeWorkflow
} from "./workflow.js";
import {
  PrioritizationError,
  assertPriorityAssignments,
  defaultPrioritization,
  normalizeItemPriority,
  normalizePrioritization,
  normalizePriorityInputs
} from "./prioritization.js";
import {
  INSIGHT_MUTABLE_FIELDS,
  INSIGHT_SHARED_FIELDS,
  INSIGHT_TYPE_FIELDS,
  InsightRecordError,
  migrateLegacyValidationRecords,
  normalizeInsightRecord
} from "./insights.js";
import {
  PlanningCalendarError,
  emptyPlanningCalendar,
  normalizePlanningCalendar
} from "./planning-calendar.js";
import {
  WorkspaceExperienceError,
  focusedWorkspaceExperience,
  fullWorkspaceExperience,
  normalizeWorkspaceExperience
} from "./experience.js";

export const WORKSPACE_DOCUMENT_SCHEMA = "pm-os.workspace.v10";
export const PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA = "pm-os.workspace.v9";
export const SECOND_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA = "pm-os.workspace.v8";
export const THIRD_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA = "pm-os.workspace.v7";
export const FOURTH_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA = "pm-os.workspace.v6";
export const FIFTH_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA = "pm-os.workspace.v5";
export const SIXTH_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA = "pm-os.workspace.v4";
export const SEVENTH_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA = "pm-os.workspace.v3";
export const EIGHTH_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA = "pm-os.workspace.v2";
export const LEGACY_WORKSPACE_DOCUMENT_SCHEMA = "pm-os.workspace.v1";
export const WORKSPACE_SCHEMA_V10 = WORKSPACE_DOCUMENT_SCHEMA;
export const WORKSPACE_SCHEMA_V9 = PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA;
export const WORKSPACE_SCHEMA_V8 = SECOND_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA;
export const WORKSPACE_SCHEMA_V7 = THIRD_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA;
export const WORKSPACE_SCHEMA_V6 = FOURTH_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA;
export const WORKSPACE_SCHEMA_V5 = FIFTH_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA;
export const WORKSPACE_SCHEMA_V4 = SIXTH_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA;
export const WORKSPACE_SCHEMA_V3 = SEVENTH_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA;
export const WORKSPACE_SCHEMA_V2 = EIGHTH_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA;
export const WORKSPACE_SCHEMA_V1 = LEGACY_WORKSPACE_DOCUMENT_SCHEMA;

/** Deterministic timestamp used only when legacy input contains no time signal. */
export const LEGACY_WORKSPACE_FALLBACK_TIMESTAMP = "1970-01-01T00:00:00.000Z";

export const DEFAULT_WORKSPACE_ACTOR = Object.freeze({ id: "pm-os", displayName: "PM OS" });

export const WORKSPACE_ITEM_FIELDS = Object.freeze([
  "id", "title", "customer", "customerIds", "segmentIds", "problem", "owner", "status", "statusId", "reach",
  "impact", "confidence", "effort", "startDate", "dueDate", "nextStep", "risks", "dependencies",
  "experiment", "decision", "priority", "priorityLevelId", "pocPersonId", "orgUnitId", "priorityInputs", "version",
  "updatedAt", "updatedBy"
]);

export const WORKSPACE_MUTABLE_ITEM_FIELDS = Object.freeze([
  "title", "customer", "customerIds", "segmentIds", "problem", "owner", "status", "statusId", "reach", "impact",
  "confidence", "effort", "startDate", "dueDate", "nextStep", "risks", "dependencies", "experiment",
  "decision", "priority", "priorityLevelId", "pocPersonId", "orgUnitId", "priorityInputs"
]);

export const WORKSPACE_INSIGHT_FIELDS = Object.freeze([
  ...INSIGHT_SHARED_FIELDS,
  ...new Set(Object.values(INSIGHT_TYPE_FIELDS).flat())
]);
export const WORKSPACE_MUTABLE_INSIGHT_FIELDS = INSIGHT_MUTABLE_FIELDS;

export const WORKSPACE_ACTIVITY_FIELDS = Object.freeze([
  "id", "action", "itemId", "itemTitle", "actor", "itemVersion", "changes",
  "createdAt"
]);

const validStatuses = new Set(["intake", "discovery", "committed", "shipped", "parked"]);
const validRiskStatuses = new Set(["open", "mitigating", "accepted", "resolved"]);
const validDependencyStatuses = new Set(["pending", "at-risk", "blocked", "resolved"]);
const validDependencyTargets = new Set(["initiative", "external"]);
const changeFields = new Set([
  ...WORKSPACE_MUTABLE_ITEM_FIELDS,
  ...WORKSPACE_MUTABLE_INSIGHT_FIELDS,
  "source", "fileName", "itemCount", "items", "activityCount", "activity",
  "insightRecords", "reason", "workspace", "experience", "organization", "customerDirectory", "workflow", "prioritization", "planningCalendar"
]);

const supportedSchemas = new Set([
  WORKSPACE_DOCUMENT_SCHEMA,
  PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA,
  SECOND_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA,
  THIRD_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA,
  FOURTH_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA,
  FIFTH_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA,
  SIXTH_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA,
  SEVENTH_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA,
  EIGHTH_PREVIOUS_WORKSPACE_DOCUMENT_SCHEMA,
  LEGACY_WORKSPACE_DOCUMENT_SCHEMA
]);

/**
 * Decodes, migrates, validates, and freezes a workspace document.
 * Current-version fields are strict. Legacy and schema-less documents receive
 * safe concurrency metadata while preserving their domain data.
 */
export function decodeWorkspaceDocument(input, options = {}) {
  const source = parseInput(input);
  if (!isPlainObject(source)) throw invalidDocument("Workspace input must be a JSON object.");

  if (source.schema !== undefined && !supportedSchemas.has(source.schema)) {
    throw new WorkspaceRepositoryError(
      WORKSPACE_REPOSITORY_ERROR_CODES.UNKNOWN_SCHEMA,
      `Unsupported workspace schema: ${String(source.schema)}.`,
      { details: { schema: String(source.schema) } }
    );
  }

  return normalizeDocument(source, {
    ...options,
    legacy: source.schema !== WORKSPACE_DOCUMENT_SCHEMA
  });
}

/**
 * Creates a canonical v10 document from application data. Unlike decoding an
 * existing v10 export, omitted concurrency metadata is initialized safely.
 */
export function createWorkspaceDocument(input = {}, options = {}) {
  if (!isPlainObject(input)) throw invalidDocument("Workspace input must be an object.");
  if (input.schema !== undefined && !supportedSchemas.has(input.schema)) {
    throw new WorkspaceRepositoryError(
      WORKSPACE_REPOSITORY_ERROR_CODES.UNKNOWN_SCHEMA,
      `Unsupported workspace schema: ${String(input.schema)}.`,
      { details: { schema: String(input.schema) } }
    );
  }
  return normalizeDocument(input, { ...options, legacy: true });
}

export function createEmptyWorkspaceDocument(options = {}) {
  const prioritization = { ...defaultPrioritization(), defaultFrameworkId: "manual", activeMethodId: "manual" };
  return createWorkspaceDocument({ experience: focusedWorkspaceExperience(), planningCalendar: emptyPlanningCalendar(), organization: emptyOrganization(), customerDirectory: emptyCustomerDirectory(), workflow: defaultInitiativeWorkflow(), prioritization, items: [], insightRecords: [], codeRepositories: [], implementationRuns: [], activity: [] }, options);
}

/** Serializes only the versioned workspace allowlist; provider configuration and tokens cannot leak. */
export function encodeWorkspaceDocument(input, options = {}) {
  const document = input?.schema === WORKSPACE_DOCUMENT_SCHEMA
    ? decodeWorkspaceDocument(input, options)
    : createWorkspaceDocument(input, options);
  const exported = allowlistedDocument(document, resolveTimestamp(options.now));
  const space = options.space === undefined ? 2 : options.space;
  return JSON.stringify(exported, null, space);
}

export const parseWorkspaceDocument = decodeWorkspaceDocument;
export const migrateWorkspaceDocument = decodeWorkspaceDocument;
export const serializeWorkspaceDocument = encodeWorkspaceDocument;
export const exportWorkspaceDocument = encodeWorkspaceDocument;
export const decodeWorkspace = decodeWorkspaceDocument;
export const encodeWorkspace = encodeWorkspaceDocument;

export const workspaceDocumentCodec = Object.freeze({
  schema: WORKSPACE_DOCUMENT_SCHEMA,
  decode: decodeWorkspaceDocument,
  encode: encodeWorkspaceDocument,
  create: createWorkspaceDocument
});

/** Builds one canonical item for repository mutations. */
export function createWorkspaceItem(input, options = {}) {
  return immutableWorkspaceValue(normalizeItem(input, {
    legacy: true,
    index: options.index || 0,
    timestamp: resolveTimestamp(options.now),
    defaultActor: normalizeWorkspaceActor(options.actor || DEFAULT_WORKSPACE_ACTOR),
    idFactory: options.idFactory
  }));
}

/** Builds one canonical Insight record for repository mutations. */
export function createWorkspaceInsightRecord(input, options = {}) {
  try {
    return immutableWorkspaceValue(normalizeInsightRecord(input, {
      legacy: true,
      index: options.index || 0,
      now: resolveTimestamp(options.now),
      updatedBy: normalizeWorkspaceActor(options.actor || DEFAULT_WORKSPACE_ACTOR).id,
      id: input?.id || (typeof options.idFactory === "function" ? options.idFactory("insight", options.index || 0) : "")
    }));
  } catch (error) {
    if (error instanceof InsightRecordError) throw invalidDocument(error.message, error);
    throw error;
  }
}

/** Builds one canonical activity event for repository mutations. */
export function createWorkspaceActivity(input, options = {}) {
  const itemVersions = options.itemVersions instanceof Map ? options.itemVersions : new Map();
  const itemTitles = options.itemTitles instanceof Map ? options.itemTitles : new Map();
  return immutableWorkspaceValue(normalizeActivity(input, {
    legacy: true,
    index: options.index || 0,
    timestamp: resolveTimestamp(options.now),
    defaultActor: normalizeWorkspaceActor(options.actor || DEFAULT_WORKSPACE_ACTOR),
    idFactory: options.idFactory,
    itemVersions,
    itemTitles
  }));
}

/** Converts legacy actor strings and provider actor records to the v2 shape. */
export function normalizeWorkspaceActor(value, options = {}) {
  const strict = Boolean(options.strict);
  const fallback = options.fallback || DEFAULT_WORKSPACE_ACTOR;
  if (typeof value === "string") {
    if (strict) throw invalidDocument("Activity actor must be a structured actor object.");
    const displayName = value.trim() || fallback.displayName;
    return immutableWorkspaceValue({ id: actorId(displayName), displayName });
  }
  if (isPlainObject(value)) {
    const id = stringValue(value.id || value.userId || value.subject).trim();
    const displayName = stringValue(value.displayName || value.name || value.label).trim();
    if (strict && (!id || !displayName)) {
      throw invalidDocument("Activity actor requires non-empty id and displayName fields.");
    }
    const resolvedName = displayName || id || fallback.displayName;
    return immutableWorkspaceValue({ id: id || actorId(resolvedName), displayName: resolvedName });
  }
  if (strict) throw invalidDocument("Activity actor must be a structured actor object.");
  return immutableWorkspaceValue({ id: fallback.id, displayName: fallback.displayName });
}

function normalizeDocument(source, options) {
  if (!Array.isArray(source.items)) throw invalidDocument("Workspace document must contain an items array.");
  if (!options.legacy && !Array.isArray(source.insightRecords)) throw invalidDocument("Workspace document must contain an insightRecords array.");
  if (!options.legacy && !Array.isArray(source.activity)) {
    throw invalidDocument("Workspace document must contain an activity array.");
  }
  if (!options.legacy && source.planningCalendar === undefined) {
    throw invalidDocument("Workspace document must contain a planningCalendar object.");
  }
  if (!options.legacy && source.prioritization === undefined) {
    throw invalidDocument("Workspace document must contain a prioritization object.");
  }
  if (!options.legacy && source.experience === undefined) {
    throw invalidDocument("Workspace document must contain an experience object.");
  }

  const timestamp = resolveDocumentTimestamp(source, options);
  const defaultActor = normalizeWorkspaceActor(options.actor || DEFAULT_WORKSPACE_ACTOR);
  let experience;
  try {
    experience = normalizeWorkspaceExperience(source.experience || (options.legacy ? fullWorkspaceExperience() : focusedWorkspaceExperience()));
  } catch (error) {
    if (error instanceof WorkspaceExperienceError) throw invalidDocument(error.message, error);
    throw error;
  }
  let planningCalendar;
  try {
    planningCalendar = normalizePlanningCalendar(source.planningCalendar || emptyPlanningCalendar());
  } catch (error) {
    if (error instanceof PlanningCalendarError) throw invalidDocument(error.message, error);
    throw error;
  }
  const itemIds = new Set();
  let items = source.items.map((item, index) => {
    const normalized = normalizeItem(item, {
      ...options,
      index,
      timestamp,
      defaultActor
    });
    assertUniqueId(itemIds, normalized.id, "item");
    return normalized;
  });
  let organization;
  try {
    organization = normalizeOrganization(source.organization || emptyOrganization());
    if (options.legacy) {
      const migrated = migrateLegacyOwners(items, organization);
      organization = migrated.organization;
      items = migrated.items;
    }
  } catch (error) {
    if (error instanceof OrganizationError) {
      throw invalidDocument(error.message, error);
    }
    throw error;
  }
  let customerDirectory;
  try {
    customerDirectory = normalizeCustomerDirectory(source.customerDirectory || emptyCustomerDirectory());
    if (source.schema !== WORKSPACE_DOCUMENT_SCHEMA || source.customerDirectory === undefined) {
      const migrated = migrateLegacyCustomers(items, customerDirectory);
      customerDirectory = migrated.directory;
      items = migrated.items;
    }
  } catch (error) {
    if (error instanceof CustomerDirectoryError) throw invalidDocument(error.message, error);
    throw error;
  }
  assertCustomerAssignments(customerDirectory, items);
  assertCustomerOwnerAssignments(customerDirectory, organization);
  assertRecordOwnerAssignments(items, organization);
  let workflow;
  try {
    workflow = normalizeInitiativeWorkflow(source.workflow || defaultInitiativeWorkflow());
    assertInitiativeStatusAssignments(workflow, items);
  } catch (error) {
    if (error instanceof InitiativeWorkflowError) throw invalidDocument(error.message, error);
    throw error;
  }
  let prioritization;
  try {
    prioritization = normalizePrioritization(source.prioritization || defaultPrioritization(items), { items });
    assertPriorityAssignments(prioritization, organization, items);
  } catch (error) {
    if (error instanceof PrioritizationError) throw invalidDocument(error.message, error);
    throw error;
  }
  const insightIds = new Set();
  let insightRecords;
  try {
    insightRecords = (Array.isArray(source.insightRecords) ? source.insightRecords : []).map((record, index) => {
      const normalized = normalizeInsightRecord(record, {
        legacy: options.legacy,
        index,
        now: record?.updatedAt || timestamp,
        updatedBy: record?.updatedBy || defaultActor.id
      });
      assertUniqueId(insightIds, normalized.id, "insight record");
      return normalized;
    });
    if (options.legacy) insightRecords = migrateLegacyValidationRecords(items, insightRecords, { now: timestamp, updatedBy: defaultActor.id });
  } catch (error) {
    if (error instanceof InsightRecordError) throw invalidDocument(error.message, error);
    throw error;
  }
  assertInsightAssignments(insightRecords, items, customerDirectory, organization);
  const codeRepositories = normalizePortableCollection(source.codeRepositories, "codeRepositories", options.legacy);
  const implementationRuns = normalizePortableCollection(source.implementationRuns, "implementationRuns", options.legacy);
  assertBuildReferences(codeRepositories, implementationRuns, items);
  const itemVersions = new Map(items.map((item) => [item.id, item.version]));
  const itemTitles = new Map(items.map((item) => [item.id, item.title]));
  const activityIds = new Set();
  const activity = (Array.isArray(source.activity) ? source.activity : []).map((entry, index) => {
    const normalized = normalizeActivity(entry, {
      ...options,
      index,
      timestamp,
      defaultActor,
      itemVersions,
      itemTitles
    });
    assertUniqueId(activityIds, normalized.id, "activity");
    return normalized;
  });

  const document = { schema: WORKSPACE_DOCUMENT_SCHEMA };
  if (validTimestamp(source.exportedAt)) document.exportedAt = new Date(source.exportedAt).toISOString();
  const workspace = normalizeWorkspaceMetadata(source.workspace, source, options.legacy);
  if (workspace) document.workspace = workspace;
  document.experience = experience;
  document.planningCalendar = planningCalendar;
  document.organization = organization;
  document.customerDirectory = customerDirectory;
  document.workflow = workflow;
  document.prioritization = prioritization;
  document.items = items;
  document.insightRecords = insightRecords;
  document.codeRepositories = codeRepositories;
  document.implementationRuns = implementationRuns;
  document.activity = activity;
  return immutableWorkspaceValue(document);
}

function normalizeItem(value, context) {
  if (!isPlainObject(value)) throw invalidDocument(`Workspace item at index ${context.index} must be an object.`);
  const id = stringValue(value.id).trim()
    || (context.legacy ? makeId("item", context.index, context.idFactory) : "");
  if (!id) throw invalidDocument(`Workspace item at index ${context.index} requires an id.`);
  const version = normalizeVersion(value.version, {
    legacy: context.legacy,
    label: `Item ${id} version`
  });
  const updatedAt = validTimestamp(value.updatedAt)
    ? new Date(value.updatedAt).toISOString()
    : context.timestamp;
  const updatedBy = normalizeUpdatedBy(value.updatedBy, context.defaultActor, context.legacy, id);
  const risks = normalizeRiskRecords(value, { ...context, itemId: id, timestamp: updatedAt });
  const dependencies = normalizeDependencyRecords(value, { ...context, itemId: id, timestamp: updatedAt });
  const priorityInputs = normalizePriorityInputs(value.priorityInputs, context.legacy && value.priorityInputs === undefined ? {
    ...value,
    reach: clampNumber(value.reach, 0, 100000, 100),
    impact: clampNumber(value.impact, 1, 5, 3),
    confidence: clampNumber(value.confidence, 0.1, 1, 0.7),
    effort: clampNumber(value.effort, 1, 8, 3)
  } : null);
  const normalized = {
    id,
    title: stringValue(value.title || "Untitled initiative").trim() || "Untitled initiative",
    customer: stringValue(value.customer).trim(),
    customerIds: uniqueStringArray(value.customerIds),
    segmentIds: uniqueStringArray(value.segmentIds),
    problem: stringValue(value.problem).trim(),
    owner: stringValue(value.owner).trim(),
    status: validStatuses.has(value.status) ? value.status : "intake",
    statusId: stringValue(value.statusId).trim() || (validStatuses.has(value.status) ? value.status : "intake"),
    reach: clampNumber(value.reach, 0, 100000, 100),
    impact: clampNumber(value.impact, 1, 5, 3),
    confidence: clampNumber(value.confidence, 0.1, 1, 0.7),
    effort: clampNumber(value.effort, 1, 8, 3),
    startDate: stringValue(value.startDate).trim(),
    dueDate: stringValue(value.dueDate).trim(),
    nextStep: stringValue(value.nextStep).trim(),
    risks,
    dependencies,
    experiment: stringValue(value.experiment).trim(),
    decision: stringValue(value.decision).trim(),
    priority: normalizeItemPriority(value.priority, {
      legacyRice: context.legacy && value.priority === undefined,
      priorityInputs,
      priorityLevelId: value.priorityLevelId
    }),
    priorityLevelId: stringValue(value.priorityLevelId || value.priority?.tierByMethod?.levels).trim(),
    pocPersonId: stringValue(value.pocPersonId).trim(),
    orgUnitId: stringValue(value.orgUnitId).trim(),
    priorityInputs,
    version,
    updatedAt,
    updatedBy
  };
  if (new TextEncoder().encode(JSON.stringify(normalized)).length > 32768) throw invalidDocument(`Item ${id} exceeds the 32 KiB payload limit.`);
  return normalized;
}

function normalizeRiskRecords(value, context) {
  let records = value.risks;
  if (!Array.isArray(records)) {
    if (!context.legacy) throw invalidDocument(`Item ${context.itemId} risks must be an array.`);
    const legacy = stringValue(value.risk);
    records = legacy.trim() ? [{
      id: "legacy-risk-1",
      description: legacy,
      likelihood: 3,
      impact: 3,
      status: "open",
      ownerPersonId: "",
      ownerName: "",
      mitigation: "",
      reviewDate: "",
      needsClassification: true,
      createdAt: context.timestamp,
      updatedAt: context.timestamp
    }] : [];
  }
  if (records.length > 100) throw invalidDocument(`Item ${context.itemId} risks cannot exceed 100 records.`);
  const ids = new Set();
  return records.map((record, index) => {
    if (!isPlainObject(record)) throw invalidDocument(`Item ${context.itemId} risk at index ${index} must be an object.`);
    const id = stringValue(record.id).trim() || (context.legacy ? `risk-${index + 1}` : "");
    if (!id || id.length > 200) throw invalidDocument(`Item ${context.itemId} risk at index ${index} requires a valid id.`);
    assertUniqueId(ids, id, `risk in item ${context.itemId}`);
    const description = stringValue(record.description);
    if (!description.trim() || description.length > 1000) throw invalidDocument(`Risk ${id} requires a description of at most 1000 characters.`);
    const likelihood = integerInRange(record.likelihood, 1, 5, context.legacy ? 3 : null, `Risk ${id} likelihood`);
    const impact = integerInRange(record.impact, 1, 5, context.legacy ? 3 : null, `Risk ${id} impact`);
    const status = validRiskStatuses.has(record.status) ? record.status : context.legacy ? "open" : "";
    if (!status) throw invalidDocument(`Risk ${id} has an invalid status.`);
    const ownerPersonId = boundedText(record.ownerPersonId, 200, `Risk ${id} ownerPersonId`);
    const ownerName = boundedText(record.ownerName, 300, `Risk ${id} ownerName`);
    const mitigation = boundedText(record.mitigation, 2000, `Risk ${id} mitigation`);
    const reviewDate = normalizedOptionalDate(record.reviewDate, `Risk ${id} reviewDate`);
    return {
      id, description, likelihood, impact, status, ownerPersonId, ownerName, mitigation, reviewDate,
      needsClassification: Boolean(record.needsClassification),
      createdAt: normalizedRecordTimestamp(record.createdAt, context, `Risk ${id} createdAt`),
      updatedAt: normalizedRecordTimestamp(record.updatedAt, context, `Risk ${id} updatedAt`)
    };
  });
}

function normalizeDependencyRecords(value, context) {
  let records = value.dependencies;
  if (!Array.isArray(records)) {
    if (!context.legacy) throw invalidDocument(`Item ${context.itemId} dependencies must be an array.`);
    records = [];
  }
  if (records.length > 100) throw invalidDocument(`Item ${context.itemId} dependencies cannot exceed 100 records.`);
  const ids = new Set();
  return records.map((record, index) => {
    if (!isPlainObject(record)) throw invalidDocument(`Item ${context.itemId} dependency at index ${index} must be an object.`);
    const id = stringValue(record.id).trim() || (context.legacy ? `dependency-${index + 1}` : "");
    if (!id || id.length > 200) throw invalidDocument(`Item ${context.itemId} dependency at index ${index} requires a valid id.`);
    assertUniqueId(ids, id, `dependency in item ${context.itemId}`);
    const description = stringValue(record.description);
    if (!description.trim() || description.length > 1000) throw invalidDocument(`Dependency ${id} requires a description of at most 1000 characters.`);
    const targetType = validDependencyTargets.has(record.targetType) ? record.targetType : context.legacy ? "external" : "";
    if (!targetType) throw invalidDocument(`Dependency ${id} has an invalid target type.`);
    const targetInitiativeId = targetType === "initiative" ? boundedText(record.targetInitiativeId, 200, `Dependency ${id} targetInitiativeId`) : "";
    const targetName = boundedText(record.targetName, 500, `Dependency ${id} targetName`);
    if ((targetType === "initiative" && !targetInitiativeId) || !targetName) throw invalidDocument(`Dependency ${id} requires a target.`);
    if (targetInitiativeId === context.itemId) throw invalidDocument(`Dependency ${id} cannot target its own initiative.`);
    const status = validDependencyStatuses.has(record.status) ? record.status : context.legacy ? "pending" : "";
    if (!status) throw invalidDocument(`Dependency ${id} has an invalid status.`);
    return {
      id, description, targetType, targetInitiativeId, targetName, status,
      ownerPersonId: boundedText(record.ownerPersonId, 200, `Dependency ${id} ownerPersonId`),
      ownerName: boundedText(record.ownerName, 300, `Dependency ${id} ownerName`),
      neededBy: normalizedOptionalDate(record.neededBy, `Dependency ${id} neededBy`),
      createdAt: normalizedRecordTimestamp(record.createdAt, context, `Dependency ${id} createdAt`),
      updatedAt: normalizedRecordTimestamp(record.updatedAt, context, `Dependency ${id} updatedAt`)
    };
  });
}

function normalizeActivity(value, context) {
  if (!isPlainObject(value)) throw invalidDocument(`Activity at index ${context.index} must be an object.`);
  const id = stringValue(value.id).trim()
    || (context.legacy ? makeId("activity", context.index, context.idFactory) : "");
  if (!id) throw invalidDocument(`Activity at index ${context.index} requires an id.`);
  const itemId = stringValue(value.itemId).trim();
  let itemVersion = value.itemVersion;
  if (itemVersion === undefined || itemVersion === null) {
    if (!context.legacy && itemId) {
      throw invalidVersion(`Activity ${id} itemVersion must be a positive integer.`, { id, itemVersion });
    }
    itemVersion = itemId ? (context.itemVersions.get(itemId) || 1) : null;
  } else {
    itemVersion = normalizeVersion(itemVersion, {
      legacy: false,
      label: `Activity ${id} itemVersion`
    });
  }
  const actor = normalizeWorkspaceActor(value.actor, {
    strict: !context.legacy,
    fallback: context.defaultActor
  });
  return {
    id,
    action: stringValue(value.action || "updated").trim() || "updated",
    itemId,
    itemTitle: stringValue(value.itemTitle || context.itemTitles.get(itemId) || "Workspace").trim() || "Workspace",
    actor,
    itemVersion,
    changes: normalizeChanges(value.changes),
    createdAt: validTimestamp(value.createdAt)
      ? new Date(value.createdAt).toISOString()
      : context.timestamp
  };
}

function normalizeWorkspaceMetadata(value, source, legacy) {
  if (value === undefined || value === null) {
    if (!legacy || (!source.workspaceId && !source.workspaceName)) return null;
    value = { id: source.workspaceId, name: source.workspaceName };
  }
  if (!isPlainObject(value)) throw invalidDocument("Workspace metadata must be an object when provided.");
  const output = {};
  const id = stringValue(value.id).trim();
  const name = stringValue(value.name).trim();
  if (id) output.id = id;
  if (name) output.name = name;
  for (const field of ["createdAt", "updatedAt"]) {
    if (value[field] === undefined || value[field] === "") continue;
    if (!validTimestamp(value[field])) throw invalidDocument(`Workspace metadata ${field} is invalid.`);
    output[field] = new Date(value[field]).toISOString();
  }
  return Object.keys(output).length ? output : null;
}

function normalizeUpdatedBy(value, defaultActor, legacy, itemId) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (isPlainObject(value)) {
    const id = stringValue(value.id || value.userId || value.subject).trim();
    if (id) return id;
  }
  if (!legacy) throw invalidDocument(`Item ${itemId} requires a non-empty updatedBy value.`);
  return defaultActor.id;
}

function normalizeVersion(value, { legacy, label }) {
  if (value === undefined && legacy) return 1;
  if (!Number.isInteger(value) || value < 1) {
    throw invalidVersion(`${label} must be a positive integer.`, { version: value });
  }
  return value;
}

function normalizeChanges(value) {
  if (!isPlainObject(value)) return {};
  const output = {};
  for (const [field, change] of Object.entries(value)) {
    if (!changeFields.has(field)) continue;
    const sanitized = sanitizeChangeValue(change);
    if (sanitized !== undefined) output[field] = sanitized;
  }
  return output;
}

function sanitizeChangeValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (Array.isArray(value)) return value.map(sanitizeChangeValue).filter((entry) => entry !== undefined);
  if (!isPlainObject(value)) return undefined;
  const output = {};
  for (const field of ["from", "to"]) {
    if (!Object.prototype.hasOwnProperty.call(value, field)) continue;
    const sanitized = sanitizeChangeValue(value[field]);
    if (sanitized !== undefined) output[field] = sanitized;
  }
  return output;
}

function allowlistedDocument(document, exportedAt) {
  const output = { schema: WORKSPACE_DOCUMENT_SCHEMA, exportedAt };
  if (document.workspace) {
    output.workspace = pick(document.workspace, ["id", "name", "createdAt", "updatedAt"]);
  }
  output.experience = pick(document.experience, ["version", "enabledCapabilities"]);
  output.planningCalendar = pick(document.planningCalendar, [
    "version", "enabledPeriodTypes", "fiscalYearStartMonth", "sprintLengthWeeks", "sprintAnchorDate"
  ]);
  output.organization = {
    version: document.organization.version,
    people: document.organization.people.map((person) => pick(person, ["id", "displayName", "title"])),
    units: document.organization.units.map((unit) => pick(unit, ["id", "name", "parentId", "leadPersonId", "priorityFrameworkId", "position"]))
  };
  output.customerDirectory = {
    version: document.customerDirectory.version,
    accounts: document.customerDirectory.accounts.map((account) => ({
      ...pick(account, ["id", "name", "domain", "status", "industry", "region", "employeeCount", "planTier", "ownerPersonId", "notes", "tagIds", "attributes", "createdAt", "updatedAt"])
    })),
    tags: document.customerDirectory.tags.map((tag) => pick(tag, ["id", "name"])),
    fields: document.customerDirectory.fields.map((field) => pick(field, ["id", "name", "type", "options", "position"])),
    segments: document.customerDirectory.segments.map((segment) => ({
      ...pick(segment, ["id", "name", "description", "match"]),
      rules: segment.rules.map((rule) => pick(rule, ["id", "field", "operator", "value"]))
    }))
  };
  output.workflow = {
    version: document.workflow.version,
    defaultStatusId: document.workflow.defaultStatusId,
    statuses: document.workflow.statuses.map((status) => pick(status, ["id", "name", "category", "color", "description", "exitCriteria", "position"]))
  };
  output.prioritization = {
    version: document.prioritization.version,
    defaultFrameworkId: document.prioritization.defaultFrameworkId,
    activeMethodId: document.prioritization.activeMethodId,
    manualOrder: [...document.prioritization.manualOrder],
    levels: document.prioritization.levels.map((level) => pick(level, ["id", "label"])),
    customScorecard: {
      name: document.prioritization.customScorecard.name,
      criteria: document.prioritization.customScorecard.criteria.map((criterion) => pick(criterion, ["id", "name", "description", "weight", "direction", "archived"]))
    },
    customFrameworks: document.prioritization.customFrameworks.map((framework) => ({
      ...pick(framework, ["id", "name", "description"]),
      criteria: framework.fields.map((criterion) => pick(criterion, ["id", "name", "weight", "direction"]))
    }))
  };
  output.items = document.items.map((item) => pick(item, WORKSPACE_ITEM_FIELDS));
  output.insightRecords = document.insightRecords.map((record) => pick(record, WORKSPACE_INSIGHT_FIELDS));
  output.codeRepositories = document.codeRepositories.map((entry) => portableJsonValue(entry, "codeRepositories"));
  output.implementationRuns = document.implementationRuns.map((entry) => portableJsonValue(entry, "implementationRuns"));
  output.activity = document.activity.map((entry) => ({
    ...pick(entry, ["id", "action", "itemId", "itemTitle"]),
    actor: pick(entry.actor, ["id", "displayName"]),
    itemVersion: entry.itemVersion,
    changes: normalizeChanges(entry.changes),
    createdAt: entry.createdAt
  }));
  return output;
}

const sensitiveBuildKey = /(token|secret|credential|password|session|threadId|projectId|worktree|localPath|endpoint|providerSelection)/i;

function normalizePortableCollection(value, label, legacy) {
  if (value === undefined && legacy) return [];
  if (!Array.isArray(value)) throw invalidDocument(`${label} must be an array.`);
  const ids = new Set();
  return value.map((entry, index) => {
    if (!isPlainObject(entry)) throw invalidDocument(`${label} entry at index ${index} must be an object.`);
    const id = stringValue(entry.id).trim();
    if (!id || ids.has(id)) throw invalidDocument(`${label} entry at index ${index} requires a unique id.`);
    ids.add(id);
    return portableJsonValue(entry, label);
  });
}

function portableJsonValue(value, path = "workspace") {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map((entry, index) => portableJsonValue(entry, `${path}[${index}]`));
  if (!isPlainObject(value)) throw invalidDocument(`${path} contains a non-portable value.`);
  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    if (sensitiveBuildKey.test(key)) throw invalidDocument(`${path}.${key} is desktop-local and cannot be exported.`);
    output[key] = portableJsonValue(entry, `${path}.${key}`);
  }
  return output;
}

function assertBuildReferences(repositories, runs, items) {
  const repositoryIds = new Set(repositories.map((entry) => entry.id));
  const itemIds = new Set(items.map((entry) => entry.id));
  const invalid = runs.find((entry) => !repositoryIds.has(stringValue(entry.repositoryId).trim())
    || !itemIds.has(stringValue(entry.initiativeId).trim()));
  if (invalid) throw invalidDocument(`Implementation run ${invalid.id} references an unavailable initiative or repository.`);
}

function pick(value, fields) {
  const output = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(value, field)) output[field] = value[field];
  }
  return output;
}

function parseInput(input) {
  if (typeof input !== "string") return input;
  try {
    return JSON.parse(input);
  } catch (cause) {
    throw invalidDocument("Workspace input is not valid JSON.", cause);
  }
}

function assertUniqueId(ids, id, kind) {
  if (ids.has(id)) {
    throw new WorkspaceRepositoryError(
      WORKSPACE_REPOSITORY_ERROR_CODES.DUPLICATE_ID,
      `Workspace contains duplicate ${kind} id: ${id}.`,
      { details: { kind, id } }
    );
  }
  ids.add(id);
}

function invalidVersion(message, details) {
  return new WorkspaceRepositoryError(
    WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_VERSION,
    message,
    { details }
  );
}

function invalidDocument(message, cause) {
  return new WorkspaceRepositoryError(
    WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT,
    message,
    cause === undefined ? {} : { cause }
  );
}

function resolveTimestamp(value) {
  const candidate = typeof value === "function" ? value() : value;
  const date = candidate === undefined || candidate === null || candidate === ""
    ? new Date()
    : new Date(candidate);
  if (Number.isNaN(date.getTime())) throw invalidDocument("Workspace timestamp is invalid.");
  return date.toISOString();
}

function resolveDocumentTimestamp(source, options) {
  if (options.now !== undefined) return resolveTimestamp(options.now);
  if (validTimestamp(source.exportedAt)) return new Date(source.exportedAt).toISOString();
  if (options.legacy) return LEGACY_WORKSPACE_FALLBACK_TIMESTAMP;
  return resolveTimestamp();
}

function validTimestamp(value) {
  return typeof value === "string" && value.trim() !== "" && !Number.isNaN(new Date(value).getTime());
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function actorId(displayName) {
  const slug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug ? `legacy:${slug}` : DEFAULT_WORKSPACE_ACTOR.id;
}

function makeId(kind, index, idFactory) {
  if (typeof idFactory === "function") {
    const generated = stringValue(idFactory(kind, index)).trim();
    if (generated) return generated;
  }
  return `legacy-${kind}-${index + 1}`;
}

function stringValue(value) {
  return value === undefined || value === null ? "" : String(value);
}

function assertCustomerAssignments(directory, items) {
  const accountIds = new Set(directory.accounts.map((account) => account.id));
  const segmentIds = new Set(directory.segments.map((segment) => segment.id));
  const invalid = items.find((item) => item.customerIds.some((id) => !accountIds.has(id))
    || item.segmentIds.some((id) => !segmentIds.has(id)));
  if (invalid) throw invalidDocument(`Initiative ${invalid.id} references a missing customer account or segment.`);
}

function assertCustomerOwnerAssignments(directory, organization) {
  const people = new Set(organization.people.map((person) => person.id));
  const invalid = directory.accounts.find((account) => account.ownerPersonId && !people.has(account.ownerPersonId));
  if (invalid) throw invalidDocument(`Customer account ${invalid.id} references a missing Team owner.`);
}

function assertRecordOwnerAssignments(items, organization) {
  const people = new Set(organization.people.map((person) => person.id));
  for (const item of items) {
    const record = [...item.risks, ...item.dependencies].find((entry) => entry.ownerPersonId && !people.has(entry.ownerPersonId));
    if (record) throw invalidDocument(`Initiative ${item.id} record ${record.id} references a missing Team owner.`);
  }
}

function assertInsightAssignments(records, items, directory, organization) {
  const recordIds = new Set(records.map((record) => record.id));
  const itemIds = new Set(items.map((item) => item.id));
  const accountIds = new Set(directory.accounts.map((account) => account.id));
  const segmentIds = new Set(directory.segments.map((segment) => segment.id));
  const peopleIds = new Set(organization.people.map((person) => person.id));
  const invalid = records.find((record) => (record.ownerPersonId && !peopleIds.has(record.ownerPersonId))
    || (record.initiativeId && !itemIds.has(record.initiativeId))
    || record.customerIds.some((id) => !accountIds.has(id))
    || record.segmentIds.some((id) => !segmentIds.has(id))
    || record.relatedRecordIds.some((id) => !recordIds.has(id)));
  if (invalid) throw invalidDocument(`Insight record ${invalid.id} references a missing owner, customer, segment, initiative, or related record.`);
}

function integerInRange(value, min, max, fallback, label) {
  const resolved = value === undefined || value === null ? fallback : value;
  if (!Number.isInteger(resolved) || resolved < min || resolved > max) throw invalidDocument(`${label} must be an integer from ${min} to ${max}.`);
  return resolved;
}

function boundedText(value, limit, label) {
  const text = stringValue(value).trim();
  if (text.length > limit) throw invalidDocument(`${label} cannot exceed ${limit} characters.`);
  return text;
}

function normalizedOptionalDate(value, label) {
  const text = stringValue(value).trim();
  if (!text) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(new Date(`${text}T00:00:00.000Z`).getTime())) throw invalidDocument(`${label} must use YYYY-MM-DD.`);
  return text;
}

function normalizedRecordTimestamp(value, context, label) {
  if (validTimestamp(value)) return new Date(value).toISOString();
  if (context.legacy) return context.timestamp;
  throw invalidDocument(`${label} must be a valid timestamp.`);
}

function uniqueStringArray(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(stringValue).map((entry) => entry.trim()).filter(Boolean))];
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
