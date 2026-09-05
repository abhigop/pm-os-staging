const driveScope = "https://www.googleapis.com/auth/drive.file";
const driveBase = "https://www.googleapis.com/drive/v3/files";
const driveUploadBase = "https://www.googleapis.com/upload/drive/v3/files";
const driveFileFields = "id,name,version,modifiedTime,md5Checksum";
const fingerprintFields = ["id", "version", "modifiedTime", "md5Checksum"];

export class DriveConflictError extends Error {
  constructor(kind, remote) {
    super(driveConflictMessage(kind));
    this.name = "DriveConflictError";
    this.code = "DRIVE_CONFLICT";
    this.kind = kind;
    this.remote = remote;
  }
}

export function driveSourceReady(source) {
  return Boolean(source?.clientId?.trim() && source?.fileName?.trim() && (source?.fileId?.trim() || source?.folderName?.trim()));
}

export async function chooseDriveWorkspaceFile(config, accessToken, doc = document) {
  const developerKey = String(config?.pickerApiKey || "").trim();
  const appId = String(config?.appId || "").trim();
  if (!developerKey || !appId || !accessToken) throw new Error("Google Picker needs a browser API key, Cloud project number, and active Drive connection.");
  await loadGooglePickerScript(doc);
  return new Promise((resolve, reject) => {
    try {
      const pickerApi = globalThis.google?.picker;
      if (!pickerApi?.PickerBuilder) throw new Error("Google Picker did not load.");
      const builder = new pickerApi.PickerBuilder()
        .addView(pickerApi.ViewId.DOCS)
        .setOAuthToken(accessToken)
        .setDeveloperKey(developerKey)
        .setAppId(appId)
        .setSelectableMimeTypes("application/json")
        .setMaxItems(1)
        .setTitle("Choose a PM OS workspace")
        .setCallback((data = {}) => {
          if (data.action === pickerApi.Action.PICKED) {
            const selected = data.docs?.[0];
            const id = String(selected?.id || selected?.[pickerApi.Document?.ID] || "").trim();
            if (!id) reject(new Error("Google Picker did not return a file ID."));
            else resolve({ id, name: String(selected?.name || selected?.[pickerApi.Document?.NAME] || "pm-os-workspace.json") });
          } else if (data.action === pickerApi.Action.CANCEL) resolve(null);
        });
      if (globalThis.location?.origin && globalThis.location.origin !== "null") builder.setOrigin(globalThis.location.origin);
      builder.build().setVisible(true);
    } catch (error) {
      reject(error);
    }
  });
}

export function escapeDriveQueryValue(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

export function buildDriveFolderQuery(folderName) {
  return `mimeType='application/vnd.google-apps.folder' and trashed=false and name='${escapeDriveQueryValue(folderName)}'`;
}

export function buildDriveFileQuery(folderId, fileName) {
  return `'${escapeDriveQueryValue(folderId)}' in parents and trashed=false and name='${escapeDriveQueryValue(fileName)}'`;
}

export function driveFileFingerprint(file) {
  if (!file) return null;
  return Object.fromEntries(fingerprintFields.map((field) => [field, file[field] == null ? "" : String(file[field])]));
}

export function driveFingerprintComplete(value) {
  const fingerprint = driveFileFingerprint(value);
  return Boolean(fingerprint && fingerprintFields.every((field) => fingerprint[field]));
}

export function compareDriveFingerprints(baseRemote, remote) {
  if (!baseRemote && !remote) return "empty";
  if (!baseRemote && remote) return "unknown";
  if (baseRemote && !remote) return "deleted";
  const base = driveFileFingerprint(baseRemote);
  const observed = driveFileFingerprint(remote);
  if (!driveFingerprintComplete(base) || !driveFingerprintComplete(observed)) return "unknown";
  return fingerprintFields.every((field) => base[field] === observed[field]) ? "match" : "mismatch";
}

export function driveConflictKind(baseRemote, remote) {
  const comparison = compareDriveFingerprints(baseRemote, remote);
  return comparison === "empty" || comparison === "match" ? null : comparison;
}

export function advanceDriveBaseline(sync, remoteFile, action, now = new Date()) {
  const remote = driveFileFingerprint(remoteFile);
  if (!driveFingerprintComplete(remote)) throw new Error("Drive baseline requires a complete remote fingerprint.");
  if (action !== "pull" && action !== "push") throw new Error("Drive baseline action must be pull or push.");
  const timestamp = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(timestamp.getTime())) throw new Error("Drive baseline timestamp is invalid.");
  return {
    ...sync,
    [action === "pull" ? "lastPulledAt" : "lastPushedAt"]: timestamp.toISOString(),
    baseRemote: remote,
    remote,
    conflict: null
  };
}

