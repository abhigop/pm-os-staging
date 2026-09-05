export function requestNativeConfirmation({ dialog, titleElement, descriptionElement, cancelButton, confirmButton, secondaryButton, trigger, title, description, confirmLabel, secondaryLabel = "", onSecondary }) {
  titleElement.textContent = title;
  descriptionElement.textContent = description;
  confirmButton.textContent = confirmLabel;
  if (secondaryButton) {
    secondaryButton.textContent = secondaryLabel;
    secondaryButton.hidden = !secondaryLabel;
  }
  dialog.returnValue = "";

  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("close", onClose);
      cancelButton.removeEventListener("click", onCancelClick);
      confirmButton.removeEventListener("click", onConfirmClick);
      secondaryButton?.removeEventListener("click", onSecondaryClick);
    };
    const finish = (confirmed, error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (trigger?.isConnected) trigger.focus();
      if (error) reject(error);
      else resolve(confirmed);
    };
    const closeWith = (value) => {
      try {
        dialog.returnValue = value;
        if (dialog.open) dialog.close(value);
        else finish(value === "confirm");
      } catch (error) {
        finish(false, error);
      }
    };
    const onCancel = (event) => {
      event.preventDefault();
      closeWith("cancel");
    };
    const onClose = () => finish(dialog.returnValue === "confirm");
    const onCancelClick = (event) => {
      event.preventDefault();
      closeWith("cancel");
    };
    const onConfirmClick = (event) => {
      event.preventDefault();
      closeWith("confirm");
    };
    const onSecondaryClick = async (event) => {
      event.preventDefault();
      try {
        await onSecondary?.();
        if (dialog.open) secondaryButton?.focus();
      } catch (error) {
        closeWith("cancel");
        finish(false, error);
      }
    };

    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("close", onClose);
    cancelButton.addEventListener("click", onCancelClick);
    confirmButton.addEventListener("click", onConfirmClick);
    secondaryButton?.addEventListener("click", onSecondaryClick);
    try {
      dialog.showModal();
      cancelButton.focus();
    } catch (error) {
      finish(false, error);
    }
  });
}

export async function runExclusiveAsyncAction({ isBusy, setBusy, onStart, onFinish, action }) {
  if (isBusy()) return { skipped: true, value: undefined, error: null };
  setBusy(true);
  let value;
  let error = null;
  try {
    onStart?.();
    value = await action();
  } catch (caught) {
    error = caught;
  } finally {
    setBusy(false);
    onFinish?.();
  }
  return { skipped: false, value, error };
}
