export const PRIORITIZATION_VERSION = 1;
export const MAX_CUSTOM_PRIORITY_FRAMEWORKS = 10;
export const MIN_CUSTOM_PRIORITY_CRITERIA = 2;
export const MAX_CUSTOM_PRIORITY_CRITERIA = 8;

export const PRIORITY_METHOD_IDS = Object.freeze(["manual", "levels", "rice", "ice", "wsjf", "value-effort", "custom"]);
export const PRIORITY_METHODS = Object.freeze({
  manual: Object.freeze({ id: "manual", label: "Pecking order", name: "Pecking order", kind: "manual" }),
  levels: Object.freeze({ id: "levels", label: "Priority levels", name: "Priority levels", kind: "levels" }),
  rice: Object.freeze({ id: "rice", label: "RICE", name: "RICE", kind: "score" }),
  ice: Object.freeze({ id: "ice", label: "ICE", name: "ICE", kind: "score" }),
  wsjf: Object.freeze({ id: "wsjf", label: "WSJF", name: "WSJF", kind: "score" }),
  "value-effort": Object.freeze({ id: "value-effort", label: "Value / Effort", name: "Value / Effort", kind: "score" }),
  custom: Object.freeze({ id: "custom", label: "Custom scorecard", name: "Custom scorecard", kind: "score" })
});

const frameworkIdPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;
const directions = new Set(["higher", "lower"]);
const MAX_MANUAL_ORDER = 1000;
const MAX_LEVELS = 6;
const defaultLevels = Object.freeze([
  Object.freeze({ id: "level-1", label: "P0" }),
  Object.freeze({ id: "level-2", label: "P1" }),
  Object.freeze({ id: "level-3", label: "P2" }),
  Object.freeze({ id: "level-4", label: "P3" })
]);
const defaultLegacyScorecard = Object.freeze({
  name: "Custom scorecard",
  criteria: Object.freeze([
    Object.freeze({ id: "customer-value", name: "Customer value", description: "Expected value for the target customer.", weight: 3, direction: "higher", archived: false }),
    Object.freeze({ id: "delivery-effort", name: "Delivery effort", description: "Relative cost and complexity to deliver.", weight: 2, direction: "lower", archived: false })
  ])
});

const builtInDefinitions = [
  {
    id: "rice",
    name: "RICE",
    description: "Balances reach, impact, confidence, and effort.",
    formula: "(Reach x Impact x Confidence) / Effort",
    fields: [
      field("reach", "Reach", 0, 100000),
      field("impact", "Impact", 1, 5),
      field("confidence", "Confidence", 0.1, 1, 0.1),
      field("effort", "Effort", 1, 8)
    ]
  },
  {
    id: "ice",
    name: "ICE",
    description: "A lightweight comparison of impact, confidence, and ease.",
    formula: "Impact x Confidence x Ease",
    fields: [field("impact", "Impact", 1, 10), field("confidence", "Confidence", 1, 10), field("ease", "Ease", 1, 10)]
  },
  {
    id: "wsjf",
    name: "WSJF",
    description: "Orders work by cost of delay relative to job size.",
    formula: "(Business value + Time criticality + Risk reduction) / Job size",
    fields: [
      field("businessValue", "Business value", 1, 10),
      field("timeCriticality", "Time criticality", 1, 10),
      field("riskReduction", "Risk reduction", 1, 10),
      field("jobSize", "Job size", 1, 10)
    ]
  },
  {
    id: "value-effort",
    name: "Value / Effort",
    description: "A simple value-to-complexity comparison.",
    formula: "Value / Effort",
    fields: [field("value", "Value", 1, 10), field("effort", "Effort", 1, 10)]
  }
];

export const BUILT_IN_PRIORITY_FRAMEWORKS = Object.freeze(builtInDefinitions.map((definition) => deepFreeze({ ...definition, builtIn: true })));
const orderingFrameworks = Object.freeze([
  deepFreeze({ id: "manual", name: "Pecking order", description: "An explicit shared initiative order.", formula: "Manual order", fields: [], builtIn: true, kind: "manual" }),
  deepFreeze({ id: "levels", name: "Priority levels", description: "Configured levels with manual order inside each level.", formula: "Level, then manual order", fields: [], builtIn: true, kind: "levels" })
]);

export class PrioritizationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "PrioritizationError";
    this.details = Object.freeze({ ...details });
  }
}

