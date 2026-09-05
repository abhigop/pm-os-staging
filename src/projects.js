import { runStorageTransaction } from "./storage.js";

export const PROJECT_REGISTRY_SCHEMA = "pm-os.projects.v1";
export const PROJECT_REGISTRY_KEY = "pm-os-staging.projects.v1";
export const PRIMARY_PROJECT_ID = "local-main";

export const LEGACY_PROJECT_KEYS = Object.freeze({
  workspace: "pm-os-staging.workspace.v1",
  activity: "pm-os-staging.activity.v1",
  source: "pm-os-staging.source.v2",
  sync: "pm-os-staging.sync.v2",
  backups: "pm-os-staging.backups.v1"
});

const providers = new Set(["browser", "local-file", "google-drive", "server"]);
const serverRoles = new Set(["owner", "editor", "viewer"]);
const serverStatuses = new Set(["available", "sign-in-required"]);
const secondaryLegacyKeys = Object.freeze({ source: "pm-os-staging.source.v1", sync: "pm-os-staging.sync.v1" });
const spaces = new Set(["today", "initiatives", "insights", "planning", "delivery", "briefings", "team", "settings"]);
const projectIdPattern = /^[a-z0-9][a-z0-9-]{0,79}$/;

export function projectKeys(projectId) {
  const id = normalizeProjectId(projectId);
  const prefix = `pm-os-staging.project.v1.${id}`;
  return Object.freeze({
    workspace: `${prefix}.workspace`,
    activity: `${prefix}.activity`,
    source: `${prefix}.source`,
    sync: `${prefix}.sync`,
    backups: `${prefix}.backups`
  });
}

export function normalizeProjectLocation(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) input = {};
  const space = spaces.has(input.space) ? input.space : "today";
  const mode = String(input.mode || "").trim().replace(/[^a-z0-9-]/g, "").slice(0, 48);
  const location = { space, mode };
  if (["all", "unscheduled", "sprint", "month", "quarter", "year"].includes(input.period)) location.period = input.period;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input.periodStart || "")) location.periodStart = input.periodStart;
  if (["accounts", "segments", "fields"].includes(input.customerView)) location.customerView = input.customerView;
  if (["risks", "dependencies"].includes(input.section)) location.section = input.section;
  for (const key of ["boardTeam", "boardStage", "customerId", "segmentId", "initiative", "record", "insightId", "insightStatus", "orgUnitId", "personId", "specId"]) {
    const value = typeof input[key] === "string" ? input[key] : "";
    if (/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value)) location[key] = value;
  }
  return Object.freeze(location);
}

export function normalizeProjectRegistry(input) {
  if (!input || input.schema !== PROJECT_REGISTRY_SCHEMA || !Array.isArray(input.projects)) return null;
  const seen = new Set();
  const projects = input.projects.flatMap((entry) => {
    const project = normalizeProject(entry);
    if (!project || seen.has(project.id)) return [];
    seen.add(project.id);
    return [project];
  });
  if (!projects.length) return null;
  const available = projects.filter((entry) => !entry.archivedAt);
  const requestedActive = projects.find((entry) => entry.id === input.activeProjectId && !entry.archivedAt);
  const active = requestedActive || available[0] || projects[0];
  return Object.freeze({
    schema: PROJECT_REGISTRY_SCHEMA,
    activeProjectId: active.id,
    migratedLegacyAt: safeTimestamp(input.migratedLegacyAt),
    projects: Object.freeze(projects)
  });
}

