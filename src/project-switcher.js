import { activeProject, projectById, projectProviderLabel } from "./projects.js";

export function newProjectWizardState({ driveClientId = "", drivePickerAvailable = false } = {}) {
  return {
    step: 1, name: "", provider: "browser", error: "", connectorId: "", connectorMode: "remote",
    connectorLabel: "", connectorUrl: "", connectorKey: "", persistSession: true, serverAction: "create",
    serverWorkspaceId: "", serverWorkspaces: [], createAttemptId: "",
    sourceAction: "create", driveClientId, drivePickerAvailable, driveFileLink: "", driveFolderName: "PM OS"
  };
}

export function createProjectUiState(registry, { persistent = true, warning = "", connectors = [] } = {}) {
  return {
    registry, persistent, warning, connectors, surface: "closed", query: "", busy: false, error: "", status: "",
    pendingProjectId: "", archivedLinkId: "", archivedLinkSearch: "", returnFocusId: "projectSwitcherButton", renameProjectId: "", renameMutationId: "",
    archiveProjectId: "", deleteProjectId: "", deleteName: "", backupDownloaded: false, deleteRevision: 0,
    deleteMutationId: "", deleteRemoteDrive: false, driveDeleteTicket: null, driveDeleteToken: "", connectorBusyId: "", serverGate: null, wizard: newProjectWizardState()
  };
}

export function currentProjectDescriptor(ui, team = null) {
  const project = activeProject(ui?.registry);
  if (team?.active && team.workspace) return {
    id: team.projectId || `team:${team.workspace.id}`, name: team.workspace.name,
    provider: team.backendMode === "remote" ? "Team Server" : "Local Server",
    detail: `${titleCase(team.role || "viewer")} · ${team.connection === "live" ? "Live" : titleCase(team.connection || "offline")}`,
    tone: team.connection === "live" ? "" : "warning", team: true
  };
  return project ? {
    id: project.id, name: project.name, provider: projectProviderLabel(project.provider),
    detail: project.provider === "browser" ? "Saved locally" : project.provider === "local-file" ? "Linked on this device"
      : project.provider === "server" ? `${titleCase(project.serverRole)} · ${project.serverStatus === "sign-in-required" ? "Sign in required" : "Ready to reopen"}` : "Cached locally",
    tone: project.serverStatus === "sign-in-required" ? "warning" : "", team: false
  } : null;
}

export function projectSwitcherButtonMarkup(ui, { mobile = false, team = null, itemCount = 0 } = {}) {
  const current = currentProjectDescriptor(ui, team);
  if (!current) return "";
  const id = mobile ? "mobileProjectSwitcherButton" : "projectSwitcherButton";
  const classes = mobile ? "mobile-project-switcher" : "workspace-switcher workspace-switcher-button";
  const count = current.team || activeProject(ui.registry)?.provider === "server" ? current.detail : `${current.provider} · ${itemCount} initiative${itemCount === 1 ? "" : "s"}`;
  return `<button class="${classes}" id="${id}" type="button" aria-haspopup="dialog" aria-controls="projectSwitcherDialog"><span class="source-dot ${current.tone === "warning" ? "is-warning" : ""}" aria-hidden="true"></span><span class="project-trigger-copy"><strong>${esc(current.name)}</strong><span>${esc(count)}</span></span><span class="project-trigger-chevron" aria-hidden="true">⌄</span></button>`;
}

export function projectSwitcherMarkup(ui, { team = null, teamWorkspaces = [], linkedFileAvailable = false } = {}) {
  if (!ui) return "";
  const live = `<div class="project-prototype-toast ${ui.status ? "is-visible" : ""}" role="status" aria-live="polite" aria-atomic="true">${esc(ui.status)}</div>`;
  if (ui.surface === "closed") return live;
  if (ui.surface === "confirm-archive") return `${live}${archiveDialog(ui)}`;
  const body = ui.surface === "wizard" ? wizard(ui, linkedFileAvailable) : ui.surface === "manage" ? manager(ui)
    : ui.surface === "rename" ? renameDialog(ui) : ui.surface === "delete" ? deleteDialog(ui)
      : ui.surface === "server-auth" ? serverAuthDialog(ui) : ui.surface === "archived-link" ? archivedLinkDialog(ui) : switcher(ui, team, teamWorkspaces);
  return `${live}<dialog class="project-prototype-dialog" id="projectSwitcherDialog" aria-labelledby="projectSwitcherTitle">${body}</dialog>`;
}

