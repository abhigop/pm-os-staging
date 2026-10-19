import { localDateStamp } from "./local-date.js";

export const INSIGHT_TYPES = Object.freeze(["discovery", "research", "validation", "feedback", "support", "action", "decision"]);
export const ENABLEMENT_AREAS = Object.freeze(["Docs", "Support", "Sales", "Training", "Analytics", "Comms"]);

export const INSIGHT_TYPE_LABELS = Object.freeze({
  discovery: "Discovery",
  research: "Research study",
  validation: "Validation experiment",
  feedback: "Feedback signal",
  support: "Support case",
  action: "Action",
  decision: "Decision"
});

export const INSIGHT_STATUSES = Object.freeze({
  discovery: Object.freeze(["open", "researching", "validated", "rejected", "promoted"]),
  research: Object.freeze(["planned", "recruiting", "in-progress", "complete", "cancelled"]),
  validation: Object.freeze(["planned", "running", "complete", "cancelled", "unknown"]),
  feedback: Object.freeze(["new", "triaged", "linked", "closed"]),
  support: Object.freeze(["new", "in-progress", "waiting", "resolved"]),
  action: Object.freeze(["open", "done", "deferred"]),
  decision: Object.freeze(["pending", "decided", "revisit"])
});

export const INSIGHT_STATUS_LABELS = Object.freeze({
  open: "Open",
  researching: "Researching",
  validated: "Validated",
  rejected: "Rejected",
  promoted: "Promoted",
  planned: "Planned",
  unknown: "Not recorded",
  recruiting: "Recruiting",
  "in-progress": "In progress",
  complete: "Complete",
  cancelled: "Cancelled",
  running: "Running",
  new: "New",
  triaged: "Triaged",
  linked: "Linked",
  closed: "Closed",
  waiting: "Waiting",
  resolved: "Resolved",
  done: "Done",
  deferred: "Deferred",
  pending: "Pending",
  decided: "Decided",
  revisit: "Revisit"
});

export const VALIDATION_DECISIONS = Object.freeze(["", "continue", "commit", "iterate", "stop"]);
export const VALIDATION_DECISION_LABELS = Object.freeze({
  "": "No decision",
  continue: "Continue learning",
  commit: "Commit",
  iterate: "Iterate",
  stop: "Stop"
});
export function validationDecisionSummary(record, fallback = "No decision") {
  const outcome = record?.decision ? VALIDATION_DECISION_LABELS[record.decision] || record.decision : "";
  const notes = String(record?.decisionNotes || "");
  return [outcome, notes].filter(value => value.trim()).join(": ") || fallback;
}

export const SUPPORT_SEVERITIES = Object.freeze(["low", "medium", "high", "critical"]);
export const SUPPORT_SEVERITY_LABELS = Object.freeze({ low: "Low", medium: "Medium", high: "High", critical: "Critical" });

export const INSIGHT_SHARED_FIELDS = Object.freeze([
  "id", "type", "title", "status", "owner", "ownerPersonId", "customerIds", "segmentIds",
  "initiativeId", "relatedRecordIds", "tags", "version", "createdAt", "updatedAt", "updatedBy"
]);

export const INSIGHT_TYPE_FIELDS = Object.freeze({
  discovery: Object.freeze(["problem", "hypothesis", "confidence", "nextStep"]),
  research: Object.freeze(["objective", "questions", "method", "recruitmentTarget", "participantCount", "findings", "dueDate"]),
  validation: Object.freeze(["hypothesis", "method", "successMetric", "result", "decision", "decisionNotes", "dueDate", "legacyField"]),
  feedback: Object.freeze(["source", "sourceRef", "signal", "receivedAt", "urgency"]),
  support: Object.freeze(["source", "sourceRef", "issue", "customerImpact", "severity", "responseDueDate", "resolution"]),
  action: Object.freeze(["description", "dueDate", "sourceRecordId", "enablementArea", "completionEvidence", "legacyField"]),
  decision: Object.freeze(["question", "outcome", "rationale", "decidedAt", "legacyField"])
});

