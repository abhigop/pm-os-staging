import { immutableWorkspaceValue } from "./workspace-contract.js";

const missing = Symbol("missing");
const metadataKeys = new Set(["updatedAt", "updatedBy"]);

/** Deterministic base/local/remote merge with field-level conflict output. */
export function mergeWorkspaceDocuments(base, local, remote) {
  const conflicts = [];
  const value = mergeValue(base, local, remote, [], conflicts);
  return immutableWorkspaceValue({
    merged: value === missing ? null : value,
    conflicts,
    clean: conflicts.length === 0,
    changed: !same(value, local)
  });
}

export function resolveWorkspaceConflicts(result, resolutions = {}) {
  if (!result?.merged || !Array.isArray(result.conflicts)) throw new Error("A merge result is required.");
  const document = structuredClone(result.merged);
  const unresolved = [];
  for (const conflict of result.conflicts) {
    const choice = resolutions[conflict.path];
    if (choice !== "local" && choice !== "remote") {
      unresolved.push(conflict);
      continue;
    }
    assignPath(document, conflict.segments, choice === "local" ? conflict.local : conflict.remote);
  }
  return immutableWorkspaceValue({ merged: document, conflicts: unresolved, clean: unresolved.length === 0, changed: true });
}

function mergeValue(base, local, remote, path, conflicts) {
  if (same(local, remote)) return clone(local);
  if (same(local, base)) return clone(remote);
  if (same(remote, base)) return clone(local);
  if (local === missing || remote === missing) return conflict(base, local, remote, path, conflicts, "delete-edit");

  if (Array.isArray(local) && Array.isArray(remote) && Array.isArray(base)) {
    if (isIdCollection([...base, ...local, ...remote])) return mergeIdCollection(base, local, remote, path, conflicts);
    return conflict(base, local, remote, path, conflicts, "array");
  }

  if (plainObject(local) && plainObject(remote) && plainObject(base)) {
    const output = {};
    const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);
    for (const key of [...keys].sort()) {
      const nextPath = [...path, key];
      if (key === "version" && [base[key], local[key], remote[key]].every((value) => value == null || Number.isInteger(value))) {
        output[key] = Math.max(Number(base[key] || 0), Number(local[key] || 0), Number(remote[key] || 0)) + 1;
        continue;
      }
      if (metadataKeys.has(key)) {
        output[key] = clone(preferredMetadata(base[key], local[key], remote[key]));
        continue;
      }
      const merged = mergeValue(valueAt(base, key), valueAt(local, key), valueAt(remote, key), nextPath, conflicts);
      if (merged !== missing) output[key] = merged;
    }
    return output;
  }

  return conflict(base, local, remote, path, conflicts, "value");
}

function mergeIdCollection(base, local, remote, path, conflicts) {
  const baseMap = new Map(base.map((entry) => [String(entry.id), entry]));
  const localMap = new Map(local.map((entry) => [String(entry.id), entry]));
  const remoteMap = new Map(remote.map((entry) => [String(entry.id), entry]));
  const order = [];
  for (const entry of [...base, ...local, ...remote]) if (!order.includes(String(entry.id))) order.push(String(entry.id));
  const output = [];
  for (const id of order) {
    const merged = mergeValue(baseMap.get(id) ?? missing, localMap.get(id) ?? missing, remoteMap.get(id) ?? missing, [...path, id], conflicts);
    if (merged !== missing) output.push(merged);
  }
  return output;
}

function conflict(base, local, remote, path, conflicts, kind) {
  const segments = path.map(String);
  conflicts.push(immutableWorkspaceValue({
    path: segments.join("."),
    segments,
    kind,
    base: base === missing ? undefined : clone(base),
    local: local === missing ? undefined : clone(local),
    remote: remote === missing ? undefined : clone(remote)
  }));
  return clone(local);
}

function assignPath(root, segments, value) {
  let target = root;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (Array.isArray(target)) target = target.find((entry) => String(entry?.id) === segment);
    else target = target?.[segment];
    if (!target) return;
  }
  const key = segments.at(-1);
  if (Array.isArray(target)) {
    const index = target.findIndex((entry) => String(entry?.id) === key);
    if (value === undefined && index >= 0) target.splice(index, 1);
    else if (index >= 0) target[index] = clone(value);
    else if (value !== undefined) target.push(clone(value));
  } else if (value === undefined) delete target[key];
  else target[key] = clone(value);
}

function preferredMetadata(base, local, remote) {
  if (same(local, base)) return remote;
  if (same(remote, base)) return local;
  const localTime = Date.parse(local || "");
  const remoteTime = Date.parse(remote || "");
  if (Number.isFinite(localTime) || Number.isFinite(remoteTime)) return localTime >= remoteTime ? local : remote;
  return remote ?? local ?? base;
}

function isIdCollection(values) {
  return values.every((entry) => plainObject(entry) && String(entry.id || "").trim());
}

function valueAt(object, key) { return Object.hasOwn(object, key) ? object[key] : missing; }
function plainObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function clone(value) { return value === missing ? missing : value === undefined ? undefined : structuredClone(value); }
function same(left, right) {
  if (left === missing || right === missing) return left === right;
  return JSON.stringify(left) === JSON.stringify(right);
}
