/** Stable error codes shared by every workspace repository implementation. */
export const WORKSPACE_REPOSITORY_ERROR_CODES = Object.freeze({
  AUTH_REQUIRED: "AUTH_REQUIRED",
  CONFLICT: "CONFLICT",
  DUPLICATE_ID: "DUPLICATE_ID",
  INVALID_DOCUMENT: "INVALID_DOCUMENT",
  INVALID_VERSION: "INVALID_VERSION",
  NOT_CONNECTED: "NOT_CONNECTED",
  NOT_FOUND: "NOT_FOUND",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  REMOTE_CONFLICT: "REMOTE_CONFLICT",
  REMOTE_ERROR: "REMOTE_ERROR",
  STORAGE_ERROR: "STORAGE_ERROR",
  UNKNOWN_SCHEMA: "UNKNOWN_SCHEMA",
  UNSUPPORTED_OPERATION: "UNSUPPORTED_OPERATION",
  VERSION_CONFLICT: "VERSION_CONFLICT"
});

export const WORKSPACE_REPOSITORY_ERROR_CODE = WORKSPACE_REPOSITORY_ERROR_CODES;
export const WorkspaceRepositoryErrorCode = WORKSPACE_REPOSITORY_ERROR_CODES;

export const WORKSPACE_CONFLICT_STRATEGIES = Object.freeze({
  OPTIMISTIC_VERSION: "optimistic-version",
  SINGLE_WRITER: "single-writer"
});

/** Stable names used by capability `supported` lists. */
export const WORKSPACE_REPOSITORY_CAPABILITIES = Object.freeze({
  READ: "read",
  WRITE: "write",
  SUBSCRIBE: "subscribe",
  OPTIMISTIC_CONCURRENCY: "optimistic-concurrency",
  OFFLINE: "offline",
  OFFLINE_CACHE: "offline-cache",
  REALTIME: "realtime",
  MEMBERSHIP: "membership",
  SINGLE_WRITER: "single-writer",
  MULTI_WRITER: "multi-writer",
  REMOTE_SYNC: "remote-sync",
  CONFLICT_COPY: "conflict-copy",
  OPTIMISTIC_VERSION: "optimistic-version"
});

export const WORKSPACE_REPOSITORY_CAPABILITY = WORKSPACE_REPOSITORY_CAPABILITIES;
export const WorkspaceRepositoryCapability = WORKSPACE_REPOSITORY_CAPABILITIES;

const capabilityProperties = Object.freeze({
  read: WORKSPACE_REPOSITORY_CAPABILITIES.READ,
  write: WORKSPACE_REPOSITORY_CAPABILITIES.WRITE,
  subscribe: WORKSPACE_REPOSITORY_CAPABILITIES.SUBSCRIBE,
  optimisticConcurrency: WORKSPACE_REPOSITORY_CAPABILITIES.OPTIMISTIC_CONCURRENCY,
  offline: WORKSPACE_REPOSITORY_CAPABILITIES.OFFLINE,
  offlineCache: WORKSPACE_REPOSITORY_CAPABILITIES.OFFLINE_CACHE,
  realtime: WORKSPACE_REPOSITORY_CAPABILITIES.REALTIME,
  membership: WORKSPACE_REPOSITORY_CAPABILITIES.MEMBERSHIP,
  remoteSync: WORKSPACE_REPOSITORY_CAPABILITIES.REMOTE_SYNC,
  conflictCopy: WORKSPACE_REPOSITORY_CAPABILITIES.CONFLICT_COPY
});

/**
 * @typedef {object} WorkspaceRepositoryCapabilities
 * @property {boolean} read
 * @property {boolean} write
 * @property {boolean} subscribe
 * @property {boolean} offline
 * @property {boolean} realtime
 * @property {boolean} membership
 * @property {"optimistic-version"|"single-writer"} conflictStrategy
 * @property {boolean} optimisticConcurrency
 * @property {boolean} offlineCache Compatibility alias for offline cache support.
 * @property {boolean} remoteSync
 * @property {boolean} conflictCopy
 * @property {"single"|"multi"} writerMode Compatibility writer descriptor.
 * @property {boolean} singleWriter
 * @property {boolean} multiWriter
 * @property {readonly string[]} supported
 */