export const INSIGHT_MUTABLE_FIELDS = Object.freeze([
  "type", "title", "status", "owner", "ownerPersonId", "customerIds", "segmentIds", "initiativeId",
  "relatedRecordIds", "tags", ...new Set(Object.values(INSIGHT_TYPE_FIELDS).flat().filter((field) => field !== "legacyField"))
]);

const textLimits = Object.freeze({
  id: 200, title: 500, owner: 300, ownerPersonId: 200, initiativeId: 200,
  problem: 8000, hypothesis: 8000, nextStep: 8000, objective: 8000, method: 4000,
  findings: 16000, successMetric: 8000, result: 16000, decisionNotes: 8000,
  source: 500, sourceRef: 1000, signal: 16000, issue: 16000, customerImpact: 8000,
  resolution: 16000, description: 8000, sourceRecordId: 200, completionEvidence: 16000,
  question: 8000, outcome: 8000, rationale: 8000
});

export class InsightRecordError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "InsightRecordError";
    this.details = Object.freeze({ ...details });
  }
}

export function normalizeInsightRecord(input = {}, options = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new InsightRecordError("Insight record must be an object.");
  const now = normalizedTimestamp(options.now || input.updatedAt || new Date());
  const type = INSIGHT_TYPES.includes(input.type) ? input.type : options.legacy && !input.type ? "discovery" : "";
  if (!type) throw new InsightRecordError("Insight record type is invalid.");
  const id = boundedText(input.id || options.id || (options.legacy ? `legacy-insight-${Number(options.index || 0) + 1}` : ""), textLimits.id, "Insight id");
  if (!id) throw new InsightRecordError("Insight record requires an id.");
  const title = boundedText(input.title, textLimits.title, "Insight title");
  if (!title) throw new InsightRecordError("Insight title is required.");
  const statuses = INSIGHT_STATUSES[type];
  if (type === "decision" && input.status && !statuses.includes(input.status)) throw new InsightRecordError("Decision status is invalid.");
  const status = statuses.includes(input.status) ? input.status : statuses[0];
  const version = input.version === undefined && options.legacy ? 1 : input.version;
  if (!Number.isInteger(version) || version < 1) throw new InsightRecordError(`Insight ${id} version must be a positive integer.`);
  const createdAt = normalizedTimestamp(input.createdAt || now);
  const updatedBy = boundedText(input.updatedBy || options.updatedBy || "pm-os", 200, `Insight ${id} updatedBy`) || "pm-os";
  const base = {
    id,
    type,
    title,
    status,
    owner: boundedText(input.owner, textLimits.owner, `Insight ${id} owner`),
    ownerPersonId: boundedText(input.ownerPersonId, textLimits.ownerPersonId, `Insight ${id} ownerPersonId`),
    customerIds: uniqueIds(input.customerIds, `Insight ${id} customerIds`),
    segmentIds: uniqueIds(input.segmentIds, `Insight ${id} segmentIds`),
    initiativeId: boundedText(input.initiativeId, textLimits.initiativeId, `Insight ${id} initiativeId`),
    relatedRecordIds: uniqueIds(input.relatedRecordIds, `Insight ${id} relatedRecordIds`).filter((recordId) => recordId !== id),
    tags: uniqueTags(input.tags),
    version,
    createdAt,
    updatedAt: now,
    updatedBy
  };
  const record = type === "discovery" ? normalizeDiscovery(input, base)
    : type === "research" ? normalizeResearch(input, base)
      : type === "validation" ? normalizeValidation(input, base)
        : type === "feedback" ? normalizeFeedback(input, base)
          : type === "action" ? normalizeAction(input, base) : type === "decision" ? normalizeDecision(input, base) : normalizeSupport(input, base);
  if (new TextEncoder().encode(JSON.stringify(record)).length > 32768) throw new InsightRecordError(`Insight ${id} exceeds the 32 KiB payload limit.`);
  return record;
}

export function createInsightRecord(input, now = new Date(), actor = "pm-os", idFactory = insightId) {
  return normalizeInsightRecord({ ...input, id: input?.id || idFactory(input?.type || "insight"), version: 1, createdAt: now, updatedAt: now, updatedBy: actor }, { now, updatedBy: actor });
}