function archivedLinkDialog(ui) {
  const project = projectById(ui.registry, ui.archivedLinkId);
  return `<div class="project-dialog-shell"><header class="project-dialog-header"><div><p class="panel-kicker">Project link</p><h2 id="projectSwitcherTitle" tabindex="-1">This project is archived</h2><p>${esc(project?.name || "The linked project")} is hidden on this device. Restore it to open the link. Your current project stays open until the destination is ready.</p></div></header><div class="project-dialog-body">${alerts(ui)}</div><footer class="project-dialog-footer project-confirm-actions"><button class="secondary" id="closeProjectSwitcherButton" type="button">Stay in current project</button><button class="primary" id="restoreLinkedProjectButton" type="button" ${ui.busy ? "disabled" : ""}>Restore and open</button></footer></div>`;
}

function switcher(ui, team, teamWorkspaces) {
  const current = currentProjectDescriptor(ui, team);
  const needle = ui.query.trim().toLowerCase();
  const registered = ui.registry.projects.filter((entry) => !entry.archivedAt && matches(entry, needle));
  const rows = registered.map((entry) => projectRow({
    id: entry.id, name: entry.name,
    provider: entry.provider === "server" ? connectorLabel(ui, entry.connectorId) : projectProviderLabel(entry.provider),
    detail: entry.provider === "browser" ? "Saved locally" : entry.provider === "local-file" ? "Linked file"
      : entry.provider === "google-drive" ? "Reconnect to sync" : `${titleCase(entry.serverRole)} · ${entry.serverStatus === "sign-in-required" ? "Sign in required" : "Server project"}`,
    current: entry.id === ui.registry.activeProjectId && (!team?.active || Boolean(team.projectId)), busy: ui.busy && ui.pendingProjectId === entry.id,
    attribute: entry.provider === "server" ? "data-switch-server-project" : "data-switch-project"
  })).join("");
  const transient = teamWorkspaces.filter((entry) => !ui.registry.projects.some((project) => project.provider === "server" && project.workspaceId === entry.id) && matches(entry, needle));
  const remoteRows = transient.map((entry) => projectRow({
    id: entry.id, name: entry.name, provider: "Team Server", detail: `${titleCase(entry.role)} · Current connection`,
    current: Boolean(team?.active && team.workspace?.id === entry.id), busy: false, attribute: "data-switch-team-project"
  })).join("");
  const groups = `${rows ? `<section class="project-palette-group"><h3>Projects</h3>${rows}</section>` : ""}${remoteRows ? `<section class="project-palette-group"><h3>Current Team connection</h3>${remoteRows}</section>` : ""}`;
  return `<div class="project-dialog-shell"><header class="project-dialog-header"><div><p class="panel-kicker">Projects</p><h2 id="projectSwitcherTitle">Switch project</h2><p>The current project stays open until another workspace is ready.</p></div><button class="icon-button project-dialog-close" id="closeProjectSwitcherButton" type="button" aria-label="Close project switcher">Close</button></header><div class="project-dialog-body"><label class="project-search"><span class="sr-only">Search projects</span><input id="projectSwitcherSearch" type="search" value="${esc(ui.query)}" placeholder="Search projects" autocomplete="off"></label>${alerts(ui)}<div class="project-list" aria-label="Available projects">${groups || `<div class="project-empty-state"><strong>No projects match “${esc(ui.query)}”</strong><p>Clear the search or create a project.</p></div>`}</div></div><footer class="project-dialog-footer"><div><button class="primary" id="newProjectButton" type="button" ${ui.persistent ? "" : "disabled"}>New project</button><button class="secondary" id="manageProjectsButton" type="button" ${ui.persistent ? "" : "disabled"}>Manage projects</button></div><p><span class="source-dot" aria-hidden="true"></span>${esc(current?.name || "Current project")} remains open during switching.</p></footer></div>`;
}