export function defaultPrioritization(items = []) {
  return deepFreeze({
    version: PRIORITIZATION_VERSION,
    defaultFrameworkId: "rice",
    customFrameworks: [],
    activeMethodId: "rice",
    manualOrder: legacyRiceOrder(items),
    levels: defaultLevels.map((level) => ({ ...level })),
    customScorecard: structuredClone(defaultLegacyScorecard)
  });
}

export function normalizePrioritization(input = defaultPrioritization(), options = {}) {
  if (!plainObject(input)) fail("Prioritization settings must be an object.");
  const version = input.version === undefined ? PRIORITIZATION_VERSION : Number(input.version);
  if (!Number.isInteger(version) || version < 1) fail("Prioritization version must be a positive integer.");

  const explicitLegacyScorecard = plainObject(input.customScorecard);
  const sourceFrameworks = Array.isArray(input.customFrameworks) ? [...input.customFrameworks] : [];
  if (!sourceFrameworks.length && explicitLegacyScorecard) {
    sourceFrameworks.push(legacyScorecardFramework(input.customScorecard));
  }
  if (sourceFrameworks.length > MAX_CUSTOM_PRIORITY_FRAMEWORKS) {
    fail(`A workspace can define at most ${MAX_CUSTOM_PRIORITY_FRAMEWORKS} custom prioritization frameworks.`);
  }

  const ids = new Set([...orderingFrameworks, ...BUILT_IN_PRIORITY_FRAMEWORKS].map((framework) => framework.id));
  const names = new Set([...orderingFrameworks, ...BUILT_IN_PRIORITY_FRAMEWORKS].map((framework) => framework.name.toLowerCase()));
  const customFrameworks = sourceFrameworks.map((framework, index) => normalizeCustomFramework(framework, index, ids, names));

  const requested = clean(input.defaultFrameworkId) || legacyDefaultFrameworkId(input.activeMethodId, customFrameworks);
  const defaultFrameworkId = requested === "custom" ? customFrameworks[0]?.id || "rice" : requested;
  if (!ids.has(defaultFrameworkId)) fail("The default prioritization framework is not available.", { defaultFrameworkId });

  const knownIds = Array.isArray(options.items) ? new Set(options.items.map((item) => clean(item?.id)).filter(Boolean)) : null;
  const rawManualOrder = input.manualOrder === undefined ? legacyRiceOrder(options.items || []) : input.manualOrder;
  if (!Array.isArray(rawManualOrder) || rawManualOrder.length > MAX_MANUAL_ORDER) fail("Manual order must contain at most 1,000 initiative ids.");
  const normalizedManualOrder = rawManualOrder.map((entry) => clean(entry).slice(0, 200)).filter(Boolean);
  if (normalizedManualOrder.length !== rawManualOrder.length || new Set(normalizedManualOrder).size !== normalizedManualOrder.length) {
    fail("Manual order ids must be non-empty and unique.");
  }
  const manualOrder = normalizedManualOrder.filter((id) => !knownIds || knownIds.has(id));
  const levels = normalizeLevels(input.levels);
  const activeMethodId = methodIdForFramework(defaultFrameworkId);
  const selectedCustom = customFrameworks.find((framework) => framework.id === defaultFrameworkId) || customFrameworks[0];
  const customScorecard = selectedCustom ? legacyScorecardProjection(selectedCustom) : structuredClone(defaultLegacyScorecard);

  return deepFreeze({ version, defaultFrameworkId, customFrameworks, activeMethodId, manualOrder, levels, customScorecard });
}

export function priorityFrameworks(prioritization = defaultPrioritization()) {
  const normalized = normalizePrioritization(prioritization);
  return [...orderingFrameworks, ...BUILT_IN_PRIORITY_FRAMEWORKS, ...normalized.customFrameworks];
}

export function priorityFrameworkForId(prioritization, frameworkId) {
  const normalized = normalizePrioritization(prioritization);
  let id = clean(frameworkId) || normalized.defaultFrameworkId;
  if (id === "custom") id = normalized.customFrameworks[0]?.id || normalized.defaultFrameworkId;
  return orderingFrameworks.find((framework) => framework.id === id)
    || BUILT_IN_PRIORITY_FRAMEWORKS.find((framework) => framework.id === id)
    || normalized.customFrameworks.find((framework) => framework.id === id)
    || priorityFrameworkForId(normalized, normalized.defaultFrameworkId);
}

