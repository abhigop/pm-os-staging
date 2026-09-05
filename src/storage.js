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
