import {
  WORKSPACE_REPOSITORY_ERROR_CODES,
  WorkspaceRepositoryError,
  immutableWorkspaceValue
} from "./workspace-contract.js";
import {
  SUPABASE_CLIENT_PROVIDER_ID,
  createSupabaseAuthHelpers,
  createSupabaseClient,
  normalizeSupabasePublicConfig
} from "./supabase-client-loader.js";
import {
  SupabaseTeamWorkspaceService,
  SupabaseWorkspaceRepository
} from "./supabase-workspace-repository.js";

export const SUPABASE_CONNECTION_STATUSES = Object.freeze([
  "idle", "connecting", "live", "reconnecting", "offline", "signed-out", "forbidden"
]);

const connectionStatuses = new Set(SUPABASE_CONNECTION_STATUSES);

/** App-facing boundary for Supabase configuration, auth, teams, and repositories. */
export class SupabaseTeamClient {
  constructor(options = {}) {
    this._clientFactory = options.createClient || options.clientFactory;
    this._scriptLoader = typeof options.scriptLoader === "function"
      ? options.scriptLoader
      : loadVendoredSupabaseClient;
    this._scriptLoaded = false;
    this._onSubscriberError = typeof options.onSubscriberError === "function"
      ? options.onSubscriberError
      : null;
    this._globalObject = options.globalObject;
    this._repositoryFactory = options.repositoryFactory
      || ((repositoryOptions) => new SupabaseWorkspaceRepository(repositoryOptions));
    this._teamServiceFactory = options.teamServiceFactory
      || ((serviceOptions) => new SupabaseTeamWorkspaceService(serviceOptions));
    this._config = options.config ? normalizeSupabasePublicConfig(options.config) : null;
    this._client = options.client || null;
    this._authHelpers = null;
    this._teamService = null;
    this._repositories = new Map();
    this._listeners = new Set();
    this._connectionStatus = "idle";
    this._authState = immutableWorkspaceValue({ status: "unknown", user: null });
    this._disposed = false;
    this._visibilityTarget = options.visibilityTarget === undefined
      ? globalThis.document
      : options.visibilityTarget;
    this._visibilityRefresh = null;
    this._onVisibilityChange = () => {
      if (this._visibilityTarget?.visibilityState === "hidden") return;
      void this._refreshVisibleRepositories();
    };
    this._visibilityTarget?.addEventListener?.("visibilitychange", this._onVisibilityChange);
  }

  validateConfig(input) {
    return validateSupabaseConfig(input);
  }

  async checkCapabilities(config) {
    this._assertActive("checkCapabilities");
    if (config) await this._replaceConfig(config);
    const client = await this._prepareClient("checkCapabilities");
    this._setConnection("connecting");
    let result;
    let capabilities;
    try {
      result = await client.rpc("pm_capabilities", {});
      if (result?.error) throw result.error;
      capabilities = normalizeCapabilities(result?.data);
    } catch (error) {
      throw this._handleError(error, "checkCapabilities");
    }
    this._setConnection("live");
    return capabilities;
  }

  async getAuthState() {
    this._assertActive("getAuthState");
    const client = await this._prepareClient("getAuthState");
    const finishSignedOut = async (clearStoredSession = false) => {
      if (clearStoredSession) {
        try { await client.auth?.signOut?.({ scope: "local" }); } catch { /* A stale local session must not block sign-in. */ }
      }
      this._authState = immutableWorkspaceValue({ status: "signed-out", user: null });
      this._setConnection("signed-out");
      return this._authState;
    };
    let result;
    try {
      if (typeof client.auth?.getSession === "function") {
        const sessionResult = await client.auth.getSession();
        if (sessionResult?.error) {
          if (isInvalidAuthSession(sessionResult.error) || this._config?.mode !== "remote") return finishSignedOut(true);
          throw sessionResult.error;
        }
        if (!sessionResult?.data?.session) return finishSignedOut();
      }
      result = await client.auth?.getUser?.();
      if (result?.error) {
        if (isInvalidAuthSession(result.error) || this._config?.mode !== "remote") return finishSignedOut(true);
        throw result.error;
      }
    } catch (error) {
      if (this._config?.mode !== "remote" || isInvalidAuthSession(error)) return finishSignedOut(true);
      throw this._handleError(error, "getAuthState");
    }
    const user = safeUser(result?.data?.user);
    this._authState = immutableWorkspaceValue({
      status: user ? "authenticated" : "signed-out",
      user
    });
    this._setConnection(user ? "live" : "signed-out");
    return this._authState;
  }