export function bootstrapProjectRegistry(storage, { now = () => new Date().toISOString() } = {}) {
  let stored;
  try { stored = storage.getItem(PROJECT_REGISTRY_KEY); }
  catch {
    const registry = ephemeralPrimaryRegistry(now());
    return { registry, keys: LEGACY_PROJECT_KEYS, persistent: false, warning: "Project storage is unavailable. The legacy workspace remains open and was not changed." };
  }
  if (stored) {
    try {
      const registry = normalizeProjectRegistry(JSON.parse(stored));
      if (!registry) throw new Error("INVALID_PROJECT_REGISTRY");
      return { registry, keys: projectKeys(registry.activeProjectId), persistent: true, warning: "" };
    } catch {
      const registry = ephemeralPrimaryRegistry(now());
      return { registry, keys: LEGACY_PROJECT_KEYS, persistent: false, warning: "The project catalog could not be read. The legacy workspace remains open and the catalog was not overwritten." };
    }
  }

  const timestamp = now();
  const sourceRaw = safeRead(storage, LEGACY_PROJECT_KEYS.source) || safeRead(storage, secondaryLegacyKeys.source) || safeRead(storage, projectKeys(PRIMARY_PROJECT_ID).source);
  const sourceFacts = sourceFactsFromRaw(sourceRaw);
  const record = normalizeProject({
    id: PRIMARY_PROJECT_ID,
    name: sourceFacts.name,
    provider: sourceFacts.provider,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastOpenedAt: timestamp,
    location: { space: "today", mode: "focus" }
  });
  const registry = normalizeProjectRegistry({
    schema: PROJECT_REGISTRY_SCHEMA,
    activeProjectId: record.id,
    migratedLegacyAt: timestamp,
    projects: [record]
  });
  const keys = projectKeys(record.id);
  const transactionKeys = [PROJECT_REGISTRY_KEY, ...Object.values(keys)];
  try {
    runStorageTransaction(storage, transactionKeys, () => {
      for (const kind of Object.keys(keys)) {
        if (storage.getItem(keys[kind]) !== null) continue;
        const raw = storage.getItem(LEGACY_PROJECT_KEYS[kind]) ?? (secondaryLegacyKeys[kind] ? storage.getItem(secondaryLegacyKeys[kind]) : null);
        if (raw !== null) storage.setItem(keys[kind], raw);
      }
      storage.setItem(PROJECT_REGISTRY_KEY, JSON.stringify(registry));
    });
    return { registry, keys, persistent: true, warning: "" };
  } catch {
    return { registry, keys: LEGACY_PROJECT_KEYS, persistent: false, warning: "Project migration could not be saved. The legacy workspace remains open and every original value was preserved." };
  }
}

export function activeProject(registry) {
  return registry?.projects.find((entry) => entry.id === registry.activeProjectId) || null;
}

export function projectById(registry, projectId) {
  return registry?.projects.find((entry) => entry.id === projectId) || null;
}

export function createProject(storage, registry, input, bundle = {}, { now = () => new Date().toISOString(), idFactory = defaultProjectId } = {}) {
  registry = currentRegistryForMutation(storage, registry);
  const timestamp = now();
  const id = normalizeProjectId(input.id || idFactory());
  if (projectById(registry, id)) throw new Error("A project with that identifier already exists.");
  const project = normalizeProject({ ...input, id, createdAt: timestamp, updatedAt: timestamp, lastOpenedAt: timestamp });
  if (!project) throw new Error("The project details are invalid.");
  const next = normalizeProjectRegistry({ ...registry, activeProjectId: registry.activeProjectId, projects: [...registry.projects, project] });
  const keys = projectKeys(id);
  runStorageTransaction(storage, [PROJECT_REGISTRY_KEY, ...Object.values(keys)], () => {
    for (const [kind, key] of Object.entries(keys)) {
      const value = bundle[kind];
      if (value !== undefined && value !== null) storage.setItem(key, String(value));
    }
    storage.setItem(PROJECT_REGISTRY_KEY, JSON.stringify(next));
  });
  return { registry: next, project, keys };
}

export function activateProject(storage, registry, projectId, previousLocation, { now = () => new Date().toISOString() } = {}) {
  registry = currentRegistryForMutation(storage, registry);
  const target = projectById(registry, projectId);
  if (!target || target.archivedAt) throw new Error("That project is not available.");
  const timestamp = now();
  const projects = registry.projects.map((entry) => entry.id === registry.activeProjectId
    ? normalizeProject({ ...entry, location: normalizeProjectLocation(previousLocation), updatedAt: timestamp })
    : entry.id === target.id
      ? normalizeProject({ ...entry, lastOpenedAt: timestamp, updatedAt: timestamp })
      : entry);
  const next = normalizeProjectRegistry({ ...registry, activeProjectId: target.id, projects });
  persistRegistry(storage, next);
  return next;
}

export function renameProject(storage, registry, projectId, name, { now = () => new Date().toISOString() } = {}) {
  registry = currentRegistryForMutation(storage, registry);
  const normalizedName = normalizeProjectName(name);
  const target = projectById(registry, projectId);
  if (!target || target.archivedAt) throw new Error("That project is not available.");
  const projects = registry.projects.map((entry) => entry.id === target.id ? normalizeProject({ ...entry, name: normalizedName, updatedAt: now() }) : entry);
  const next = normalizeProjectRegistry({ ...registry, projects });
  persistRegistry(storage, next);
  return next;
}

