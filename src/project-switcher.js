import { activeProject, projectById, projectProviderLabel } from "./projects.js";

export function createProjectUiState(registry, { persistent = true, warning = "" } = {}) {
  return {
    registry,
    persistent,
    warning,
    surface: "closed",
    query: "",
    busy: false,
    error: "",
    status: "",
    pendingProjectId: "",
    returnFocusId: "projectSwitcherButton",
    renameProjectId: "",
    archiveProjectId: "",
    deleteProjectId: "",
    deleteName: "",
    backupDownloaded: false,
    wizard: { step: 1, name: "", provider: "browser", error: "" }
  };
}

export function currentProjectDescriptor(ui, team = null) {
  if (team?.active && team.workspace) return {
    id: `team:${team.workspace.id}`,
    name: team.workspace.name,
    provider: team.backendMode === "remote" ? "Team Server" : "Local Server",
    detail: `${titleCase(team.role || "viewer")} · ${team.connection === "live" ? "Live" : titleCase(team.connection || "offline")}`,
    tone: team.connection === "live" ? "" : "warning",
    team: true
  };
  const project = activeProject(ui?.registry);
  return project ? {
    id: project.id,
    name: project.name,
    provider: projectProviderLabel(project.provider),
    detail: project.provider === "browser" ? "Saved locally" : project.provider === "local-file" ? "Linked on this device" : "Cached locally",
    tone: "",
    team: false
  } : null;
}

export function projectSwitcherButtonMarkup(ui, { mobile = false, team = null, itemCount = 0 } = {}) {
  const current = currentProjectDescriptor(ui, team);
  if (!current) return "";
  const id = mobile ? "mobileProjectSwitcherButton" : "projectSwitcherButton";
  const classes = mobile ? "mobile-project-switcher" : "workspace-switcher workspace-switcher-button";
  const count = current.team ? current.detail : `${current.provider} · ${itemCount} initiative${itemCount === 1 ? "" : "s"}`;
  return `<button class="${classes}" id="${id}" type="button" aria-haspopup="dialog" aria-controls="projectSwitcherDialog"><span class="source-dot ${current.tone === "warning" ? "is-warning" : ""}" aria-hidden="true"></span><span class="project-trigger-copy"><strong>${escapeHtml(current.name)}</strong><span>${escapeHtml(count)}</span></span><span class="project-trigger-chevron" aria-hidden="true">⌄</span></button>`;
}

export function projectSwitcherMarkup(ui, { team = null, teamWorkspaces = [], linkedFileAvailable = false } = {}) {
  if (!ui) return "";
  const live = `<div class="project-prototype-toast ${ui.status ? "is-visible" : ""}" role="status" aria-live="polite" aria-atomic="true">${escapeHtml(ui.status)}</div>`;
  if (ui.surface === "closed") return live;
  if (ui.surface === "confirm-archive") return `${live}${archiveDialog(ui)}`;
  if (ui.surface === "rename") return `${live}${renameDialog(ui)}`;
  if (ui.surface === "delete") return `${live}${deleteDialog(ui)}`;
  const body = ui.surface === "wizard" ? wizard(ui, linkedFileAvailable)
    : ui.surface === "manage" ? manager(ui)
      : switcher(ui, team, teamWorkspaces);
  return `${live}<dialog class="project-prototype-dialog" id="projectSwitcherDialog" aria-labelledby="projectSwitcherTitle">${body}</dialog>`;
}