function wizard(ui, linkedFileAvailable) {
  const state = ui.wizard;
  const content = state.step === 1
    ? `<label class="project-name-field"><span>Project name</span><input id="projectName" name="name" maxlength="160" value="${esc(state.name)}" placeholder="e.g. Pricing redesign" autocomplete="off"></label>`
    : `<fieldset class="prototype-choice-grid"><legend>Choose where this project lives</legend>${choice("provider", "browser", "Browser", "Saved privately in this browser.", state.provider)}${choice("provider", "local-file", "Linked file", linkedFileAvailable ? "Create or open a portable workspace file." : "Unavailable in this browser.", state.provider, !linkedFileAvailable)}${choice("provider", "google-drive", "Google Drive", "Connect and create or open a workspace file.", state.provider)}${choice("provider", "server", "Server", "Create or open a workspace on a saved connection.", state.provider)}</fieldset>${state.provider === "server" ? serverFields(ui) : ["local-file", "google-drive"].includes(state.provider) ? externalSourceFields(state) : ""}`;
  return `<form class="project-dialog-shell" id="projectWizardForm" novalidate><header class="project-dialog-header"><div><p class="panel-kicker">New project · Step ${state.step} of 2</p><h2 id="projectSwitcherTitle">${state.step === 1 ? "Name the project" : "Choose a source"}</h2><p>${state.step === 2 ? "Choose where to save this project." : "Create a separate PM workspace."}</p></div><button class="icon-button project-dialog-close" id="closeProjectSwitcherButton" type="button" aria-label="Close new project wizard">Close</button></header><ol class="project-wizard-progress" aria-label="Project setup progress"><li class="active">Name</li><li class="${state.step >= 2 ? "active" : ""}">Source</li></ol><div class="project-dialog-body project-wizard-body">${state.error ? `<p class="project-dialog-error" role="alert">${esc(state.error)}</p>` : ""}${content}</div><footer class="project-dialog-footer project-wizard-actions"><button class="secondary" id="projectWizardBackButton" type="button" ${ui.busy ? "disabled" : ""}>${state.step === 1 ? "Back to projects" : "Back"}</button><button class="primary" id="projectWizardContinueButton" type="submit" ${ui.busy ? "disabled" : ""}>${ui.busy ? "Connecting…" : state.step === 2 ? ["local-file", "google-drive"].includes(state.provider) && state.sourceAction === "existing" ? "Open project" : "Create project" : "Continue"}</button></footer></form>`;
}

function externalSourceFields(state) {
  const drive = state.provider === "google-drive";
  return `<section class="project-server-fields" aria-label="${drive ? "Drive" : "Linked file"} source"><fieldset class="project-server-action"><legend>Workspace file</legend>${choice("sourceAction", "create", "Create new file", "Start with an empty simple workspace.", state.sourceAction)}${choice("sourceAction", "existing", "Open existing file", "Keep the file's existing workspace and settings.", state.sourceAction)}</fieldset>${drive ? `${state.sourceAction === "existing" ? `<label><span id="projectDriveFileLinkLabel">Drive file link or ID${state.drivePickerAvailable ? " (optional)" : ""}</span><input aria-labelledby="projectDriveFileLinkLabel" aria-describedby="projectDriveFileLinkHint" id="projectDriveFileLink" value="${esc(state.driveFileLink)}" placeholder="https://drive.google.com/file/d/…/view"><small id="projectDriveFileLinkHint">${state.drivePickerAvailable ? "Leave blank to choose your file in Google Picker." : "Paste the link to the PM OS workspace file you want to open."}</small></label>` : `<label><span id="projectDriveFolderLabel">Drive folder</span><input aria-labelledby="projectDriveFolderLabel" aria-describedby="projectDriveFolderHint" id="projectDriveFolderName" value="${esc(state.driveFolderName)}"><small id="projectDriveFolderHint">The new file uses your project name. Existing files will never be replaced.</small></label>`}<details class="source-advanced" ${state.driveClientId ? "" : "open"}><summary>Google connection settings</summary><label><span id="projectDriveClientLabel">Google client ID</span><input aria-labelledby="projectDriveClientLabel" aria-describedby="projectDriveClientHint" id="projectDriveClientId" value="${esc(state.driveClientId)}"><small id="projectDriveClientHint">Use the Google client ID configured for this installation.</small></label></details><p class="field-note">Google will ask you to connect when you continue. The current project stays open until the file is ready.</p>` : `<p class="field-note">Choose a file on your device when you continue. No project is added if you cancel or the file cannot be opened.</p>`}</section>`;
}