  async sendOtp(email) {
    this._assertActive("sendOtp");
    this._setConnection("connecting");
    try {
      await this._prepareClient("sendOtp");
      await this._helpers("sendOtp").requestEmailOtp(email);
    } catch (error) {
      throw this._handleError(error, "sendOtp");
    }
    this._authState = immutableWorkspaceValue({ status: "signed-out", user: null });
    this._setConnection("signed-out");
    return immutableWorkspaceValue({ requested: true });
  }

  async verifyOtp(email, code) {
    this._assertActive("verifyOtp");
    this._setConnection("connecting");
    let result;
    try {
      await this._prepareClient("verifyOtp");
      result = await this._helpers("verifyOtp").verifyEmailOtp({ email, token: code });
    } catch (error) {
      throw this._handleError(error, "verifyOtp");
    }
    const user = safeUser(result?.user);
    this._authState = immutableWorkspaceValue({
      status: user ? "authenticated" : "signed-out",
      user
    });
    this._setConnection(user ? "live" : "signed-out");
    return this._authState;
  }

  async signUpWithPassword(email, password) {
    return this._passwordAuth("signUpWithPassword", email, password);
  }

  async signInWithPassword(email, password) {
    return this._passwordAuth("signInWithPassword", email, password);
  }

  async _passwordAuth(operation, email, password) {
    this._assertActive(operation);
    this._setConnection("connecting");
    let result;
    try {
      await this._prepareClient(operation);
      result = await this._helpers(operation)[operation]({ email, password });
    } catch (error) {
      throw this._handleError(error, operation);
    }
    const user = safeUser(result?.user);
    this._authState = immutableWorkspaceValue({
      status: user ? "authenticated" : "signed-out",
      user
    });
    this._setConnection(user ? "live" : "signed-out");
    return this._authState;
  }

  async signOut() {
    this._assertActive("signOut");
    let helpers;
    let failure = null;
    try {
      await this._prepareClient("signOut");
      helpers = this._helpers("signOut");
    } catch (error) {
      failure = this._handleError(error, "signOut");
    }
    this._authState = immutableWorkspaceValue({ status: "signed-out", user: null });
    this._setConnection("signed-out");
    await this._disconnectRepositories();
    try {
      if (helpers) await helpers.signOut();
    } catch (error) {
      failure = this._handleError(error, "signOut");
    } finally {
      await this._discardClient(false);
      this._authState = immutableWorkspaceValue({ status: "signed-out", user: null });
      this._setConnection("signed-out");
    }
    if (failure) throw failure;
    return this._authState;
  }

  get teamService() {
    this._assertActive("teamService");
    if (!this._teamService) {
      this._teamService = this._teamServiceFactory({
        client: this._ensureClient("teamService"),
        onOperationError: (error) => this._handleRepositoryError(error)
      });
    }
    return this._teamService;
  }

  repositoryFor(workspaceId) {
    this._assertActive("repositoryFor");
    const id = String(workspaceId || "").trim();
    if (!id) throw facadeError(
      WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT,
      "repositoryFor",
      "A workspace identity is required."
    );
    if (!this._repositories.has(id)) {
      const repository = this._repositoryFactory({
        client: this._ensureClient("repositoryFor"),
        workspaceId: id,
        onConnectionStateChange: (state) => this._handleRepositoryState(state),
        onSubscriberError: this._onSubscriberError,
        onOperationError: (error) => this._handleRepositoryError(error),
        onRealtimeError: (error) => this._handleRepositoryError(error)
      });
      this._repositories.set(id, repository);
    }
    return this._repositories.get(id);
  }

