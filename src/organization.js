export const ORGANIZATION_VERSION = 2;
export const ORGANIZATION_LIMITS = Object.freeze({
  people: 500,
  units: 250,
  depth: 8
});

export class OrganizationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "OrganizationError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export function emptyOrganization() {
  return Object.freeze({
    version: ORGANIZATION_VERSION,
    people: Object.freeze([]),
    units: Object.freeze([])
  });
}

export function normalizeOrganization(input = {}, options = {}) {
  const source = plainObject(input) ? input : {};
  const people = normalizePeople(source.people, options);
  const personIds = new Set(people.map((person) => person.id));
  const units = normalizeUnits(source.units, personIds, options);
  validateTree(units);
  if (people.length > ORGANIZATION_LIMITS.people) {
    fail("PEOPLE_LIMIT", `An organization can contain at most ${ORGANIZATION_LIMITS.people} people.`);
  }
  if (units.length > ORGANIZATION_LIMITS.units) {
    fail("UNIT_LIMIT", `An organization can contain at most ${ORGANIZATION_LIMITS.units} units.`);
  }
  return deepFreeze({
    version: positiveInteger(source.version, ORGANIZATION_VERSION),
    people,
    units
  });
}

export function createPerson(organization, input, options = {}) {
  const current = normalizeOrganization(organization);
  const id = clean(input?.id) || makeId("person", options.idFactory);
  if (current.people.some((person) => person.id === id)) fail("DUPLICATE_PERSON", "That person already exists.", { id });
  const person = normalizePerson({ ...input, id }, current.people.length);
  return nextOrganization(current, { people: [...current.people, person] });
}

export function updatePerson(organization, personId, patch) {
  const current = normalizeOrganization(organization);
  const index = current.people.findIndex((person) => person.id === clean(personId));
  if (index < 0) fail("PERSON_NOT_FOUND", "That person is no longer available.", { personId });
  const people = [...current.people];
  people[index] = normalizePerson({ ...people[index], ...patch, id: people[index].id }, index);
  return nextOrganization(current, { people });
}

export function removePerson(organization, personId, items = []) {
  const current = normalizeOrganization(organization);
  const id = clean(personId);
  const person = current.people.find((entry) => entry.id === id);
  if (!person) fail("PERSON_NOT_FOUND", "That person is no longer available.", { personId: id });
  const leadUnits = current.units.filter((unit) => unit.leadPersonId === id);
  const initiatives = items.filter((item) => clean(item?.pocPersonId) === id);
  const records = items.flatMap((item) => [
    ...(Array.isArray(item?.risks) ? item.risks : []),
    ...(Array.isArray(item?.dependencies) ? item.dependencies : [])
  ].filter((record) => clean(record?.ownerPersonId) === id).map((record) => ({ itemId: clean(item?.id), recordId: clean(record?.id) })));
  if (leadUnits.length || initiatives.length || records.length) {
    fail("PERSON_ASSIGNED", `${person.displayName} must be reassigned before removal.`, {
      personId: id,
      leadUnitIds: leadUnits.map((unit) => unit.id),
      initiativeIds: initiatives.map((item) => clean(item.id)),
      recordAssignments: records
    });
  }
  return nextOrganization(current, { people: current.people.filter((entry) => entry.id !== id) });
}

export function createUnit(organization, input, options = {}) {
  const current = normalizeOrganization(organization);
  const id = clean(input?.id) || makeId("unit", options.idFactory);
  if (current.units.some((unit) => unit.id === id)) fail("DUPLICATE_UNIT", "That organization unit already exists.", { id });
  const candidate = normalizeUnit({
    ...input,
    id,
    position: input?.position ?? siblingUnits(current.units, clean(input?.parentId)).length
  }, current.units.length);
  const next = nextOrganization(current, { units: [...current.units, candidate] });
  return normalizeOrganization(next);
}

export function updateUnit(organization, unitId, patch) {
  const current = normalizeOrganization(organization);
  const id = clean(unitId);
  const index = current.units.findIndex((unit) => unit.id === id);
  if (index < 0) fail("UNIT_NOT_FOUND", "That organization unit is no longer available.", { unitId: id });
  const units = [...current.units];
  units[index] = normalizeUnit({
    ...units[index],
    ...patch,
    id,
    parentId: units[index].parentId
  }, index);
  return normalizeOrganization(nextOrganization(current, { units }));
}

export function moveUnit(organization, unitId, parentId, position = 0) {
  const current = normalizeOrganization(organization);
  const id = clean(unitId);
  const parent = clean(parentId);
  const index = current.units.findIndex((unit) => unit.id === id);
  if (index < 0) fail("UNIT_NOT_FOUND", "That organization unit is no longer available.", { unitId: id });
  if (parent === id || descendantsOf(current, id).some((unit) => unit.id === parent)) {
    fail("UNIT_CYCLE", "A unit cannot be moved beneath itself or one of its descendants.", { unitId: id, parentId: parent });
  }
  const units = current.units.map((unit) => unit.id === id
    ? { ...unit, parentId: parent, position: nonNegativeInteger(position, 0) }
    : { ...unit });
  return normalizeOrganization(nextOrganization(current, { units: normalizeSiblingPositions(units) }));
}

