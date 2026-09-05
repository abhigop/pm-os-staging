export const CUSTOMER_DIRECTORY_VERSION = 1;

export const CUSTOMER_LIMITS = Object.freeze({
  accounts: 5000,
  segments: 250,
  tags: 200,
  fields: 50,
  rulesPerSegment: 20,
  selectOptions: 100
});

export const CUSTOMER_STATUSES = Object.freeze(["prospect", "trial", "active", "churned"]);
export const CUSTOMER_FIELD_TYPES = Object.freeze([
  "text", "number", "boolean", "date", "single-select", "multi-select"
]);

const BUILT_IN_FIELDS = Object.freeze({
  name: "text",
  domain: "text",
  status: "single-select",
  industry: "text",
  region: "text",
  employeeCount: "number",
  planTier: "text",
  ownerPersonId: "text",
  notes: "text",
  tags: "multi-select"
});

const OPERATORS = Object.freeze({
  text: new Set(["is_set", "not_set", "equals", "not_equals", "contains", "in"]),
  number: new Set(["is_set", "not_set", "equals", "gt", "gte", "lt", "lte", "between"]),
  boolean: new Set(["is_set", "not_set", "equals"]),
  date: new Set(["is_set", "not_set", "equals", "gt", "gte", "lt", "lte", "between"]),
  "single-select": new Set(["is_set", "not_set", "equals", "not_equals", "in"]),
  "multi-select": new Set(["is_set", "not_set", "contains_any", "contains_all", "contains_none"])
});

export class CustomerDirectoryError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "CustomerDirectoryError";
    this.code = code;
    this.details = details;
  }
}

export function emptyCustomerDirectory() {
  return freeze({ version: CUSTOMER_DIRECTORY_VERSION, accounts: [], tags: [], fields: [], segments: [] });
}

export function normalizeCustomerDirectory(input = {}) {
  const source = plain(input) ? input : {};
  const version = Number.isInteger(source.version) && source.version > 0 ? source.version : CUSTOMER_DIRECTORY_VERSION;
  const tags = list(source.tags).map((tag, index) => normalizeTag(tag, index));
  const fields = list(source.fields).map((field, index) => normalizeField(field, index));
  const accounts = list(source.accounts).map((account, index) => normalizeAccount(account, index, tags, fields));
  const segments = list(source.segments).map((segment, index) => normalizeSegment(segment, index, tags, fields));

  assertLimit("accounts", accounts.length);
  assertLimit("tags", tags.length);
  assertLimit("fields", fields.length);
  assertLimit("segments", segments.length);
  assertUnique(tags, "tag", true);
  assertUnique(fields, "field", true);
  assertUnique(segments, "segment", true);
  assertUnique(accounts, "account");
  assertUniqueDomains(accounts);
  return freeze({ version, accounts, tags, fields, segments });
}

export function createCustomerAccount(directory, input, options = {}) {
  return updateCollection(directory, "accounts", input, options, false);
}

export function updateCustomerAccount(directory, id, input) {
  return updateCollection(directory, "accounts", { ...input, id }, {}, true);
}

export function removeCustomerAccount(directory, id, initiatives = []) {
  if (list(initiatives).some((item) => list(item.customerIds).includes(id))) {
    throw error("REFERENCE_IN_USE", "This account is targeted by an initiative and cannot be deleted.", { id });
  }
  return removeFrom(directory, "accounts", id);
}

export function createCustomerTag(directory, input, options = {}) {
  return updateCollection(directory, "tags", input, options, false);
}

export function updateCustomerTag(directory, id, input) {
  return updateCollection(directory, "tags", { ...input, id }, {}, true);
}

export function removeCustomerTag(directory, id) {
  const current = normalizeCustomerDirectory(directory);
  if (current.accounts.some((account) => account.tagIds.includes(id))
    || current.segments.some((segment) => segment.rules.some((rule) => rule.field === "tags" && list(rule.value).includes(id)))) {
    throw error("REFERENCE_IN_USE", "This tag is used by an account or segment rule and cannot be deleted.", { id });
  }
  return removeFrom(current, "tags", id);
}