export function buildConflictCopyName(fileName, now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(date.getTime())) throw new Error("Conflict copy timestamp is invalid.");
  const baseName = String(fileName || "pm-os-workspace.json").replace(/\.[^.]+$/, "") || "pm-os-workspace";
  const stamp = date.toISOString().replaceAll("-", "").replace("T", "-").replaceAll(":", "").replace(".", "-");
  return `${baseName}-conflict-${stamp}.json`;
}

export async function requestDriveAccessToken(clientId, doc = document) {
  await loadGoogleIdentityScript(doc);
  return new Promise((resolve, reject) => {
    if (!globalThis.google?.accounts?.oauth2) {
      reject(new Error("Google Identity Services did not load."));
      return;
    }
    const tokenClient = globalThis.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: driveScope,
      callback: (response) => {
        if (response.error) reject(new Error(response.error_description || response.error));
        else resolve(response.access_token);
      }
    });
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

export async function loadDriveWorkspace(source, accessToken, fetchImpl = fetch) {
  const workspace = await readDriveWorkspace(source, accessToken, fetchImpl);
  return workspace?.content || null;
}

export async function readDriveWorkspace(source, accessToken, fetchImpl = fetch) {
  const folderId = source.fileId ? "" : await ensureFolder(source.folderName, accessToken, fetchImpl);
  const beforeFile = source.fileId
    ? await getFile(source.fileId, accessToken, fetchImpl)
    : await findFile(folderId, source.fileName, accessToken, fetchImpl);
  if (!beforeFile) {
    if (source.fileId) throw new DriveConflictError("deleted", null);
    return null;
  }
  const before = driveFileFingerprint(beforeFile);
  if (!driveFingerprintComplete(before)) throw new DriveConflictError("unknown", before);
  const response = await driveFetch(`${driveBase}/${before.id}?alt=media`, accessToken, fetchImpl);
  const content = await response.text();
  const afterFile = source.fileId
    ? await getFile(source.fileId, accessToken, fetchImpl)
    : await findFile(folderId, source.fileName, accessToken, fetchImpl);
  const after = driveFileFingerprint(afterFile);
  const comparison = compareDriveFingerprints(before, after);
  if (comparison !== "match") {
    const kind = comparison === "deleted" ? "deleted" : comparison === "mismatch" ? "mismatch" : "unknown";
    throw new DriveConflictError(kind, after);
  }
  return { content, file: afterFile };
}

export async function inspectDriveWorkspace(source, accessToken, fetchImpl = fetch) {
  const folderId = source.fileId ? "" : await ensureFolder(source.folderName, accessToken, fetchImpl);
  const file = source.fileId
    ? await getFile(source.fileId, accessToken, fetchImpl)
    : await findFile(folderId, source.fileName, accessToken, fetchImpl);
  if (source.fileId && !file) throw new DriveConflictError("deleted", null);
  return { folderId, file };
}

export async function saveDriveWorkspace(source, accessToken, content, baseRemote = null, fetchImpl = fetch) {
  if (typeof baseRemote === "function") {
    fetchImpl = baseRemote;
    baseRemote = null;
  }
  const folderId = source.fileId ? "" : await ensureFolder(source.folderName, accessToken, fetchImpl);
  const file = source.fileId
    ? await getFile(source.fileId, accessToken, fetchImpl)
    : await findFile(folderId, source.fileName, accessToken, fetchImpl);
  if (source.fileId && !file) throw new DriveConflictError("deleted", null);
  const remote = driveFileFingerprint(file);
  const conflict = driveConflictKind(baseRemote, remote);
  if (conflict) throw new DriveConflictError(conflict, remote);
  return uploadDriveFile(folderId, source.fileName, file?.id || "", content, accessToken, fetchImpl);
}

export async function saveDriveConflictCopy(source, accessToken, content, now = new Date(), fetchImpl = fetch) {
  const folderId = await ensureFolder(source.folderName, accessToken, fetchImpl);
  const fileName = buildConflictCopyName(source.fileName, now);
  const file = await uploadDriveFile(folderId, fileName, "", content, accessToken, fetchImpl);
  return { file, fileName };
}

async function uploadDriveFile(folderId, fileName, fileId, content, accessToken, fetchImpl) {
  const metadata = { name: fileName, mimeType: "application/json", ...(fileId ? {} : { parents: [folderId] }) };
  const body = multipartBody(metadata, content);
  const url = fileId
    ? `${driveUploadBase}/${fileId}?uploadType=multipart&fields=${driveFileFields}`
    : `${driveUploadBase}?uploadType=multipart&fields=${driveFileFields}`;
  const response = await driveFetch(url, accessToken, fetchImpl, {
    method: fileId ? "PATCH" : "POST",
    headers: { "Content-Type": `multipart/related; boundary=${body.boundary}` },
    body: body.payload
  });
  return response.json();
}

async function ensureFolder(folderName, accessToken, fetchImpl) {
  const existing = await findFolder(folderName, accessToken, fetchImpl);
  if (existing) return existing.id;
  const response = await driveFetch(driveBase, accessToken, fetchImpl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: folderName, mimeType: "application/vnd.google-apps.folder" })
  });
  const folder = await response.json();
  return folder.id;
}

