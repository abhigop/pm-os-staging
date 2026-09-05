export const WORKSPACE_SOURCE_SCHEMA = "pm-os.source.v2";
export const WORKSPACE_SYNC_SCHEMA = "pm-os.sync.v2";
export const WORKSPACE_SOURCE_TYPES = Object.freeze([
  "browser", "local-file", "google-drive", "supabase-local", "supabase-lan", "supabase-team"
]);

const sourceTypes = new Set(WORKSPACE_SOURCE_TYPES);

export function defaultWorkspaceSource() {
  return Object.freeze({ schema: WORKSPACE_SOURCE_SCHEMA, type: "browser" });
}

export function normalizeWorkspaceSource(input = {}) {
  const legacyType = input.type === "local" ? "browser"
    : input.type === "drive-folder" ? "google-drive"
      : input.type === "local-server" ? "supabase-local"
        : input.type === "team" ? "supabase-team" : input.type;
  const type = sourceTypes.has(legacyType) ? legacyType : "browser";
  const normalized = { schema: WORKSPACE_SOURCE_SCHEMA, type };
  if (type === "google-drive") {
    Object.assign(normalized, {
      clientId: safeText(input.clientId),
      folderName: safeText(input.folderName, "PM OS"),
      fileName: safeText(input.fileName, "pm-os-workspace.json"),
      fileId: safeText(input.fileId)
    });
  }
  if (type === "local-file") Object.assign(normalized, { fileName: safeText(input.fileName, "pm-os-workspace.json") });
  if (type.startsWith("supabase-")) Object.assign(normalized, {
    backendMode: safeText(input.backendMode, type === "supabase-local" ? "personal-local" : type === "supabase-lan" ? "lan" : "remote")
  });
  return Object.freeze(normalized);
}

export function normalizeBackendRuntimeConfig(input = {}) {
  if (!input || typeof input !== "object") return null;
  if (hasForbiddenBrowserCredential(input)) return null;
  const mode = ["personal-local", "lan", "remote"].includes(input.mode) ? input.mode : "remote";
  const authMode = mode === "personal-local" || mode === "lan" ? "password" : input.authMode === "password" ? "password" : "otp";
  const url = safeText(input.url || input.projectUrl);
  const publishableKey = safeText(input.publishableKey || input.key || input.anonKey);
  if (!url || !publishableKey) return null;
  let endpoint;
  try { endpoint = new URL(url); } catch { return null; }
  const loopbackHttp = mode === "personal-local" && endpoint.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname);
  if ((!loopbackHttp && endpoint.protocol !== "https:") || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) return null;
  if (!isBrowserSafeSupabaseKey(publishableKey)) return null;
  return Object.freeze({
    mode,
    label: safeText(input.label, mode === "personal-local" ? "PM OS Local Server" : "Team Server"),
    url: endpoint.origin,
    publishableKey,
    authMode,
    persistSession: mode !== "remote" && input.persistSession !== false,
    allowWorkspaceCreation: input.allowWorkspaceCreation !== false
  });
}

export function resolveBackendRuntimeConfig(globalObject = globalThis) {
  return normalizeBackendRuntimeConfig(globalObject.PM_OS_BACKEND_CONFIG || globalObject.PM_OS_TEAM_CONFIG);
}

export function normalizeDriveRuntimeConfig(input = {}) {
  if (!input || typeof input !== "object" || !safeText(input.clientId) || safeText(input.clientSecret)) return null;
  return Object.freeze({
    label: safeText(input.label, "Google Drive"),
    clientId: safeText(input.clientId),
    pickerApiKey: safeText(input.pickerApiKey || input.apiKey),
    appId: safeText(input.appId)
  });
}

export function isBrowserSafeSupabaseKey(value) {
  const key = safeText(value);
  if (!key || /^sb_secret_/i.test(key) || /service[_-]?role|example|change[-_ ]?me|replace[-_ ]?me|your[-_ ]?(key|token)/i.test(key)) return false;
  if (/^sb_publishable_[A-Za-z0-9._-]{8,}$/.test(key)) return true;
  const segments = key.split(".");
  if (segments.length !== 3) return false;
  try {
    const normalized = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(globalThis.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
    return payload?.role === "anon";
  } catch {
    return false;
  }
}

function hasForbiddenBrowserCredential(input) {
  return ["serviceRoleKey", "service_role_key", "secretKey", "databaseUrl", "databasePassword", "postgresPassword"]
    .some((name) => safeText(input[name]));
}

function safeText(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}