export function updateInsightRecord(records, id, patch, now = new Date(), actor = "pm-os") {
  let found = false;
  const next = records.map((record) => {
    if (record.id !== id) return record;
    found = true;
    const mutable = {};
    for (const field of INSIGHT_MUTABLE_FIELDS) if (Object.prototype.hasOwnProperty.call(patch || {}, field)) mutable[field] = patch[field];
    return normalizeInsightRecord({ ...record, ...mutable, id: record.id, version: record.version + 1, createdAt: record.createdAt, updatedAt: now, updatedBy: actor }, { now, updatedBy: actor });
  });
  if (!found) throw new InsightRecordError(`Insight record ${id} was not found.`, { id });
  return next;
}

export function deleteInsightRecord(records, id, now = new Date(), actor = "pm-os") {
  if (!records.some((record) => record.id === id)) throw new InsightRecordError(`Insight record ${id} was not found.`, { id });
  return records.filter((record) => record.id !== id).map((record) => record.relatedRecordIds.includes(id)
    ? normalizeInsightRecord({
      ...record,
      relatedRecordIds: record.relatedRecordIds.filter((relatedId) => relatedId !== id),
      version: record.version + 1,
      updatedAt: now,
      updatedBy: actor
    }, { now, updatedBy: actor })
    : record);
}

export function migrateLegacyValidationRecords(items = [], existing = [], options = {}) {
  const records = [...existing];
  const ids = new Set(records.map(record => record.id));
  for (const item of [...items].sort((a, b) => compareRecordIds(a.id, b.id))) {
    const method = String(item.experiment || "");
    const notes = String(item.decision || "");
    if ((!method.trim() && !notes.trim()) || records.some(record => record.type === "validation" && record.initiativeId === item.id && record.legacyField === "experiment")) continue;
    const oldPrefix = `legacy-validation-${item.id}`;
    const portableId = Array.from(oldPrefix).slice(0, 200).join("");
    const sqlPrefix = Array.from(oldPrefix).slice(0, 167).join("") + "-";
    const previousRecord = [...records].sort((a, b) => compareRecordIds(a.id, b.id)).find(record => record.type === "validation" && record.initiativeId === item.id
      && (record.id === portableId || record.id === oldPrefix.slice(0, 200) || (record.id.startsWith(sqlPrefix) && /^[a-f0-9]{32}$/.test(record.id.slice(sqlPrefix.length))))
      && record.method.trim() === method.trim() && (!notes.trim() || record.decisionNotes.trim() === notes.trim()));
    const previousIndex = previousRecord ? records.indexOf(previousRecord) : -1;
    if (previousIndex >= 0) {
      const previous = records[previousIndex];
      records[previousIndex] = normalizeInsightRecord({ ...previous, legacyField: "experiment", method, decisionNotes: notes.trim() ? notes : previous.decisionNotes }, { now: previous.updatedAt, updatedBy: previous.updatedBy });
      continue;
    }
    const prefix = `legacy:${Array.from(item.id).slice(0, 80).join("")}:validation:`;
    let ordinal = 1;
    while (ids.has(`${prefix}${ordinal}`)) ordinal += 1;
    const id = `${prefix}${ordinal}`;
    const now = item.updatedAt || options.now || "1970-01-01T00:00:00.000Z";
    records.push(normalizeInsightRecord({
      id, type: "validation", title: Array.from(`Validation: ${item.title}`).slice(0, 250).join(""), status: "unknown", legacyField: "experiment",
      owner: item.owner, ownerPersonId: item.pocPersonId, customerIds: item.customerIds, segmentIds: item.segmentIds, initiativeId: item.id,
      hypothesis: "", method, successMetric: "", result: "", decision: "", decisionNotes: notes, dueDate: "",
      version: 1, createdAt: item.createdAt || now, updatedAt: now, updatedBy: item.updatedBy || options.updatedBy || "pm-os"
    }, { now }));
    ids.add(id);
  }
  if (records.length > 5000) throw new InsightRecordError("Legacy migration would exceed 5,000 records. Preserve the original backup and reduce the workspace before importing.");
  return records;
}