function switcher(ui, team, teamWorkspaces) {
  const current = currentProjectDescriptor(ui, team);
  const needle = ui.query.trim().toLowerCase();
  const local = ui.registry.projects.filter((entry) => !entry.archivedAt && matches(entry, needle));
  const remote = teamWorkspaces.filter((entry) => matches({ ...entry, provider: "Team Server" }, needle));
  const localRows = local.map((entry) => projectRow({
    id: entry.id,
    name: entry.name,
    provider: projectProviderLabel(entry.provider),
    detail: entry.provider === "browser" ? "Saved locally" : entry.provider === "local-file" ? "Linked file" : "Reconnect to sync",
    current: !team?.active && entry.id === ui.registry.activeProjectId,
    busy: ui.busy && ui.pendingProjectId === entry.id,
    attribute: "data-switch-project"
  })).join("");
  const remoteRows = remote.map((entry) => projectRow({
    id: entry.id,
    name: entry.name,
    provider: "Team Server",
    detail: `${titleCase(entry.role || "viewer")} · Session only`,
    current: Boolean(team?.active && team.workspace?.id === entry.id),
    busy: ui.busy && ui.pendingProjectId === `team:${entry.id}`,
    attribute: "data-switch-team-project"
  })).join("");
  const groups = `${localRows ? `<section class="project-palette-group"><h3>On this device</h3>${localRows}</section>` : ""}${remoteRows ? `<section class="project-palette-group"><h3>Team session</h3>${remoteRows}</section>` : ""}`;
  return `<div class="project-dialog-shell"><header class="project-dialog-header"><div><p class="panel-kicker">Projects</p><h2 id="projectSwitcherTitle">Switch project</h2><p>The current project stays open until another workspace is ready.</p></div><button class="icon-button project-dialog-close" id="closeProjectSwitcherButton" type="button" aria-label="Close project switcher">Close</button></header><div class="project-dialog-body"><label class="project-search"><span class="sr-only">Search projects</span><input id="projectSwitcherSearch" type="search" value="${escapeHtml(ui.query)}" placeholder="Search projects" autocomplete="off"></label>${ui.warning ? `<p class="project-dialog-error" role="alert">${escapeHtml(ui.warning)}</p>` : ""}${ui.error ? `<p class="project-dialog-error" role="alert">${escapeHtml(ui.error)}</p>` : ""}<div class="project-list" aria-label="Available projects">${groups || `<div class="project-empty-state"><strong>No projects match “${escapeHtml(ui.query)}”</strong><p>Clear the search or create a new local project.</p></div>`}</div></div><footer class="project-dialog-footer"><div><button class="primary" id="newProjectButton" type="button" ${ui.persistent ? "" : "disabled"}>New project</button><button class="secondary" id="manageProjectsButton" type="button" ${ui.persistent ? "" : "disabled"}>Manage projects</button></div><p><span class="source-dot" aria-hidden="true"></span>${escapeHtml(current?.name || "Current project")} remains open during switching.</p></footer></div>`;
}

function wizard(ui, linkedFileAvailable) {
  const state = ui.wizard;
  const content = state.step === 1
    ? `<label class="project-name-field"><span>Project name</span><input id="projectName" name="name" maxlength="160" value="${escapeHtml(state.name)}" placeholder="e.g. Pricing redesign" autocomplete="off"><small>This is a local label; it does not rename an external source.</small></label>`
    : `<fieldset class="prototype-choice-grid"><legend>Choose where this project lives</legend>${choice("provider", "browser", "Browser", "Saved privately in this browser.", state.provider)}${choice("provider", "local-file", "Linked file", linkedFileAvailable ? "Create a portable JSON workspace file." : "Unavailable in this browser.", state.provider, !linkedFileAvailable)}${choice("provider", "google-drive", "Google Drive", "Create the local project now, then connect its Drive file in Settings.", state.provider)}</fieldset><aside class="project-team-setup-note"><strong>Need a Team project?</strong><p>Connect Team Server in Settings. Authorized workspaces then appear here for this session without being written to browser storage.</p><button class="secondary" id="openTeamProjectSetupButton" type="button">Open Team setup</button></aside>`;
  return `<form class="project-dialog-shell" id="projectWizardForm" novalidate><header class="project-dialog-header"><div><p class="panel-kicker">New project · Step ${state.step} of 2</p><h2 id="projectSwitcherTitle">${state.step === 1 ? "Name the project" : "Choose a source"}</h2><p>${state.step === 2 ? "Choose where to save this project." : "Create a completely separate PM workspace."}</p></div><button class="icon-button project-dialog-close" id="closeProjectSwitcherButton" type="button" aria-label="Close new project wizard">Close</button></header><ol class="project-wizard-progress" aria-label="Project setup progress"><li class="active">Name</li><li class="${state.step >= 2 ? "active" : ""}">Source</li></ol><div class="project-dialog-body project-wizard-body">${state.error ? `<p class="project-dialog-error" role="alert">${escapeHtml(state.error)}</p>` : ""}${content}</div><footer class="project-dialog-footer project-wizard-actions"><button class="secondary" id="projectWizardBackButton" type="button">${state.step === 1 ? "Back to projects" : "Back"}</button><button class="primary" id="projectWizardContinueButton" type="submit">${state.step === 2 ? "Create project" : "Continue"}</button></footer></form>`;
}