export function removeUnit(organization, unitId, items = []) {
  const current = normalizeOrganization(organization);
  const id = clean(unitId);
  const unit = current.units.find((entry) => entry.id === id);
  if (!unit) fail("UNIT_NOT_FOUND", "That organization unit is no longer available.", { unitId: id });
  const children = current.units.filter((entry) => entry.parentId === id);
  const initiatives = items.filter((item) => clean(item?.orgUnitId) === id);
  if (children.length || initiatives.length) {
    fail("UNIT_ASSIGNED", `${unit.name} must be emptied before deletion.`, {
      unitId: id,
      childUnitIds: children.map((entry) => entry.id),
      initiativeIds: initiatives.map((item) => clean(item.id))
    });
  }
  return nextOrganization(current, { units: current.units.filter((entry) => entry.id !== id) });
}

export function migrateLegacyOwners(items = [], organization = emptyOrganization()) {
  let current = normalizeOrganization(organization);
  const byName = new Map(current.people.map((person) => [person.displayName.toLocaleLowerCase(), person]));
  const migratedItems = items.map((item) => {
    if (clean(item?.pocPersonId) || !clean(item?.owner)) return { ...item };
    const key = clean(item.owner).toLocaleLowerCase();
    let person = byName.get(key);
    if (!person) {
      const id = legacyPersonId(item.owner, new Set(current.people.map((entry) => entry.id)));
      current = createPerson(current, { id, displayName: clean(item.owner), title: "" });
      person = current.people.find((entry) => entry.id === id);
      byName.set(key, person);
    }
    return { ...item, pocPersonId: person.id };
  });
  return deepFreeze({ organization: current, items: migratedItems });
}

export function hydrateInitiatives(items = [], organization = emptyOrganization()) {
  const current = normalizeOrganization(organization);
  const people = new Map(current.people.map((person) => [person.id, person]));
  const units = new Map(current.units.map((unit) => [unit.id, unit]));
  return items.map((item) => {
    const person = people.get(clean(item?.pocPersonId));
    const unit = units.get(clean(item?.orgUnitId));
    return {
      ...item,
      owner: person?.displayName || clean(item?.owner),
      poc: person || null,
      orgUnit: unit || null,
      orgPath: unit ? unitPath(current, unit.id).map((entry) => entry.name).join(" / ") : ""
    };
  });
}

export function organizationWorkload(organization, items = []) {
  const current = normalizeOrganization(organization);
  const personCounts = Object.fromEntries(current.people.map((person) => [person.id, 0]));
  const unitDirect = Object.fromEntries(current.units.map((unit) => [unit.id, 0]));
  for (const item of items) {
    const personId = clean(item?.pocPersonId);
    const unitId = clean(item?.orgUnitId);
    if (personId in personCounts) personCounts[personId] += 1;
    if (unitId in unitDirect) unitDirect[unitId] += 1;
  }
  const unitTotal = {};
  for (const unit of current.units) {
    unitTotal[unit.id] = unitDirect[unit.id] + descendantsOf(current, unit.id)
      .reduce((sum, descendant) => sum + (unitDirect[descendant.id] || 0), 0);
  }
  return deepFreeze({ people: personCounts, direct: unitDirect, total: unitTotal });
}

export function rootUnits(organization) {
  return normalizeOrganization(organization).units.filter((unit) => !unit.parentId);
}

export function childrenOf(organization, unitId) {
  return normalizeOrganization(organization).units
    .filter((unit) => unit.parentId === clean(unitId))
    .sort(unitSort);
}

export function descendantsOf(organization, unitId) {
  const current = normalizeOrganization(organization);
  const output = [];
  const visit = (parentId) => {
    for (const child of current.units.filter((unit) => unit.parentId === parentId).sort(unitSort)) {
      output.push(child);
      visit(child.id);
    }
  };
  visit(clean(unitId));
  return output;
}

export function unitPath(organization, unitId) {
  const current = normalizeOrganization(organization);
  const byId = new Map(current.units.map((unit) => [unit.id, unit]));
  const output = [];
  let unit = byId.get(clean(unitId));
  while (unit) {
    output.unshift(unit);
    unit = unit.parentId ? byId.get(unit.parentId) : null;
  }
  return output;
}

function normalizePeople(input, options) {
  const values = Array.isArray(input) ? input : [];
  const seen = new Set();
  const names = new Set();
  return values.map((value, index) => {
    const person = normalizePerson(value, index, options);
    if (seen.has(person.id)) fail("DUPLICATE_PERSON", `Duplicate person id: ${person.id}.`, { id: person.id });
    const nameKey = person.displayName.toLocaleLowerCase();
    if (names.has(nameKey)) fail("DUPLICATE_PERSON_NAME", `${person.displayName} appears more than once.`, { displayName: person.displayName });
    seen.add(person.id);
    names.add(nameKey);
    return person;
  });
}