export function insightRecordsOfType(records, type) {
  return records.filter((record) => record.type === type).sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt) || left.title.localeCompare(right.title));
}

export function filterInsightRecords(records, { type = "", query = "", status = "" } = {}) {
  const term = String(query || "").trim().toLowerCase();
  return records.filter((record) => (!type || record.type === type) && (!status || record.status === status) && (!term || insightSearchText(record).includes(term)));
}

export function buildDiscoveryWorkspace(records) {
  const discoveries = insightRecordsOfType(records, "discovery");
  const research = insightRecordsOfType(records, "research");
  const validation = insightRecordsOfType(records, "validation");
  const linked = (source, targets) => targets.filter((target) => source.relatedRecordIds.includes(target.id) || target.relatedRecordIds.includes(source.id));
  return {
    records: discoveries,
    active: discoveries.filter((record) => ["open", "researching"].includes(record.status)),
    decided: discoveries.filter((record) => ["validated", "rejected", "promoted"].includes(record.status)),
    researchByDiscovery: new Map(discoveries.map((record) => [record.id, linked(record, research)])),
    validationByDiscovery: new Map(discoveries.map((record) => [record.id, linked(record, validation)])),
    metrics: {
      total: discoveries.length,
      active: discoveries.filter((record) => ["open", "researching"].includes(record.status)).length,
      validated: discoveries.filter((record) => ["validated", "promoted"].includes(record.status)).length,
      needsExperiment: discoveries.filter((record) => ["open", "researching", "validated"].includes(record.status) && !linked(record, validation).length).length
    }
  };
}

export function buildResearchWorkspace(records) {
  const studies = insightRecordsOfType(records, "research");
  return {
    studies,
    planned: studies.filter((record) => ["planned", "recruiting"].includes(record.status)),
    active: studies.filter((record) => record.status === "in-progress"),
    complete: studies.filter((record) => record.status === "complete"),
    cancelled: studies.filter((record) => record.status === "cancelled"),
    metrics: {
      studies: studies.length,
      recruiting: studies.filter((record) => record.status === "recruiting").reduce((sum, record) => sum + Math.max(0, record.recruitmentTarget - record.participantCount), 0),
      active: studies.filter((record) => record.status === "in-progress").length,
      findings: studies.filter((record) => record.findings).length
    }
  };
}

export function buildValidationWorkspace(records) {
  const experiments = insightRecordsOfType(records, "validation");
  const discoveries = insightRecordsOfType(records, "discovery");
  const linkedValidationIds = new Set(experiments.flatMap((record) => record.relatedRecordIds));
  const evidenceGaps = discoveries.filter((record) => ["open", "researching", "validated"].includes(record.status)
    && !linkedValidationIds.has(record.id)
    && !experiments.some((experiment) => record.relatedRecordIds.includes(experiment.id)));
  return {
    experiments,
    planned: experiments.filter((record) => record.status === "planned"),
    unknown: experiments.filter((record) => record.status === "unknown"),
    cancelled: experiments.filter((record) => record.status === "cancelled"),
    running: experiments.filter((record) => record.status === "running"),
    decisionReady: experiments.filter((record) => record.status === "complete" && !record.decision && !record.decisionNotes),
    complete: experiments.filter((record) => record.status === "complete" && (record.decision || record.decisionNotes)),
    evidenceGaps,
    metrics: {
      experiments: experiments.length,
      running: experiments.filter((record) => record.status === "running").length,
      decisionReady: experiments.filter((record) => record.status === "complete" && !record.decision && !record.decisionNotes).length,
      evidenceGaps: evidenceGaps.length
    }
  };
}