export function createCustomerField(directory, input, options = {}) {
  return updateCollection(directory, "fields", input, options, false);
}

export function updateCustomerField(directory, id, input) {
  const current = normalizeCustomerDirectory(directory);
  const existing = required(current.fields.find((entry) => entry.id === id), "field", id);
  if (input.type && input.type !== existing.type && current.accounts.some((account) => hasValue(account.attributes[id]))) {
    throw error("REFERENCE_IN_USE", "A field containing customer data cannot change type.", { id });
  }
  return updateCollection(current, "fields", { ...input, id }, {}, true);
}

export function removeCustomerField(directory, id) {
  const current = normalizeCustomerDirectory(directory);
  if (current.accounts.some((account) => hasValue(account.attributes[id]))
    || current.segments.some((segment) => segment.rules.some((rule) => rule.field === `custom:${id}`))) {
    throw error("REFERENCE_IN_USE", "This field contains data or is used by a segment rule and cannot be deleted.", { id });
  }
  return removeFrom(current, "fields", id);
}

export function createCustomerSegment(directory, input, options = {}) {
  return updateCollection(directory, "segments", input, options, false);
}

export function updateCustomerSegment(directory, id, input) {
  return updateCollection(directory, "segments", { ...input, id }, {}, true);
}

export function removeCustomerSegment(directory, id, initiatives = []) {
  if (list(initiatives).some((item) => list(item.segmentIds).includes(id))) {
    throw error("REFERENCE_IN_USE", "This segment is targeted by an initiative and cannot be deleted.", { id });
  }
  return removeFrom(directory, "segments", id);
}

export function evaluateSegment(account, segment, directory) {
  const current = normalizeCustomerDirectory(directory);
  const normalizedAccount = current.accounts.find((entry) => entry.id === account?.id)
    || normalizeAccount(account, 0, current.tags, current.fields);
  const normalizedSegment = current.segments.find((entry) => entry.id === segment?.id)
    || normalizeSegment(segment, 0, current.tags, current.fields);
  if (!normalizedSegment.rules.length) return false;
  const results = normalizedSegment.rules.map((rule) => evaluateRule(normalizedAccount, rule, current.fields));
  return normalizedSegment.match === "any" ? results.some(Boolean) : results.every(Boolean);
}

export function segmentMembers(segmentOrId, directory) {
  const current = normalizeCustomerDirectory(directory);
  const segment = typeof segmentOrId === "string"
    ? current.segments.find((entry) => entry.id === segmentOrId)
    : segmentOrId;
  if (!segment) return [];
  return current.accounts.filter((account) => evaluateSegment(account, segment, current));
}

export function segmentMemberships(directory) {
  const current = normalizeCustomerDirectory(directory);
  return new Map(current.segments.map((segment) => [segment.id, segmentMembers(segment, current).map((account) => account.id)]));
}

export function resolveInitiativeAudience(initiative, directory) {
  const current = normalizeCustomerDirectory(directory);
  const segmentIds = new Set(list(initiative?.segmentIds).filter((id) => current.segments.some((segment) => segment.id === id)));
  const customerIds = new Set(list(initiative?.customerIds).filter((id) => current.accounts.some((account) => account.id === id)));
  for (const customerId of customerIds) {
    const account = current.accounts.find((entry) => entry.id === customerId);
    for (const segment of current.segments) {
      if (evaluateSegment(account, segment, current)) segmentIds.add(segment.id);
    }
  }
  return freeze({ customerIds: [...customerIds], segmentIds: [...segmentIds] });
}

