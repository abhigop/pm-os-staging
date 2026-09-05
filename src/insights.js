export const INSIGHT_TYPES = Object.freeze(["discovery", "research", "validation", "feedback", "support"]);

export const INSIGHT_TYPE_LABELS = Object.freeze({
  discovery: "Discovery",
  research: "Research study",
  validation: "Validation experiment",
  feedback: "Feedback signal",
  support: "Support case"
});

export const INSIGHT_STATUSES = Object.freeze({
  discovery: Object.freeze(["open", "researching", "validated", "rejected", "promoted"]),
  research: Object.freeze(["planned", "recruiting", "in-progress", "complete", "cancelled"]),
  validation: Object.freeze(["planned", "running", "complete", "cancelled"]),
  feedback: Object.freeze(["new", "triaged", "linked", "closed"]),
  support: Object.freeze(["new", "in-progress", "waiting", "resolved"])
});

export const INSIGHT_STATUS_LABELS = Object.freeze({
  open: "Open",
  researching: "Researching",
  validated: "Validated",
  rejected: "Rejected",
  promoted: "Promoted",
  planned: "Planned",
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
  resolved: "Resolved"
});

export const VALIDATION_DECISIONS = Object.freeze(["", "continue", "commit", "iterate", "stop"]);
export const VALIDATION_DECISION_LABELS = Object.freeze({
  "": "No decision",
  continue: "Continue learning",
  commit: "Commit",
  iterate: "Iterate",
  stop: "Stop"
});
export const SUPPORT_SEVERITIES = Object.freeze(["low", "medium", "high", "critical"]);
export const SUPPORT_SEVERITY_LABELS = Object.freeze({ low: "Low", medium: "Medium", high: "High", critical: "Critical" });

export const INSIGHT_SHARED_FIELDS = Object.freeze([
  "id", "type", "title", "status", "owner", "ownerPersonId", "customerIds", "segmentIds",
  "initiativeId", "relatedRecordIds", "tags", "version", "createdAt", "updatedAt", "updatedBy"
]);

export const INSIGHT_TYPE_FIELDS = Object.freeze({
  discovery: Object.freeze(["problem", "hypothesis", "confidence", "nextStep"]),
  research: Object.freeze(["objective", "questions", "method", "recruitmentTarget", "participantCount", "findings", "dueDate"]),
  validation: Object.freeze(["hypothesis", "method", "successMetric", "result", "decision", "decisionNotes", "dueDate"]),
  feedback: Object.freeze(["source", "sourceRef", "signal", "receivedAt", "urgency"]),
  support: Object.freeze(["source", "sourceRef", "issue", "customerImpact", "severity", "responseDueDate", "resolution"])
});

export const INSIGHT_MUTABLE_FIELDS = Object.freeze([
  "type", "title", "status", "owner", "ownerPersonId", "customerIds", "segmentIds", "initiativeId",
  "relatedRecordIds", "tags", ...new Set(Object.values(INSIGHT_TYPE_FIELDS).flat())
]);

const textLimits = Object.freeze({
  id: 200, title: 500, owner: 300, ownerPersonId: 200, initiativeId: 200,
  problem: 8000, hypothesis: 8000, nextStep: 8000, objective: 8000, method: 4000,
  findings: 16000, successMetric: 8000, result: 16000, decisionNotes: 8000,
  source: 500, sourceRef: 1000, signal: 16000, issue: 16000, customerImpact: 8000,
  resolution: 16000
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
  const type = INSIGHT_TYPES.includes(input.type) ? input.type : options.legacy ? "discovery" : "";
  if (!type) throw new InsightRecordError("Insight record type is invalid.");
  const id = boundedText(input.id || options.id || (options.legacy ? `legacy-insight-${Number(options.index || 0) + 1}` : ""), textLimits.id, "Insight id");
  if (!id) throw new InsightRecordError("Insight record requires an id.");
  const title = boundedText(input.title, textLimits.title, "Insight title");
  if (!title) throw new InsightRecordError("Insight title is required.");
  const statuses = INSIGHT_STATUSES[type];
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
          : normalizeSupport(input, base);
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
  const ids = new Set(records.map((record) => record.id));
  const linkedItems = new Set(records.filter((record) => record.type === "validation" && record.initiativeId).map((record) => record.initiativeId));
  for (const item of items) {
    if (linkedItems.has(item.id) || (!String(item.experiment || "").trim() && !String(item.decision || "").trim())) continue;
    const preferred = `legacy-validation-${item.id}`.slice(0, 200);
    let id = preferred;
    let suffix = 2;
    while (ids.has(id)) {
      const ending = `-${suffix++}`;
      id = `${preferred.slice(0, 200 - ending.length)}${ending}`;
    }
    ids.add(id);
    records.push(normalizeInsightRecord({
      id,
      type: "validation",
      title: `${item.title} validation`,
      status: item.decision ? "complete" : "running",
      owner: item.owner,
      ownerPersonId: item.pocPersonId,
      customerIds: item.customerIds,
      segmentIds: item.segmentIds,
      initiativeId: item.id,
      hypothesis: item.problem,
      method: item.experiment || "Legacy validation activity",
      successMetric: "",
      result: "",
      decision: "",
      decisionNotes: item.decision,
      dueDate: item.dueDate,
      version: 1,
      createdAt: item.updatedAt || options.now,
      updatedAt: item.updatedAt || options.now,
      updatedBy: item.updatedBy || options.updatedBy || "pm-os"
    }, { legacy: true, now: item.updatedAt || options.now, updatedBy: item.updatedBy || options.updatedBy }));
  }
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

export function buildSupportWorkspace(records) {
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
    critical: open.filter((record) => record.severity === "critical"),
    ownerLoad: [...ownerMap.values()].sort((a, b) => b.critical - a.critical || b.count - a.count || a.owner.localeCompare(b.owner)),
    metrics: { total: cases.length, open: open.length, critical: open.filter((record) => record.severity === "critical").length, overdue: open.filter((record) => record.responseDueDate && record.responseDueDate < new Date().toISOString().slice(0, 10)).length }
  };
}

export function buildInsightMemo(type, records, now = new Date()) {
  const date = new Date(now).toISOString().slice(0, 10);
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
    return memo(`# Validation Review - ${date}`, "Running", view.running, (record) => `${record.method || "Method not set"}; success: ${record.successMetric || "not set"}`, "Decisions", view.complete, (record) => record.decisionNotes || VALIDATION_DECISION_LABELS[record.decision]);
  }
  if (type === "feedback") {
    const view = buildFeedbackWorkspace(records);
    return [
      `# Feedback Digest - ${date}`, "", "## New and triaged signals",
      insightList(view.inbox, (record) => `${record.signal} [${record.tags.join(", ") || "untagged"}]`),
      "", "## Themes", view.themes.length ? view.themes.map((entry) => `- ${entry.theme}: ${entry.count}`).join("\n") : "- No explicit themes captured."
    ].join("\n");
  }
  const view = buildSupportWorkspace(records);
  return memo(`# Support Review - ${date}`, "Open cases", view.open, (record) => `${SUPPORT_SEVERITY_LABELS[record.severity]}; ${record.issue}`, "Resolved", view.cases.filter((record) => record.status === "resolved"), (record) => record.resolution || "Resolution not captured");
}

function normalizeDiscovery(input, base) {
  return { ...base, problem: text(input.problem, "problem"), hypothesis: text(input.hypothesis, "hypothesis"), confidence: clampNumber(input.confidence, 0, 1, 0.5), nextStep: text(input.nextStep, "nextStep") };
}

function normalizeResearch(input, base) {
  const questions = uniqueTexts(input.questions, 20, 2000, `Insight ${base.id} questions`);
  return { ...base, objective: text(input.objective, "objective"), questions, method: text(input.method, "method"), recruitmentTarget: integer(input.recruitmentTarget, 0, 10000, 0, `Insight ${base.id} recruitmentTarget`), participantCount: integer(input.participantCount, 0, 10000, 0, `Insight ${base.id} participantCount`), findings: text(input.findings, "findings"), dueDate: optionalDate(input.dueDate, `Insight ${base.id} dueDate`) };
}

function normalizeValidation(input, base) {
  return { ...base, hypothesis: text(input.hypothesis, "hypothesis"), method: text(input.method, "method"), successMetric: text(input.successMetric, "successMetric"), result: text(input.result, "result"), decision: VALIDATION_DECISIONS.includes(input.decision) ? input.decision : "", decisionNotes: text(input.decisionNotes, "decisionNotes"), dueDate: optionalDate(input.dueDate, `Insight ${base.id} dueDate`) };
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
function boundedText(value, limit, label) { const result = String(value ?? "").trim(); if (result.length > limit) throw new InsightRecordError(`${label} cannot exceed ${limit} characters.`); return result; }
function uniqueIds(value, label) { const values = [...new Set((Array.isArray(value) ? value : []).map((entry) => String(entry || "").trim()).filter(Boolean))]; if (values.length > 250 || values.some((entry) => entry.length > 200)) throw new InsightRecordError(`${label} must contain valid identifiers.`); return values; }
function uniqueTags(value) { const values = [...new Set((Array.isArray(value) ? value : String(value || "").split(",")).map((entry) => String(entry || "").trim().toLowerCase()).filter(Boolean))]; if (values.length > 50 || values.some((entry) => entry.length > 80)) throw new InsightRecordError("Insight tags are invalid."); return values; }
function uniqueTexts(value, max, limit, label) { const values = [...new Set((Array.isArray(value) ? value : String(value || "").split(/\r?\n/)).map((entry) => String(entry || "").trim()).filter(Boolean))]; if (values.length > max || values.some((entry) => entry.length > limit)) throw new InsightRecordError(`${label} are invalid.`); return values; }
function clampNumber(value, min, max, fallback) { const number = Number(value); return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback; }
function integer(value, min, max, fallback, label) { const number = value === "" || value === undefined || value === null ? fallback : Number(value); if (!Number.isInteger(number) || number < min || number > max) throw new InsightRecordError(`${label} must be an integer from ${min} to ${max}.`); return number; }
function optionalDate(value, label) { const text = String(value || "").trim(); if (!text) return ""; if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(new Date(`${text}T00:00:00.000Z`).getTime())) throw new InsightRecordError(`${label} must use YYYY-MM-DD.`); return text; }
function normalizedTimestamp(value) { const date = value instanceof Date ? value : new Date(value); if (Number.isNaN(date.getTime())) throw new InsightRecordError("Insight timestamp is invalid."); return date.toISOString(); }
function insightId(type) { return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }
