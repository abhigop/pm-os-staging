import {
  WORKSPACE_REPOSITORY_ERROR_CODES,
  WorkspaceRepositoryError,
  immutableWorkspaceValue
} from "./workspace-contract.js";
import { isBrowserSafeSupabaseKey } from "./source-config.js";

export const SUPABASE_CLIENT_PROVIDER_ID = "supabase";

/** Validates browser-safe Supabase configuration without retaining secrets in errors. */
export function normalizeSupabasePublicConfig(input = {}) {
  const urlValue = String(input.url || input.projectUrl || input.supabaseUrl || "").trim();
  const keyValue = String(
    input.key || input.publishableKey || input.anonKey || input.supabaseKey || ""
  ).trim();

  const mode = ["personal-local", "lan", "remote"].includes(input.mode) ? input.mode : "remote";
  const authMode = mode === "personal-local" || mode === "lan" ? "password" : input.authMode === "password" ? "password" : "otp";
  const persistSession = mode !== "remote" && input.persistSession !== false;
  if (!urlValue || urlValue.length > 2048 || !keyValue || keyValue.length > 8192) {
    throw configurationError("A valid Supabase project URL and public key are required.");
  }

  let url;
  try {
    url = new URL(urlValue);
  } catch {
    throw configurationError("A valid Supabase project URL is required.");
  }
  const loopbackHttp = mode === "personal-local" && url.protocol === "http:"
    && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if ((!loopbackHttp && url.protocol !== "https:") || !url.hostname || url.username || url.password
    || url.search || url.hash || !["", "/"].includes(url.pathname)) {
    throw configurationError("Use HTTPS, except for a personal server on this device.");
  }
  if (!isBrowserSafeKey(keyValue)) {
    throw configurationError("A Supabase publishable or legacy anon key is required.");
  }

  return Object.freeze({ url: url.origin, key: keyValue, mode, authMode, persistSession });
}

/** Resolves a locally loaded Supabase global. This never imports from a CDN. */
export function resolveSupabaseClientFactory(globalObject = globalThis) {
  const factory = globalObject?.supabase?.createClient;
  if (typeof factory !== "function") {
    throw new WorkspaceRepositoryError(
      WORKSPACE_REPOSITORY_ERROR_CODES.UNSUPPORTED_OPERATION,
      "The local Supabase browser client is not available.",
      { providerId: SUPABASE_CLIENT_PROVIDER_ID, operation: "createClient" }
    );
  }
  return factory.bind(globalObject.supabase);
}