function manager(ui) {
  const activeRows = ui.registry.projects.filter((entry) => !entry.archivedAt).map((entry) => `<div class="project-manage-row"><span class="project-avatar" aria-hidden="true">${escapeHtml(initials(entry.name))}</span><span><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(projectProviderLabel(entry.provider))} · ${entry.id === ui.registry.activeProjectId ? "Current" : "Available"}</small></span><div class="project-manage-actions"><button class="secondary" data-rename-project="${escapeHtml(entry.id)}" type="button">Rename</button><button class="secondary" data-archive-project="${escapeHtml(entry.id)}" type="button" ${entry.id === ui.registry.activeProjectId ? "disabled" : ""}>Archive</button></div></div>`).join("");
  const archivedRows = ui.registry.projects.filter((entry) => entry.archivedAt).map((entry) => `<div class="project-manage-row is-archived"><span class="project-avatar" aria-hidden="true">${escapeHtml(initials(entry.name))}</span><span><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(projectProviderLabel(entry.provider))} · Hidden on this device</small></span><div class="project-manage-actions"><button class="secondary" data-unarchive-project="${escapeHtml(entry.id)}" type="button">Unarchive</button><button class="danger" data-forget-project="${escapeHtml(entry.id)}" type="button">Forget local data</button></div></div>`).join("");
  return `<div class="project-dialog-shell"><header class="project-dialog-header"><div><p class="panel-kicker">Project settings</p><h2 id="projectSwitcherTitle">Manage projects</h2><p>Archiving only hides a project on this device. External files and services are never deleted.</p></div><button class="icon-button project-dialog-close" id="closeProjectSwitcherButton" type="button" aria-label="Close project management">Close</button></header><div class="project-dialog-body project-manager"><section><div class="project-section-heading"><h3>Active</h3><span>${ui.registry.projects.filter((entry) => !entry.archivedAt).length}</span></div>${activeRows}</section><section><div class="project-section-heading"><h3>Archived</h3><span>${ui.registry.projects.filter((entry) => entry.archivedAt).length}</span></div>${archivedRows || `<p class="muted">No archived projects.</p>`}</section></div><footer class="project-dialog-footer"><button class="secondary" id="backToProjectSwitcherButton" type="button">Back to projects</button></footer></div>`;
}

function renameDialog(ui) {
  const project = projectById(ui.registry, ui.renameProjectId);
  return `<div class="project-dialog-shell"><form id="renameProjectForm" novalidate><header class="project-dialog-header"><div><p class="panel-kicker">Local project label</p><h2 id="projectSwitcherTitle">Rename project</h2><p>This does not rename a linked file, Drive file, or Team workspace.</p></div></header><div class="project-dialog-body"><label class="project-name-field"><span>Project name</span><input id="renameProjectName" name="name" maxlength="160" value="${escapeHtml(project?.name || "")}" autocomplete="off"></label>${ui.error ? `<p class="project-dialog-error" role="alert">${escapeHtml(ui.error)}</p>` : ""}</div><footer class="project-dialog-footer project-confirm-actions"><button class="secondary" id="cancelRenameProjectButton" type="button">Cancel</button><button class="primary" type="submit">Save name</button></footer></form></div>`;
}