export function methodDefinition(prioritization = defaultPrioritization()) {
  const normalized = normalizePrioritization(prioritization);
  const framework = priorityFrameworkForId(normalized, normalized.defaultFrameworkId);
  const kind = framework.kind || "score";
  return deepFreeze({ id: normalized.activeMethodId, frameworkId: framework.id, label: framework.name, name: framework.name, kind });
}

export function effectivePriorityFramework(prioritization, organization, orgUnitId = "", options = {}) {
  const normalized = normalizePrioritization(prioritization);
  const exactTeam = options.allowTeamOverride !== false && clean(orgUnitId)
    ? organization?.units?.find((unit) => clean(unit.id) === clean(orgUnitId))
    : null;
  const overrideId = clean(exactTeam?.priorityFrameworkId);
  const framework = priorityFrameworkForId(normalized, overrideId || normalized.defaultFrameworkId);
  return deepFreeze({ framework, source: overrideId ? "team" : "workspace", teamId: overrideId ? clean(orgUnitId) : "" });
}

export function normalizePriorityInputs(value, legacyItem = null) {
  const source = plainObject(value) ? value : {};
  const output = {};
  for (const [frameworkId, inputs] of Object.entries(source)) {
    if (!frameworkIdPattern.test(frameworkId) || !plainObject(inputs)) continue;
    const normalized = numericInputs(inputs);
    if (Object.keys(normalized).length) output[frameworkId] = normalized;
  }

  const legacyPriority = plainObject(legacyItem?.priority) ? legacyItem.priority : {};
  const legacyValues = plainObject(legacyPriority.valuesByMethod) ? legacyPriority.valuesByMethod : {};
  for (const methodId of ["ice", "wsjf", "value-effort"]) {
    if (!output[methodId] && plainObject(legacyValues[methodId])) output[methodId] = numericInputs(legacyValues[methodId]);
  }
  if (!Object.keys(output).some((id) => id.startsWith("custom-")) && plainObject(legacyValues.custom)) {
    output["custom-scorecard"] = numericInputs(legacyValues.custom);
  }
  if (legacyItem && !output.rice && (legacyValues.rice?.scored === true || legacyItem.priorityInputs === undefined)) {
    output.rice = {
      reach: Number(legacyItem.reach),
      impact: Number(legacyItem.impact),
      confidence: Number(legacyItem.confidence),
      effort: Number(legacyItem.effort)
    };
  }
  return deepFreeze(output);
}

export function normalizeItemPriority(value, options = {}) {
  const source = plainObject(value) ? value : {};
  const valuesByMethod = {};
  for (const methodId of ["rice", "ice", "wsjf", "value-effort", "custom"]) {
    if (!plainObject(source.valuesByMethod?.[methodId])) continue;
    valuesByMethod[methodId] = { ...numericInputs(source.valuesByMethod[methodId]) };
    if (source.valuesByMethod[methodId].scored === true) valuesByMethod[methodId].scored = true;
  }
  const inputs = plainObject(options.priorityInputs) ? options.priorityInputs : {};
  for (const methodId of ["ice", "wsjf", "value-effort"]) {
    if (!valuesByMethod[methodId] && plainObject(inputs[methodId])) valuesByMethod[methodId] = numericInputs(inputs[methodId]);
  }
  const customEntry = Object.entries(inputs).find(([id, entry]) => id.startsWith("custom-") && plainObject(entry));
  if (!valuesByMethod.custom && customEntry) valuesByMethod.custom = numericInputs(customEntry[1]);
  if ((options.legacyRice === true || value === undefined) && !valuesByMethod.rice) valuesByMethod.rice = { scored: true };
  const levelId = clean(source.tierByMethod?.levels || options.priorityLevelId);
  return deepFreeze({ valuesByMethod, tierByMethod: levelId ? { levels: levelId } : {} });
}

