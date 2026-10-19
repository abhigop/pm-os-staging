export function runStorageTransaction(storage, keys, operation, rollbackMemory = () => {}) {
  const previous = captureStorageValues(storage, keys);
  try {
    return operation();
  } catch (error) {
    const rollbackErrors = restoreStorageValues(storage, previous);
    try {
      rollbackMemory();
    } catch (rollbackError) {
      rollbackErrors.push(rollbackError);
    }
    if (rollbackErrors.length) {
      throw new AggregateError([error, ...rollbackErrors], "Storage transaction failed and rollback was incomplete.", { cause: error });
    }
    throw error;
  }
}

export function captureStorageValues(storage, keys) {
  return [...new Set(keys)].map((key) => ({ key, value: storage.getItem(key) }));
}

export function restoreStorageValues(storage, entries) {
  const errors = [];
  for (const { key, value } of entries) {
    try {
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    } catch (error) {
      errors.push(error);
    }
  }
  return errors;
}

export function staleWorkspaceWriteError() {
  return Object.assign(new Error("This project's saved work changed in another tab. Nothing was saved. Your draft is still available. Review the latest saved work before saving again."), { code: "LOCAL_WORKSPACE_CHANGED" });
}

// IndexedDB is the shared committed-value witness. Unlike renderer-local
// localStorage caches, a transaction observes a previous tab's completed commit.
export function createIndexedDbStorageWitness(factory = globalThis.indexedDB) {
  let connection;
  function database() {
    if (!factory) return Promise.reject(Object.assign(new Error("Safe shared workspace saving requires IndexedDB. Keep or download your draft."), { code: "LOCAL_WORKSPACE_LOCK_UNAVAILABLE" }));
    if (!connection) connection = new Promise((resolve, reject) => {
      const request = factory.open("pm-os-staging-workspace-write-witness", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("committed");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("The shared workspace save database is blocked. Close older PM OS tabs and retry."));
    });
    return connection;
  }
  async function access(key, value, write) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("committed", write ? "readwrite" : "readonly");
      const store = transaction.objectStore("committed");
      const request = write ? store.put(value, key) : store.get(key);
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error || new Error("The shared workspace save transaction was aborted."));
      transaction.onerror = () => reject(transaction.error);
    });
  }
  return { read: key => access(key, undefined, false), write: (key, value) => access(key, value, true), forget: key => access(key, { forgotten: true }, true) };
}