function archiveDialog(ui) {
  const project = projectById(ui.registry, ui.archiveProjectId);
  return `<dialog class="project-prototype-dialog project-confirm-dialog" id="projectArchiveDialog" aria-labelledby="projectArchiveTitle"><div class="project-dialog-shell"><header class="project-dialog-header"><div><p class="panel-kicker">Archive project</p><h2 id="projectArchiveTitle" tabindex="-1">Archive ${escapeHtml(project?.name || "this project")}?</h2><p>It will be hidden from quick switching on this device. Its workspace data and external source remain intact.</p></div></header><footer class="project-dialog-footer project-confirm-actions"><button class="secondary" id="cancelProjectArchiveButton" type="button">Cancel</button><button class="primary" id="confirmProjectArchiveButton" type="button">Archive project</button></footer></div></dialog>`;
}

function deleteDialog(ui) {
  const project = projectById(ui.registry, ui.deleteProjectId);
  const exact = Boolean(project && ui.deleteName === project.name && ui.backupDownloaded);
  return `<div class="project-dialog-shell"><form id="forgetProjectForm" novalidate><header class="project-dialog-header"><div><p class="panel-kicker">Forget local data</p><h2 id="projectSwitcherTitle">Forget ${escapeHtml(project?.name || "this project")}?</h2><p>This removes its cached workspace, sync history, and recovery snapshots from this browser only. No external source is deleted.</p></div></header><div class="project-dialog-body"><div class="project-delete-safety"><button class="secondary" id="downloadProjectBackupButton" type="button">${ui.backupDownloaded ? "Backup downloaded" : "Download backup"}</button><p>${ui.backupDownloaded ? "Backup download recorded for this confirmation." : "Download the last cached workspace before continuing."}</p></div><label class="project-name-field"><span>Type ${escapeHtml(project?.name || "the project name")} to confirm</span><input id="forgetProjectName" value="${escapeHtml(ui.deleteName)}" autocomplete="off"></label>${ui.error ? `<p class="project-dialog-error" role="alert">${escapeHtml(ui.error)}</p>` : ""}</div><footer class="project-dialog-footer project-confirm-actions"><button class="secondary" id="cancelForgetProjectButton" type="button">Cancel</button><button class="danger" id="confirmForgetProjectButton" type="submit" ${exact ? "" : "disabled"}>Forget local data</button></footer></form></div>`;
}

function projectRow({ id, name, provider, detail, current, busy, attribute }) {
  return `<button class="project-option ${current ? "is-current" : ""}" ${attribute}="${escapeHtml(id)}" type="button" ${current || busy ? "disabled" : ""}${current ? ' aria-current="true"' : ""}><span class="project-avatar" aria-hidden="true">${escapeHtml(initials(name))}</span><span class="project-option-copy"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(provider)} · ${escapeHtml(detail)}</span></span><span class="project-option-action">${busy ? "Opening…" : current ? "Current" : "Open"}</span></button>`;
}

function choice(group, value, label, description, selected, disabled = false) {
  return `<label class="prototype-choice-card ${selected === value ? "is-selected" : ""} ${disabled ? "is-disabled" : ""}"><input type="radio" name="${group}" value="${value}" ${selected === value ? "checked" : ""} ${disabled ? "disabled" : ""}><span><strong>${label}</strong></span><small>${description}</small></label>`;
}

function matches(entry, needle) {
  return !needle || `${entry.name} ${entry.provider || ""} ${entry.role || ""}`.toLowerCase().includes(needle);
}

function initials(value) {
  return String(value || "P").split(/\s+/).filter(Boolean).slice(0, 2).map((entry) => entry[0]).join("").toUpperCase();
}

function titleCase(value) {
  return String(value || "").replace(/(^|[-\s])([a-z])/g, (_, start, letter) => `${start}${letter.toUpperCase()}`);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}
