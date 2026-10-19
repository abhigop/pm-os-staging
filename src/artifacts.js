import { immutableWorkspaceValue } from "./workspace-contract.js";

export const ARTIFACT_AUTHOR_FIELDS = Object.freeze([
  "artifactType", "title", "itemIds", "content", "sourceRevision", "supersedesId",
  "sourceScope", "sourceSelection", "generatedAt"
]);
export const ARTIFACT_FIELDS = Object.freeze([
  "id", "kind", ...ARTIFACT_AUTHOR_FIELDS, "version", "createdAt", "updatedAt", "updatedBy"
]);

/** Normalize a portable saved version without mutating or recomputing its content. */
export function normalizeArtifactRecord(input) {
  if (!plainObject(input)) throw new Error("Artifact must be an object.");
  if (input.kind !== "artifact") throw new Error("Artifact kind must be artifact.");
  if (!Array.isArray(input.itemIds) || input.itemIds.length > 1000) throw new Error("Artifact itemIds must contain at most 1000 references.");
  const selection = input.sourceSelection ?? {};
  if (!plainObject(selection)) throw new Error("Artifact sourceSelection must be an object.");
  if (!Number.isSafeInteger(input.version) || input.version < 1) throw new Error("Artifact version must be a positive safe integer.");
  const output = {
    id: text(input.id, "id", 200, true),
    kind: "artifact",
    artifactType: text(input.artifactType, "artifactType", 100, true),
    title: text(input.title, "title", 500, true),
    itemIds: [...new Set(input.itemIds.map(value => text(value, "itemIds reference", 200, true)))],
    content: exactContent(input.content),
    sourceRevision: text(input.sourceRevision, "sourceRevision", 1000, true),
    supersedesId: text(input.supersedesId, "supersedesId", 200),
    sourceScope: text(input.sourceScope, "sourceScope", 8000),
    sourceSelection: Object.fromEntries(["type", "initiative", "query", "period", "startDate"].map(field =>
      [field, text(selection[field], "sourceSelection." + field, field === "query" ? 8000 : 200)])),
    generatedAt: isoTimestamp(input.generatedAt, "generatedAt"),
    version: input.version,
    createdAt: isoTimestamp(input.createdAt, "createdAt"),
    updatedAt: isoTimestamp(input.updatedAt, "updatedAt"),
    updatedBy: actorValue(input.updatedBy)
  };
  if (new TextEncoder().encode(JSON.stringify(output)).length > 1024 * 1024) throw new Error("Artifact exceeds the 1 MiB record limit.");
  return immutableWorkspaceValue(output);
}

/** A new immutable saved version; parent collection/CAS checks belong to the caller. */
export function createArtifactRecord(input, { id, now = new Date(), actor = { id: "pm-os", displayName: "PM OS" }, predecessor } = {}) {
  if (!plainObject(input)) throw new Error("Artifact input must be an object.");
  const parent = predecessor == null ? null : normalizeArtifactRecord(predecessor);
  const supersedesId = text(input.supersedesId, "supersedesId", 200);
  if (supersedesId && (!parent || supersedesId !== parent.id)) throw new Error("Artifact predecessor does not match supersedesId.");
  const generatedId = id ?? globalThis.crypto?.randomUUID?.();
  if (!generatedId) throw new Error("Artifact creation requires a generated id.");
  if (parent?.id === generatedId) throw new Error("A new artifact version requires a new id.");
  const time = now instanceof Date ? now.toISOString() : isoTimestamp(now, "save timestamp");
  return normalizeArtifactRecord({
    ...Object.fromEntries(ARTIFACT_AUTHOR_FIELDS.filter(field => Object.hasOwn(input, field)).map(field => [field, input[field]])),
    id: generatedId, kind: "artifact", itemIds: input.itemIds ?? [],
    sourceSelection: input.sourceSelection ?? {},
    generatedAt: input.generatedAt ?? time,
    supersedesId: parent?.id || "", version: parent ? parent.version + 1 : 1,
    createdAt: time, updatedAt: time, updatedBy: actor
  });
}

function text(value, field, limit, required = false) {
  if (value != null && typeof value !== "string") throw new Error("Artifact " + field + " must be text.");
  const normalized = (value ?? "").trim();
  if ((required && !normalized) || [...normalized].length > limit) throw new Error("Artifact " + field + " must be " + (required ? "nonempty and " : "") + "at most " + limit + " characters.");
  return normalized;
}

function exactContent(value) {
  if (typeof value !== "string") throw new Error("Artifact content must be text.");
  if ([...value].length > 200000) throw new Error("Artifact content exceeds 200000 characters.");
  return value;
}

function actorValue(value) {
  if (!plainObject(value)) throw new Error("Artifact updatedBy must be a workspace actor object.");
  const id = text(value.id, "updatedBy.id", 200, true);
  if (typeof value.displayName !== "string" || !value.displayName.trim()) throw new Error("Artifact updatedBy.displayName must be nonempty text.");
  return { id, displayName: value.displayName.trim() };
}

function isoTimestamp(value, field) {
  if (typeof value !== "string" || !/^(?!0000)\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)) throw new Error("Artifact " + field + " must be a valid ISO timestamp.");
  const date = new Date(value);
  const day = value.slice(0, 10);
  const calendar = new Date(day + "T00:00:00.000Z");
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999 || Number.isNaN(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== day) throw new Error("Artifact " + field + " must be a valid ISO timestamp.");
  return date.toISOString();
}

function plainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