export function assertPriorityAssignments(prioritization, organization, items = []) {
  const normalized = normalizePrioritization(prioritization, { items });
  const frameworks = new Map(priorityFrameworks(normalized).map((framework) => [framework.id, framework]));
  for (const unit of organization?.units || []) {
    const frameworkId = clean(unit.priorityFrameworkId);
    if (frameworkId && !frameworks.has(frameworkId)) {
      fail(`Organization unit ${unit.id} references a missing prioritization framework.`, { unitId: unit.id, frameworkId });
    }
  }
  const levelIds = new Set(normalized.levels.map((level) => level.id));
  for (const item of items) {
    const levelId = clean(item?.priority?.tierByMethod?.levels || item?.priorityLevelId);
    if (levelId && !levelIds.has(levelId)) fail(`Initiative ${item.id} references a missing priority level.`, { itemId: item.id, levelId });
    for (const [frameworkId, inputs] of Object.entries(item.priorityInputs || {})) {
      const framework = frameworks.get(frameworkId);
      if (!framework) fail(`Initiative ${item.id} references a missing prioritization framework.`, { itemId: item.id, frameworkId });
      if (!framework.fields.length) continue;
      const fieldIds = new Set(framework.fields.map((entry) => entry.id));
      const invalid = Object.keys(inputs).find((criterionId) => !fieldIds.has(criterionId));
      if (invalid) fail(`Initiative ${item.id} contains an unknown ${framework.name} criterion.`, { itemId: item.id, frameworkId, criterionId: invalid });
      for (const [criterionId, raw] of Object.entries(inputs)) {
        const definition = framework.fields.find((entry) => entry.id === criterionId);
        if (!validFieldValue(raw, definition)) fail(`Initiative ${item.id} contains an invalid ${framework.name} value for ${definition.name}.`, { itemId: item.id, frameworkId, criterionId });
      }
    }
  }
  return normalized;
}

export function calculateRiceScore(item) {
  const inputs = item?.priorityInputs?.rice;
  const reach = Number(inputs?.reach ?? item?.reach) || 0;
  const impact = Number(inputs?.impact ?? item?.impact) || 0;
  const confidence = Number(inputs?.confidence ?? item?.confidence) || 0;
  const effort = Number(inputs?.effort ?? item?.effort) || 1;
  return roundScore((reach * impact * confidence) / effort);
}

export function priorityScore(item, frameworkOrId, prioritization = defaultPrioritization()) {
  const policy = normalizePrioritization(prioritization);
  const framework = typeof frameworkOrId === "object" && frameworkOrId ? frameworkOrId : priorityFrameworkForId(policy, frameworkOrId);
  if (framework.id === "manual") {
    const index = policy.manualOrder.indexOf(clean(item?.id));
    return deepFreeze({ frameworkId: framework.id, label: framework.name, value: index >= 0 ? index + 1 : null, complete: index >= 0, missingFields: index >= 0 ? [] : ["manualOrder"] });
  }
  if (framework.id === "levels") {
    const levelId = clean(item?.priority?.tierByMethod?.levels || item?.priorityLevelId);
    const index = policy.levels.findIndex((level) => level.id === levelId);
    return deepFreeze({ frameworkId: framework.id, label: framework.name, value: index >= 0 ? policy.levels.length - index : null, complete: index >= 0, missingFields: index >= 0 ? [] : ["priorityLevel"], levelId, levelLabel: policy.levels[index]?.label || "Unassigned" });
  }
  const inputs = priorityInputsForFramework(item, framework);
  const missingFields = framework.fields.filter((entry) => !validFieldValue(inputs[entry.id], entry)).map((entry) => entry.id);
  if (missingFields.length) return deepFreeze({ frameworkId: framework.id, label: framework.name, value: null, complete: false, missingFields });
  let value;
  if (framework.id === "rice") value = (inputs.reach * inputs.impact * inputs.confidence) / inputs.effort;
  else if (framework.id === "ice") value = inputs.impact * inputs.confidence * inputs.ease;
  else if (framework.id === "wsjf") value = (inputs.businessValue + inputs.timeCriticality + inputs.riskReduction) / inputs.jobSize;
  else if (framework.id === "value-effort") value = inputs.value / inputs.effort;
  else {
    const weighted = framework.fields.reduce((total, entry) => {
      const normalized = entry.direction === "lower" ? (10 - inputs[entry.id]) / 9 : (inputs[entry.id] - 1) / 9;
      return total + normalized * entry.weight;
    }, 0);
    const weights = framework.fields.reduce((total, entry) => total + entry.weight, 0);
    value = weights ? (weighted / weights) * 100 : 0;
  }
  return deepFreeze({ frameworkId: framework.id, label: framework.name, value: roundScore(value), complete: true, missingFields: [] });
}