async function findFolder(folderName, accessToken, fetchImpl) {
  const url = `${driveBase}?q=${encodeURIComponent(buildDriveFolderQuery(folderName))}&fields=files(id,name)&pageSize=1`;
  const response = await driveFetch(url, accessToken, fetchImpl);
  const data = await response.json();
  return data.files?.[0] || null;
}

async function findFile(folderId, fileName, accessToken, fetchImpl) {
  const url = `${driveBase}?q=${encodeURIComponent(buildDriveFileQuery(folderId, fileName))}&fields=files(${driveFileFields})&pageSize=1`;
  const response = await driveFetch(url, accessToken, fetchImpl);
  const data = await response.json();
  return data.files?.[0] || null;
}

async function getFile(fileId, accessToken, fetchImpl) {
  const response = await fetchImpl(`${driveBase}/${encodeURIComponent(fileId)}?fields=${driveFileFields}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Drive request failed with ${response.status}`);
  }
  return response.json();
}

async function driveFetch(url, accessToken, fetchImpl, options = {}) {
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${accessToken}` };
  const response = await fetchImpl(url, { ...options, headers });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Drive request failed with ${response.status}`);
  }
  return response;
}

function multipartBody(metadata, content) {
  const boundary = "pm_os_drive_boundary";
  const payload = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    content,
    `--${boundary}--`
  ].join("\r\n");
  return { boundary, payload };
}

function driveConflictMessage(kind) {
  if (kind === "deleted") return "The Drive workspace was deleted since the last sync. Pull Remote before pushing.";
  if (kind === "mismatch") return "The Drive workspace changed since the last sync. Pull Remote or save local work as a conflict copy.";
  return "The Drive workspace has no trusted local baseline. Pull Remote before pushing.";
}

function loadGoogleIdentityScript(doc) {
  if (globalThis.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = doc.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity Services.")), { once: true });
      return;
    }
    const script = doc.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load Google Identity Services."));
    doc.head.appendChild(script);
  });
}

function loadGooglePickerScript(doc) {
  if (globalThis.google?.picker?.PickerBuilder) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const loadPicker = () => {
      if (!globalThis.gapi?.load) {
        reject(new Error("Google Picker loader did not initialize."));
        return;
      }
      globalThis.gapi.load("picker", { callback: resolve, onerror: () => reject(new Error("Google Picker did not load.")) });
    };
    const existing = doc.querySelector?.('script[src="https://apis.google.com/js/api.js"]');
    if (existing) {
      existing.addEventListener("load", loadPicker, { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Picker.")), { once: true });
      return;
    }
    const script = doc.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.defer = true;
    script.onload = loadPicker;
    script.onerror = () => reject(new Error("Failed to load Google Picker."));
    doc.head.appendChild(script);
  });
}