  subscribeConnection(listener) {
    this._assertActive("subscribeConnection");
    if (typeof listener !== "function") {
      throw facadeError(
        WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT,
        "subscribeConnection",
        "Connection listener must be a function."
      );
    }
    this._listeners.add(listener);
    this._deliverConnection(listener);
    let active = true;
    return () => {
      if (!active) return false;
      active = false;
      return this._listeners.delete(listener);
    };
  }

  async dispose() {
    if (this._disposed) return false;
    this._visibilityTarget?.removeEventListener?.("visibilitychange", this._onVisibilityChange);
    await this._disconnectRepositories();
    await this._discardClient(true);
    this._config = null;
    this._authState = immutableWorkspaceValue({ status: "unknown", user: null });
    this._setConnection("idle");
    this._listeners.clear();
    this._disposed = true;
    return true;
  }

  async _replaceConfig(input) {
    const next = normalizeSupabasePublicConfig(input);
    if (this._config && this._config.url === next.url && this._config.key === next.key
      && this._config.mode === next.mode && this._config.authMode === next.authMode
      && this._config.persistSession === next.persistSession) return;
    if (this._client) {
      await this._disconnectRepositories();
      await this._discardClient(false);
    }
    this._config = next;
  }

  _ensureClient(operation) {
    if (this._client) return this._client;
    if (!this._config) {
      throw facadeError(
        WORKSPACE_REPOSITORY_ERROR_CODES.NOT_CONNECTED,
        operation,
        "Validate and check a Supabase configuration first."
      );
    }
    if (this._scriptLoader && !this._scriptLoaded && !this._clientFactory) {
      throw facadeError(
        WORKSPACE_REPOSITORY_ERROR_CODES.NOT_CONNECTED,
        operation,
        "Check Supabase capabilities before opening a team workspace."
      );
    }
    this._client = createSupabaseClient(this._config, {
      clientFactory: this._clientFactory,
      globalObject: this._globalObject
    });
    return this._client;
  }

  async _prepareClient(operation) {
    if (this._client) return this._client;
    if (this._scriptLoader && !this._scriptLoaded && !this._clientFactory) {
      let loaded;
      try {
        loaded = await this._scriptLoader();
      } catch {
        throw facadeError(
          WORKSPACE_REPOSITORY_ERROR_CODES.REMOTE_ERROR,
          operation,
          "The local Supabase browser client could not be loaded.",
          {},
          true
        );
      }
      if (typeof loaded === "function") this._clientFactory = loaded;
      else if (typeof loaded?.createClient === "function") {
        this._clientFactory = loaded.createClient.bind(loaded);
      }
      this._scriptLoaded = true;
    }
    return this._ensureClient(operation);
  }

  _helpers(operation) {
    if (!this._authHelpers) {
      this._authHelpers = createSupabaseAuthHelpers(this._ensureClient(operation));
    }
    return this._authHelpers;
  }

  async _disconnectRepositories() {
    const repositories = [...this._repositories.values()];
    this._repositories.clear();
    await Promise.all(repositories.map(async (repository) => {
      try {
        await repository.disconnect();
      } catch {
        // Facade lifecycle cleanup clears every local reference regardless.
      }
    }));
  }

  async _discardClient(clearConfig) {
    const client = this._client;
    this._client = null;
    this._authHelpers = null;
    this._teamService = null;
    if (clearConfig) this._config = null;
    try {
      client?.auth?.stopAutoRefresh?.();
    } catch {
      // The in-memory client reference is already detached.
    }
    try {
      if (typeof client?.removeAllChannels === "function") await client.removeAllChannels();
    } catch {
      // Local memory cleanup does not depend on remote channel acknowledgement.
    }
  }

