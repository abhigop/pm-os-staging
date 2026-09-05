const noticeId = "pm-os-update-notice";
const noticeStyleId = "pm-os-update-notice-styles";
const updateMessage = Object.freeze({ type: "SKIP_WAITING" });

function noticeMarkup() {
  return `
    <section id="${noticeId}" class="pm-os-update-notice" role="region" aria-labelledby="pm-os-update-title" aria-describedby="pm-os-update-description" hidden>
      <div class="pm-os-update-copy">
        <strong id="pm-os-update-title">Update available</strong>
        <p id="pm-os-update-description">A newer version of PM OS is ready. Updating reloads this page, so unsaved form entries will be lost. If a Team workspace is open, PM OS will return to the saved Browser or Drive workspace after reload.</p>
        <p id="pm-os-update-status" class="pm-os-update-status" role="status" aria-live="polite" aria-atomic="true">PM OS will not reload until you choose to update.</p>
      </div>
      <div class="pm-os-update-actions">
        <button id="pm-os-update-later" type="button">Later</button>
        <button id="pm-os-update-reload" type="button">Update and reload</button>
      </div>
    </section>`;
}

function noticeStyles() {
  return `
    #${noticeId}[hidden] { display:none !important; }
    #${noticeId} {
      position:fixed;
      z-index:2147483000;
      right:16px;
      bottom:16px;
      left:16px;
      width:min(680px,calc(100% - 32px));
      margin-left:auto;
      border:1px solid var(--control-line,#8395a1);
      border-radius:10px;
      padding:16px;
      color:var(--ink,#172026);
      background:var(--panel,#fff);
      box-shadow:var(--shadow,0 16px 40px rgb(16 34 46 / 24%));
      pointer-events:none;
      font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      display:grid;
      grid-template-columns:minmax(0,1fr) auto;
      align-items:center;
      gap:16px;
    }
    #${noticeId} strong { display:block; margin:0 0 5px; font-size:1rem; }
    #${noticeId} p { margin:0; font-size:.86rem; line-height:1.45; }
    #${noticeId} .pm-os-update-status { margin-top:6px; color:var(--muted,#566773); }
    #${noticeId} .pm-os-update-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; pointer-events:auto; }
    #${noticeId} button {
      min-height:42px;
      border:1px solid var(--line,transparent);
      border-radius:8px;
      padding:0 14px;
      color:var(--ink,#172026);
      background:var(--panel-soft,#415866);
      font:inherit;
      font-weight:800;
      cursor:pointer;
    }
    #${noticeId} button:hover { background:var(--accent-soft,#e8f4f4); }
    #${noticeId} #pm-os-update-reload { border-color:transparent; color:#fff; background:var(--accent,#147a84); }
    #${noticeId} #pm-os-update-reload:hover { color:#fff; background:var(--accent-dark,#0d5960); }
    #${noticeId} button:focus-visible { outline:3px solid var(--accent,#147a84); outline-offset:3px; }
    #${noticeId} button:disabled { cursor:wait; opacity:.68; }
    @media (max-width:640px) {
      #${noticeId} { grid-template-columns:1fr; }
      #${noticeId} .pm-os-update-actions { display:grid; grid-template-columns:1fr 1fr; }
      #${noticeId} button { width:100%; }
    }
  `;
}

function ensureNotice(rootDocument) {
  if (!rootDocument?.body) return null;
  if (!rootDocument.getElementById(noticeStyleId)) {
    const style = rootDocument.createElement("style");
    style.id = noticeStyleId;
    style.textContent = noticeStyles();
    (rootDocument.head || rootDocument.documentElement).append(style);
  }
  if (!rootDocument.getElementById(noticeId)) {
    rootDocument.body.insertAdjacentHTML("beforeend", noticeMarkup());
  }
  return rootDocument.getElementById(noticeId);
}

export function createServiceWorkerUpdateCoordinator({
  rootDocument = globalThis.document,
  reload = () => globalThis.location?.reload()
} = {}) {
  let registration = null;
  let reloadRequested = false;
  let activated = false;
  const notice = ensureNotice(rootDocument);
  const laterButton = rootDocument?.getElementById("pm-os-update-later");
  const reloadButton = rootDocument?.getElementById("pm-os-update-reload");
  const status = rootDocument?.getElementById("pm-os-update-status");

  function setBusy(isBusy) {
    if (laterButton) laterButton.disabled = isBusy;
    if (reloadButton) reloadButton.disabled = isBusy;
  }

  function show(nextRegistration) {
    registration = nextRegistration || registration;
    if (!notice) return;
    notice.hidden = false;
    if (!reloadRequested && status) {
      status.textContent = activated
        ? "The update is installed and will load when you choose to reload."
        : "PM OS will not reload until you choose to update.";
    }
  }

  function defer() {
    if (status) status.textContent = "Update deferred. PM OS will not reload automatically; update when you are ready.";
  }

  function requestReload() {
    if (reloadRequested) return;
    reloadRequested = true;
    setBusy(true);
    if (status) status.textContent = activated ? "Reloading with the update…" : "Applying the update, then reloading…";
    const waiting = registration?.waiting;
    if (waiting) waiting.postMessage(updateMessage);
    else reload();
  }

  function controllerChanged() {
    activated = true;
    if (reloadRequested) {
      reload();
      return;
    }
    show(registration);
  }

  laterButton?.addEventListener("click", defer);
  reloadButton?.addEventListener("click", requestReload);

  return Object.freeze({ controllerChanged, requestReload, show });
}

export function watchServiceWorkerRegistration(registration, { serviceWorker, onUpdateAvailable }) {
  if (!registration || !serviceWorker || typeof onUpdateAvailable !== "function") return;

  const announceWaitingUpdate = () => {
    if (serviceWorker.controller && registration.waiting) onUpdateAvailable(registration);
  };

  announceWaitingUpdate();
  registration.addEventListener?.("updatefound", () => {
    const installing = registration.installing;
    if (!installing) return;
    const inspectState = () => {
      if (installing.state === "installed" && serviceWorker.controller) onUpdateAvailable(registration);
    };
    installing.addEventListener?.("statechange", inspectState);
    inspectState();
  });
}

export async function registerServiceWorkerUpdates({
  serviceWorker = globalThis.navigator?.serviceWorker,
  workerUrl = "./sw.js",
  rootDocument = globalThis.document,
  reload = () => globalThis.location?.reload()
} = {}) {
  if (!serviceWorker?.register) return null;
  const coordinator = createServiceWorkerUpdateCoordinator({ rootDocument, reload });
  serviceWorker.addEventListener?.("controllerchange", coordinator.controllerChanged);
  try {
    const registration = await serviceWorker.register(workerUrl);
    watchServiceWorkerRegistration(registration, {
      serviceWorker,
      onUpdateAvailable: coordinator.show
    });
    await registration.update?.();
    return Object.freeze({ coordinator, registration });
  } catch {
    return null;
  }
}

function startUpdateRegistration() {
  void registerServiceWorkerUpdates();
}

if (typeof window !== "undefined" && typeof document !== "undefined" && typeof navigator !== "undefined") {
  if (document.readyState === "complete") startUpdateRegistration();
  else window.addEventListener("load", startUpdateRegistration, { once: true });
}