function serverFields(ui) {
  const state = ui.wizard;
  const saved = ui.connectors.map((entry) => `<option value="${esc(entry.id)}" ${state.connectorId === entry.id ? "selected" : ""}>${esc(entry.label)}</option>`).join("");
  const workspaces = state.serverWorkspaces.map((entry) => `<option value="${esc(entry.id)}" ${state.serverWorkspaceId === entry.id ? "selected" : ""}>${esc(entry.name)} · ${esc(titleCase(entry.role))}</option>`).join("");
  const selected = ui.connectors.find((entry) => entry.id === state.connectorId);
  return `<section class="project-server-fields" aria-label="Server source"><label><span>Connection</span><select id="serverConnectorChoice" name="connectorId"><option value="">New connection</option>${saved}</select></label>${selected ? "" : `<div class="project-server-connection"><label><span>Connection name</span><input id="serverConnectorLabel" name="connectorLabel" value="${esc(state.connectorLabel)}" maxlength="160"></label><label><span>Server type</span><select id="serverConnectorMode" name="connectorMode"><option value="remote" ${state.connectorMode === "remote" ? "selected" : ""}>Remote server</option><option value="personal-local" ${state.connectorMode === "personal-local" ? "selected" : ""}>Local server</option></select></label><label><span>Project URL</span><input id="serverConnectorUrl" name="connectorUrl" value="${esc(state.connectorUrl)}" inputmode="url"></label><label><span>Publishable key</span><input id="serverConnectorKey" name="connectorKey" value="${esc(state.connectorKey)}"></label><label class="project-server-check"><input id="serverPersistSession" name="persistSession" type="checkbox" ${state.persistSession ? "checked" : ""}> Keep me signed in on this device</label></div>`}<fieldset class="project-server-action"><legend>Workspace</legend>${choice("serverAction", "create", "Create new", "Start an empty simple project.", state.serverAction)}${choice("serverAction", "existing", "Open existing", "Choose an authorized workspace.", state.serverAction)}</fieldset>${state.serverAction === "existing" ? `<label><span>Workspace</span><select id="serverWorkspaceChoice" name="serverWorkspaceId"><option value="">${workspaces ? "Choose a workspace" : "Connect to load workspaces"}</option>${workspaces}</select></label>` : ""}</section>`;
}

function manager(ui) {
  const active = ui.registry.projects.filter((entry) => !entry.archivedAt);
  const archived = ui.registry.projects.filter((entry) => entry.archivedAt);
  const connectors = ui.connectors.map((entry) => `<div class="project-manage-row"><span class="project-avatar" aria-hidden="true">S</span><span><strong>${esc(entry.label)}</strong><small>${entry.mode === "personal-local" ? "Local server" : "Remote server"}</small></span><div class="project-manage-actions"><button class="secondary" data-signout-connector="${esc(entry.id)}" type="button">Sign out</button><button class="danger" data-remove-connector="${esc(entry.id)}" type="button">Remove</button></div></div>`).join("");
  return `<div class="project-dialog-shell"><header class="project-dialog-header"><div><p class="panel-kicker">Project settings</p><h2 id="projectSwitcherTitle">Manage projects</h2><p>Archive projects you no longer need in quick switching.</p></div><button class="icon-button project-dialog-close" id="closeProjectSwitcherButton" type="button" aria-label="Close project management">Close</button></header><div class="project-dialog-body project-manager">${alerts(ui)}<section><div class="project-section-heading"><h3>Active</h3><span>${active.length}</span></div>${active.map((entry) => manageRow(ui, entry, false)).join("")}</section><section><div class="project-section-heading"><h3>Archived</h3><span>${archived.length}</span></div>${archived.map((entry) => manageRow(ui, entry, true)).join("") || `<p class="muted">No archived projects.</p>`}</section><section><div class="project-section-heading"><h3>Server connections</h3><span>${ui.connectors.length}</span></div>${connectors || `<p class="muted">Add a server connection when creating a project.</p>`}</section></div><footer class="project-dialog-footer"><button class="secondary" id="backToProjectSwitcherButton" type="button">Back to projects</button></footer></div>`;
}