export function initiativeAudienceLabels(initiative, directory) {
  const current = normalizeCustomerDirectory(directory);
  return freeze({
    accounts: list(initiative?.customerIds).map((id) => current.accounts.find((entry) => entry.id === id)?.name).filter(Boolean),
    segments: list(initiative?.segmentIds).map((id) => current.segments.find((entry) => entry.id === id)?.name).filter(Boolean)
  });
}

export function customerDisplayProjection(initiative, directory) {
  const labels = initiativeAudienceLabels(initiative, directory);
  return labels.segments[0] || labels.accounts[0] || text(initiative?.customer);
}

export function hydrateCustomerInitiatives(items, directory) {
  const current = normalizeCustomerDirectory(directory);
  return freeze(list(items).map((item) => ({
    ...item,
    customerIds: unique(list(item.customerIds)),
    segmentIds: unique(list(item.segmentIds)),
    customer: customerDisplayProjection(item, current)
  })));
}

export function migrateLegacyCustomers(items, directory = emptyCustomerDirectory()) {
  let current = normalizeCustomerDirectory(directory);
  const tagByName = new Map(current.tags.map((tag) => [key(tag.name), tag]));
  const segmentByName = new Map(current.segments.map((segment) => [key(segment.name), segment]));
  const migratedItems = [];

  for (const item of list(items)) {
    const legacyName = text(item.customer);
    let tag = legacyName ? tagByName.get(key(legacyName)) : null;
    if (legacyName && !tag) {
      current = createCustomerTag(current, { id: stableId("tag", legacyName), name: legacyName });
      tag = current.tags.at(-1);
      tagByName.set(key(legacyName), tag);
    }
    let segment = legacyName ? segmentByName.get(key(legacyName)) : null;
    if (legacyName && !segment) {
      current = createCustomerSegment(current, {
        id: stableId("segment", legacyName),
        name: legacyName,
        description: "Migrated from the legacy initiative customer field.",
        match: "all",
        rules: [{ id: stableId("rule", legacyName), field: "tags", operator: "contains_any", value: [tag.id] }]
      });
      segment = current.segments.at(-1);
      segmentByName.set(key(legacyName), segment);
    }
    migratedItems.push({
      ...item,
      customerIds: unique(list(item.customerIds)),
      segmentIds: unique([...list(item.segmentIds), ...(segment ? [segment.id] : [])])
    });
  }
  return freeze({ directory: current, items: hydrateCustomerInitiatives(migratedItems, current) });
}

export function customerDirectoryStats(directory, initiatives = []) {
  const current = normalizeCustomerDirectory(directory);
  const memberships = segmentMemberships(current);
  const segmented = new Set([...memberships.values()].flat());
  const linked = list(initiatives).filter((item) => list(item.customerIds).length || list(item.segmentIds).length).length;
  return freeze({ accounts: current.accounts.length, segments: current.segments.length, unsegmented: current.accounts.length - segmented.size, linkedInitiatives: linked });
}

export function exportCustomerCsv(directory) {
  const current = normalizeCustomerDirectory(directory);
  const headers = ["id", "name", "domain", "status", "industry", "region", "employeeCount", "planTier", "ownerPersonId", "tagIds", "notes", ...current.fields.map((field) => `custom.${field.id}`)];
  const rows = current.accounts.map((account) => headers.map((header) => {
    if (header === "tagIds") return JSON.stringify(account.tagIds);
    if (header.startsWith("custom.")) {
      const value = account.attributes[header.slice(7)];
      return Array.isArray(value) ? JSON.stringify(value) : value ?? "";
    }
    return account[header] ?? "";
  }));
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function previewCustomerCsv(csv, directory) {
  const current = normalizeCustomerDirectory(directory);
  const matrix = parseCsv(String(csv || ""));
  const headers = matrix.shift()?.map((entry) => entry.trim()) || [];
  const requiredHeaders = ["name", "domain"];
  const errors = [];
  for (const header of requiredHeaders) if (!headers.includes(header)) errors.push({ row: 1, field: header, message: `Missing required ${header} column.` });
  const allowed = new Set(["id", "name", "domain", "status", "industry", "region", "employeeCount", "planTier", "ownerPersonId", "tagIds", "notes", ...current.fields.map((field) => `custom.${field.id}`)]);
  for (const header of headers) if (!allowed.has(header)) errors.push({ row: 1, field: header, message: `Unknown column ${header}.` });

  const seenDomains = new Set();
  const changes = [];
  matrix.forEach((cells, index) => {
    const rowNumber = index + 2;
    const raw = Object.fromEntries(headers.map((header, column) => [header, cells[column] ?? ""]));
    try {
      const parsed = csvAccount(raw, current);
      if (parsed.domain && seenDomains.has(parsed.domain)) throw error("DUPLICATE_DOMAIN", `Duplicate domain ${parsed.domain} in CSV.`);
      if (parsed.domain) seenDomains.add(parsed.domain);
      const byId = parsed.id ? current.accounts.find((account) => account.id === parsed.id) : null;
      const byDomain = parsed.domain ? current.accounts.find((account) => account.domain === parsed.domain) : null;
      if (byId && byDomain && byId.id !== byDomain.id) throw error("AMBIGUOUS_MATCH", "ID and domain match different accounts.");
      const existing = byId || byDomain;
      changes.push({ action: existing ? "update" : "create", account: { ...existing, ...parsed, id: parsed.id || existing?.id || stableId("account", parsed.domain || parsed.name) } });
    } catch (cause) {
      errors.push({ row: rowNumber, field: cause.details?.field || "row", message: cause.message });
    }
  });
  return freeze({ valid: errors.length === 0, creates: changes.filter((entry) => entry.action === "create").length, updates: changes.filter((entry) => entry.action === "update").length, errors, changes });
}

export function applyCustomerCsvImport(csv, directory) {
  const current = normalizeCustomerDirectory(directory);
  const preview = previewCustomerCsv(csv, current);
  if (!preview.valid) throw error("INVALID_CSV", "Customer CSV contains errors and was not imported.", { errors: preview.errors });
  let next = current;
  for (const change of preview.changes) {
    next = change.action === "create"
      ? createCustomerAccount(next, change.account)
      : updateCustomerAccount(next, change.account.id, change.account);
  }
  return freeze({ directory: next, recoverySnapshot: current, preview });
}

function updateCollection(directory, kind, input, options, replacing) {
  const current = normalizeCustomerDirectory(directory);
  const index = replacing ? current[kind].findIndex((entry) => entry.id === input.id) : current[kind].length;
  if (replacing && index < 0) required(null, kind.slice(0, -1), input.id);
  const id = text(input?.id) || makeId(kind.slice(0, -1), options.idFactory);
  const merged = replacing ? { ...current[kind][index], ...input, id } : { ...input, id };
  const normalizers = { accounts: normalizeAccount, tags: normalizeTag, fields: normalizeField, segments: normalizeSegment };
  const entry = normalizers[kind](merged, index, current.tags, current.fields);
  const collection = replacing ? current[kind].map((value, offset) => offset === index ? entry : value) : [...current[kind], entry];
  return normalizeCustomerDirectory({ ...current, [kind]: collection });
}

function removeFrom(directory, kind, id) {
  const current = normalizeCustomerDirectory(directory);
  required(current[kind].find((entry) => entry.id === id), kind.slice(0, -1), id);
  return normalizeCustomerDirectory({ ...current, [kind]: current[kind].filter((entry) => entry.id !== id) });
}

function normalizeTag(value, index) {
  const tag = plain(value) ? value : {};
  const id = text(tag.id) || `tag-${index + 1}`;
  const name = text(tag.name);
  if (!name) throw error("INVALID_TAG", "Customer tags require a name.", { id });
  return { id, name };
}

function normalizeField(value, index) {
  const field = plain(value) ? value : {};
  const id = text(field.id) || `field-${index + 1}`;
  const name = text(field.name);
  const type = CUSTOMER_FIELD_TYPES.includes(field.type) ? field.type : "text";
  if (!name) throw error("INVALID_FIELD", "Custom fields require a name.", { id });
  const options = unique(list(field.options).map(text).filter(Boolean));
  if (options.length > CUSTOMER_LIMITS.selectOptions) throw error("LIMIT_EXCEEDED", "A custom field can have at most 100 options.");
  return { id, name, type, options: ["single-select", "multi-select"].includes(type) ? options : [], position: finite(field.position, index) };
}

function normalizeAccount(value, index, tags, fields) {
  const account = plain(value) ? value : {};
  const id = text(account.id) || `account-${index + 1}`;
  const name = text(account.name);
  const domain = normalizeDomain(account.domain);
  if (!name) throw error("INVALID_ACCOUNT", "Customer accounts require a name.", { id, field: "name" });
  const status = CUSTOMER_STATUSES.includes(account.status) ? account.status : "prospect";
  const tagIds = unique(list(account.tagIds).map(text).filter(Boolean));
  const tagSet = new Set(tags.map((tag) => tag.id));
  if (tagIds.some((tagId) => !tagSet.has(tagId))) throw error("INVALID_REFERENCE", "Account references an unknown tag.", { id });
  const attributes = {};
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(account.attributes || {}, field.id)) continue;
    attributes[field.id] = normalizeTypedValue(account.attributes[field.id], field);
  }
  return {
    id, name, domain, status,
    industry: text(account.industry), region: text(account.region),
    employeeCount: optionalNumber(account.employeeCount), planTier: text(account.planTier),
    ownerPersonId: text(account.ownerPersonId), notes: text(account.notes), tagIds, attributes,
    createdAt: iso(account.createdAt), updatedAt: iso(account.updatedAt)
  };
}