export function buildFeedbackWorkspace(records) {
  const signals = insightRecordsOfType(records, "feedback");
  const themeCounts = new Map();
  signals.forEach((record) => record.tags.forEach((tag) => themeCounts.set(tag, (themeCounts.get(tag) || 0) + 1)));
  const themes = [...themeCounts].map(([theme, count]) => ({ theme, count })).sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme));
  return {
    signals,
    inbox: signals.filter((record) => ["new", "triaged"].includes(record.status)),
    themes,
    metrics: { total: signals.length, new: signals.filter((record) => record.status === "new").length, urgent: signals.filter((record) => record.urgency >= 4).length, themes: themes.length }
  };
}

export function buildSupportWorkspace(records, now = new Date()) {
  const today = localDateStamp(now);
  const cases = insightRecordsOfType(records, "support");
  const open = cases.filter((record) => record.status !== "resolved");
  const ownerMap = new Map();
  open.forEach((record) => {
    const owner = record.owner || "Unassigned";
    const entry = ownerMap.get(owner) || { owner, count: 0, critical: 0, cases: [] };
    entry.count += 1;
    entry.critical += record.severity === "critical" ? 1 : 0;
    entry.cases.push(record.title);
    ownerMap.set(owner, entry);
  });
  return {
    cases,
    open,
    resolved: cases.filter((record) => record.status === "resolved"),
    critical: open.filter((record) => record.severity === "critical"),
    ownerLoad: [...ownerMap.values()].sort((a, b) => b.critical - a.critical || b.count - a.count || a.owner.localeCompare(b.owner)),
    metrics: { total: cases.length, open: open.length, critical: open.filter((record) => record.severity === "critical").length, overdue: open.filter((record) => record.responseDueDate && record.responseDueDate < today).length }
  };
}

export function buildInsightMemo(type, records, now = new Date()) {
  const date = localDateStamp(new Date(now));
  if (type === "action") {
    const actions = insightRecordsOfType(records, "action");
    return memo(`# Action Review - ${date}`, "Open actions", actions.filter((record) => record.status === "open"), (record) => `${record.description || "Work not described"}; due ${record.dueDate || "not set"}`, "History", actions.filter((record) => record.status !== "open"), (record) => `${INSIGHT_STATUS_LABELS[record.status]}; ${record.completionEvidence || "No completion evidence recorded"}`);
  }
  if (type === "decision") {
    const decisions = insightRecordsOfType(records, "decision");
    return memo(`# Decision Review - ${date}`, "Pending and revisit", decisions.filter((record) => record.status !== "decided"), (record) => record.question || "Question not captured", "Decision history", decisions.filter((record) => record.status === "decided"), (record) => `${record.outcome}; rationale: ${record.rationale || "not captured"}; date: ${record.decidedAt || "not captured"}`);
  }
  if (type === "discovery") {
    const view = buildDiscoveryWorkspace(records);
    return memo(`# Discovery Review - ${date}`, "Active opportunities", view.active, (record) => `${record.problem || "Problem not captured"}; hypothesis: ${record.hypothesis || "not captured"}`, "Decided", view.decided, (record) => INSIGHT_STATUS_LABELS[record.status]);
  }
  if (type === "research") {
    const view = buildResearchWorkspace(records);
    return memo(`# Research Plan - ${date}`, "Planned and recruiting", view.planned, (record) => `${record.method || "Method not set"}; recruit ${record.recruitmentTarget}`, "Findings", view.complete, (record) => record.findings || "No findings captured");
  }
  if (type === "validation") {
    const view = buildValidationWorkspace(records);
    const sections = [["Planned", view.planned], ["Running", view.running], ["Status not recorded", view.unknown], ["Decision ready", view.decisionReady], ["Completed outcomes", view.complete], ["Cancelled history", view.cancelled]];
    return [`# Validation Review - ${date}`, ...sections.flatMap(([title, entries]) => ["", `## ${title}`, entries.length ? entries.map(record => `- ${record.title} [captured source: ${record.id}]: method: ${record.method || "not recorded"}; success metric: ${record.successMetric || "not recorded"}; result: ${record.result || "not recorded"}; decision: ${validationDecisionSummary(record, "not recorded")}`).join("\n") : "- None recorded."])].join("\n");
  }
  if (type === "feedback") {
    const view = buildFeedbackWorkspace(records);
    return [
      `# Feedback Digest - ${date}`, "", "## New and triaged signals",
      insightList(view.inbox, (record) => `${record.signal} [${record.tags.join(", ") || "untagged"}]`),
      "", "## Themes", view.themes.length ? view.themes.map((entry) => `- ${entry.theme}: ${entry.count}`).join("\n") : "- No explicit themes captured."
    ].join("\n");
  }
  const view = buildSupportWorkspace(records, new Date(now));
  return memo(`# Support Review - ${date}`, "Open cases", view.open, (record) => `${SUPPORT_SEVERITY_LABELS[record.severity]}; ${record.issue}`, "Resolved", view.cases.filter((record) => record.status === "resolved"), (record) => record.resolution || "Resolution not captured");
}