export function comparePriorityItems(left, right, frameworkOrId, prioritization = defaultPrioritization()) {
  const policy = normalizePrioritization(prioritization);
  const framework = typeof frameworkOrId === "object" && frameworkOrId ? frameworkOrId : priorityFrameworkForId(policy, frameworkOrId);
  const leftScore = priorityScore(left, framework, policy);
  const rightScore = priorityScore(right, framework, policy);
  if (leftScore.complete !== rightScore.complete) return leftScore.complete ? -1 : 1;
  if (framework.id === "manual") {
    const delta = manualIndex(left?.id, policy.manualOrder) - manualIndex(right?.id, policy.manualOrder);
    if (delta) return delta;
  } else if (framework.id === "levels") {
    const levelDelta = levelIndex(left, policy) - levelIndex(right, policy);
    if (levelDelta) return levelDelta;
    const manualDelta = manualIndex(left?.id, policy.manualOrder) - manualIndex(right?.id, policy.manualOrder);
    if (manualDelta) return manualDelta;
  } else if (leftScore.complete && rightScore.value !== leftScore.value) {
    return rightScore.value - leftScore.value;
  }
  // Editing an unranked initiative must not silently change a manual decision.
  if (framework.id !== "manual" && framework.id !== "levels") {
    const updated = timestamp(right?.updatedAt) - timestamp(left?.updatedAt);
    if (updated) return updated;
  }
  const title = clean(left?.title).localeCompare(clean(right?.title));
  return title || clean(left?.id).localeCompare(clean(right?.id));
}

export function prioritizeByFramework(items = [], frameworkOrId, prioritization = defaultPrioritization()) {
  return [...items].sort((left, right) => comparePriorityItems(left, right, frameworkOrId, prioritization));
}

export function prioritizeItems(items = [], prioritization = defaultPrioritization()) {
  const policy = normalizePrioritization(prioritization, { items });
  return prioritizeByFramework(items, policy.defaultFrameworkId, policy);
}

export function evaluatePriority(item, prioritization = defaultPrioritization()) {
  const policy = normalizePrioritization(prioritization);
  const framework = priorityFrameworkForId(policy, policy.defaultFrameworkId);
  const result = priorityScore(item, framework, policy);
  if (framework.id === "manual") return { complete: result.complete, score: null, missing: result.complete ? [] : ["Manual rank"], breakdown: [] };
  if (framework.id === "levels") return { complete: result.complete, score: result.value, missing: result.complete ? [] : ["Priority level"], breakdown: result.complete ? [{ label: "Level", value: result.levelLabel }] : [], levelId: result.levelId, levelLabel: result.levelLabel, levelIndex: levelIndex(item, policy) };
  const inputs = priorityInputsForFramework(item, framework);
  return {
    complete: result.complete,
    score: result.value,
    missing: result.missingFields.map((id) => framework.fields.find((entry) => entry.id === id)?.name || id),
    breakdown: framework.fields.filter((entry) => inputs[entry.id] !== undefined).map((entry) => ({ label: entry.name, value: inputs[entry.id] }))
  };
}

export function priorityDisplay(item, prioritization = defaultPrioritization(), items = []) {
  const policy = normalizePrioritization(prioritization, items.length ? { items } : {});
  const framework = priorityFrameworkForId(policy, policy.defaultFrameworkId);
  const result = evaluatePriority(item, policy);
  const ranked = prioritizeItems(items.length ? items : [item], policy);
  const rank = ranked.findIndex((entry) => entry.id === item.id) + 1;
  const method = methodDefinition(policy);
  if (!result.complete && framework.id === "manual") return { ...result, method, rank, shortLabel: "Unranked", valueLabel: "Unranked" };
  if (!result.complete && framework.id === "levels") return { ...result, method, rank, shortLabel: "Unassigned", valueLabel: "Unassigned" };
  if (!result.complete) return { ...result, method, rank, shortLabel: "Needs scoring", valueLabel: "Needs scoring" };
  if (framework.id === "manual") return { ...result, method, rank, shortLabel: `#${rank}`, valueLabel: `Rank ${rank}` };
  if (framework.id === "levels") return { ...result, method, rank, shortLabel: result.levelLabel, valueLabel: result.levelLabel };
  return { ...result, method, rank, shortLabel: `${framework.name} ${formatScore(result.score)}`, valueLabel: formatScore(result.score) };
}

export function priorityInfluence(items, prioritization = defaultPrioritization(), maximum = 50) {
  const ranked = prioritizeItems(items, prioritization);
  const max = Math.max(0, Number(maximum) || 0);
  const denominator = Math.max(1, ranked.length - 1);
  return new Map(ranked.map((item, index) => [item.id, ranked.length === 1 ? max : Math.round(max * (ranked.length - 1 - index) / denominator)]));
}

export function filterItemsForBoardTeam(items = [], teamId = "all", organization = { units: [] }) {
  const selected = clean(teamId) || "all";
  if (selected === "all" || (selected !== "unassigned" && !organization?.units?.some((unit) => clean(unit.id) === selected))) return [...items];
  if (selected === "unassigned") return items.filter((item) => !clean(item?.orgUnitId));
  return items.filter((item) => clean(item?.orgUnitId) === selected);
}

export function customPriorityFrameworkId(name, existingIds = []) {
  const baseName = clean(name).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "framework";
  const base = `custom-${baseName}`;
  const used = new Set([...orderingFrameworks, ...BUILT_IN_PRIORITY_FRAMEWORKS].map((framework) => framework.id).concat(existingIds));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function normalizeCustomFramework(input, index, ids, names) {
  if (!plainObject(input)) fail(`Custom prioritization framework ${index + 1} must be an object.`);
  const id = clean(input.id);
  const name = clean(input.name);
  if (!frameworkIdPattern.test(id) || !id.startsWith("custom-")) fail(`Custom prioritization framework ${index + 1} has an invalid id.`);
  if (!name || name.length > 80) fail(`Custom prioritization framework ${index + 1} requires a name of 80 characters or fewer.`);
  if (ids.has(id)) fail(`Prioritization framework id ${id} is duplicated.`);
  if (names.has(name.toLowerCase())) fail(`Prioritization framework name ${name} is duplicated.`);
  const criteria = Array.isArray(input.criteria) ? input.criteria : Array.isArray(input.fields) ? input.fields : [];
  if (criteria.length < MIN_CUSTOM_PRIORITY_CRITERIA || criteria.length > MAX_CUSTOM_PRIORITY_CRITERIA) {
    fail(`Custom framework ${name} requires between ${MIN_CUSTOM_PRIORITY_CRITERIA} and ${MAX_CUSTOM_PRIORITY_CRITERIA} criteria.`);
  }
  const criterionIds = new Set();
  const criterionNames = new Set();
  const fields = criteria.filter((criterion) => !criterion?.archived).map((criterion, criterionIndex) => normalizeCriterion(criterion, criterionIndex, name, criterionIds, criterionNames));
  if (fields.length < MIN_CUSTOM_PRIORITY_CRITERIA) fail(`Custom framework ${name} requires at least ${MIN_CUSTOM_PRIORITY_CRITERIA} active criteria.`);
  ids.add(id);
  names.add(name.toLowerCase());
  return deepFreeze({ id, name, description: clean(input.description).slice(0, 400), formula: "Weighted 1-10 criteria", fields, builtIn: false });
}

function normalizeCriterion(input, index, frameworkName, ids, names) {
  if (!plainObject(input)) fail(`Criterion ${index + 1} in ${frameworkName} must be an object.`);
  const id = clean(input.id);
  const name = clean(input.name);
  const direction = clean(input.direction) || "higher";
  const weight = Number(input.weight);
  if (!frameworkIdPattern.test(id)) fail(`Criterion ${index + 1} in ${frameworkName} has an invalid id.`);
  if (!name || name.length > 80) fail(`Criterion ${index + 1} in ${frameworkName} requires a name.`);
  if (ids.has(id) || names.has(name.toLowerCase())) fail(`Criterion ${name} is duplicated in ${frameworkName}.`);
  if (!Number.isInteger(weight) || weight < 1 || weight > 5) fail(`Criterion ${name} weight must be between 1 and 5.`);
  if (!directions.has(direction)) fail(`Criterion ${name} direction must be higher or lower.`);
  ids.add(id);
  names.add(name.toLowerCase());
  return deepFreeze({ id, name, min: 1, max: 10, step: 1, weight, direction });
}

function normalizeLevels(value) {
  if (value === undefined) return defaultLevels.map((level) => ({ ...level }));
  if (!Array.isArray(value) || value.length < 2 || value.length > MAX_LEVELS) fail("Priority levels must contain between two and six levels.");
  const ids = new Set();
  return value.map((entry, index) => {
    if (!plainObject(entry)) fail(`Priority level ${index + 1} must be an object.`);
    const id = clean(entry.id).replace(/[^a-zA-Z0-9:_-]/g, "-").slice(0, 80) || `level-${index + 1}`;
    const label = clean(entry.label).slice(0, 30);
    if (!label) fail(`Priority level ${index + 1} requires a label.`);
    if (ids.has(id)) fail("Priority level ids must be unique.");
    ids.add(id);
    return { id, label };
  });
}

function legacyScorecardFramework(value) {
  const criteria = Array.isArray(value?.criteria) ? value.criteria : [];
  return {
    id: "custom-scorecard",
    name: clean(value?.name).slice(0, 80) || "Custom scorecard",
    description: "Migrated from the workspace custom scorecard.",
    criteria: criteria.map((criterion) => ({ ...criterion, archived: undefined }))
  };
}

function legacyScorecardProjection(framework) {
  return {
    name: framework.name,
    criteria: framework.fields.map((criterion) => ({ id: criterion.id, name: criterion.name, description: "", weight: criterion.weight, direction: criterion.direction, archived: false }))
  };
}

function legacyDefaultFrameworkId(activeMethodId, customFrameworks) {
  const methodId = clean(activeMethodId) || "rice";
  if (methodId === "custom") return customFrameworks[0]?.id || "rice";
  return methodId;
}

function methodIdForFramework(frameworkId) {
  return frameworkId.startsWith("custom-") ? "custom" : frameworkId;
}

function priorityInputsForFramework(item, framework) {
  if (framework.id === "rice") {
    // An explicit input map is authoritative, including empty or partial scores.
    // Only unmigrated records may fall back to the old top-level fields.
    if (plainObject(item?.priorityInputs)) return plainObject(item.priorityInputs.rice) ? item.priorityInputs.rice : {};
    return { reach: item?.reach, impact: item?.impact, confidence: item?.confidence, effort: item?.effort };
  }
  if (plainObject(item?.priorityInputs?.[framework.id])) return item.priorityInputs[framework.id];
  const legacyMethod = framework.id.startsWith("custom-") ? "custom" : framework.id;
  return plainObject(item?.priority?.valuesByMethod?.[legacyMethod]) ? item.priority.valuesByMethod[legacyMethod] : {};
}

function numericInputs(value) {
  const output = {};
  for (const [criterionId, raw] of Object.entries(value || {})) {
    if (!frameworkIdPattern.test(criterionId) || criterionId === "scored") continue;
    const number = Number(raw);
    if (Number.isFinite(number)) output[criterionId] = number;
  }
  return output;
}

function levelIndex(item, policy) {
  const levelId = clean(item?.priority?.tierByMethod?.levels || item?.priorityLevelId);
  const index = policy.levels.findIndex((level) => level.id === levelId);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

function manualIndex(id, order) {
  const index = order.indexOf(clean(id));
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

function legacyRiceOrder(items) {
  return [...(Array.isArray(items) ? items : [])].sort((left, right) => calculateRiceScore(right) - calculateRiceScore(left)
    || clean(left?.title).localeCompare(clean(right?.title)) || clean(left?.id).localeCompare(clean(right?.id)))
    .map((item) => clean(item?.id)).filter(Boolean).slice(0, MAX_MANUAL_ORDER);
}

function field(id, name, min, max, step = 1) { return { id, name, min, max, step, weight: 1, direction: "higher" }; }
function validFieldValue(value, definition) { const number = Number(value); return value !== "" && value !== null && value !== undefined && Number.isFinite(number) && number >= definition.min && number <= definition.max; }
function formatScore(value) { return Number.isInteger(value) ? String(value) : String(roundScore(value)); }
function roundScore(value) { return Math.round(value * 10) / 10; }
function timestamp(value) { const result = new Date(value || 0).getTime(); return Number.isFinite(result) ? result : 0; }
function clean(value) { return String(value ?? "").trim(); }
function plainObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function fail(message, details = {}) { throw new PrioritizationError(message, details); }
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}
