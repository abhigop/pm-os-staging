import { runStorageTransaction } from "./storage.js";
import { normalizeSupabasePublicConfig } from "./supabase-client-loader.js";
import { createSupabaseTeamClient } from "./supabase-team-client.js";
import {
  WORKSPACE_REPOSITORY_ERROR_CODES,
  WorkspaceRepositoryError,
  immutableWorkspaceValue
} from "./workspace-contract.js";

export const SERVER_CONNECTOR_REGISTRY_SCHEMA = "pm-os.server-connectors.v1";
export const SERVER_CONNECTOR_REGISTRY_KEY = "pm-os-staging.server-connectors.v1";
export const SERVER_CONNECTOR_AUTH_KEY_PREFIX = "pm-os-staging.supabase.auth.v1.";

const connectorIdPattern = /^[a-z0-9][a-z0-9-]{0,79}$/;
const allowedFields = new Set([
  "id", "label", "mode", "url", "projectUrl", "supabaseUrl", "publishableKey",
  "anonKey", "key", "supabaseKey", "authMode", "persistSession",
  "allowWorkspaceCreation", "createdAt"
]);

/** Returns the one browser-storage key that may hold this connector's Supabase session. */
export function serverConnectorAuthStorageKey(connectorId) {
  return `${SERVER_CONNECTOR_AUTH_KEY_PREFIX}${normalizeConnectorId(connectorId)}`;
}

/** Validates and strips a connector down to browser-safe persisted metadata. */
export function normalizeServerConnector(input = {}, options = {}) {
  assertNoForbiddenConnectorFields(input);
  const id = normalizeConnectorId(input.id || options.idFactory?.());
  const label = requiredText(input.label, "connector label", 160);
  const publicConfig = normalizeSupabasePublicConfig({
    url: input.url || input.projectUrl || input.supabaseUrl,
    key: input.publishableKey || input.anonKey || input.key || input.supabaseKey,
    mode: input.mode,
    authMode: input.authMode,
    persistSession: input.persistSession,
    storageKey: serverConnectorAuthStorageKey(id)
  });
  const now = typeof options.now === "function" ? options.now() : new Date().toISOString();
  const createdAt = safeTimestamp(input.createdAt) || safeTimestamp(now);
  if (!createdAt) throw connectorError("The connector creation time is invalid.");
  return immutableWorkspaceValue({
    id,
    label,
    mode: publicConfig.mode,
    url: publicConfig.url,
    publishableKey: publicConfig.key,
    authMode: publicConfig.authMode,
    persistSession: publicConfig.persistSession,
    allowWorkspaceCreation: input.allowWorkspaceCreation !== false,
    createdAt
  });
}

export function emptyServerConnectorRegistry() {
  return immutableWorkspaceValue({ schema: SERVER_CONNECTOR_REGISTRY_SCHEMA, connectors: [] });
}

export function normalizeServerConnectorRegistry(input = {}) {
  if (!input || input.schema !== SERVER_CONNECTOR_REGISTRY_SCHEMA || !Array.isArray(input.connectors)) {
    return null;
  }
  const connectors = [];
  const seen = new Set();
  for (const value of input.connectors) {
    let connector;
    try { connector = normalizeServerConnector(value); } catch { return null; }
    if (seen.has(connector.id)) return null;
    seen.add(connector.id);
    connectors.push(connector);
  }
  return immutableWorkspaceValue({ schema: SERVER_CONNECTOR_REGISTRY_SCHEMA, connectors });
}

/** Corrupt/unavailable storage fails closed to an ephemeral empty connector catalog. */
export function loadServerConnectorRegistry(storage) {
  if (!storage?.getItem || !storage?.setItem) {
    return immutableWorkspaceValue({
      registry: emptyServerConnectorRegistry(),
      persistent: false,
      warning: "Server connection storage is unavailable."
    });
  }
  try {
    const raw = storage?.getItem?.(SERVER_CONNECTOR_REGISTRY_KEY);
    if (raw === null || raw === undefined || raw === "") {
      return immutableWorkspaceValue({ registry: emptyServerConnectorRegistry(), persistent: true, warning: "" });
    }
    const registry = normalizeServerConnectorRegistry(JSON.parse(raw));
    if (!registry) throw new Error("INVALID_CONNECTOR_REGISTRY");
    return immutableWorkspaceValue({ registry, persistent: true, warning: "" });
  } catch {
    return immutableWorkspaceValue({
      registry: emptyServerConnectorRegistry(),
      persistent: false,
      warning: "Saved server connections could not be read and were not overwritten."
    });
  }
}

export function connectorById(registry, connectorId) {
  const id = normalizeConnectorId(connectorId);
  return normalizeServerConnectorRegistry(registry)?.connectors.find((entry) => entry.id === id) || null;
}

export function saveServerConnector(storage, registry, input, options = {}) {
  const current = requireRegistry(registry);
  const connector = normalizeServerConnector(input, options);
  const connectors = current.connectors.some((entry) => entry.id === connector.id)
    ? current.connectors.map((entry) => entry.id === connector.id
      ? normalizeServerConnector({ ...connector, createdAt: entry.createdAt })
      : entry)
    : [...current.connectors, connector];
  const next = immutableWorkspaceValue({ schema: SERVER_CONNECTOR_REGISTRY_SCHEMA, connectors });
  persistRegistry(storage, next);
  return immutableWorkspaceValue({ registry: next, connector: connectorById(next, connector.id) });
}

export function removeServerConnector(storage, registry, connectorId) {
  const current = requireRegistry(registry);
  const id = normalizeConnectorId(connectorId);
  if (!current.connectors.some((entry) => entry.id === id)) return current;
  const next = immutableWorkspaceValue({
    schema: SERVER_CONNECTOR_REGISTRY_SCHEMA,
    connectors: current.connectors.filter((entry) => entry.id !== id)
  });
  persistRegistry(storage, next);
  return next;
}

/** Converts safe persisted metadata into a connector-specific Supabase client config. */
export function serverConnectorClientConfig(connector) {
  const normalized = normalizeServerConnector(connector);
  return immutableWorkspaceValue({
    url: normalized.url,
    key: normalized.publishableKey,
    mode: normalized.mode,
    authMode: normalized.authMode,
    persistSession: normalized.persistSession,
    storageKey: serverConnectorAuthStorageKey(normalized.id)
  });
}

/** Owns lazy clients so sign-out and removal affect only the selected connector. */
export class ServerConnectorClientPool {
  constructor(options = {}) {
    this.storage = options.storage;
    const loaded = options.registry
      ? { registry: requireRegistry(options.registry), persistent: true, warning: "" }
      : loadServerConnectorRegistry(this.storage);
    this.registry = loaded.registry;
    this.persistent = loaded.persistent;
    this.warning = loaded.warning;
    this._createTeamClient = typeof options.createTeamClient === "function"
      ? options.createTeamClient
      : (clientOptions) => createSupabaseTeamClient(clientOptions);
    this._clientOptions = options.clientOptions || {};
    this._clients = new Map();
  }

  connector(connectorId) { return connectorById(this.registry, connectorId); }

  register(input, options = {}) {
    const saved = saveServerConnector(this.storage, this.registry, input, options);
    this.registry = saved.registry;
    const existing = this._clients.get(saved.connector.id);
    if (existing) {
      try { void Promise.resolve(existing.dispose?.()).catch(() => {}); } catch { /* The stale client is still evicted. */ }
      this._clients.delete(saved.connector.id);
    }
    return saved.connector;
  }

  clientFor(connectorId) {
    const connector = this.connector(connectorId);
    if (!connector) throw connectorError("That server connection is not registered.", "clientFor");
    if (!this._clients.has(connector.id)) {
      this._clients.set(connector.id, this._createTeamClient({
        ...this._clientOptions,
        config: serverConnectorClientConfig(connector)
      }));
    }
    return this._clients.get(connector.id);
  }

  async signOut(connectorId) {
    const connector = this.connector(connectorId);
    if (!connector) throw connectorError("That server connection is not registered.", "signOut");
    const client = this._clients.get(connector.id);
    let failure;
    try {
      if (client) await client.signOut();
    } catch (error) {
      failure = error;
    } finally {
      clearStorageKey(this.storage, serverConnectorAuthStorageKey(connector.id));
    }
    if (failure) throw failure;
    return immutableWorkspaceValue({ connectorId: connector.id, signedOut: true });
  }

  async remove(connectorId) {
    const connector = this.connector(connectorId);
    if (!connector) return false;
    try { await this.signOut(connector.id); } catch { /* Local removal still clears the isolated session. */ }
    const client = this._clients.get(connector.id);
    try { await client?.dispose?.(); } catch { /* A disconnected client cannot block local removal. */ }
    this._clients.delete(connector.id);
    this.registry = removeServerConnector(this.storage, this.registry, connector.id);
    return true;
  }

  async dispose() {
    const clients = [...this._clients.values()];
    this._clients.clear();
    await Promise.allSettled(clients.map((client) => client.dispose?.()));
  }
}

function persistRegistry(storage, registry) {
  if (!storage?.setItem) throw connectorError("Server connection storage is unavailable.", "save");
  try {
    runStorageTransaction(storage, [SERVER_CONNECTOR_REGISTRY_KEY], () => {
      storage.setItem(SERVER_CONNECTOR_REGISTRY_KEY, JSON.stringify(registry));
    });
  } catch {
    throw connectorError("Server connections could not be saved.", "save");
  }
}

function requireRegistry(value) {
  const registry = normalizeServerConnectorRegistry(value);
  if (!registry) throw connectorError("The server connection catalog is invalid.", "registry");
  return registry;
}

function normalizeConnectorId(value) {
  const id = String(value || "").trim().toLowerCase();
  if (!connectorIdPattern.test(id)) throw connectorError("The server connection identity is invalid.");
  return id;
}

function assertNoForbiddenConnectorFields(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw connectorError("Server connection metadata must be an object.");
  }
  for (const key of Object.keys(input)) {
    if (!allowedFields.has(key)) {
      throw connectorError("Credentials and workspace content cannot be stored with a server connection.");
    }
  }
}

function requiredText(value, label, maxLength) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text || text.length > maxLength) throw connectorError(`A valid ${label} is required.`);
  return text;
}

function safeTimestamp(value) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function clearStorageKey(storage, key) {
  try { storage?.removeItem?.(key); } catch { /* A storage denial is already isolated to this connector. */ }
}

function connectorError(message, operation = "configure") {
  return new WorkspaceRepositoryError(
    WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT,
    message,
    { providerId: "supabase", operation }
  );
}