function normalizeSegment(value, index, tags, fields) {
  const segment = plain(value) ? value : {};
  const id = text(segment.id) || `segment-${index + 1}`;
  const name = text(segment.name);
  if (!name) throw error("INVALID_SEGMENT", "Segments require a name.", { id });
  const rules = list(segment.rules).map((rule, ruleIndex) => normalizeRule(rule, ruleIndex, tags, fields));
  if (rules.length > CUSTOMER_LIMITS.rulesPerSegment) throw error("LIMIT_EXCEEDED", "A segment can have at most 20 rules.", { id });
  return { id, name, description: text(segment.description), match: segment.match === "any" ? "any" : "all", rules };
}

function normalizeRule(value, index, tags, fields) {
  const rule = plain(value) ? value : {};
  const field = text(rule.field);
  const fieldType = BUILT_IN_FIELDS[field] || (field.startsWith("custom:") ? fields.find((entry) => entry.id === field.slice(7))?.type : null);
  if (!fieldType) throw error("INVALID_REFERENCE", `Unknown segment field ${field || "(empty)"}.`);
  const operator = text(rule.operator);
  if (!OPERATORS[fieldType].has(operator)) throw error("INVALID_OPERATOR", `${operator || "Empty operator"} is not supported for ${fieldType}.`, { field });
  let normalizedValue = rule.value;
  if (["is_set", "not_set"].includes(operator)) {
    normalizedValue = null;
  } else if (field === "tags") {
    normalizedValue = unique(list(rule.value).map(text).filter(Boolean));
    const ids = new Set(tags.map((tag) => tag.id));
    if (normalizedValue.some((tagId) => !ids.has(tagId))) throw error("INVALID_REFERENCE", "Segment rule references an unknown tag.");
  } else if (field.startsWith("custom:")) {
    normalizedValue = normalizeRuleValue(rule.value, fieldType, fields.find((entry) => entry.id === field.slice(7)));
  } else {
    normalizedValue = normalizeRuleValue(rule.value, fieldType);
  }
  return { id: text(rule.id) || `rule-${index + 1}`, field, operator, value: normalizedValue };
}