/** Creates the frozen capability descriptor exposed by repositories and sessions. */
export function createWorkspaceRepositoryCapabilities(input = {}) {
  const conflictStrategy = Object.values(WORKSPACE_CONFLICT_STRATEGIES).includes(input.conflictStrategy)
    ? input.conflictStrategy
    : WORKSPACE_CONFLICT_STRATEGIES.OPTIMISTIC_VERSION;
  const writerMode = input.writerMode === "multi" ? "multi" : "single";
  const offline = input.offline === undefined ? Boolean(input.offlineCache) : Boolean(input.offline);
  const descriptor = {
    read: input.read !== false,
    write: input.write !== false,
    subscribe: input.subscribe !== false,
    offline,
    realtime: Boolean(input.realtime),
    membership: Boolean(input.membership),
    conflictStrategy,
    optimisticConcurrency: input.optimisticConcurrency === undefined
      ? conflictStrategy === WORKSPACE_CONFLICT_STRATEGIES.OPTIMISTIC_VERSION
      : Boolean(input.optimisticConcurrency),
    offlineCache: input.offlineCache === undefined ? offline : Boolean(input.offlineCache),
    remoteSync: Boolean(input.remoteSync),
    conflictCopy: Boolean(input.conflictCopy),
    writerMode,
    singleWriter: writerMode === "single",
    multiWriter: writerMode === "multi"
  };
  const supported = Object.entries(capabilityProperties)
    .filter(([property]) => descriptor[property])
    .map(([, capability]) => capability);
  supported.push(writerMode === "multi"
    ? WORKSPACE_REPOSITORY_CAPABILITIES.MULTI_WRITER
    : WORKSPACE_REPOSITORY_CAPABILITIES.SINGLE_WRITER);
  if (!supported.includes(conflictStrategy)) supported.push(conflictStrategy);
  return Object.freeze({ ...descriptor, supported: Object.freeze(supported) });
}

/** Provider-neutral repository failure with safe structured context. */
export class WorkspaceRepositoryError extends Error {
  /**
   * @param {string} code Stable value from WORKSPACE_REPOSITORY_ERROR_CODES.
   * @param {string} message Human-readable description that must not contain credentials.
   * @param {{cause?: unknown, details?: unknown, operation?: string, providerId?: string, retryable?: boolean}} [options]
   */
  constructor(code, message, options = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "WorkspaceRepositoryError";
    this.code = String(code || WORKSPACE_REPOSITORY_ERROR_CODES.REMOTE_ERROR);
    this.providerId = safeIdentity(options.providerId, "unknown-provider");
    this.operation = safeIdentity(options.operation, "unknown");
    this.retryable = Boolean(options.retryable);
    this.details = immutableWorkspaceValue(sanitizeErrorDetails(options.details));
  }
}

export function isWorkspaceRepositoryError(error, code) {
  return error instanceof WorkspaceRepositoryError && (code === undefined || error.code === code);
}

/**
 * @typedef {object} WorkspaceOpenResult
 * @property {string} providerId
 * @property {string} workspaceId
 * @property {string} role
 * @property {Readonly<WorkspaceRepositoryCapabilities>} capabilities
 * @property {Readonly<object>} snapshot
 * @property {Readonly<object>} extension Provider-specific non-CRUD operations.
 */

/** Creates the immutable result returned by WorkspaceRepository.open(). */
export function createWorkspaceOpenResult({
  providerId,
  workspaceId,
  role,
  capabilities,
  snapshot,
  extension = {}
}) {
  const resolvedProviderId = safeIdentity(providerId, "unknown-provider");
  const resolvedWorkspaceId = safeIdentity(workspaceId, "");
  if (!resolvedWorkspaceId) {
    throw new WorkspaceRepositoryError(
      WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT,
      "A workspace identity is required to open a repository.",
      { providerId: resolvedProviderId, operation: "open" }
    );
  }
  const frozenExtension = Object.isFrozen(extension) ? extension : Object.freeze(extension);
  return Object.freeze({
    providerId: resolvedProviderId,
    workspaceId: resolvedWorkspaceId,
    role: safeIdentity(role, "owner"),
    capabilities,
    snapshot: immutableWorkspaceValue(snapshot),
    extension: frozenExtension
  });
}

/**
 * Provider-neutral repository interface. A repository is scoped to one
 * workspace. `open()` returns immutable session data; initiative and Insight
 * record mutations remain on this repository surface.
 */
export class WorkspaceRepository {
  constructor(
    capabilities = createWorkspaceRepositoryCapabilities(),
    providerId = "workspace"
  ) {
    Object.defineProperties(this, {
      capabilities: { value: capabilities, enumerable: true },
      providerId: { value: safeIdentity(providerId, "workspace"), enumerable: true }
    });
  }