export function updateProjectMetadata(storage, registry, projectId, patch = {}, { now = () => new Date().toISOString() } = {}) {
  registry = currentRegistryForMutation(storage, registry);
  const target = projectById(registry, projectId);
  if (!target) throw new Error("That project is not available.");
  const allowed = new Set(["name", "serverRole", "serverRevision", "serverStatus", "location", "lastOpenedAt"]);
  if (Object.keys(patch).some((key) => !allowed.has(key))) throw new Error("The project metadata update is invalid.");
  const updated = normalizeProject({ ...target, ...patch, updatedAt: now() });
  if (!updated) throw new Error("The project metadata update is invalid.");
  const projects = registry.projects.map((entry) => entry.id === target.id ? updated : entry);
  const next = normalizeProjectRegistry({ ...registry, projects });
  persistRegistry(storage, next);
  return next;
}

export function projectsForConnector(registry, connectorId) {
  const id = String(connectorId || "").trim().toLowerCase();
  return Object.freeze((registry?.projects || []).filter((entry) => entry.provider === "server" && entry.connectorId === id));
}

export function setProjectArchived(storage, registry, projectId, archived, { now = () => new Date().toISOString() } = {}) {
  registry = currentRegistryForMutation(storage, registry);
  const target = projectById(registry, projectId);
  if (!target || (archived && target.archivedAt)) throw new Error("That project is not available.");
  if (archived && target.id === registry.activeProjectId) throw new Error("Switch projects before archiving the current project.");
  const timestamp = now();
  const projects = registry.projects.map((entry) => entry.id === target.id
    ? normalizeProject({ ...entry, archivedAt: archived ? timestamp : "", updatedAt: timestamp })
    : entry);
  const next = normalizeProjectRegistry({ ...registry, projects });
  persistRegistry(storage, next);
  return next;
}

export function forgetProject(storage, registry, projectId) {
  registry = currentRegistryForMutation(storage, registry);
  const target = projectById(registry, projectId);
  if (!target?.archivedAt) throw new Error("Archive the project before forgetting its local data.");
  if (target.id === registry.activeProjectId) throw new Error("The current project cannot be forgotten.");
  const next = normalizeProjectRegistry({ ...registry, projects: registry.projects.filter((entry) => entry.id !== target.id) });
  if (!next) throw new Error("At least one project must remain.");
  const keys = projectKeys(target.id);
  runStorageTransaction(storage, [PROJECT_REGISTRY_KEY, ...Object.values(keys)], () => {
    for (const key of Object.values(keys)) storage.removeItem(key);
    storage.setItem(PROJECT_REGISTRY_KEY, JSON.stringify(next));
  });
  return next;
}

export function updateActiveProjectProvider(storage, registry, provider, { now = () => new Date().toISOString() } = {}) {
  registry = currentRegistryForMutation(storage, registry);
  const normalizedProvider = normalizeProvider(provider);
  const projects = registry.projects.map((entry) => entry.id === registry.activeProjectId
    ? normalizeProject({ ...entry, provider: normalizedProvider, updatedAt: now() })
    : entry);
  const next = normalizeProjectRegistry({ ...registry, projects });
  persistRegistry(storage, next);
  return next;
}

export function updateActiveProjectLocation(storage, registry, location, { now = () => new Date().toISOString() } = {}) {
  registry = currentRegistryForMutation(storage, registry);
  const projects = registry.projects.map((entry) => entry.id === registry.activeProjectId
    ? normalizeProject({ ...entry, location: normalizeProjectLocation(location), updatedAt: now() })
    : entry);
  const next = normalizeProjectRegistry({ ...registry, projects });
  persistRegistry(storage, next);
  return next;
}

export function readProjectBundle(storage, projectId) {
  const keys = projectKeys(projectId);
  return Object.freeze({ keys, ...Object.fromEntries(Object.entries(keys).map(([kind, key]) => [kind, storage.getItem(key)])) });
}

export function projectProviderLabel(provider) {
  return ({ browser: "Browser", "local-file": "Linked file", "google-drive": "Google Drive", server: "Server" })[provider] || "Browser";
}

export function normalizeProjectName(value) {
  const name = String(value || "").trim().replace(/\s+/g, " ").slice(0, 160);
  if (!name) throw new Error("Enter a project name.");
  return name;
}