/** Creates a Supabase client using the deployment's explicit session policy. */
export function createSupabaseClient(config, options = {}) {
  const normalized = normalizeSupabasePublicConfig(config);
  const factory = typeof options.clientFactory === "function"
    ? options.clientFactory
    : resolveSupabaseClientFactory(options.globalObject || globalThis);
  let client;
  try {
    client = factory(normalized.url, normalized.key, {
      auth: {
        persistSession: normalized.persistSession,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });
  } catch {
    throw new WorkspaceRepositoryError(
      WORKSPACE_REPOSITORY_ERROR_CODES.REMOTE_ERROR,
      "The Supabase browser client could not be created.",
      {
        providerId: SUPABASE_CLIENT_PROVIDER_ID,
        operation: "createClient",
        retryable: false
      }
    );
  }
  if (!client || typeof client.rpc !== "function" || !client.auth) {
    throw new WorkspaceRepositoryError(
      WORKSPACE_REPOSITORY_ERROR_CODES.REMOTE_ERROR,
      "The Supabase browser client is invalid.",
      { providerId: SUPABASE_CLIENT_PROVIDER_ID, operation: "createClient" }
    );
  }
  return client;
}

/** Safe helpers for the managed-user, email-OTP flow used by team mode. */
export function createSupabaseAuthHelpers(client) {
  if (!client?.auth) {
    throw new WorkspaceRepositoryError(
      WORKSPACE_REPOSITORY_ERROR_CODES.REMOTE_ERROR,
      "The Supabase authentication client is invalid.",
      { providerId: SUPABASE_CLIENT_PROVIDER_ID, operation: "createAuthHelpers" }
    );
  }

  return Object.freeze({
    requestEmailOtp: async (email) => {
      const normalizedEmail = normalizeEmail(email, "requestEmailOtp");
      const result = await safeAuthCall(
        "requestEmailOtp",
        () => client.auth.signInWithOtp({
          email: normalizedEmail,
          options: { shouldCreateUser: false }
        })
      );
      return immutableWorkspaceValue({ requested: true, user: safeUser(result?.data?.user) });
    },
    verifyEmailOtp: async ({ email, token } = {}) => {
      const normalizedEmail = normalizeEmail(email, "verifyEmailOtp");
      const normalizedToken = String(token || "").trim();
      if (!normalizedToken || normalizedToken.length > 64) {
        throw authInputError("verifyEmailOtp", "A valid one-time code is required.");
      }
      const result = await safeAuthCall(
        "verifyEmailOtp",
        () => client.auth.verifyOtp({ email: normalizedEmail, token: normalizedToken, type: "email" })
      );
      return immutableWorkspaceValue({ user: safeUser(result?.data?.user) });
    },
    signUpWithPassword: async ({ email, password } = {}) => {
      const normalizedEmail = normalizeEmail(email, "signUpWithPassword");
      const normalizedPassword = normalizePassword(password, "signUpWithPassword");
      const result = await safeAuthCall(
        "signUpWithPassword",
        () => client.auth.signUp({ email: normalizedEmail, password: normalizedPassword })
      );
      return immutableWorkspaceValue({ user: safeUser(result?.data?.user) });
    },
    signInWithPassword: async ({ email, password } = {}) => {
      const normalizedEmail = normalizeEmail(email, "signInWithPassword");
      const normalizedPassword = normalizePassword(password, "signInWithPassword");
      const result = await safeAuthCall(
        "signInWithPassword",
        () => client.auth.signInWithPassword({ email: normalizedEmail, password: normalizedPassword })
      );
      return immutableWorkspaceValue({ user: safeUser(result?.data?.user) });
    },
    signOut: async () => {
      await safeAuthCall("signOut", () => client.auth.signOut({ scope: "local" }));
      return immutableWorkspaceValue({ signedOut: true });
    }
  });
}

const isBrowserSafeKey = isBrowserSafeSupabaseKey;

function normalizeEmail(value, operation) {
  const email = String(value || "").trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw authInputError(operation, "A valid email address is required.");
  }
  return email;
}

function normalizePassword(value, operation) {
  const password = String(value || "");
  if (password.length < 8 || password.length > 128) {
    throw authInputError(operation, "Use a password between 8 and 128 characters.");
  }
  return password;
}

async function safeAuthCall(operation, callback) {
  let result;
  try {
    result = await callback();
  } catch {
    throw authRemoteError(operation);
  }
  if (result?.error) throw authRemoteError(operation, result.error);
  return result;
}

function safeUser(user) {
  if (!user) return null;
  return {
    id: String(user.id || ""),
    email: String(user.email || "")
  };
}

function authInputError(operation, message) {
  return new WorkspaceRepositoryError(
    WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT,
    message,
    { providerId: SUPABASE_CLIENT_PROVIDER_ID, operation }
  );
}

function authRemoteError(operation, error) {
  const status = Number(error?.status || error?.statusCode || 0);
  const authFailure = status === 400 || status === 401 || status === 403;
  return new WorkspaceRepositoryError(
    authFailure
      ? WORKSPACE_REPOSITORY_ERROR_CODES.AUTH_REQUIRED
      : WORKSPACE_REPOSITORY_ERROR_CODES.REMOTE_ERROR,
    authFailure
      ? "Supabase authentication could not be completed."
      : "Supabase authentication is temporarily unavailable.",
    {
      providerId: SUPABASE_CLIENT_PROVIDER_ID,
      operation,
      retryable: !authFailure,
      details: status ? { status } : {}
    }
  );
}

function configurationError(message) {
  return new WorkspaceRepositoryError(
    WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT,
    message,
    { providerId: SUPABASE_CLIENT_PROVIDER_ID, operation: "configure" }
  );
}