function manageRow(ui, entry, archived) {
  const server = entry.provider === "server";
  return `<div class="project-manage-row ${archived ? "is-archived" : ""}"><span class="project-avatar" aria-hidden="true">${esc(initials(entry.name))}</span><span><strong>${esc(entry.name)}</strong><small>${esc(server ? connectorLabel(ui, entry.connectorId) : projectProviderLabel(entry.provider))} · ${archived ? "Archived" : entry.id === ui.registry.activeProjectId ? "Current" : server && entry.serverStatus === "sign-in-required" ? "Sign in required" : "Available"}</small></span><div class="project-manage-actions">${archived ? `<button class="secondary" data-unarchive-project="${esc(entry.id)}" type="button">Unarchive</button><button class="danger" data-forget-project="${esc(entry.id)}" type="button">${server ? "Delete from server" : "Forget local data"}</button>${entry.provider === "google-drive" ? `<button class="danger" data-delete-drive-project="${esc(entry.id)}" type="button">Delete from Drive</button>` : ""}` : `<button class="secondary" data-rename-project="${esc(entry.id)}" type="button" ${server && entry.serverRole !== "owner" ? 'disabled title="Only an owner can rename this server project."' : ""}>Rename</button><button class="secondary" data-archive-project="${esc(entry.id)}" type="button">Archive</button>`}</div></div>`;
}

function renameDialog(ui) {
  const project = projectById(ui.registry, ui.renameProjectId);
  const server = project?.provider === "server";
  return `<div class="project-dialog-shell"><form id="renameProjectForm" novalidate><header class="project-dialog-header"><div><p class="panel-kicker">${server ? "Server project" : "Project label"}</p><h2 id="projectSwitcherTitle">Rename project</h2><p>${server ? "This changes the workspace name for every member." : "This changes the name shown on this device."}</p></div></header><div class="project-dialog-body"><label class="project-name-field"><span>Project name</span><input id="renameProjectName" name="name" maxlength="160" value="${esc(project?.name || "")}" autocomplete="off"></label>${alerts(ui)}</div><footer class="project-dialog-footer project-confirm-actions"><button class="secondary" id="cancelRenameProjectButton" type="button">Cancel</button><button class="primary" type="submit" ${ui.busy ? "disabled" : ""}>Save name</button></footer></form></div>`;
}

function archiveDialog(ui) {
  const project = projectById(ui.registry, ui.archiveProjectId);
  return `<dialog class="project-prototype-dialog project-confirm-dialog" id="projectArchiveDialog" aria-labelledby="projectArchiveTitle"><div class="project-dialog-shell"><header class="project-dialog-header"><div><p class="panel-kicker">Archive project</p><h2 id="projectArchiveTitle" tabindex="-1">Archive ${esc(project?.name || "this project")}?</h2><p>It will be hidden from quick switching on this device. Its workspace and source remain intact.</p></div></header><footer class="project-dialog-footer project-confirm-actions"><button class="secondary" id="cancelProjectArchiveButton" type="button">Cancel</button><button class="primary" id="confirmProjectArchiveButton" type="button">Archive project</button></footer></div></dialog>`;
}

function deleteDialog(ui) {
  const project = projectById(ui.registry, ui.deleteProjectId);
  const server = project?.provider === "server";
  const drive = ui.deleteRemoteDrive && project?.provider === "google-drive";
  const remote = server || drive;
  const action = server ? "Delete from server" : drive ? "Delete from Drive" : "Forget local data";
  const exact = Boolean(project && ui.deleteName === project.name && ui.backupDownloaded);
  return `<div class="project-dialog-shell"><form id="forgetProjectForm" novalidate><header class="project-dialog-header"><div><p class="panel-kicker">${action}</p><h2 id="projectSwitcherTitle">${remote ? "Permanently delete" : "Forget"} ${esc(project?.name || "this project")}?</h2><p>${server ? "This permanently deletes the workspace for every member after a fresh authorized backup." : drive ? "This permanently deletes the saved workspace file from Google Drive for everyone who uses it. Download its latest contents before confirming." : project?.provider === "local-file" ? "This removes the cached workspace and recovery snapshots from this browser. The original linked file stays on disk; delete it in your operating system if needed." : "This removes its cached workspace, sync history, and recovery snapshots from this browser. Its external source remains intact."}</p></div></header><div class="project-dialog-body"><div class="project-delete-safety"><button class="secondary" id="downloadProjectBackupButton" type="button" ${ui.busy ? "disabled" : ""}>${ui.backupDownloaded ? "Fresh backup downloaded" : "Download fresh backup"}</button><p>${ui.backupDownloaded ? remote ? "The backed-up version will be checked again before deletion." : "Your backup is ready for confirmation." : drive ? "Connect to Google to download a fresh backup of this archived project\'s saved file." : server ? "Authorization, ownership, and the current revision will be checked first." : "Download the last cached workspace before continuing."}</p></div><label class="project-name-field"><span>Type ${esc(project?.name || "the project name")} to confirm</span><input id="forgetProjectName" value="${esc(ui.deleteName)}" autocomplete="off" ${ui.busy ? "disabled" : ""}></label>${alerts(ui)}</div><footer class="project-dialog-footer project-confirm-actions"><button class="secondary" id="cancelForgetProjectButton" type="button" ${ui.busy ? "disabled" : ""}>Cancel</button><button class="danger" id="confirmForgetProjectButton" type="submit" ${exact && !ui.busy ? "" : "disabled"}>${action}</button></footer></form></div>`;
}