export function migrateLegacyWorkRecords(items = [], existing = [], options = {}) {
  const records = [...existing];
  const ids = new Set(records.map((record) => record.id));
  for (const item of [...items].sort((a, b) => compareRecordIds(a.id, b.id))) {
    for (const [field, type] of [["nextStep", "action"], ["decision", "decision"]]) {
      const content = String(item[field] || "");
      if (!content.trim() || records.some((record) => record.type === type && record.initiativeId === item.id && record.legacyField === field)) continue;
      const prefix = `legacy:${Array.from(item.id).slice(0, 80).join("")}:${type}:`;
      let ordinal = 1;
      while (ids.has(`${prefix}${ordinal}`)) ordinal += 1;
      const id = `${prefix}${ordinal}`;
      const now = item.updatedAt || options.now || "1970-01-01T00:00:00.000Z";
      const record = normalizeInsightRecord({
        id, type, title: Array.from(type === "action" ? content : `Decision: ${item.title}`).slice(0, 250).join(""),
        status: type === "action" ? "open" : "decided", legacyField: field,
        initiativeId: item.id, owner: item.owner, ownerPersonId: item.pocPersonId,
        customerIds: item.customerIds, segmentIds: item.segmentIds,
        ...(type === "action" ? { description: content } : { question: "", outcome: content, rationale: "", decidedAt: "" }),
        version: 1, createdAt: item.createdAt || now, updatedAt: now, updatedBy: item.updatedBy || options.updatedBy || "pm-os"
      }, { now });
      ids.add(id);
      records.push(record);
    }
  }
  if (records.length > 5000) throw new InsightRecordError("Legacy migration would exceed 5,000 records. Preserve the original backup and reduce the workspace before importing.");
  return records;
}

// Display summaries stay outside portable item normalization. Complete text
// remains in the independently versioned records and their active/history lists.
export function projectCanonicalInitiativeRecords(items = [], records = []) {
  const byItem = new Map();
  for (const record of records) {
    if (!record.initiativeId || !["action", "decision", "validation"].includes(record.type)) continue;
    if (!byItem.has(record.initiativeId)) byItem.set(record.initiativeId, []);
    byItem.get(record.initiativeId).push(record);
  }
  return items.map((item) => {
    const linked = byItem.get(item.id) || [];
    const open = linked.filter((record) => record.type === "action" && record.status === "open")
      .sort((a, b) => compareRecordIds(a.dueDate || "9999-12-31", b.dueDate || "9999-12-31") || compareRecordIds(a.createdAt, b.createdAt) || compareRecordIds(a.id, b.id));
    const decisions = linked.filter((record) => record.type === "decision")
      .sort((a, b) => compareRecordIds(b.updatedAt, a.updatedAt) || compareRecordIds(a.id, b.id));
    const pending = decisions.filter((record) => record.status !== "decided");
    const decided = decisions.find((record) => record.status === "decided");
    const validationRecords = linked.filter(record => record.type === "validation");
    const currentValidation = validationRecords.filter(record => ["planned", "running", "unknown"].includes(record.status))
      .sort((a, b) => compareRecordIds(a.dueDate || "9999-12-31", b.dueDate || "9999-12-31") || compareRecordIds(a.id, b.id));
    const experiment = currentValidation.filter(record => record.method || record.successMetric).map(record => `${record.title}: ${record.method || record.successMetric}`).join("\n");
    const lastWorkUpdatedAt = linked.reduce((latest, record) => record.updatedAt > latest ? record.updatedAt : latest, "");
    return { ...item, nextStep: open[0]?.description || open[0]?.title || "", decision: pending.length ? "" : decided?.outcome || "",
      experiment, decisionRecords: decisions.map(record => ({ ...record })), validationRecords, currentValidationId: currentValidation[0]?.id || "", activeValidationCount: currentValidation.filter(record => record.status !== "unknown").length,
      currentActionId: open[0]?.id || "", currentDecisionId: pending[0]?.id || decided?.id || "", openActionCount: open.length, pendingDecisionCount: pending.length, lastWorkUpdatedAt };
  });
}