  connect() { throw unsupported(this.providerId, "connect"); }
  open() { throw unsupported(this.providerId, "open"); }
  subscribe(listener) { void listener; throw unsupported(this.providerId, "subscribe"); }
  createItem(input) { void input; throw unsupported(this.providerId, "createItem"); }
  updateItem(id, patch, expectedVersion) { void id; void patch; void expectedVersion; throw unsupported(this.providerId, "updateItem"); }
  createInsightRecord(input) { void input; throw unsupported(this.providerId, "createInsightRecord"); }
  updateInsightRecord(id, patch, expectedVersion) { void id; void patch; void expectedVersion; throw unsupported(this.providerId, "updateInsightRecord"); }
  updateExperience(input, expectedVersion) {
    void input;
    void expectedVersion;
    throw unsupported(this.providerId, "updateExperience");
  }
  updateOrganization(input, expectedVersion) {
    void input;
    void expectedVersion;
    throw unsupported(this.providerId, "updateOrganization");
  }
  updateCustomerDirectory(input, expectedVersion) {
    void input;
    void expectedVersion;
    throw unsupported(this.providerId, "updateCustomerDirectory");
  }
  updateWorkflow(input, expectedVersion) {
    void input;
    void expectedVersion;
    throw unsupported(this.providerId, "updateWorkflow");
  }
  updatePrioritization(input, expectedVersion) {
    void input;
    void expectedVersion;
    throw unsupported(this.providerId, "updatePrioritization");
  }
  updatePlanningCalendar(input, expectedVersion) {
    void input;
    void expectedVersion;
    throw unsupported(this.providerId, "updatePlanningCalendar");
  }
  deleteItem(id, expectedVersion) { void id; void expectedVersion; throw unsupported(this.providerId, "deleteItem"); }
  deleteInsightRecord(id, expectedVersion) { void id; void expectedVersion; throw unsupported(this.providerId, "deleteInsightRecord"); }
  appendActivity(entry) { void entry; throw unsupported(this.providerId, "appendActivity"); }
  exportSnapshot() { throw unsupported(this.providerId, "exportSnapshot"); }
  disconnect() { throw unsupported(this.providerId, "disconnect"); }
}

/**
 * Abstract team administration/discovery service for future shared providers.
 * Item CRUD intentionally does not belong on this interface.
 */
export class TeamWorkspaceService {
  constructor(providerId = "team-workspace") {
    Object.defineProperty(this, "providerId", {
      value: safeIdentity(providerId, "team-workspace"),
      enumerable: true
    });
  }

  listWorkspaces() { throw unsupported(this.providerId, "listWorkspaces"); }
  createWorkspace(input) { void input; throw unsupported(this.providerId, "createWorkspace"); }
  listMembers(workspaceId) { void workspaceId; throw unsupported(this.providerId, "listMembers"); }
  createInvite(input) { void input; throw unsupported(this.providerId, "createInvite"); }
  acceptInvite(input) { void input; throw unsupported(this.providerId, "acceptInvite"); }
  setMemberRole(input) { void input; throw unsupported(this.providerId, "setMemberRole"); }
  removeMember(input) { void input; throw unsupported(this.providerId, "removeMember"); }
}

/** Creates a detached, deeply frozen plain-data value. */
export function immutableWorkspaceValue(value) {
  return deepFreeze(clonePlainValue(value));
}

function sanitizeErrorDetails(value, seen = new WeakSet(), depth = 0) {
  if (value === undefined || value === null) return {};
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value !== "object" || depth > 8) return String(value);
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeErrorDetails(entry, seen, depth + 1));
  }
  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isSensitiveDetailKey(key)) continue;
    output[key] = sanitizeErrorDetails(entry, seen, depth + 1);
  }
  return output;
}

function isSensitiveDetailKey(key) {
  return /(authorization|cookie|credential|password|secret|session|token)/i.test(key);
}

function clonePlainValue(value) {
  if (Array.isArray(value)) return value.map(clonePlainValue);
  if (!value || typeof value !== "object") return value;
  const output = {};
  for (const [key, entry] of Object.entries(value)) output[key] = clonePlainValue(entry);
  return output;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const entry of Object.values(value)) deepFreeze(entry);
  return Object.freeze(value);
}

function safeIdentity(value, fallback) {
  const normalized = String(value === undefined || value === null ? "" : value).trim();
  return normalized || fallback;
}

function unsupported(providerId, operation) {
  return new WorkspaceRepositoryError(
    WORKSPACE_REPOSITORY_ERROR_CODES.UNSUPPORTED_OPERATION,
    `${operation} is not implemented by this workspace provider.`,
    { providerId, operation }
  );
}