function serverAuthDialog(ui) {
  const gate = ui.serverGate || {};
  return `<form class="project-dialog-shell" id="serverProjectAuthForm" novalidate><header class="project-dialog-header"><div><p class="panel-kicker">${gate.intent === "create" ? "Connect project" : "Reopen project"}</p><h2 id="projectSwitcherTitle">Sign in to ${esc(gate.connectorLabel || "the server")}</h2><p>${esc(gate.projectName || ui.wizard.name || "Your project")} will open only after this connection authorizes it.</p></div><button class="icon-button project-dialog-close" id="closeProjectSwitcherButton" type="button" aria-label="Close sign in">Close</button></header><div class="project-dialog-body project-server-auth">${alerts(ui)}<label><span>Email</span><input id="serverProjectEmail" name="email" type="email" value="${esc(gate.email || "")}" autocomplete="email" required></label>${gate.authMode === "password" ? `<label><span>Password</span><input id="serverProjectPassword" name="password" type="password" autocomplete="current-password" required></label>` : gate.codeSent ? `<label><span>Six-digit code</span><input id="serverProjectCode" name="code" inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" required></label>` : ""}</div><footer class="project-dialog-footer project-confirm-actions"><button class="secondary" id="cancelServerProjectAuthButton" type="button">Cancel</button>${gate.authMode === "password" && gate.allowLocalAccount ? `<button class="secondary" name="action" value="create-local-account" type="submit" ${ui.busy ? "disabled" : ""}>Create local account</button>` : ""}<button class="primary" type="submit" ${ui.busy ? "disabled" : ""}>${gate.authMode === "password" ? "Sign in" : gate.codeSent ? "Verify code" : "Send code"}</button></footer></form>`;
}

function projectRow({ id, name, provider, detail, current, busy, attribute }) {
  return `<button class="project-option ${current ? "is-current" : ""}" ${attribute}="${esc(id)}" type="button" ${current || busy ? "disabled" : ""}${current ? ' aria-current="true"' : ""}><span class="project-avatar" aria-hidden="true">${esc(initials(name))}</span><span class="project-option-copy"><strong>${esc(name)}</strong><span>${esc(provider)} · ${esc(detail)}</span></span><span class="project-option-action">${busy ? "Opening…" : current ? "Current" : "Open"}</span></button>`;
}

function choice(group, value, label, description, selected, disabled = false) {
  return `<label class="prototype-choice-card ${selected === value ? "is-selected" : ""} ${disabled ? "is-disabled" : ""}"><input type="radio" name="${group}" value="${value}" ${selected === value ? "checked" : ""} ${disabled ? "disabled" : ""}><span><strong>${label}</strong></span><small>${description}</small></label>`;
}

function connectorLabel(ui, id) { return ui.connectors.find((entry) => entry.id === id)?.label || "Server"; }
function alerts(ui) { return `${ui.warning ? `<p class="project-dialog-error" role="alert">${esc(ui.warning)}</p>` : ""}${ui.error ? `<p class="project-dialog-error" role="alert">${esc(ui.error)}</p>` : ""}`; }
function matches(entry, needle) { return !needle || `${entry.name} ${entry.provider || ""} ${entry.role || ""} ${entry.serverRole || ""}`.toLowerCase().includes(needle); }
function initials(value) { return String(value || "P").split(/\s+/).filter(Boolean).slice(0, 2).map((entry) => entry[0]).join("").toUpperCase(); }
function titleCase(value) { return String(value || "").replace(/(^|[-\s])([a-z])/g, (_, start, letter) => `${start}${letter.toUpperCase()}`); }
function esc(value) { return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