function compareRecordIds(left = "", right = "") {
  const a = Array.from(String(left), (char) => char.codePointAt(0));
  const b = Array.from(String(right), (char) => char.codePointAt(0));
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}

function normalizeDecision(input, base) {
  const provenance = legacyField(input.legacyField, "decision");
  const outcome = provenance ? preservedLegacyText(input.outcome, "outcome") : text(input.outcome, "outcome");
  if (base.status === "decided" && !outcome.trim()) throw new InsightRecordError("Record an outcome before marking a decision Decided.");
  return { ...base, question: text(input.question, "question"), outcome, rationale: text(input.rationale, "rationale"), decidedAt: optionalDate(input.decidedAt, `Decision ${base.id} decidedAt`), legacyField: provenance };
}

function preservedLegacyText(value, field) {
  const result = String(value ?? "");
  if (Array.from(result).length > textLimits[field]) throw new InsightRecordError(`Legacy ${field} exceeds its character limit.`);
  return result;
}

function legacyField(value, expected) {
  const field = String(value || "").trim();
  if (field && field !== expected) throw new InsightRecordError("Legacy record provenance is invalid.");
  return field;
}

function normalizeAction(input, base) {
  const enablementArea = String(input.enablementArea || "").trim();
  if (enablementArea && !ENABLEMENT_AREAS.includes(enablementArea)) throw new InsightRecordError("Enablement area is invalid.");
  const completionEvidence = text(input.completionEvidence, "completionEvidence");
  if (enablementArea && base.status === "done" && (!(base.owner || base.ownerPersonId) || !completionEvidence)) {
    throw new InsightRecordError("To complete an enablement action, assign an owner and record completion evidence.");
  }
  const provenance = legacyField(input.legacyField, "nextStep");
  return { ...base, description: provenance ? preservedLegacyText(input.description, "description") : text(input.description, "description"), dueDate: optionalDate(input.dueDate, `Action ${base.id} dueDate`), sourceRecordId: text(input.sourceRecordId, "sourceRecordId"), enablementArea, completionEvidence, legacyField: provenance };
}

function normalizeDiscovery(input, base) {
  return { ...base, problem: text(input.problem, "problem"), hypothesis: text(input.hypothesis, "hypothesis"), confidence: clampNumber(input.confidence, 0, 1, 0.5), nextStep: text(input.nextStep, "nextStep") };
}

function normalizeResearch(input, base) {
  const questions = uniqueTexts(input.questions, 20, 2000, `Insight ${base.id} questions`);
  return { ...base, objective: text(input.objective, "objective"), questions, method: text(input.method, "method"), recruitmentTarget: integer(input.recruitmentTarget, 0, 10000, 0, `Insight ${base.id} recruitmentTarget`), participantCount: integer(input.participantCount, 0, 10000, 0, `Insight ${base.id} participantCount`), findings: text(input.findings, "findings"), dueDate: optionalDate(input.dueDate, `Insight ${base.id} dueDate`) };
}

function normalizeValidation(input, base) {
  const provenance = legacyField(input.legacyField, "experiment");
  return { ...base, hypothesis: text(input.hypothesis, "hypothesis"), method: provenance ? preservedLegacyText(input.method, "method") : text(input.method, "method"), successMetric: text(input.successMetric, "successMetric"), result: text(input.result, "result"), decision: VALIDATION_DECISIONS.includes(input.decision) ? input.decision : "", decisionNotes: provenance ? preservedLegacyText(input.decisionNotes, "decisionNotes") : text(input.decisionNotes, "decisionNotes"), dueDate: optionalDate(input.dueDate, `Insight ${base.id} dueDate`), legacyField: provenance };
}

