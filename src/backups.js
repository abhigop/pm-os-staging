export const backupReasons = Object.freeze({
  import: "before-import",
  reset: "before-reset",
  drivePull: "before-drive-pull",
  restore: "before-restore",
  teamSwitch: "before-team-switch"
});
export const backupSchema = "pm-os.backups.v1";

const allowedReasons = new Set(Object.values(backupReasons));
const snapshotLimit = 5;
const envelopeKeys = new Set(["schema", "snapshots"]);
const snapshotKeys = new Set(["id", "createdAt", "reason", "payload"]);
const workspaceKeys = new Set(["schema", "exportedAt", "workspace", "workspaceId", "workspaceVersion", "experience", "planningCalendar", "organization", "customerDirectory", "workflow", "prioritization", "items", "insightRecords", "codeRepositories", "implementationRuns", "activity"]);
const workspaceSchemas = new Set(["pm-os.workspace.v1", "pm-os.workspace.v2", "pm-os.workspace.v3", "pm-os.workspace.v4", "pm-os.workspace.v5", "pm-os.workspace.v6", "pm-os.workspace.v7", "pm-os.workspace.v8", "pm-os.workspace.v9", "pm-os.workspace.v10"]);
const sensitiveKeys = /^(accessToken|clientId|credential|credentials|driveToken|refreshToken|token)$/i;

export function addWorkspaceSnapshot(snapshots, payload, reason, now = new Date(), idFactory = defaultSnapshotId) {
  const snapshot = createWorkspaceSnapshot(payload, reason, now, idFactory);
  const existing = normalizeSnapshotList(snapshots).snapshots.filter((entry) => entry.id !== snapshot.id);
  return [snapshot, ...existing]
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, snapshotLimit);
}

export function loadWorkspaceSnapshots(storage, key) {
  let raw;
  try {
    raw = storage.getItem(key);
  } catch (error) {
    return { snapshots: [], ignoredCount: 0, error: storageErrorMessage(error, "read") };
  }
  if (!raw) return { snapshots: [], ignoredCount: 0, error: "" };
  try {
    const parsed = JSON.parse(raw);
    const entries = Array.isArray(parsed) ? parsed : validEnvelope(parsed) ? parsed.snapshots : null;
    if (!entries) return { snapshots: [], ignoredCount: 1, error: "" };
    const normalized = normalizeSnapshotList(entries);
    return { ...normalized, error: "" };
  } catch {
    return { snapshots: [], ignoredCount: 1, error: "" };
  }
}

export function storeWorkspaceSnapshot(storage, key, snapshots, payload, reason, now = new Date(), idFactory = defaultSnapshotId) {
  let candidates = addWorkspaceSnapshot(snapshots, payload, reason, now, idFactory);
  while (candidates.length) {
    try {
      storage.setItem(key, JSON.stringify({ schema: backupSchema, snapshots: candidates }));
      return candidates;
    } catch (error) {
      if (!isQuotaError(error) || candidates.length === 1) {
        throw new Error(storageErrorMessage(error, "store"), { cause: error });
      }
      candidates = candidates.slice(0, -1);
    }
  }
  throw new Error("Recovery snapshot could not be stored.");
}

export function restoreWorkspaceSnapshot(snapshots, snapshotId) {
  const snapshot = normalizeSnapshotList(snapshots).snapshots.find((entry) => entry.id === snapshotId);
  if (!snapshot) throw new Error("Recovery snapshot not found.");
  return { snapshot, workspace: parseWorkspacePayload(snapshot.payload) };
}

export function workspaceSnapshotDetails(snapshot) {
  const workspace = parseWorkspacePayload(snapshot.payload);
  return { itemCount: workspace.items.length, activityCount: workspace.activity.length };
}

export function backupDownloadName(snapshot) {
  const date = new Date(snapshot.createdAt);
  if (Number.isNaN(date.getTime())) throw new Error("Recovery snapshot timestamp is invalid.");
  const stamp = date.toISOString().slice(0, 19).replaceAll("-", "").replace("T", "-").replaceAll(":", "");
  return `pm-os-backup-${stamp}Z-${snapshot.reason}.json`;
}

