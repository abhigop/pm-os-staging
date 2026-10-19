import { activeProject, projectById, projectProviderLabel, recentProjects } from "./projects.js";
import { WORKSPACE_PRESETS, EXPERIENCE_CAPABILITIES } from "./experience.js";

export function newProjectWizardState({ driveClientId = "", drivePickerAvailable = false, managedConfig = null } = {}) {
  return {
    step: 1, name: "", onboarding: "guided", provider: "browser", error: "", managedConfig, connectorId: managedConfig ? "__managed__" : "", connectorMode: "remote",
    connectorLabel: "", connectorUrl: "", connectorKey: "", connectorAuthMode: "otp", persistSession: true, serverAction: managedConfig?.allowWorkspaceCreation === false ? "existing" : "create",
    serverWorkspaceId: "", serverWorkspaces: [], createAttemptId: "",
    sourceAction: "create", driveClientId, drivePickerAvailable, driveFileLink: "", driveFolderName: "PM OS"
  };
}

export function createProjectUiState(registry, { persistent = true, warning = "", connectors = [] } = {}) {
  return {
    registry, persistent, warning, connectors, surface: "closed", query: "", busy: false, error: "", status: "",
    pendingProjectId: "", returnFocusId: "projectSwitcherButton", renameProjectId: "", renameMutationId: "",
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
      : ui.surface === "server-auth" ? serverAuthDialog(ui) : switcher(ui, team, teamWorkspaces);
  return `${live}<dialog class="project-prototype-dialog" id="projectSwitcherDialog" aria-labelledby="projectSwitcherTitle">${body}</dialog>`;
}

function switcher(ui, team, teamWorkspaces) {
  const current = currentProjectDescriptor(ui, team);
  const needle = ui.query.trim().toLowerCase();
  const registered = recentProjects(ui.registry).filter((entry) => matches(entry, needle));
  const rows = registered.map((entry) => projectRow({
    id: entry.id, name: entry.name,
    provider: entry.provider === "server" ? connectorLabel(ui, entry.connectorId) : projectProviderLabel(entry.provider),
    detail: entry.provider === "browser" ? "Saved locally" : entry.provider === "local-file" ? "Linked file"
      : entry.provider === "google-drive" ? "Reconnect to sync" : `${titleCase(entry.serverRole)} · ${entry.serverStatus === "sign-in-required" ? "Sign in required" : entry.serverStatus === "unavailable" ? "Access unavailable" : "Server project"}`,
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
  if (ui.wizard.firstRun) return onboardingWizard(ui, linkedFileAvailable);
  const state = ui.wizard;
  const content = state.step === 1
    ? `<label class="project-name-field"><span>Project name</span><input id="projectName" name="name" maxlength="160" value="${esc(state.name)}" placeholder="e.g. Pricing redesign" autocomplete="off"></label><fieldset class="prototype-choice-grid"><legend>How would you like to start?</legend>${choice("onboarding", "guided", "Guided start", "An empty workspace with a getting started checklist.", state.onboarding)}${choice("onboarding", "blank", "Start blank", "An empty workspace without the checklist.", state.onboarding)}</fieldset><p class="field-note">Both use the same simple workspace. Opening an existing source keeps its workspace and settings.</p>`
    : `<fieldset class="prototype-choice-grid"><legend>Choose where this project lives</legend>${choice("provider", "browser", "Browser", "Saved privately in this browser.", state.provider)}${choice("provider", "local-file", "Linked file", linkedFileAvailable ? "Create or open a portable workspace file." : "Unavailable in this browser.", state.provider, !linkedFileAvailable)}${choice("provider", "google-drive", "Google Drive", "Connect and create or open a workspace file.", state.provider)}${choice("provider", "server", "Server", "Create or open a workspace on a saved connection.", state.provider)}</fieldset>${state.provider === "server" ? serverFields(ui) : ["local-file", "google-drive"].includes(state.provider) ? externalSourceFields(state) : ""}`;
  return `<form class="project-dialog-shell" id="projectWizardForm" novalidate><header class="project-dialog-header"><div><p class="panel-kicker">New project · Step ${state.step} of 2</p><h2 id="projectSwitcherTitle">${state.step === 1 ? "Name the project" : "Choose where to save"}</h2><p>${state.step === 2 ? "Choose where to save this project." : "Create a separate PM workspace."}</p></div><button class="icon-button project-dialog-close" id="closeProjectSwitcherButton" type="button" aria-label="Close new project wizard">Close</button></header><ol class="project-wizard-progress" aria-label="Project setup progress"><li class="active">Name</li><li class="${state.step >= 2 ? "active" : ""}">Source</li></ol><div class="project-dialog-body project-wizard-body">${state.error ? `<p class="project-dialog-error" role="alert">${esc(state.error)}</p>` : ""}${content}</div><footer class="project-dialog-footer project-wizard-actions"><button class="secondary" id="projectWizardBackButton" type="button" ${ui.busy ? "disabled" : ""}>${state.step === 1 ? "Back to projects" : "Back"}</button><button class="primary" id="projectWizardContinueButton" type="submit" ${ui.busy ? "disabled" : ""}>${ui.busy ? "Connecting…" : state.step === 2 ? ((state.provider === "server" && state.serverAction === "existing") || (["local-file", "google-drive"].includes(state.provider) && state.sourceAction === "existing")) ? "Open project" : "Create project" : "Continue"}</button></footer></form>`;
}

function externalSourceFields(state) {
  const drive = state.provider === "google-drive";
  return `<section class="project-server-fields" aria-label="${drive ? "Drive" : "Linked file"} source"><fieldset class="project-server-action"><legend>Workspace file</legend>${choice("sourceAction", "create", "Create new file", "Start with an empty simple workspace.", state.sourceAction)}${choice("sourceAction", "existing", "Open existing file", "Keep the file's existing workspace and settings.", state.sourceAction)}</fieldset>${drive ? `${state.sourceAction === "existing" ? `<label><span id="projectDriveFileLinkLabel">Drive file link or ID${state.drivePickerAvailable ? " (optional)" : ""}</span><input aria-labelledby="projectDriveFileLinkLabel" aria-describedby="projectDriveFileLinkHint" id="projectDriveFileLink" value="${esc(state.driveFileLink)}" placeholder="https://drive.google.com/file/d/…/view"><small id="projectDriveFileLinkHint">${state.drivePickerAvailable ? "Leave blank to choose your file in Google Picker." : "Paste the link to the PM OS workspace file you want to open."}</small></label>` : `<label><span id="projectDriveFolderLabel">Drive folder</span><input aria-labelledby="projectDriveFolderLabel" aria-describedby="projectDriveFolderHint" id="projectDriveFolderName" value="${esc(state.driveFolderName)}"><small id="projectDriveFolderHint">The new file uses your project name. Existing files will never be replaced.</small></label>`}<details class="source-advanced" ${state.driveClientId ? "" : "open"}><summary>Google connection settings</summary><label><span id="projectDriveClientLabel">Google client ID</span><input aria-labelledby="projectDriveClientLabel" aria-describedby="projectDriveClientHint" id="projectDriveClientId" value="${esc(state.driveClientId)}"><small id="projectDriveClientHint">Use the Google client ID configured for this installation.</small></label></details><p class="field-note">Google will ask you to connect when you continue. The current project stays open until the file is ready.</p>` : `<p class="field-note">Choose a file on your device when you continue. No project is added if you cancel or the file cannot be opened.</p>`}</section>`;
}

function onboardingWizard(ui, linkedFileAvailable) {
  const state = ui.wizard;
  const titles = { 1: "Set up your workspace", 2: "Choose where your work is saved", 3: "Your workspace is ready" };
  let content;
  if (state.step === 1) {
    content = `<label class="project-name-field"><span>Workspace name</span><input id="projectName" name="name" maxlength="160" value="${esc(state.name)}" autocomplete="off" placeholder="e.g. Product planning" required></label>
      <fieldset class="prototype-choice-grid"><legend>How would you like to start?</legend>
        ${choice("entryMode", "blank", "Start blank", "An empty workspace with no sample records.", state.entryMode)}
        ${choice("entryMode", "import", "Import existing work", "Open a backup, linked file, Drive file, or Team workspace.", state.entryMode)}
        ${choice("entryMode", "template", "Use a template", "Start empty with useful workflows selected for you.", state.entryMode)}
      </fieldset>${state.entryMode === "template" ? `<label><span>Workspace template</span><select id="onboardingPreset" name="presetId">${WORKSPACE_PRESETS.map(p => `<option value="${p.id}" ${p.id === state.presetId ? "selected" : ""}>${esc(p.label)}</option>`).join("")}</select></label><p class="field-note">${esc(WORKSPACE_PRESETS.find(p => p.id === state.presetId)?.description || "")}</p>${state.presetId === "custom" ? `<fieldset class="onboarding-custom"><legend>Choose supporting workflows</legend>${EXPERIENCE_CAPABILITIES.map(c => `<label><input type="checkbox" data-onboarding-capability="${c.id}" ${state.customCapabilities.includes(c.id) ? "checked" : ""}><span>${esc(c.label)}</span></label>`).join("")}</fieldset>` : ""}<p class="field-note">Templates choose tools, not permissions. Team access is assigned by its owner.</p>` : ""}`;
  } else if (state.step === 2) {
    content = `<fieldset class="prototype-choice-grid"><legend>Save location</legend>
      ${choice("provider", "browser", "Only on this device", "Private in this browser. Download backups to keep a separate copy.", state.provider)}
      ${choice("provider", "local-file", "Workspace file", linkedFileAvailable ? "Choose a file on this device. Changes save back to that file." : "Linked-file autosave is unavailable in this browser. Save on this device and download backups instead.", state.provider, !linkedFileAvailable)}
      ${choice("provider", "google-drive", "Google Drive", "Keep a portable workspace file in your Google account.", state.provider)}
      ${choice("provider", "server", "Team collaboration", "Sign in to a configured server and work with colleagues.", state.provider)}
      </fieldset>${state.provider === "browser" && state.entryMode === "import" ? `<label><span>Workspace backup (JSON)</span><input id="onboardingImportFile" type="file" accept=".json,application/json"></label><p class="field-note">${esc(state.importName ? `Selected ${state.importName}. It will be checked before any project is created.` : "Choose a complete PM OS JSON backup. Your existing work stays unchanged.")}</p>` : ""}
      ${state.provider === "server" ? serverFields(ui) : ["local-file", "google-drive"].includes(state.provider) ? externalSourceFields(state) : ""}
      ${state.provider === "server" ? `<p class="field-note">Team owners can invite colleagues from Settings after connecting. Your role controls whether you can edit.</p>` : ""}`;
  } else {
    content = `<p role="status">${esc(state.readySummary)}</p><p>${esc(state.readySharing)}</p><p>${state.readyCanCreate ? "Create your first initiative and give it a clear next step. You can also open your workspace and add work later." : "Your viewer access lets you inspect and share work. Ask a Team owner for editor access to make changes."}</p>`;
  }
  return `<form class="project-dialog-shell" id="projectWizardForm" novalidate><header class="project-dialog-header"><div><p class="panel-kicker">Workspace setup · Step ${state.step} of 3</p><h2 id="projectSwitcherTitle">${titles[state.step]}</h2><p>Name your workspace, choose a starting point and storage, then add your first initiative.</p></div></header>
    <ol class="project-wizard-progress" aria-label="Workspace setup progress"><li class="active" ${state.step === 1 ? 'aria-current="step"' : ""}>Name and start</li><li class="${state.step >= 2 ? "active" : ""}" ${state.step === 2 ? 'aria-current="step"' : ""}>Storage</li><li class="${state.step === 3 ? "active" : ""}" ${state.step === 3 ? 'aria-current="step"' : ""}>First initiative</li></ol>
    <div class="project-dialog-body project-wizard-body">${state.error ? `<p class="project-dialog-error" role="alert">${esc(state.error)}</p>` : ""}${content}</div>
    <footer class="project-dialog-footer project-wizard-actions">${state.step === 1 ? `<button class="secondary" id="onboardingDemoButton" type="button">Explore with sample data</button>` : `<button class="secondary" id="projectWizardBackButton" type="button" ${ui.busy ? "disabled" : ""}>${state.step === 3 ? "Open workspace" : "Back"}</button>`}<button class="primary" id="projectWizardContinueButton" type="submit" ${ui.busy ? "disabled" : ""}>${ui.busy ? "Preparing workspace…" : state.step === 1 ? "Continue" : state.step === 2 ? (state.provider === "server" ? state.serverAction === "existing" : state.entryMode === "import") ? "Open workspace" : "Create workspace" : state.readyCanCreate ? "Create first initiative" : "Open workspace"}</button></footer></form>`;
}

export function projectWizardConnection(ui) {
  return ui.wizard.connectorId === "__managed__" ? ui.wizard.managedConfig
    : ui.connectors.find(entry => entry.id === ui.wizard.connectorId) || null;
}

function serverFields(ui) {
  const state = ui.wizard;
  const saved = ui.connectors.map((entry) => `<option value="${esc(entry.id)}" ${state.connectorId === entry.id ? "selected" : ""}>${esc(entry.label)}</option>`).join("");
  const workspaces = state.serverWorkspaces.map((entry) => `<option value="${esc(entry.id)}" ${state.serverWorkspaceId === entry.id ? "selected" : ""}>${esc(entry.name)} · ${esc(titleCase(entry.role))}</option>`).join("");
  const selected = projectWizardConnection(ui);
  return `<section class="project-server-fields" aria-label="Server connection"><label><span>Connection</span><select id="serverConnectorChoice" name="connectorId"><option value="" ${state.connectorId === "" ? "selected" : ""}>Enter another server’s details</option>${state.managedConfig ? `<option value="__managed__" ${state.connectorId === "__managed__" ? "selected" : ""}>${esc(state.managedConfig.label)} (configured)</option>` : ""}${saved}</select></label>${selected ? `<p class="field-note">${esc(selected.label)} is ready to connect with ${selected.authMode === "password" ? "password" : "email code"} sign-in. Sign in with your account to ${selected.allowWorkspaceCreation === false ? "open an existing workspace. Workspace creation is disabled on this connection." : "create or open a workspace."}</p>` : `<div class="project-server-connection"><label><span>Connection name</span><input id="serverConnectorLabel" name="connectorLabel" value="${esc(state.connectorLabel)}" maxlength="160"></label><label><span>Server type</span><select id="serverConnectorMode" name="connectorMode"><option value="remote" ${state.connectorMode === "remote" ? "selected" : ""}>Remote server</option><option value="personal-local" ${state.connectorMode === "personal-local" ? "selected" : ""}>Local server</option></select></label>${state.connectorMode === "remote" ? `<label><span>Sign-in method</span><select id="serverConnectorAuthMode" name="connectorAuthMode" aria-describedby="projectServerAuthHelp"><option value="otp" ${state.connectorAuthMode !== "password" ? "selected" : ""}>Email code</option><option value="password" ${state.connectorAuthMode === "password" ? "selected" : ""}>Password</option></select></label><p class="muted" id="projectServerAuthHelp">Choose Email code if your server sends a numeric sign-in code, or Password if your account already has one.</p>` : ""}<label><span>Server address</span><input id="serverConnectorUrl" name="connectorUrl" aria-describedby="projectServerAddressHelp" value="${esc(state.connectorUrl)}" inputmode="url"></label><label><span>Public connection key</span><input id="serverConnectorKey" name="connectorKey" aria-describedby="projectServerKeyHelp" value="${esc(state.connectorKey)}"></label><p class="muted" id="projectServerAddressHelp">Supabase provides Team sign-in and shared storage. Ask your administrator for its server address (Project URL).</p><p class="muted" id="projectServerKeyHelp">Use the Supabase publishable or legacy anon key supplied by your administrator. This public key connects the app; your sign-in controls access. Never enter a secret or service-role key.</p><label class="project-server-check"><input id="serverPersistSession" name="persistSession" type="checkbox" ${state.persistSession ? "checked" : ""}> Keep me signed in on this device</label></div>`}<fieldset class="project-server-action"><legend>Workspace</legend>${choice("serverAction", "create", "Create new", "Start an empty simple project.", state.serverAction, selected?.allowWorkspaceCreation === false)}${choice("serverAction", "existing", "Open existing", "Choose an authorized workspace.", state.serverAction)}</fieldset>${state.serverAction === "existing" ? `<label><span>Workspace</span><select id="serverWorkspaceChoice" name="serverWorkspaceId"><option value="">${workspaces ? "Choose a workspace" : "Connect to load workspaces"}</option>${workspaces}</select></label>` : ""}</section>`;
}

function manager(ui) {
  const active = ui.registry.projects.filter((entry) => !entry.archivedAt);
  const archived = ui.registry.projects.filter((entry) => entry.archivedAt);
  const connectors = ui.connectors.map((entry) => `<div class="project-manage-row"><span class="project-avatar" aria-hidden="true">S</span><span><strong>${esc(entry.label)}</strong><small>${entry.mode === "personal-local" ? "Local server" : "Remote server"} · ${entry.authMode === "password" ? "Password" : "Email code"} sign-in</small></span><div class="project-manage-actions"><button class="secondary" data-signout-connector="${esc(entry.id)}" type="button">Sign out</button><button class="danger" data-remove-connector="${esc(entry.id)}" type="button">Remove</button></div></div>`).join("");
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
  const needsFallback = project?.id === ui.registry.activeProjectId && !ui.registry.projects.some((entry) => entry.id !== project.id && !entry.archivedAt && entry.provider !== "server");
  return `<dialog class="project-prototype-dialog project-confirm-dialog" id="projectArchiveDialog" aria-labelledby="projectArchiveTitle"><div class="project-dialog-shell"><header class="project-dialog-header"><div><p class="panel-kicker">Archive project</p><h2 id="projectArchiveTitle" tabindex="-1">Archive ${esc(project?.name || "this project")}?</h2><p>It will be hidden from quick switching on this device. Its workspace and source remain intact.${needsFallback ? " A new blank project will open so you can keep working." : ""}</p></div></header><footer class="project-dialog-footer project-confirm-actions"><button class="secondary" id="cancelProjectArchiveButton" type="button" ${ui.busy ? "disabled" : ""}>Cancel</button><button class="primary" id="confirmProjectArchiveButton" type="button" ${ui.busy ? "disabled" : ""}>${ui.busy ? "Opening another project…" : "Archive project"}</button></footer></div></dialog>`;
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
  return `<form class="project-dialog-shell" id="serverProjectAuthForm" novalidate><header class="project-dialog-header"><div><p class="panel-kicker">${gate.intent === "create" ? "Connect project" : "Reopen project"}</p><h2 id="projectSwitcherTitle">Sign in to ${esc(gate.connectorLabel || "the server")}</h2><p>${esc(gate.projectName || ui.wizard.name || "Your project")} will open only after this connection authorizes it.</p></div><button class="icon-button project-dialog-close" id="closeProjectSwitcherButton" type="button" aria-label="Close sign in">Close</button></header><div class="project-dialog-body project-server-auth">${alerts(ui)}<label><span>Email</span><input id="serverProjectEmail" name="email" type="email" value="${esc(gate.email || "")}" autocomplete="email" required></label>${gate.authMode === "password" ? `<label><span>Password</span><input id="serverProjectPassword" name="password" type="password" autocomplete="current-password" required></label>` : gate.codeSent ? `<label><span>Six-digit code</span><input id="serverProjectCode" name="code" inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" required></label>` : ""}</div><footer class="project-dialog-footer project-confirm-actions"><button class="secondary" id="cancelServerProjectAuthButton" type="button">Cancel</button>${gate.authMode === "password" && gate.allowLocalAccount ? `<button class="secondary" name="action" value="create-local-account" type="submit" ${ui.busy ? "disabled" : ""}>Create local account</button>` : ""}${gate.authMode === "password" && gate.allowEmailCode ? `<button class="secondary" id="serverProjectUseEmailCode" type="button" ${ui.busy ? "disabled" : ""}>Use an email code</button>` : ""}<button class="primary" type="submit" ${ui.busy ? "disabled" : ""}>${gate.authMode === "password" ? "Sign in" : gate.codeSent ? "Verify code" : "Send code"}</button></footer></form>`;
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