function normalizeFeedback(input, base) {
  return { ...base, source: text(input.source, "source"), sourceRef: text(input.sourceRef, "sourceRef"), signal: text(input.signal, "signal"), receivedAt: optionalDate(input.receivedAt, `Insight ${base.id} receivedAt`), urgency: integer(input.urgency, 1, 5, 3, `Insight ${base.id} urgency`) };
}

function normalizeSupport(input, base) {
  return { ...base, source: text(input.source, "source"), sourceRef: text(input.sourceRef, "sourceRef"), issue: text(input.issue, "issue"), customerImpact: text(input.customerImpact, "customerImpact"), severity: SUPPORT_SEVERITIES.includes(input.severity) ? input.severity : "medium", responseDueDate: optionalDate(input.responseDueDate, `Insight ${base.id} responseDueDate`), resolution: text(input.resolution, "resolution") };
}

function insightSearchText(record) {
  return Object.values(record).flatMap((value) => Array.isArray(value) ? value : typeof value === "string" || typeof value === "number" ? [value] : []).join(" ").toLowerCase();
}

function insightList(records, detail) {
  return records.length ? records.map((record) => `- ${record.title}: ${detail(record)}`).join("\n") : "- None captured.";
}

function memo(title, firstTitle, first, firstDetail, secondTitle, second, secondDetail) {
  return [title, "", `## ${firstTitle}`, insightList(first, firstDetail), "", `## ${secondTitle}`, insightList(second, secondDetail)].join("\n");
}

function text(value, field) { return boundedText(value, textLimits[field] || 8000, `Insight ${field}`); }
function boundedText(value, limit, label) { const result = String(value ?? "").trim(); if (Array.from(result).length > limit) throw new InsightRecordError(`${label} cannot exceed ${limit} characters.`); return result; }
function uniqueIds(value, label) { const values = [...new Set((Array.isArray(value) ? value : []).map((entry) => String(entry || "").trim()).filter(Boolean))]; if (values.length > 250 || values.some((entry) => entry.length > 200)) throw new InsightRecordError(`${label} must contain valid identifiers.`); return values; }
function uniqueTags(value) { const values = [...new Set((Array.isArray(value) ? value : String(value || "").split(",")).map((entry) => String(entry || "").trim().toLowerCase()).filter(Boolean))]; if (values.length > 50 || values.some((entry) => entry.length > 80)) throw new InsightRecordError("Insight tags are invalid."); return values; }
function uniqueTexts(value, max, limit, label) { const values = [...new Set((Array.isArray(value) ? value : String(value || "").split(/\r?\n/)).map((entry) => String(entry || "").trim()).filter(Boolean))]; if (values.length > max || values.some((entry) => entry.length > limit)) throw new InsightRecordError(`${label} are invalid.`); return values; }
function clampNumber(value, min, max, fallback) { const number = Number(value); return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback; }
function integer(value, min, max, fallback, label) { const number = value === "" || value === undefined || value === null ? fallback : Number(value); if (!Number.isInteger(number) || number < min || number > max) throw new InsightRecordError(`${label} must be an integer from ${min} to ${max}.`); return number; }
function optionalDate(value, label) { const text = String(value || "").trim(); if (!text) return ""; const date = new Date(`${text}T00:00:00.000Z`); if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(date.getTime()) || date.getUTCFullYear() < 1 || date.toISOString().slice(0, 10) !== text) throw new InsightRecordError(`${label} must use a valid YYYY-MM-DD date.`); return text; }
function normalizedTimestamp(value) { const date = value instanceof Date ? value : new Date(value); if (Number.isNaN(date.getTime())) throw new InsightRecordError("Insight timestamp is invalid."); return date.toISOString(); }
function insightId(type) { return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }
