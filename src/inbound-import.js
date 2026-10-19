import { createItem, importGitHubIssueMarkdown } from "./domain.js";
import { migrateLegacyValidationRecords, migrateLegacyWorkRecords } from "./insights.js";
import { decodeWorkspaceDocument } from "./workspace-document.js";
import { defaultInitiativeWorkflow } from "./workflow.js";

export const IMPORT_FIELDS = Object.freeze([
  { key: "title", label: "Title", required: true },
  { key: "customer", label: "Customer / segment", required: false },
  { key: "problem", label: "Problem", required: false },
  { key: "owner", label: "Owner", required: false },
  { key: "status", label: "Status", required: false },
  { key: "dueDate", label: "Due date", required: false }
].map(Object.freeze));
export const IMPORT_LIMITS = Object.freeze({ rows: 5000, columns: 200, bytes: 10 * 1024 * 1024 });
const FALLBACK_TIME = "1970-01-01T00:00:00.000Z";
const nativeFields = ["id", "title", "customer", "customerIds", "segmentIds", "problem", "objective", "primaryMetric", "metricTarget", "metricReviewDate", "owner", "pocPersonId", "orgUnitId", "status", "statusId", "reach", "impact", "confidence", "effort", "startDate", "dueDate", "nextStep", "risks", "risk", "dependencies", "experiment", "decision", "priority", "priorityLevelId", "priorityInputs", "updatedAt"];
const jsonArrays = new Set(["customerIds", "segmentIds", "risks", "dependencies"]);
const jsonObjects = new Set(["priority", "priorityInputs"]);
const numericRanges = { reach: [0, 100000], impact: [1, 5], confidence: [0.1, 1], effort: [1, 8] };
const aliases = {
  title: ["title", "summary", "issue title", "name"], customer: ["customer", "customer / segment", "segment"],
  problem: ["problem", "description", "body"], owner: ["owner", "assignee", "assignees"],
  status: ["status", "state"], dueDate: ["duedate", "due date", "due"]
};
const textValue = value => String(value ?? "").trim();
const titleKey = value => textValue(value).normalize("NFKC").replace(/\s+/g, " ").toLowerCase();
const plain = value => value !== null && typeof value === "object" && !Array.isArray(value);
const freeze = value => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

/** Parse only local bytes. Workspace backups deliberately remain on the replacement path. */
export function parseInboundFile(text, fileName = "") {
  const source = String(text ?? "").replace(/^\uFEFF/, "");
  if (new TextEncoder().encode(source).length > IMPORT_LIMITS.bytes) throw new Error("Import exceeds the 10 MiB source limit.");
  if (!source.trim()) throw new Error("The import file is empty.");
  let format, headers, rows, warnings = [], sourceNotes = [];
  const knownTextExtension = /\.(csv|md|markdown)$/i.test(fileName);
  if (/\.json$/i.test(fileName) || !knownTextExtension && /^[\[{]/.test(source.trim())) {
    let value;
    try { value = JSON.parse(source); } catch { throw new Error("The import file contains malformed JSON."); }
    if (plain(value) && (typeof value.schema === "string" && value.schema.startsWith("pm-os.workspace.") || Array.isArray(value.items))) return null;
    if (!Array.isArray(value)) throw new Error("GitHub CLI JSON must be an array of issue objects, or use a complete workspace JSON backup.");
    format = "github-json";
    headers = ["title", "problem", "owner", "status"];
    const supported = new Set(["number", "title", "body", "assignees", "labels", "state", "url"]);
    const ignored = new Set();
    rows = value.map((issue, index) => {
      if (!plain(issue)) throw new Error(`GitHub issue ${index + 1} must be an object.`);
      for (const key of Object.keys(issue)) if (!supported.has(key)) ignored.add(key);
      for (const field of ["title", "body", "state", "url"]) if (issue[field] != null && typeof issue[field] !== "string") throw new Error(`GitHub issue ${index + 1}: ${field} must be text.`);
      if (issue.number != null && (!Number.isInteger(issue.number) || issue.number < 1)) throw new Error(`GitHub issue ${index + 1}: number must be a positive integer.`);
      const list = (field, keys) => {
        if (issue[field] == null) return [];
        if (!Array.isArray(issue[field])) throw new Error(`GitHub issue ${index + 1}: ${field} must be an array.`);
        return issue[field].map(entry => {
          const result = typeof entry === "string" ? entry : plain(entry) ? keys.map(key => entry[key]).find(v => typeof v === "string" && v.trim()) : null;
          if (!result) throw new Error(`GitHub issue ${index + 1}: ${field} contains an invalid value.`);
          return result;
        });
      };
      const assignees = list("assignees", ["login", "name"]), labels = list("labels", ["name"]);
      const provenance = ["Imported from a local GitHub CLI JSON file.", issue.number != null ? `GitHub issue: #${issue.number}` : "", issue.url ? `Source URL: ${issue.url}` : "", issue.state ? `Source state: ${issue.state}` : "", labels.length ? `Source labels: ${labels.join(", ")}` : "", assignees.length ? `Source assignees: ${assignees.join(", ")}` : ""].filter(Boolean).join("\n");
      sourceNotes.push(provenance);
      const state = textValue(issue.state);
      return [issue.title || "", [issue.body || "", provenance].filter(Boolean).join("\n\n"), assignees.join(", "), /^open$/i.test(state) ? "intake" : /^closed$/i.test(state) ? "shipped" : state];
    });
    if (ignored.size) warnings.push(`Unsupported GitHub issue fields are not imported: ${[...ignored].join(", ")}.`);
    warnings.push("GitHub numbers, URLs, labels, assignees and source state are retained as source text in Problem. This import does not contact GitHub or verify issue state.");
    warnings.push("GitHub OPEN maps to the workspace intake category; CLOSED maps to the shipped category. A closed GitHub issue is not independently verified as a shipped product change. Review the mapped status before importing.");
  } else if (/\.(md|markdown)$/i.test(fileName) || !/\.csv$/i.test(fileName) && /^#\s/m.test(source)) {
    format = "markdown";
    headers = nativeFields.slice();
    rows = source.split(/\r?\n\s*---\s*\r?\n/g).filter(part => part.trim()).map(part => {
      if (!/^#\s+\S/m.test(part)) throw new Error("Each Markdown issue must have a non-empty # title heading.");
      const item = importGitHubIssueMarkdown(part)[0];
      // The compatibility parser supplies score defaults and timestamps. Only authored
      // score lines enter this boundary; generated metadata is deliberately discarded.
      const record = { ...item, id: "", updatedAt: "", priority: {}, priorityInputs: {} };
      const ops = part.match(/(?:^|\n)##\s+Product Ops\s*\r?\n([\s\S]*?)(?=\n##\s+|$)/i)?.[1] || "";
      const supportedSections = new Set(["customer / segment", "problem", "product ops", "next step", "risks", "risk / dependency", "dependencies", "experiment", "decision"]);
      const ignoredSections = [...part.matchAll(/^##\s+(.+)$/gm)].map(match => match[1].trim()).filter(heading => !supportedSections.has(heading.toLowerCase()));
      const supportedOps = new Set(["status", "owner", "planned start", "due date", "reach", "impact", "confidence", "effort"]);
      const ignoredOps = [...ops.matchAll(/^-\s*([^:]+):/gm)].map(match => match[1].trim()).filter(field => !supportedOps.has(field.toLowerCase()));
      if (ignoredSections.length) warnings.push(`Markdown sections not imported: ${ignoredSections.join(", ")}.`);
      if (ignoredOps.length) warnings.push(`Markdown Product Ops fields not imported: ${ignoredOps.join(", ")}.`);
      record.status = ops.match(/^-\s*Status:\s*(.*)$/im)?.[1]?.trim() || "";
      record.statusId = "";
      for (const field of Object.keys(numericRanges)) record[field] = ops.match(new RegExp(`^-\\s*${field}:\\s*(.*)$`, "im"))?.[1]?.trim() || "";
      delete record.priorityInputs;
      for (const field of ["risks", "dependencies"]) record[field] = record[field].map(entry => ({ ...entry, createdAt: FALLBACK_TIME, updatedAt: FALLBACK_TIME }));
      return headers.map(key => serialize(record[key]));
    });
    warnings.push("Markdown adds initiatives; original initiative, person and audience IDs are not restored. Dependency targets are retained as external descriptions. Only explicitly supplied scores are imported.");
  } else {
    format = "csv";
    const parsed = parseCsv(source);
    headers = parsed.shift().map(textValue);
    rows = parsed;
    if (!headers.some(Boolean)) throw new Error("CSV requires a header row.");
    const seen = new Set();
    for (const header of headers) {
      if (header && seen.has(header)) throw new Error(`CSV header "${header}" is repeated; give columns distinct names before importing.`);
      seen.add(header);
    }
    rows.forEach((row, index) => { if (row.length !== headers.length) throw new Error(`CSV row ${index + 1} has ${row.length} cells; expected ${headers.length}.`); });
  }
  if (!rows.length) throw new Error("The import contains no data rows.");
  if (rows.length > IMPORT_LIMITS.rows) throw new Error("Import exceeds the 5,000 data-row limit.");
  if (headers.length > IMPORT_LIMITS.columns) throw new Error("Import exceeds the 200-column limit.");
  const mapping = Object.fromEntries(IMPORT_FIELDS.map(({ key }) => [key, headers.findIndex(header => aliases[key].includes(header.toLowerCase()))]));
  return freeze({ format, headers, rows, mapping, idSeed: hash(source), warnings, sourceNotes });
}

/** Row IDs are 1-based data-row numbers, independent of quoted CSV line breaks. */
export function buildInboundPreview(model, options = {}) {
  return prepare(model, options).preview;
}

export function buildInboundWorkspace(model, options = {}) {
  const result = prepare(model, options);
  if (!result.preview.valid) throw new Error(result.preview.errors.map(error => `${error.row ? `Row ${error.row}: ` : ""}${error.message}`).join("\n"));
  return { workspace: result.workspace, addedCount: result.preview.addedCount, skippedCount: result.preview.skippedCount, changes: result.changes, preview: result.preview };
}

function prepare(model, { mapping = model.mapping, workspace, importDuplicates = [], now = FALLBACK_TIME } = {}) {
  if (!workspace || !Array.isArray(workspace.items)) throw new Error("A current workspace snapshot is required.");
  const timestamp = new Date(now).toISOString();
  const chosen = { ...model.mapping, ...mapping };
  const errors = [], warnings = [...(model.warnings || [])], overrides = new Set(importDuplicates.map(Number));
  for (const { key, required } of IMPORT_FIELDS) {
    const index = chosen[key];
    if (!Number.isInteger(index) || index < -1 || index >= model.headers.length || required && index === -1) errors.push({ row: 0, message: `${key} requires ${required ? "a valid source column" : "a source column or Not mapped"}.` });
  }
  const mappedIndices = new Set(Object.values(chosen).filter(index => index >= 0));
  const ignoredHeaders = model.headers.filter((header, index) => !nativeFields.includes(header) && !mappedIndices.has(index));
  const inspectedFields = [...new Set([...model.headers.filter(header => nativeFields.includes(header)), ...IMPORT_FIELDS.filter(({ key }) => chosen[key] >= 0).map(({ key }) => key)])];
  if (ignoredHeaders.length) warnings.push(`Unmapped columns are not imported: ${ignoredHeaders.join(", ")}.`);
  warnings.push("This additive import preserves existing work, records, saved documents and workspace settings. Linked customer, segment, person and team IDs must already exist. Blank scores remain unscored.");
  const titles = new Set(workspace.items.map(item => titleKey(item.title)));
  const usedIds = new Set(workspace.items.map(item => item.id));
  const references = {
    people: new Set((workspace.organization?.people || []).map(person => person.id)),
    units: new Set((workspace.organization?.units || []).map(unit => unit.id)),
    accounts: new Set((workspace.customerDirectory?.accounts || []).map(account => account.id)),
    segments: new Set((workspace.customerDirectory?.segments || []).map(segment => segment.id))
  };
  const statuses = (workspace.workflow || defaultInitiativeWorkflow()).statuses;
  const entries = model.rows.map((cells, index) => {
    const raw = {};
    model.headers.forEach((header, column) => { if (nativeFields.includes(header)) raw[header] = textValue(cells[column]); });
    for (const { key } of IMPORT_FIELDS) raw[key] = chosen[key] >= 0 ? textValue(cells[chosen[key]]) : "";
    if (chosen.status !== model.mapping.status) raw.statusId = "";
    if (model.sourceNotes?.[index] && !raw.problem.includes(model.sourceNotes[index])) raw.problem = [raw.problem, model.sourceNotes[index]].filter(Boolean).join("\n\n");
    const key = titleKey(raw.title), duplicate = Boolean(key && titles.has(key));
    if (key) titles.add(key);
    const selected = !duplicate || overrides.has(index + 1);
    const entry = { row: index + 1, title: raw.title, duplicate, selected, valid: true, errors: [], warnings: [], itemId: "", statusLabel: "", raw };
    if (!raw.title) entry.errors.push("Title is required.");
    try {
      for (const field of [...jsonArrays, ...jsonObjects]) {
        if (!raw[field]) { delete raw[field]; continue; }
        try { raw[field] = JSON.parse(raw[field]); } catch { throw new Error(`${field} must contain valid JSON.`); }
        if (jsonArrays.has(field) ? !Array.isArray(raw[field]) : !plain(raw[field])) throw new Error(`${field} must be a JSON ${jsonArrays.has(field) ? "array" : "object"}.`);
      }
      // Check authored IDs before domain normalization can coerce or drop them.
      // Current workspace decoding does not validate every initiative directory link.
      assertDirectoryReference(raw.pocPersonId, references.people, "pocPersonId");
      assertDirectoryReference(raw.orgUnitId, references.units, "orgUnitId");
      for (const id of raw.customerIds || []) assertDirectoryReference(id, references.accounts, "customerIds", true);
      for (const id of raw.segmentIds || []) assertDirectoryReference(id, references.segments, "segmentIds", true);
      for (const [field, [min, max]] of Object.entries(numericRanges)) {
        if (!raw[field]) { delete raw[field]; continue; }
        if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw[field]) || !Number.isFinite(Number(raw[field])) || Number(raw[field]) < min || Number(raw[field]) > max) throw new Error(`${field} must be a finite number from ${min} to ${max}.`);
        raw[field] = Number(raw[field]);
      }
      for (const field of ["dueDate", "startDate", "metricReviewDate"]) if (raw[field] && !validPlainDate(raw[field])) throw new Error(`${field} must be a real YYYY-MM-DD date.`);
      if (raw.updatedAt && (!/^\d{4}-\d{2}-\d{2}T/.test(raw.updatedAt) || !validPlainDate(raw.updatedAt.slice(0, 10)) || Number.isNaN(Date.parse(raw.updatedAt)))) throw new Error("updatedAt must be a valid ISO timestamp.");
      validateNumericTree(raw.priorityInputs, "priorityInputs");
      validateNumericTree(raw.priority?.valuesByMethod, "priority.valuesByMethod", true);
      for (const field of ["risks", "dependencies"]) for (const record of raw[field] || []) {
        if (!plain(record)) throw new Error(`${field} entries must be objects.`);
        assertDirectoryReference(record.ownerPersonId, references.people, `${field}.ownerPersonId`);
        for (const date of ["reviewDate", "neededBy"]) if (record[date] && !validPlainDate(record[date])) throw new Error(`${field}.${date} must be a real YYYY-MM-DD date.`);
        for (const number of ["likelihood", "impact"]) if (record[number] !== undefined && (typeof record[number] !== "number" || !Number.isInteger(record[number]) || record[number] < 1 || record[number] > 5)) throw new Error(`${field}.${number} must be an integer from 1 to 5.`);
      }
      const sourceStatus = raw.statusId || raw.status;
      const status = statuses.find(stage => [stage.id, stage.name].some(value => titleKey(value) === titleKey(sourceStatus))) || statuses.find(stage => stage.category === titleKey(sourceStatus));
      const resolved = status || statuses.find(stage => stage.category === "intake") || statuses.find(stage => stage.id === workspace.workflow?.defaultStatusId) || statuses[0];
      if (sourceStatus && !status) entry.warnings.push(`Unknown status "${sourceStatus}" mapped to ${resolved.name} (${resolved.category}).`);
      raw.status = resolved.category; raw.statusId = resolved.id; entry.statusLabel = resolved.name;
      if (!raw.priorityInputs) {
        const rice = Object.fromEntries(Object.keys(numericRanges).filter(field => raw[field] !== undefined).map(field => [field, raw[field]]));
        raw.priorityInputs = Object.keys(rice).length ? { rice } : {};
      }
      raw.priority ??= {};
      if (selected && !entry.errors.length) {
        const base = textValue(raw.id) || `import-${model.idSeed}-${index + 1}`;
        let id = base, ordinal = 2;
        while (usedIds.has(id)) id = `${base.slice(0, 170)}-import-${ordinal++}`;
        usedIds.add(id); entry.itemId = id;
        entry.item = { ...createItem({ ...raw, id }, new Date(timestamp)), version: 1, updatedBy: "pm-os" };
      }
    } catch (error) { if (!entry.errors.includes(error.message)) entry.errors.push(error.message); }
    entry.valid = entry.errors.length === 0;
    return entry;
  });
  for (const entry of entries) if (entry.selected) errors.push(...entry.errors.map(message => ({ row: entry.row, message })));
  const selected = entries.filter(entry => entry.selected && entry.valid);
  const sourceIds = new Map();
  for (const entry of selected) if (entry.raw.id) {
    if (sourceIds.has(entry.raw.id)) errors.push({ row: entry.row, message: `Source ID ${entry.raw.id} is repeated among selected rows; give imported initiatives distinct IDs.` });
    else sourceIds.set(entry.raw.id, entry.itemId);
  }
  const retainedTitles = new Map();
  for (const item of [...workspace.items, ...selected.map(entry => entry.item)]) if (!retainedTitles.has(titleKey(item.title))) retainedTitles.set(titleKey(item.title), item.id);
  for (const entry of entries) if (!entry.selected && entry.duplicate && entry.raw.id && !sourceIds.has(entry.raw.id)) {
    const retainedId = retainedTitles.get(titleKey(entry.title));
    if (retainedId) sourceIds.set(entry.raw.id, retainedId);
  }
  for (const entry of selected) entry.item.dependencies = entry.item.dependencies.map(dependency => dependency.targetType === "initiative" && sourceIds.has(dependency.targetInitiativeId) ? { ...dependency, targetInitiativeId: sourceIds.get(dependency.targetInitiativeId) } : dependency);
  let candidate = workspace, addedRecords = [], addedItems = [];
  if (!errors.length && selected.length) {
    try {
      const imported = selected.map(entry => entry.item);
      let records = migrateLegacyValidationRecords(imported, workspace.insightRecords || [], { now: timestamp });
      records = migrateLegacyWorkRecords(imported, records, { now: timestamp });
      // Decode the combined graph once: cross-row dependencies and directory IDs are
      // checked together. Existing objects are returned exactly as supplied, never
      // re-normalized or rewritten by this additive boundary.
      const decoded = decodeWorkspaceDocument({ ...workspace, items: [...workspace.items, ...imported], insightRecords: records }, { now: timestamp });
      addedItems = decoded.items.slice(workspace.items.length);
      const existingRecordIds = new Set((workspace.insightRecords || []).map(record => record.id));
      addedRecords = decoded.insightRecords.filter(record => !existingRecordIds.has(record.id));
      candidate = { ...workspace, items: [...workspace.items, ...addedItems], insightRecords: [...(workspace.insightRecords || []), ...addedRecords] };
    } catch (error) { errors.push({ row: 0, message: error.message }); }
  }
  warnings.push(...entries.flatMap(entry => entry.warnings.map(message => `Row ${entry.row}: ${message}`)));
  const preview = { format: model.format, entries: entries.map(({ item, raw, ...entry }) => entry), errors, warnings, inspectedFields, ignoredHeaders, valid: errors.length === 0, addedCount: entries.filter(entry => entry.selected).length, skippedCount: entries.filter(entry => !entry.selected).length };
  preview.firstRows = preview.entries.slice(0, 5);
  return { preview, workspace: candidate, changes: { addedItemIds: addedItems.map(item => item.id), addedRecordIds: addedRecords.map(record => record.id) } };
}

function assertDirectoryReference(value, knownIds, field, required = false) {
  if (!required && (value === undefined || value === null || value === "")) return;
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} references must be non-empty string IDs.`);
  if (!knownIds.has(value.trim())) throw new Error(`${field} references missing directory record "${value.trim()}".`);
}

function validateNumericTree(value, label, allowScored = false) {
  if (value === undefined) return;
  if (!plain(value)) throw new Error(`${label} must be an object.`);
  for (const [framework, inputs] of Object.entries(value)) {
    if (!plain(inputs)) throw new Error(`${label}.${framework} must be an object.`);
    for (const [key, number] of Object.entries(inputs)) if (!(allowScored && key === "scored" && typeof number === "boolean") && (typeof number !== "number" || !Number.isFinite(number))) throw new Error(`${label}.${framework}.${key} must be a finite number.`);
  }
}
function validPlainDate(value) { return /^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value; }
function serialize(value) { return value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value); }
function hash(text) { let value = 2166136261; for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619); return (value >>> 0).toString(36); }
function parseCsv(text) {
  const rows = []; let row = [], cell = "", quoted = false, closed = false;
  const finishCell = () => { row.push(cell); cell = ""; closed = false; };
  const finishRow = () => { const explicit = row.length > 0 || closed; finishCell(); if (explicit || row.some(value => value !== "")) rows.push(row); row = []; if (rows.length > IMPORT_LIMITS.rows + 1) throw new Error("Import exceeds the 5,000 data-row limit."); };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) { if (char === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } } else cell += char; continue; }
    if (char === ',') { finishCell(); if (row.length >= IMPORT_LIMITS.columns) throw new Error("Import exceeds the 200-column limit."); }
    else if (char === '\n' || char === '\r') { finishRow(); if (char === '\r' && text[i + 1] === '\n') i++; }
    else if (char === '"') { if (cell || closed) throw new Error("Malformed CSV: unexpected quote in an unquoted cell."); quoted = true; }
    else { if (closed) throw new Error("Malformed CSV: unexpected text after a closing quote."); cell += char; }
  }
  if (quoted) throw new Error("Malformed CSV: unterminated quoted cell.");
  if (cell || row.length || closed) finishRow();
  return rows;
}
