export const LINKED_FILE_DATABASE = "pm-os-staging-linked-file";
const storeName = "handles";
const activeKey = "active";

export function linkedFileSupported(globalObject = globalThis) {
  return typeof globalObject.showOpenFilePicker === "function"
    && typeof globalObject.showSaveFilePicker === "function"
    && typeof globalObject.indexedDB?.open === "function";
}

export async function openLinkedWorkspaceFile(globalObject = globalThis) {
  requireSupported(globalObject);
  const [handle] = await globalObject.showOpenFilePicker({
    multiple: false,
    types: [{ description: "PM OS workspace", accept: { "application/json": [".json"] } }]
  });
  await storeLinkedFileHandle(handle, globalObject.indexedDB);
  return handle;
}

export async function createLinkedWorkspaceFile(globalObject = globalThis, suggestedName = "pm-os-workspace.json") {
  requireSupported(globalObject);
  const handle = await globalObject.showSaveFilePicker({
    suggestedName,
    types: [{ description: "PM OS workspace", accept: { "application/json": [".json"] } }]
  });
  await storeLinkedFileHandle(handle, globalObject.indexedDB);
  return handle;
}

export async function readLinkedWorkspaceFile(handle) {
  if (!handle?.getFile) throw new Error("The linked workspace file is unavailable.");
  const file = await handle.getFile();
  return { name: file.name, lastModified: file.lastModified, text: await file.text() };
}

export async function writeLinkedWorkspaceFile(handle, text) {
  if (!handle?.createWritable) throw new Error("The linked workspace file cannot be written.");
  const writable = await handle.createWritable();
  try { await writable.write(String(text)); await writable.close(); }
  catch (error) { try { await writable.abort?.(); } catch { /* Best-effort cleanup. */ } throw error; }
  return true;
}

export async function queryLinkedFilePermission(handle, mode = "readwrite") {
  if (!handle?.queryPermission) return "prompt";
  return handle.queryPermission({ mode });
}

export async function requestLinkedFilePermission(handle, mode = "readwrite") {
  if (!handle?.requestPermission) return "denied";
  return handle.requestPermission({ mode });
}

export async function storeLinkedFileHandle(projectIdOrHandle, handleOrIndexedDb, indexedDB = globalThis.indexedDB) {
  const { key, handle, databaseApi } = linkedHandleArguments(projectIdOrHandle, handleOrIndexedDb, indexedDB);
  const database = await openDatabase(databaseApi);
  await transactionPromise(database, "readwrite", (store) => store.put(handle, key));
}

export async function loadLinkedFileHandle(projectIdOrIndexedDb = globalThis.indexedDB, indexedDB = globalThis.indexedDB) {
  const projectScoped = typeof projectIdOrIndexedDb === "string";
  const key = projectScoped ? safeProjectHandleKey(projectIdOrIndexedDb) : activeKey;
  const databaseApi = projectScoped ? indexedDB : projectIdOrIndexedDb;
  const database = await openDatabase(databaseApi);
  return transactionPromise(database, "readonly", (store) => store.get(key));
}

export async function clearLinkedFileHandle(projectIdOrIndexedDb = globalThis.indexedDB, indexedDB = globalThis.indexedDB) {
  const projectScoped = typeof projectIdOrIndexedDb === "string";
  const key = projectScoped ? safeProjectHandleKey(projectIdOrIndexedDb) : activeKey;
  const databaseApi = projectScoped ? indexedDB : projectIdOrIndexedDb;
  const database = await openDatabase(databaseApi);
  await transactionPromise(database, "readwrite", (store) => store.delete(key));
}

function linkedHandleArguments(projectIdOrHandle, handleOrIndexedDb, indexedDB) {
  if (typeof projectIdOrHandle === "string") {
    return { key: safeProjectHandleKey(projectIdOrHandle), handle: handleOrIndexedDb, databaseApi: indexedDB };
  }
  return { key: activeKey, handle: projectIdOrHandle, databaseApi: handleOrIndexedDb || indexedDB };
}

function safeProjectHandleKey(value) {
  const key = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(key)) throw new Error("The linked-file project identifier is invalid.");
  return `project:${key}`;
}

function openDatabase(indexedDB) {
  if (!indexedDB?.open) return Promise.reject(new Error("Linked workspace files are unsupported in this browser."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LINKED_FILE_DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("The linked workspace file permission could not be stored."));
  });
}

function transactionPromise(database, mode, action) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("The linked workspace file operation failed."));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(new Error("The linked workspace file operation failed."));
  });
}

function requireSupported(globalObject) {
  if (!linkedFileSupported(globalObject)) throw new Error("Linked workspace files are unsupported in this browser.");
}