function normalizeRuleValue(value, type, field) {
  if (type === "number") return Array.isArray(value) ? value.map(optionalNumber) : optionalNumber(value);
  if (type === "boolean") return value === true || String(value).toLowerCase() === "true";
  if (type === "date") return Array.isArray(value) ? value.map(dateValue) : dateValue(value);
  if (type === "multi-select") {
    const values = unique(list(value).map(text).filter(Boolean));
    if (field?.options.length && values.some((entry) => !field.options.includes(entry))) throw error("INVALID_VALUE", "Rule uses an unknown custom field option.");
    return values;
  }
  if (Array.isArray(value)) return unique(value.map(text).filter(Boolean));
  const result = text(value);
  if (field?.type === "single-select" && result && !field.options.includes(result)) throw error("INVALID_VALUE", "Rule uses an unknown custom field option.");
  return result;
}

function evaluateRule(account, rule, fields) {
  const customId = rule.field.startsWith("custom:") ? rule.field.slice(7) : null;
  const field = customId ? fields.find((entry) => entry.id === customId) : null;
  const type = customId ? field.type : BUILT_IN_FIELDS[rule.field];
  const actual = customId ? account.attributes[customId] : rule.field === "tags" ? account.tagIds : account[rule.field];
  if (rule.operator === "is_set") return hasValue(actual);
  if (rule.operator === "not_set") return !hasValue(actual);
  if (rule.operator === "contains_any") return list(rule.value).some((value) => list(actual).includes(value));
  if (rule.operator === "contains_all") return list(rule.value).every((value) => list(actual).includes(value));
  if (rule.operator === "contains_none") return list(rule.value).every((value) => !list(actual).includes(value));
  if (rule.operator === "in") return list(rule.value).map(key).includes(key(actual));
  if (rule.operator === "contains") return key(actual).includes(key(rule.value));
  if (rule.operator === "equals") return comparable(actual, type) === comparable(rule.value, type);
  if (rule.operator === "not_equals") return comparable(actual, type) !== comparable(rule.value, type);
  const left = comparable(actual, type);
  if (rule.operator === "between") {
    const [start, end] = list(rule.value).map((entry) => comparable(entry, type));
    return left >= start && left <= end;
  }
  const right = comparable(rule.value, type);
  return rule.operator === "gt" ? left > right : rule.operator === "gte" ? left >= right : rule.operator === "lt" ? left < right : left <= right;
}

function normalizeTypedValue(value, field) {
  if (value === null || value === undefined || value === "") return field.type === "multi-select" ? [] : "";
  if (field.type === "number") return optionalNumber(value);
  if (field.type === "boolean") return value === true || String(value).toLowerCase() === "true";
  if (field.type === "date") return dateValue(value);
  if (field.type === "multi-select") {
    const values = unique(list(value).map(text).filter(Boolean));
    if (values.some((entry) => !field.options.includes(entry))) throw error("INVALID_VALUE", `${field.name} contains an unknown option.`);
    return values;
  }
  const result = text(value);
  if (field.type === "single-select" && result && !field.options.includes(result)) throw error("INVALID_VALUE", `${field.name} contains an unknown option.`);
  return result;
}

function csvAccount(raw, directory) {
  const attributes = {};
  for (const field of directory.fields) {
    const cell = raw[`custom.${field.id}`];
    if (cell === undefined || cell === "") continue;
    attributes[field.id] = normalizeTypedValue(field.type === "multi-select" ? parseJsonList(cell) : cell, field);
  }
  return {
    id: text(raw.id), name: text(raw.name), domain: normalizeDomain(raw.domain),
    status: text(raw.status) || "prospect", industry: text(raw.industry), region: text(raw.region),
    employeeCount: raw.employeeCount === "" ? null : optionalNumber(raw.employeeCount),
    planTier: text(raw.planTier), ownerPersonId: text(raw.ownerPersonId), notes: text(raw.notes),
    tagIds: raw.tagIds ? parseJsonList(raw.tagIds) : [], attributes
  };
}