function normalizeProject(input) {
  if (!input || typeof input !== "object") return null;
  let id;
  let name;
  try { id = normalizeProjectId(input.id); name = normalizeProjectName(input.name); }
  catch { return null; }
  const provider = normalizeProvider(input.provider);
  const connectorId = provider === "server" ? normalizeOptionalReference(input.connectorId) : "";
  const workspaceId = provider === "server" ? normalizeOptionalReference(input.workspaceId, 160) : "";
  if (provider === "server" && (!connectorId || !workspaceId)) return null;
  return Object.freeze({
    id,
    name,
    provider,
    ...(provider === "server" ? {
      connectorId,
      workspaceId,
      serverRole: serverRoles.has(input.serverRole) ? input.serverRole : "viewer",
      serverRevision: Number.isSafeInteger(Number(input.serverRevision)) && Number(input.serverRevision) >= 0 ? Number(input.serverRevision) : 0,
      serverStatus: serverStatuses.has(input.serverStatus) ? input.serverStatus : "available"
    } : {}),
    createdAt: safeTimestamp(input.createdAt) || new Date(0).toISOString(),
    updatedAt: safeTimestamp(input.updatedAt) || safeTimestamp(input.createdAt) || new Date(0).toISOString(),
    lastOpenedAt: safeTimestamp(input.lastOpenedAt),
    archivedAt: safeTimestamp(input.archivedAt),
    location: normalizeProjectLocation(input.location)
  });
}

function persistRegistry(storage, registry) {
  runStorageTransaction(storage, [PROJECT_REGISTRY_KEY], () => storage.setItem(PROJECT_REGISTRY_KEY, JSON.stringify(registry)));
}

function ephemeralPrimaryRegistry(timestamp) {
  return normalizeProjectRegistry({
    schema: PROJECT_REGISTRY_SCHEMA,
    activeProjectId: PRIMARY_PROJECT_ID,
    projects: [{ id: PRIMARY_PROJECT_ID, name: "My project", provider: "browser", createdAt: timestamp, updatedAt: timestamp, lastOpenedAt: timestamp, location: { space: "today", mode: "focus" } }]
  });
}

function sourceFactsFromRaw(raw) {
  try {
    const source = JSON.parse(raw || "{}");
    const provider = normalizeProvider(source.type);
    const fileName = String(source.fileName || "").trim();
    return { provider, name: fileName ? fileName.replace(/\.json$/i, "") || "My project" : "My project" };
  } catch {
    return { provider: "browser", name: "My project" };
  }
}

function normalizeProvider(value) {
  const provider = value === "local" ? "browser" : value === "drive-folder" ? "google-drive" : String(value || "browser");
  return providers.has(provider) ? provider : "browser";
}

function normalizeProjectId(value) {
  const id = String(value || "").trim().toLowerCase();
  if (!projectIdPattern.test(id)) throw new Error("The project identifier is invalid.");
  return id;
}

function normalizeOptionalReference(value, maxLength = 80) {
  const reference = String(value || "").trim().toLowerCase();
  return reference && reference.length <= maxLength && /^[a-z0-9][a-z0-9:_-]*$/i.test(reference) ? reference : "";
}

function safeTimestamp(value) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function safeRead(storage, key) {
  try { return storage.getItem(key); } catch { return null; }
}

function defaultProjectId() {
  const random = globalThis.crypto?.randomUUID?.().toLowerCase() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `project-${random}`.slice(0, 80);
}

function currentRegistryForMutation(storage, callerRegistry) {
  // Rebase sequential stale-tab operations on the latest catalog. This is not a
  // cross-tab lock: localStorage offers no atomic read-modify-write transaction.
  let current;
  try {
    const stored = JSON.parse(storage.getItem(PROJECT_REGISTRY_KEY));
    current = normalizeProjectRegistry(stored);
    if (!current || current.projects.length !== stored.projects.length
      || !stored.projects.some((entry) => entry.id === stored.activeProjectId && !entry.archivedAt)) {
      throw new Error("INVALID_PROJECT_REGISTRY");
    }
  } catch {
    throw new Error("The project catalog is unavailable or unreadable. Reload before changing projects.");
  }
  // The persisted active project belongs to the most recent writer. Returning
  // it would relabel this tab while its workspace storage keys still point at
  // the caller's project, so retain the caller's context until an explicit switch.
  const callerActive = projectById(current, callerRegistry?.activeProjectId);
  if (!callerActive || callerActive.archivedAt) {
    throw new Error("The current project is no longer available. Reload before changing projects.");
  }
  return normalizeProjectRegistry({ ...current, activeProjectId: callerActive.id });
}