export function backupReasonLabel(reason) {
  return ({
    [backupReasons.import]: "Before import",
    [backupReasons.reset]: "Before reset",
    [backupReasons.drivePull]: "Before Drive pull",
    [backupReasons.restore]: "Before restore",
    [backupReasons.teamSwitch]: "Before Team switch"
  })[reason] || "Workspace backup";
}

function createWorkspaceSnapshot(payload, reason, now, idFactory) {
  if (!allowedReasons.has(reason)) throw new Error("Recovery snapshot reason is invalid.");
  parseWorkspacePayload(payload);
  const createdAt = validIsoDate(now);
  const nonce = String(idFactory?.() || "").trim();
  if (!nonce) throw new Error("Recovery snapshot identifier is invalid.");
  return {
    id: `snapshot-${createdAt}-${reason}-${nonce}`,
    createdAt,
    reason,
    payload
  };
}

function normalizeSnapshotList(value) {
  if (!Array.isArray(value)) return { snapshots: [], ignoredCount: value == null ? 0 : 1 };
  const snapshots = [];
  let ignoredCount = 0;
  for (const entry of value) {
    const snapshot = normalizeSnapshot(entry);
    if (snapshot) snapshots.push(snapshot);
    else ignoredCount += 1;
  }
  snapshots.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  return { snapshots: snapshots.slice(0, snapshotLimit), ignoredCount };
}

function normalizeSnapshot(value) {
  if (!value || typeof value !== "object") return null;
  if (Object.keys(value).some((key) => !snapshotKeys.has(key))) return null;
  if (typeof value.id !== "string" || !value.id || typeof value.reason !== "string" || !allowedReasons.has(value.reason) || typeof value.payload !== "string") return null;
  const createdAt = new Date(value.createdAt);
  if (Number.isNaN(createdAt.getTime())) return null;
  try {
    parseWorkspacePayload(value.payload);
  } catch {
    return null;
  }
  return { id: value.id, createdAt: createdAt.toISOString(), reason: value.reason, payload: value.payload };
}

function parseWorkspacePayload(payload) {
  const workspace = JSON.parse(payload);
  if (!workspaceSchemas.has(workspace?.schema) || !Array.isArray(workspace.items) || !Array.isArray(workspace.activity)
    || (["pm-os.workspace.v8", "pm-os.workspace.v9", "pm-os.workspace.v10"].includes(workspace.schema) && !Array.isArray(workspace.insightRecords))
    || (["pm-os.workspace.v9", "pm-os.workspace.v10"].includes(workspace.schema) && (!workspace.experience || !Array.isArray(workspace.experience.enabledCapabilities)))
    || (workspace.schema === "pm-os.workspace.v10" && (!Array.isArray(workspace.codeRepositories) || !Array.isArray(workspace.implementationRuns)))) {
    throw new Error("Recovery snapshot must contain a portable PM OS workspace and activity log.");
  }
  if (Object.keys(workspace).some((key) => !workspaceKeys.has(key)) || containsSensitiveKey(workspace)) {
    throw new Error("Recovery snapshot must not contain source settings, credentials, or tokens.");
  }
  return workspace;
}

function containsSensitiveKey(value) {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, entry]) => sensitiveKeys.test(key) || containsSensitiveKey(entry));
}

function validEnvelope(value) {
  return Boolean(value && typeof value === "object" && value.schema === backupSchema && Array.isArray(value.snapshots) && Object.keys(value).every((key) => envelopeKeys.has(key)));
}

function defaultSnapshotId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function validIsoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Recovery snapshot timestamp is invalid.");
  return date.toISOString();
}

function isQuotaError(error) {
  return error?.name === "QuotaExceededError" || error?.code === 22 || error?.code === 1014;
}

function storageErrorMessage(error, action) {
  const detail = error?.message ? ` ${error.message}` : "";
  return `Recovery snapshot could not be ${action === "read" ? "read" : "stored"}.${detail}`;
}
