export const EXPERIENCE_VERSION = 1;

export const EXPERIENCE_CAPABILITIES = Object.freeze([
  Object.freeze({ id: "research-validation", bundleId: "discovery", label: "Research & validation", description: "Plan studies and run validation experiments." }),
  Object.freeze({ id: "customer-support", bundleId: "discovery", label: "Customer & support operations", description: "Manage customer intelligence and support cases." }),
  Object.freeze({ id: "timeline-planning", bundleId: "planning", label: "Timeline planning", description: "Plan periods and use the shared timeline scope." }),
  Object.freeze({ id: "advanced-prioritization", bundleId: "planning", label: "Advanced prioritization", description: "Use scoring methods, levels, and configurable frameworks." }),
  Object.freeze({ id: "portfolio-planning", bundleId: "planning", label: "Portfolio planning", description: "Review portfolio, capacity, outcomes, and metrics." }),
  Object.freeze({ id: "custom-workflow", bundleId: "planning", label: "Custom workflow", description: "Configure initiative stages and reporting categories." }),
  Object.freeze({ id: "delivery-tracking", bundleId: "delivery", label: "Delivery tracking", description: "Track committed work and dependencies." }),
  Object.freeze({ id: "launch-readiness", bundleId: "delivery", label: "Launch & rollout readiness", description: "Prepare rollout, launch, and enablement plans." }),
  Object.freeze({ id: "shared-workspace", bundleId: "collaboration", label: "Shared workspace", description: "Connect a multi-user Team workspace without requiring an org chart." }),
  Object.freeze({ id: "team-ownership", bundleId: "collaboration", label: "Team ownership", description: "Model people, teams, ownership, and team-scoped boards." }),
  Object.freeze({ id: "activity-history", bundleId: "collaboration", label: "Activity history", description: "Review the workspace change trail and digest." }),
  Object.freeze({ id: "leadership-briefing", bundleId: "leadership", label: "Executive briefing", description: "Prepare executive, stakeholder, escalation, and decision views." }),
  Object.freeze({ id: "communications-reviews", bundleId: "leadership", label: "Communications & reviews", description: "Create updates, agendas, reviews, retros, specs, and templates." })
]);

export const EXPERIENCE_CAPABILITY_IDS = Object.freeze(EXPERIENCE_CAPABILITIES.map((capability) => capability.id));

export const EXPERIENCE_BUNDLES = Object.freeze([
  bundle("discovery", "Discovery", "Add structured research, validation, customer intelligence, and support workflows."),
  bundle("planning", "Planning", "Add timeline, portfolio, prioritization, and workflow governance."),
  bundle("delivery", "Delivery", "Add delivery tracking, launch readiness, rollout, and enablement."),
  bundle("collaboration", "Collaboration", "Add shared Team storage, ownership structure, and activity history."),
  bundle("leadership", "Leadership", "Add executive briefing, communications, reviews, and reusable artifacts.")
]);

const capabilityIds = new Set(EXPERIENCE_CAPABILITY_IDS);

export class WorkspaceExperienceError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "WorkspaceExperienceError";
    this.details = Object.freeze({ ...details });
  }
}

export function focusedWorkspaceExperience() {
  return immutable({ version: EXPERIENCE_VERSION, enabledCapabilities: [] });
}

export function fullWorkspaceExperience() {
  return immutable({ version: EXPERIENCE_VERSION, enabledCapabilities: [...EXPERIENCE_CAPABILITY_IDS] });
}

export function normalizeWorkspaceExperience(input = focusedWorkspaceExperience()) {
  if (!plainObject(input)) fail("Workspace experience must be an object.");
  const version = input.version === undefined ? EXPERIENCE_VERSION : Number(input.version);
  if (!Number.isInteger(version) || version < 1) fail("Workspace experience version must be a positive integer.");
  if (!Array.isArray(input.enabledCapabilities)) fail("Workspace experience enabledCapabilities must be an array.");
  if (input.enabledCapabilities.length > EXPERIENCE_CAPABILITY_IDS.length) fail("Workspace experience enables too many capabilities.");
  const enabledCapabilities = input.enabledCapabilities.map((entry) => String(entry || "").trim());
  const unknown = enabledCapabilities.find((id) => !capabilityIds.has(id));
  if (unknown) fail(`Unknown workspace capability: ${unknown}.`, { capabilityId: unknown });
  if (new Set(enabledCapabilities).size !== enabledCapabilities.length) fail("Workspace capabilities must be unique.");
  const selected = new Set(enabledCapabilities);
  return immutable({ version, enabledCapabilities: EXPERIENCE_CAPABILITY_IDS.filter((id) => selected.has(id)) });
}

export function workspaceExperienceProfile(experience) {
  const normalized = normalizeWorkspaceExperience(experience);
  if (!normalized.enabledCapabilities.length) return "focused";
  if (normalized.enabledCapabilities.length === EXPERIENCE_CAPABILITY_IDS.length) return "full";
  return "custom";
}

export function workspaceCapabilityEnabled(experience, capabilityId) {
  if (!capabilityIds.has(capabilityId)) return false;
  return normalizeWorkspaceExperience(experience).enabledCapabilities.includes(capabilityId);
}

export function workspaceBundleState(experience, bundleId) {
  const bundleDefinition = EXPERIENCE_BUNDLES.find((entry) => entry.id === bundleId);
  if (!bundleDefinition) return "off";
  const enabled = new Set(normalizeWorkspaceExperience(experience).enabledCapabilities);
  const count = bundleDefinition.capabilityIds.filter((id) => enabled.has(id)).length;
  if (!count) return "off";
  return count === bundleDefinition.capabilityIds.length ? "on" : "mixed";
}

export function updateWorkspaceExperience(experience, patch = {}) {
  const current = normalizeWorkspaceExperience(experience);
  let selected = new Set(current.enabledCapabilities);
  if (patch.reset === "focused") selected = new Set();
  if (patch.reset === "full") selected = new Set(EXPERIENCE_CAPABILITY_IDS);
  if (patch.bundleId) {
    const bundleDefinition = EXPERIENCE_BUNDLES.find((entry) => entry.id === patch.bundleId);
    if (!bundleDefinition) fail(`Unknown workspace bundle: ${patch.bundleId}.`, { bundleId: patch.bundleId });
    for (const id of bundleDefinition.capabilityIds) patch.enabled === true ? selected.add(id) : selected.delete(id);
  }
  if (patch.capabilityId) {
    if (!capabilityIds.has(patch.capabilityId)) fail(`Unknown workspace capability: ${patch.capabilityId}.`, { capabilityId: patch.capabilityId });
    patch.enabled === true ? selected.add(patch.capabilityId) : selected.delete(patch.capabilityId);
  }
  return normalizeWorkspaceExperience({ version: current.version + 1, enabledCapabilities: [...selected] });
}

function bundle(id, label, description) {
  return Object.freeze({
    id,
    label,
    description,
    capabilityIds: Object.freeze(EXPERIENCE_CAPABILITIES.filter((capability) => capability.bundleId === id).map((capability) => capability.id))
  });
}

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fail(message, details = {}) {
  throw new WorkspaceExperienceError(message, details);
}

function immutable(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) value.forEach(immutable);
  else Object.values(value).forEach(immutable);
  return Object.freeze(value);
}