function normalizePerson(value, index) {
  const id = clean(value?.id);
  const displayName = clean(value?.displayName || value?.name);
  if (!id) fail("INVALID_PERSON", `Person ${index + 1} requires an id.`);
  if (!displayName) fail("INVALID_PERSON", `Person ${id} requires a display name.`, { id });
  if (id.length > 200 || displayName.length > 120 || clean(value?.title).length > 120) {
    fail("INVALID_PERSON", "Person fields exceed their supported length.", { id });
  }
  return { id, displayName, title: clean(value?.title) };
}

function normalizeUnits(input, personIds) {
  const values = Array.isArray(input) ? input : [];
  const seen = new Set();
  return values.map((value, index) => {
    const unit = normalizeUnit(value, index);
    if (seen.has(unit.id)) fail("DUPLICATE_UNIT", `Duplicate unit id: ${unit.id}.`, { id: unit.id });
    if (!personIds.has(unit.leadPersonId)) fail("INVALID_UNIT_LEAD", `${unit.name} requires an active lead.`, { unitId: unit.id });
    seen.add(unit.id);
    return unit;
  });
}

function normalizeUnit(value, index) {
  const id = clean(value?.id);
  const name = clean(value?.name);
  const leadPersonId = clean(value?.leadPersonId);
  const priorityFrameworkId = clean(value?.priorityFrameworkId);
  if (!id) fail("INVALID_UNIT", `Organization unit ${index + 1} requires an id.`);
  if (!name) fail("INVALID_UNIT", `Organization unit ${id} requires a name.`, { id });
  if (!leadPersonId) fail("INVALID_UNIT_LEAD", `${name} requires a lead.`, { unitId: id });
  if (id.length > 200 || name.length > 160) fail("INVALID_UNIT", "Organization unit fields exceed their supported length.", { id });
  if (priorityFrameworkId && !/^[a-z0-9][a-z0-9-]{0,63}$/.test(priorityFrameworkId)) {
    fail("INVALID_UNIT", `${name} references an invalid prioritization framework.`, { id, priorityFrameworkId });
  }
  return {
    id,
    name,
    parentId: clean(value?.parentId),
    leadPersonId,
    priorityFrameworkId,
    position: nonNegativeInteger(value?.position, index)
  };
}

function validateTree(units) {
  const byId = new Map(units.map((unit) => [unit.id, unit]));
  const roots = units.filter((unit) => !unit.parentId);
  if (units.length && roots.length !== 1) fail("ROOT_COUNT", "A configured organization requires exactly one root unit.");
  const siblingNames = new Set();
  for (const unit of units) {
    if (unit.parentId && !byId.has(unit.parentId)) fail("PARENT_NOT_FOUND", `${unit.name} references a missing parent.`, { unitId: unit.id });
    const siblingKey = `${unit.parentId}\0${unit.name.toLocaleLowerCase()}`;
    if (siblingNames.has(siblingKey)) fail("DUPLICATE_UNIT_NAME", `${unit.name} already exists under that parent.`, { unitId: unit.id });
    siblingNames.add(siblingKey);
    const visited = new Set([unit.id]);
    let cursor = unit;
    let depth = 1;
    while (cursor.parentId) {
      if (visited.has(cursor.parentId)) fail("UNIT_CYCLE", "The organization hierarchy contains a cycle.", { unitId: unit.id });
      visited.add(cursor.parentId);
      cursor = byId.get(cursor.parentId);
      depth += 1;
      if (!cursor) break;
      if (depth > ORGANIZATION_LIMITS.depth) {
        fail("DEPTH_LIMIT", `Organization units can be nested at most ${ORGANIZATION_LIMITS.depth} levels deep.`, { unitId: unit.id });
      }
    }
  }
}

function nextOrganization(current, patch) {
  return normalizeOrganization({
    ...current,
    ...patch,
    version: current.version + 1
  });
}

function normalizeSiblingPositions(units) {
  const grouped = new Map();
  for (const unit of units) {
    const group = grouped.get(unit.parentId) || [];
    group.push(unit);
    grouped.set(unit.parentId, group);
  }
  return [...grouped.values()].flatMap((group) => group.sort(unitSort).map((unit, position) => ({ ...unit, position })));
}

function siblingUnits(units, parentId) {
  return units.filter((unit) => unit.parentId === parentId);
}

function unitSort(left, right) {
  return left.position - right.position || left.name.localeCompare(right.name);
}

function legacyPersonId(displayName, used) {
  const base = clean(displayName).toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "person";
  let id = `legacy-person:${base}`;
  let suffix = 2;
  while (used.has(id)) {
    id = `legacy-person:${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function makeId(kind, idFactory) {
  const generated = typeof idFactory === "function" ? clean(idFactory(kind)) : "";
  if (generated) return generated;
  if (globalThis.crypto?.randomUUID) return `${kind}:${globalThis.crypto.randomUUID()}`;
  return `${kind}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function positiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function nonNegativeInteger(value, fallback) {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fail(code, message, details) {
  throw new OrganizationError(code, message, details);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const entry of Object.values(value)) deepFreeze(entry);
  return Object.freeze(value);
}