function parseJsonList(value) {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch {
    throw error("INVALID_CSV_VALUE", "Expected a JSON array value.");
  }
}

function parseCsv(input) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let index = 0; index <= input.length; index += 1) {
    const char = input[index] || "\n";
    if (quoted && char === '"' && input[index + 1] === '"') { cell += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (!quoted && char === ",") { row.push(cell); cell = ""; continue; }
    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(cell); cell = "";
      if (row.some((entry) => entry !== "")) rows.push(row);
      row = [];
      continue;
    }
    cell += char;
  }
  if (quoted) throw error("INVALID_CSV", "CSV contains an unterminated quoted value.");
  return rows;
}

function csvCell(value) {
  const output = String(value ?? "");
  return /[",\r\n]/.test(output) ? `"${output.replaceAll('"', '""')}"` : output;
}

function assertLimit(kind, count) {
  if (count > CUSTOMER_LIMITS[kind]) throw error("LIMIT_EXCEEDED", `Customer directory supports at most ${CUSTOMER_LIMITS[kind]} ${kind}.`, { kind, count });
}

function assertUnique(values, kind, names = false) {
  const ids = new Set(), labels = new Set();
  for (const value of values) {
    if (ids.has(value.id)) throw error("DUPLICATE_ID", `Duplicate ${kind} id ${value.id}.`, { id: value.id });
    ids.add(value.id);
    if (names) {
      if (labels.has(key(value.name))) throw error("DUPLICATE_NAME", `Duplicate ${kind} name ${value.name}.`, { name: value.name });
      labels.add(key(value.name));
    }
  }
}

function assertUniqueDomains(accounts) {
  const domains = new Set();
  for (const account of accounts) {
    if (!account.domain) continue;
    if (domains.has(account.domain)) throw error("DUPLICATE_DOMAIN", `Duplicate account domain ${account.domain}.`, { domain: account.domain });
    domains.add(account.domain);
  }
}

function normalizeDomain(value) {
  return text(value).toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].replace(/\.$/, "");
}

function comparable(value, type) {
  if (type === "number") return Number(value);
  if (type === "date") return Date.parse(value);
  if (type === "boolean") return Boolean(value);
  return key(value);
}

function hasValue(value) {
  return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== "";
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw error("INVALID_VALUE", "Expected a number.");
  return number;
}

function dateValue(value) {
  const candidate = text(value);
  if (!candidate || Number.isNaN(Date.parse(candidate))) throw error("INVALID_VALUE", "Expected an ISO date.");
  return candidate.slice(0, 10);
}

function iso(value) {
  if (!value || Number.isNaN(Date.parse(value))) return "";
  return new Date(value).toISOString();
}

function required(value, kind, id) {
  if (!value) throw error("NOT_FOUND", `Customer ${kind} ${id} was not found.`, { kind, id });
  return value;
}

function makeId(prefix, factory) {
  const value = typeof factory === "function" ? text(factory(prefix)) : "";
  return value || `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function stableId(prefix, value) {
  const slug = key(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "legacy";
  let hash = 2166136261;
  for (const char of key(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `${prefix}-legacy-${slug}-${(hash >>> 0).toString(36)}`;
}

function unique(values) { return [...new Set(values)]; }
function key(value) { return text(value).toLowerCase(); }
function text(value) { return value === undefined || value === null ? "" : String(value).trim(); }
function list(value) { return Array.isArray(value) ? value : []; }
function finite(value, fallback) { return Number.isFinite(Number(value)) ? Number(value) : fallback; }
function plain(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function error(code, message, details = {}) { return new CustomerDirectoryError(code, message, details); }
function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(freeze);
  return value;
}