// A loaded scope is an observation, not a read-through cache. Incidental reads
// must never authorize an older in-memory document to replace newer storage.
// Web Locks serialize cooperating tabs. The durable witness also rejects stale
// localStorage caches; raw writes outside this protocol are not an atomic CAS.
export function createStorageWriteScope(storage, keys, { locks = globalThis.navigator?.locks, values = captureStorageValues(storage, keys), witness = typeof window === "undefined" ? null : createIndexedDbStorageWitness() } = {}) {
  const watched = [...new Set(keys)];
  const witnessKey = watched[0];
  let baseline = values.map(entry => ({ ...entry }));
  let reviewedWitness;
  const sameValues = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  function assertCurrent(expected = baseline) {
    if (expected !== baseline || expected.some(({ key, value }) => storage.getItem(key) !== value)) throw staleWorkspaceWriteError();
  }
  async function assertSharedCurrent(expected) {
    const committed = await witness?.read(witnessKey);
    if (committed?.forgotten) throw staleWorkspaceWriteError();
    if (committed && expected.some(({ key, value }) => committed.find(entry => entry.key === key)?.value !== value) && !sameValues(committed, reviewedWitness)) throw staleWorkspaceWriteError();
    assertCurrent(expected);
  }
  return {
    values: () => baseline.map(entry => ({ ...entry })),
    assertCurrent,
    async reviewSnapshot() {
      if (!locks?.request) throw Object.assign(new Error("Safe shared workspace review requires Web Locks support."), { code: "LOCAL_WORKSPACE_LOCK_UNAVAILABLE" });
      return locks.request(`pm-os:workspace-write:${watched[0]}`, { mode: "exclusive" }, async () => {
        const committed = await witness?.read(witnessKey);
        if (committed?.forgotten) throw new Error("This project was forgotten on this device. Download your draft before leaving this tab; use a new project to recover it.");
        return { committed, values: captureStorageValues(storage, watched) };
      });
    },
    async adoptReviewed(snapshot, isCurrent = () => true) {
      if (!locks?.request) throw Object.assign(new Error("Safe shared workspace review requires Web Locks support."), { code: "LOCAL_WORKSPACE_LOCK_UNAVAILABLE" });
      return locks.request(`pm-os:workspace-write:${watched[0]}`, { mode: "exclusive" }, async () => {
        const committed = await witness?.read(witnessKey);
        if (!isCurrent() || !sameValues(committed, snapshot.committed) || snapshot.values.some(({ key, value }) => storage.getItem(key) !== value)) throw staleWorkspaceWriteError();
        // Only an explicit, displayed review authorizes reconciliation of old
        // clients, outside edits, or an interrupted local/witness commit.
        baseline = snapshot.values.map(entry => ({ ...entry }));
        reviewedWitness = committed;
      });
    },
    async externalEffect(operation, isCurrent = () => true) {
      const expected = baseline;
      if (!locks?.request) throw Object.assign(new Error("Safe shared workspace saving is unavailable in this browser. Keep or download your draft."), { code: "LOCAL_WORKSPACE_LOCK_UNAVAILABLE" });
      return locks.request(`pm-os:workspace-write:${watched[0]}`, { mode: "exclusive" }, async () => {
        await assertSharedCurrent(expected);
        if (!isCurrent()) throw Object.assign(new Error("The active project changed. Return to the original project before continuing."), { code: "PROJECT_CHANGED" });
        return operation();
      });
    },
    async run(transactionKeys, operation, rollbackMemory = () => {}, isCurrent = () => true) {
      const expected = baseline;
      if (!locks?.request) throw Object.assign(new Error("Safe shared workspace saving is unavailable in this browser. Keep or download your draft and open this project in a browser with Web Locks support."), { code: "LOCAL_WORKSPACE_LOCK_UNAVAILABLE" });
      return locks.request(`pm-os:workspace-write:${watched[0]}`, { mode: "exclusive" }, async () => {
        await assertSharedCurrent(expected);
        if (!isCurrent()) throw Object.assign(new Error("The active project changed. Return to the original project before saving this draft."), { code: "PROJECT_CHANGED" });
        const previous = captureStorageValues(storage, transactionKeys);
        const result = runStorageTransaction(storage, transactionKeys, () => {
          const value = operation();
          if (value && typeof value.then === "function") throw new Error("Storage transaction callbacks must be synchronous.");
          return value;
        }, rollbackMemory);
        const next = captureStorageValues(storage, watched);
        try {
          await witness?.write(witnessKey, next);
        } catch (error) {
          const rollbackErrors = restoreStorageValues(storage, previous);
          try { rollbackMemory(); } catch (rollbackError) { rollbackErrors.push(rollbackError); }
          if (rollbackErrors.length) throw new AggregateError([error, ...rollbackErrors], "Shared save failed and rollback was incomplete.", { cause: error });
          throw error;
        }
        baseline = next;
        reviewedWitness = undefined;
        return result;
      });
    }
  };
}

// Purge the committed document when a confirmed project deletion succeeds.
// A content-free tombstone also prevents a stale renderer from resurrecting it.
export async function forgetStorageWriteScope(storage, workspaceKey, keys, operation, { locks = globalThis.navigator?.locks, witness = typeof window === "undefined" ? null : createIndexedDbStorageWitness() } = {}) {
  if (!locks?.request) throw Object.assign(new Error("Safe project removal requires Web Locks support."), { code: "LOCAL_WORKSPACE_LOCK_UNAVAILABLE" });
  return locks.request(`pm-os:workspace-write:${workspaceKey}`, { mode: "exclusive" }, async () => {
    const previous = captureStorageValues(storage, keys);
    const result = runStorageTransaction(storage, keys, operation);
    try { await witness?.forget(workspaceKey); }
    catch (error) {
      const errors = restoreStorageValues(storage, previous);
      if (errors.length) throw new AggregateError([error, ...errors], "Project removal failed and rollback was incomplete.", { cause: error });
      throw error;
    }
    return result;
  });
}