  async _refreshVisibleRepositories() {
    if (this._disposed || !this._repositories.size || this._visibilityRefresh) {
      return this._visibilityRefresh;
    }
    const repositories = [...this._repositories.values()];
    this._visibilityRefresh = (async () => {
      for (const repository of repositories) {
        try {
          const opened = await repository.open();
          if (typeof opened?.extension?.refresh === "function") {
            await opened.extension.refresh();
          }
        } catch (error) {
          this._handleRepositoryError(error);
          if (isRevocationError(error)) break;
        }
      }
    })();
    try {
      await this._visibilityRefresh;
    } finally {
      this._visibilityRefresh = null;
    }
  }

  _handleRepositoryState(state) {
    const mapped = {
      connecting: "connecting",
      ready: "live",
      resyncing: "reconnecting",
      disconnected: this._authState.status === "signed-out" ? "signed-out" : "offline"
    }[state];
    if (mapped) this._setConnection(mapped);
  }

  _handleRepositoryError(error) {
    const accessRevoked = isRevocationError(error);
    if (accessRevoked) {
      this._teamService = null;
      void this._disconnectRepositories();
    }
    if (error?.code === WORKSPACE_REPOSITORY_ERROR_CODES.PERMISSION_DENIED) {
      if (accessRevoked) this._setConnection("forbidden");
    } else if (error?.code === WORKSPACE_REPOSITORY_ERROR_CODES.AUTH_REQUIRED) {
      this._authState = immutableWorkspaceValue({ status: "signed-out", user: null });
      this._setConnection("signed-out");
    } else if (error?.code === WORKSPACE_REPOSITORY_ERROR_CODES.REMOTE_ERROR
      || error?.code === WORKSPACE_REPOSITORY_ERROR_CODES.NOT_CONNECTED) {
      this._setConnection("offline");
    }
  }

  _handleError(error, operation) {
    const mapped = contextualFacadeError(error, operation);
    this._handleRepositoryError(mapped);
    return mapped;
  }

  _setConnection(status) {
    if (!connectionStatuses.has(status) || this._connectionStatus === status) return;
    this._connectionStatus = status;
    for (const listener of [...this._listeners]) this._deliverConnection(listener);
  }

  _deliverConnection(listener) {
    try {
      listener(this._connectionStatus);
    } catch {
      // UI connection observers cannot affect client state.
    }
  }

  _assertActive(operation) {
    if (this._disposed) {
      throw facadeError(
        WORKSPACE_REPOSITORY_ERROR_CODES.NOT_CONNECTED,
        operation,
        "This Supabase team client has been disposed."
      );
    }
  }
}

export function createSupabaseTeamClient(options) {
  return new SupabaseTeamClient(options);
}

export function validateSupabaseConfig(input) {
  const config = normalizeSupabasePublicConfig(input);
  return immutableWorkspaceValue({
    valid: true,
    projectUrl: config.url,
    keyType: config.key.startsWith("sb_publishable_") ? "publishable" : "anon"
  });
}

function normalizeCapabilities(input) {
  const source = input && typeof input === "object" ? input : {};
  if (source.provider !== "supabase" || source.realtime !== true
    || source.membership !== true || source.optimisticConcurrency !== true) {
    throw facadeError(
      WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT,
      "checkCapabilities",
      "Supabase returned an incompatible PM OS capability response."
    );
  }
  return immutableWorkspaceValue({
    provider: "supabase",
    schemaVersion: Number.isInteger(source.schemaVersion) ? source.schemaVersion : 1,
    realtime: true,
    membership: true,
    optimisticConcurrency: true,
    roles: Array.isArray(source.roles)
      ? source.roles.filter((role) => ["owner", "editor", "viewer"].includes(role))
      : ["owner", "editor", "viewer"]
  });
}

function safeUser(user) {
  const id = String(user?.id || "").trim();
  if (!id) return null;
  return immutableWorkspaceValue({
    id,
    email: String(user?.email || "").trim()
  });
}

function isInvalidAuthSession(error) {
  const signal = [error?.name, error?.code, error?.message].filter(Boolean).join(" ").toUpperCase();
  if (/AUTHSESSIONMISSINGERROR|AUTH SESSION MISSING|SESSION_NOT_FOUND|NO CURRENT SESSION/.test(signal)) return true;
  const status = Number(error?.status || error?.statusCode || 0);
  return [400, 401].includes(status) && /AUTH|SESSION|TOKEN|JWT|REFRESH/.test(signal);
}

function contextualFacadeError(error, operation) {
  if (error instanceof WorkspaceRepositoryError) {
    return facadeError(error.code, operation, facadeMessage(error.code), error.details, error.retryable);
  }
  const signal = [error?.code, error?.message].filter(Boolean).join(" ").toUpperCase();
  const status = Number(error?.status || error?.statusCode || 0);
  let code = WORKSPACE_REPOSITORY_ERROR_CODES.REMOTE_ERROR;
  if (status === 401 || /PM_AUTH_REQUIRED|PGRST301/.test(signal)) {
    code = WORKSPACE_REPOSITORY_ERROR_CODES.AUTH_REQUIRED;
  } else if (status === 403 || /PM_PERMISSION_DENIED|42501/.test(signal)) {
    code = WORKSPACE_REPOSITORY_ERROR_CODES.PERMISSION_DENIED;
  }
  return facadeError(code, operation, facadeMessage(code), status ? { status } : {}, code === "REMOTE_ERROR");
}

function isRevocationError(error) {
  return error?.code === WORKSPACE_REPOSITORY_ERROR_CODES.AUTH_REQUIRED
    || (error?.code === WORKSPACE_REPOSITORY_ERROR_CODES.PERMISSION_DENIED
      && error?.details?.accessRevoked !== false);
}

function facadeMessage(code) {
  if (code === WORKSPACE_REPOSITORY_ERROR_CODES.AUTH_REQUIRED) return "Sign in to use Supabase team mode.";
  if (code === WORKSPACE_REPOSITORY_ERROR_CODES.PERMISSION_DENIED) return "This account cannot use the requested team workspace operation.";
  if (code === WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT) return "Supabase returned invalid team mode data.";
  return "Supabase team mode is temporarily unavailable.";
}

function facadeError(code, operation, message, details = {}, retryable = false) {
  return new WorkspaceRepositoryError(code, message, {
    providerId: SUPABASE_CLIENT_PROVIDER_ID,
    operation,
    details,
    retryable
  });
}

let vendoredScriptPromise = null;
function loadVendoredSupabaseClient() {
  if (typeof globalThis.supabase?.createClient === "function") return globalThis.supabase;
  if (vendoredScriptPromise) return vendoredScriptPromise;
  if (!globalThis.document?.head) {
    return Promise.reject(new Error("LOCAL_SUPABASE_CLIENT_UNAVAILABLE"));
  }
  vendoredScriptPromise = new Promise((resolve, reject) => {
    const selector = "script[data-pm-os-supabase-client]";
    const existing = globalThis.document.querySelector(selector);
    const script = existing || globalThis.document.createElement("script");
    const complete = () => {
      if (typeof globalThis.supabase?.createClient === "function") {
        resolve(globalThis.supabase);
      } else {
        vendoredScriptPromise = null;
        reject(new Error("LOCAL_SUPABASE_CLIENT_INVALID"));
      }
    };
    const failed = () => {
      vendoredScriptPromise = null;
      if (!existing) script.remove();
      reject(new Error("LOCAL_SUPABASE_CLIENT_UNAVAILABLE"));
    };
    script.addEventListener("load", complete, { once: true });
    script.addEventListener("error", failed, { once: true });
    if (!existing) {
      script.dataset.pmOsSupabaseClient = "true";
      script.src = new URL("../vendor/supabase-2.110.0.js", import.meta.url).href;
      script.async = true;
      globalThis.document.head.append(script);
    }
  });
  return vendoredScriptPromise;
}
