import { localDateStamp } from "./local-date.js";
import { parseInboundFile, buildInboundWorkspace } from "./inbound-import.js";
import { reviewInboundImport } from "./inbound-import-dialog.js";
import { APP_RELEASE } from "./release.js";
import { serviceWorkerUpdateSettingsMarkup } from "./service-worker-update.js?v=26";
import { recordDraftKey, recordDraftBaseline, recordDraftSaveError } from "./record-drafts.js";
import {
  buildActionMemo,
  buildActionQueue,
  isActionQueueEntryComplete,
  buildActivityDigest,
  describeActivityChanges,
  buildBacklogHygiene,
  buildCapacityPlan,
  buildCommunicationMemo,
  buildCommunicationPlan,
  buildDependencyMap,
  findDependencyCycles,
  rolloutReadinessGuidance,
  buildDependencyMemo,
  buildDeliveryBoard,
  buildDeliveryMemo,
  buildExecutiveBrief,
  buildExecutiveBriefMemo,
  buildEnablementMemo,
  buildEnablementPlan,
  buildEscalationBoard,
  buildEscalationMemo,
  buildFollowUps,
  buildGitHubIssueBundle,
  buildLaunchBoard,
  buildLaunchMemo,
  buildMeetingAgenda,
  buildMeetingAgendaMarkdown,
  buildMetricsMemo,
  buildMetricsPlan,
  buildOperatingCadence,
  buildProductSpec,
  buildProductSpecMarkdown,
  buildOutcomeAlignment,
  buildOutcomeMemo,
  buildOutcomeReport,
  buildPortfolioDashboard,
  buildPortfolioMemo,
  buildPeriodPlan,
  buildPeriodPlanMemo,
  buildReleaseNotes,
  buildReleasePlan,
  buildReviewLoop,
  buildReviewMemo,
  buildRetrospective,
  buildRetrospectiveMemo,
  buildRiskRegister,
  buildRolloutMemo,
  buildRolloutPlan,
  buildStakeholderMap,
  buildStakeholderGovernance,
  buildStakeholderMemo,
  buildStakeholderUpdate,
  buildTemplateDraft,
  buildWeeklyPlan,
  calculateHealth,
  formatOperationalScore,
  calculateLaunchReadiness,
  activeDependencies,
  activeRisks,
  createActivityEntry,
  createItem,
  dependencyUrgency,
  dependencyStatusLabels,
  effortLabels,
  executiveBriefLabels,
  exportCsv,
  exportWorkspace,
  importActivityLog,
  groupByStatus,
  importWorkspace,
  normalizeDependencyRecord,
  normalizeRiskRecord,
  pmTemplates,
  primaryRiskText,
  prioritizeItems,
  resolveRecordOwner,
  riskSeverityLabel,
  riskSeverityScore,
  riskStatusLabels,
  statusLabels,
  deleteItem,
  updateItem
} from "./domain.js";
import {
  addWorkspaceSnapshot,
  backupDownloadName,
  backupReasonLabel,
  backupReasons,
  loadWorkspaceSnapshots,
  restoreWorkspaceSnapshot,
  storeWorkspaceSnapshot,
  workspaceSnapshotDetails
} from "./backups.js";
import { requestNativeConfirmation, runExclusiveAsyncAction } from "./data.js";
import { createDemoCustomerDirectory } from "./demo-customers.js";
import {
  advanceDriveBaseline,
  chooseDriveWorkspaceFile,
  deletePreparedDriveWorkspace,
  driveConflictKind,
  driveFileFingerprint,
  driveFingerprintComplete,
  driveSourceReady,
  driveWorkspaceFileId,
  inspectDriveWorkspace,
  prepareDriveWorkspaceDeletion,
  readDriveWorkspace,
  requestDriveAccessToken,
  saveDriveConflictCopy,
  saveDriveWorkspace
} from "./drive.js";
import { runStorageTransaction, createStorageWriteScope, captureStorageValues, staleWorkspaceWriteError, forgetStorageWriteScope } from "./storage.js";
import {
  childrenOf,
  createPerson,
  createUnit,
  emptyOrganization,
  migrateLegacyOwners,
  moveUnit,
  normalizeOrganization,
  organizationWorkload,
  removePerson,
  removeUnit,
  rootUnits,
  unitPath,
  updatePerson,
  updateUnit
} from "./organization.js";
import {
  CustomerDirectoryError,
  applyCustomerCsvImport,
  createCustomerAccount,
  createCustomerField,
  createCustomerSegment,
  createCustomerTag,
  customerDirectoryStats,
  customerDisplayProjection,
  emptyCustomerDirectory,
  exportCustomerCsv,
  initiativeAudienceLabels,
  migrateLegacyCustomers,
  normalizeCustomerDirectory,
  previewCustomerCsv,
  removeCustomerAccount,
  removeCustomerField,
  removeCustomerSegment,
  removeCustomerTag,
  resolveInitiativeAudience,
  segmentMembers,
  updateCustomerAccount,
  updateCustomerField,
  updateCustomerSegment,
  updateCustomerTag
} from "./customers.js";
import {
  WORKSPACE_DOCUMENT_SCHEMA,
  createEmptyWorkspaceDocument,
  createWorkspaceDocument,
  decodeWorkspaceDocument,
  encodeWorkspaceDocument
} from "./workspace-document.js";
import {
  clearLinkedFileHandle,
  createLinkedWorkspaceFile,
  linkedFileSupported,
  loadLinkedFileHandle,
  openLinkedWorkspaceFile,
  queryLinkedFilePermission,
  readLinkedWorkspaceFile,
  requestLinkedFilePermission,
  storeLinkedFileHandle,
  writeLinkedWorkspaceFile
} from "./linked-workspace-file.js";
import { mergeWorkspaceDocuments, resolveWorkspaceConflicts } from "./workspace-merge.js";
import {
  WORKSPACE_SOURCE_SCHEMA,
  WORKSPACE_SYNC_SCHEMA,
  isBrowserSafeSupabaseKey,
  normalizeDriveRuntimeConfig,
  normalizeWorkspaceSource,
  resolveBackendRuntimeConfig
} from "./source-config.js";
import {
  EXPERIENCE_BUNDLES,
  EXPERIENCE_CAPABILITIES,
  WORKSPACE_PRESETS,
  workspaceExperienceForPreset,
  matchingWorkspacePreset,
  fullWorkspaceExperience,
  normalizeWorkspaceExperience,
  updateWorkspaceExperience,
  workspaceBundleState,
  workspaceCapabilityEnabled,
  workspaceExperienceProfile
} from "./experience.js";
import {
  INITIATIVE_STATUS_CATEGORIES,
  INITIATIVE_STATUS_COLORS,
  InitiativeWorkflowError,
  defaultInitiativeWorkflow,
  initiativeStatusUsage,
  initiativeReportingContext,
  workflowReportingNote,
  isTerminalInitiativeStatus,
  normalizeInitiativeWorkflow,
  statusForId,
  statusForInitiative,
  workflowStatusId
} from "./workflow.js";
import {
  BUILT_IN_PRIORITY_FRAMEWORKS,
  MAX_CUSTOM_PRIORITY_CRITERIA,
  MIN_CUSTOM_PRIORITY_CRITERIA,
  PRIORITY_METHODS,
  assertPriorityAssignments,
  customPriorityFrameworkId,
  defaultPrioritization,
  effectivePriorityFramework,
  filterItemsForBoardTeam,
  methodDefinition,
  normalizePrioritization,
  normalizePriorityInputs,
  prioritizeByFramework,
  prioritizeItems as prioritizeConfiguredItems,
  priorityDisplay,
  priorityFrameworkForId,
  priorityFrameworks,
  priorityScore
} from "./prioritization.js";
import {
  INSIGHT_STATUSES,
  INSIGHT_STATUS_LABELS,
  INSIGHT_TYPE_LABELS,
  ENABLEMENT_AREAS,
  SUPPORT_SEVERITIES,
  SUPPORT_SEVERITY_LABELS,
  VALIDATION_DECISIONS,
  VALIDATION_DECISION_LABELS,
  validationDecisionSummary,
  buildDiscoveryWorkspace,
  buildFeedbackWorkspace,
  buildInsightMemo,
  buildResearchWorkspace,
  buildSupportWorkspace,
  buildValidationWorkspace,
  createInsightRecord,
  deleteInsightRecord,
  filterInsightRecords,
  projectCanonicalInitiativeRecords,
  migrateLegacyWorkRecords,
  normalizeInsightRecord,
  updateInsightRecord
} from "./insights.js";
import {
  PlanningCalendarError,
  createPlanningCapacityPlan,
  resolvePlanningCapacity,
  describeInitiativeTimeline,
  emptyPlanningCalendar,
  filterItemsByPeriod,
  initiativeDateRange,
  normalizePlanningCalendar,
  normalizePeriodSelection,
  periodForDate,
  periodForSelection,
  periodSelectionLabel,
  periodSelectionRangeLabel,
  periodSelectionSlug,
  shiftPeriodSelection,
  updatePlanningCalendar as patchPlanningCalendar
} from "./planning-calendar.js";
import { planningCapacityMessage, capacityNumber, capacityFormDefaults, capacityDraftPreview, planningCapacityMarkup } from "./planning-capacity-ui.js";
import {
  allowedModes as policyAllowedModes,
  defaultSpaceMode as policyDefaultSpaceMode,
  enabledViewDefinitions as policyEnabledViewDefinitions,
  experienceHas as policyExperienceHas,
  nearestCoreView as policyNearestCoreView,
  periodRequestInvalid as policyPeriodRequestInvalid,
  shellParentView as policyShellParentView,
  simpleNavigationViewDefinitions as policySimpleNavigationViewDefinitions,
  viewLabel as policyViewLabel,
  visibleViewDefinition as policyVisibleViewDefinition
} from "./view-policy.js";
import {
  TUTORIAL_GROUPS,
  TUTORIAL_STORAGE_KEY,
  computeCoachmarkPlacement,
  loadTutorialProgress,
  saveTutorialProgress,
  tutorialGroupStatus,
  updateTutorialGroupProgress
} from "./tutorial.js";
import {
  PRIMARY_PROJECT_ID,
  activateProject as activateProjectRegistryEntry,
  activeProject as activeRegistryProject,
  bootstrapProjectRegistry,
  createProject as createRegistryProject,
  forgetProject as forgetRegistryProject,
  normalizeProjectRegistry,
  prepareProjectRename,
  normalizeProjectLocation,
  projectById as registryProjectById,
  projectKeys,
  projectsForConnector,
  readProjectBundle,
  readCurrentProjectRegistry,
  readWeeklyUpdateCopied,
  recentProjects,
  renameProject as renameRegistryProject,
  setProjectArchived,
  updateProjectMetadata,
  updateActiveProjectLocation,
  updateActiveProjectProvider
} from "./projects.js";
import {
  createProjectUiState,
  currentProjectDescriptor,
  newProjectWizardState,
  projectWizardConnection,
  projectSwitcherButtonMarkup,
  projectSwitcherMarkup
} from "./project-switcher.js";

import { DocumentComposer, buildWeeklyUpdateMarkdown } from "./document-composer.js";
import { createArtifactRecord, normalizeArtifactRecord } from "./artifacts.js";
const documentComposer = new DocumentComposer();
const planningCapacityDrafts = new Map();
const initiativeRecordDrafts = new Map();
const portfolioOpenRecommendations = new Set();

const legacyStorageKey = "pm-os-staging.workspace.v1";
const legacyActivityKey = "pm-os-staging.activity.v1";
const legacyBackupKey = "pm-os-staging.backups.v1";
const legacySourceKey = "pm-os-staging.source.v1";
const legacySyncKey = "pm-os-staging.sync.v1";
const usageKey = "pm-os-staging.usage.v2";
const themeKey = "pm-os-staging.ui-theme.v1";
const workspaceModeKey = "pm-os-staging.workspace-mode.v1";
const teamFactoryHook = "__PM_OS_TEAM_CLIENT_FACTORY__";
import { readTeamInvitationCallback, showTeamInvitation } from "./team-invitation.js";
const receivedTeamInvitation = readTeamInvitationCallback(globalThis);
const urlParams = new URLSearchParams(location.search);
const storedWorkspaceMode = loadWorkspaceModePreference();
const explicitDemoMode = urlParams.get("demo") === "1";
const demoMode = explicitDemoMode || (!urlParams.has("demo") && storedWorkspaceMode === "demo");
const serverConnectorRuntime = demoMode ? null : await import("./server-connectors.js?v=1");
const ServerConnectorClientPool = serverConnectorRuntime?.ServerConnectorClientPool;
const serverConnectorClientConfig = serverConnectorRuntime?.serverConnectorClientConfig;
const serverConnectorPool = demoMode ? null : new ServerConnectorClientPool({
  storage: localStorage,
  ...(typeof globalThis[teamFactoryHook] === "function" ? { createTeamClient: globalThis[teamFactoryHook] } : {})
});
const initialWorkspaceModeChoiceOpen = !storedWorkspaceMode
  && !urlParams.has("demo")
  && !urlParams.has("space")
  && !urlParams.has("view");
const initialProjectBootstrap = demoMode ? null : bootstrapProjectRegistry(localStorage);
let projectRegistry = initialProjectBootstrap?.registry || null;
const initialServerProjectId = !demoMode && registryProjectById(projectRegistry, urlParams.get("project"))?.provider === "server"
  ? urlParams.get("project")
  : activeRegistryProject(projectRegistry)?.provider === "server" ? projectRegistry.activeProjectId : "";
if (initialServerProjectId && activeRegistryProject(projectRegistry)?.provider === "server") {
  let fallback = projectRegistry.projects.find((entry) => !entry.archivedAt && entry.provider !== "server");
  if (!fallback) {
    const created = createBlankBrowserProject(projectRegistry);
    projectRegistry = created.registry;
    fallback = created.project;
  }
  projectRegistry = activateProjectRegistryEntry(localStorage, projectRegistry, fallback.id, activeRegistryProject(projectRegistry).location);
}
let activeProjectStorageKeys = (initialServerProjectId ? projectKeys(projectRegistry.activeProjectId) : initialProjectBootstrap?.keys) || existingOperationalProjectKeys() || {
  workspace: legacyStorageKey,
  activity: legacyActivityKey,
  source: "pm-os-staging.source.v2",
  sync: "pm-os-staging.sync.v2",
  backups: legacyBackupKey,
  checklist: "pm-os-staging.checklist.v1"
};
let storageKey = activeProjectStorageKeys.workspace;
let activityKey = activeProjectStorageKeys.activity;
let sourceKey = activeProjectStorageKeys.source;
let syncKey = activeProjectStorageKeys.sync;
let backupKey = activeProjectStorageKeys.backups;

function existingOperationalProjectKeys() {
  try {
    const registry = normalizeProjectRegistry(JSON.parse(localStorage.getItem("pm-os-staging.projects.v1") || "null"));
    return registry ? projectKeys(registry.activeProjectId) : null;
  } catch { return null; }
}
const demoTeamRole = demoMode && ["owner", "editor", "viewer"].includes(urlParams.get("teamRole")) ? urlParams.get("teamRole") : "";
const initialTutorialProgress = loadTutorialProgress(localStorage);

const LEGACY_VIEW_REDIRECTS = Object.freeze({
  command: ["today", "focus"], actions: ["today", "actions"],
  portfolio: ["initiatives", "portfolio"],
  discovery: ["insights", "discovery"], research: ["insights", "research"], validation: ["insights", "validation"],
  feedback: ["insights", "feedback"], support: ["insights", "support"], customers: ["insights", "customers"],
  planning: ["planning", "quarter"], roadmap: ["planning", "roadmap"], capacity: ["planning", "capacity"],
  outcomes: ["planning", "outcomes"], metrics: ["planning", "metrics"],
  delivery: ["delivery", "board"], dependencies: ["delivery", "dependencies"], rollouts: ["delivery", "readiness"],
  launch: ["delivery", "launch"], enablement: ["delivery", "enablement"],
  brief: ["briefings", "executive"], stakeholders: ["briefings", "stakeholders"], escalations: ["briefings", "escalations"],
  updates: ["briefings", "updates"], comms: ["briefings", "comms"], meetings: ["briefings", "meetings"],
  review: ["briefings", "review"], retros: ["briefings", "retros"], operations: ["briefings", "operations"],
  decisions: ["briefings", "decisions"], specs: ["briefings", "specs"], templates: ["briefings", "templates"],
  activity: ["settings", "activity"], data: ["settings", "data"], workflow: ["settings", "workflow"], calendar: ["settings", "calendar"], prioritization: ["settings", "prioritization"]
});
const VIEW_REGISTRY = Object.freeze([
  { id: "today", deepLink: "today", label: "Today", title: "Today", renderer: (context) => todaySpaceView(context), showSearch: true },
  { id: "initiatives", deepLink: "initiatives", label: "Initiatives", title: "Initiatives", renderer: (context) => initiativesSpaceView(context), showSearch: true },
  { id: "insights", deepLink: "insights", label: "Insights", title: "Insights", renderer: (context) => insightsSpaceView(context), showSearch: true },
  { id: "planning", deepLink: "planning", label: "Planning", title: "Planning", renderer: (context) => planningSpaceView(context), showSearch: true },
  { id: "delivery", deepLink: "delivery", label: "Delivery", title: "Delivery", renderer: (context) => deliverySpaceView(context), showSearch: true },
  { id: "briefings", deepLink: "briefings", label: "Briefings", title: "Briefings", renderer: (context) => briefingsSpaceView(context), showSearch: false },
  { id: "team", deepLink: "team", label: "Team", title: "Team", renderer: (context) => teamSpaceView(context), showSearch: false },
  { id: "settings", deepLink: "settings", label: "Settings", title: "Settings", renderer: () => settingsSpaceView(), showSearch: false }
].map((view) => Object.freeze(view)));
const viewByDeepLink = new Map(VIEW_REGISTRY.map((view) => [view.deepLink, view]));
const demoReferenceDate = new Date();
function demoDate(offset) {
  const date = new Date(demoReferenceDate.getFullYear(), demoReferenceDate.getMonth(), demoReferenceDate.getDate() + offset, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
const demoSeedItems = [
  {
    title: "Reduce onboarding drop-off",
    customer: "New self-serve teams",
    problem: "Teams abandon setup before inviting collaborators.",
    owner: "Growth PM",
    status: "committed",
    statusId: "started",
    reach: 1800,
    impact: 4,
    confidence: 0.75,
    effort: 5,
    startDate: demoDate(-7),
    dueDate: demoDate(14),
    nextStep: "Review activation funnel with design and data.",
    risk: "Analytics event coverage is incomplete.",
    experiment: "Guided setup checklist with progressive disclosure.",
    decision: "Ship checklist behind a gradual rollout flag."
  },
  {
    title: "Centralize customer feedback",
    customer: "Support and success",
    problem: "Feedback lives across calls, tickets, and Slack threads.",
    owner: "Platform PM",
    status: "discovery",
    reach: 900,
    impact: 5,
    confidence: 0.6,
    effort: 8,
    startDate: demoDate(-3),
    dueDate: demoDate(21),
    nextStep: "Interview success managers about tagging workflow.",
    experiment: "CSV import plus manual triage queue."
  },
  {
    title: "Enterprise export controls",
    customer: "Security admins",
    problem: "Admins need clearer control over workspace data exports.",
    status: "intake",
    reach: 250,
    impact: 5,
    confidence: 0.5,
    effort: 5,
    risk: "Compliance scope may expand."
  },
  {
    title: "Improve enterprise audit trails",
    customer: "Security admins",
    problem: "Admins need audit visibility before expanding workspace access.",
    owner: "Trust PM",
    status: "committed",
    reach: 600,
    impact: 4,
    confidence: 0.7,
    effort: 5,
    startDate: demoDate(-10),
    dueDate: demoDate(7),
    nextStep: "Confirm the audit event model with security and data.",
    risk: "Retention requirements are not approved.",
    dependencies: [{ id: "demo-audit-approval", description: "Security approval of the audit retention policy", targetType: "external", targetName: "Security review", status: "blocked", ownerName: "Trust PM", ownerPersonId: "", targetInitiativeId: "", neededBy: demoDate(3), createdAt: demoReferenceDate.toISOString(), updatedAt: demoReferenceDate.toISOString() }],
    experiment: "Pilot audit exports with five enterprise admins."
  },
  {
    title: "Clarify trial conversion",
    customer: "New self-serve teams",
    problem: "Teams need clearer upgrade guidance after completing setup.",
    owner: "Monetization PM",
    status: "shipped",
    reach: 1300,
    impact: 3,
    confidence: 0.65,
    effort: 3,
    startDate: demoDate(-21),
    dueDate: demoDate(-2),
    nextStep: "Review the shipped upgrade guidance with support.",
    decision: "Released contextual upgrade guidance; review customer feedback after launch.",
    experiment: "Compare contextual upgrade guidance with the current trial banner."
  }
].map((item) => createItem(item));
const demoBaseWorkspace = createDemoWorkspace(demoSeedItems);
const demoWorkspace = {
  ...demoBaseWorkspace,
  customerDirectory: createDemoCustomerDirectory(demoBaseWorkspace.customerDirectory, demoBaseWorkspace.organization)
};
const emptyOperationWorkspace = createEmptyWorkspaceDocument();
let cachedOperationalWorkspaceRaw;
let cachedOperationalWorkspaceResult;
let localWriteScope;
try { localWriteScope = createLocalWriteScope(); } catch { /* Recovery stays available when storage cannot be read. */ }
const initialOperationalWorkspaceLoad = loadOperationalWorkspaceResult();
let localCommittedWorkspace = initialOperationalWorkspaceLoad.workspace;

const initialRecovery = loadRecoverySnapshots();
const initialExperience = loadExperience();
const initialSelectedView = initialView();
const initialSelectedMode = initialMode();
const initialSelectedInitiative = initialInitiative();
const initialPlanningCalendar = loadPlanningCalendar();
const initialPeriodInvalid = periodRequestInvalid(urlParams, initialPlanningCalendar);
let teamAttemptSequence = 0;
let pendingInitiativeDetailReturnFocusId = "";
let tutorialLayoutFrame = 0;
const state = {
  experience: initialExperience,
  experienceDraft: [...initialExperience.enabledCapabilities],
  experienceStatus: "",
  experienceBusy: false,
  routeAnnouncement: "",
  weeklyUpdateCopied: !demoMode && readWeeklyUpdateCopied(localStorage, activeProjectStorageKeys.checklist),
  items: loadItems(),
  insightRecords: loadInsightRecords(),
  codeRepositories: loadCodeRepositories(),
  implementationRuns: loadImplementationRuns(),
  artifacts: loadArtifacts(),
  planningCalendar: initialPlanningCalendar,
  periodSelection: normalizePeriodSelection(urlParams, initialPlanningCalendar),
  periodAnnouncement: initialPeriodInvalid ? "That timeline selection is invalid or unavailable. Showing All time." : "",
  planningCalendarStatus: "",
  organization: loadOrganization(),
  customerDirectory: loadCustomerDirectory(),
  workflow: loadWorkflow(),
  prioritization: loadPrioritization(),
  selectedView: initialSelectedView,
  selectedMode: initialSelectedMode,
  spaceModes: { [initialSelectedView]: initialSelectedMode },
  selectedOrgUnitId: urlParams.get("orgUnitId") || "",
  selectedPersonId: urlParams.get("personId") || "",
  customerView: urlParams.get("customerView") || "accounts",
  selectedCustomerId: urlParams.get("customerId") || "",
  selectedSegmentId: urlParams.get("segmentId") || "",
  customerQuery: "",
  customerPage: 1,
  customerStatus: "",
  customerImport: null,
  customerSegmentDraft: null,
  customerAccountDrafts: new Map(),
  organizationStatus: "",
  workflowStatus: "",
  selectedWorkflowStatusId: "",
  prioritizationStatus: "",
  prioritizationBusy: false,
  priorityDragId: "",
  selectedPriorityFrameworkId: "",
  boardTeamId: urlParams.get("boardTeam") || "all",
  mobileBoardStatusId: urlParams.get("boardStage") || "",
  boardStatus: "",
  boardBusyItemId: "",
  draggedItemId: "",
  usage: loadUsage(),
  selectedTemplate: "weekly-review",
  selectedMeeting: "weekly-review",
  selectedSpecId: urlParams.get("specId") || "",
  query: "",
  source: loadSource(),
  sourceSelection: "local",
  sync: loadSync(),
  activity: loadActivity(),
  backups: initialRecovery.snapshots,
  dataStatus: !demoMode && (initialOperationalWorkspaceLoad.warning || initialProjectBootstrap?.warning)
    ? initialOperationalWorkspaceLoad.warning || initialProjectBootstrap.warning
    : recoveryLoadStatus(initialRecovery),
  dataBusy: false,
  driveReview: null,
  driveToken: "",
  driveAdvancedOpen: false,
  dataAdvancedOpen: false,
  syncStatus: demoMode ? "Drive sync is disabled in demo mode." : "Drive sync not connected.",
  linkedFile: { handle: null, name: "", permission: "unknown", lastModified: 0, status: "" },
  team: createTeamState(),
  initiativeDetail: createInitiativeDetailState({ selectedId: initialSelectedInitiative }),
  initiativeEditor: createInitiativeEditorState(),
  insightEditor: createInsightEditorState(),
  insightStatusFilter: "",
  pendingInsightPromotionId: "",
  editorAnnouncement: "",
  modeChoiceOpen: initialWorkspaceModeChoiceOpen,
  storageChoiceOpen: false,
  storageChoiceStatus: "",
  demoConversionOpen: false,
  demoConversionSelection: demoWorkspace.items.map((item) => item.id),
  storageWarning: demoMode ? "" : initialOperationalWorkspaceLoad.warning || initialProjectBootstrap?.warning || "",
  tutorial: {
    surface: "closed",
    groupId: "",
    stepIndex: 0,
    replay: false,
    progress: initialTutorialProgress,
    origin: null,
    returnFocusId: "",
    announcement: "",
    storageFailed: false
  },
  projects: demoMode ? null : createProjectUiState(projectRegistry, {
    persistent: initialProjectBootstrap?.persistent !== false,
    warning: [initialProjectBootstrap?.warning, serverConnectorPool?.warning].filter(Boolean).join(" "),
    connectors: serverConnectorPool?.registry.connectors || []
  })
};
window.addEventListener("beforeunload", event => {
  const initiativeDraft = state.initiativeEditor.mode && state.initiativeEditor.draft;
  const insightDraft = state.insightEditor.mode && state.insightEditor.mode !== "view" && state.insightEditor.draft;
  if (documentComposer.hasEdits || state.customerAccountDrafts.size || initiativeRecordDrafts.size || initiativeDraft || insightDraft) { event.preventDefault(); event.returnValue = ""; }
});
state.sourceSelection = sourceSelectionFor(state.source);
if (receivedTeamInvitation) { state.modeChoiceOpen = false; }
if (initialWorkspaceModeChoiceOpen && state.projects?.persistent && !receivedTeamInvitation) {
  state.modeChoiceOpen = false;
  state.projects.surface = "wizard";
  const drive = normalizeDriveRuntimeConfig(globalThis.PM_OS_DRIVE_CONFIG);
  state.projects.wizard = {
    ...newProjectWizardState({ managedConfig: resolveBackendRuntimeConfig(globalThis), driveClientId: drive?.clientId || "", drivePickerAvailable: Boolean(drive?.pickerApiKey && drive?.appId) }),
    firstRun: true, entryMode: "blank", presetId: "solo-pm", customCapabilities: [],
    importDocument: null, importName: "", onboarding: "blank"
  };
}
if (!demoMode) state.syncStatus = state.source.type === "google-drive"
  ? "Drive is ready to connect."
  : state.source.type === "local-file" ? "Restoring linked file access..." : "Browser storage is active.";
state.initiativeDetail = revealFocusedInitiativeRecord(
  createInitiativeDetailState({
    selectedId: initialSelectedInitiative,
    focusSection: ["risks", "dependencies"].includes(urlParams.get("section")) ? urlParams.get("section") : "",
    focusRecordId: urlParams.get("record")?.trim() || ""
  }),
  state.items.find((item) => item.id === initialSelectedInitiative)
);
if (state.initiativeDetail.focusRecordId) {
  const kind = state.initiativeDetail.focusSection === "dependencies" ? "dependency" : "risk";
  state.editorAnnouncement = `Opened linked ${kind} record.`;
}

const app = document.querySelector("#app");
// Keep pending native confirmations alive when background updates redraw the workspace.
document.body.insertAdjacentHTML("beforeend", confirmationDialogMarkup());
if (state.projects && ((!urlParams.has("space") && !urlParams.has("view")) || (urlParams.get("project") && urlParams.get("project") !== state.projects.registry.activeProjectId))) restoreProjectLocation(activeRegistryProject(state.projects.registry)?.location);
if (urlParams.has("insightId")) restoreInsightSelection(urlParams.get("insightId"));
if (urlParams.has("insightStatus")) state.insightStatusFilter = validInsightStatus(urlParams.get("insightStatus"));
app.addEventListener("click", handleDelegatedNavigation);
if (!initialWorkspaceModeChoiceOpen && (!state.projects || !urlParams.get("project") || urlParams.get("project") === state.projects.registry.activeProjectId)
  && (!urlParams.get("space") || urlParams.get("view") || urlParams.has("experience") || (state.projects && !urlParams.get("project")))) pushViewUrl(true);
if (!initialWorkspaceModeChoiceOpen) recordViewUsage(state.selectedView);
render();
if (!urlParams.get("project") || urlParams.get("project") === state.projects?.registry.activeProjectId) persistCurrentProjectLocation();
void restoreLinkedWorkspaceHandle();
if (receivedTeamInvitation) {
  void showTeamInvitation({ invitation: receivedTeamInvitation, config: resolveBackendRuntimeConfig(globalThis), pool: serverConnectorPool,
    onJoined: async ({ workspaceId, workspaceName, connectorId }) => {
      if (!state.projects) throw new Error("Project storage is unavailable.");
      state.projects.connectors = serverConnectorPool.registry.connectors;
      state.projects.wizard = { ...newProjectWizardState(), provider: "server", name: workspaceName, connectorId,
        serverAction: "existing", serverWorkspaceId: workspaceId, onboarding: "blank" };
      await createServerProjectFromWizard();
      if (!state.team.active || state.team.workspace?.id !== workspaceId) throw new Error("Workspace could not open.");
    }
  });
} else if (state.projects && initialServerProjectId) {
  queueMicrotask(() => { void restoreViewFromLocation(); });
} else if (state.projects && urlParams.get("project") && urlParams.get("project") !== state.projects.registry.activeProjectId) {
  queueMicrotask(() => { void restoreViewFromLocation(); });
}
window.addEventListener("popstate", restoreViewFromLocation);
window.addEventListener("focus", inspectLinkedWorkspaceOnFocus);
window.addEventListener("online", () => {
  refreshSaveStatus();
  if (state.source.type === "google-drive" && state.driveToken && state.sync.localPending) scheduleAutomaticDriveSync();
});
window.addEventListener("offline", refreshSaveStatus);
document.addEventListener("keydown", handleViewsEscape);
document.addEventListener("keydown", handleTutorialKeydown);
window.addEventListener("resize", scheduleTutorialLayout);
document.addEventListener("scroll", scheduleTutorialLayout, true);

function render() {
  state.generatedAskTargets = new Map();
  state.measureTargets = new Map();
  state.items = projectCanonicalInitiativeRecords(state.items, state.insightRecords);
  recoverUnavailableRoute();
  const catalogActiveProject = currentProjectDescriptor(state.projects, state.team);
  const audienceItems = decorateInitiativeAudiences(decorateWorkspacePriorities(state.items));
  const periodItems = filterItemsByPeriod(audienceItems, state.periodSelection, state.planningCalendar);
  const scopeActive = timelineScopeApplies();
  const viewItems = scopeActive ? periodItems : audienceItems;
  const filteredItems = viewItems.filter((item) => `${item.title} ${item.customer} ${item.audienceSegments.join(" ")} ${item.problem} ${item.owner}`.toLowerCase().includes(state.query.toLowerCase()));
  const health = calculateHealth(filteredItems);
  const groups = groupByStatus(filteredItems);
  const workflowGroups = groupByInitiativeWorkflow(filteredItems);
  const followUps = buildFollowUps(filteredItems, state.prioritization);
  const currentView = selectedViewDefinition();
  const detailItem = initiativeDetailItem();
  const viewContext = { items: viewItems, filteredItems, insightRecords: state.insightRecords, groups, workflowGroups, health, followUps };
  document.title = `${state.initiativeDetail.selectedId ? detailItem?.title || "Initiative unavailable" : shellViewLabel(currentView)} | ${catalogActiveProject?.name || "PM OS"}`;

  const tutorialOpen = state.tutorial.surface !== "closed";
  const projectCatalogOpen = Boolean(state.projects && state.projects.surface !== "closed");
  const modalOpen = tutorialOpen || state.modeChoiceOpen || state.storageChoiceOpen || state.demoConversionOpen || projectCatalogOpen;
  document.documentElement.dataset.tutorialOpen = String(tutorialOpen);
  document.documentElement.dataset.workspaceModeChoiceOpen = String(state.modeChoiceOpen);
  app.innerHTML = `
    <div class="shell"${modalOpen ? ' inert aria-hidden="true"' : ""}>
      <aside class="sidebar" aria-label="Workspace navigation">
        <div class="sidebar-header">
          <div class="sidebar-brand"><span class="brand-mark" aria-hidden="true">P</span><div><p class="eyebrow">Product workspace</p><h1>PM OS</h1></div></div>
          <button class="views-toggle" id="viewsToggle" type="button" aria-expanded="false" aria-controls="workspaceViews">Menu</button>
        </div>
        <nav class="nav" id="workspaceViews" aria-label="Workspace spaces" data-view-count="4">${navigationMarkup()}</nav>
        ${state.projects ? projectSwitcherButtonMarkup(state.projects, { team: state.team, itemCount: state.items.length }) : `<div class="workspace-switcher"><span class="source-dot ${demoMode ? "" : syncIndicatorTone()}"></span><div><strong>${escapeHtml(demoMode ? "Demo workspace" : activeSourceLabel())}</strong><span>${demoMode ? "" : `${escapeHtml(globalSyncLabel())} · `}${state.items.length} initiatives</span></div></div>`}
        <button class="customize-workspace-link" id="customizeWorkspaceButton" type="button">Customize workspace</button>
      </aside>
      <main class="main">
        <h1 class="sr-only">PM OS workspace</h1>
        <header class="topbar">
          <div class="topbar-heading">${state.projects ? projectSwitcherButtonMarkup(state.projects, { mobile: true, team: state.team, itemCount: state.items.length }) : ""}<p class="eyebrow">${escapeHtml(catalogActiveProject ? `${catalogActiveProject.name} project` : demoMode ? "Demo workspace" : `${activeSourceLabel()} workspace`)}</p><h2 id="viewTitle" tabindex="-1">${escapeHtml(shellViewLabel(currentView))}</h2></div>
          <div class="topbar-tools">${currentView.showSearch ? `<label class="search"><span class="sr-only">${currentView.id === "insights" && state.selectedMode !== "customers" ? `Search ${escapeHtml(state.selectedMode)} records` : "Search workspace"}</span><input id="searchInput" type="search" value="${escapeHtml(state.query)}" placeholder="${currentView.id === "insights" && state.selectedMode !== "customers" ? `Search ${escapeHtml(state.selectedMode)}` : "Search workspace"}"></label>` : ""}${demoMode ? "" : `<span class="global-sync-pill ${syncIndicatorTone()}" role="status" aria-live="polite">${escapeHtml(globalSyncLabel())}</span>`}<button class="icon-button" id="themeToggle" type="button" aria-label="Toggle color theme" title="Toggle color theme">${document.documentElement.dataset.theme === "dark" ? "Light" : "Dark"}</button>${currentView.id === "settings" ? "" : currentView.id === "insights" && state.selectedMode !== "customers" ? insightCommandsMarkup() : initiativeCommandsMarkup()}</div>
        </header>
        <p class="sr-only" id="initiativeEditorStatus" role="status" aria-live="polite" aria-atomic="true">${escapeHtml(state.editorAnnouncement)}</p>
        <p class="sr-only" id="periodStatus" role="status" aria-live="polite" aria-atomic="true">${escapeHtml(state.periodAnnouncement)}</p>
        <p class="sr-only" id="copyStatus" role="status" aria-live="polite" aria-atomic="true"></p>
        <p class="${state.routeAnnouncement ? "route-notice" : "sr-only"}" id="routeStatus" role="status" aria-live="polite" aria-atomic="true">${escapeHtml(state.routeAnnouncement)}</p>
        ${storageWarningMarkup()}
        ${localWriteRecoveryMarkup()}
        ${state.initiativeDetail.selectedId ? "" : initiativeRecordDraftRecoveryMarkup()}
        ${linkedFileWarningMarkup()}
        ${demoMode && currentView.id === "today" ? `<section class="panel" aria-label="Demo scenarios"><p>Sample dates are relative to ${demoDate(0)}. Explore healthy feedback research, blocked audit work, shipped trial guidance, and unscheduled export controls. Demo edits reset on reload and stay separate from saved work.</p></section>` : ""}
        ${currentView.id === "today" ? weeklyLoopMarkup() : ""}
        ${scopeActive ? timelineToolbarMarkup(periodItems.length) : ""}
        ${teamConflictMarkup()}
        ${contextualWorkflowsMarkup()}
        ${operationalMeasureGuideMarkup()}
        ${currentView.renderer(viewContext)}
      </main>
    </div>
    ${state.initiativeEditor.mode ? "" : initiativeDetailDialogMarkup()}
    ${initiativeEditorDialogMarkup()}
    ${insightEditorDialogMarkup()}
    ${workspaceModeChoiceMarkup()}
    ${initialStorageChoiceMarkup()}
    ${demoConversionDialogMarkup()}
    ${projectSwitcherMarkup(state.projects, { team: state.team, teamWorkspaces: state.team.workspaces, linkedFileAvailable: linkedFileSupported(globalThis) })}
    ${tutorialMarkup()}`;

  bindEvents();
  bindInitiativeRecordDraftRecovery();
  const artifactScope = captureDocumentArtifactScope();
  documentComposer.bind({ root: app, context: documentComposerContext, refresh: renderAndFocus,
    saveArtifact: (input, expectedVersion) => saveDocumentArtifact(input, expectedVersion, artifactScope),
    deleteArtifact: (id, expectedVersion) => deleteDocumentArtifact(id, expectedVersion, artifactScope),
    confirm: (title, description, confirmLabel) => requestDataConfirmation({ title, description, confirmLabel, trigger: document.activeElement }),
    download: downloadFile });
  document.querySelectorAll("[data-open-document]").forEach(button => button.addEventListener("click", async () => {
    const projectKey = documentComposerContext().projectKey;
    if (documentComposer.hasEdits && !await requestDataConfirmation({ title: "Replace your edited draft?", description: "Save or download your draft before replacing it with another document.", confirmLabel: "Replace draft", trigger: button })) return;
    if (documentComposerContext().projectKey !== projectKey) return;
    documentComposer.choose(button.dataset.openDocument, button.dataset.documentInitiative || "");
    navigateToView("today", "content", "documents");
  }));
  bindLocalWriteRecovery();
  if (state.localWriteConflict) restoreLocalFormDrafts(state.localWriteConflict.forms);
  revealActiveSpaceMode();
  scheduleTutorialLayout();
}

function linkedFileWarningMarkup() {
  if (demoMode || state.team.active || state.source.type !== "local-file" || !state.sync.fileConflicts.length) return "";
  return '<aside class="storage-warning" role="alert" aria-labelledby="linkedFileWarningTitle"><div><strong id="linkedFileWarningTitle">File conflict needs review</strong><p>Your changes are saved on this device. The linked file has different changes and has not been overwritten.</p></div><button class="secondary" id="reviewLinkedFileConflictButton" type="button">Review file conflict</button></aside>';
}

function storageWarningMarkup() {
  if (!state.storageWarning) return "";
  return `<aside class="storage-warning" role="alert" aria-labelledby="storageWarningTitle"><div><strong id="storageWarningTitle">Saved workspace needs recovery</strong><p>${escapeHtml(state.storageWarning)}</p></div><button class="secondary" id="openDataRecoveryButton" type="button">Open data &amp; backup</button></aside>`;
}

function contextualWorkflowsMarkup() {
  const parent = policyShellParentView(state.selectedView);
  const groups = parent === "initiatives"
    ? [
        ["Planning", "planning", [["quarter", "Plan"], ["roadmap", "Roadmap"], ["capacity", "Capacity"], ["outcomes", "Outcomes"], ["metrics", "Metrics"]]],
        ["Delivery", "delivery", [["board", "Delivery board"], ["dependencies", "Dependencies"], ["readiness", "Readiness"], ["launch", "Launch"], ["enablement", "Enablement"]]]
      ]
    : parent === "today"
      ? [["Briefings", "briefings", [["executive", "Executive brief"], ["updates", "Updates"], ["stakeholders", "Stakeholders"], ["escalations", "Escalations"], ["comms", "Comms"], ["decisions", "Decisions"], ["meetings", "Meetings"], ["review", "Review"], ["retros", "Retros"], ["operations", "Operations"], ["specs", "Specs"], ["templates", "Templates"]]]]
      : parent === "settings"
        ? [["Team", "team", [["organization", "Organization"], ["people", "People"]]]]
        : [];
  const available = groups.map(([label, space, entries]) => [label, space, entries.filter(([mode]) => allowedModes(space).includes(mode))]).filter(([, , entries]) => entries.length);
  if (!available.length) return "";
  const activeAdvanced = policyShellParentView(state.selectedView) === parent && state.selectedView !== parent;
  return `<details class="contextual-workflows" ${activeAdvanced ? "open" : ""}><summary>More ${escapeHtml(viewLabel(viewByDeepLink.get(parent)).toLowerCase())} tools</summary><div>${available.map(([label, space, entries]) => `<section aria-label="${escapeHtml(label)}"><strong>${escapeHtml(label)}</strong>${entries.map(([mode, text]) => `<a href="${escapeHtml(contextualWorkflowHref(space, mode))}" data-jump-space="${escapeHtml(space)}" data-jump-mode="${escapeHtml(mode)}"${state.selectedView === space && state.selectedMode === mode ? ' aria-current="page"' : ""}>${escapeHtml(text)}</a>`).join("")}</section>`).join("")}</div></details>`;
}

function contextualWorkflowHref(space, mode) {
  const url = new URL(location.href);
  url.searchParams.set("space", space);
  url.searchParams.set("mode", mode);
  url.searchParams.delete("view");
  url.searchParams.delete("experience");
  return `${url.pathname}${url.search}`;
}

function spaceModeMarkup(modes) {
  return `<nav class="space-modes" aria-label="${escapeHtml(selectedViewDefinition().label)} views">${modes.map(([id, label]) => `<button class="${state.selectedMode === id ? "active" : ""}" data-space-mode="${escapeHtml(id)}" type="button"${state.selectedMode === id ? ' aria-current="page"' : ""}>${escapeHtml(label)}</button>`).join("")}</nav>`;
}

function revealActiveSpaceMode() {
  const active = document.querySelector(".space-modes [aria-current=\"page\"]");
  const modes = active?.closest(".space-modes");
  if (!active || !modes || modes.scrollWidth <= modes.clientWidth) return;
  const activeStart = active.offsetLeft;
  const activeEnd = activeStart + active.offsetWidth;
  const visibleStart = modes.scrollLeft;
  const visibleEnd = visibleStart + modes.clientWidth;
  if (activeStart >= visibleStart && activeEnd <= visibleEnd) return;
  modes.scrollLeft = Math.max(0, activeStart - ((modes.clientWidth - active.offsetWidth) / 2));
}

function timelineScopeApplies() {
  const capacitySurface = (state.selectedView === "initiatives" && state.selectedMode === "portfolio") || (state.selectedView === "planning" && state.selectedMode === "capacity");
  return (experienceHas("timeline-planning") && ["initiatives", "planning", "delivery", "briefings", "team"].includes(state.selectedView)) || (experienceHas("portfolio-planning") && capacitySurface);
}

function timelineToolbarMarkup(resultCount) {
  const selection = normalizePeriodSelection(state.periodSelection, state.planningCalendar);
  const period = periodForSelection(selection, state.planningCalendar);
  const unscheduledCount = filterItemsByPeriod(state.items, { kind: "unscheduled" }, state.planningCalendar).length;
  const typeOptions = state.planningCalendar.enabledPeriodTypes
    .map((type) => `<option value="${type}" ${selection.kind === type ? "selected" : ""}>${titleCase(type)}</option>`)
    .join("");
  const jumpDate = period?.startDate || localDateStamp();
  return `<section class="timeline-toolbar" aria-labelledby="timelineScopeTitle">
    <div class="timeline-scope-copy"><p class="panel-kicker">Timeline scope</p><h3 id="timelineScopeTitle">${escapeHtml(periodSelectionLabel(selection, state.planningCalendar))}</h3><p>${escapeHtml(periodSelectionRangeLabel(selection, state.planningCalendar))}</p></div>
    <div class="timeline-scope-controls">
      <label><span>View by</span><select id="periodKind"><option value="all" ${selection.kind === "all" ? "selected" : ""}>All time</option><option value="unscheduled" ${selection.kind === "unscheduled" ? "selected" : ""}>Unscheduled (${unscheduledCount})</option>${typeOptions}</select></label>
      ${period ? `<div class="period-stepper" aria-label="Move between ${escapeHtml(selection.kind)} periods"><button class="secondary" id="previousPeriodButton" type="button" aria-label="Previous ${escapeHtml(selection.kind)}">Previous</button><button class="secondary" id="currentPeriodButton" type="button" aria-label="Go to current ${escapeHtml(selection.kind)}">Current</button><button class="secondary" id="nextPeriodButton" type="button" aria-label="Next ${escapeHtml(selection.kind)}">Next</button></div><label class="period-jump"><span>Jump to date</span><input id="periodJumpDate" type="date" value="${escapeHtml(jumpDate)}"></label>` : ""}
    </div>
    <div class="timeline-scope-result"><strong>${resultCount}</strong><span>${resultCount === 1 ? "initiative" : "initiatives"}</span>${unscheduledCount && selection.kind !== "unscheduled" ? `<button class="text-button" id="showUnscheduledButton" type="button">${unscheduledCount} unscheduled</button>` : ""}</div>
  </section>`;
}

function changeTimelineKind(event) {
  const kind = event.currentTarget.value;
  const selection = ["all", "unscheduled"].includes(kind)
    ? { kind }
    : { kind, startDate: periodForDate(kind, localDateStamp(), state.planningCalendar)?.startDate };
  applyPeriodSelection(selection, "periodKind");
}

function moveTimelinePeriod(amount, focusId) {
  applyPeriodSelection(shiftPeriodSelection(state.periodSelection, amount, state.planningCalendar), focusId);
}

function selectCurrentTimelinePeriod() {
  const kind = state.periodSelection.kind;
  if (!["sprint", "month", "quarter", "year"].includes(kind)) return;
  applyPeriodSelection({ kind, startDate: localDateStamp() }, "currentPeriodButton");
}

function jumpTimelinePeriod(event) {
  const kind = state.periodSelection.kind;
  if (!event.currentTarget.value || !["sprint", "month", "quarter", "year"].includes(kind)) return;
  applyPeriodSelection({ kind, startDate: event.currentTarget.value }, "periodJumpDate");
}

function applyPeriodSelection(selection, focusId = "periodKind") {
  state.periodSelection = normalizePeriodSelection(selection, state.planningCalendar);
  state.periodAnnouncement = "";
  pushViewUrl();
  render();
  const label = periodSelectionLabel(state.periodSelection, state.planningCalendar);
  queueMicrotask(() => {
    document.querySelector(`#${focusId}`)?.focus();
    const status = document.querySelector("#periodStatus");
    if (status) status.textContent = `Timeline scope changed to ${label}.`;
  });
}

function documentComposerContext() {
  const saveUnavailableReason = documentArtifactSaveUnavailableReason();
  return {
    artifacts: state.artifacts, canSave: !saveUnavailableReason, saveUnavailableReason,
    projectKey: state.team.active ? `team:${state.team.connectorId}:${state.team.workspace?.id}` : activeRegistryProject(state.projects?.registry)?.id || "browser",
    projectName: (state.team.active && state.team.workspace?.name) || activeRegistryProject(state.projects?.registry)?.name || (demoMode ? "Demo workspace" : "My project"),
    items: decorateInitiativeAudiences(decorateWorkspacePriorities(state.items)),
    activity: state.activity, prioritization: state.prioritization, calendar: state.planningCalendar, workflow: state.workflow,
    insightRecords: state.insightRecords, customerDirectory: state.customerDirectory,
    timelineEnabled: experienceHas("timeline-planning"), experience: state.experience
  };
}




function planningCapacityDraft() {
  const key = documentComposerContext().projectKey;
  let draft = planningCapacityDrafts.get(key);
  if (!draft || (!draft.editing && !draft.dirty && !draft.saving && draft.version !== state.planningCalendar.version)) {
    draft = capacityFormDefaults(state.planningCalendar, state.periodSelection);
    planningCapacityDrafts.set(key, draft);
  }
  return draft;
}

function currentPlanningCapacity() {
  return resolvePlanningCapacity(state.planningCalendar, state.periodSelection, { filtered: Boolean(state.query.trim()) });
}

function planningCapacityReadOnlyReason() {
  if (state.storageWarning && !state.team.active) return "Recover this project's saved workspace before changing planning capacity.";
  if (demoTeamRole && demoTeamRole !== "owner") return "Only a workspace owner can change planning capacity.";
  if (state.team.active && state.team.role !== "owner") return "Only a workspace owner can change planning capacity.";
  if (state.team.active && state.team.connection !== "live") return "Reconnect to the workspace before changing planning capacity.";
  if (state.team.mutationBusy) return "Wait for the current workspace change to finish.";
  return "";
}

function planningCapacitySettingsMarkup() {
  return planningCapacityMarkup(state.planningCalendar, state.periodSelection, planningCapacityDraft(), planningCalendarCanManage(), Boolean(state.query.trim()), planningCapacityReadOnlyReason());
}

function capturePlanningCapacityDraft(form, draft = planningCapacityDraft()) {
  const data = new FormData(form);
  draft.kind = String(data.get("capacityKind") || "");
  draft.date = String(data.get("capacityDate") || "");
  draft.effort = String(data.get("capacityEffort") ?? "");
  draft.dirty = true;
  draft.editing = true;
  draft.error = "";
  draft.status = "";
  const preview = form.querySelector("#capacityDraftPreview");
  if (preview) preview.textContent = capacityDraftPreview(state.planningCalendar, draft);
}

function bindPlanningCapacityEvents() {
  const form = document.querySelector("#planningCapacityForm");
  if (!form) return;
  const projectKey = documentComposerContext().projectKey;
  const draft = planningCapacityDraft();
  const capture = () => {
    if (form.isConnected && projectKey === documentComposerContext().projectKey && !draft.saving) capturePlanningCapacityDraft(form, draft);
  };
  form.addEventListener("input", capture);
  form.addEventListener("change", capture);
  form.addEventListener("submit", savePlanningCapacity);
  const details = document.querySelector("#planningCapacityDetails");
  details?.addEventListener("toggle", () => {
    if (details.isConnected && projectKey === documentComposerContext().projectKey && !draft.saving) draft.editing = details.open;
  });
  document.querySelector("#cancelPlanningCapacity")?.addEventListener("click", () => {
    if (draft.saving) return;
    const restored = capacityFormDefaults(state.planningCalendar, state.periodSelection);
    restored.status = "Changes cancelled. Showing the saved planning capacity.";
    planningCapacityDrafts.set(projectKey, restored);
    renderAndFocus("planningCapacityStatus");
  });
  document.querySelector("#clearPlanningCapacity")?.addEventListener("click", () => void savePlanningCapacity(null, true));
  document.querySelector("#openCapacityHorizon")?.addEventListener("click", openSavedCapacityHorizon);
}

function openSavedCapacityHorizon() {
  const saved = state.planningCalendar.capacityPlan;
  if (!saved) return;
  const selection = { kind: saved.horizon.kind, startDate: saved.horizon.startDate };
  const resolved = resolvePlanningCapacity(state.planningCalendar, selection);
  if (!resolved.available) {
    planningCapacityDraft().error = planningCapacityMessage(resolved);
    renderAndFocus("planningCapacityStatus");
    return;
  }
  state.query = "";
  applyPeriodSelection(selection, "planningCapacityStatus");
}

function refreshLocalPlanningWorkspace() {
  const readValues = captureStorageValues(localStorage, [storageKey, activityKey, syncKey, sourceKey]);
  const raw = readValues[0].value;
  const latest = importPortableWorkspace(raw || encodeWorkspaceDocument(emptyOperationWorkspace));
  const current = importPortableWorkspace(exportPortableWorkspace());
  if (JSON.stringify(latest) !== JSON.stringify(current)) {
    const experienceDraft = state.experienceDraft;
    applyTeamSnapshot(latest);
    state.experienceDraft = experienceDraft;
    state.sync = loadSync();
    rememberLocalWorkspaceRead(readValues);
    throw documentArtifactError("VERSION_CONFLICT", "This project's saved work changed in another tab. The workspace was refreshed and your planning draft is preserved. Review the latest saved calendar before retrying; cancel changes to reload its values.");
  }
}

async function commitLocalPlanningCalendar(next, actionTitle) {
  await commitLocalWorkspacePatch({ planningCalendar: next }, [createActivityEntry("planning-calendar-updated", { id: "", title: actionTitle }, { planningCalendar: { from: state.planningCalendar, to: next } })]);
}

async function writePlanningCalendar(next, expectedVersion, scope, actionTitle) {
  if (!documentArtifactScopeIsCurrent(scope)) throw documentArtifactError("PROJECT_CHANGED", "The active project changed. Reopen the original project to review your planning draft.");
  const reason = planningCapacityReadOnlyReason();
  if (reason) throw documentArtifactError("PERMISSION_DENIED", reason);
  if (!scope.repository && !demoMode) refreshLocalPlanningWorkspace();
  if (state.planningCalendar.version !== expectedVersion) throw documentArtifactError("VERSION_CONFLICT", "The saved planning calendar changed. Your draft is preserved; cancel changes to reload its latest values before editing again.");
  if (!scope.repository) {
    await commitLocalPlanningCalendar(next, actionTitle);
    return;
  }
  scope.team.mutationBusy = true;
  try {
    const result = await scope.repository.updatePlanningCalendar(next, expectedVersion);
    if (!documentArtifactScopeIsCurrent(scope)) throw documentArtifactError("PROJECT_CHANGED", "The planning change may have been saved in the previous workspace. Reopen that project to review it.");
    if (!result?.snapshot?.planningCalendar || !applyTeamSnapshot(result.snapshot)) throw documentArtifactError("REMOTE_ERROR", "The server did not confirm the saved planning calendar. Your draft is preserved; check the workspace before retrying.");
    scope.team.error = false;
    scope.team.status = "Planning settings saved.";
  } catch (error) {
    if (!documentArtifactScopeIsCurrent(scope)) throw documentArtifactError("PROJECT_CHANGED", "The active workspace changed while saving. Reopen the original project to check whether its planning change was saved.");
    if (isTeamConflict(error) || error?.code === "VERSION_CONFLICT" || isAmbiguousTeamError(error)) {
      await refreshDocumentArtifactTeamScope(scope).catch(() => undefined);
    }
    if (!documentArtifactScopeIsCurrent(scope)) throw documentArtifactError("PROJECT_CHANGED", "The active workspace changed. Reopen the original project to review its planning draft.");
    throw error;
  } finally {
    scope.team.mutationBusy = false;
  }
}

function planningSaveError(error) {
  if (error?.message && (error instanceof PlanningCalendarError || ["VERSION_CONFLICT", "PROJECT_CHANGED", "REMOTE_ERROR", "PERMISSION_DENIED"].includes(error?.code))) return error.message;
  return safeTeamError(error, "Planning settings could not be saved. Your draft is preserved; try again.");
}

async function savePlanningCapacity(event, clear = false) {
  event?.preventDefault();
  const draft = planningCapacityDraft();
  if (draft.saving || !planningCalendarCanManage()) return;
  if (event) capturePlanningCapacityDraft(event.currentTarget, draft);
  const scope = captureDocumentArtifactScope();
  let next;
  try {
    if (!clear && draft.effort.trim() === "") throw new PlanningCalendarError("CAPACITY_REQUIRED", "Enter an effort budget. Use 0 only when no capacity is available.");
    const capacityPlan = clear ? null : createPlanningCapacityPlan(state.planningCalendar, { kind: draft.kind, startDate: draft.date }, Number(draft.effort));
    next = patchPlanningCalendar(state.planningCalendar, { capacityPlan });
  } catch (error) {
    draft.error = planningSaveError(error);
    draft.editing = true;
    renderAndFocus("planningCapacityStatus");
    return;
  }
  draft.saving = true;
  draft.error = "";
  draft.status = "";
  render();
  try {
    await writePlanningCalendar(next, draft.version, scope, clear ? "Planning capacity cleared" : "Planning capacity");
    if (!documentArtifactScopeIsCurrent(scope)) throw documentArtifactError("PROJECT_CHANGED", "The active project changed. Reopen the original project to review the saved capacity.");
    if (next.capacityPlan) state.periodSelection = { kind: next.capacityPlan.horizon.kind, startDate: next.capacityPlan.horizon.startDate };
    state.query = "";
    const saved = capacityFormDefaults(state.planningCalendar, state.periodSelection);
    saved.status = clear ? "Saved capacity cleared. Capacity recommendations are unavailable until another budget is saved."
      : "Planning capacity saved: " + state.planningCalendar.capacityPlan.effort + " effort · " + capacityDraftPreview(state.planningCalendar, saved);
    planningCapacityDrafts.set(scope.projectKey, saved);
    state.periodAnnouncement = clear ? "Saved planning capacity cleared." : "Viewing the saved planning horizon.";
    pushViewUrl(true);
  } catch (error) {
    draft.error = planningSaveError(error);
    draft.editing = true;
  } finally {
    draft.saving = false;
    if (documentArtifactScopeIsCurrent(scope)) renderAndFocus("planningCapacityStatus");
  }
}

function documentArtifactSaveUnavailableReason() {
  if (demoMode) return "Create or open a project to save documents. Demo edits are temporary.";
  if (state.storageWarning && !state.team.active) return "Recover this project's saved workspace before saving documents.";
  return teamEditorReadOnlyReason();
}

function captureDocumentArtifactScope() {
  return {
    projectKey: documentComposerContext().projectKey,
    storageKey, sourceType: state.source.type,
    team: state.team, repository: state.team.active ? state.team.repository : null,
    workspaceId: state.team.active ? state.team.workspace?.id : "",
    extension: state.team.openResult?.extension
  };
}

function documentArtifactScopeIsCurrent(scope) {
  return scope.projectKey === documentComposerContext().projectKey
    && scope.storageKey === storageKey && scope.sourceType === state.source.type
    && (scope.repository
      ? state.team.active && scope.team === state.team && scope.repository === state.team.repository && scope.workspaceId === state.team.workspace?.id
      : !state.team.active);
}

function documentArtifactError(code, message) {
  return Object.assign(new Error(message), { code });
}

function assertDocumentArtifactScope(scope) {
  if (!documentArtifactScopeIsCurrent(scope)) throw documentArtifactError("PROJECT_CHANGED", "The active project changed. Reopen the original project before saving this document.");
  const reason = documentArtifactSaveUnavailableReason();
  if (reason) throw documentArtifactError("PERMISSION_DENIED", reason);
}

function refreshLocalArtifactVersions() {
  // A document write serializes the whole workspace. Refresh every canonical
  // field before retrying so a stale tab cannot overwrite unrelated saved work.
  const readValues = captureStorageValues(localStorage, [storageKey, activityKey, syncKey, sourceKey]);
  const raw = readValues[0].value;
  const latest = importPortableWorkspace(raw || encodeWorkspaceDocument(emptyOperationWorkspace));
  const current = importPortableWorkspace(exportPortableWorkspace());
  if (JSON.stringify(latest) !== JSON.stringify(current)) {
    const experienceDraft = state.experienceDraft;
    applyTeamSnapshot(latest);
    state.experienceDraft = experienceDraft;
    state.sync = loadSync();
    rememberLocalWorkspaceRead(readValues);
    throw documentArtifactError("VERSION_CONFLICT", "This project's saved work changed in another tab. Your draft is preserved and the workspace has been refreshed. Review the latest history before saving again, or save an independent copy.");
  }
}

function documentArtifactPredecessor(input, expectedVersion) {
  const parentId = input.supersedesId || "";
  if (!parentId) {
    if (expectedVersion != null) throw documentArtifactError("VERSION_CONFLICT", "An independent document cannot replace an earlier version.");
    return null;
  }
  const parent = state.artifacts.find(record => record.id === parentId);
  if (!parent) throw documentArtifactError("NOT_FOUND", "The saved version you were revising was deleted. Your draft is preserved; save it as an independent copy.");
  if (parent.version !== expectedVersion || state.artifacts.some(record => record.supersedesId === parentId)) {
    throw documentArtifactError("VERSION_CONFLICT", "This document already has a newer saved version. Your draft is preserved. Review its history or save an independent copy.");
  }
  return parent;
}

async function commitLocalArtifactUpdate(artifacts, activityEntry) {
  await commitLocalWorkspacePatch({ artifacts }, [activityEntry]);
}

async function refreshDocumentArtifactTeamScope(scope) {
  if (!documentArtifactScopeIsCurrent(scope)) return;
  const refreshed = typeof scope.extension?.refresh === "function"
    ? await scope.extension.refresh() : await scope.repository.open();
  if (documentArtifactScopeIsCurrent(scope)) applyTeamSnapshot(refreshed?.snapshot || refreshed);
}

async function mutateTeamDocumentArtifact(scope, operation) {
  scope.team.mutationBusy = true;
  try {
    const result = await operation();
    if (!documentArtifactScopeIsCurrent(scope)) throw documentArtifactError("PROJECT_CHANGED", "The document change was saved in the previous workspace. Reopen that project to review it.");
    if (!applyTeamSnapshot(result?.snapshot)) throw documentArtifactError("REMOTE_ERROR", "The server did not confirm the saved document. Your draft is preserved; check the workspace before retrying.");
    scope.team.error = false;
    scope.team.status = "Saved documents updated.";
    return result;
  } catch (error) {
    if (!documentArtifactScopeIsCurrent(scope)) throw documentArtifactError("PROJECT_CHANGED", "The active workspace changed while saving. Reopen the original project to review whether the change was saved.");
    const conflict = isTeamConflict(error) || error?.code === "CONFLICT";
    if (conflict || error?.code === "NOT_FOUND" || isAmbiguousTeamError(error)) await refreshDocumentArtifactTeamScope(scope).catch(() => undefined);
    if (!documentArtifactScopeIsCurrent(scope)) throw documentArtifactError("PROJECT_CHANGED", "The active workspace changed. Reopen the original project to review its saved documents.");
    const message = conflict
      ? "This document changed elsewhere or already has a newer version. Your draft is preserved. Review its history or save an independent copy."
      : error?.code === "NOT_FOUND"
        ? "That saved document version was deleted. Your draft is preserved; save it as an independent copy."
        : safeTeamError(error, error?.message || "The document could not be saved. Your draft is preserved; try again.");
    scope.team.error = true;
    scope.team.status = message;
    throw documentArtifactError(error?.code || "REMOTE_ERROR", message);
  } finally {
    scope.team.mutationBusy = false;
  }
}

async function saveDocumentArtifact(input, expectedSupersededVersion = null, scope = captureDocumentArtifactScope()) {
  assertDocumentArtifactScope(scope);
  const draft = structuredClone(input);
  if (scope.repository) {
    if (typeof scope.repository.createArtifact !== "function") throw documentArtifactError("UNSUPPORTED_OPERATION", "This server does not support saved documents yet. Update the server before saving.");
    const result = await mutateTeamDocumentArtifact(scope, () => scope.repository.createArtifact(draft, expectedSupersededVersion));
    const artifact = result.artifact && state.artifacts.find(record => record.id === result.artifact.id);
    if (!artifact) throw documentArtifactError("REMOTE_ERROR", "The server response did not include the saved document. Your draft is preserved; check its history before retrying.");
    return artifact;
  }
  try {
    refreshLocalArtifactVersions();
    const predecessor = documentArtifactPredecessor(draft, expectedSupersededVersion);
    const artifact = createArtifactRecord(draft, { predecessor });
    const activity = createActivityEntry("artifact-created", artifact, { artifactType: artifact.artifactType, title: artifact.title, supersedesId: artifact.supersedesId });
    await commitLocalArtifactUpdate([...state.artifacts, artifact], activity);
    return artifact;
  } catch (error) {
    if (["VERSION_CONFLICT", "NOT_FOUND"].includes(error?.code)) throw error;
    throw documentArtifactError(error?.code || "LOCAL_SAVE_FAILED", error?.name === "QuotaExceededError" || error?.name === "SecurityError"
      ? localInitiativeSaveError(error) : error?.message || "The document could not be saved in this browser. Your draft is preserved.");
  }
}

async function deleteDocumentArtifact(id, expectedVersion, scope = captureDocumentArtifactScope()) {
  assertDocumentArtifactScope(scope);
  if (scope.repository) {
    if (typeof scope.repository.deleteArtifact !== "function") throw documentArtifactError("UNSUPPORTED_OPERATION", "This server does not support deleting saved documents yet. Update the server before deleting.");
    await mutateTeamDocumentArtifact(scope, () => scope.repository.deleteArtifact(id, expectedVersion));
    return;
  }
  try {
    refreshLocalArtifactVersions();
    const artifact = state.artifacts.find(record => record.id === id);
    if (!artifact) throw documentArtifactError("NOT_FOUND", "That saved document version was already deleted.");
    if (artifact.version !== expectedVersion) throw documentArtifactError("VERSION_CONFLICT", "That document version changed. Review the latest saved documents before deleting.");
    await commitLocalArtifactUpdate(state.artifacts.filter(record => record.id !== id), createActivityEntry("artifact-deleted", artifact, { title: { from: artifact.title, to: "" } }));
  } catch (error) {
    if (["VERSION_CONFLICT", "NOT_FOUND"].includes(error?.code)) throw error;
    throw documentArtifactError(error?.code || "LOCAL_SAVE_FAILED", localInitiativeSaveError(error));
  }
}

function todaySpaceView({ filteredItems, health, followUps }) {
  const modes = spaceModeMarkup([["focus", "Focus"], ["actions", "Actions"], ["manager", "Manager"], ["documents", "Documents"], ["admin", "Administration"]]);
  if (state.selectedMode === "documents") return `${modes}${documentComposer.markup(documentComposerContext())}`;
  if (state.selectedMode === "manager") return `${modes}${managerHomeView(filteredItems)}`;
  if (state.selectedMode === "admin") return `${modes}${administratorHomeView()}`;
  if (state.selectedMode === "actions") return `${modes}${actionsView(filteredItems)}`;
  const priorities = prioritizeItems(filteredItems, state.prioritization).slice(0, 5);
  const weeklyUpdate = simpleWeeklyUpdate(filteredItems);
  const ordered = state.prioritization.manualOrder.length > 0;
  const showGettingStarted = !(state.team.active && state.team.role === "viewer") && ((state.team.active && !state.team.projectId) || activeRegistryProject(state.projects?.registry)?.onboarding !== "blank");
  return `${modes}
    <section class="welcome-band simple-welcome"><div><p class="eyebrow">${todayStamp()}</p><h3>Move the most important work forward.</h3><p>Capture the work, order priorities, make the next step clear, and share the week.</p></div><div class="focus-score"><span>Workspace health</span><strong class="${health.score === null ? "no-score" : ""}">${formatOperationalScore(health.score)}</strong></div></section>
    <section class="metrics simple-metrics" aria-label="Workspace health">${metric("Active", health.active)}${metric("No next step", health.noNextStep)}</section>
    ${!demoMode && showGettingStarted && !state.team?.active && !state.items.length ? `<section class="panel" aria-labelledby="emptyProjectStartTitle"><div class="panel-header"><div><p class="panel-kicker">Start here</p><h3 id="emptyProjectStartTitle">Choose how to start this project</h3></div></div><p>Create your first initiative below, bring in saved work, or choose the supporting workflows you need. You can change these choices later.</p><div class="data-actions"><button class="secondary" id="startProjectImport" type="button">Import saved work</button><button class="secondary" id="startProjectWorkflows" type="button">Choose workflows</button></div></section>` : ""}
    <section class="today-grid simple-today-grid">
      ${showGettingStarted ? `<section class="panel getting-started-card" aria-labelledby="gettingStartedTitle"><div class="panel-header"><div><p class="panel-kicker">First week</p><h3 id="gettingStartedTitle">Get your workspace moving</h3></div><span class="muted" id="gettingStartedProgress">${[state.items.length > 0, ordered, state.weeklyUpdateCopied].filter(Boolean).length} / 3</span></div><ol class="today-checklist"><li class="${state.items.length ? "complete" : ""}"><span>${state.items.length ? "✓" : "1"}</span><button id="checklistCreateInitiative" type="button">Create the first initiative</button></li><li class="${ordered ? "complete" : ""}"><span>${ordered ? "✓" : "2"}</span><button data-jump-space="initiatives" data-jump-mode="priorities" type="button">Order the most important work</button></li><li class="${state.weeklyUpdateCopied ? "complete" : ""}"><span>${state.weeklyUpdateCopied ? "✓" : "3"}</span><button id="checklistCopyUpdate" type="button">Copy the weekly update</button></li></ol></section>` : ""}
      <section class="panel priority-panel"><div class="panel-header"><div><p class="panel-kicker">Now</p><h3>Top priorities</h3></div><span class="muted">${priorities.length} in focus</span></div><div class="item-list simple-item-list">${priorities.map(simpleItemCard).join("") || emptyState("Capture your first initiative to start the priority stack.")}</div></section>
      <section class="panel today-weekly-update"><div class="panel-header"><div><p class="panel-kicker">Share</p><h3>Weekly update</h3></div><div class="data-actions"><button class="secondary" id="copyWeeklyUpdateButton" type="button">Copy update</button><button class="secondary" data-open-document="weekly" type="button">Edit a document draft</button></div></div><textarea id="weeklyUpdateDraft" readonly>${escapeHtml(weeklyUpdate)}</textarea></section>
    </section>`;
}

function initiativeEmptyStateMarkup() {
  const scoped = timelineScopeApplies();
  const selection = scoped ? normalizePeriodSelection(state.periodSelection, state.planningCalendar) : { kind: "all" };
  const searching = Boolean(state.query);
  const label = periodSelectionLabel(selection, state.planningCalendar);
  const message = searching
    ? `No initiatives match this search${scoped ? ` in ${label}` : ""}.`
    : selection.kind === "unscheduled" ? "No unscheduled initiatives."
      : selection.kind !== "all" ? `No initiatives in ${label}.` : "No initiatives yet.";
  const actions = [
    ...(scoped && selection.kind !== "all" ? ['<button class="secondary" data-empty-period="all" type="button">Show all time</button>'] : []),
    ...(scoped && selection.kind !== "unscheduled" && (selection.kind !== "all" || state.items.length) ? ['<button class="secondary" data-empty-period="unscheduled" type="button">Show unscheduled</button>'] : []),
    ...(searching ? ['<button class="secondary" id="clearEmptyInitiativeSearch" type="button">Clear search</button>'] : [])
  ];
  return `<div class="initiative-empty-state" role="region" aria-label="No matching initiatives">${emptyState(escapeHtml(message))}${actions.length ? `<div class="data-actions">${actions.join("")}</div>` : ""}</div>`;
}

function initiativesSpaceView({ filteredItems, workflowGroups }) {
  const modes = [["list", "List"], ["priorities", "Priorities"], ["board", "Board"], ["roadmap", "Roadmap"], ...(experienceHas("portfolio-planning") ? [["portfolio", "Portfolio"]] : [])];
  if (state.selectedMode === "priorities") return `${spaceModeMarkup(modes)}${prioritiesView(filteredItems)}`;
  if (state.selectedMode === "portfolio") return `${spaceModeMarkup(modes)}${portfolioView(filteredItems)}`;
  if (state.selectedMode === "roadmap") return `${spaceModeMarkup(modes)}${roadmapView(filteredItems, groupByStatus(filteredItems))}`;
  if (state.selectedMode === "board") {
    return `${spaceModeMarkup(modes)}${initiativeBoardView(filteredItems)}`;
  }
  return `${spaceModeMarkup(modes)}<section class="panel initiative-register"><div class="panel-header"><div><p class="panel-kicker">Portfolio</p><h3>All initiatives</h3></div><span class="muted">${filteredItems.length} initiatives</span></div><div class="item-list">${prioritizeItems(filteredItems, state.prioritization).map(itemCard).join("") || initiativeEmptyStateMarkup()}</div></section>`;
}

function prioritiesView(items) {
  const policy = normalizePrioritization(state.prioritization, { items: state.items });
  const method = methodDefinition(policy);
  const scoreOrderingHelp = priorityFrameworkForId(policy, method.frameworkId).fields.length
    ? " Complete scores rank first; missing inputs stay Unscored."
    : "";
  const ranked = prioritizeConfiguredItems(items, policy);
  const editable = !teamEditorReadOnlyReason();
  const reorderable = editable && (method.frameworkId === "manual" || method.frameworkId === "levels");
  let previousLevel = "";
  const rows = ranked.map((item, index) => {
    const result = priorityDisplay(item, policy, ranked);
    const levelHeading = method.frameworkId === "levels" && result.levelLabel !== previousLevel
      ? `<li class="priority-level-heading"><h4>${escapeHtml(result.levelLabel)}</h4></li>`
      : "";
    previousLevel = result.levelLabel;
    const group = method.frameworkId === "levels" ? ranked.filter((candidate) => priorityDisplay(candidate, policy, ranked).levelId === result.levelId) : ranked;
    const groupIndex = group.findIndex((candidate) => candidate.id === item.id);
    const breakdown = result.breakdown.length
      ? result.breakdown.map((entry) => `<span><b>${escapeHtml(entry.label)}</b> ${escapeHtml(entry.value)}</span>`).join("")
      : `<span>${escapeHtml(result.missing.length ? `Missing: ${result.missing.join(", ")}` : "Explicit order")}</span>`;
    return `${levelHeading}<li class="priority-row ${result.complete ? "" : "incomplete"}" data-priority-item="${escapeHtml(item.id)}" ${reorderable ? 'draggable="true"' : ""}>
      <span class="priority-rank" aria-label="${result.complete ? `Rank ${index + 1}` : method.frameworkId === "manual" ? "Unranked" : method.frameworkId === "levels" ? "Unassigned" : "Unscored"}">${result.complete ? `#${index + 1}` : "—"}</span>
      <div class="priority-row-main"><div><span class="pill">${escapeHtml(initiativeStatusLabel(item))}</span><h4 tabindex="-1">${escapeHtml(item.title)}</h4></div><div class="priority-breakdown">${breakdown}</div></div>
      <strong class="priority-value">${escapeHtml(result.valueLabel)}</strong>
      <div class="priority-row-actions">${reorderable ? `<button class="secondary small" data-priority-move="up" data-item-id="${escapeHtml(item.id)}" ${groupIndex <= 0 ? "disabled" : ""} type="button" aria-label="Move ${escapeHtml(item.title)} up">Up</button><button class="secondary small" data-priority-move="down" data-item-id="${escapeHtml(item.id)}" ${groupIndex >= group.length - 1 ? "disabled" : ""} type="button" aria-label="Move ${escapeHtml(item.title)} down">Down</button>` : ""}<button class="secondary small" data-edit-item="${escapeHtml(item.id)}" data-editor-focus="${escapeHtml(priorityEditorFocus(item, priorityFrameworkForId(policy, method.frameworkId)))}" ${editable ? "" : "disabled"} type="button">${result.complete || method.frameworkId === "manual" ? "Edit" : method.frameworkId === "levels" ? "Assign" : "Score"}</button></div>
    </li>`;
  }).join("");
  return `<section class="priority-workspace" aria-labelledby="priorityWorkspaceTitle">
    <div class="priority-hero"><div><p class="eyebrow">Workspace methodology</p><h3 id="priorityWorkspaceTitle">${escapeHtml(method.label)}</h3><p id="priorityMethodHelp">${escapeHtml(`${priorityMethodDescription(method.frameworkId)}${scoreOrderingHelp}`)}</p><small class="priority-policy-version">Policy v${policy.version}</small></div><button class="secondary" id="openPrioritizationSettings" type="button">${experienceHas("advanced-prioritization") ? workflowCanManage() ? "Configure method" : "View settings" : "Add scoring methods"}</button></div>
    ${state.prioritizationStatus ? `<p class="priority-status" role="status" aria-live="polite">${escapeHtml(state.prioritizationStatus)}</p>` : ""}
    <ol class="priority-list" aria-label="Initiatives ordered by ${escapeHtml(method.label)}" aria-describedby="priorityMethodHelp">${rows || `<li>${initiativeEmptyStateMarkup()}</li>`}</ol>
  </section>`;
}

function priorityMethodDescription(frameworkId) {
  return ({
    manual: "An explicit pecking order. Drag rows or use Move up/down; unranked initiatives stay at the bottom in title order. Editing notes does not set a rank.",
    levels: "Configured priority levels determine groups; manual order resolves work inside each level, then title order for ties.",
    rice: "RICE compares expected benefit with effort: Reach × Impact × Confidence ÷ Effort. Higher scores rank first.",
    ice: "Impact x Confidence x Ease, with each input rated from 1 to 10.",
    wsjf: "Business value + time criticality + risk reduction, divided by job size.",
    "value-effort": "Value divided by effort.",
    custom: "A normalized 0-100 weighted score from the selected custom framework."
  })[frameworkId.startsWith("custom-") ? "custom" : frameworkId] || "Workspace priority order.";
}

function workspacePriorityLabel() {
  return methodDefinition(state.prioritization).label;
}

function workspacePriorityValue(item) {
  return priorityDisplay(item, state.prioritization, state.items).valueLabel;
}

function initiativeBoardView(items) {
  const teamId = selectedBoardTeamId();
  const scopedItems = filterItemsForBoardTeam(items, teamId, state.organization);
  const effective = effectivePriorityFramework(state.prioritization, state.organization, teamId, { allowTeamOverride: teamId !== "all" && teamId !== "unassigned" });
  const groups = groupByInitiativeWorkflow(scopedItems).map((group) => ({
    ...group,
    items: prioritizeByFramework(group.items, effective.framework, state.prioritization)
  }));
  if (!state.mobileBoardStatusId || !state.workflow.statuses.some((status) => status.id === state.mobileBoardStatusId)) {
    state.mobileBoardStatusId = state.workflow.statuses[0]?.id || "";
  }
  const teamLabel = teamId === "all" ? "All teams" : teamId === "unassigned" ? "Unassigned" : organizationUnitPath(teamId);
  const sourceLabel = effective.source === "team" ? `${teamLabel} override` : "Workspace default";
  const addDisabled = teamEditorReadOnlyReason() ? "disabled" : "";
  return `<section class="initiative-board-shell" aria-labelledby="initiativeBoardTitle">
    <div class="board-toolbar">
      <div><p class="panel-kicker">Team-scoped workflow</p><h3 id="initiativeBoardTitle">${escapeHtml(teamLabel)} board</h3><p>${initiativeCountLabel(scopedItems.length)} across ${state.workflow.statuses.length} stages.</p></div>
      <div class="board-toolbar-controls">
        <label><span>Board team</span><select id="boardTeamSelect" aria-label="${escapeHtml(`Board team: ${teamLabel}`)}" title="${escapeHtml(teamLabel)}">${boardTeamOptions(teamId)}</select></label>
        <div class="board-framework" aria-label="${escapeHtml(`Priority framework: ${effective.framework.name}. ${sourceLabel}.`)}" title="${escapeHtml(`${effective.framework.name}. ${sourceLabel}. ${effective.framework.description}`)}"><span>Priority framework</span><strong>${escapeHtml(effective.framework.name)}</strong><small>${escapeHtml(sourceLabel)}</small></div>
        ${workflowCanManage() ? `<button class="secondary" id="openPrioritizationSettings" type="button">Configure</button>` : ""}
      </div>
    </div>
    <div class="mobile-stage-control"><label><span>Stage</span><select id="mobileBoardStage">${state.workflow.statuses.map((status) => `<option value="${escapeHtml(status.id)}" ${status.id === state.mobileBoardStatusId ? "selected" : ""}>${escapeHtml(status.name)} (${groups.find((group) => group.status.id === status.id)?.items.length || 0})</option>`).join("")}</select></label></div>
    <p class="board-live-status" id="boardStatus" role="status" aria-live="polite" aria-atomic="true">${escapeHtml(state.boardStatus)}</p>
    <section class="kanban space-board team-board" aria-label="${escapeHtml(teamLabel)} initiative board. Scroll horizontally to review every stage." tabindex="0">${groups.map(({ status, items: stageItems }) => `<section class="column workflow-column board-drop-zone ${status.id === state.mobileBoardStatusId ? "mobile-active" : ""}" data-board-status-id="${escapeHtml(status.id)}" aria-labelledby="boardColumn-${escapeHtml(status.id)}">
      <header class="column-title"><div><h3 id="boardColumn-${escapeHtml(status.id)}"><span class="status-swatch status-${escapeHtml(status.color)}" aria-hidden="true"></span>${escapeHtml(status.name)}</h3>${status.description || status.exitCriteria ? `<button class="status-help" type="button" title="${escapeHtml([status.description, status.exitCriteria ? `Exit: ${status.exitCriteria}` : ""].filter(Boolean).join(" "))}" aria-label="About ${escapeHtml(status.name)}">?</button>` : ""}</div><span aria-label="${initiativeCountLabel(stageItems.length)}">${stageItems.length}</span></header>
      <button class="board-add-button" id="boardAdd-${escapeHtml(status.id)}" data-add-board-status="${escapeHtml(status.id)}" data-add-board-team="${teamId === "all" || teamId === "unassigned" ? "" : escapeHtml(teamId)}" type="button" ${addDisabled}>+ Add initiative</button>
      <div class="board-card-list">${stageItems.map((item) => boardCard(item, effective.framework, teamId === "all")).join("") || emptyState(`No ${status.name.toLowerCase()} initiatives.`)}</div>
    </section>`).join("")}</section>
  </section>`;
}

function selectedBoardTeamId() {
  const value = String(state.boardTeamId || "all");
  if (value === "all" || value === "unassigned" || state.organization.units.some((unit) => unit.id === value)) return value;
  state.boardTeamId = "all";
  const url = new URL(location.href);
  url.searchParams.set("boardTeam", "all");
  history.replaceState(history.state, "", url);
  return "all";
}

function boardTeamOptions(selected) {
  const countFor = (teamId) => teamId === "all" ? state.items.length : teamId === "unassigned"
    ? state.items.filter((item) => !item.orgUnitId).length
    : state.items.filter((item) => item.orgUnitId === teamId).length;
  const options = [
    ["all", "All teams"],
    ["unassigned", "Unassigned"],
    ...state.organization.units.map((unit) => [unit.id, organizationUnitPath(unit.id)])
  ];
  return options.map(([id, label]) => `<option value="${escapeHtml(id)}" ${id === selected ? "selected" : ""}>${escapeHtml(label)} (${countFor(id)})</option>`).join("");
}

function boardCard(item, framework, showTeam) {
  const score = priorityScore(item, framework, state.prioritization);
  const busy = state.boardBusyItemId === item.id;
  const readonly = Boolean(teamEditorReadOnlyReason());
  const dragEnabled = !readonly && !busy && !window.matchMedia("(pointer: coarse)").matches;
  const itemId = escapeHtml(item.id);
  const teamPath = organizationUnitPath(item.orgUnitId) || "Unassigned";
  const moveOptions = state.workflow.statuses.filter((status) => status.id !== statusForInitiative(state.workflow, item).id);
  return `<article class="compact-card board-card ${busy ? "is-busy" : ""}" id="boardCard-${itemId}" data-item-id="${itemId}" draggable="${dragEnabled}" aria-busy="${busy}" tabindex="-1">
    <div class="board-card-heading"><h4>${escapeHtml(item.title)}</h4><span class="priority-score ${score.complete ? "" : "unscored"}" aria-label="${escapeHtml(score.label)} ${score.complete ? `score ${score.value}` : "unscored"}"><small>${escapeHtml(score.label)}</small><strong>${score.complete ? score.value : "Unscored"}</strong></span></div>
    ${initiativeTargetChips(item, 2)}
    <dl class="board-card-facts"><div><dt>Owner</dt><dd>${escapeHtml(organizationPersonName(item.pocPersonId) || item.owner || "Unowned")}</dd></div>${showTeam ? `<div><dt>Team</dt><dd title="${escapeHtml(teamPath)}" aria-label="Team: ${escapeHtml(teamPath)}">${escapeHtml(teamPath)}</dd></div>` : ""}</dl>
    <div class="board-card-actions">${initiativeDetailButton(item, `board-${item.id}`, "View")}<button class="secondary small" data-edit-item="${itemId}" type="button" ${readonly || busy ? "disabled" : ""} ${!score.complete ? `data-editor-focus="${escapeHtml(priorityEditorFocus(item, framework))}"` : ""}>${score.complete ? "Edit" : "Score"}</button>
      <details class="move-menu"><summary class="secondary small" ${readonly || busy ? 'aria-disabled="true"' : ""}>Move</summary><div class="move-menu-list" role="group" aria-label="Move ${escapeHtml(item.title)}">${moveOptions.map((status) => `<button data-move-item="${itemId}" data-move-status="${escapeHtml(status.id)}" type="button" ${readonly || busy ? "disabled" : ""}><span class="status-swatch status-${escapeHtml(status.color)}" aria-hidden="true"></span>${escapeHtml(status.name)}</button>`).join("")}</div></details>
    </div>
  </article>`;
}

function selectBoardTeam(event) {
  state.boardTeamId = event.currentTarget.value;
  state.boardStatus = "";
  pushViewUrl();
  render();
  document.querySelector("#boardTeamSelect")?.focus();
}

function selectMobileBoardStage(event) {
  state.mobileBoardStatusId = event.currentTarget.value;
  pushViewUrl();
  render();
  document.querySelector("#mobileBoardStage")?.focus();
}

function openBoardInitiativeEditor(event) {
  const statusId = event.currentTarget.dataset.addBoardStatus;
  const status = statusForId(state.workflow, statusId);
  openInitiativeEditor("new", event.currentTarget, "", { statusId: status.id, status: status.category, orgUnitId: event.currentTarget.dataset.addBoardTeam || "" });
}

function beginBoardDrag(event) {
  if (event.currentTarget.getAttribute("draggable") !== "true") return;
  state.draggedItemId = event.currentTarget.dataset.itemId;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", state.draggedItemId);
  event.currentTarget.classList.add("is-dragging");
}

function endBoardDrag(event) {
  event.currentTarget.classList.remove("is-dragging");
  document.querySelectorAll(".board-drop-zone.is-drag-over").forEach((column) => column.classList.remove("is-drag-over"));
  state.draggedItemId = "";
}

function boardDragOver(event) {
  if (!state.draggedItemId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  event.currentTarget.classList.add("is-drag-over");
}

function boardDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.classList.remove("is-drag-over");
}

async function dropBoardItem(event) {
  event.preventDefault();
  const itemId = state.draggedItemId || event.dataTransfer.getData("text/plain");
  const statusId = event.currentTarget.dataset.boardStatusId;
  endBoardDrag({ currentTarget: document.querySelector(`[data-item-id="${cssEscape(itemId)}"]`) || event.currentTarget });
  await moveInitiativeToStatus(itemId, statusId);
}

async function moveInitiativeFromMenu(event) {
  await moveInitiativeToStatus(event.currentTarget.dataset.moveItem, event.currentTarget.dataset.moveStatus);
}

async function moveInitiativeToStatus(itemId, statusId) {
  const item = state.items.find((entry) => entry.id === itemId);
  const target = state.workflow.statuses.find((status) => status.id === statusId);
  if (!item || !target || statusForInitiative(state.workflow, item).id === target.id || teamEditorReadOnlyReason()) return;
  const patch = { statusId: target.id, status: target.category };
  state.boardStatus = `Moving ${item.title} to ${target.name}.`;
  if (!state.team.active) {
    try {
      await commitLocalWorkspacePatch({ items: updateItem(state.items, item.id, patch) }, [createActivityEntry("updated", item, { statusId: { from: item.statusId, to: target.id }, status: { from: item.status, to: target.category } })]);
    } catch (error) { state.boardStatus = error.message; render(); return; }
    state.boardStatus = `${item.title} moved to ${target.name}.`;
    render();
    document.getElementById(`boardCard-${item.id}`)?.focus();
    return;
  }
  state.boardBusyItemId = item.id;
  state.team.mutationBusy = true;
  render();
  try {
    const result = await state.team.repository.updateItem(item.id, patch, item.version);
    applyTeamSnapshot(result?.snapshot);
    state.team.conflict = null;
    state.team.status = "Team workspace updated.";
    state.boardStatus = `${item.title} moved to ${target.name}.`;
  } catch (error) {
    state.boardStatus = `${item.title} was not moved. ${safeTeamError(error, "The team workspace could not save the change.")}`;
    if (isTeamConflict(error)) {
      const outcome = await resolveTeamConflictDraft(prepareTeamUpdateDraft({ operation: "update", itemId: item.id, itemTitle: item.title, patch }, item));
      state.boardStatus = outcome === "retried"
        ? `${item.title} moved to ${target.name}; an unrelated server edit was preserved.`
        : `${item.title} was not moved because the same fields changed elsewhere. Your move is available in conflict review.`;
    } else if (isTeamAccessLoss(error)) {
      state.boardBusyItemId = "";
      state.team.mutationBusy = false;
      await exitTeamForBoundary(teamAccessLossMessage(error));
      return;
    }
  } finally {
    state.boardBusyItemId = "";
    state.team.mutationBusy = false;
  }
  render();
  (document.getElementById(`boardCard-${item.id}`) || document.querySelector("#boardStatus"))?.focus();
}

function insightsSpaceView({ insightRecords }) {
  const modes = [["discovery", "Discovery"], ...(experienceHas("research-validation") ? [["research", "Research"], ["validation", "Validation"]] : []), ["feedback", "Feedback"], ...(experienceHas("customer-support") ? [["support", "Support"], ["customers", "Customers"]] : [])];
  const renderers = { discovery: discoveryView, research: researchView, validation: validationView, feedback: feedbackView, support: supportView, customers: customersView };
  if (state.selectedMode === "customers") return `${spaceModeMarkup(modes)}${customersView()}`;
  const type = ["discovery", "research", "validation", "feedback", "support"].includes(state.selectedMode) ? state.selectedMode : "discovery";
  const filtered = filterInsightRecords(insightRecords, { type, query: state.query, status: state.insightStatusFilter });
  return `${spaceModeMarkup(modes)}${insightToolbarMarkup(type)}${(renderers[state.selectedMode] || discoveryView)(filtered)}`;
}

function customersView() {
  const directory = state.customerDirectory;
  const stats = customerDirectoryStats(directory, state.items);
  const canManage = customerCanManage();
  const views = [["accounts", "Accounts"], ["segments", "Segments"], ["fields", "Fields & tags"]];
  return `<section class="customer-workspace" aria-labelledby="customerWorkspaceTitle">
    <div class="customer-hero"><div><p class="eyebrow">Customer intelligence</p><h3 id="customerWorkspaceTitle">Know who every initiative serves.</h3><p>Keep account context, reusable segmentation, and product priorities connected in one workspace.</p></div><div class="customer-hero-actions">${canManage ? `<button class="primary" id="newCustomerButton" type="button">New account</button>` : ""}<button class="secondary" id="exportCustomersButton" type="button">Export CSV</button></div></div>
    <section class="metrics customer-metrics" aria-label="Customer directory summary">${metric("Accounts", stats.accounts)}${metric("Segments", stats.segments)}${metric("Unsegmented", stats.unsegmented)}${metric("Linked initiatives", stats.linkedInitiatives)}</section>
    ${!canManage ? `<p class="readonly-banner">Viewer access is read-only. You can browse customer accounts and segment membership.</p>` : ""}
    ${state.customerStatus ? `<p class="customer-status" id="customerStatus" tabindex="-1" role="status" aria-live="polite">${escapeHtml(state.customerStatus)}</p>` : ""}
    <nav class="customer-subnav" aria-label="Customer directory views">${views.map(([id, label]) => `<button type="button" data-customer-view="${id}" class="${state.customerView === id ? "active" : ""}" ${state.customerView === id ? 'aria-current="page"' : ""}>${label}</button>`).join("")}</nav>
    ${state.customerView === "fields" ? `<p class="governance-note">Editors can manage accounts, tags, segments, imports, and initiative targets. Only workspace owners can define custom fields. Tags and fields used by saved rules or customer data stay protected from deletion.</p>` : ""}
    ${state.customerView === "segments" ? customerSegmentsMarkup(canManage) : state.customerView === "fields" ? customerFieldsTagsMarkup(canManage) : customerAccountsMarkup(canManage)}
  </section>`;
}

function customerAccountsMarkup(canManage) {
  const query = (state.customerQuery || state.query).trim().toLowerCase();
  const filtered = state.customerDirectory.accounts.filter((account) => {
    const tags = account.tagIds.map((id) => state.customerDirectory.tags.find((tag) => tag.id === id)?.name || "").join(" ");
    return `${account.name} ${account.domain} ${account.status} ${account.industry} ${account.region} ${account.planTier} ${tags}`.toLowerCase().includes(query);
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / 50));
  state.customerPage = Math.min(Math.max(1, state.customerPage), pageCount);
  const accounts = filtered.slice((state.customerPage - 1) * 50, state.customerPage * 50);
  const selected = state.selectedCustomerId === "new" ? null : state.customerDirectory.accounts.find((account) => account.id === state.selectedCustomerId) || accounts[0] || null;
  if (!state.selectedCustomerId && selected) state.selectedCustomerId = selected.id;
  const selectedSegments = selected ? state.customerDirectory.segments.filter((segment) => segmentMembers(segment, state.customerDirectory).some((account) => account.id === selected.id)) : [];
  return `<div class="customer-layout">
    <section class="panel customer-directory-panel" aria-labelledby="accountDirectoryTitle">
      <div class="customer-toolbar"><div><p class="panel-kicker">Directory</p><h3 id="accountDirectoryTitle">Company accounts</h3></div><label class="customer-search"><span class="sr-only">Search customer accounts</span><input id="customerSearch" type="search" value="${escapeHtml(state.customerQuery)}" placeholder="Search accounts, industries, regions…"></label></div>
      <div class="customer-import-actions">${canManage ? `<label class="file-button" for="customerCsvInput">Import CSV</label><input id="customerCsvInput" class="sr-only" type="file" accept=".csv,text/csv"><button class="secondary" id="downloadCustomerTemplate" type="button">CSV template</button>` : ""}<span class="muted">${filtered.length} matching accounts</span></div>
      ${customerImportPreviewMarkup(canManage)}
      <div class="customer-table-scroll"><table class="customer-table"><caption class="sr-only">Customer accounts</caption><thead><tr><th scope="col">Account</th><th scope="col">Status</th><th scope="col">Region</th><th scope="col">Plan</th><th scope="col">Owner</th></tr></thead><tbody>${accounts.map((account) => customerAccountRow(account, selected?.id)).join("") || `<tr><td colspan="5">${emptyState(query ? "No accounts match this search." : "Add your first company account or import a validated CSV.")}</td></tr>`}</tbody></table></div>
      <div class="customer-pagination"><button class="secondary" data-customer-page="${state.customerPage - 1}" ${state.customerPage <= 1 ? "disabled" : ""} type="button">Previous</button><span>Page ${state.customerPage} of ${pageCount}</span><button class="secondary" data-customer-page="${state.customerPage + 1}" ${state.customerPage >= pageCount ? "disabled" : ""} type="button">Next</button></div>
    </section>
    <aside class="panel customer-inspector" aria-label="${selected ? `Account details for ${escapeHtml(selected.name)}` : "New customer account"}">${customerAccountInspector(selected, selectedSegments, canManage)}</aside>
  </div>`;
}

function customerAccountRow(account, selectedId) {
  const owner = organizationPersonName(account.ownerPersonId) || "Unassigned";
  return `<tr class="${account.id === selectedId ? "active" : ""}"><th scope="row"><button class="customer-row-button" data-select-customer="${escapeHtml(account.id)}" type="button"><strong>${escapeHtml(account.name)}</strong><span>${escapeHtml(account.domain || "No domain")}</span></button></th><td><span class="customer-status-pill ${escapeHtml(account.status)}">${escapeHtml(titleCase(account.status))}</span></td><td>${escapeHtml(account.region || "—")}</td><td>${escapeHtml(account.planTier || "—")}</td><td>${escapeHtml(owner)}</td></tr>`;
}

function customerAccountInspector(account, segments, canManage) {
  const isNew = !account;
  const draft = state.customerAccountDrafts.get(account?.id || "new");
  const value = draft?.values || account || { id: "", name: "", domain: "", status: "prospect", industry: "", region: "", employeeCount: "", planTier: "", ownerPersonId: "", notes: "", tagIds: [], attributes: {} };
  return `<div class="inspector-heading"><p class="panel-kicker">${isNew ? "New account" : "Account profile"}</p><h3>${escapeHtml(isNew ? "Add a company" : value.name)}</h3><p>${isNew ? "Create an account that initiatives can target directly." : escapeHtml(value.domain || "No domain captured")}</p></div>
    ${!isNew ? `<div class="customer-chip-list" aria-label="Dynamic segment membership">${segments.map((segment) => `<span class="target-chip segment">${escapeHtml(segment.name)}</span>`).join("") || `<span class="muted">Not currently in a saved segment</span>`}</div>` : ""}
    <p id="customerAccountDraftStatus" role="status" ${draft ? "" : "hidden"}>Unsaved account draft. Kept in this tab until you save or discard it.</p>
    <button id="discardCustomerAccountDraft" class="secondary" type="button" ${draft ? "" : "hidden"}>Discard account draft</button>
    <form id="customerAccountForm" class="inspector-form" novalidate>
      <input type="hidden" name="accountId" value="${escapeHtml(value.id)}">
      <label><span>Name</span><input name="name" value="${escapeHtml(value.name)}" required ${canManage ? "" : "disabled"}></label>
      <label><span>Domain</span><input name="domain" value="${escapeHtml(value.domain)}" placeholder="company.com" ${canManage ? "" : "disabled"}></label>
      <div class="form-pair"><label><span>Lifecycle</span><select name="status" ${canManage ? "" : "disabled"}>${["prospect", "trial", "active", "churned"].map((status) => `<option value="${status}" ${status === value.status ? "selected" : ""}>${titleCase(status)}</option>`).join("")}</select></label><label><span>Plan tier</span><input name="planTier" value="${escapeHtml(value.planTier)}" ${canManage ? "" : "disabled"}></label></div>
      <div class="form-pair"><label><span>Industry</span><input name="industry" value="${escapeHtml(value.industry)}" ${canManage ? "" : "disabled"}></label><label><span>Region</span><input name="region" value="${escapeHtml(value.region)}" ${canManage ? "" : "disabled"}></label></div>
      <div class="form-pair"><label><span>Employees</span><input type="number" min="0" name="employeeCount" value="${escapeHtml(value.employeeCount ?? "")}" ${canManage ? "" : "disabled"}></label><label><span>Team owner</span><select name="ownerPersonId" ${canManage ? "" : "disabled"}><option value="">Unassigned</option>${personOptions(state.organization, value.ownerPersonId)}</select></label></div>
      ${customerTagChecklist(value.tagIds, canManage)}
      ${customerAttributeFields(value.attributes, canManage)}
      <label><span>Notes</span><textarea name="notes" ${canManage ? "" : "disabled"}>${escapeHtml(value.notes)}</textarea></label>
      ${canManage ? `<div class="inspector-actions">${!isNew ? `<button class="danger" id="deleteCustomerButton" data-customer-id="${escapeHtml(value.id)}" type="button">Delete</button>` : ""}<button class="primary" type="submit">${isNew ? "Add account" : "Save changes"}</button></div>` : ""}
    </form>`;
}

function customerTagChecklist(selectedIds, enabled) {
  return `<fieldset class="checklist-field"><legend>Tags</legend><div class="checklist-grid">${state.customerDirectory.tags.map((tag) => `<label><input type="checkbox" name="tagIds" value="${escapeHtml(tag.id)}" ${selectedIds.includes(tag.id) ? "checked" : ""} ${enabled ? "" : "disabled"}><span>${escapeHtml(tag.name)}</span></label>`).join("") || `<span class="muted">Create reusable tags in Fields & tags.</span>`}</div></fieldset>`;
}

function customerAttributeFields(attributes, enabled) {
  if (!state.customerDirectory.fields.length) return "";
  return `<fieldset class="custom-attributes"><legend>Custom attributes</legend>${state.customerDirectory.fields.map((field) => customerAttributeControl(field, attributes[field.id], enabled)).join("")}</fieldset>`;
}

function customerAttributeControl(field, value, enabled) {
  const name = `attribute.${field.id}`;
  if (field.type === "boolean") return `<label><span>${escapeHtml(field.name)}</span><select name="${escapeHtml(name)}" ${enabled ? "" : "disabled"}><option value="">Not set</option><option value="true" ${value === true ? "selected" : ""}>Yes</option><option value="false" ${value === false ? "selected" : ""}>No</option></select></label>`;
  if (field.type === "single-select") return `<label><span>${escapeHtml(field.name)}</span><select name="${escapeHtml(name)}" ${enabled ? "" : "disabled"}><option value="">Not set</option>${field.options.map((option) => `<option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></label>`;
  if (field.type === "multi-select") return `<fieldset class="checklist-field"><legend>${escapeHtml(field.name)}</legend><div class="checklist-grid">${field.options.map((option) => `<label><input type="checkbox" name="${escapeHtml(name)}" value="${escapeHtml(option)}" ${Array.isArray(value) && value.includes(option) ? "checked" : ""} ${enabled ? "" : "disabled"}><span>${escapeHtml(option)}</span></label>`).join("")}</div></fieldset>`;
  return `<label><span>${escapeHtml(field.name)}</span><input name="${escapeHtml(name)}" type="${field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}" value="${escapeHtml(value ?? "")}" ${enabled ? "" : "disabled"}></label>`;
}

function customerImportPreviewMarkup(canManage) {
  const current = state.customerImport;
  if (!current) return "";
  return `<section class="customer-import-preview" aria-labelledby="customerImportTitle"><div><h4 id="customerImportTitle">${escapeHtml(current.name)}</h4><p>${current.preview.valid ? `${current.preview.creates} accounts to create · ${current.preview.updates} to update. Preview only—nothing changes until you apply the import, when PM OS creates a recovery snapshot.` : `${current.preview.errors.length} validation errors. Nothing will be changed; fix every row-level error and preview the file again.`}</p></div>${current.preview.valid && canManage ? `<button class="primary" id="applyCustomerImport" type="button">Apply import</button>` : ""}<button class="secondary" id="cancelCustomerImport" type="button">Cancel</button>${current.preview.errors.length ? `<ul aria-label="Customer import errors">${current.preview.errors.slice(0, 8).map((entry) => `<li>Row ${entry.row}, ${escapeHtml(entry.field)}: ${escapeHtml(entry.message)}</li>`).join("")}</ul>` : ""}</section>`;
}

function customerSegmentsMarkup(canManage) {
  const selected = state.selectedSegmentId === "new" ? null : state.customerDirectory.segments.find((segment) => segment.id === state.selectedSegmentId) || state.customerDirectory.segments[0] || null;
  if (!state.selectedSegmentId && selected) state.selectedSegmentId = selected.id;
  const draft = state.customerSegmentDraft || selected || { id: "", name: "", description: "", match: "all", rules: [{ id: "new-rule", field: "status", operator: "equals", value: "active" }] };
  return `<div class="customer-layout segment-layout"><section class="panel customer-directory-panel"><div class="customer-toolbar"><div><p class="panel-kicker">Dynamic audiences</p><h3>Saved segments</h3></div>${canManage ? `<button class="primary" id="newSegmentButton" type="button">New segment</button>` : ""}</div><div class="segment-list">${state.customerDirectory.segments.map((segment) => { const count = segmentMembers(segment, state.customerDirectory).length; return `<button class="segment-list-row ${segment.id === selected?.id ? "active" : ""}" data-select-segment="${escapeHtml(segment.id)}" type="button"><span><strong>${escapeHtml(segment.name)}</strong><small>${escapeHtml(segmentRuleSummary(segment))}</small></span><b>${count}</b></button>`; }).join("") || emptyState("Create a saved segment from account fields, custom fields, or tags.")}</div></section><aside class="panel customer-inspector">${customerSegmentInspector(draft, selected, canManage)}</aside></div>`;
}

function customerSegmentInspector(draft, selected, canManage) {
  const matched = selected ? segmentMembers(selected, state.customerDirectory) : [];
  return `<div class="inspector-heading"><p class="panel-kicker">Rule builder</p><h3>${escapeHtml(selected ? selected.name : "New segment")}</h3><p>Membership updates automatically whenever an account changes.</p></div>${selected ? `<div class="segment-preview"><strong>${matched.length} matched</strong><span>${matched.slice(0, 4).map((account) => account.name).join(", ") || "No matching accounts"}</span></div>` : ""}<form id="customerSegmentForm" class="inspector-form"><input type="hidden" name="segmentId" value="${escapeHtml(selected?.id || "")}"><label><span>Name</span><input name="name" value="${escapeHtml(draft.name)}" required ${canManage ? "" : "disabled"}></label><label><span>Description</span><textarea name="description" ${canManage ? "" : "disabled"}>${escapeHtml(draft.description)}</textarea></label><label><span>Match</span><select name="match" ${canManage ? "" : "disabled"}><option value="all" ${draft.match === "all" ? "selected" : ""}>All rules</option><option value="any" ${draft.match === "any" ? "selected" : ""}>Any rule</option></select></label><fieldset class="segment-rules"><legend>Rules</legend>${draft.rules.map((rule, index) => customerRuleRow(rule, index, canManage)).join("") || `<p class="muted">Add at least one rule.</p>`}</fieldset>${canManage ? `<button class="secondary" id="addSegmentRule" type="button">Add rule</button><div class="inspector-actions">${selected ? `<button class="danger" id="deleteSegmentButton" data-segment-id="${escapeHtml(selected.id)}" type="button">Delete</button>` : ""}<button class="primary" type="submit">Save segment</button></div>` : ""}</form>`;
}

function customerRuleRow(rule, index, enabled) {
  const fieldOptions = customerRuleFieldOptions(rule.field);
  return `<div class="segment-rule"><span class="rule-number" aria-hidden="true">${index + 1}</span><label><span class="sr-only">Field for rule ${index + 1}</span><select name="rule.${index}.field" ${enabled ? "" : "disabled"}>${fieldOptions}</select></label><label><span class="sr-only">Operator for rule ${index + 1}</span><select name="rule.${index}.operator" ${enabled ? "" : "disabled"}>${customerOperatorOptions(rule.field, rule.operator)}</select></label><label><span class="sr-only">Value for rule ${index + 1}</span>${customerRuleValueControl(rule, index, enabled)}</label>${enabled ? `<button class="icon-button" data-remove-segment-rule="${index}" type="button" aria-label="Remove rule ${index + 1}">×</button>` : ""}</div>`;
}

function customerRuleValueControl(rule, index, enabled) {
  const name = `rule.${index}.value`;
  const selected = Array.isArray(rule.value) ? rule.value.map(String) : [String(rule.value ?? "")];
  const disabled = enabled && !["is_set", "not_set"].includes(rule.operator) ? "" : "disabled";
  let options = null;
  if (rule.field === "tags") options = state.customerDirectory.tags.map((tag) => [tag.id, tag.name]);
  else if (rule.field === "status") options = ["prospect", "trial", "active", "churned"].map((value) => [value, titleCase(value)]);
  else if (rule.field === "ownerPersonId") options = state.organization.people.map((person) => [person.id, person.displayName]);
  else if (rule.field.startsWith("custom:")) {
    const field = state.customerDirectory.fields.find((entry) => entry.id === rule.field.slice(7));
    if (field?.type === "boolean") options = [["true", "Yes"], ["false", "No"]];
    else if (["single-select", "multi-select"].includes(field?.type)) options = field.options.map((value) => [value, value]);
  }
  if (options) {
    const multiple = customerRuleFieldType(rule.field) === "multi-select" || rule.operator === "in";
    return `<select name="${escapeHtml(name)}" ${multiple ? "multiple" : ""} ${disabled}>${options.map(([value, label]) => `<option value="${escapeHtml(value)}" ${selected.includes(String(value)) ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select>`;
  }
  return `<input name="${escapeHtml(name)}" type="${customerRuleFieldType(rule.field) === "number" ? "text" : customerRuleFieldType(rule.field) === "date" ? "date" : "text"}" value="${escapeHtml(Array.isArray(rule.value) ? rule.value.join(", ") : rule.value ?? "")}" ${disabled}>`;
}

function customerRuleFieldOptions(selected) {
  const builtIns = [["name", "Account name"], ["domain", "Domain"], ["status", "Lifecycle status"], ["industry", "Industry"], ["region", "Region"], ["employeeCount", "Employee count"], ["planTier", "Plan tier"], ["ownerPersonId", "Team owner"], ["notes", "Notes"], ["tags", "Tags"]];
  return [...builtIns, ...state.customerDirectory.fields.map((field) => [`custom:${field.id}`, field.name])].map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
}

function customerOperatorOptions(field, selected) {
  const type = customerRuleFieldType(field);
  const operators = type === "number" || type === "date" ? [["equals", "equals"], ["gt", "is greater than"], ["gte", "is at least"], ["lt", "is less than"], ["lte", "is at most"], ["between", "is between"], ["is_set", "is set"], ["not_set", "is not set"]] : type === "multi-select" ? [["contains_any", "contains any"], ["contains_all", "contains all"], ["contains_none", "contains none"], ["is_set", "is set"], ["not_set", "is not set"]] : type === "boolean" ? [["equals", "equals"], ["is_set", "is set"], ["not_set", "is not set"]] : [["equals", "equals"], ["not_equals", "does not equal"], ["contains", "contains"], ["in", "is one of"], ["is_set", "is set"], ["not_set", "is not set"]];
  return operators.map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`).join("");
}

function customerRuleFieldType(field) {
  if (field === "employeeCount") return "number";
  if (field === "tags") return "multi-select";
  if (field.startsWith("custom:")) return state.customerDirectory.fields.find((entry) => entry.id === field.slice(7))?.type || "text";
  return field === "status" ? "single-select" : "text";
}

function customerFieldsTagsMarkup(canManage) {
  const owner = customerCanManageFields();
  return `<div class="governance-grid"><section class="panel governance-panel"><div class="panel-header"><div><p class="panel-kicker">Reusable classification</p><h3>Tags</h3></div><span class="muted">${state.customerDirectory.tags.length} / 200</span></div><div class="governance-list">${state.customerDirectory.tags.map((tag) => `<form class="governance-row customerTagForm"><input type="hidden" name="tagId" value="${escapeHtml(tag.id)}"><label><span class="sr-only">Tag name</span><input name="name" value="${escapeHtml(tag.name)}" ${canManage ? "" : "disabled"}></label>${canManage ? `<button class="secondary" type="submit">Save</button><button class="danger" data-delete-tag="${escapeHtml(tag.id)}" type="button">Delete</button>` : ""}</form>`).join("") || emptyState("Tags provide manual, reusable account classification.")}</div>${canManage ? `<form id="newCustomerTagForm" class="governance-create"><label><span>New tag</span><input name="name" required placeholder="e.g. Design partner"></label><button class="primary" type="submit">Add tag</button></form>` : ""}</section><section class="panel governance-panel"><div class="panel-header"><div><p class="panel-kicker">Typed schema</p><h3>Custom fields</h3></div><span class="muted">${state.customerDirectory.fields.length} / 50</span></div>${!owner ? `<p class="readonly-banner">Only workspace owners can change field definitions.</p>` : ""}<div class="governance-list">${state.customerDirectory.fields.map((field) => `<form class="governance-row customerFieldForm"><input type="hidden" name="fieldId" value="${escapeHtml(field.id)}"><label><span class="sr-only">Field name</span><input name="name" value="${escapeHtml(field.name)}" ${owner ? "" : "disabled"}></label><select name="type" aria-label="Type for ${escapeHtml(field.name)}" ${owner ? "" : "disabled"}>${["text", "number", "boolean", "date", "single-select", "multi-select"].map((type) => `<option value="${type}" ${type === field.type ? "selected" : ""}>${titleCase(type)}</option>`).join("")}</select><label><span class="sr-only">Options separated by commas</span><input name="options" value="${escapeHtml(field.options.join(", "))}" placeholder="Options, comma separated" ${owner && ["single-select", "multi-select"].includes(field.type) ? "" : "disabled"}></label>${owner ? `<button class="secondary" type="submit">Save</button><button class="danger" data-delete-field="${escapeHtml(field.id)}" type="button">Delete</button>` : ""}</form>`).join("") || emptyState("Typed fields add product-specific customer context.")}</div>${owner ? `<form id="newCustomerFieldForm" class="governance-create field-create"><label><span>Field name</span><input name="name" required></label><label><span>Type</span><select name="type">${["text", "number", "boolean", "date", "single-select", "multi-select"].map((type) => `<option value="${type}">${titleCase(type)}</option>`).join("")}</select></label><label><span>Options</span><input name="options" placeholder="For select fields, comma separated"></label><button class="primary" type="submit">Add field</button></form>` : ""}</section></div>`;
}

function segmentRuleSummary(segment) {
  if (!segment.rules.length) return "No rules";
  return `${segment.match === "all" ? "All" : "Any"} · ${segment.rules.length} ${segment.rules.length === 1 ? "rule" : "rules"}`;
}

function planningSpaceView({ filteredItems, groups }) {
  const modes = [...(experienceHas("timeline-planning") ? [["quarter", "Plan"], ["roadmap", "Roadmap"]] : []), ...(experienceHas("portfolio-planning") ? [["capacity", "Capacity"], ["outcomes", "Outcomes"], ["metrics", "Metrics"]] : [])];
  const renderers = {
    quarter: planningView,
    roadmap: (items) => roadmapView(items, groups),
    capacity: capacityView,
    outcomes: outcomesView,
    metrics: metricsView
  };
  return `${spaceModeMarkup(modes)}${(renderers[state.selectedMode] || planningView)(filteredItems)}`;
}

function deliverySpaceView({ filteredItems }) {
  const modes = [...(experienceHas("delivery-tracking") ? [["board", "Board"], ["dependencies", "Dependencies"]] : []), ...(experienceHas("launch-readiness") ? [["readiness", "Readiness"], ["launch", "Launch"], ["enablement", "Enablement"]] : [])];
  const renderers = {
    board: deliveryView,
    dependencies: dependenciesView,
    readiness: rolloutsView,
    launch: launchView,
    enablement: enablementView
  };
  return `${spaceModeMarkup(modes)}${(renderers[state.selectedMode] || deliveryView)(filteredItems)}`;
}

function briefingsSpaceView({ items }) {
  const modes = [...(experienceHas("leadership-briefing") ? [["executive", "Executive"], ["stakeholders", "Stakeholders"], ["escalations", "Escalations"], ["decisions", "Decisions"], ["operations", "Operations"]] : []), ...(experienceHas("communications-reviews") ? [["updates", "Updates"], ["comms", "Comms"], ["meetings", "Meetings"], ["review", "Review"], ["retros", "Retros"], ["specs", "Specs"], ["templates", "Templates"]] : [])];
  const renderers = {
    executive: briefView,
    updates: updatesView,
    stakeholders: stakeholdersView,
    escalations: escalationsView,
    comms: commsView,
    decisions: decisionsView,
    meetings: meetingsView,
    review: reviewView,
    retros: retrosView,
    operations: operationsView,
    specs: specsView,
    templates: templatesView
  };
  const documentType = state.selectedMode === "templates" ? `template:${state.selectedTemplate}` : state.selectedMode === "meetings" ? `meeting:${state.selectedMeeting}` : state.selectedMode;
  const documentEntry = !["decisions", "operations"].includes(state.selectedMode) ? `<div class="data-actions"><button class="secondary" data-open-document="${escapeHtml(documentType)}" data-document-initiative="${state.selectedMode === "specs" ? escapeHtml(state.selectedSpecId || "") : ""}" type="button">Create a document</button><p>Choose its scope and edit the draft in Documents.</p></div>` : "";
  return `${spaceModeMarkup(modes)}${documentEntry}${(renderers[state.selectedMode] || briefView)(items)}`;
}

function settingsSpaceView() {
  const modes = [["setup", "Workspace setup"], ["data", "Data & backup"], ...(experienceHas("custom-workflow") ? [["workflow", "Workflow"]] : []), ...(experienceHas("timeline-planning") ? [["calendar", "Planning calendar"]] : []), ...(experienceHas("advanced-prioritization") ? [["prioritization", "Prioritization"]] : []), ...(experienceHas("activity-history") ? [["activity", "Activity"]] : [])];
  const renderers = { setup: workspaceSetupView, data: dataView, workflow: workflowSettingsView, calendar: planningCalendarView, prioritization: prioritizationSettingsView, activity: activityView };
  return `${spaceModeMarkup(modes)}<div id="pm-os-update-settings">${serviceWorkerUpdateSettingsMarkup()}</div>${(renderers[state.selectedMode] || workspaceSetupView)()}<section class="panel workspace-release" aria-labelledby="workspaceReleaseTitle"><h3 id="workspaceReleaseTitle">About PM OS</h3><p>${APP_RELEASE.edition === "ide" ? "IDE edition" : "Web edition"} · Version ${escapeHtml(APP_RELEASE.version)}</p><p>Workspace release <code id="workspaceReleaseId">${escapeHtml(APP_RELEASE.id)}</code></p><p class="muted">Include this release ID when reporting an issue. It identifies this workspace interface, including when used offline.</p><details class="expert-details"><summary>Edition differences</summary><p>Both editions share Today, Work, Insights, Settings and the project storage flows.</p><p>${APP_RELEASE.edition === "ide" ? "This edition also includes Build. Coding sessions and repository access require PM OS Desktop; the browser can review saved build summaries." : "This edition focuses on product management. Local coding sessions are available in the IDE edition through PM OS Desktop."}</p><p>Connected services, the Desktop runtime and deployment configuration are versioned separately.</p></details></section>`;
}

function managerHomeView(items) {
  const brief = buildExecutiveBrief(items, new Date(), state.prioritization, themeEvidenceOptions());
  const memo = buildExecutiveBriefMemo(items, new Date(), state.prioritization, themeEvidenceOptions());
  return `<section class="role-home" aria-labelledby="managerHomeTitle">
    <header class="role-home-heading"><div><p class="panel-kicker">Manager home</p><h3 id="managerHomeTitle">Portfolio overview</h3><p>${escapeHtml(brief.headline)}</p></div><div class="data-actions"><button class="secondary" data-jump-space="initiatives" data-jump-mode="priorities" type="button">Review priorities</button><button class="secondary" id="copyManagerBriefButton" type="button">Copy briefing</button><button class="secondary" id="downloadManagerBriefButton" type="button">Download briefing</button></div></header>
    <p class="muted">From the current search results. Review source initiatives to resolve an ask or record a decision.</p>
    <div class="role-home-grid">
      <section class="panel"><h3>Leading priorities</h3><div class="brief-list">${brief.priorities.map(briefPriorityCard).join("") || emptyState("No active priorities yet.")}</div></section>
      <section class="panel"><h3>Risks to review</h3><div class="brief-list">${brief.risks.map(briefRiskCard).join("") || emptyState("No active risks detected.")}</div><p class="muted">Shows up to five initiatives with the highest risk signals.</p></section>
      <section class="panel" aria-labelledby="managerDecisionsTitle"><h3 id="managerDecisionsTitle">Decisions needed</h3><div class="brief-list">${brief.decisions.map(briefDecisionCard).join("") || emptyState("No pending decisions for active work.")}</div></section>
      <section class="panel"><h3>Leadership asks</h3><div class="brief-list">${brief.asks.map(briefAskCard).join("") || emptyState("No leadership asks right now.")}</div><p class="muted">Suggested actions from risks, decisions, and missing measurement details.</p></section>
    </div><details class="panel role-home-details"><summary>Briefing to share</summary><label for="managerBriefDraft">Manager briefing Markdown</label><textarea id="managerBriefDraft" readonly>${escapeHtml(memo)}</textarea></details>
  </section>`;
}

function administratorHomeView() {
  const check = state.homeHealth;
  const portable = JSON.parse(exportPortableWorkspace());
  const model = Object.keys(portable).filter(key => !["exportedAt", "schema"].includes(key)).map(key => `<li><code>${escapeHtml(key)}</code> — ${Array.isArray(portable[key]) ? `${portable[key].length} records` : "workspace settings"}</li>`).join("");
  return `<section class="role-home" aria-labelledby="administratorHomeTitle"><header class="role-home-heading"><div><p class="panel-kicker">Administrator home</p><h3 id="administratorHomeTitle">Workspace operations</h3><p>Inspect storage, export your work, and check the current connection. These views keep your existing access permissions.</p></div><button class="secondary" data-jump-space="settings" data-jump-mode="data" type="button">Manage integrations and backups</button></header>
    <div class="role-home-grid">${dataOverviewMarkup()}
      <section class="panel" aria-labelledby="deploymentHealthTitle"><div class="panel-header"><h3 id="deploymentHealthTitle">Deployment health</h3><button class="secondary" id="checkHomeHealthButton" type="button" ${check?.busy ? "disabled" : ""}>${check?.busy ? "Checking…" : "Check health"}</button></div><dl class="home-health-facts"><div><dt>Page connection</dt><dd>${location.protocol === "https:" ? "HTTPS" : ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) ? "Local development" : "HTTP — use HTTPS for a hosted workspace"}</dd></div><div><dt>Workspace connection</dt><dd data-save-status>${escapeHtml(globalSyncLabel())}</dd></div></dl><p id="homeHealthStatus" role="status" aria-live="polite">${escapeHtml(check?.status || "Not checked yet. Run a fresh page and active-server check.")}</p><p class="muted">A point-in-time reachability check, not an uptime monitor. Browser and file storage do not require a Team server.</p></section>
      <section class="panel"><h3>Data model and API</h3><p>Portable format: <code>${escapeHtml(portable.schema)}</code>. The backup contains these collections and settings:</p><ul class="home-model-list">${model}</ul><p>Connected servers use authenticated database API calls. Read-only checks use <code>POST /rest/v1/rpc/pm_list_workspaces</code>; membership controls the workspaces returned. Browser storage has no server API.</p><details class="role-home-details"><summary>Inspect complete workspace JSON</summary><label for="exportPreview">Complete workspace JSON</label><textarea id="exportPreview" readonly>${escapeHtml(JSON.stringify(portable, null, 2))}</textarea></details><div class="data-actions"><button class="secondary" id="exportButton" type="button" ${state.dataBusy ? "disabled" : ""}>Download backup</button><button class="secondary" id="exportCsvButton" type="button" ${state.dataBusy ? "disabled" : ""}>Export CSV</button></div><p id="dataStatus" role="status" tabindex="-1">${escapeHtml(state.dataStatus)}</p>${state.team.active ? `<p id="teamStatus" role="${state.team.error ? "alert" : "status"}" tabindex="-1" aria-live="polite">${escapeHtml(state.team.status)}</p>` : ""}<p class="muted">Team membership, connection configuration, and sessions are excluded from backups. CSV follows the current timeline scope.</p></section>
      <section class="panel"><h3>Integration setup</h3><p>Open storage settings to connect a linked file, Google Drive, or a local or remote Team server. The active project remains open while another source is prepared.</p><button class="secondary" data-jump-space="settings" data-jump-mode="data" type="button">Open storage settings</button><p>Workflow visibility is configured separately from membership and server access.</p><button class="secondary" data-jump-space="settings" data-jump-mode="setup" type="button">Configure workspace workflows</button></section>
    </div><details class="role-home-details panel"><summary>Audit trail and change digest</summary>${activityView()}</details></section>`;
}

async function checkHomeHealth() {
  if (state.homeHealth?.busy) return;
  const projectId = currentProjectDescriptor(state.projects, state.team)?.id;
  const workspaceId = state.team.active ? state.team.workspace?.id : "";
  const client = state.team.client;
  const check = { busy: true, status: "Checking the page host and active server…" };
  state.homeHealth = check;
  const trigger = document.querySelector("#checkHomeHealthButton");
  if (trigger) { trigger.disabled = true; trigger.textContent = "Checking…"; }
  const status = document.querySelector("#homeHealthStatus");
  if (status) status.textContent = check.status;
  const timeout = promise => {
    let timer;
    return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Timed out")), 8000); })]).finally(() => clearTimeout(timer));
  };
  const [page, server] = await Promise.allSettled([
    fetch(new URL("index.html", location.href), { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(8000) }).then(response => { if (!response.ok) throw new Error("Page unavailable"); }),
    workspaceId ? timeout(client.teamService.listWorkspaces()).then(rows => { if (!rows.some(row => row.id === workspaceId)) throw new Error("Workspace unavailable"); }) : Promise.resolve()
  ]);
  if (state.homeHealth !== check || currentProjectDescriptor(state.projects, state.team)?.id !== projectId || state.team.client !== client || (state.team.active ? state.team.workspace?.id : "") !== workspaceId) return;
  check.busy = false;
  check.status = `Checked ${new Date().toLocaleTimeString()}. Page host: ${page.status === "fulfilled" ? "reachable" : "unavailable"}. ${workspaceId ? `Active server: ${server.status === "fulfilled" ? "authorized workspace reachable" : "could not verify access or reach the server"}.` : "No active Team server to check."}`;
  if (state.selectedView === "today" && state.selectedMode === "admin") {
    const button = document.querySelector("#checkHomeHealthButton");
    if (button) { button.disabled = false; button.textContent = "Check health"; }
    const status = document.querySelector("#homeHealthStatus");
    if (status) status.textContent = check.status;
  }
}

function simpleItemCard(item) {
  return `<article class="item-card simple-item-card"><div><span>${escapeHtml(initiativeStatusLabel(item))}</span><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.nextStep || "Add the next step")}</p></div><div class="contextual-card-actions">${initiativeDetailButton(item, `simple-${elementIdToken(item.id)}`, "Open")}${initiativeContextualEditButton(item, `today-next-step-${elementIdToken(item.id)}`, "nextStep", item.nextStep.trim() ? "Update next step" : "Add next step")}</div></article>`;
}

function simpleWeeklyUpdate(items) {
  return buildWeeklyUpdateMarkdown(items, state.prioritization, themeEvidenceOptions());
}

function workspaceSetupView() {
  const experience = draftWorkspaceExperience();
  const canManage = workflowCanManage();
  return `<section class="workspace-setup" aria-labelledby="workspaceSetupTitle">
    <div class="workspace-setup-hero"><div><p class="eyebrow">One simple workspace</p><h3 id="workspaceSetupTitle">Choose the supporting workflows you need.</h3><p>Today, Work, Insights, and Settings always stay in the same place. Optional workflows open from those four areas, and turning one off never deletes its data.</p></div></div>
    ${!canManage ? `<p class="readonly-banner">Only workspace owners can change which capabilities are visible.</p>` : ""}
    ${state.experienceStatus ? `<p class="organization-status" id="experienceStatus" tabindex="-1" role="status" aria-live="polite">${escapeHtml(state.experienceStatus)}</p>` : ""}
    <section class="panel core-capabilities" aria-labelledby="coreCapabilitiesTitle"><div class="panel-header"><div><p class="panel-kicker">Always available</p><h3 id="coreCapabilitiesTitle">Workspace</h3></div><span class="locked-pill">Always on</span></div><div class="core-capability-grid">${["Today", "Work", "Insights", "Settings"].map((label) => `<div><span aria-hidden="true">✓</span><strong>${label}</strong></div>`).join("")}</div></section>
    <section class="panel workspace-presets" aria-labelledby="workspacePresetsTitle"><h3 id="workspacePresetsTitle">Start with tools for your work</h3><p>Choose a preset, then adjust any workflow below. This changes tools for this workspace; it does not change anyone's Team permissions.</p><label><span>Workspace preset</span><select id="workspacePreset" ${canManage ? "" : "disabled"}>${WORKSPACE_PRESETS.map(preset => `<option value="${preset.id}" ${preset.id === (state.experiencePresetChoice || matchingWorkspacePreset(experience)) ? "selected" : ""}>${escapeHtml(preset.label)}</option>`).join("")}</select></label></section>
    <div class="bundle-grid">${EXPERIENCE_BUNDLES.map((bundle) => experienceBundleMarkup(bundle, experience, canManage)).join("")}</div>
    ${canManage ? `<div class="workspace-setup-actions"><button class="primary" id="saveExperienceButton" type="button" ${state.experienceBusy ? "disabled" : ""}>${state.experienceBusy ? "Saving…" : "Save workflows"}</button></div>` : ""}
  </section>`;
}

function experienceBundleMarkup(bundle, experience, canManage) {
  const bundleState = workspaceBundleState(experience, bundle.id);
  const capabilities = EXPERIENCE_CAPABILITIES.filter((capability) => capability.bundleId === bundle.id);
  return `<section class="panel bundle-card" aria-labelledby="bundle-${escapeHtml(bundle.id)}"><div class="bundle-heading"><div><p class="panel-kicker">Workflow bundle</p><h3 id="bundle-${escapeHtml(bundle.id)}">${escapeHtml(bundle.label)}</h3><p>${escapeHtml(bundle.description)}</p></div><button class="bundle-switch ${bundleState}" data-experience-bundle="${escapeHtml(bundle.id)}" type="button" role="checkbox" aria-checked="${bundleState === "mixed" ? "mixed" : bundleState === "on"}" ${canManage ? "" : "disabled"}><span aria-hidden="true"></span><strong>${bundleState === "mixed" ? "Mixed" : bundleState === "on" ? "On" : "Off"}</strong></button></div><div class="capability-list">${capabilities.map((capability) => `<label><input type="checkbox" data-experience-capability="${escapeHtml(capability.id)}" ${experience.enabledCapabilities.includes(capability.id) ? "checked" : ""} ${canManage ? "" : "disabled"}><span><strong>${escapeHtml(capability.label)}</strong><small>${escapeHtml(capability.description)}</small></span></label>`).join("")}</div></section>`;
}

function draftWorkspaceExperience() {
  return normalizeWorkspaceExperience({ version: state.experience.version, enabledCapabilities: state.experienceDraft });
}

function setExperienceDraft(next) {
  state.experiencePresetChoice = "";
  state.experienceDraft = [...normalizeWorkspaceExperience(next).enabledCapabilities];
  state.experienceStatus = "Workspace changes are ready to save.";
  render();
  queueMicrotask(() => document.querySelector("#experienceStatus")?.focus());
}

function toggleExperienceBundle(event) {
  const current = draftWorkspaceExperience();
  const enabled = workspaceBundleState(current, event.currentTarget.dataset.experienceBundle) !== "on";
  setExperienceDraft(updateWorkspaceExperience(current, { bundleId: event.currentTarget.dataset.experienceBundle, enabled }));
}

function toggleExperienceCapability(event) {
  setExperienceDraft(updateWorkspaceExperience(draftWorkspaceExperience(), { capabilityId: event.currentTarget.dataset.experienceCapability, enabled: event.currentTarget.checked }));
}

async function saveWorkspaceExperience() {
  if (!workflowCanManage() || state.experienceBusy) return;
  state.experienceBusy = true;
  state.experienceStatus = "Saving workspace experience…";
  render();
  try {
    const next = normalizeWorkspaceExperience({ version: state.experience.version + 1, enabledCapabilities: state.experienceDraft });
    if (state.team.active) {
      const result = await state.team.repository.updateExperience(next, state.experience.version);
      applyTeamSnapshot(result?.snapshot);
    } else {
      const previous = state.experience;
      await commitLocalWorkspacePatch({ experience: next }, [createActivityEntry("workspace-experience-updated", { title: "Workspace experience" }, { experience: { from: workspaceExperienceProfile(previous), to: workspaceExperienceProfile(next) } })]);
    }
    state.experienceDraft = [...state.experience.enabledCapabilities];
    state.experienceStatus = "Workspace experience saved. Hidden capability data is unchanged.";
    recoverUnavailableRoute();
  } catch (error) {
    state.experienceStatus = error?.code === "VERSION_CONFLICT" ? "The workspace changed elsewhere. Refresh and try again." : `Workspace setup was not saved. ${error?.message || "Try again."}`;
  } finally {
    state.experienceBusy = false;
    render();
    queueMicrotask(() => document.querySelector("#experienceStatus")?.focus());
  }
}

function prioritizationSettingsView() {
  const config = normalizePrioritization(state.prioritization);
  const frameworks = priorityFrameworks(config);
  const canManage = workflowCanManage();
  const selected = config.customFrameworks.find((framework) => framework.id === state.selectedPriorityFrameworkId)
    || config.customFrameworks[0] || null;
  state.selectedPriorityFrameworkId = selected?.id || "";
  return `<section class="prioritization-settings" aria-labelledby="prioritizationSettingsTitle">
    <div class="workflow-hero"><div><p class="eyebrow">Flexible prioritization</p><h3 id="prioritizationSettingsTitle">Choose the comparison that fits the decision.</h3><p>Use one workspace default for cross-team views, then opt individual teams into a different framework when their work needs another lens.</p></div>${canManage ? `<button class="primary" id="addPriorityFrameworkButton" type="button" ${config.customFrameworks.length >= 10 ? "disabled" : ""}>New custom framework</button>` : ""}</div>
    ${!canManage ? `<p class="readonly-banner">Only workspace owners can change defaults, team overrides, or custom frameworks.</p>` : ""}
    ${state.prioritizationStatus ? `<p class="organization-status" id="prioritizationStatus" tabindex="-1" role="status">${escapeHtml(state.prioritizationStatus)}</p>` : ""}
    <div class="prioritization-grid">
      <section class="panel priority-default-panel"><div class="panel-header"><div><p class="panel-kicker">Cross-team default</p><h3>Workspace framework</h3></div></div>
        <form id="priorityDefaultForm"><label><span>Default framework</span><select name="defaultFrameworkId" ${canManage ? "" : "disabled"}>${priorityFrameworkOptions(config.defaultFrameworkId, frameworks)}</select></label><p class="field-note">Boards for All teams and Unassigned, plus portfolio and briefing views, use this framework.</p>${canManage ? `<button class="primary" type="submit">Save default</button>` : ""}</form>
      </section>
      <section class="panel priority-reference-panel"><div class="panel-header"><div><p class="panel-kicker">Built in</p><h3>Scoring reference</h3></div></div><div class="priority-reference-list">${BUILT_IN_PRIORITY_FRAMEWORKS.map((framework) => `<article><div><strong>${escapeHtml(framework.name)}</strong><span>${escapeHtml(framework.description)}</span></div><code>${escapeHtml(framework.formula)}</code></article>`).join("")}</div></section>
    </div>
    ${priorityOrderingSettingsMarkup(config, canManage)}
    <section class="panel team-priority-panel"><div class="panel-header"><div><p class="panel-kicker">Exact-team boards</p><h3>Team overrides</h3></div><span class="muted">No descendant roll-up</span></div>
      <form id="teamPriorityOverridesForm"><div class="team-priority-list">${state.organization.units.map((unit) => `<label><span><strong>${escapeHtml(organizationUnitPath(unit.id))}</strong><small>${state.items.filter((item) => item.orgUnitId === unit.id).length} direct initiatives</small></span><select name="team_${escapeHtml(unit.id)}" ${canManage ? "" : "disabled"}><option value="" ${!unit.priorityFrameworkId ? "selected" : ""}>Use workspace default</option>${priorityFrameworkOptions(unit.priorityFrameworkId, frameworks)}</select></label>`).join("") || emptyState("Add organization units to configure team-specific boards.")}</div>${canManage && state.organization.units.length ? `<button class="primary" type="submit">Save team overrides</button>` : ""}</form>
    </section>
    <div class="custom-framework-layout">
      <section class="panel custom-framework-list"><div class="panel-header"><div><p class="panel-kicker">Safe custom models</p><h3>Custom frameworks</h3></div><span class="muted">${config.customFrameworks.length} / 10</span></div><div>${config.customFrameworks.map((framework) => `<button type="button" class="custom-framework-select ${framework.id === selected?.id ? "active" : ""}" data-select-priority-framework="${escapeHtml(framework.id)}" aria-pressed="${framework.id === selected?.id}"><span><strong>${escapeHtml(framework.name)}</strong><small>${framework.fields.length} weighted criteria</small></span><span>0–100</span></button>`).join("") || emptyState("Create a custom framework with two to eight weighted criteria.")}</div></section>
      ${selected ? customPriorityFrameworkEditor(selected, canManage) : `<aside class="panel custom-framework-empty"><p class="panel-kicker">Custom scoring</p><h3>No custom framework selected</h3><p>Built-ins are ready now. Create a custom framework when your team needs criteria specific to your product.</p></aside>`}
    </div>
  </section>`;
}

function priorityOrderingSettingsMarkup(config, canManage) {
  const method = methodDefinition(config);
  const levelRows = config.levels.map((level, index) => `<div class="priority-config-row" data-level-row="${escapeHtml(level.id)}"><input type="hidden" name="levelId" value="${escapeHtml(level.id)}"><span>${index + 1}</span><label><span class="sr-only">Level ${index + 1} label</span><input name="levelLabel" maxlength="30" value="${escapeHtml(level.label)}" ${canManage ? "" : "disabled"}></label>${canManage ? `<button class="danger small" data-remove-priority-level="${escapeHtml(level.id)}" type="button" ${config.levels.length <= 2 ? "disabled" : ""}>Remove</button>` : ""}</div>`).join("");
  return `<section class="panel priority-ordering-panel" aria-labelledby="priorityOrderingTitle"><div class="panel-header"><div><p class="panel-kicker">Ranked workbench</p><h3 id="priorityOrderingTitle">${escapeHtml(method.label)}</h3></div><span class="muted">Policy v${config.version}</span></div><p>${escapeHtml(priorityMethodDescription(method.frameworkId))}</p>
    ${method.frameworkId === "manual" ? `<p class="field-note">Editors can maintain the explicit order from Work → Priorities. Drag is optional; Move up/down is the complete keyboard and touch alternative.</p>` : ""}
    ${method.frameworkId === "levels" ? `<form id="priorityLevelsForm"><div id="priorityLevelRows">${levelRows}</div>${canManage ? `<div class="priority-config-actions"><button class="secondary" id="useMoscowLevels" type="button">Use MoSCoW</button><button class="secondary" id="usePLevels" type="button">Use P0-P3</button><button class="secondary" id="addPriorityLevel" type="button" ${config.levels.length >= 6 ? "disabled" : ""}>Add level</button><button class="primary" type="submit">Save levels</button></div>` : ""}</form>` : ""}
  </section>`;
}

function customPriorityFrameworkEditor(framework, canManage) {
  const referencedByDefault = state.prioritization.defaultFrameworkId === framework.id;
  const teamReferences = state.organization.units.filter((unit) => unit.priorityFrameworkId === framework.id).length;
  const itemReferences = state.items.filter((item) => item.priorityInputs?.[framework.id]).length;
  const deleteDisabled = referencedByDefault || teamReferences > 0 || itemReferences > 0;
  return `<aside class="panel custom-framework-editor" aria-labelledby="customFrameworkTitle"><div class="inspector-heading"><p class="panel-kicker">Normalized 0–100 score</p><h3 id="customFrameworkTitle">${escapeHtml(framework.name)}</h3><p>Inputs are limited to 1–10. Weights are limited to 1–5; no executable formulas are accepted.</p></div>
    <form id="customPriorityFrameworkForm"><input type="hidden" name="frameworkId" value="${escapeHtml(framework.id)}"><label><span>Name</span><input name="name" maxlength="80" value="${escapeHtml(framework.name)}" required ${canManage ? "" : "disabled"}></label><label><span>Description</span><textarea name="description" maxlength="400" ${canManage ? "" : "disabled"}>${escapeHtml(framework.description)}</textarea></label>
      <fieldset class="criteria-editor"><legend>Criteria</legend><div id="priorityCriteriaList">${framework.fields.map((field, index) => priorityCriterionRow(field, index, canManage, framework.fields.length)).join("")}</div>${canManage ? `<button class="secondary" id="addPriorityCriterionButton" type="button" ${framework.fields.length >= MAX_CUSTOM_PRIORITY_CRITERIA ? "disabled" : ""}>+ Add criterion</button>` : ""}</fieldset>
      ${canManage ? `<div class="inspector-actions"><button class="primary" type="submit">Save framework</button><button class="danger" id="deletePriorityFrameworkButton" data-framework-id="${escapeHtml(framework.id)}" type="button" ${deleteDisabled ? "disabled" : ""}>Delete framework</button></div><p class="field-note">${deleteDisabled ? `Deletion is blocked while referenced by ${referencedByDefault ? "the workspace default" : teamReferences ? `${teamReferences} team override${teamReferences === 1 ? "" : "s"}` : `${itemReferences} initiative score${itemReferences === 1 ? "" : "s"}`}.` : "This framework is not referenced and can be deleted."}</p>` : ""}
    </form></aside>`;
}

function priorityCriterionRow(field, index, canManage, count) {
  return `<div class="priority-criterion-row" data-priority-criterion="${index}"><input type="hidden" name="criterionId" value="${escapeHtml(field.id)}"><label><span>Name</span><input name="criterionName" maxlength="80" value="${escapeHtml(field.name)}" required ${canManage ? "" : "disabled"}></label><label><span>Weight</span><select name="criterionWeight" ${canManage ? "" : "disabled"}>${[1, 2, 3, 4, 5].map((weight) => `<option value="${weight}" ${weight === field.weight ? "selected" : ""}>${weight}</option>`).join("")}</select></label><label><span>Direction</span><select name="criterionDirection" ${canManage ? "" : "disabled"}><option value="higher" ${field.direction === "higher" ? "selected" : ""}>Higher is better</option><option value="lower" ${field.direction === "lower" ? "selected" : ""}>Lower is better</option></select></label>${canManage ? `<button class="icon-button" data-remove-priority-criterion="${index}" type="button" aria-label="Remove ${escapeHtml(field.name)}" ${count <= MIN_CUSTOM_PRIORITY_CRITERIA ? "disabled" : ""}>×</button>` : ""}</div>`;
}

function priorityFrameworkOptions(selectedId, frameworks = priorityFrameworks(state.prioritization)) {
  return frameworks.map((framework) => `<option value="${escapeHtml(framework.id)}" ${framework.id === selectedId ? "selected" : ""}>${escapeHtml(framework.name)}</option>`).join("");
}

function workflowSettingsView() {
  const workflow = normalizeInitiativeWorkflow(state.workflow);
  const usage = initiativeStatusUsage(workflow, state.items);
  const canManage = workflowCanManage();
  const selected = workflow.statuses.find((status) => status.id === state.selectedWorkflowStatusId) || workflow.statuses[0];
  state.selectedWorkflowStatusId = selected.id;
  const selectedUsage = usage[selected.id] || 0;
  const categoryLocked = selectedUsage > 0;
  const deleteDisabled = selectedUsage > 0 || workflow.statuses.length <= 2;
  return `<section class="workflow-settings" aria-labelledby="workflowSettingsTitle">
    <div class="workflow-hero"><div><p class="eyebrow">Initiative workflow</p><h3 id="workflowSettingsTitle">Use the language your team works in.</h3><p>Customize visible stages while stable reporting categories keep briefings, delivery views, and analytics consistent.</p></div>${canManage ? `<button class="primary" id="addWorkflowStatusButton" type="button">Add status</button>` : ""}</div>
    <section class="metrics workflow-metrics" aria-label="Workflow summary">${metric("Statuses", workflow.statuses.length)}${metric("Default", escapeHtml(statusForId(workflow, workflow.defaultStatusId).name))}${metric("Active stages", workflow.statuses.filter((status) => !isTerminalInitiativeStatus(status)).length)}${metric("Terminal stages", workflow.statuses.filter(isTerminalInitiativeStatus).length)}</section>
    ${!canManage ? `<p class="readonly-banner">Only workspace owners can change workflow statuses. You can review their definitions and usage.</p>` : ""}
    ${state.workflowStatus ? `<p class="organization-status" id="workflowStatus" role="status">${escapeHtml(state.workflowStatus)}</p>` : ""}
    <div class="workflow-layout">
      <section class="panel workflow-list" aria-labelledby="workflowListTitle"><div class="panel-header"><div><p class="panel-kicker">Ordered stages</p><h3 id="workflowListTitle">Status flow</h3></div><span class="muted">Top to bottom</span></div>
        <div class="workflow-status-list">${workflow.statuses.map((status, index) => `<div class="workflow-status-row ${status.id === selected.id ? "active" : ""}"><button class="workflow-status-select" data-select-workflow-status="${escapeHtml(status.id)}" type="button" aria-pressed="${status.id === selected.id}"><span class="status-swatch status-${escapeHtml(status.color)}" aria-hidden="true"></span><span><strong>${escapeHtml(status.name)}</strong><small>${escapeHtml(titleCase(status.category))} · ${initiativeCountLabel(usage[status.id] || 0)}</small></span>${status.id === workflow.defaultStatusId ? `<span class="workflow-default-badge">Default</span>` : ""}</button>${canManage ? `<span class="workflow-reorder"><button class="icon-button" data-move-workflow-status="up" data-status-id="${escapeHtml(status.id)}" type="button" aria-label="Move ${escapeHtml(status.name)} up" ${index === 0 ? "disabled" : ""}>↑</button><button class="icon-button" data-move-workflow-status="down" data-status-id="${escapeHtml(status.id)}" type="button" aria-label="Move ${escapeHtml(status.name)} down" ${index === workflow.statuses.length - 1 ? "disabled" : ""}>↓</button></span>` : ""}</div>`).join("")}</div>
      </section>
      <aside class="panel workflow-inspector" aria-labelledby="workflowInspectorTitle"><div class="inspector-heading"><p class="panel-kicker">Status definition</p><h3 id="workflowInspectorTitle">${escapeHtml(selected.name)}</h3><p>${selectedUsage} ${selectedUsage === 1 ? "initiative uses" : "initiatives use"} this status.</p></div>
        <form class="inspector-form" id="workflowStatusForm"><input name="statusId" type="hidden" value="${escapeHtml(selected.id)}"><label><span>Name</span><input id="workflowStatusName" name="name" maxlength="80" value="${escapeHtml(selected.name)}" required ${canManage ? "" : "disabled"}></label><label><span>Reporting category</span><select name="category" ${canManage && !categoryLocked ? "" : "disabled"}>${INITIATIVE_STATUS_CATEGORIES.map((category) => `<option value="${category}" ${category === selected.category ? "selected" : ""}>${escapeHtml(titleCase(category))}</option>`).join("")}</select><small>${categoryLocked ? "Move assigned initiatives before changing this mapping." : "Drives existing analytics and briefing logic."}</small></label><label><span>Color</span><select name="color" ${canManage ? "" : "disabled"}>${INITIATIVE_STATUS_COLORS.map((color) => `<option value="${color}" ${color === selected.color ? "selected" : ""}>${escapeHtml(titleCase(color))}</option>`).join("")}</select></label><label><span>Description</span><textarea name="description" maxlength="400" ${canManage ? "" : "disabled"}>${escapeHtml(selected.description)}</textarea></label><label><span>Exit criteria</span><textarea name="exitCriteria" maxlength="400" ${canManage ? "" : "disabled"}>${escapeHtml(selected.exitCriteria)}</textarea></label>${canManage ? `<label class="workflow-default-control"><input name="makeDefault" type="checkbox" ${selected.id === workflow.defaultStatusId ? "checked disabled" : ""}><span>Use for new initiatives</span></label><div class="inspector-actions"><button class="primary" type="submit">Save status</button><button class="danger" id="deleteWorkflowStatusButton" type="button" ${deleteDisabled ? "disabled" : ""}>Delete status</button></div>${selectedUsage ? `<p class="field-note">This status cannot be deleted or remapped while initiatives use it.</p>` : ""}` : ""}</form>
      </aside>
    </div>
    <section class="panel workflow-category-guide"><div class="panel-header"><div><p class="panel-kicker">Stable semantics</p><h3>How reporting categories work</h3></div></div><div class="workflow-category-grid"><p><strong>Intake</strong><span>Untriaged opportunities</span></p><p><strong>Discovery</strong><span>Validation and research</span></p><p><strong>Committed</strong><span>Approved delivery work</span></p><p><strong>Shipped</strong><span>Released and measured</span></p><p><strong>Parked</strong><span>Paused or declined</span></p></div></section>
  </section>`;
}

function workflowCanManage() {
  if (demoTeamRole) return demoTeamRole === "owner";
  return !state.team.active || state.team.role === "owner";
}

async function saveWorkflowStatus(event) {
  event.preventDefault();
  if (!workflowCanManage()) return;
  const data = new FormData(event.currentTarget);
  const id = String(data.get("statusId") || "");
  const current = state.workflow.statuses.find((status) => status.id === id);
  if (!current) return;
  const next = {
    ...state.workflow,
    defaultStatusId: data.get("makeDefault") ? id : state.workflow.defaultStatusId,
    statuses: state.workflow.statuses.map((status) => status.id === id ? {
      ...status,
      name: String(data.get("name") || "").trim(),
      category: String(data.get("category") || current.category),
      color: String(data.get("color") || current.color),
      description: String(data.get("description") || "").trim(),
      exitCriteria: String(data.get("exitCriteria") || "").trim()
    } : status)
  };
  await commitInitiativeWorkflow(next, `${String(data.get("name") || current.name).trim()} status saved.`);
}

async function addWorkflowStatus() {
  if (!workflowCanManage()) return;
  const id = workflowStatusId("New status", state.workflow.statuses.map((status) => status.id));
  const firstTerminal = state.workflow.statuses.findIndex(isTerminalInitiativeStatus);
  const insertion = firstTerminal < 0 ? state.workflow.statuses.length : firstTerminal;
  const statuses = [...state.workflow.statuses];
  statuses.splice(insertion, 0, { id, name: "New status", category: "discovery", color: "teal", description: "Describe when work enters this stage.", exitCriteria: "Define what must be true before work moves on." });
  state.selectedWorkflowStatusId = id;
  await commitInitiativeWorkflow({ ...state.workflow, statuses }, "New workflow status added.", "workflowStatusName");
}

async function moveWorkflowStatus(event) {
  if (!workflowCanManage()) return;
  const id = event.currentTarget.dataset.statusId;
  const direction = event.currentTarget.dataset.moveWorkflowStatus === "up" ? -1 : 1;
  const statuses = [...state.workflow.statuses];
  const index = statuses.findIndex((status) => status.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= statuses.length) return;
  [statuses[index], statuses[target]] = [statuses[target], statuses[index]];
  await commitInitiativeWorkflow({ ...state.workflow, statuses }, "Workflow order updated.", `workflowInspectorTitle`);
}

async function deleteWorkflowStatus(event) {
  if (!workflowCanManage()) return;
  const selected = state.workflow.statuses.find((status) => status.id === state.selectedWorkflowStatusId);
  const usage = initiativeStatusUsage(state.workflow, state.items)[selected?.id] || 0;
  if (!selected || usage || state.workflow.statuses.length <= 2) return;
  const confirmed = await requestDataConfirmation({
    title: `Delete ${selected.name}?`,
    description: "This removes the status definition. It is safe because no initiatives currently use it.",
    confirmLabel: "Delete status",
    trigger: event.currentTarget
  });
  if (!confirmed) return;
  const statuses = state.workflow.statuses.filter((status) => status.id !== selected.id);
  const defaultStatusId = selected.id === state.workflow.defaultStatusId
    ? statuses.find((status) => !isTerminalInitiativeStatus(status))?.id || statuses[0].id
    : state.workflow.defaultStatusId;
  state.selectedWorkflowStatusId = statuses[0].id;
  await commitInitiativeWorkflow({ ...state.workflow, defaultStatusId, statuses }, `${selected.name} status deleted.`, "workflowListTitle");
}

async function commitInitiativeWorkflow(input, message, focusId = "workflowStatus") {
  if (!workflowCanManage()) return;
  try {
    const next = normalizeInitiativeWorkflow({ ...input, version: state.workflow.version + 1 });
    if (state.team.active) {
      const result = await state.team.repository.updateWorkflow(next, state.workflow.version);
      applyTeamSnapshot(result?.snapshot);
    } else {
      await commitLocalWorkspacePatch({ workflow: next }, [createActivityEntry("initiative-workflow-updated", { title: "Initiative workflow" }, { workflow: message })]);
    }
    state.workflowStatus = message;
  } catch (error) {
    state.workflowStatus = error instanceof InitiativeWorkflowError ? error.message : safeTeamError(error, "The initiative workflow could not be saved.");
  }
  renderAndFocus(focusId);
}

async function commitPrioritization(input, message, focusId = "prioritizationStatus", selectedFrameworkId) {
  if (!workflowCanManage()) return;
  try {
    const next = assertPriorityAssignments(normalizePrioritization({ ...input, version: state.prioritization.version + 1 }), state.organization, state.items);
    if (state.team.active) {
      if (teamMutationDisabled()) return;
      state.team.mutationBusy = true;
      render();
      const result = await state.team.repository.updatePrioritization(next, state.prioritization.version);
      applyTeamSnapshot(result?.snapshot);
      state.team.mutationBusy = false;
    } else {
      await commitLocalWorkspacePatch({ prioritization: next }, [createActivityEntry("prioritization-updated", { title: "Workspace prioritization" }, { prioritization: message })]);
    }
    if (selectedFrameworkId !== undefined) state.selectedPriorityFrameworkId = selectedFrameworkId;
    state.prioritizationStatus = message;
  } catch (error) {
    state.team.mutationBusy = false;
    state.prioritizationStatus = safeTeamError(error, error?.message || "Prioritization settings could not be updated.");
  }
  render();
  document.getElementById(focusId)?.focus();
}

async function savePriorityDefault(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const frameworkId = String(data.get("defaultFrameworkId") || "");
  const manualOrder = frameworkId === "manual" && !state.prioritization.manualOrder.length
    ? prioritizeConfiguredItems(state.items, state.prioritization).map((item) => item.id)
    : state.prioritization.manualOrder;
  await commitPrioritization({ ...state.prioritization, defaultFrameworkId: frameworkId, manualOrder }, "Workspace prioritization default saved.");
}

async function savePriorityLevels(event) {
  event.preventDefault();
  if (!workflowCanManage()) return;
  const levels = [...event.currentTarget.querySelectorAll("[data-level-row]")].map((row) => ({
    id: row.querySelector('[name="levelId"]').value,
    label: row.querySelector('[name="levelLabel"]').value.trim()
  }));
  await commitPrioritization({ ...state.prioritization, levels }, "Priority levels saved.", "priorityOrderingTitle");
}

function handlePriorityLevelSettingsClick(event) {
  const button = event.target.closest("button");
  if (!button || button.type === "submit") return;
  if (button.id === "useMoscowLevels") replacePriorityLevelRows(["Must", "Should", "Could", "Won't"]);
  else if (button.id === "usePLevels") replacePriorityLevelRows(["P0", "P1", "P2", "P3"]);
  else if (button.id === "addPriorityLevel") addPriorityLevelRow();
  else if (button.dataset.removePriorityLevel) removePriorityLevelRow(button.dataset.removePriorityLevel);
}

function replacePriorityLevelRows(labels) {
  const rows = document.querySelector("#priorityLevelRows");
  if (rows) rows.innerHTML = labels.map((label, index) => priorityLevelRowMarkup(`level-${index + 1}`, label, index)).join("");
}

function addPriorityLevelRow() {
  const rows = document.querySelector("#priorityLevelRows");
  if (!rows || rows.children.length >= 6) return;
  const index = rows.children.length;
  rows.insertAdjacentHTML("beforeend", priorityLevelRowMarkup(`level-${Date.now().toString(36)}-${index + 1}`, `Level ${index + 1}`, index));
}

function priorityLevelRowMarkup(id, label, index) {
  return `<div class="priority-config-row" data-level-row="${escapeHtml(id)}"><input type="hidden" name="levelId" value="${escapeHtml(id)}"><span>${index + 1}</span><label><span class="sr-only">Level ${index + 1} label</span><input name="levelLabel" maxlength="30" value="${escapeHtml(label)}"></label><button class="danger small" data-remove-priority-level="${escapeHtml(id)}" type="button">Remove</button></div>`;
}

function removePriorityLevelRow(levelId) {
  if (state.items.some((item) => (item.priorityLevelId || item.priority?.tierByMethod?.levels) === levelId)) {
    state.prioritizationStatus = "Reassign initiatives before removing a priority level that is in use.";
    renderAndFocus("prioritizationStatus");
    return;
  }
  const rows = document.querySelector("#priorityLevelRows");
  if (!rows || rows.children.length <= 2) return;
  rows.querySelector(`[data-level-row="${cssEscape(levelId)}"]`)?.remove();
}

function openPrioritySettings() {
  const scoringEnabled = experienceHas("advanced-prioritization");
  if (!scoringEnabled) state.experienceStatus = "Turn on Advanced prioritization and save workflows to choose scoring methods.";
  navigateToView("settings", "content", scoringEnabled ? "prioritization" : "setup");
  if (!scoringEnabled) document.querySelector('[data-experience-capability="advanced-prioritization"]')?.focus();
}

async function movePriorityItem(event) {
  const itemId = event.currentTarget.dataset.itemId;
  const direction = event.currentTarget.dataset.priorityMove;
  const ranked = prioritizeConfiguredItems(state.items, state.prioritization);
  const item = ranked.find((entry) => entry.id === itemId);
  if (!item) return;
  const visibleIds = new Set([...document.querySelectorAll(".priority-row[data-priority-item]")].map((row) => row.dataset.priorityItem));
  const visibleRanked = ranked.filter((entry) => visibleIds.has(entry.id));
  const result = priorityDisplay(item, state.prioritization, ranked);
  const group = state.prioritization.defaultFrameworkId === "levels"
    ? visibleRanked.filter((entry) => priorityDisplay(entry, state.prioritization, ranked).levelId === result.levelId)
    : visibleRanked;
  const index = group.findIndex((entry) => entry.id === itemId);
  const target = group[index + (direction === "up" ? -1 : 1)];
  if (!target) return;
  await saveManualOrder(moveIdBeforeOrAfter(ranked.map((entry) => entry.id), itemId, target.id, direction === "down"), `${item.title} moved ${direction}.`);
  document.querySelector(`.priority-row[data-priority-item="${cssEscape(itemId)}"] h4`)?.focus();
}

function startPriorityDrag(event) {
  if (teamEditorReadOnlyReason() || state.prioritizationBusy) return event.preventDefault();
  state.priorityDragId = event.currentTarget.dataset.priorityItem || "";
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", state.priorityDragId);
  event.currentTarget.classList.add("dragging");
}

function allowPriorityDrop(event) {
  if (!state.priorityDragId || teamEditorReadOnlyReason() || state.prioritizationBusy) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  document.querySelectorAll(".priority-row[data-priority-drop]").forEach((row) => row.removeAttribute("data-priority-drop"));
  const target = event.currentTarget;
  if (target.dataset.priorityItem === state.priorityDragId) return;
  const bounds = target.getBoundingClientRect();
  target.dataset.priorityDrop = event.clientY >= bounds.top + bounds.height / 2 ? "after" : "before";
}

async function dropPriorityItem(event) {
  event.preventDefault();
  if (teamEditorReadOnlyReason() || state.prioritizationBusy) return finishPriorityDrag();
  const sourceId = state.priorityDragId || event.dataTransfer.getData("text/plain");
  const targetId = event.currentTarget.dataset.priorityItem;
  if (!sourceId || !targetId || sourceId === targetId) return finishPriorityDrag();
  const ranked = prioritizeConfiguredItems(state.items, state.prioritization);
  if (state.prioritization.defaultFrameworkId === "levels") {
    const source = ranked.find((item) => item.id === sourceId);
    const target = ranked.find((item) => item.id === targetId);
    if (!source || !target || priorityDisplay(source, state.prioritization, ranked).levelId !== priorityDisplay(target, state.prioritization, ranked).levelId) {
      state.prioritizationStatus = "Move initiatives within the same priority level, or change the level in the initiative editor.";
      finishPriorityDrag();
      renderAndFocus("priorityWorkspaceTitle");
      return;
    }
  }
  const bounds = event.currentTarget.getBoundingClientRect();
  const after = event.clientY >= bounds.top + bounds.height / 2;
  await saveManualOrder(moveIdBeforeOrAfter(ranked.map((item) => item.id), sourceId, targetId, after), "Priority order updated.");
  finishPriorityDrag();
}

function finishPriorityDrag() {
  state.priorityDragId = "";
  document.querySelectorAll(".priority-row.dragging, .priority-row[data-priority-drop]").forEach((row) => {
    row.classList.remove("dragging");
    row.removeAttribute("data-priority-drop");
  });
}

function moveIdBeforeOrAfter(ids, sourceId, targetId, after) {
  const next = ids.filter((id) => id !== sourceId);
  const targetIndex = next.indexOf(targetId);
  next.splice(Math.max(0, targetIndex + (after ? 1 : 0)), 0, sourceId);
  return next;
}

async function saveManualOrder(manualOrder, message) {
  if (teamEditorReadOnlyReason() || state.prioritizationBusy) return;
  const current = state.prioritization;
  const next = normalizePrioritization({ ...current, version: current.version + 1, manualOrder }, { items: state.items });
  state.prioritizationBusy = true;
  try {
    if (state.team.active) {
      state.team.mutationBusy = true;
      render();
      const result = await state.team.repository.updatePrioritization(next, current.version);
      applyTeamSnapshot(result?.snapshot);
    } else {
      await commitLocalWorkspacePatch({ prioritization: next }, [createActivityEntry("prioritization-updated", { title: "Workspace prioritization" }, { manualOrder: message })]);
    }
    state.prioritizationStatus = message;
  } catch (error) {
    state.prioritizationStatus = safeTeamError(error, "Priority order could not be saved.");
  } finally {
    state.prioritizationBusy = false;
    state.team.mutationBusy = false;
    renderAndFocus("priorityWorkspaceTitle");
  }
}

async function saveTeamPriorityOverrides(event) {
  event.preventDefault();
  if (!workflowCanManage()) return;
  const data = new FormData(event.currentTarget);
  try {
    const next = normalizeOrganization({
      ...state.organization,
      version: state.organization.version + 1,
      units: state.organization.units.map((unit) => ({ ...unit, priorityFrameworkId: String(data.get(`team_${unit.id}`) || "") }))
    });
    assertPriorityAssignments(state.prioritization, next, state.items);
    await commitOrganization(next, "Team prioritization overrides saved.");
    state.prioritizationStatus = "Team prioritization overrides saved.";
    render();
    document.querySelector("#prioritizationStatus")?.focus();
  } catch (error) {
    state.prioritizationStatus = error?.message || "Team overrides could not be updated.";
    render();
    document.querySelector("#prioritizationStatus")?.focus();
  }
}

async function addPriorityFramework() {
  if (!workflowCanManage()) return;
  const frameworks = priorityFrameworks(state.prioritization);
  const names = new Set(frameworks.map(framework => framework.name.trim().toLowerCase()));
  let name = "New framework";
  let suffix = 2;
  while (names.has(name.toLowerCase())) name = `New framework ${suffix++}`;
  const id = customPriorityFrameworkId(name, frameworks.map(framework => framework.id));
  const framework = {
    id,
    name,
    description: "Describe the decision this framework should support.",
    criteria: [
      { id: "value", name: "Value", weight: 3, direction: "higher" },
      { id: "effort", name: "Effort", weight: 2, direction: "lower" }
    ]
  };
  await commitPrioritization({ ...state.prioritization, customFrameworks: [...state.prioritization.customFrameworks, framework] }, "Custom framework added.", "customFrameworkTitle", id);
}

async function saveCustomPriorityFramework(event) {
  event.preventDefault();
  if (!workflowCanManage()) return;
  const data = new FormData(event.currentTarget);
  const frameworkId = String(data.get("frameworkId") || "");
  const ids = data.getAll("criterionId").map(String);
  const names = data.getAll("criterionName").map(String);
  const weights = data.getAll("criterionWeight").map(Number);
  const directions = data.getAll("criterionDirection").map(String);
  const criteria = ids.map((id, index) => ({ id, name: names[index], weight: weights[index], direction: directions[index] }));
  const customFrameworks = state.prioritization.customFrameworks.map((framework) => framework.id === frameworkId ? {
    id: framework.id,
    name: String(data.get("name") || "").trim(),
    description: String(data.get("description") || "").trim(),
    criteria
  } : framework);
  await commitPrioritization({ ...state.prioritization, customFrameworks }, "Custom framework saved.", "customFrameworkTitle");
}

function addPriorityCriterion() {
  const list = document.querySelector("#priorityCriteriaList");
  if (!list || list.children.length >= MAX_CUSTOM_PRIORITY_CRITERIA) return;
  const existing = new Set([...list.querySelectorAll('[name="criterionId"]')].map((input) => input.value));
  let suffix = list.children.length + 1;
  while (existing.has(`criterion-${suffix}`)) suffix += 1;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = priorityCriterionRow({ id: `criterion-${suffix}`, name: `Criterion ${suffix}`, weight: 1, direction: "higher" }, list.children.length, true, list.children.length + 1);
  list.append(wrapper.firstElementChild);
  bindPriorityCriterionRemoveButtons();
  refreshPriorityCriterionControls(list);
  list.lastElementChild?.querySelector('[name="criterionName"]')?.focus();
}

function removePriorityCriterion(event) {
  const list = document.querySelector("#priorityCriteriaList");
  if (!list || list.children.length <= MIN_CUSTOM_PRIORITY_CRITERIA) return;
  event.currentTarget.closest(".priority-criterion-row")?.remove();
  refreshPriorityCriterionControls(list);
  document.querySelector("#customFrameworkTitle")?.focus();
}

function refreshPriorityCriterionControls(list) {
  document.querySelector("#addPriorityCriterionButton")?.toggleAttribute("disabled", list.children.length >= MAX_CUSTOM_PRIORITY_CRITERIA);
  list.querySelectorAll("[data-remove-priority-criterion]").forEach(button => button.toggleAttribute("disabled", list.children.length <= MIN_CUSTOM_PRIORITY_CRITERIA));
}

function bindPriorityCriterionRemoveButtons() {
  document.querySelectorAll("[data-remove-priority-criterion]").forEach((button) => {
    button.removeEventListener("click", removePriorityCriterion);
    button.addEventListener("click", removePriorityCriterion);
  });
}

async function deletePriorityFramework(event) {
  if (!workflowCanManage()) return;
  const frameworkId = event.currentTarget.dataset.frameworkId;
  const framework = state.prioritization.customFrameworks.find((entry) => entry.id === frameworkId);
  if (!framework) return;
  const confirmed = await requestDataConfirmation({
    title: `Delete ${framework.name}?`,
    description: "This custom framework can only be deleted when no defaults, team overrides, or saved initiative inputs reference it.",
    confirmLabel: "Delete framework",
    trigger: event.currentTarget
  });
  if (!confirmed) return;
  await commitPrioritization({ ...state.prioritization, customFrameworks: state.prioritization.customFrameworks.filter((entry) => entry.id !== frameworkId) }, `${framework.name} deleted.`, "prioritizationSettingsTitle", "");
}

function planningCalendarView() {
  const calendar = state.planningCalendar;
  const canManage = planningCalendarCanManage();
  const currentPeriods = calendar.enabledPeriodTypes.map((type) => periodForDate(type, localDateStamp(), calendar)).filter(Boolean);
  const status = state.planningCalendarStatus ? `<p class="organization-status" id="planningCalendarStatus" tabindex="-1" role="status">${escapeHtml(state.planningCalendarStatus)}</p>` : "";
  return `${planningCapacitySettingsMarkup()}<section class="planning-calendar-layout">
    <section class="panel planning-calendar-settings" aria-labelledby="planningCalendarTitle">
      <div class="panel-header"><div><p class="panel-kicker">Workspace structure</p><h3 id="planningCalendarTitle">Planning calendar</h3></div><span class="muted">Version ${calendar.version}</span></div>
      <p class="governance-note">Choose the time layers your team uses. Initiative membership is derived from planned start and target dates, so changing this calendar never rewrites initiative assignments.</p>
      ${!canManage ? `<p class="readonly-banner">Only a live Team workspace owner can change the planning calendar. You can review the current cadence.</p>` : ""}
      ${status}
      <form id="planningCalendarForm">
        <fieldset ${canManage ? "" : "disabled"}>
          <legend>Enabled planning layers</legend>
          <div class="calendar-layer-grid">${["sprint", "month", "quarter", "year"].map((type) => `<label class="calendar-layer-option"><input name="periodTypes" type="checkbox" value="${type}" ${calendar.enabledPeriodTypes.includes(type) ? "checked" : ""}><span><strong>${titleCase(type)}</strong><small>${calendarLayerDescription(type)}</small></span></label>`).join("")}</div>
          <div class="calendar-form-grid">
            <label><span>Fiscal year starts</span><select name="fiscalYearStartMonth">${Array.from({ length: 12 }, (_, index) => `<option value="${index + 1}" ${calendar.fiscalYearStartMonth === index + 1 ? "selected" : ""}>${new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, index, 1)))}</option>`).join("")}</select></label>
            <label><span>Sprint length</span><select name="sprintLengthWeeks" ${calendar.enabledPeriodTypes.includes("sprint") ? "" : "disabled"}>${Array.from({ length: 6 }, (_, index) => `<option value="${index + 1}" ${calendar.sprintLengthWeeks === index + 1 ? "selected" : ""}>${index + 1} ${index ? "weeks" : "week"}</option>`).join("")}</select></label>
            <label><span>Sprint anchor date</span><input name="sprintAnchorDate" type="date" value="${escapeHtml(calendar.sprintAnchorDate)}" ${calendar.enabledPeriodTypes.includes("sprint") ? "required" : "disabled"}><small>The first day of any known sprint.</small></label>
          </div>
        </fieldset>
        ${canManage ? `<div class="calendar-actions"><button class="primary" type="submit">Save calendar</button></div>` : ""}
      </form>
    </section>
    <section class="panel planning-calendar-preview" aria-labelledby="planningCalendarPreviewTitle"><div class="panel-header"><div><p class="panel-kicker">Today</p><h3 id="planningCalendarPreviewTitle">Current periods</h3></div><span class="muted">Derived preview</span></div><div class="calendar-preview-list">${currentPeriods.map((period) => `<article><span>${escapeHtml(titleCase(period.type))}</span><h4>${escapeHtml(period.label)}</h4><p>${escapeHtml(period.rangeLabel)}</p></article>`).join("") || emptyState("Enable a planning layer to preview it.")}</div></section>
  </section>`;
}

function calendarLayerDescription(type) {
  return ({ sprint: "Repeating 1–6 week delivery cycles", month: "Calendar months", quarter: "Fiscal three-month quarters", year: "Fiscal years" })[type];
}

function planningCalendarCanManage() {
  if (state.storageWarning && !state.team.active) return false;
  if (demoTeamRole) return demoTeamRole === "owner";
  if (!state.team.active) return true;
  return state.team.role === "owner" && state.team.connection === "live" && !state.team.mutationBusy;
}

function teamSpaceView({ items = state.items } = {}) {
  const modes = [["organization", "Organization"], ["people", "People"]];
  const current = normalizeOrganization(state.organization);
  const workload = organizationWorkload(current, items);
  const activeRole = demoTeamRole || state.team.role;
  const canManage = demoTeamRole ? activeRole === "owner" : !state.team.active || activeRole === "owner";
  const canAssign = demoTeamRole ? activeRole === "owner" || activeRole === "editor" : !state.team.active || activeRole === "owner" || activeRole === "editor";
  const root = rootUnits(current)[0];
  if (!state.selectedOrgUnitId && root) state.selectedOrgUnitId = root.id;
  if (!state.selectedPersonId && current.people[0]) state.selectedPersonId = current.people[0].id;
  const selectedUnit = current.units.find((unit) => unit.id === state.selectedOrgUnitId) || root;
  const selectedPerson = current.people.find((person) => person.id === state.selectedPersonId) || current.people[0];
  const status = state.organizationStatus ? `<p class="organization-status" id="organizationStatus" role="status">${escapeHtml(state.organizationStatus)}</p>` : "";
  if (state.selectedMode === "people") {
    return `${spaceModeMarkup(modes)}${teamSpaceIntro(current, canAssign, items)}${status}<section class="team-directory-layout">
      <section class="panel team-directory"><div class="panel-header"><div><p class="panel-kicker">Directory</p><h3>People</h3></div><span class="muted">${current.people.length} teammates</span></div>
        <table class="people-table">
          <caption class="sr-only">Product organization people</caption>
          <thead><tr class="people-header"><th scope="col">Person</th><th scope="col">Title</th><th scope="col">Initiatives</th></tr></thead>
          <tbody>${current.people.map((person) => `<tr class="person-data-row ${selectedPerson?.id === person.id ? "active" : ""}"><td><button class="people-select" data-select-person="${escapeHtml(person.id)}" type="button" aria-label="View ${escapeHtml(person.displayName)}"><span class="avatar">${escapeHtml(initials(person.displayName))}</span><strong>${escapeHtml(person.displayName)}</strong></button></td><td>${escapeHtml(person.title || "Product team")}</td><td>${workload.people[person.id] || 0}</td></tr>`).join("") || `<tr><td colspan="3">${emptyState("Add the first teammate to start the organization.")}</td></tr>`}</tbody>
        </table>
      </section>
      <aside class="panel team-inspector">${personInspectorMarkup(selectedPerson, canManage, workload)}</aside>
    </section>
    ${canManage ? `<form class="panel quick-create" id="addPersonForm"><div><p class="panel-kicker">New teammate</p><h3>Add a person</h3></div><label><span>Name</span><input name="displayName" required placeholder="e.g. Maya Chen"></label><label><span>Title</span><input name="title" placeholder="e.g. Product Manager"></label><button class="primary" type="submit">Add person</button></form>` : ""}`;
  }
  return `${spaceModeMarkup(modes)}${teamSpaceIntro(current, canAssign, items)}${status}<section class="organization-layout">
    <section class="panel organization-outline"><div class="panel-header"><div><p class="panel-kicker">Hierarchy</p><h3>Product organization</h3></div><span class="muted">${current.units.length} units</span></div>
      <div class="org-tree" role="tree" aria-label="Product organization hierarchy">${root ? organizationBranchMarkup(current, root, workload, 1) : emptyState(current.people.length ? "Create the root product organization." : "Add a person before creating the organization.")}</div>
    </section>
    <aside class="panel team-inspector">${unitInspectorMarkup(current, selectedUnit, canManage, workload)}</aside>
  </section>
  ${canManage && current.people.length ? `<form class="panel quick-create" id="addUnitForm"><div><p class="panel-kicker">New unit</p><h3>${root ? "Add a team" : "Create the organization root"}</h3></div><label><span>Name</span><input name="name" required placeholder="${root ? "e.g. Onboarding" : "e.g. Product"}"></label>${root ? `<label><span>Parent</span><select name="parentId">${unitOptions(current, selectedUnit?.id || root.id)}</select></label>` : `<input name="parentId" type="hidden" value="">`}<label><span>Lead</span><select name="leadPersonId">${personOptions(current)}</select></label><button class="primary" type="submit">${root ? "Add team" : "Create root"}</button></form>` : ""}`;
}

function teamSpaceIntro(organization, canAssign, items) {
  return `<section class="team-space-intro"><div><p class="eyebrow">Common workspace · ${escapeHtml(periodSelectionLabel(state.periodSelection, state.planningCalendar))}</p><h3>Connect ownership to the work.</h3><p>The organization stays intact while workload counts reflect the selected timeline scope.</p></div><div class="team-space-facts"><span><strong>${organization.people.length}</strong> people</span><span><strong>${organization.units.length}</strong> units</span><span><strong>${items.filter((item) => item.pocPersonId).length}</strong> scoped assignments</span></div></section>${!canAssign ? `<p class="readonly-banner">Viewer access is read-only. You can explore the organization and initiative ownership.</p>` : ""}`;
}

function organizationBranchMarkup(organization, unit, workload, level) {
  const lead = organization.people.find((person) => person.id === unit.leadPersonId);
  const children = childrenOf(organization, unit.id);
  const selected = state.selectedOrgUnitId === unit.id;
  return `<div class="org-branch" role="none"><button class="org-node ${selected ? "active" : ""}" data-select-unit="${escapeHtml(unit.id)}" role="treeitem" aria-level="${level}" aria-selected="${selected}" aria-expanded="${children.length ? "true" : "false"}" tabindex="${selected ? "0" : "-1"}" type="button" style="--org-level:${level}"><span class="org-node-rail" aria-hidden="true"></span><span class="avatar">${escapeHtml(initials(lead?.displayName || unit.name))}</span><span class="org-node-copy"><strong>${escapeHtml(unit.name)}</strong><small>${escapeHtml(lead?.displayName || "No lead")}</small></span><span class="workload-pill">${workload.total[unit.id] || 0}</span></button>${children.map((child) => organizationBranchMarkup(organization, child, workload, level + 1)).join("")}</div>`;
}

function unitInspectorMarkup(organization, unit, canManage, workload) {
  if (!unit) return `<div class="inspector-empty"><p class="panel-kicker">Inspector</p><h3>No unit selected</h3><p>Create the root organization to begin.</p></div>`;
  const lead = organization.people.find((person) => person.id === unit.leadPersonId);
  const path = unitPath(organization, unit.id).map((entry) => entry.name).join(" / ");
  const invalidParents = new Set([unit.id, ...childrenOfDeep(organization, unit.id).map((entry) => entry.id)]);
  const parentOptions = organization.units.filter((entry) => !invalidParents.has(entry.id)).map((entry) => `<option value="${escapeHtml(entry.id)}" ${entry.id === unit.parentId ? "selected" : ""}>${escapeHtml(unitPath(organization, entry.id).map((part) => part.name).join(" / "))}</option>`).join("");
  return `<div class="inspector-heading"><p class="panel-kicker">Unit inspector</p><h3>${escapeHtml(unit.name)}</h3><p>${escapeHtml(path)}</p></div><dl class="inspector-stats"><div><dt>Lead</dt><dd>${escapeHtml(lead?.displayName || "Unassigned")}</dd></div><div><dt>Direct initiatives</dt><dd>${workload.direct[unit.id] || 0}</dd></div><div><dt>Total initiatives</dt><dd>${workload.total[unit.id] || 0}</dd></div></dl>${canManage ? `<form class="inspector-form" id="editUnitForm"><input name="unitId" type="hidden" value="${escapeHtml(unit.id)}"><label><span>Name</span><input name="name" value="${escapeHtml(unit.name)}" required></label><label><span>Lead</span><select name="leadPersonId">${personOptions(organization, unit.leadPersonId)}</select></label>${unit.parentId ? `<label><span>Parent</span><select name="parentId">${parentOptions}</select></label>` : ""}<div class="inspector-actions"><button class="primary" type="submit">Save unit</button><button class="danger" id="removeUnitButton" data-remove-unit="${escapeHtml(unit.id)}" type="button">Remove</button></div></form>` : ""}`;
}

function personInspectorMarkup(person, canManage, workload) {
  if (!person) return `<div class="inspector-empty"><p class="panel-kicker">Inspector</p><h3>No person selected</h3><p>Add a teammate to begin.</p></div>`;
  return `<div class="inspector-heading"><span class="avatar large">${escapeHtml(initials(person.displayName))}</span><p class="panel-kicker">Person inspector</p><h3>${escapeHtml(person.displayName)}</h3><p>${escapeHtml(person.title || "Product team")}</p></div><dl class="inspector-stats"><div><dt>Initiatives</dt><dd>${workload.people[person.id] || 0}</dd></div></dl>${canManage ? `<form class="inspector-form" id="editPersonForm"><input name="personId" type="hidden" value="${escapeHtml(person.id)}"><label><span>Name</span><input name="displayName" value="${escapeHtml(person.displayName)}" required></label><label><span>Title</span><input name="title" value="${escapeHtml(person.title)}"></label><div class="inspector-actions"><button class="primary" type="submit">Save person</button><button class="danger" id="removePersonButton" data-remove-person="${escapeHtml(person.id)}" type="button">Remove</button></div></form>` : ""}`;
}

function childrenOfDeep(organization, unitId) {
  return childrenOf(organization, unitId).flatMap((unit) => [unit, ...childrenOfDeep(organization, unit.id)]);
}

function personOptions(organization, selected = "") {
  return organization.people.map((person) => `<option value="${escapeHtml(person.id)}" ${person.id === selected ? "selected" : ""}>${escapeHtml(person.displayName)}${person.title ? ` · ${escapeHtml(person.title)}` : ""}</option>`).join("");
}

function unitOptions(organization, selected = "") {
  return organization.units.map((unit) => `<option value="${escapeHtml(unit.id)}" ${unit.id === selected ? "selected" : ""}>${escapeHtml(unitPath(organization, unit.id).map((entry) => entry.name).join(" / "))}</option>`).join("");
}

function initials(value) {
  return String(value || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function organizationPersonName(personId) {
  return state.organization.people.find((person) => person.id === personId)?.displayName || "";
}

function organizationUnitPath(unitId) {
  return unitId ? unitPath(state.organization, unitId).map((unit) => unit.name).join(" / ") : "";
}

function briefView(items) {
  const priorityLabel = workspacePriorityLabel();
  const priorityHelp = priorityMethodDescription(state.prioritization.defaultFrameworkId);
  const brief = buildExecutiveBrief(items, new Date(), state.prioritization, themeEvidenceOptions());
  const memo = scopeGeneratedText(buildExecutiveBriefMemo(items, new Date(), state.prioritization, themeEvidenceOptions()), items);
  const workspaceHealth = calculateHealth(items);
  const health = typeof brief.health === "object" ? briefValue(brief.health, ["label", "status", "score"], workspaceHealth.score) : briefValue(brief, ["health"], workspaceHealth.score);
  const active = typeof brief.health === "object" ? briefValue(brief.health, ["active"], workspaceHealth.active) : workspaceHealth.active;
  const rolloutCount = ["hold", "watch", "ready"].reduce((total, group) => total + (brief.rollouts?.[group]?.length || 0), 0);
  return `<div class="brief-grid">${briefSourceGuide()}
    <section class="panel brief-summary" aria-labelledby="brief-summary-title">${briefPanelHeader("brief-summary", "Portfolio Summary", `Generated ${briefDate(brief.generatedAt)}`, "Recomputed from the current workspace whenever this page renders. The headline combines active initiative, risk, and pending-decision totals.")}<p class="brief-headline">${escapeHtml(briefValue(brief, ["headline"], "No active portfolio work."))}</p><div class="brief-summary-facts">${briefSummaryFact("Operations health", formatOperationalScore(health), "brief-health", "No data yet when this scope has no active initiatives. Otherwise starts at 100. Each active initiative that is stale for more than 14 days, unowned, or missing a next step subtracts 8 points. More than 12 active initiatives subtract 3 additional points each.")}${briefSummaryFact("Active initiatives", active, "brief-active", "Counts initiatives whose status is not Shipped or Parked.")}</div><div class="brief-counts">${briefMetric("Active priorities", brief.priorities?.length || 0, "brief-priority-count", `Shows up to five active initiatives, ranked by ${priorityLabel} and then deterministic tie-breakers.`)}${briefMetric("Risks", brief.risks?.length || 0, "brief-risk-count", "Shows the five highest-severity initiative risks after blocker, launch, and rollout signals are merged.")}${briefMetric("Pending decisions", brief.metrics.pendingDecisions, "brief-decision-count", "Counts every saved Pending or Revisit decision linked to active work, before the five-card display limit. Suggested decision gaps are listed separately.")}${briefMetric("Leadership asks", brief.asks?.length || 0, "brief-ask-count", "Shows the first six actions derived from risks, pending decisions, and measurement gaps.")}</div></section>
    <section class="panel brief-priorities" aria-labelledby="brief-priorities-title">${briefPanelHeader("brief-priorities", "Key Priorities", briefPrioritySummary(brief.priorities?.length || 0), `The top five active initiatives use the workspace ${priorityLabel} methodology. ${priorityHelp} Change the corresponding priority inputs or Next step on the source initiative.`)}<div class="brief-list">${brief.priorities?.map(briefPriorityCard).join("") || emptyState("No active priorities. Shipped and parked initiatives are excluded.")}</div></section>
    <section class="panel" aria-labelledby="brief-risks-title">${briefPanelHeader("brief-risks", "Risks", "Merged by initiative", "Combines active structured risks, at-risk or blocked dependencies, missing ownership or next steps, launch-readiness gaps, and rollout blockers. The highest-severity signal wins; duplicate signals for one initiative are merged.")}<div class="brief-list">${brief.risks?.map(briefRiskCard).join("") || emptyState("No active risks or rollout blockers detected.")}</div></section>
    <section class="panel" aria-labelledby="brief-rollouts-title">${briefPanelHeader("brief-rollouts", "Rollout Status", `${rolloutCount} items`, "Includes Committed rollout candidates. Readiness is the percentage of eight checks completed: customer, problem, owner, due date, decision, experiment, accepted risk, and next step. Ready, Watch and Hold are checklist review states, not launch approval. Stage and audience are suggestions requiring confirmation.")}${rolloutCount ? `<div class="brief-rollout-groups">${briefRolloutGroup("Hold", brief.rollouts?.hold)}${briefRolloutGroup("Watch", brief.rollouts?.watch)}${briefRolloutGroup("Ready", brief.rollouts?.ready)}</div>` : emptyState("No initiatives currently need rollout review.")}</section>
    <section class="panel" aria-labelledby="brief-decisions-title">${briefPanelHeader("brief-decisions", "Decisions Needed", `Showing ${brief.decisions.length} of ${brief.metrics.pendingDecisions + brief.metrics.decisionSuggestions} · ${brief.metrics.decisionSuggestions} suggested`, "Saved Pending and Revisit decisions appear first, with their own question, owner and date. Suggestions identify work without a captured decision. Decided outcomes remain in history. Open a source decision to review or update it.")}<div class="brief-list">${brief.decisions?.map(briefDecisionCard).join("") || emptyState("No pending decisions for active work.")}</div></section>
    <section class="panel" aria-labelledby="brief-metrics-title">${briefPanelHeader("brief-metrics", "Measurement Gaps", "Instrumentation needed", "Checks each active initiative for an experiment or decision threshold, owner, review date, and customer evidence. The first missing input and suggested instrumentation are shown.")}<div class="brief-list">${brief.metricGaps?.map(briefMetricCard).join("") || emptyState("No measurement gaps detected.")}</div></section>
    <section class="panel" aria-labelledby="brief-themes-title">${briefPanelHeader("brief-themes", "Customer Themes", "Repeated signals", "Themes come from intentionally assigned Tags / themes on Feedback signals. At least two distinct signals must share a tag. Filters include signals linked to matching initiatives; unlinked signals appear only in the full project scope.")}<div class="brief-list">${brief.themes?.map(briefThemeCard).join("") || emptyState("No repeated customer themes yet.")}</div></section>
    <section class="panel" aria-labelledby="brief-asks-title">${briefPanelHeader("brief-asks", "Leadership Asks", "Concrete next moves", "Collects the first six recommended actions from the current risk list, pending decisions, and measurement gaps. Saved decision asks retain their record owner and date; suggested asks use initiative details.")}<div class="brief-list">${brief.asks?.map(briefAskCard).join("") || emptyState("No leadership asks. Current work can proceed without escalation.")}</div></section>
    <section class="panel brief-memo" aria-labelledby="brief-memo-title"><h3 id="brief-memo-title">Memo Draft</h3><details class="measure-disclosure" id="briefMemoDetails"><summary>Show complete memo and scores</summary><div class="panel-header"><p>A complete Markdown preview, including the disclosed priority and readiness scores. Save source changes to regenerate.</p><button class="secondary" id="copyExecutiveBriefMemoButton" type="button">Copy Memo</button></div><label class="sr-only" for="executiveBriefMemoDraft">Executive brief Markdown memo</label><textarea id="executiveBriefMemoDraft" readonly>${escapeHtml(memo)}</textarea><p class="sr-only" id="executiveBriefCopyStatus" role="status" aria-live="polite" aria-atomic="true"></p></details></section>
  </div>`;
}
function operationalMeasureGuideMarkup() {
  if (["settings", "team"].includes(state.selectedView) || (state.selectedView === "today" && ["documents", "admin"].includes(state.selectedMode))) return "";
  return `<details class="panel operational-measure-guide"><summary>How to read these measures</summary><p>These calculated measures answer different questions. They are not interchangeable performance scores or proof of customer outcomes. Counts describe records; percentages and rankings need their own context.</p><dl>
    <dt>Workspace / Operations health</dt><dd>Active means everything except Shipped and Parked in the current scope. Start at 100; subtract 8 for each stale (more than 14 days), unowned, or missing-next-step occurrence, and 3 for each active initiative beyond 12; floor at 0. Latest initiative or operational-record activity determines freshness. Saved open actions supply next steps; a generated recommendation alone does not complete one. No active initiatives means No data yet. This measures maintenance gaps, not delivery success or all risks.</dd>
    <dt>Backlog hygiene</dt><dd>For the same active population, start at 100; subtract 8 per stale or unowned initiative, 6 per missing problem or next step, and 5 per owner with more than three initiatives; floor at 0. No active initiatives means No data yet. Its additional checks make it different from health.</dd>
    <dt>Priority</dt><dd>Use the selected workspace methodology. Manual order and levels are authored rankings. Scoring methods require their inputs; missing inputs mean Needs scoring. RICE is Reach × Impact × Confidence ÷ Effort, with confidence as a fraction. Prioritization settings explain the active framework. A higher rank is a planning choice, not urgency or demonstrated value.</dd>
    <dt>Queue urgency and attention</dt><dd>Action Queue orders overdue work (95 + days overdue), blockers (90), missing owner (82), next step (78), decision (74), metric (68), then stale work (60); configured priority breaks ties. These ordering weights are not percentages and overdue weights can exceed 100. Research attention adds up to 50 from relative priority, 20 for confidence below 70%, and 10 for active risks. Feedback adds relative priority, 25 for risks and 15 each for missing owner or next step, capped at 100. Support severity adds relative priority, 30 for risk, 18 for shipped work, 12 for committed work, 18 if unowned and 10 if stale, capped at 100. Validation attention adds relative priority, up to 20 days of age, 15 for active risks and rounded (1 − confidence) × 20. Relative priority contributes 0–50 by position within that candidate set, so changing the set can change attention weights. These are triage suggestions.</dd>
    <dt>Risk and blocker severity</dt><dd>Structured risk is likelihood × impact × 4 on a 100-point scale. Dependency urgency starts at 85 blocked, 60 at risk or 25 otherwise; add 10 if unassigned and 15 overdue, 10 due within 7 days or 5 within 30 days; cap at 100. Brief severity takes the highest risk, dependency, ownership/next-step, launch or rollout signal for each initiative. It can therefore differ from the structured risk score; read its source and proposed action.</dd>
    <dt>Readiness and checklist fractions</dt><dd>Completed checks ÷ total checks × 100, rounded. Launch, rollout and enablement use different checks; enablement counts explicitly completed saved actions. These fractions show captured preparation, not launch success. A checklist can be incomplete without a captured risk. In Executive Brief, status and next actions stay visible; open readiness details for its percentage.</dd>
    <dt>Active load and Plan fill</dt><dd>Effort ÷ your saved effort budget × 100, rounded. Active load counts Committed + Discovery; Plan selection also considers Intake, in priority order. Both use the same authored budget and named calendar horizon. Without a matching saved horizon and budget, or while search filters the population, raw effort remains visible and capacity recommendations are unavailable. Zero means no capacity, so utilization has no percentage. This is an authored allowance, not measured team availability; simulations and suggested cuts do not change commitments.</dd>
  </dl></details>`;
}

function briefSourceGuide() {
  const reason = teamEditorReadOnlyReason();
  const disabled = reason ? "disabled" : "";
  const editDisabled = reason || !state.items.length ? "disabled" : "";
  const describedBy = reason ? 'aria-describedby="initiativeReadOnlyReason"' : "";
  return `<section class="panel brief-source-guide" aria-labelledby="brief-source-guide-title"><div class="brief-source-guide-copy"><p class="panel-kicker">Live workspace briefing</p><h3 id="brief-source-guide-title">Change the inputs, not the briefing.</h3><p>This briefing uses saved initiatives, decisions, and Feedback signals. Save a source change to refresh the briefing. Capture customer themes with Tags / themes in Insights → Feedback, then open a theme’s signal to review its evidence.</p></div><ol class="brief-source-steps"><li><span>1</span><div><strong>Capture the work</strong><small>Add an initiative or choose an existing one.</small></div></li><li><span>2</span><div><strong>Update source fields</strong><small>Status, scores, owner, dates, risks, evidence, and targets feed the report.</small></div></li><li><span>3</span><div><strong>Save to regenerate</strong><small>Briefings and the memo update from the saved workspace.</small></div></li></ol><div class="brief-source-guide-actions"><button class="primary" id="briefCreateInitiativeButton" ${disabled} ${describedBy} type="button">Add initiative</button><button class="secondary" id="briefChooseInitiativeButton" ${editDisabled} ${describedBy} type="button">Choose initiative to edit</button></div></section>`;
}
function briefTooltip(id, label, content) { const tooltipId = `${id}-tooltip`; return `<span class="brief-tooltip"><button class="brief-tooltip-trigger" id="${id}" type="button" aria-label="${escapeHtml(label)}" aria-describedby="${tooltipId}">i</button><span class="brief-tooltip-content" id="${tooltipId}" role="tooltip">${escapeHtml(content)}</span></span>`; }
function briefPanelTitle(id, title, help) { return `<div class="brief-panel-title"><h3 id="${id}-title">${escapeHtml(title)}</h3>${briefTooltip(`${id}-help`, `How ${title} is populated`, help)}</div>`; }
function briefPanelHeader(id, title, meta, help) { return `<div class="panel-header">${briefPanelTitle(id, title, help)}<span class="muted">${escapeHtml(meta)}</span></div>`; }
function briefSummaryFact(label, value, id, help) { return `<p><span class="brief-value-label">${escapeHtml(label)}${briefTooltip(`${id}-help`, `How ${label} is populated`, help)}</span><strong${id === "brief-health" ? ' data-score-family="health"' : ""}>${escapeHtml(value)}</strong></p>`; }
function briefMetric(label, value, id, help) { return `<article class="metric"><span class="brief-value-label">${escapeHtml(label)}${briefTooltip(`${id}-help`, `How the ${label} count is populated`, help)}</span><strong>${escapeHtml(value)}</strong></article>`; }
function briefSourceItem(entry) { const itemId = entry?.itemId || entry?.sources?.[0]?.itemId; return state.items.find((item) => item.id === itemId); }
function briefCardActions(entry, context, focusField, actionLabel) { const record = state.insightRecords.find(candidate => candidate.id === entry.recordId); if (record) return `<div class="contextual-card-actions brief-card-actions">${insightRecordLink(record, context)}</div>`; const item = briefSourceItem(entry); if (!item) return ""; if (focusField === "risk") return `<div class="contextual-card-actions brief-card-actions">${initiativeDetailButton(item, context, state.team.active && state.team.role === "viewer" ? "View risk" : actionLabel, "risks", entry.recordId || "")}</div>`; return `<div class="contextual-card-actions brief-card-actions">${initiativeDetailButton(item, context)}${initiativeContextualEditButton(item, context, focusField, actionLabel)}</div>`; }
function themeEvidenceOptions() {
  return {
    insightRecords: state.insightRecords,
    customerDirectory: state.customerDirectory,
    includeUnlinked: !state.query.trim() && (!timelineScopeApplies() || state.periodSelection.kind === "all")
  };
}

function briefThemeActions(entry, index) {
  const sources = Array.isArray(entry?.sources) ? entry.sources : [];
  const actions = sources.map((source, sourceIndex) => {
    const record = state.insightRecords.find(candidate => candidate.id === source.id && candidate.type === "feedback");
    return record ? insightRecordLink(record, `brief-theme-${index}-${sourceIndex}`) : "";
  }).join("");
  return actions ? `<div class="contextual-card-actions brief-card-actions">${actions}</div>` : "";
}
function briefPriorityCard(entry, index) { return `<article class="brief-card" data-item-id="${escapeHtml(entry.itemId)}"><div class="brief-card-heading"><span class="brief-label neutral">${escapeHtml(briefStatus(briefValue(entry, ["status"], "Active")))}</span></div><h4>${escapeHtml(briefTitle(entry))}</h4><p><b>${executiveBriefLabels.nextAction}</b>${escapeHtml(briefValue(entry, ["nextAction", "nextStep", "action"], "No next action"))}</p><div class="brief-meta"><span><b>${executiveBriefLabels.owner}</b>${escapeHtml(briefValue(entry, ["owner"], "Unassigned"))}</span><span><b>${executiveBriefLabels.dueDate}</b>${escapeHtml(briefValue(entry, ["dueDate"], "No date"))}</span></div><details class="measure-disclosure"><summary>Show ${escapeHtml(briefValue(entry, ["priorityLabel"], workspacePriorityLabel()))} details</summary><p data-score-family="priority">Rank ${briefValue(entry, ["rank"], index + 1)} · ${escapeHtml(briefValue(entry, ["priorityLabel"], workspacePriorityLabel()))}: ${escapeHtml(briefValue(entry, ["score"], "Needs scoring"))}</p></details>${briefCardActions(entry, `brief-priority-${index}`, "nextStep", "Update priority")}</article>`; }
function briefRiskCard(entry, index) { const status = briefValue(entry, ["status"], "Monitor"); const severity = briefValue(entry, ["severity", "score", "severityScore"], "Not scored"); return `<article class="brief-card ${briefSeverityClass(status)}" data-item-id="${escapeHtml(entry.itemId)}"><div class="brief-card-heading"><span class="brief-label ${briefSeverityClass(status)}" data-score-family="severity">${executiveBriefLabels.severity}: ${escapeHtml(status)} | ${escapeHtml(severity)}/100</span><strong>${executiveBriefLabels.sources}: ${escapeHtml(briefList(briefValue(entry, ["sources", "sourceLabels"], [])) || "No source")}</strong></div><h4>${escapeHtml(briefTitle(entry))}</h4><p><b>${executiveBriefLabels.risk}</b>${escapeHtml(briefValue(entry, ["statement", "risk"], "Risk detail unavailable."))}</p><p><b>${executiveBriefLabels.leadershipAction}</b>${escapeHtml(briefValue(entry, ["action", "leadershipAction", "ask"], "Review and assign a response."))}</p><div class="brief-meta"><span><b>${executiveBriefLabels.owner}</b>${escapeHtml(briefValue(entry, ["owner"], "Unassigned"))}</span><span><b>${executiveBriefLabels.dueDate}</b>${escapeHtml(briefValue(entry, ["dueDate"], "No date"))}</span></div>${briefCardActions(entry, `brief-risk-${index}`, "risk", "Update risk")}</article>`; }
function briefDecisionCard(entry, index) { return `<article class="brief-card" data-item-id="${escapeHtml(entry.itemId)}"><div class="brief-card-heading"><span class="brief-label neutral">${entry.origin === "suggested" ? "Suggested decision" : escapeHtml(INSIGHT_STATUS_LABELS[entry.status] || "Captured decision")}</span></div><h4>${escapeHtml(briefTitle(entry))}</h4>${entry.initiativeTitle ? `<p class="muted">${escapeHtml(entry.initiativeTitle)}</p>` : ""}<p><b>${executiveBriefLabels.context}</b>${escapeHtml(briefValue(entry, ["context", "decision"], "Decision context unavailable."))}</p><p><b>${executiveBriefLabels.decisionAsk}</b>${escapeHtml(briefValue(entry, ["ask", "action", "decisionAsk"], "Confirm the path forward."))}</p><div class="brief-meta"><span><b>${executiveBriefLabels.owner}</b>${escapeHtml(briefValue(entry, ["owner"], "Unassigned"))}</span><span><b>${executiveBriefLabels.dueDate}</b>${escapeHtml(briefValue(entry, ["dueDate"], "No date"))}</span></div>${briefCardActions(entry, `brief-decision-${index}`, "decision", "Record decision")}</article>`; }
function briefRolloutGroup(label, entries = []) { return `<section class="brief-rollout-group" aria-label="${label} rollouts"><h4>${label}</h4><div class="brief-list">${entries.map((entry, index) => briefRolloutCard(entry, label, index)).join("") || `<p class="brief-group-empty">No ${label.toLowerCase()} rollouts.</p>`}</div></section>`; }
function briefRolloutCard(entry, label, index) { return `<article class="brief-card ${label.toLowerCase()}" data-item-id="${escapeHtml(entry.itemId)}"><div class="brief-card-heading"><span class="brief-label ${label.toLowerCase()}">${executiveBriefLabels.status}: ${label}</span></div><h5>${escapeHtml(briefTitle(entry))}</h5><details class="measure-disclosure"><summary>Show readiness details</summary><p data-score-family="readiness">${executiveBriefLabels.readiness}: ${formatOperationalScore(entry.readiness, "%")}</p></details><p><b>${executiveBriefLabels.owner}</b>${escapeHtml(briefValue(entry, ["owner"], "Unassigned"))}</p><div class="brief-meta"><span><b>${executiveBriefLabels.stage}</b>${escapeHtml(briefValue(entry, ["stage"], "No stage"))}</span><span><b>${executiveBriefLabels.audience}</b>${escapeHtml(briefValue(entry, ["audience"], "No audience"))}</span></div><p><b>${executiveBriefLabels.nextAction}</b>${escapeHtml(briefValue(entry, ["nextAction", "nextStep", "action"], "No next action"))}</p>${briefCardActions(entry, `brief-rollout-${label}-${index}`, "experiment", "Update readiness")}</article>`; }
function briefMetricCard(entry, index) { return `<article class="brief-card watch" data-item-id="${escapeHtml(entry.itemId)}"><div class="brief-card-heading"><span class="brief-label watch">Needs tracking | ${executiveBriefLabels.reviewDate}: ${escapeHtml(briefValue(entry, ["reviewDate"], "No date"))}</span></div><h4>${escapeHtml(briefTitle(entry))}</h4><p><b>${executiveBriefLabels.firstGap}</b>${escapeHtml(briefValue(entry, ["gap", "missingDetail"], Array.isArray(entry.gaps) ? entry.gaps[0] : "Measurement detail missing."))}</p><p><b>${executiveBriefLabels.instrumentationAction}</b>${escapeHtml(briefValue(entry, ["instrumentation", "action", "instrumentationAction"], "Define and instrument the missing measure."))}</p><div class="brief-meta"><span><b>${executiveBriefLabels.owner}</b>${escapeHtml(briefValue(entry, ["owner"], "Unassigned"))}</span></div>${briefCardActions(entry, `brief-metric-${index}`, entry.gapAction?.field || "experiment", entry.gapAction?.label || "Add measurement")}</article>`; }
function briefThemeCard(entry, index) { return `<article class="brief-card"><div class="brief-card-heading"><span class="brief-label neutral">#${briefValue(entry, ["rank"], index + 1)} | ${briefValue(entry, ["signalCount", "count"], 0)} signals</span></div><h4>${escapeHtml(briefValue(entry, ["theme", "title"], "Customer theme"))}</h4><p><b>${executiveBriefLabels.supportingInitiatives}</b>${escapeHtml(briefList(briefValue(entry, ["initiatives", "supportingInitiatives"], [])) || "No initiatives listed")}</p><p><b>${executiveBriefLabels.supportingSegments}</b>${escapeHtml(briefList(briefValue(entry, ["segments", "supportingSegments"], [])) || "No linked segments")}</p>${briefThemeActions(entry, index)}</article>`; }
function briefAskCard(entry, index) { const type = briefValue(entry, ["type"], "Leadership ask"); const action = type === "Risk" ? ["risk", "Update risk"] : type === "Decision" ? ["decision", "Record decision"] : [entry.gapAction?.field || "experiment", entry.gapAction?.label || "Add measurement"]; return `<article class="brief-card" data-item-id="${escapeHtml(entry.itemId)}"><div class="brief-card-heading"><span class="brief-label neutral">#${index + 1} | ${escapeHtml(type)}</span></div><h4>${escapeHtml(briefTitle(entry))}</h4><p><b>${executiveBriefLabels.requestedAction}</b>${escapeHtml(briefValue(entry, ["action"], "Confirm the requested action."))}</p><div class="brief-meta"><span><b>${executiveBriefLabels.owner}</b>${escapeHtml(briefValue(entry, ["owner"], "Unassigned"))}</span><span><b>${executiveBriefLabels.neededBy}</b>${escapeHtml(briefValue(entry, ["dueDate"], "No date"))}</span></div>${briefCardActions(entry, `brief-ask-${index}`, action[0], action[1])}</article>`; }
function briefValue(entry, keys, fallback) { for (const key of keys) { if (entry?.[key] !== undefined && entry[key] !== null && entry[key] !== "") return entry[key]; } return fallback; }
function briefTitle(entry) { return briefValue(entry, ["title"], entry?.item?.title || "Untitled initiative"); }
function briefStatus(status) { return statusLabels[status] || status; }
function briefList(value) { return (Array.isArray(value) ? value : value ? [value] : []).map((entry) => typeof entry === "string" ? entry : entry?.title || entry?.segment || entry?.label || "").filter(Boolean).join(" | "); }
function briefDate(value) { if (!value) return "No date"; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
function briefPrioritySummary(count) { if (!count) return "No active priorities"; return count === 1 ? "Top 1 active priority" : `Top ${Math.min(5, count)} active priorities`; }
function briefSeverityClass(value) { const status = String(value).toLowerCase(); return status === "critical" ? "critical" : status === "watch" ? "watch" : "monitor"; }

function savedActionsForView(items) {
  const matchingInitiatives = new Set(items.map((item) => item.id));
  const matchingRecords = new Set(filterInsightRecords(state.insightRecords, { type: "action", query: state.query }).map((record) => record.id));
  return state.insightRecords.filter((record) => record.type === "action" && (matchingRecords.has(record.id) || matchingInitiatives.has(record.initiativeId)));
}

function savedActionCard(record, context) {
  const initiative = state.items.find((item) => item.id === record.initiativeId);
  const owner = record.owner || organizationPersonName(record.ownerPersonId) || "Unassigned";
  return `<article class="action-card compact" data-saved-action="${escapeHtml(record.id)}"><span>${escapeHtml(INSIGHT_STATUS_LABELS[record.status])} · ${escapeHtml(owner)}${record.dueDate ? ` · Due ${escapeHtml(record.dueDate)}` : ""}</span><h5>${escapeHtml(record.title)}</h5><p>${escapeHtml(record.description || "No work description captured.")}</p>${record.status !== "open" && record.completionEvidence ? `<p>${escapeHtml(record.completionEvidence)}</p>` : ""}<p class="muted">${escapeHtml(initiative?.title || (record.initiativeId ? "Linked initiative unavailable" : "No linked initiative"))}${record.enablementArea ? ` · ${escapeHtml(record.enablementArea)}` : ""}</p><div class="contextual-card-actions">${insightRecordLink(record, context)}</div></article>`;
}

function savedActionLists(records, context) {
  const open = records.filter((record) => record.status === "open");
  const history = records.filter((record) => ["done", "deferred"].includes(record.status));
  return `<section data-action-state="open"><h4>Open actions</h4><div class="action-list">${open.map((record) => savedActionCard(record, context)).join("") || emptyState("No open actions saved.")}</div></section><section data-action-state="history"><h4>Action history</h4><div class="action-list">${history.map((record) => savedActionCard(record, context)).join("") || emptyState("No completed or deferred actions yet.")}</div></section>`;
}

function savedActionsMarkup(records) {
  const reason = teamEditorReadOnlyReason();
  return `<section class="panel" data-saved-actions aria-labelledby="savedActionsTitle"><div class="panel-header"><h3 id="savedActionsTitle">Saved actions</h3><button class="primary" id="newSavedActionButton" data-new-insight="action" type="button" ${reason ? "disabled" : ""}>New action</button></div><p>Track follow-ups with an owner and due date. Done and Deferred actions stay in history and can be reopened.</p>${reason ? `<p>${escapeHtml(reason)}</p>` : ""}${savedActionLists(records, "today-saved-actions")}</section>`;
}

function initiativeSavedActionsMarkup(item) {
  const records = state.insightRecords.filter((record) => record.type === "action" && record.initiativeId === item.id);
  return `<section class="initiative-detail-section" aria-label="Saved actions"><div class="initiative-detail-section-heading"><h4>Saved actions</h4><button class="secondary small" id="addInitiativeAction-${elementIdToken(item.id)}" data-add-initiative-action="${escapeHtml(item.id)}" type="button" ${teamEditorReadOnlyReason() ? "disabled" : ""}>Add action</button></div>${savedActionLists(records, `initiative-actions-${item.id}`)}</section>`;
}

function addInitiativeAction(trigger) {
  if (teamEditorReadOnlyReason()) return;
  const item = state.items.find((entry) => entry.id === trigger.dataset.addInitiativeAction);
  if (!item) return;
  state.insightEditor = createInsightEditorState({ mode: "new", type: "action", triggerId: trigger.id,
    draft: { ...blankInsightValues("action"), initiativeId: item.id, owner: item.owner, ownerPersonId: item.pocPersonId || "", customerIds: item.customerIds, segmentIds: item.segmentIds }
  });
  render();
}

function actionsView(items) {
  const savedActions = savedActionsForView(items);
  const actions = buildActionQueue(items, new Date(), state.prioritization, actionQueueBuildOptions());
  const actionGroups = groupActionQueueEntries(actions.queue).map(group => ({ ...group, totalCount: actions.countsByInitiative[group.item.id] }));
  const memo = `${scopeGeneratedText(buildActionMemo(items, new Date(), state.prioritization), items)}\n\n${buildInsightMemo("action", savedActions)}\n\n${buildInsightMemo("decision", savedDecisionsForView(items))}`;
  const queueSummary = actions.queue.length < actions.metrics.total
    ? `Showing ${actions.queue.length} of ${actionCountLabel(actions.metrics.total)} · ${initiativeCountLabel(actions.metrics.initiatives)} with actions`
    : `${initiativeCountLabel(actions.metrics.initiatives)} · ${actionCountLabel(actions.metrics.total)} needed`;
  return `${savedActionsMarkup(savedActions)}${savedDecisionsMarkup(savedDecisionsForView(items))}<section class="metrics reporting-metrics">${metric("Initiatives · actions", `${actions.metrics.initiatives} · ${actions.metrics.total}`)}${metric("Overdue", actions.metrics.overdue)}${metric("Blockers", actions.metrics.blockers)}${metric("Decisions", actions.metrics.decisions)}</section><section class="actions-grid"><section class="panel action-queue" aria-labelledby="actionQueueTitle"><div class="panel-header"><h3 id="actionQueueTitle" tabindex="-1">Action Queue</h3><span class="muted">${escapeHtml(queueSummary)}</span></div><p>Recommendations are generated from initiative gaps. Saved open actions supply next steps; pending decisions stay open until their outcomes are recorded. Other recommendations still require their named outcome.</p><div class="action-list">${actionGroups.map(actionQueueGroupCard).join("") || emptyState("No urgent actions detected.")}</div></section><section class="panel"><div class="panel-header"><h3>Overdue</h3><span class="muted">Showing ${actions.overdue.length} of ${actions.metrics.overdue} overdue actions</span></div><div class="action-list">${actions.overdue.map((entry) => `<article class="action-card compact"><span>${escapeHtml(entry.dueDate)}</span><h4>${escapeHtml(entry.title)}</h4><p>${escapeHtml(entry.action)}</p></article>`).join("") || emptyState("No overdue actions.")}</div></section><section class="panel"><div class="panel-header"><h3>Blockers</h3><span class="muted">Showing ${actions.blockers.length} of ${actions.metrics.blockers} blockers</span></div><div class="action-list">${actions.blockers.map((entry) => `<article class="action-card compact"><span>${escapeHtml(entry.owner)}</span><h4>${escapeHtml(entry.title)}</h4><p>${escapeHtml(entry.action)}</p></article>`).join("") || emptyState("No blockers in the action queue.")}</div></section><section class="panel actions-memo"><div class="panel-header"><h3>Action Memo</h3><button class="secondary" id="copyActionMemoButton" type="button">Copy Memo</button></div><textarea id="actionMemoDraft" readonly>${escapeHtml(memo)}</textarea></section></section>`;
}

function insightToolbarMarkup(type) {
  const statuses = INSIGHT_STATUSES[type] || [];
  return `<div class="insight-toolbar"><div><p class="panel-kicker">Saved ${escapeHtml(INSIGHT_TYPE_LABELS[type] || type)} records</p><p>Everything below is captured data, not an initiative-derived suggestion.</p></div><label><span>Status</span><select id="insightStatusFilter"><option value="">All statuses</option>${statuses.map((status) => `<option value="${status}" ${state.insightStatusFilter === status ? "selected" : ""}>${escapeHtml(INSIGHT_STATUS_LABELS[status])}</option>`).join("")}</select></label></div>`;
}

function discoveryView(records) {
  const workspace = buildDiscoveryWorkspace([...state.insightRecords.filter((record) => record.type !== "discovery"), ...records]);
  const memo = buildInsightMemo("discovery", state.insightRecords);
  return `<section class="metrics reporting-metrics">${metric("Opportunities", workspace.metrics.total)}${metric("Active", workspace.metrics.active)}${metric("Validated", workspace.metrics.validated)}${metric("Needs experiment", workspace.metrics.needsExperiment)}</section><section class="discovery-grid"><section class="panel insight-primary-panel"><div class="panel-header"><h3>Discovery Queue</h3><span class="muted">Problems and hypotheses being explored</span></div><div class="discovery-list">${workspace.active.map((record) => insightRecordCard(record, record.problem || "Problem not captured.", `Hypothesis: ${record.hypothesis || "Not captured"}`)).join("") || insightEmptyState("No active discoveries yet.", "discovery")}</div></section><section class="panel"><div class="panel-header"><h3>Validated and Closed</h3><span class="muted">Evidence-backed outcomes</span></div><div class="discovery-list">${workspace.decided.map((record) => insightRecordCard(record, record.hypothesis || record.problem || "No hypothesis captured.", INSIGHT_STATUS_LABELS[record.status])).join("") || emptyState("No discovery outcomes yet.")}</div></section><section class="panel"><div class="panel-header"><h3>Linked Learning</h3><span class="muted">Studies and experiments connected to discovery</span></div><div class="discovery-list">${workspace.records.map((record) => { const studies = workspace.researchByDiscovery.get(record.id) || []; const experiments = workspace.validationByDiscovery.get(record.id) || []; return studies.length || experiments.length ? `<article class="discovery-card"><h4>${escapeHtml(record.title)}</h4><p>${studies.length} research ${studies.length === 1 ? "study" : "studies"} · ${experiments.length} ${experiments.length === 1 ? "experiment" : "experiments"}</p></article>` : ""; }).join("") || emptyState("Link a study or experiment to show the learning chain.")}</div></section><section class="panel insight-memo"><div class="panel-header"><h3>Discovery Review</h3><button class="secondary" id="copyDiscoveryMemoButton" type="button">Copy Review</button></div><textarea id="discoveryMemoDraft" readonly>${escapeHtml(memo)}</textarea></section></section>`;
}

function researchView(records) {
  const research = buildResearchWorkspace(records);
  const memo = buildInsightMemo("research", state.insightRecords);
  return `<section class="metrics reporting-metrics">${metric("Studies", research.metrics.studies)}${metric("Recruiting", research.metrics.recruiting)}${metric("Active", research.metrics.active)}${metric("With findings", research.metrics.findings)}</section><section class="research-grid"><section class="panel insight-primary-panel"><div class="panel-header"><h3>Planned and Recruiting</h3><span class="muted">Questions and participant targets</span></div><div class="research-list">${research.planned.map((record) => insightRecordCard(record, record.objective || "Objective not captured.", `${record.questions.length} questions · ${record.participantCount}/${record.recruitmentTarget} participants`)).join("") || insightEmptyState("No planned studies.", "research")}</div></section><section class="panel"><div class="panel-header"><h3>In Progress</h3><span class="muted">Research being conducted now</span></div><div class="research-list">${research.active.map((record) => insightRecordCard(record, record.objective || "Objective not captured.", record.method || "Method not set")).join("") || emptyState("No studies are in progress.")}</div></section><section class="panel"><div class="panel-header"><h3>Findings</h3><span class="muted">Completed learning</span></div><div class="research-list">${research.complete.map((record) => insightRecordCard(record, record.findings || "No findings captured.", record.method || "Method not set")).join("") || emptyState("No completed research findings.")}</div></section><section class="panel" aria-labelledby="cancelledResearchTitle"><div class="panel-header"><h3 id="cancelledResearchTitle">Cancelled studies</h3><span class="muted">Review or reopen saved research</span></div><div class="research-list">${research.cancelled.map((record) => insightRecordCard(record, record.objective || "Objective not captured.", record.method || "Method not set")).join("") || emptyState("No cancelled studies.")}</div></section><section class="panel research-memo"><div class="panel-header"><h3>Research Plan</h3><button class="secondary" id="copyResearchMemoButton" type="button">Copy Plan</button></div><textarea id="researchMemoDraft" readonly>${escapeHtml(memo)}</textarea></section></section>`;
}

function validationView(records) {
  const board = buildValidationWorkspace([...state.insightRecords.filter((record) => record.type !== "validation"), ...records]);
  const memo = buildInsightMemo("validation", state.insightRecords);
  return `<section class="metrics reporting-metrics">${metric("Experiments", board.metrics.experiments)}${metric("Running", board.metrics.running)}${metric("Decision-ready", board.metrics.decisionReady)}${metric("Evidence gaps", board.metrics.evidenceGaps)}</section><section class="validation-grid"><section class="panel insight-primary-panel"><div class="panel-header"><h3>Planned and Running</h3><span class="muted">Real experiments with declared measures</span></div><div class="validation-list">${[...board.planned, ...board.running].map((record) => insightRecordCard(record, record.hypothesis || "Hypothesis not captured.", `Success: ${record.successMetric || "Not defined"}`)).join("") || insightEmptyState("No planned or running experiments.", "validation")}</div></section><section class="panel"><div class="panel-header"><h3>Decision Ready</h3><span class="muted">Completed experiments awaiting a decision</span></div><div class="validation-list">${board.decisionReady.map((record) => insightRecordCard(record, record.result || "Result not captured.", "Record a continue, commit, iterate, or stop decision.", "Record decision")).join("") || emptyState("No experiments are decision-ready.")}</div></section><section class="panel"><div class="panel-header"><h3>Decisions</h3><span class="muted">Completed validation outcomes</span></div><div class="validation-list">${board.complete.map((record) => insightRecordCard(record, record.result || "Result not captured.", validationDecisionSummary(record))).join("") || emptyState("No validation decisions yet.")}</div></section><section class="panel"><div class="panel-header"><h3>Evidence Gaps</h3><span class="muted">Open discoveries without a linked experiment</span></div><div class="validation-list">${board.evidenceGaps.map((record) => insightRecordCard(record, record.problem || "Problem not captured.", "Link or create a validation experiment.")).join("") || emptyState("No evidence gaps detected.")}</div></section>${validationStatusHistoryMarkup(board)}<section class="panel validation-memo"><div class="panel-header"><h3>Validation Memo</h3><button class="secondary" id="copyValidationMemoButton" type="button">Copy Memo</button></div><textarea id="validationMemoDraft" readonly>${escapeHtml(memo)}</textarea></section></section>`;
}

function feedbackView(records) {
  const inbox = buildFeedbackWorkspace(records);
  const digest = buildInsightMemo("feedback", state.insightRecords);
  return `<section class="metrics reporting-metrics">${metric("Signals", inbox.metrics.total)}${metric("New", inbox.metrics.new)}${metric("Urgent", inbox.metrics.urgent)}${metric("Themes", inbox.metrics.themes)}</section><section class="feedback-grid"><section class="panel insight-primary-panel"><div class="panel-header"><h3>Feedback Inbox</h3><span class="muted">Verbatim, source-attributed signals</span></div><div class="feedback-list">${inbox.inbox.map((record) => insightRecordCard(record, record.signal || "Signal not captured.", `${record.source || "Unknown source"} · urgency ${record.urgency}/5`)).join("") || insightEmptyState("No new or triaged feedback.", "feedback")}</div></section><section class="panel"><div class="panel-header"><h3>Feedback Themes</h3><span class="muted">Explicit tags—not generated keywords</span></div><div class="theme-list">${inbox.themes.map((theme) => `<span>${escapeHtml(theme.theme)} <strong>${theme.count}</strong></span>`).join("") || emptyState("No explicit themes yet.")}</div></section><section class="panel"><div class="panel-header"><h3>All Signals</h3><span class="muted">Complete feedback history</span></div><div class="feedback-list">${inbox.signals.map((record) => insightRecordCard(record, record.signal || "Signal not captured.", `${INSIGHT_STATUS_LABELS[record.status]} · ${record.tags.join(", ") || "untagged"}`)).join("") || emptyState("No feedback signals captured.")}</div></section><section class="panel"><div class="panel-header"><h3>Digest</h3><button class="secondary" id="copyFeedbackDigestButton" type="button">Copy Digest</button></div><textarea id="feedbackDigestDraft" readonly>${escapeHtml(digest)}</textarea></section></section>`;
}

function supportView(records) {
  const support = buildSupportWorkspace(records);
  const memo = buildInsightMemo("support", state.insightRecords);
  return `<section class="metrics reporting-metrics">${metric("Cases", support.metrics.total)}${metric("Open", support.metrics.open)}${metric("Critical", support.metrics.critical)}${metric("Overdue response", support.metrics.overdue)}</section><section class="support-grid"><section class="panel insight-primary-panel"><div class="panel-header"><h3>Support Queue</h3><span class="muted">Declared customer cases and response work</span></div><div class="support-list">${support.open.map((record) => insightRecordCard(record, record.issue || "Issue not captured.", `${SUPPORT_SEVERITY_LABELS[record.severity]} · ${record.owner || "Unassigned"}`, "Manage case", `support-${record.severity}`)).join("") || insightEmptyState("No open support cases.", "support")}</div></section><section class="panel"><div class="panel-header"><h3>Critical Responses</h3><span class="muted">Customer-facing follow-up</span></div><div class="support-list">${support.critical.map((record) => insightRecordCard(record, record.customerImpact || record.issue || "Impact not captured.", record.responseDueDate ? `Respond by ${record.responseDueDate}` : "Response deadline not set", "Manage case", "support-critical")).join("") || emptyState("No critical support cases.")}</div></section><section class="panel"><div class="panel-header"><h3>Owner Load</h3><span class="muted">Open cases by declared owner</span></div><div class="support-list">${support.ownerLoad.map((entry) => `<article class="support-card"><span>${entry.count} cases · ${entry.critical} critical</span><h4>${escapeHtml(entry.owner)}</h4><p>${escapeHtml(entry.cases.join(" · "))}</p></article>`).join("") || emptyState("No owner load.")}</div></section><section class="panel" aria-labelledby="resolvedSupportTitle"><div class="panel-header"><h3 id="resolvedSupportTitle">Resolved cases</h3><span class="muted">Review resolutions or reopen saved cases</span></div><div class="support-list">${support.resolved.map((record) => insightRecordCard(record, record.resolution || "Resolution not captured.", `${record.source || "Source not captured"} · ${SUPPORT_SEVERITY_LABELS[record.severity]}`, "Manage case")).join("") || emptyState("No resolved support cases.")}</div></section><section class="panel support-memo"><div class="panel-header"><h3>Support Memo</h3><button class="secondary" id="copySupportMemoButton" type="button">Copy Memo</button></div><textarea id="supportMemoDraft" readonly>${escapeHtml(memo)}</textarea></section></section>`;
}

function insightRecordCard(record, body, meta, actionLabel = "Edit", extraClass = "") {
  const readonly = Boolean(teamEditorReadOnlyReason());
  return `<article class="insight-record-card ${escapeHtml(extraClass)}" data-insight-card="${escapeHtml(record.id)}"><div class="insight-card-heading"><span>${escapeHtml(INSIGHT_STATUS_LABELS[record.status] || record.status)}</span><small>v${record.version}</small></div><h4>${escapeHtml(record.title)}</h4><p>${escapeHtml(body)}</p><small>${escapeHtml(meta)}</small><div class="contextual-card-actions"><button class="secondary small" data-view-insight="${escapeHtml(record.id)}" type="button">View</button><button class="primary small" data-edit-insight="${escapeHtml(record.id)}" type="button" ${readonly ? "disabled" : ""}>${escapeHtml(actionLabel)}</button></div></article>`;
}

function insightEmptyState(message, type) {
  const readonly = Boolean(teamEditorReadOnlyReason());
  return `<div class="empty insight-empty"><p>${escapeHtml(message)}</p><button class="secondary" data-new-insight="${escapeHtml(type)}" type="button" ${readonly ? "disabled" : ""}>${escapeHtml(insightCommandLabel(type))}</button></div>`;
}
function portfolioView(items) {
  const context = currentPlanningCapacity();
  const portfolio = buildPortfolioDashboard(items, new Date(), context.capacity, state.prioritization);
  const memo = scopeGeneratedText(buildPortfolioMemo(items, new Date(), context.capacity, state.prioritization), items);
  return `${dependencyCycleWarnings(items, "portfolioView")}${planningCapacitySettingsMarkup()}<section class="metrics reporting-metrics">${metric("Active", portfolio.metrics.active)}${metric("Active utilization", capacityNumber(portfolio.metrics.utilization, context.available, "%"), context.available ? `${portfolio.metrics.usedEffort} / ${context.capacity} effort · committed + discovery. Saved effort budget.` : `${portfolio.metrics.usedEffort} active effort · Capacity unavailable. Committed + discovery.`)}${metric("Risks", portfolio.metrics.risks)}${metric("Actions", portfolio.metrics.actions)}</section><section class="portfolio-grid"><section class="panel"><div class="panel-header"><h3>Reporting categories</h3><span class="muted">Groups workflow stages</span></div><div class="portfolio-list">${portfolio.statusMix.map((entry, index) => `<article class="portfolio-card"><span>${entry.effort} effort</span><h4>${escapeHtml(entry.label)}</h4><p>${entry.count} initiatives</p></article>`).join("")}</div></section><section class="panel"><div class="panel-header"><h3>Objective Mix</h3><span class="muted">Active effort by outcome</span></div><div class="portfolio-list">${portfolio.objectiveMix.map((entry, index) => `<article class="portfolio-card"><span>${entry.effort} effort | ${entry.count} initiatives</span><h4>${escapeHtml(entry.objective)}</h4>${initiativeReferenceList(entry.topItems, `portfolio-objective-${index}`)}</article>`).join("") || emptyState("No active objectives yet.")}</div></section><section class="panel"><div class="panel-header"><h3>Segment Mix</h3><span class="muted">Where work clusters</span></div><div class="portfolio-list">${portfolio.segmentMix.map((entry, index) => `<article class="portfolio-card"><span>${entry.count} initiatives</span><h4>${escapeHtml(entry.segment)}</h4>${initiativeReferenceList(entry.topItems, `portfolio-segment-${index}`)}</article>`).join("") || emptyState("No segments captured yet.")}</div></section><section class="panel"><div class="panel-header"><h3>Portfolio Watchlist</h3><span class="muted">Top operating risks</span></div><div class="portfolio-list">${portfolio.watchlist.map((entry, index) => `<article class="portfolio-card warning"><span>${escapeHtml(entry.type)} | ${escapeHtml(entry.owner)}</span><h4>${escapeHtml(entry.title)}</h4><p>${escapeHtml(entry.action)}</p>${initiativeReferenceActions(entry.item, `portfolio-watch-${index}`, entry.target?.kind === "risk" ? "risks" : "", entry.target?.recordId || "")}</article>`).join("") || emptyState("No watchlist actions.")}</div></section><section class="panel"><div class="panel-header"><h3>Recommendations</h3><span class="muted">Portfolio balancing moves</span></div><div class="portfolio-list">${portfolio.recommendationActions.map(portfolioRecommendationCard).join("") || emptyState(context.available ? "No portfolio recommendations for this view." : planningCapacityMessage(context))}</div></section><section class="panel portfolio-memo"><div class="panel-header"><h3>Portfolio Memo</h3><button class="secondary" id="copyPortfolioMemoButton" type="button">Copy Memo</button></div><textarea id="portfolioMemoDraft" readonly>${escapeHtml(memo)}</textarea></section></section>`;
}
function planningView(items) {
  const context = currentPlanningCapacity();
  const plan = buildPeriodPlan(items, state.periodSelection, state.planningCalendar, new Date(), context.capacity, state.prioritization);
  const memo = scopeGeneratedText(buildPeriodPlanMemo(items, state.periodSelection, state.planningCalendar, new Date(), context.capacity, state.prioritization), items);
  const periodLabel = periodSelectionLabel(state.periodSelection, state.planningCalendar);
  const periodRange = periodSelectionRangeLabel(state.periodSelection, state.planningCalendar);
  return `${dependencyCycleWarnings(items, "planningView")}${planningCapacitySettingsMarkup()}<section class="metrics reporting-metrics">${metric("Selected", capacityNumber(plan.metrics.selected, context.available))}${metric("Deferred", capacityNumber(plan.metrics.deferred, context.available))}${metric("Selected utilization", capacityNumber(plan.metrics.utilization, context.available, "%"), `${capacityNumber(plan.used, context.available)} / ${capacityNumber(plan.capacity, context.available)} effort · ${periodLabel}. Saved effort budget.`)}${metric("Objectives", plan.metrics.objectives)}</section>${capacityComparisonMarkup(items)}<section class="planning-grid"><section class="panel"><div class="panel-header"><h3>Strategic Bets</h3><span class="muted">Outcome-led planning themes</span></div><div class="planning-list">${plan.bets.map((bet, index) => `<article class="planning-card"><span>${bet.initiatives.length} selected initiatives</span><h4>${escapeHtml(bet.objective)}</h4><p>${escapeHtml(bet.keyResult)}</p>${initiativeReferenceList(bet.initiatives, `planning-bet-${index}`)}</article>`).join("") || emptyState("No strategic bets drafted.")}</div></section><section class="panel"><div class="panel-header"><h3>Selected Work</h3><span class="muted">${capacityNumber(plan.used, context.available)} / ${capacityNumber(plan.capacity, context.available)} effort</span></div><div class="planning-list">${plan.selected.map((item, index) => `<article class="planning-card"><span>${escapeHtml(initiativeReportingContext(state.workflow, item))} | effort ${item.effort}</span><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.nextStep || item.problem || "Define planning detail.")}</p><div class="contextual-card-actions">${initiativeDetailButton(item, `plan-selected-${index}`)}</div></article>`).join("") || emptyState(context.available ? "No work selected." : planningCapacityMessage(context))}</div></section><section class="panel"><div class="panel-header"><h3>Deferred Work</h3><span class="muted">${context.available ? "Outside saved capacity" : "Awaiting planning capacity"}</span></div><div class="planning-list">${plan.deferred.map((item, index) => `<article class="planning-card"><span>${escapeHtml(workspacePriorityLabel())} ${escapeHtml(workspacePriorityValue(item))} | effort ${item.effort}</span><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(primaryRiskText(item) || item.nextStep || "Revisit after capacity changes.")}</p><div class="contextual-card-actions">${initiativeDetailButton(item, `plan-deferred-${index}`)}</div></article>`).join("") || emptyState(context.available ? "No deferred work." : planningCapacityMessage(context))}</div></section><section class="panel"><div class="panel-header"><h3>Planning Risks</h3><span class="muted">Resolve before commit</span></div><div class="planning-list">${plan.risks.map(planningRiskCard).join("") || emptyState("No planning risks detected.")}</div></section><section class="panel planning-memo"><div class="panel-header"><div><h3>Plan · ${escapeHtml(periodLabel)}</h3><span class="muted">${escapeHtml(periodRange)}</span></div><button class="secondary" id="copyQuarterlyPlanButton" type="button">Copy Plan</button></div><textarea id="quarterlyPlanDraft" readonly>${escapeHtml(memo)}</textarea></section></section>`;
}
function planningRiskCard(entry, index) {
  const item = entry.item;
  const context = `planning-risk-${index}`;
  const reason = teamEditorReadOnlyReason();
  const riskRecord = entry.target?.kind === "risk";
  const details = initiativeDetailButton(item, context, riskRecord ? "View risk" : "View initiative", riskRecord ? "risks" : "", riskRecord ? entry.target.recordId : "");
  const edit = !riskRecord && !reason ? initiativeContextualEditButton(item, context, entry.editor?.field, entry.label) : "";
  return `<article class="planning-card warning"><span>${escapeHtml(entry.type)} | ${escapeHtml(entry.owner)}</span><h4>${escapeHtml(entry.title)}</h4><p>${escapeHtml(entry.action)}</p><div class="contextual-card-actions">${details}${edit}</div>${reason ? `<small>${escapeHtml(reason)}</small>` : ""}</article>`;
}
function roadmapView(items, groups) {
  const plan = buildReleasePlan(items, state.prioritization);
  return `<section class="roadmap">${releaseBucket("Now", "Committed work closest to delivery", plan.now)}${releaseBucket("Next", "Discovery work with enough signal", plan.next)}${releaseBucket("Later", "Promising intake items", plan.later)}</section><section class="panel"><div class="panel-header"><h3>Delivery categories</h3><span class="muted">Groups workflow stages from intake to shipped</span></div><div class="status-row">${Object.entries(groups).map(([status, statusItems]) => `<div><strong>${statusItems.length}</strong><span>${statusLabels[status]}</span></div>`).join("")}</div></section>`;
}

function deliveryView(items) {
  const board = buildDeliveryBoard(items, new Date(), state.prioritization);
  const memo = scopeGeneratedText(buildDeliveryMemo(items, new Date(), state.prioritization), items);
  return `${dependencyCycleWarnings(items, "deliveryView")}<section class="metrics reporting-metrics">${metric("Committed", board.metrics.committed)}${metric("On track", board.metrics.onTrack)}${metric("At risk", board.metrics.atRisk)}${metric("Overdue", board.metrics.overdue)}</section><section class="delivery-grid"><section class="panel"><div class="panel-header"><h3>On Track</h3><span class="muted">Ready or close to ready</span></div><div class="delivery-list">${board.onTrack.map((entry, index) => deliveryCard(entry, `onTrack-${index}`)).join("") || emptyState("No committed work is fully on track.")}</div></section><section class="panel"><div class="panel-header"><h3>Watch</h3><span class="muted">Needs checklist attention</span></div><div class="delivery-list">${board.watch.map((entry, index) => deliveryCard(entry, `watch-${index}`)).join("") || emptyState("No watch-list delivery work.")}</div></section><section class="panel"><div class="panel-header"><h3>At Risk</h3><span class="muted">Explicit at-risk or blocked dependencies</span></div><div class="delivery-list">${board.atRisk.map((entry, index) => deliveryCard(entry, `atRisk-${index}`)).join("") || emptyState("No at-risk delivery work.")}</div></section><section class="panel"><div class="panel-header"><h3>Overdue</h3><span class="muted">Needs reset</span></div><div class="delivery-list">${board.overdue.map((entry, index) => deliveryCard(entry, `overdue-${index}`)).join("") || emptyState("No overdue committed work.")}</div></section><section class="panel delivery-memo"><div class="panel-header"><h3>Delivery Memo</h3><button class="secondary" id="copyDeliveryMemoButton" type="button">Copy Memo</button></div><textarea id="deliveryMemoDraft" readonly>${escapeHtml(memo)}</textarea></section></section>`;
}

function rolloutsView(items) {
  const plan = buildRolloutPlan(items, new Date(), state.prioritization);
  const memo = scopeGeneratedText(buildRolloutMemo(items, new Date(), state.prioritization), items);
  return `${dependencyCycleWarnings(items, "rolloutsView")}<p class="rollout-guidance">${escapeHtml(rolloutReadinessGuidance)}</p><section class="metrics reporting-metrics">${metric("Candidates", plan.metrics.candidates)}${metric("Ready", plan.metrics.ready)}${metric("Watch", plan.metrics.watch)}${metric("Hold", plan.metrics.hold)}</section><section class="rollouts-grid"><section class="panel"><div class="panel-header"><h3>Rollout Plan</h3><span class="muted">Stage, audience, owner</span></div><div class="rollout-list">${plan.candidates.map((entry, index) => rolloutCard(entry, `candidates-${index}`)).join("") || emptyState("No committed work is ready for rollout planning.")}</div></section><section class="panel"><div class="panel-header"><h3>Watch And Hold</h3><span class="muted">Fix before broad exposure</span></div><div class="rollout-list">${[...plan.watch, ...plan.hold].map((entry, index) => rolloutCard(entry, `watch-hold-${index}`)).join("") || emptyState("No rollout candidates need intervention.")}</div></section><section class="panel"><div class="panel-header"><h3>Guardrails</h3><span class="muted">Monitor during exposure</span></div><div class="rollout-list">${plan.candidates.slice(0, 8).map((entry, index) => `<article class="rollout-card"><span>${escapeHtml(entry.item.title)}</span><h4>${escapeHtml(entry.guardrails[0])}</h4><ul>${entry.guardrails.slice(1).map((guardrail) => `<li>${escapeHtml(guardrail)}</li>`).join("")}</ul><p>${escapeHtml(entry.rollback)}</p>${initiativeReferenceActions(entry.item, `rollout-guardrail-${index}`)}</article>`).join("") || emptyState("No rollout guardrails drafted.")}</div></section><section class="panel rollouts-memo"><div class="panel-header"><h3>Rollout Memo</h3><button class="secondary" id="copyRolloutMemoButton" type="button">Copy Memo</button></div><textarea id="rolloutMemoDraft" readonly>${escapeHtml(memo)}</textarea></section></section>`;
}

function launchView(items) {
  const board = buildLaunchBoard(items, new Date(), state.prioritization);
  const memo = scopeGeneratedText(buildLaunchMemo(items, new Date(), state.prioritization), items);
  return `${dependencyCycleWarnings(items, "launchView")}<p class="rollout-guidance">${escapeHtml(rolloutReadinessGuidance)}</p><section class="metrics reporting-metrics">${metric("Candidates", board.metrics.candidates)}${metric("Ready", board.metrics.go)}${metric("Watch", board.metrics.watch)}${metric("Hold", board.metrics.noGo)}</section><section class="launch-grid"><section class="panel"><div class="panel-header"><h3>Launch Candidates</h3><span class="muted">Ready / Watch / Hold</span></div><div class="launch-list">${board.candidates.map((entry, index) => `<article class="launch-card ${entry.goNoGo.toLowerCase().replace("-", "")}"><span>${escapeHtml(entry.goNoGo)} | ${entry.readiness}% | ${escapeHtml(entry.launchDate)}</span><h4>${escapeHtml(entry.item.title)}</h4><p>${escapeHtml(entry.gaps[0]?.task || entry.blockers[0]?.ask || "Ready for launch review.")}</p>${workflowRecommendationControls(entry.item, `launch-candidate-${index}`, entry.gaps[0]?.actions || [], entry.blockers)}</article>`).join("") || emptyState("No committed or discovery launches.")}</div></section><section class="panel"><div class="panel-header"><h3>Readiness Gaps</h3><span class="muted">Top incomplete launch checks</span></div><div class="launch-list">${board.candidates.flatMap((entry) => entry.gaps.map((gap) => ({ item: entry.item, title: entry.item.title, gap }))).map((entry, index) => `<article class="launch-card" data-launch-gap-item="${escapeHtml(entry.item.id)}" data-launch-gap-area="${escapeHtml(entry.gap.area)}"><span>${escapeHtml(entry.gap.area)}</span><h4>${escapeHtml(entry.title)}</h4><p>${escapeHtml(entry.gap.task)}</p>${workflowRecommendationControls(entry.item, `launch-gap-${entry.item.id}-${entry.gap.area}`, entry.gap.actions)}</article>`).join("") || emptyState("No readiness gaps detected.")}</div></section><section class="panel launch-memo"><div class="panel-header"><h3>Launch Memo</h3><button class="secondary" id="copyLaunchMemoButton" type="button">Copy Memo</button></div><textarea id="launchMemoDraft" readonly>${escapeHtml(memo)}</textarea></section></section>`;
}

function enablementView(items) {
  const plan = buildEnablementPlan(items, new Date(), state.prioritization, state.insightRecords);
  const memo = scopeGeneratedText(buildEnablementMemo(items, new Date(), state.prioritization, state.insightRecords), items);
  const itemIds = new Set(items.map((item) => item.id));
  const history = state.insightRecords.filter((record) => record.type === "action" && record.enablementArea && itemIds.has(record.initiativeId) && ["done", "deferred"].includes(record.status));
  return `<section class="metrics reporting-metrics">${metric("Candidates", plan.metrics.candidates)}${metric("Recorded complete", plan.metrics.ready)}${metric("Incomplete areas", plan.metrics.gaps)}${metric("Not completed", plan.metrics.blocked)}</section><section class="enablement-grid"><section class="panel"><div class="panel-header"><h3>Launch Handoffs</h3><span class="muted">Saved work and completion evidence</span></div><p>Initiative details inform suggestions. Mark an action Done only after the work is complete, with an owner and evidence. Deferred work stays incomplete.</p><div class="enablement-list">${plan.candidates.map(enablementCard).join("") || emptyState("No launch candidates need enablement.")}</div></section><section class="panel"><div class="panel-header"><h3>Top Enablement Gaps</h3><span class="muted">All incomplete areas</span></div><div class="enablement-list">${plan.candidates.flatMap((entry) => entry.gaps.map((gap) => ({ entry, gap }))).map(({ entry, gap }) => `<article class="enablement-card warning" data-enablement-item="${escapeHtml(entry.item.id)}" data-enablement-area="${gap.area}"><span>${gap.area} | ${escapeHtml(entry.owner)}</span><h4>${escapeHtml(entry.item.title)}</h4><p>Suggested work: ${escapeHtml(gap.task)}</p>${enablementActionControls(entry.item, gap)}</article>`).join("") || emptyState("All candidate enablement areas have saved completion evidence.")}</div></section><section class="panel"><div class="panel-header"><h3>Action history</h3><span class="muted">Done and deferred work</span></div><div class="enablement-list">${history.map((record) => `<article class="enablement-card" data-enablement-history="${escapeHtml(record.id)}"><span>${escapeHtml(record.enablementArea)} | ${escapeHtml(INSIGHT_STATUS_LABELS[record.status])}</span><h4>${escapeHtml(record.title)}</h4><p>${escapeHtml(record.completionEvidence || "No completion evidence recorded.")}</p>${insightRecordLink(record, "enablement-history")}</article>`).join("") || emptyState("No completed or deferred enablement actions yet.")}</div></section><section class="panel enablement-memo"><div class="panel-header"><h3>Enablement Memo</h3><button class="secondary" id="copyEnablementMemoButton" type="button">Copy Memo</button></div><textarea id="enablementMemoDraft" readonly>${escapeHtml(memo)}</textarea></section></section>`;
}

function enablementActionControls(item, check) {
  const context = `enablement-${item.id}-${check.area}`;
  const records = check.actions.map((record) => `<span>${escapeHtml(INSIGHT_STATUS_LABELS[record.status])} · ${escapeHtml(record.owner || organizationPersonName(record.ownerPersonId) || "Unassigned")}</span>${insightRecordLink(record, context)}`).join("");
  return `<div class="contextual-card-actions workflow-recommendation-controls">${initiativeDetailButton(item, context)}${records || `<button class="secondary small" type="button" id="${escapeHtml(context)}" data-plan-enablement="${escapeHtml(item.id)}" data-enablement-area="${check.area}" ${teamEditorReadOnlyReason() ? "disabled" : ""}>Plan ${check.area.toLowerCase()} action</button>`}</div>`;
}

function planEnablementAction(trigger) {
  if (teamEditorReadOnlyReason()) return;
  const item = state.items.find((entry) => entry.id === trigger.dataset.planEnablement);
  if (!item) return;
  const check = buildEnablementPlan([item], new Date(), state.prioritization, state.insightRecords).candidates[0]?.checks.find((entry) => entry.area === trigger.dataset.enablementArea);
  if (!check) return;
  if (check.actions.length) { openInsightEditor("view", trigger, check.actions[0].id); return; }
  state.insightEditor = createInsightEditorState({ mode: "new", type: "action", triggerId: trigger.id,
    draft: { ...blankInsightValues("action"), title: `${check.area}: ${item.title}`, description: check.task, initiativeId: item.id, enablementArea: check.area, owner: item.owner, ownerPersonId: item.pocPersonId || "", customerIds: item.customerIds, segmentIds: item.segmentIds }
  });
  render();
}

function generatedAskControls(entry, context) {
  if (!entry.sourceKey || !entry.ask) return "";
  const sourceRecordId = entry.target?.recordId || `suggested:${entry.sourceKey}`;
  const saved = state.insightRecords.filter(record => record.type === "action"
    && record.sourceRecordId === sourceRecordId
    && (!entry.itemId || record.initiativeId === entry.itemId));
  const id = `plan-ask-${context}`;
  state.generatedAskTargets.set(id, { ...entry, sourceRecordId });
  return `<div class="contextual-card-actions generated-ask-actions" data-generated-ask="${escapeHtml(entry.sourceKey)}">
    ${saved.map(record => `<span>Saved action · ${escapeHtml(INSIGHT_STATUS_LABELS[record.status])}</span>${insightRecordLink(record, context)}`).join("")}
    <button class="secondary small" id="${escapeHtml(id)}" data-plan-generated-ask type="button" ${teamEditorReadOnlyReason() ? "disabled" : ""}>${saved.length ? "Plan another action" : "Plan action"}</button>
  </div>`;
}

function planGeneratedAsk(trigger) {
  if (teamEditorReadOnlyReason()) return;
  const entry = state.generatedAskTargets.get(trigger.id);
  if (!entry) return;
  const item = state.items.find(candidate => candidate.id === entry.itemId);
  if (entry.itemId && !item) return;
  state.insightEditor = createInsightEditorState({ mode: "new", type: "action", triggerId: trigger.id,
    draft: { ...blankInsightValues("action"),
      title: `${entry.audience || "Follow-up"}: ${item?.title || "Audience follow-up"}`.slice(0, 500),
      description: entry.ask, sourceRecordId: entry.sourceRecordId,
      initiativeId: item?.id || "", owner: item?.owner || "",
      ownerPersonId: item?.pocPersonId || "", customerIds: item?.customerIds || [], segmentIds: item?.segmentIds || []
    }
  });
  render();
}

function capacityComparisonMarkup(items) {
  const context = currentPlanningCapacity();
  const active = buildCapacityPlan(items, context.capacity, state.prioritization);
  const selection = buildPeriodPlan(items, state.periodSelection, state.planningCalendar, new Date(), context.capacity, state.prioritization);
  return `<section class="panel capacity-comparison" aria-label="Compare planning capacity"><h3>One budget, two work populations</h3><p>Active workload: <strong>${active.totalEffort} effort</strong> counts committed and discovery work in this scope. Plan candidates: <strong>${selection.candidateEffort} effort across ${selection.candidateCount} initiatives</strong> also include intake.</p>${context.available ? `<p>Both use the saved <strong>${context.capacity}-effort budget</strong>. Active workload: <strong>${active.totalEffort} / ${active.capacity} effort (${capacityNumber(active.utilization, true, "%")})</strong>. Plan selection: <strong>${selection.used} / ${selection.capacity} effort (${capacityNumber(selection.metrics.utilization, true, "%")})</strong>.</p>` : `<p>${escapeHtml(planningCapacityMessage(context))}</p>`}<p>Fit and deferred lists simulate the current priority order and saved allowance; they do not change commitments or infer team availability. Unranked work has no business priority assigned; manual ties use title order. Review priority and effort before acting on a suggested cut.</p></section>`;
}

function capacityView(items) {
  const context = currentPlanningCapacity();
  const plan = buildCapacityPlan(items, context.capacity, state.prioritization);
  return `${dependencyCycleWarnings(items, "capacityView")}${planningCapacitySettingsMarkup()}<section class="metrics reporting-metrics">${metric("Capacity", capacityNumber(plan.capacity, context.available), context.available && context.capacity === 0 ? "No capacity" : "Saved effort budget")}${metric("Used", plan.totalEffort)}${metric("Active utilization", capacityNumber(plan.utilization, context.available, "%"), `${plan.totalEffort} / ${capacityNumber(plan.capacity, context.available)} effort · committed + discovery.`)}${metric("Overage", capacityNumber(plan.overage, context.available))}</section>${capacityComparisonMarkup(items)}<section class="capacity-grid"><section class="panel"><div class="panel-header"><h3>Capacity Mix</h3><span class="muted">Committed and discovery load</span></div><div class="capacity-bars"><p><span>Committed</span><strong>${plan.committedEffort}</strong></p><p><span>Discovery</span><strong>${plan.discoveryEffort}</strong></p><p><span>Remaining</span><strong>${capacityNumber(plan.remaining, context.available)}</strong></p></div></section><section class="panel"><div class="panel-header"><h3>Suggested Scope Cuts</h3><span class="muted">Review candidates from the end of the current order</span></div><div class="capacity-list">${plan.suggestedCuts.map((item) => `<article class="capacity-card"><h4>${escapeHtml(item.title)}</h4><p>Effort ${item.effort} | ${escapeHtml(workspacePriorityLabel())} ${escapeHtml(workspacePriorityValue(item))}</p><div class="contextual-card-actions">${initiativeDetailButton(item, 'capacity-cuts')}</div></article>`).join("") || emptyState(context.available ? "No cuts needed for this capacity." : planningCapacityMessage(context))}</div></section><section class="panel"><div class="panel-header"><h3>Fits In Capacity</h3><span class="muted">Adds work in priority order when it fits</span></div><div class="capacity-list">${plan.scenario.selected.map((item) => `<article class="capacity-card"><h4>${escapeHtml(item.title)}</h4><p>Effort ${item.effort} | ${escapeHtml(initiativeReportingContext(state.workflow, item))}</p><div class="contextual-card-actions">${initiativeDetailButton(item, 'capacity-selected')}</div></article>`).join("") || emptyState(context.available ? "No selected work." : planningCapacityMessage(context))}</div></section><section class="panel"><div class="panel-header"><h3>Deferred</h3><span class="muted">Work outside the scenario</span></div><div class="capacity-list">${plan.scenario.deferred.slice(0, 8).map((item) => `<article class="capacity-card"><h4>${escapeHtml(item.title)}</h4><p>Effort ${item.effort} | ${escapeHtml(initiativeReportingContext(state.workflow, item))}</p><div class="contextual-card-actions">${initiativeDetailButton(item, 'capacity-deferred')}</div></article>`).join("") || emptyState(context.available ? "No deferred work." : planningCapacityMessage(context))}</div></section></section>`;
}
function dependencyCycleWarnings(items, context, links = true) {
  const ids = new Set(items.map((item) => item.id));
  const cycles = findDependencyCycles(state.items).filter((cycle) => cycle.itemIds.some((id) => ids.has(id)));
  if (!cycles.length) return "";
  const byId = new Map(state.items.map((item) => [item.id, item]));
  return `<aside class="panel dependency-cycle-warning" aria-label="Circular dependencies"><h3>Circular dependencies</h3><p>These unresolved dependencies form a loop. Review and change or resolve the relevant dependencies before committing to this plan. Saved statuses and readiness scores do not account for this loop.</p><p>Includes connected initiatives outside the current filters, including parked or shipped work with unresolved dependencies.</p>${cycles.map((cycle, index) => `<ul>${cycle.edges.map((edge, edgeIndex) => `<li><strong>${escapeHtml(byId.get(edge.itemId)?.title || edge.itemId)}</strong> depends on <strong>${escapeHtml(byId.get(edge.targetItemId)?.title || edge.targetItemId)}</strong>: ${escapeHtml(edge.description)}${links ? initiativeDetailButton(byId.get(edge.itemId), `${context}-cycle-${index}-${edgeIndex}`, `Review dependency: ${edge.description}`, "dependencies", edge.recordId) : ""}</li>`).join("")}</ul>`).join("")}</aside>`;
}

function dependenciesView(items) {
  const map = buildDependencyMap(items, new Date(), state.prioritization, state.items);
  const memo = scopeGeneratedText(buildDependencyMemo(items, new Date(), state.prioritization, state.items), items);
  return `${dependencyCycleWarnings(items, "dependenciesView")}<section class="metrics reporting-metrics">${metric("Blockers", map.metrics.blockers)}${metric("Unassigned", map.metrics.unassigned)}${metric("High urgency", map.metrics.highUrgency)}${metric("Dated", map.metrics.upcoming)}</section><section class="dependencies-grid"><section class="panel"><div class="panel-header"><h3>Blocker Queue</h3><span class="muted">Explicit at-risk and blocked dependencies</span></div><div class="dependency-list">${map.blockers.map(dependencyBlockerCard).join("") || emptyState("No blockers detected.")}</div></section><section class="panel"><div class="panel-header"><h3>Owner Load</h3><span class="muted">Where dependency pressure clusters</span></div><div class="dependency-list">${map.owners.map((owner, ownerIndex) => `<article class="dependency-card"><span>${owner.count} active ${owner.count === 1 ? "dependency" : "dependencies"} · ${owner.pendingCount} pending · ${owner.blockerCount} ${owner.blockerCount === 1 ? "blocker" : "blockers"} | urgency ${owner.urgency}</span><h4>${escapeHtml(owner.owner)}</h4>${owner.references.map((reference, index) => initiativeReferenceActions(reference.itemId, `dependency-owner-${ownerIndex}-${index}`, "dependencies", reference.recordId, reference.label || reference.title)).join("")}</article>`).join("") || emptyState("No dependency owners detected.")}</div></section><section class="panel"><div class="panel-header"><h3>Upcoming Dependencies</h3><span class="muted">Needed-by dates</span></div><div class="dependency-list">${map.upcoming.map((entry, index) => `<article class="dependency-card"><span>${escapeHtml(entry.record.neededBy)} · ${escapeHtml(dependencyStatusLabels[entry.record.status])}</span><h4>${escapeHtml(entry.item.title)}</h4><p>${escapeHtml(entry.record.description)} · ${escapeHtml(entry.owner)}</p><div class="contextual-card-actions">${initiativeDetailButton(entry.item, `dependency-upcoming-${index}`, "Manage dependency", "dependencies", entry.record.id)}</div></article>`).join("") || emptyState("No dated dependencies captured.")}</div></section><section class="panel"><div class="panel-header"><h3>Dependency Memo</h3><button class="secondary" id="copyDependencyMemoButton" type="button">Copy Memo</button></div><textarea id="dependencyMemoDraft" readonly>${escapeHtml(memo)}</textarea></section></section>`;
}
function outcomesView(items) {
  const alignment = buildOutcomeAlignment(items, state.prioritization);
  const memo = scopeGeneratedText(buildOutcomeMemo(items, new Date(), state.prioritization), items);
  return `<section class="metrics reporting-metrics">${metric("Objectives", alignment.coverage.length)}${metric("Metric gaps", alignment.missingMetrics.length)}${metric("At risk", alignment.atRiskObjectives.length)}${metric("Measures", alignment.keyResults.length)}</section><section class="outcomes-grid"><section class="panel"><div class="panel-header"><h3>Objective Coverage</h3><span class="muted">Active work by outcome</span></div><div class="outcome-list">${alignment.coverage.map((entry, index) => `<article class="outcome-card"><span>${entry.count} initiatives | ${entry.effort} effort · ${entry.objectiveOrigin === "captured" ? "Authored objective" : "Suggested grouping"}</span><h4>${escapeHtml(entry.objective)}</h4>${initiativeReferenceList(entry.topItems, `outcome-coverage-${index}`)}</article>`).join("") || emptyState("No active objectives yet.")}</div></section><section class="panel"><div class="panel-header"><h3>Objectives and measures</h3><span class="muted">Authored targets and suggestions</span></div><div class="outcome-list">${alignment.keyResults.map(keyResultCard).join("") || emptyState("No key results suggested yet.")}</div></section><section class="panel"><div class="panel-header"><h3>Missing measures</h3><span class="muted">Work needing an authored outcome</span></div><div class="outcome-list">${alignment.missingMetrics.map((item) => `<article class="outcome-card"><span>${escapeHtml(initiativeReportingContext(state.workflow, item))}</span><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.primaryMetric || "Record an objective, primary metric and your target.")}</p>${initiativeContextualEditButton(item, "outcome-metric-gap", "primaryMetric", "Define measure")}${initiativeReferenceActions(item, "outcome-metric-gap")}</article>`).join("") || emptyState("Every active initiative has an objective, primary metric and target.")}</div></section><section class="panel"><div class="panel-header"><h3>Outcome Memo</h3><button class="secondary" id="copyOutcomeMemoButton" type="button">Copy Memo</button></div><textarea id="outcomeMemoDraft" readonly>${escapeHtml(memo)}</textarea></section></section>`;
}

function keyResultCard(entry, index) {
  const id = `author-measure-${encodeURIComponent(entry.sourceKey || entry.id || String(index))}`;
  state.measureTargets.set(id, entry);
  const sources = (entry.sourceIds || []).map(sourceId => state.items.find(item => item.id === sourceId)).filter(Boolean);
  const captured = entry.origin === "captured";
  return `<article class="outcome-card" data-key-result="${escapeHtml(entry.sourceKey || entry.id || id)}">
    <span>${captured ? entry.status === "adopted" ? "Saved measure" : "Saved measure · incomplete" : "Suggested measure"}</span>
    <h4>${escapeHtml(entry.objective || "Objective not recorded")}</h4>
    <p>${escapeHtml(entry.primaryMetric || "Choose a primary metric.")}</p>
    <p>Target: ${escapeHtml(entry.metricTarget || "Not recorded")}</p>
    <p>Review date: ${escapeHtml(entry.metricReviewDate || "Not recorded")}</p>
    <small>${captured ? "This records intent. Achievement requires observed results." : "Review this suggestion and write your own target before saving."}</small>
    ${initiativeReferenceList(sources, `measure-sources-${index}`)}
    ${!captured && sources.length ? `<label class="generated-measure-picker"><span>Initiative to measure</span><select id="${id}-initiative" required ${teamEditorReadOnlyReason() ? "disabled" : ""}><option value="">Choose an initiative</option>${sources.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.title)} · ${escapeHtml(item.owner || "Unassigned")}</option>`).join("")}</select></label>` : ""}
    ${sources.length ? `<button class="secondary small" id="${id}" data-author-measure type="button" ${teamEditorReadOnlyReason() ? "disabled" : ""}>${captured ? "Edit measure" : "Define measure"}</button>` : ""}
  </article>`;
}

function authorMeasure(trigger) {
  if (teamEditorReadOnlyReason()) return;
  const entry = state.measureTargets.get(trigger.id);
  if (!entry) return;
  const picker = document.getElementById(`${trigger.id}-initiative`);
  const itemId = entry.initiativeId || picker?.value;
  if (!itemId) { picker?.reportValidity(); picker?.focus(); return; }
  if (!(entry.sourceIds || []).includes(itemId)) return;
  const item = state.items.find(candidate => candidate.id === itemId);
  if (!item) return;
  state.initiativeEditor = createInitiativeEditorState({
    mode: "edit", selectedId: item.id, selectedFromCard: true, triggerId: trigger.id,
    focusField: "objective", moreDetailsOpen: true, measureContext: entry.origin,
    draft: { ...blankInitiativeValues(), ...item,
      objective: item.objective || entry.objective || "", primaryMetric: item.primaryMetric || entry.primaryMetric || "",
      metricTarget: item.metricTarget || "", metricReviewDate: item.metricReviewDate || ""
    }
  });
  render();
}

function metricsView(items) {
  const evidence = { insightRecords: state.insightRecords };
  const plan = buildMetricsPlan(items, new Date(), state.prioritization, evidence);
  const memo = scopeGeneratedText(buildMetricsMemo(items, new Date(), state.prioritization, evidence), items);
  return `<section class="metrics reporting-metrics">${metric("Saved measures", `${plan.metrics.tracked}/${plan.metrics.total}`)}${metric("Tracking gaps", plan.metrics.gaps)}${metric("Launch instrumentation gaps", plan.metrics.launchGaps)}${metric("Dashboards", plan.dashboard.length)}</section><section class="metrics-grid"><section class="panel"><div class="panel-header"><h3>Measurement Plan</h3><span class="muted">Primary metric by initiative</span></div><div class="metric-plan-list">${plan.plans.slice(0, 8).map(metricPlanCard).join("") || emptyState("No active initiatives to measure.")}</div></section><section class="panel"><div class="panel-header"><h3>Tracking Gaps</h3><span class="muted">Before launch or review</span></div><div class="metric-plan-list">${plan.gaps.map(metricGapCard).join("") || emptyState("No metric definition gaps detected. Instrumentation and achievement remain unverified.")}</div></section><section class="panel"><div class="panel-header"><h3>Outcome Dashboards</h3><span class="muted">Where measurement rolls up</span></div><div class="metric-plan-list">${plan.dashboard.map((entry) => `<article class="metric-plan-card"><span>${entry.count} initiatives</span><h4>${escapeHtml(entry.objective)}</h4><p>${escapeHtml(summarizeDashboard(plan.plans, entry.objective))}</p></article>`).join("") || emptyState("No dashboard groups yet.")}</div></section><section class="panel metrics-memo"><div class="panel-header"><h3>Metrics Memo</h3><button class="secondary" id="copyMetricsMemoButton" type="button">Copy Memo</button></div><textarea id="metricsMemoDraft" readonly>${escapeHtml(memo)}</textarea></section></section>`;
}

function stakeholdersView(items) {
  const governance = buildStakeholderGovernance(items, new Date(), state.prioritization, themeEvidenceOptions());
  const memo = scopeGeneratedText(buildStakeholderMemo(items, new Date(), state.prioritization, themeEvidenceOptions()), items);
  return `<section class="metrics reporting-metrics">${metric("Owners", governance.metrics.owners)}${metric("Unowned", governance.metrics.unowned)}${metric("Asks", governance.metrics.asks)}${metric("Escalations", governance.metrics.escalations)}</section><section class="stakeholders-grid"><section class="panel"><div class="panel-header"><h3>Owner Load</h3><span class="muted">Accountability pressure</span></div><div class="stakeholder-list">${governance.ownerLoad.map((owner, index) => `<article class="stakeholder-card"><span>Pressure ${owner.pressure}</span><h4>${escapeHtml(owner.name)}</h4>${initiativeReferenceList(owner.items, `stakeholder-owner-${index}`) || "No assigned work."}</article>`).join("") || emptyState("No owner load detected.")}</div></section><section class="panel"><div class="panel-header"><h3>Segment Attention</h3><span class="muted">Customer groups needing follow-up</span></div><div class="stakeholder-list">${governance.segmentAttention.map((segment, index) => `<article class="stakeholder-card"><span>${segment.count} initiatives | ${segment.risks} risks</span><h4>${escapeHtml(segment.name)}</h4><p>${escapeHtml(segment.ask)}</p>${initiativeReferenceList(segment.items, `stakeholder-segment-${index}`)}</article>`).join("") || emptyState("No segment attention needed.")}</div></section><section class="panel"><div class="panel-header"><h3>Open Asks</h3><span class="muted">Who needs to respond</span></div><div class="stakeholder-list">${governance.openAsks.map((entry, index) => `<article class="stakeholder-card"><span>${escapeHtml(entry.audience)} | urgency ${entry.urgency}</span><h4>${escapeHtml(entry.title)}</h4><p>${escapeHtml(entry.ask)}</p>${generatedAskControls(entry, `stakeholder-ask-${index}`)}${initiativeReferenceActions(entry.itemId, `stakeholder-ask-${index}`, entry.target?.kind === "risk" ? "risks" : entry.target?.kind === "dependency" ? "dependencies" : "", entry.target?.recordId || "")}</article>`).join("") || emptyState("No open asks.")}</div></section><section class="panel"><div class="panel-header"><h3>Escalations</h3><span class="muted">Leadership attention</span></div><div class="stakeholder-list">${governance.escalations.map((entry, index) => `<article class="stakeholder-card warning"><span>${escapeHtml(entry.owner)} | severity ${entry.severity}</span><h4>${escapeHtml(entry.title)}</h4><p>${escapeHtml(entry.ask)}</p>${initiativeReferenceActions(entry.itemId, `stakeholder-escalation-${index}`, "risks", entry.recordId, "View risk")}</article>`).join("") || emptyState("No escalations.")}</div></section><section class="panel stakeholders-memo"><div class="panel-header"><h3>Stakeholder Memo</h3><button class="secondary" id="copyStakeholderMemoButton" type="button">Copy Memo</button></div><textarea id="stakeholderMemoDraft" readonly>${escapeHtml(memo)}</textarea></section></section>`;
}
function escalationsView(items) {
  const board = buildEscalationBoard(items, new Date(), state.prioritization);
  const memo = scopeGeneratedText(buildEscalationMemo(items, new Date(), state.prioritization), items);
  return `<section class="metrics reporting-metrics">${metric("Total", board.metrics.total)}${metric("Critical", board.metrics.critical)}${metric("Watch", board.metrics.watch)}${metric("Unassigned", board.metrics.unassigned)}</section><section class="escalations-grid"><section class="panel"><div class="panel-header"><h3>Critical</h3><span class="muted">Needs immediate attention</span></div><div class="escalation-list">${board.critical.map((entry, index) => escalationCard(entry, `critical-${index}`)).join("") || emptyState("No critical escalations.")}</div></section><section class="panel"><div class="panel-header"><h3>Watch</h3><span class="muted">Active management</span></div><div class="escalation-list">${board.watch.map((entry, index) => escalationCard(entry, `watch-${index}`)).join("") || emptyState("No watch-list escalations.")}</div></section><section class="panel"><div class="panel-header"><h3>Monitor</h3><span class="muted">Track and revisit</span></div><div class="escalation-list">${board.monitor.map((entry, index) => escalationCard(entry, `monitor-${index}`)).join("") || emptyState("No monitored escalations.")}</div></section><section class="panel"><div class="panel-header"><h3>Owner Gaps</h3><span class="muted">Escalations without clear accountability</span></div><div class="escalation-list">${board.escalations.filter((entry) => entry.owner === "Unassigned").map((entry, index) => escalationCard(entry, `unassigned-${index}`)).join("") || emptyState("Every escalation has an owner.")}</div></section><section class="panel escalations-memo"><div class="panel-header"><h3>Escalation Memo</h3><button class="secondary" id="copyEscalationMemoButton" type="button">Copy Memo</button></div><textarea id="escalationMemoDraft" readonly>${escapeHtml(memo)}</textarea></section></section>`;
}
function updatesView(items) {
  const update = buildStakeholderUpdate(items, new Date(), state.prioritization);
  const outcome = buildOutcomeReport(items, state.prioritization, themeEvidenceOptions());
  const releaseNotes = scopeGeneratedText(buildReleaseNotes(items, new Date(), state.prioritization), items);
  const launchCandidates = prioritizeItems(items, state.prioritization).filter((item) => item.status === "committed" || item.status === "discovery").slice(0, 4);
  return `<section class="metrics reporting-metrics">${metric("Shipped", outcome.shipped)}${metric("Committed category", outcome.committed)}${metric("Readiness", `${outcome.averageReadiness}%`)}${metric("High risk", outcome.highRisk)}</section><section class="updates-grid"><section class="panel"><div class="panel-header"><h3>Stakeholder Brief</h3><span class="muted">Generated from current work</span></div><article class="brief"><h4>${escapeHtml(update.headline)}</h4><div><strong>Now:</strong> ${initiativeReferenceList(update.now, "update-now") || "No committed initiatives."}</div><div><strong>Next:</strong> ${initiativeReferenceList(update.next, "update-next") || "No discovery initiatives."}</div><div><strong>Risks:</strong> ${initiativeReferenceList(update.risks, "update-risks") || "No major risks captured."}</div><div><strong>Asks:</strong> ${initiativeReferenceList(update.asks, "update-asks") || "No open operational asks."}</div></article></section><section class="panel"><div class="panel-header"><h3>Launch Readiness</h3><span class="muted">Top active initiatives</span></div><div class="readiness-list">${launchCandidates.map((item) => `<article class="readiness"><div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.nextStep || "No next step captured.")}</p>${initiativeReferenceActions(item, "update-launch")}</div><strong>${calculateLaunchReadiness(item)}%</strong></article>`).join("") || emptyState("No active launch candidates.")}</div></section><section class="panel"><div class="panel-header"><h3>Customer Themes</h3><span class="muted">From current work</span></div><div class="theme-list">${outcome.topThemes.map((theme) => `<span>${escapeHtml(theme.theme)} <strong>${theme.count}</strong></span>`).join("") || emptyState("No themes yet.")}</div></section><section class="panel"><div class="panel-header"><h3>Release Notes</h3><button class="secondary" id="copyReleaseNotesButton" type="button">Copy Notes</button></div><textarea id="releaseNotesDraft" readonly>${escapeHtml(releaseNotes)}</textarea></section></section>`;
}
function commsView(items) {
  const plan = buildCommunicationPlan(items, new Date(), state.prioritization, themeEvidenceOptions());
  const memo = scopeGeneratedText(buildCommunicationMemo(items, new Date(), state.prioritization, themeEvidenceOptions()), items);
  return `<section class="metrics reporting-metrics">${metric("Audiences", plan.metrics.audiences)}${metric("Escalations", plan.metrics.escalations)}${metric("Active work", plan.metrics.active)}${metric("Owners", plan.metrics.owners)}</section><section class="comms-grid"><section class="panel"><div class="panel-header"><h3>Audience Plan</h3><span class="muted">Who needs what update</span></div><div class="comms-list">${plan.audiences.map((entry) => `<article class="comms-card"><span>${escapeHtml(entry.cadence)}</span><h4>${escapeHtml(entry.audience)}</h4><p>${escapeHtml(entry.focus)}</p><small>${escapeHtml(entry.message)}</small><strong>${escapeHtml(entry.ask)}</strong>${generatedAskControls(entry, entry.sourceKey)}${entry.itemId ? initiativeReferenceActions(entry.itemId, `comms-${entry.sourceKey}`, entry.target?.kind === "risk" ? "risks" : "dependencies", entry.target?.recordId || "") : ""}</article>`).join("")}</div></section><section class="panel"><div class="panel-header"><h3>Escalations</h3><span class="muted">Asks that need attention</span></div><div class="comms-list">${plan.escalation.map((entry, index) => `<article class="comms-card"><span>Severity ${entry.severity} | ${escapeHtml(entry.owner)}</span><h4>${escapeHtml(entry.title)}</h4><p>${escapeHtml(entry.ask)}</p>${initiativeReferenceActions(entry.itemId, `comms-escalation-${index}`, "risks", entry.recordId, "View risk")}</article>`).join("") || emptyState("No escalations captured.")}</div></section><section class="panel comms-memo"><div class="panel-header"><h3>Comms Memo</h3><button class="secondary" id="copyCommsMemoButton" type="button">Copy Memo</button></div><textarea id="commsMemoDraft" readonly>${escapeHtml(memo)}</textarea></section></section>`;
}
function synthesisSourceActions(entry, context) {
  const records = state.insightRecords.filter(record => (entry.sourceIds || [entry.recordId]).includes(record.id));
  return `${records.map((record, index) => insightRecordLink(record, `${context}-${index}`)).join("")}${initiativeReferenceActions(entry.itemId, context)}`;
}
function synthesisDecisionCards(entries, context) {
  return entries.map((entry, index) => `<article class="review-card" data-decision-source="${escapeHtml(entry.recordId || entry.itemId)}"><span>${entry.origin === "suggested" ? "Suggested decision" : escapeHtml(INSIGHT_STATUS_LABELS[entry.status] || "Captured decision")}</span><h4>${escapeHtml(entry.title)}</h4><p>${escapeHtml(entry.ask)}</p><p class="muted">${escapeHtml(entry.initiativeTitle || "")} · ${escapeHtml(entry.owner)} · ${escapeHtml(entry.dueDate)}</p>${synthesisSourceActions(entry, `${context}-${index}`)}</article>`).join("") || emptyState("No pending decisions captured.");
}
function synthesisEvidenceCards(entries, context) {
  return entries.map((entry, index) => `<article class="review-card" data-evidence-source="${escapeHtml(entry.recordId || entry.itemId)}"><span>Captured finding</span><h4>${escapeHtml(entry.title)}</h4><p>${escapeHtml(entry.evidence)}</p><p class="muted">${escapeHtml(entry.initiativeTitle || "")}</p>${synthesisSourceActions(entry, `${context}-${index}`)}</article>`).join("") || emptyState("No captured findings yet.");
}
function reviewView(items) {
  const review = buildReviewLoop(items, new Date(), state.prioritization, themeEvidenceOptions());
  const memo = scopeGeneratedText(buildReviewMemo(items, new Date(), state.prioritization, themeEvidenceOptions()), items);
  return `<section class="metrics reporting-metrics">${metric("Shipped", review.metrics.shipped)}${metric("Overdue", review.metrics.overdue)}${metric("Pending decisions", review.metrics.pendingDecisions)}${metric("Captured findings", review.metrics.learningEvidence)}</section><section class="review-grid"><section class="panel"><div class="panel-header"><h3>Shipped Work</h3><span class="muted">Showing ${review.shipped.length} of ${review.metrics.shipped} outcomes</span></div><div class="review-list">${review.shipped.map((item) => `<article class="review-card"><span>${escapeHtml(item.customer || "No segment")}</span><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(review.learningEvidence.filter(entry => entry.itemId === item.id).map(entry => entry.evidence).join(" · ") || item.decision || item.experiment || "Capture the launch result.")}</p>${initiativeReferenceActions(item, "review-shipped")}</article>`).join("") || emptyState("No shipped initiatives yet.")}</div></section><section class="panel"><div class="panel-header"><h3>Slipped Commitments</h3><span class="muted">Showing ${review.overdue.length} of ${review.metrics.overdue} overdue initiatives</span></div><div class="review-list">${review.overdue.map((item) => `<article class="review-card"><span>Due ${escapeHtml(item.dueDate)}</span><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.nextStep || "No recovery step captured.")}</p>${initiativeReferenceActions(item, "review-overdue")}</article>`).join("") || emptyState("No overdue active initiatives.")}</div></section><section class="panel"><div class="panel-header"><h3>Decision Review</h3><span class="muted">Escalations and ambiguity</span></div><div class="review-list">${synthesisDecisionCards(review.decisionEntries, "review-decision")}${review.decisionSuggestions.length ? `<h4>Suggested decisions</h4>${synthesisDecisionCards(review.decisionSuggestions, "review-suggestion")}` : ""}${review.riskEscalations.length ? `<h4>Risk escalations</h4>${review.riskEscalations.map((entry, index) => `<article class="review-card"><span>Suggested escalation</span><h4>${escapeHtml(entry.title)}</h4><p>${escapeHtml(entry.context)}</p><p>${escapeHtml(entry.ask)}</p>${synthesisSourceActions(entry, `review-risk-${index}`)}</article>`).join("")}` : ""}</div></section><section class="panel"><div class="panel-header"><h3>Captured Findings</h3><span class="muted">${review.learningEvidence.length} recorded outcomes</span></div><div class="review-list">${synthesisEvidenceCards(review.learningEvidence, "review-finding")}${review.learningPrompts.length ? `<h4>Learning prompts</h4>${review.learningPrompts.map((entry, index) => `<article class="review-card"><span>Suggested prompt</span><h4>${escapeHtml(entry.title)}</h4><p>${escapeHtml(entry.prompt)}</p>${synthesisSourceActions(entry, `review-prompt-${index}`)}</article>`).join("")}` : ""}</div></section><section class="panel"><div class="panel-header"><h3>Retro Prompts</h3><span class="muted">Use in weekly or monthly review</span></div><div class="review-list">${review.retroPrompts.map((prompt) => `<article class="review-card"><p>${escapeHtml(prompt)}</p></article>`).join("")}</div></section><section class="panel review-memo"><div class="panel-header"><h3>Review Memo</h3><button class="secondary" id="copyReviewMemoButton" type="button">Copy Memo</button></div><textarea id="reviewMemoDraft" readonly>${escapeHtml(memo)}</textarea></section></section>`;
}
function retrosView(items) {
  const scopedIds = new Set(items.map((item) => item.id));
  const scopedActivity = state.activity.filter((entry) => !entry.itemId || scopedIds.has(entry.itemId));
  const retro = buildRetrospective(items, scopedActivity, new Date(), state.prioritization, themeEvidenceOptions());
  const memo = scopeGeneratedText(buildRetrospectiveMemo(items, scopedActivity, new Date(), state.prioritization, themeEvidenceOptions()), items);
  return `<section class="metrics reporting-metrics">${metric("Wins", retro.metrics.wins)}${metric("Learnings", retro.metrics.learnings)}${metric("Misses", retro.metrics.misses)}${metric("Follow-ups", retro.metrics.followUps)}</section><section class="retro-grid"><section class="panel"><div class="panel-header"><h3>Wins</h3><span class="muted">Showing ${retro.wins.length} of ${retro.metrics.wins} shipped outcomes</span></div><div class="retro-list">${retro.wins.map((entry, index) => `<article class="retro-card"><h4>${escapeHtml(entry.title)}</h4><p>${escapeHtml(entry.evidence)}</p>${synthesisSourceActions(entry, `retro-win-${index}`)}</article>`).join("") || emptyState("No shipped wins captured yet.")}</div></section><section class="panel"><div class="panel-header"><h3>Learnings</h3><span class="muted">Showing ${retro.learnings.length} of ${retro.metrics.learnings} findings and prompts</span></div><div class="retro-list">${retro.learnings.map((entry, index) => `<article class="retro-card"><span>${entry.origin === "captured" ? "Captured finding" : "Suggested prompt"}</span><h4>${escapeHtml(entry.title)}</h4><p>${escapeHtml(entry.prompt)}</p>${synthesisSourceActions(entry, `retro-learning-${index}`)}</article>`).join("") || emptyState("No learning candidates captured yet.")}</div></section><section class="panel"><div class="panel-header"><h3>Misses</h3><span class="muted">Showing ${retro.misses.length} of ${retro.metrics.misses} overdue initiatives</span></div><div class="retro-list">${retro.misses.map((entry, index) => `<article class="retro-card warning"><h4>${escapeHtml(entry.title)}</h4><p>${escapeHtml(entry.recovery)}</p>${initiativeReferenceActions(entry.itemId, `retro-miss-${index}`)}</article>`).join("") || emptyState("No slipped commitments detected.")}</div></section><section class="panel"><div class="panel-header"><h3>Follow-Ups</h3><span class="muted">Actions for next cycle</span></div><div class="retro-list">${retro.followUps.map(retrospectiveFollowUpCard).join("") || emptyState("No follow-up actions generated.")}</div></section><section class="panel"><div class="panel-header"><h3>Recent Activity</h3><span class="muted">Latest workspace changes</span></div><div class="retro-list">${retro.activity.map((entry, index) => `<article class="retro-card"><span>${escapeHtml(new Date(entry.createdAt).toLocaleString())}</span><h4>${escapeHtml(entry.action)} ${escapeHtml(entry.itemTitle)}</h4><p>${escapeHtml(formatActivityChanges(entry.changes))}</p>${initiativeReferenceActions(entry.itemId, `retro-activity-${index}`)}</article>`).join("") || emptyState("No recent activity captured.")}</div></section><section class="panel retro-memo"><div class="panel-header"><h3>Retro Memo</h3><button class="secondary" id="copyRetroMemoButton" type="button">Copy Memo</button></div><textarea id="retroMemoDraft" readonly>${escapeHtml(memo)}</textarea></section></section>`;
}
function operationsView(items) {
  const risks = buildRiskRegister(items, state.prioritization);
  const stakeholderMap = buildStakeholderMap(items);
  const cadence = buildOperatingCadence(items, state.prioritization);
  const hygiene = buildBacklogHygiene(items, new Date(), state.prioritization);
  const weekly = buildWeeklyPlan(items, state.prioritization, themeEvidenceOptions());
  return `<section class="metrics reporting-metrics">${metric("Hygiene", formatOperationalScore(hygiene.score))}${metric("Stale", hygiene.stale.length)}${metric("Missing owner", hygiene.missingOwner.length)}${metric("Missing next", hygiene.missingNextStep.length)}</section><section class="operations-grid"><section class="panel"><div class="panel-header"><h3>Risk Register</h3><span class="muted">Prioritized by likelihood and impact</span></div><div class="ops-list">${risks.slice(0, 6).map((risk, index) => `<article class="ops-row"><div><h4>${escapeHtml(risk.item.title)}</h4><p>${escapeHtml(risk.record.description)}</p><span>${escapeHtml(risk.mitigation)}</span>${initiativeDetailButton(risk.item, `risk-register-${index}`, "Manage risk", "risks", risk.record.id)}</div><strong aria-label="${escapeHtml(risk.status)} severity ${risk.severity}">${risk.severity}</strong></article>`).join("") || emptyState("No active risks captured.")}</div></section><section class="panel"><div class="panel-header"><h3>Weekly Plan</h3><span class="muted">Focus, decisions, and unblockers</span></div><div class="weekly-plan"><h4>Focus</h4>${listPlanItems(weekly.focus, "weekly-focus")}<h4>Discover</h4>${listPlanItems(weekly.discover, "weekly-discover")}<h4>Decide</h4>${synthesisDecisionCards(weekly.decisionEntries, "weekly-decide")}${weekly.decisionSuggestions.length ? `<h4>Suggested decisions</h4>${synthesisDecisionCards(weekly.decisionSuggestions, "weekly-suggested")}` : ""}<h4>Unblock</h4>${listPlanItems(weekly.unblock, "weekly-unblock")}</div></section><section class="panel"><div class="panel-header"><h3>Backlog Hygiene</h3><span class="muted">Operational cleanup</span></div><div class="hygiene-list"><h4>Suggested actions</h4>${weekly.actionTargets.map(operationsRecommendationCard).join("") || emptyState("No cleanup actions right now.")}<h4>Parking candidates</h4>${initiativeReferenceList(hygiene.parkingCandidates, "parking-candidate") || emptyState("No parking candidates.")}</div></section><section class="panel"><div class="panel-header"><h3>Stakeholder Map</h3><span class="muted">Owners and customer segments</span></div><div class="stakeholder-columns"><div><h4>Owners</h4>${stakeholderMap.owners.map((entry) => `<p><strong>${entry.count}</strong> ${escapeHtml(entry.name)}</p>`).join("")}</div><div><h4>Segments</h4>${stakeholderMap.segments.map((entry) => `<p><strong>${entry.count}</strong> ${escapeHtml(entry.name)}</p>`).join("")}</div></div></section><section class="panel cadence-panel"><div class="panel-header"><h3>Operating Cadence</h3><span class="muted">Suggested PM rituals</span></div><div class="cadence-list">${cadence.map((ritual) => `<article class="cadence-card"><span>${escapeHtml(ritual.cadence)}</span><h4>${escapeHtml(ritual.name)}</h4><p>${escapeHtml(ritual.focus)}</p><small>${escapeHtml(ritual.agenda.join(" | ") || "No agenda items yet.")}</small></article>`).join("")}</div></section></section>`;
}
function specsView(items) {
  const candidates = prioritizeItems(items, state.prioritization).filter((item) => item.status !== "shipped" && item.status !== "parked");
  const selected = candidates.find((item) => item.id === state.selectedSpecId) || candidates[0];
  const spec = selected ? buildProductSpec(selected, items, state.prioritization) : null;
  const draft = scopeGeneratedText(selected ? buildProductSpecMarkdown(selected, items, new Date(), state.prioritization) : "No active initiatives available for spec generation.", items);
  return `<section class="specs-grid"><section class="panel"><div class="panel-header"><h3>Spec Candidates</h3><span class="muted">Prioritized active work</span></div><div class="spec-list">${candidates.map((item) => `<button class="spec-option ${selected?.id === item.id ? "active" : ""}" data-spec="${item.id}" type="button"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(workspacePriorityLabel())} ${escapeHtml(workspacePriorityValue(item))} | ${escapeHtml(initiativeReportingContext(state.workflow, item))}</span></button>`).join("") || emptyState("No active initiatives to specify.")}</div></section><section class="panel"><div class="panel-header"><h3>Spec Readiness</h3><span class="muted">${spec ? `${spec.readiness}% ready` : "No spec"}</span></div>${spec ? `<div class="spec-summary">${initiativeReferenceActions(selected, "spec-selected")}<p><strong>Owner</strong><span>${escapeHtml(spec.owner)}</span></p><p><strong>Objective</strong><span>${escapeHtml(spec.objective)}</span></p><p><strong>Metric</strong><span>${escapeHtml(spec.successMetric)}</span></p><p><strong>Gaps</strong><span>${spec.readinessGaps.length}</span></p></div>` : emptyState("Select an initiative.")}</section><section class="panel spec-draft"><div class="panel-header"><h3>PRD Draft</h3><button class="secondary" id="copySpecButton" type="button">Copy PRD</button></div><textarea id="specDraft" readonly>${escapeHtml(draft)}</textarea></section></section>`;
}
function meetingsView(items) {
  const meetingTypes = ["weekly-review", "daily-triage", "launch-review", "decision-review"];
  const agendas = meetingTypes.map((type) => buildMeetingAgenda(items, type, new Date(), state.prioritization, themeEvidenceOptions()));
  const selected = scopeGeneratedText(buildMeetingAgendaMarkdown(items, state.selectedMeeting, new Date(), state.prioritization, themeEvidenceOptions()), items);
  return `<section class="meetings-grid"><section class="panel"><div class="panel-header"><h3>Meeting Agendas</h3><span class="muted">Generated from current work</span></div><div class="meeting-list">${agendas.map((agenda) => `<button class="meeting-option ${state.selectedMeeting === agenda.id ? "active" : ""}" data-meeting="${agenda.id}" type="button"><strong>${escapeHtml(agenda.title)}</strong><span>${agenda.duration} min | ${agenda.sections.length} sections</span></button>`).join("")}</div></section><section class="panel"><div class="panel-header"><h3>Agenda Draft</h3><button class="secondary" id="copyMeetingAgendaButton" type="button">Copy Agenda</button></div><textarea id="meetingAgendaDraft" readonly>${escapeHtml(selected)}</textarea></section></section>`;
}
function templatesView(items) {
  const draft = scopeGeneratedText(buildTemplateDraft(state.selectedTemplate, items, state.prioritization), items);
  return `<section class="templates-layout"><section class="panel"><div class="panel-header"><h3>Operating Templates</h3><span class="muted">Reusable PM rituals</span></div><div class="template-list">${pmTemplates.map((template) => `<button class="template-option ${state.selectedTemplate === template.id ? "active" : ""}" data-template="${template.id}" type="button"><strong>${escapeHtml(template.title)}</strong><span>${escapeHtml(template.description)}</span></button>`).join("")}</div></section><section class="panel"><div class="panel-header"><h3>Draft</h3><button class="secondary" id="copyTemplateButton" type="button">Copy Markdown</button></div><textarea id="templateDraft" readonly>${escapeHtml(draft)}</textarea></section></section>`;
}

function decisionsView(items) {
  return savedDecisionsMarkup(savedDecisionsForView(items));
}

function savedDecisionsForView(items) {
  const itemIds = new Set(items.map((item) => item.id));
  const scopeIds = new Set((timelineScopeApplies() ? filterItemsByPeriod(state.items, state.periodSelection, state.planningCalendar) : state.items).map((item) => item.id));
  const matching = new Set(filterInsightRecords(state.insightRecords, { type: "decision", query: state.query }).map((record) => record.id));
  return state.insightRecords.filter((record) => record.type === "decision"
    && (record.initiativeId ? scopeIds.has(record.initiativeId) : !timelineScopeApplies() || state.periodSelection.kind === "all")
    && (matching.has(record.id) || itemIds.has(record.initiativeId)));
}

function savedDecisionLists(records, context) {
  const card = (record) => `<article class="action-card compact" data-saved-decision="${escapeHtml(record.id)}"><span>${escapeHtml(INSIGHT_STATUS_LABELS[record.status])} · ${escapeHtml(record.owner || organizationPersonName(record.ownerPersonId) || "Unassigned")}</span><h5>${escapeHtml(record.title)}</h5><p>${escapeHtml(record.question || "Question not captured.")}</p><p>${escapeHtml(record.outcome || "Outcome not captured.")}</p><div class="contextual-card-actions">${insightRecordLink(record, context)}</div></article>`;
  return `<section data-decision-state="pending"><h4>Pending and revisit</h4><div class="action-list">${records.filter((record) => record.status !== "decided").map(card).join("") || emptyState("No pending decisions saved.")}</div></section><section data-decision-state="history"><h4>Decision history</h4><div class="action-list">${records.filter((record) => record.status === "decided").map(card).join("") || emptyState("No decided outcomes saved.")}</div></section>`;
}

function savedDecisionsMarkup(records) {
  return `<section class="panel" data-saved-decisions aria-labelledby="savedDecisionsTitle"><div class="panel-header"><h3 id="savedDecisionsTitle">Saved decisions</h3><button class="primary" id="newSavedDecisionButton" data-new-insight="decision" type="button" ${teamEditorReadOnlyReason() ? "disabled" : ""}>New decision</button></div><p>Keep the question, outcome and rationale together. Revisit a decision when it needs another review.</p>${savedDecisionLists(records, "saved-decisions")}</section>`;
}

function initiativeSavedDecisionsMarkup(item) {
  const records = state.insightRecords.filter((record) => record.type === "decision" && record.initiativeId === item.id);
  return `<section class="initiative-detail-section" aria-label="Saved decisions"><div class="initiative-detail-section-heading"><h4>Saved decisions</h4><button class="secondary small" id="addInitiativeDecision-${elementIdToken(item.id)}" data-add-initiative-decision="${escapeHtml(item.id)}" type="button" ${teamEditorReadOnlyReason() ? "disabled" : ""}>Record decision</button></div>${savedDecisionLists(records, `initiative-decisions-${item.id}`)}</section>`;
}

function openInitiativeWorkRecord(itemId, type, trigger, actionContext = null, forceNew = false) {
  if (teamEditorReadOnlyReason()) return;
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return;
  const recordId = forceNew ? "" : type === "action" ? item.currentActionId : type === "validation" ? item.currentValidationId : item.currentDecisionId;
  const record = state.insightRecords.find((entry) => entry.id === recordId && entry.type === type && entry.initiativeId === itemId);
  state.insightEditor = createInsightEditorState({ mode: record ? "edit" : "new", type, selectedId: record?.id || "", triggerId: trigger?.id || "viewTitle", actionContext, focusField: type === "validation" && !forceNew ? "method" : "",
    draft: record ? null : { ...blankInsightValues(type), ...(type === "validation" && !forceNew ? { title: `Experiment: ${item.title}` } : {}), initiativeId: item.id, owner: item.owner, ownerPersonId: item.pocPersonId || "", customerIds: item.customerIds, segmentIds: item.segmentIds }
  });
  render();
}

function activityView() {
  const digest = buildActivityDigest(state.activity, new Date(), state);
  return `<section class="activity-layout"><section class="panel"><div class="panel-header"><h3>Activity Trail</h3><span class="muted">${state.activity.length} events</span></div><div class="activity-list">${state.activity.slice(0, 80).map((entry) => `<article class="activity-card"><span>${escapeHtml(new Date(entry.createdAt).toLocaleString())} | ${escapeHtml(entry.actor)}</span><h4>${escapeHtml(entry.action)} ${escapeHtml(entry.itemTitle)}</h4><p>${escapeHtml(formatActivityChanges(entry.changes))}</p></article>`).join("") || emptyState("No activity recorded yet.")}</div></section><section class="panel"><div class="panel-header"><h3>Digest</h3><button class="secondary" id="copyActivityDigestButton" type="button">Copy Digest</button></div><textarea id="activityDigestDraft" readonly>${escapeHtml(digest)}</textarea></section></section>`;
}
function dataView() {
  const teamSelected = state.sourceSelection === "team" || state.sourceSelection === "local-server";
  const teamActive = state.team.active;
  const browserSourceLabel = demoMode ? "Demo workspace" : sourceChoiceLabel(state.sourceSelection);
  const sourceLabel = teamActive ? `${state.team.workspace?.name || "Server workspace"} · ${sourceChoiceLabel(state.sourceSelection)}` : browserSourceLabel;
  const busyDisabled = state.dataBusy ? "disabled" : "";
  const recoveryRows = state.backups.map(recoverySnapshotRow).join("") || emptyState("No recovery snapshots yet.");
  const importDisabled = state.dataBusy || teamActive ? "disabled" : "";
  const teamExportDisabled = state.dataBusy ? "disabled" : "";
  const exportItems = filterItemsByPeriod(state.items, state.periodSelection, state.planningCalendar);
  const exportScope = periodSelectionLabel(state.periodSelection, state.planningCalendar);
  const exportRange = periodSelectionRangeLabel(state.periodSelection, state.planningCalendar);
  return `<section class="source-grid" id="dataRegion" aria-busy="${state.dataBusy}">
    ${dataOverviewMarkup()}
    <section class="panel data-panel data-backup-panel">
      <div class="panel-header"><h3>Backup and restore</h3><span class="muted">Keep a copy of your work</span></div>
      <p>Download a complete workspace backup, or import saved work. Keep downloaded backups somewhere safe; PM OS cannot check whether a downloaded file was saved or deleted.</p>
      <div class="data-actions"><button class="primary" id="exportButton" ${teamActive ? teamExportDisabled : busyDisabled} type="button">Download backup</button><button class="file-button" id="importButton" ${importDisabled} type="button">Import saved work</button><input class="sr-only" id="importInput" ${importDisabled} type="file" tabindex="-1" aria-label="Choose workspace data file" accept=".json,.csv,.md,application/json,text/csv,text/markdown"><button class="danger" id="resetButton" ${importDisabled} type="button">${demoMode ? "Reset demo data" : "Clear workspace"}</button></div>
      <p>Backups use JSON and contain the complete workspace. You can also import initiative CSV files or GitHub issue drafts. CSV and issue files add selected initiatives after preview; JSON backups replace the workspace after confirmation.</p>
      <p class="data-status" id="dataStatus" tabindex="-1" role="status" aria-live="polite" aria-atomic="true">${escapeHtml(state.dataStatus)}</p>
      <details class="data-advanced" id="dataAdvanced" ${state.dataAdvancedOpen ? "open" : ""}><summary>Advanced / inspect export</summary>
      <div class="export-scope-note"><div><p class="panel-kicker">Current export scope</p><strong>${escapeHtml(exportScope)}</strong><span>${escapeHtml(exportRange)} · ${exportItems.length} initiative${exportItems.length === 1 ? "" : "s"}</span></div><p>CSV and GitHub Issues use this scope. JSON, recovery, imports, Drive sync, and Team snapshots always retain the complete workspace.</p></div>
      <div class="data-actions"><button class="secondary" id="exportCsvButton" ${teamActive ? teamExportDisabled : busyDisabled} type="button">Export CSV</button><button class="secondary" id="exportIssuesButton" ${teamActive ? teamExportDisabled : busyDisabled} type="button">Export GitHub Issues</button></div>
      <label for="exportPreview">Complete workspace JSON</label><textarea id="exportPreview" readonly>${escapeHtml(exportPortableWorkspace())}</textarea></details>
      ${teamActive ? `<p class="data-boundary-note">Team exports contain portable workspace and activity data only. Team membership, configuration, and session data are excluded.</p>` : ""}
    </section>
    ${workspaceModeSettingsMarkup()}
    <section class="panel data-panel source-panel">
      <div class="panel-header"><div><p class="panel-kicker">Storage and sync</p><h3>Choose where PM OS saves</h3></div><span class="muted">${escapeHtml(sourceLabel)}</span></div>
      ${sourceCardsMarkup()}
      <label class="sr-only"><span>Save location</span><select id="sourceType" ${demoMode || state.dataBusy ? "disabled" : ""}><option value="local" ${state.sourceSelection === "local" ? "selected" : ""}>Local workspace</option><option value="local-file" ${state.sourceSelection === "local-file" ? "selected" : ""}>Linked workspace file</option><option value="drive-folder" ${state.sourceSelection === "drive-folder" ? "selected" : ""}>Google Drive</option><option value="local-server" ${state.sourceSelection === "local-server" ? "selected" : ""}>PM OS Local Server</option><option value="team" ${state.sourceSelection === "team" ? "selected" : ""}>Team Server</option></select></label>
      <div class="source-setup" aria-label="${escapeHtml(sourceChoiceLabel(state.sourceSelection))} setup">${sourceSetupMarkup()}</div>
      <div class="source-note"><strong>${escapeHtml(sourceLabel)}</strong><p>${escapeHtml(sourceHelpText())}</p><p id="syncStatus" tabindex="-1" role="status" aria-live="polite" aria-atomic="true">${escapeHtml(state.syncStatus)}</p></div>
    </section>
    ${teamMembersMarkup()}
    ${tutorialSettingsPanelMarkup()}
    <section class="panel data-panel usage-panel" aria-labelledby="usageTitle">
      <div class="panel-header"><div><h3 id="usageTitle">Local Usage</h3><span class="muted">${demoMode ? "Demo mode" : "This browser"}</span></div><button class="secondary" id="resetUsageButton" type="button" ${demoMode || state.dataBusy ? "disabled" : ""}>Reset Usage</button></div>
      <p class="usage-disclosure">Stored only in this browser. No workspace content is recorded or synced.</p>
      ${usageSummaryMarkup()}
      <p class="sr-only" id="usageStatus" role="status" aria-live="polite" aria-atomic="true"></p>
    </section>
    <section class="panel data-panel recovery-panel" aria-labelledby="recoveryTitle">
      <div class="panel-header"><h3 id="recoveryTitle">Recovery copies on this device</h3><span class="muted">${state.backups.length} of 5 saved</span></div>
      <p class="recovery-disclosure">${demoMode ? "Demo keeps up to five recovery copies until this page reloads. Download a backup to keep a separate copy." : "PM OS keeps up to five copies before replacing local work. These copies stay in this browser and can be lost if browser data is cleared. Team workspace content is never stored here."}</p>
      <div class="recovery-list">${recoveryRows}</div>
    </section>
  </section>
  ${teamInviteDialogMarkup()}`;
}

function sourceCardsMarkup() {
  const choices = [
    { id: "local", title: "On this device", description: "Save in this browser or in a workspace file you choose.", meta: "No account needed" },
    { id: "drive-folder", title: "Google Drive", description: "A workspace file with checks before combining changes.", meta: "Google account" },
    { id: "local-server", title: "PM OS Local Server", description: "Shared storage on your computer or local network.", meta: "Docker" },
    { id: "team", title: "Team Server", description: "Shared storage on a server your team manages.", meta: "Shared workspace" }
  ];
  const selected = state.sourceSelection === "local-file" ? "local" : state.sourceSelection;
  return `<div class="source-cards" role="group" aria-label="Workspace storage choices">${choices.map((choice) => {
    const unavailable = demoMode && choice.id !== "local";
    const active = selected === choice.id;
    return `<button class="source-card ${active ? "is-active" : ""}" data-source-choice="${choice.id}" type="button" aria-pressed="${active}" ${unavailable || state.dataBusy ? "disabled" : ""}><span class="source-card-top"><strong>${choice.title}</strong><span>${choice.meta}</span></span><small>${choice.description}</small>${unavailable ? `<em>Unavailable in demo mode</em>` : ""}</button>`;
  }).join("")}</div>`;
}

function sourceSetupMarkup() {
  if (state.sourceSelection === "drive-folder") return driveSourceSetupMarkup();
  if (state.sourceSelection === "local-server" || state.sourceSelection === "team") return teamSourceMarkup();
  return localSourceSetupMarkup();
}

function localSourceSetupMarkup() {
  const supported = linkedFileSupported();
  const linked = state.sourceSelection === "local-file";
  const disabled = demoMode || state.dataBusy ? "disabled" : "";
  return `<div class="local-source-setup"><div class="source-choice-row"><button class="${linked ? "secondary" : "primary"}" id="useBrowserStorageButton" ${disabled} type="button">Save on this device</button><button class="secondary" id="createWorkspaceFileButton" ${disabled || !supported ? "disabled" : ""} type="button">Create workspace file</button><button class="${linked ? "primary" : "secondary"}" id="linkWorkspaceFileButton" ${disabled || !supported ? "disabled" : ""} type="button">${linked ? "Open another file" : "Open existing file"}</button></div>${supported ? "" : `<p class="source-disabled-reason">Workspace files need Chromium's File System Access API. You can still save on this device, download backups, and import saved work.</p>`}${linked ? `<div class="source-readiness"><p><span>Linked file</span><strong>${escapeHtml(state.linkedFile.name || state.source.fileName || "Permission needed")}</strong></p><p><span>Permission</span><strong>${escapeHtml(state.linkedFile.permission)}</strong></p><div class="source-choice-row"><button class="secondary" id="saveLinkedFileButton" ${disabled || !state.linkedFile.handle || state.sync.fileConflicts.length ? "disabled" : ""} type="button">Save now</button><button class="secondary" id="requestLinkedFilePermissionButton" ${disabled || !state.linkedFile.handle ? "disabled" : ""} type="button">Check permission</button><button class="secondary" id="unlinkWorkspaceFileButton" ${disabled ? "disabled" : ""} type="button">Unlink file</button></div></div>${linkedFileConflictMarkup()}` : `<p class="source-readiness-copy">${demoMode ? "Demo changes and recovery snapshots reset whenever this page reloads." : "Changes save immediately in this browser. Recovery snapshots stay on this device."}</p>`}</div>`;
}

function linkedFileConflictMarkup() {
  if (!state.sync.fileConflicts.length) return "";
  return `<div class="linked-file-conflicts" role="alert"><h4>Choose each conflicting field</h4><p>The linked file will stay unchanged until every field is resolved.</p><ul>${state.sync.fileConflicts.map((conflict) => `<li><code>${escapeHtml(conflict.path || "workspace")}</code><dl><dt>Browser version</dt><dd><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(JSON.stringify(conflict.local, null, 2) ?? "(deleted)")}</pre></dd><dt>File version</dt><dd><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(JSON.stringify(conflict.remote, null, 2) ?? "(deleted)")}</pre></dd></dl><div class="source-choice-row"><button class="secondary" data-file-conflict-path="${escapeHtml(conflict.path)}" data-file-conflict-choice="local" type="button">Keep browser</button><button class="secondary" data-file-conflict-path="${escapeHtml(conflict.path)}" data-file-conflict-choice="remote" type="button">Use file</button></div></li>`).join("")}</ul></div>`;
}

function driveSourceSetupMarkup() {
  const sourceSettingsDisabled = demoMode || state.dataBusy ? "disabled" : "";
  const connectDisabled = demoMode || state.dataBusy || !driveSourceReady(state.source) ? "disabled" : "";
  const driveActionDisabled = demoMode || state.dataBusy || !state.driveToken ? "disabled" : "";
  const conflict = state.driveReview || state.sync.conflict;
  const runtime = normalizeDriveRuntimeConfig(globalThis.PM_OS_DRIVE_CONFIG);
  const pickerReady = Boolean(runtime?.pickerApiKey && runtime?.appId);
  const clientId = state.source.clientId || runtime?.clientId || "";
  const disabledReason = !driveSourceReady({ ...state.source, clientId })
    ? "Add a browser-safe Google OAuth client ID before connecting."
    : !state.driveToken ? "Connect Drive to enable sync. Access remains only for this browser session." : "";
  const conflictMarkup = conflict ? `<div class="drive-conflict" role="alert" aria-labelledby="driveConflictTitle"><h4 id="driveConflictTitle" tabindex="-1">Drive changes need review</h4><p>${escapeHtml(driveConflictStatus(conflict))}</p><div class="conflict-actions"><button class="secondary" id="pullDriveButton" ${driveActionDisabled} type="button">Download Drive copy</button><button class="secondary" id="saveConflictCopyButton" ${driveActionDisabled} type="button">Save browser conflict copy</button></div></div>` : "";
  return `<div class="source-options">
    <label><span>OAuth client ID</span><input id="driveClientId" value="${escapeHtml(clientId)}" placeholder="Google OAuth web client ID" ${sourceSettingsDisabled}></label>
    <label><span>Drive folder</span><input id="driveFolderName" value="${escapeHtml(state.source.folderName)}" placeholder="PM OS" ${sourceSettingsDisabled}></label>
    <label><span>Workspace file</span><input id="driveFileName" value="${escapeHtml(state.source.fileName)}" placeholder="pm-os-workspace.json" ${sourceSettingsDisabled}></label>
  </div>
  <div class="drive-actions"><button class="${state.driveToken ? "secondary" : "primary"}" id="connectDriveButton" ${connectDisabled} type="button">${state.driveToken ? "Reconnect Drive" : "Connect Drive"}</button>${pickerReady ? `<button class="secondary" id="chooseDriveFileButton" ${driveActionDisabled} type="button">Choose Drive file</button>` : ""}<button class="primary" id="syncDriveButton" ${driveActionDisabled || conflict ? "disabled" : ""} type="button">Sync now</button></div>
  ${disabledReason ? `<p class="source-disabled-reason">${escapeHtml(disabledReason)}</p>` : ""}
  <div class="sync-facts"><p><strong>Last download</strong><span>${escapeHtml(formatSyncTime(state.sync.lastPulledAt))}</span></p><p><strong>Last upload</strong><span>${escapeHtml(formatSyncTime(state.sync.lastPushedAt))}</span></p><p><strong>Saved Drive version</strong><span>${escapeHtml(formatSyncTime(state.sync.baseRemote?.modifiedTime))}</span></p><p><strong>Latest Drive version checked</strong><span>${escapeHtml(formatSyncTime(state.sync.remote?.modifiedTime))}</span></p></div>
  <p class="muted">Dates show when each Drive file version was last changed. PM OS compares the saved version with the latest version it checked before uploading.</p>
  ${conflictMarkup}
  <details class="source-advanced" ${state.driveAdvancedOpen ? "open" : ""}><summary>Replace one copy with another</summary><p>Use these only when you intentionally want one side to replace the other.</p><div class="drive-actions"><button class="secondary" id="checkDriveButton" ${driveActionDisabled} type="button">Inspect Drive</button><button class="secondary" id="${conflict ? "advancedPullDriveButton" : "pullDriveButton"}" ${driveActionDisabled} type="button">Use Drive copy on this device</button><button class="secondary" id="pushDriveButton" ${driveActionDisabled} type="button">Upload this device's copy</button></div></details>`;
}

function sourceChoiceLabel(selection) {
  return ({ local: "Saved on this device", "local-file": "Linked workspace file", "drive-folder": "Google Drive", "local-server": "PM OS Local Server", team: "Team Server" })[selection] || "Saved on this device";
}

function dataOverviewMarkup() {
  const team = state.team.active;
  const source = demoMode ? "Demo only — resets on reload" : team ? state.team.workspace?.name || "Team workspace"
    : state.source.type === "google-drive" ? `Google Drive · ${state.source.fileName || "Workspace file"}${driveSourceReady({ ...state.source, clientId: state.source.clientId || normalizeDriveRuntimeConfig(globalThis.PM_OS_DRIVE_CONFIG)?.clientId || "" }) ? "" : " · setup incomplete"}`
      : state.source.type === "local-file" ? `Linked workspace file · ${state.linkedFile.name || state.source.fileName || "File not selected"}`
        : state.source.type.startsWith("supabase-") ? "Team server · workspace not open" : "Browser storage on this device";
  let browserCopy = false;
  let browserStorageAvailable = true;
  if (!demoMode && !team) {
    try { browserCopy = Boolean(localStorage.getItem(storageKey)); }
    catch { browserStorageAvailable = false; }
  }
  const device = demoMode ? "Temporary demo data; not saved" : team ? "Team workspace is held in memory; no browser recovery copy"
    : !browserStorageAvailable ? "Browser storage could not be checked"
      : state.storageWarning ? "Browser copy needs recovery; current work is not confirmed saved"
        : !browserCopy ? "No saved browser copy yet"
          : state.localWriteConflict ? "Browser copy exists; a save failed — review saved work"
            : "Browser copy saved on this device; not a separate backup";
  let history = "Not applicable — browser storage only";
  if (demoMode) history = "Demo changes are not synced";
  else if (team) history = "Server workspace opened; last successful save time is not recorded here";
  else if (state.source.type === "google-drive") {
    const baselineKnown = driveFingerprintComplete(state.sync.baseRemote) && Boolean(state.sync.baseDocument);
    const transfers = baselineKnown ? [
      state.sync.lastPushedAt && `Uploaded ${formatSyncTime(state.sync.lastPushedAt)}`,
      state.sync.lastPulledAt && `Downloaded ${formatSyncTime(state.sync.lastPulledAt)}`
    ].filter(Boolean) : [];
    history = transfers.length ? `${transfers.join(" · ")}. History does not confirm later device changes are synced.`
      : "No successful Drive upload or download recorded with a matching saved file version";
  } else if (state.source.type === "local-file") {
    history = state.sync.fileBaselineDocument && state.sync.fileLastModified
      ? `Known file version modified ${formatSyncTime(state.sync.fileLastModified)}. This is the file modification time, not the last save time; later device changes may be pending.`
      : "No linked file version confirmed";
  } else if (state.source.type.startsWith("supabase-")) history = "No server workspace open in this view";
  const sharing = demoMode ? "Sample data; no sharing" : team ? `${state.team.role || "viewer"} access · Team workspace`
    : state.source.type === "google-drive" ? "Drive file access controls sharing; no live collaboration" : "Not shared with a Team workspace";
  const latest = !team && state.backups[0];
  const recovery = team ? "Ask your administrator about server backups; download a workspace backup here."
    : latest ? `${state.backups.length} recovery ${state.backups.length === 1 ? "copy" : "copies"} · latest ${formatSyncTime(latest.createdAt)}` : "No recovery copies yet. Download a backup to keep a separate copy.";
  const unsavedBrowser = !demoMode && !team && state.source.type === "browser" && !browserCopy && !state.storageWarning && !state.localWriteConflict;
  const status = demoMode ? "Demo changes and recovery copies reset on reload" : !browserStorageAvailable ? "Browser storage could not be checked" : unsavedBrowser ? "No browser save confirmed" : globalSyncLabel();
  return `<section class="panel data-overview" aria-labelledby="dataOverviewTitle"><div class="panel-header"><div><p class="panel-kicker">Your work</p><h3 id="dataOverviewTitle">Where your work is saved</h3></div></div><dl><div><dt>Configured destination</dt><dd>${escapeHtml(source)}</dd></div><div><dt>This device</dt><dd>${escapeHtml(device)}</dd></div><div><dt>Save status</dt><dd ${unsavedBrowser ? "" : "data-save-status"}>${escapeHtml(status)}</dd></div><div><dt>Confirmed destination history</dt><dd>${escapeHtml(history)}</dd></div><div><dt>Sharing</dt><dd>${escapeHtml(sharing)}</dd></div><div><dt>Latest recovery copy</dt><dd>${escapeHtml(recovery)}</dd></div></dl>${!demoMode && !team && state.source.type === "browser" ? `<p>Browser storage stays on this device. Clearing browser data can remove your work and recovery copies. A downloaded backup gives you a separate copy.</p>` : ""}</section>`;
}

function workspaceModeSettingsMarkup() {
  const activeLabel = demoMode ? "Demo mode" : "My workspace";
  const activeDescription = demoMode
    ? "Sample initiatives are active. Demo changes and recovery copies reset whenever this page reloads. External data sources are disabled."
    : "Your saved Browser, Drive, or Team workspace is active. Demo data remains separate.";
  return `<section class="panel data-panel workspace-mode-panel" aria-labelledby="workspaceModeTitle">
    <div class="workspace-mode-copy"><p class="panel-kicker">Environment</p><h3 id="workspaceModeTitle">Workspace mode</h3><p>Explore sample data or return to your saved work. PM OS reloads when you switch; demo changes stay separate.</p></div>
    <div class="workspace-mode-control">
      <span class="workspace-mode-status ${demoMode ? "is-demo" : ""}">${activeLabel}</span>
      <label class="workspace-mode-toggle" for="demoModeToggle">
        <span><strong>Demo mode</strong><small>${activeDescription}</small></span>
        <span class="workspace-mode-switch-control"><input id="demoModeToggle" type="checkbox" role="switch" ${demoMode ? "checked" : ""} ${state.dataBusy ? "disabled" : ""}><span class="workspace-mode-switch-track" aria-hidden="true"><span></span></span></span>
      </label>
      <div class="workspace-mode-actions">${demoMode
        ? `<button class="secondary" id="convertDemoWorkspaceButton" type="button" ${state.dataBusy ? "disabled" : ""}>Convert demo to my workspace</button>`
        : `<button class="secondary" id="exploreDemoWorkspaceButton" type="button" ${state.dataBusy ? "disabled" : ""}>Explore with sample data</button>`}</div>
    </div>
  </section>`;
}

function workspaceModeChoiceMarkup() {
  if (!state.modeChoiceOpen) return "";
  return `<dialog class="workspace-mode-dialog" id="workspaceModeDialog" aria-labelledby="workspaceModeChoiceTitle" aria-describedby="workspaceModeChoiceDescription">
    <div class="workspace-mode-dialog-header"><p class="eyebrow">Welcome to PM OS</p><h2 id="workspaceModeChoiceTitle">How would you like to start?</h2><p id="workspaceModeChoiceDescription">Start a real workspace with no records, or explore PM OS using clearly identified sample data. You can switch anytime in Settings.</p></div>
    <div class="workspace-mode-options">
      <button class="workspace-mode-option is-recommended" id="chooseOperationModeButton" type="button" autofocus><span class="workspace-mode-option-label">Recommended</span><strong>Start with an empty workspace</strong><span>Create your first real initiative in a blank workspace. Saved Browser, Drive, and Team workspaces remain available.</span><span class="workspace-mode-option-action">Start working <span aria-hidden="true">&rarr;</span></span></button>
      <button class="workspace-mode-option" id="chooseDemoModeButton" type="button"><span class="workspace-mode-option-label">Sample workspace</span><strong>Explore with sample data</strong><span>Use ready-made examples in a visibly marked demo. Demo changes stay temporary and never touch saved work.</span><span class="workspace-mode-option-action">Explore demo <span aria-hidden="true">&rarr;</span></span></button>
    </div>
    <p class="workspace-mode-dialog-note">This choice is stored only in this browser.</p>
  </dialog>`;
}

function initialStorageChoiceMarkup() {
  if (!state.storageChoiceOpen) return "";
  const supported = linkedFileSupported();
  return `<dialog class="workspace-mode-dialog" id="initialStorageDialog" aria-labelledby="initialStorageTitle" aria-describedby="initialStorageDescription initialStorageStatus">
    <div class="workspace-mode-dialog-header"><p class="eyebrow">Your workspace</p><h2 id="initialStorageTitle">Where should PM OS save?</h2><p id="initialStorageDescription">${supported ? "Create a portable workspace file, open one you already have, or keep your workspace private in this browser." : "Keep your workspace private in this browser and export a portable JSON backup whenever you need one."} You can change this later in Settings.</p></div>
    <div class="workspace-mode-options storage-mode-options">
      ${supported ? `<button class="workspace-mode-option is-recommended" id="initialCreateWorkspaceFileButton" type="button" autofocus><span class="workspace-mode-option-label">Recommended</span><strong>Create a workspace file</strong><span>Choose a location for a new pm-os-workspace.json file. PM OS will link it and autosave future changes.</span><span class="workspace-mode-option-action">Create file <span aria-hidden="true">&rarr;</span></span></button>
      <button class="workspace-mode-option" id="initialOpenWorkspaceFileButton" type="button"><span class="workspace-mode-option-label">Existing workspace</span><strong>Open an existing file</strong><span>Load and link a PM OS workspace JSON file. Your current browser workspace is backed up before it is replaced.</span><span class="workspace-mode-option-action">Open file <span aria-hidden="true">&rarr;</span></span></button>` : ""}
      <button class="workspace-mode-option ${supported ? "" : "is-recommended"}" id="initialUseBrowserStorageButton" type="button" ${supported ? "" : "autofocus"}><span class="workspace-mode-option-label">${supported ? "No file needed" : "Available here"}</span><strong>Keep saving in this browser</strong><span>Changes save immediately on this device. ${supported ? "You can export JSON or create a linked file later." : "You can export a portable JSON backup from Data at any time."}</span><span class="workspace-mode-option-action">Use browser storage <span aria-hidden="true">&rarr;</span></span></button>
    </div>
    ${supported ? "" : `<p class="workspace-mode-dialog-note">Linked-file autosave requires a Chromium browser and is unavailable in this browser.</p>`}
    <p class="workspace-mode-dialog-note" id="initialStorageStatus" tabindex="-1" role="status" aria-live="polite" aria-atomic="true">${escapeHtml(state.storageChoiceStatus)}</p>
  </dialog>`;
}

function demoConversionDialogMarkup() {
  if (!state.demoConversionOpen) return "";
  const saved = loadOperationalWorkspaceResult();
  const hasSavedWorkspace = Boolean(saved.raw);
  const selection = new Set(state.demoConversionSelection);
  let body;
  if (saved.corrupted) {
    body = `<p class="demo-conversion-warning" role="alert">Your saved workspace cannot be read. Return to my workspace to download the unreadable data, import a backup, or deliberately clear it. PM OS will not overwrite it from the demo.</p><div class="confirmation-actions"><button class="secondary" id="cancelDemoConversionButton" type="button">Cancel</button><button class="primary" id="returnToOperationWorkspaceButton" type="button">Return to my workspace</button></div>`;
  } else if (hasSavedWorkspace) {
    body = `<p>Your workspace is already saved. Returning to it will leave these demo samples behind and preserve your workspace exactly.</p><div class="confirmation-actions"><button class="secondary" id="cancelDemoConversionButton" type="button">Cancel</button><button class="primary" id="returnToOperationWorkspaceButton" type="button">Return to my workspace</button></div>`;
  } else {
    body = `<p>Start clean, or copy only the example initiatives you want. Demo customers, insights, organization records, workflow settings, and prioritization settings are never copied.</p>
      <fieldset class="demo-conversion-list"><legend>Example initiatives to copy</legend>${demoWorkspace.items.map((item) => `<label><input type="checkbox" data-demo-conversion-item="${escapeHtml(item.id)}" ${selection.has(item.id) ? "checked" : ""}><span>${escapeHtml(item.title)}</span></label>`).join("")}</fieldset>
      <div class="confirmation-actions"><button class="secondary" id="cancelDemoConversionButton" type="button">Cancel</button><button class="secondary" id="startEmptyOperationButton" type="button">Start empty workspace</button><button class="primary" id="copyDemoExamplesButton" type="button" ${selection.size ? "" : "disabled"}>Copy selected examples</button></div>`;
  }
  return `<dialog class="workspace-mode-dialog demo-conversion-dialog" id="demoConversionDialog" aria-labelledby="demoConversionTitle" aria-describedby="demoConversionDescription"><div class="workspace-mode-dialog-header"><p class="eyebrow">Demo workspace</p><h2 id="demoConversionTitle">Convert demo to my workspace</h2><p id="demoConversionDescription">Demo data is separate from saved work. Choose what your new workspace should contain.</p></div><div class="demo-conversion-body">${body}</div></dialog>`;
}

function loadWorkspaceModePreference() {
  try {
    const value = localStorage.getItem(workspaceModeKey);
    return value === "demo" || value === "operation" ? value : "";
  } catch {
    return "";
  }
}

function saveWorkspaceModePreference(mode) {
  try {
    localStorage.setItem(workspaceModeKey, mode);
    return true;
  } catch {
    return false;
  }
}

function navigateToWorkspaceMode(mode) {
  saveWorkspaceModePreference(mode);
  const url = new URL(location.href);
  if (mode === "demo") url.searchParams.set("demo", "1");
  else {
    url.searchParams.delete("demo");
    url.searchParams.delete("teamRole");
  }
  location.assign(url);
}

function chooseInitialWorkspaceMode(mode) {
  if (mode === "demo") {
    navigateToWorkspaceMode("demo");
    return;
  }
  state.modeChoiceOpen = false;
  state.storageChoiceOpen = true;
  state.storageChoiceStatus = "";
  render();
}

function finishInitialStorageChoice() {
  saveWorkspaceModePreference("operation");
  state.storageChoiceOpen = false;
  if (!urlParams.get("space") || urlParams.get("view")) pushViewUrl(true);
  recordViewUsage(state.selectedView);
  render();
  focusAfterRender("viewTitle");
}

async function createInitialWorkspaceFile(event) {
  await createNewWorkspaceFile(event);
  if (state.source.type === "local-file" && state.linkedFile.handle) {
    finishInitialStorageChoice();
    return;
  }
  state.storageChoiceStatus = state.syncStatus;
  render();
  focusAfterRender("initialStorageStatus");
}

async function openInitialWorkspaceFile(event) {
  await linkExistingWorkspaceFile(event);
  if (state.source.type === "local-file" && state.linkedFile.handle) {
    finishInitialStorageChoice();
    return;
  }
  state.storageChoiceStatus = state.syncStatus;
  render();
  focusAfterRender("initialStorageStatus");
}

async function changeWorkspaceMode(event) {
  const trigger = event.currentTarget;
  const nextMode = trigger.checked ? "demo" : "operation";
  await requestWorkspaceModeChange(nextMode, trigger);
}

async function requestWorkspaceModeChange(nextMode, trigger) {
  if ((nextMode === "demo") === demoMode) return;
  const confirmed = await requestDataConfirmation({
    title: nextMode === "demo" ? "Switch to demo mode?" : "Return to my workspace?",
    description: nextMode === "demo"
      ? "PM OS will reload with sample data. Your workspace stays saved and unchanged; any connected Team session will close."
      : "PM OS will reload your saved workspace. Changes made in this demo session are temporary and will be cleared.",
    confirmLabel: nextMode === "demo" ? "Open Demo" : "Open my workspace",
    trigger
  });
  if (confirmed) {
    navigateToWorkspaceMode(nextMode);
    return;
  }
  render();
  document.querySelector("#demoModeToggle")?.focus();
}

function openDemoConversion() {
  state.demoConversionOpen = true;
  state.demoConversionSelection = demoWorkspace.items.map((item) => item.id);
  render();
}

function closeDemoConversion() {
  state.demoConversionOpen = false;
  render();
  focusAfterRender("convertDemoWorkspaceButton");
}

function captureDemoConversionSelection() {
  state.demoConversionSelection = [...document.querySelectorAll("[data-demo-conversion-item]:checked")].map((input) => input.dataset.demoConversionItem);
  const copyButton = document.querySelector("#copyDemoExamplesButton");
  if (copyButton) copyButton.disabled = state.demoConversionSelection.length === 0;
}

function copyDemoInitiativeForOperation(item) {
  return createItem({
    ...item,
    id: undefined,
    version: undefined,
    customer: "",
    customerIds: [],
    segmentIds: [],
    audienceSegments: [],
    owner: "",
    pocPersonId: "",
    orgUnitId: "",
    experiment: "",
    decision: "",
    risks: item.risks.map((record) => ({ ...record, ownerPersonId: "", ownerName: "" })),
    dependencies: item.dependencies.map((record) => ({ ...record, ownerPersonId: "", ownerName: "", targetType: "external", targetInitiativeId: "" }))
  });
}

async function createOperationalWorkspaceFromDemo(copyExamples) {
  const emptyWorkspace = createEmptyWorkspaceDocument();
  const items = copyExamples
    ? demoWorkspace.items.filter((item) => state.demoConversionSelection.includes(item.id)).map(copyDemoInitiativeForOperation)
    : [];
  const records = migrateLegacyWorkRecords(items);
  const payload = exportPortableWorkspace(items, [], emptyWorkspace.organization, emptyWorkspace.customerDirectory, emptyWorkspace.planningCalendar, emptyWorkspace.workflow, emptyWorkspace.prioritization, records, [], [], emptyWorkspace.experience, []);
  await runLocalStorageTransaction([storageKey, activityKey, syncKey], () => {
    localStorage.setItem(storageKey, payload);
    localStorage.setItem(activityKey, JSON.stringify({ activity: [] }));
    localStorage.setItem(syncKey, JSON.stringify(defaultSyncState()));
  });
  navigateToWorkspaceMode("operation");
}

function bindWorkspaceModeEvents() {
  const dialog = document.querySelector("#workspaceModeDialog");
  dialog?.addEventListener("cancel", (event) => event.preventDefault());
  document.querySelector("#chooseDemoModeButton")?.addEventListener("click", () => chooseInitialWorkspaceMode("demo"));
  document.querySelector("#chooseOperationModeButton")?.addEventListener("click", () => chooseInitialWorkspaceMode("operation"));
  document.querySelector("#initialCreateWorkspaceFileButton")?.addEventListener("click", createInitialWorkspaceFile);
  document.querySelector("#initialOpenWorkspaceFileButton")?.addEventListener("click", openInitialWorkspaceFile);
  document.querySelector("#initialUseBrowserStorageButton")?.addEventListener("click", finishInitialStorageChoice);
  document.querySelector("#demoModeToggle")?.addEventListener("change", changeWorkspaceMode);
  document.querySelector("#exploreDemoWorkspaceButton")?.addEventListener("click", (event) => requestWorkspaceModeChange("demo", event.currentTarget));
  document.querySelector("#convertDemoWorkspaceButton")?.addEventListener("click", openDemoConversion);
  document.querySelector("#cancelDemoConversionButton")?.addEventListener("click", closeDemoConversion);
  document.querySelector("#returnToOperationWorkspaceButton")?.addEventListener("click", () => navigateToWorkspaceMode("operation"));
  document.querySelector("#startEmptyOperationButton")?.addEventListener("click", async () => createOperationalWorkspaceFromDemo(false));
  document.querySelector("#copyDemoExamplesButton")?.addEventListener("click", async () => createOperationalWorkspaceFromDemo(true));
  document.querySelectorAll("[data-demo-conversion-item]").forEach((input) => input.addEventListener("change", captureDemoConversionSelection));
  const conversionDialog = document.querySelector("#demoConversionDialog");
  conversionDialog?.addEventListener("cancel", (event) => { event.preventDefault(); closeDemoConversion(); });
  if (dialog && !dialog.open) queueMicrotask(() => {
    if (dialog.isConnected && !dialog.open) dialog.showModal();
  });
  const storageDialog = document.querySelector("#initialStorageDialog");
  storageDialog?.addEventListener("cancel", (event) => event.preventDefault());
  if (storageDialog && !storageDialog.open) queueMicrotask(() => {
    if (storageDialog.isConnected && !storageDialog.open) storageDialog.showModal();
  });
  if (conversionDialog && !conversionDialog.open) queueMicrotask(() => {
    if (conversionDialog.isConnected && !conversionDialog.open) conversionDialog.showModal();
  });
}

function tutorialSettingsPanelMarkup() {
  const groups = enabledTutorialGroups();
  const complete = groups.filter((group) => tutorialGroupStatus(state.tutorial.progress, group.id) === "complete").length;
  return `<section class="panel data-panel tutorial-settings-panel" aria-labelledby="tutorialSettingsTitle">
    <div class="panel-header"><div><h3 id="tutorialSettingsTitle">Product Tutorial</h3><span class="muted">${complete} of ${groups.length} groups complete</span></div><button class="secondary" id="openTutorialButton" type="button" ${state.dataBusy ? "disabled" : ""}>Open Tutorial</button></div>
    <p>Explore any product area with a short guided walkthrough. Progress is stored only in this browser and is never included in workspace data or sync.</p>
  </section>`;
}

function tutorialMarkup() {
  if (state.tutorial.surface === "closed") return "";
  if (state.tutorial.surface === "hub") return tutorialHubMarkup();
  const group = enabledTutorialGroup(state.tutorial.groupId);
  const step = group?.steps[state.tutorial.stepIndex];
  if (!group || !step) return "";
  const last = state.tutorial.stepIndex === group.steps.length - 1;
  return `<div class="tutorial-layer tutorial-layer-spotlight" id="tutorialLayer" data-tutorial-step="${escapeHtml(`${group.id}:${step.id}`)}">
    <div class="tutorial-blocker" aria-hidden="true"></div>
    <div class="tutorial-spotlight" id="tutorialSpotlight" aria-hidden="true" hidden></div>
    <section class="tutorial-dialog tutorial-coachmark" id="tutorialDialog" role="dialog" aria-modal="true" aria-labelledby="tutorialTitle" aria-describedby="tutorialDescription">
      <div class="tutorial-progress"><span>${escapeHtml(group.label)}</span><span>Step ${state.tutorial.stepIndex + 1} of ${group.steps.length}</span></div>
      <h2 id="tutorialTitle" tabindex="-1">${escapeHtml(step.title)}</h2>
      <p id="tutorialDescription">${escapeHtml(step.description)}</p>
      ${state.tutorial.storageFailed ? '<p class="tutorial-storage-note" role="status">Progress is available for this session only.</p>' : ""}
      <div class="tutorial-actions">
        <button class="secondary" id="tutorialBackButton" type="button" ${state.tutorial.stepIndex === 0 ? "disabled" : ""}>Back</button>
        <button class="text-button tutorial-exit" id="tutorialExitButton" type="button">Exit group</button>
        <button class="primary" id="tutorialNextButton" type="button">${last ? "Finish group" : "Next"}</button>
      </div>
    </section>
    <p class="sr-only" id="tutorialAnnouncement" role="status" aria-live="polite" aria-atomic="true">${escapeHtml(state.tutorial.announcement)}</p>
  </div>`;
}

function tutorialHubMarkup() {
  const groups = enabledTutorialGroups();
  const recommended = groups.find((group) => tutorialGroupStatus(state.tutorial.progress, group.id) === "in-progress")
    || groups.find((group) => tutorialGroupStatus(state.tutorial.progress, group.id) !== "complete")
    || null;
  const recommendedStatus = recommended ? tutorialGroupStatus(state.tutorial.progress, recommended.id) : "complete";
  const completeCount = groups.filter((group) => tutorialGroupStatus(state.tutorial.progress, group.id) === "complete").length;
  const primaryLabel = !recommended ? "All groups complete" : recommendedStatus === "in-progress" ? `Continue ${recommended.label}` : `Start recommended: ${recommended.label}`;
  const cards = groups.map((group) => {
    const status = tutorialGroupStatus(state.tutorial.progress, group.id);
    const entry = state.tutorial.progress.groups[group.id];
    const statusLabel = status === "complete" ? "Complete" : status === "in-progress" ? `In progress · Step ${(entry?.nextStep || 0) + 1} of ${group.steps.length}` : "Not started";
    const action = status === "complete" ? "Replay" : status === "in-progress" ? "Continue" : "Start";
    return `<article class="tutorial-group-card" data-tutorial-status="${status}">
      <div><p class="tutorial-group-status">${escapeHtml(statusLabel)}</p><h3>${escapeHtml(group.label)}</h3><p>${escapeHtml(group.description)}</p></div>
      <div class="tutorial-group-footer"><span>${group.steps.length} ${group.steps.length === 1 ? "step" : "steps"}</span><button class="secondary" data-tutorial-group="${escapeHtml(group.id)}" data-tutorial-replay="${status === "complete"}" type="button" aria-label="${escapeHtml(`${action} ${group.label} tutorial`)}">${action}</button></div>
    </article>`;
  }).join("");
  return `<div class="tutorial-layer tutorial-layer-hub" id="tutorialLayer">
    <div class="tutorial-scrim" aria-hidden="true"></div>
    <section class="tutorial-dialog tutorial-hub" id="tutorialDialog" role="dialog" aria-modal="true" aria-labelledby="tutorialHubTitle" aria-describedby="tutorialHubDescription">
      <header class="tutorial-hub-header"><div><p class="eyebrow">PM OS product guide</p><h2 id="tutorialHubTitle">Explore the workspace in focused groups.</h2><p id="tutorialHubDescription">Choose any area, leave whenever you need to, and continue from the same step later.</p></div><button class="text-button tutorial-close" id="tutorialCloseButton" type="button" aria-label="Close tutorial">Close</button></header>
      <div class="tutorial-hub-summary"><span>${completeCount} of ${groups.length} groups complete</span><span>${groups.reduce((total, group) => total + group.steps.length, 0)} guided steps across enabled areas</span></div>
      <div class="tutorial-hub-messages">${state.tutorial.announcement ? `<p class="tutorial-hub-notice" id="tutorialHubNotice" tabindex="-1" role="status">${escapeHtml(state.tutorial.announcement)}</p>` : ""}${state.tutorial.storageFailed ? '<p class="tutorial-storage-note" role="status">Progress is available for this session only.</p>' : ""}</div>
      <div class="tutorial-group-grid">${cards}</div>
      <footer class="tutorial-hub-actions"><button class="primary" id="tutorialPrimaryButton" type="button" ${recommended ? `data-tutorial-group="${escapeHtml(recommended.id)}"` : "disabled"}>${escapeHtml(primaryLabel)}</button><button class="secondary" id="tutorialCloseFooterButton" type="button">Close tutorial</button></footer>
    </section>
  </div>`;
}

function tutorialClone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function captureTutorialOrigin(returnFocusId = "") {
  return {
    selectedView: state.selectedView,
    selectedMode: state.selectedMode,
    spaceModes: { ...state.spaceModes },
    query: state.query,
    periodSelection: { ...state.periodSelection },
    customerView: state.customerView,
    selectedCustomerId: state.selectedCustomerId,
    selectedSegmentId: state.selectedSegmentId,
    boardTeamId: state.boardTeamId,
    mobileBoardStatusId: state.mobileBoardStatusId,
    initiativeDetail: tutorialClone(state.initiativeDetail),
    initiativeEditor: tutorialClone(state.initiativeEditor),
    insightEditor: tutorialClone(state.insightEditor),
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    href: location.href,
    returnFocusId: returnFocusId || document.activeElement?.id || "viewTitle"
  };
}

function restoreTutorialOrigin() {
  const origin = state.tutorial.origin;
  if (!origin) return;
  state.selectedView = origin.selectedView;
  state.selectedMode = origin.selectedMode;
  state.spaceModes = { ...origin.spaceModes };
  state.query = origin.query;
  state.periodSelection = { ...origin.periodSelection };
  state.customerView = origin.customerView;
  state.selectedCustomerId = origin.selectedCustomerId;
  state.selectedSegmentId = origin.selectedSegmentId;
  state.boardTeamId = origin.boardTeamId;
  state.mobileBoardStatusId = origin.mobileBoardStatusId;
  state.initiativeDetail = tutorialClone(origin.initiativeDetail);
  state.initiativeEditor = tutorialClone(origin.initiativeEditor);
  state.insightEditor = tutorialClone(origin.insightEditor);
}

function persistTutorialProgress() {
  state.tutorial.progress.introduced = true;
  if (!saveTutorialProgress(localStorage, state.tutorial.progress)) state.tutorial.storageFailed = true;
}

function applyTutorialStepContext() {
  const group = enabledTutorialGroup(state.tutorial.groupId);
  const step = group?.steps[state.tutorial.stepIndex];
  if (!step) return;
  state.selectedView = step.space;
  state.selectedMode = step.mode;
  state.query = "";
  state.periodSelection = { kind: "all" };
  state.initiativeDetail = createInitiativeDetailState();
  state.initiativeEditor = createInitiativeEditorState();
  state.insightEditor = createInsightEditorState();
  state.tutorial.announcement = `${group.label}, step ${state.tutorial.stepIndex + 1} of ${group.steps.length}: ${step.title}`;
  queueMicrotask(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
}

function openTutorialHub(trigger = null) {
  if (state.tutorial.surface === "closed" || !state.tutorial.origin) {
    state.tutorial.origin = captureTutorialOrigin(trigger?.id || "viewTitle");
  }
  state.tutorial.surface = "hub";
  state.tutorial.groupId = "";
  state.tutorial.stepIndex = 0;
  state.tutorial.replay = false;
  state.tutorial.announcement = "";
  persistTutorialProgress();
  render();
}

function startTutorialGroup(groupId, options = {}) {
  const group = enabledTutorialGroup(groupId);
  if (!group) return;
  if (!state.tutorial.origin) state.tutorial.origin = captureTutorialOrigin(options.returnFocusId || "viewTitle");
  const entry = state.tutorial.progress.groups[groupId];
  const replay = options.replay === true || entry?.complete === true;
  state.tutorial.surface = "spotlight";
  state.tutorial.groupId = groupId;
  state.tutorial.stepIndex = replay ? 0 : Math.min(entry?.nextStep || 0, group.steps.length - 1);
  state.tutorial.replay = replay;
  if (!replay && !entry) state.tutorial.progress = updateTutorialGroupProgress(state.tutorial.progress, groupId, { nextStep: 0, complete: false });
  persistTutorialProgress();
  applyTutorialStepContext();
  if (!options.automatic) render();
}

function moveTutorialStep(direction) {
  const group = enabledTutorialGroup(state.tutorial.groupId);
  if (!group) return;
  const nextIndex = state.tutorial.stepIndex + direction;
  if (direction > 0 && nextIndex >= group.steps.length) {
    finishTutorialGroup();
    return;
  }
  if (nextIndex < 0 || nextIndex >= group.steps.length) return;
  state.tutorial.stepIndex = nextIndex;
  if (!state.tutorial.replay) {
    state.tutorial.progress = updateTutorialGroupProgress(state.tutorial.progress, group.id, { nextStep: nextIndex, complete: false });
    persistTutorialProgress();
  }
  applyTutorialStepContext();
  render();
}

function finishTutorialGroup() {
  const group = enabledTutorialGroup(state.tutorial.groupId);
  if (!group) return;
  if (!state.tutorial.replay) {
    state.tutorial.progress = updateTutorialGroupProgress(state.tutorial.progress, group.id, { nextStep: 0, complete: true });
    persistTutorialProgress();
  }
  restoreTutorialOrigin();
  state.tutorial.surface = "hub";
  state.tutorial.groupId = "";
  state.tutorial.stepIndex = 0;
  state.tutorial.replay = false;
  state.tutorial.announcement = `${group.label} group complete.`;
  render();
  queueMicrotask(() => {
    window.scrollTo({ top: state.tutorial.origin?.scrollY || 0, left: state.tutorial.origin?.scrollX || 0, behavior: "auto" });
    document.querySelector("#tutorialHubNotice")?.focus?.();
  });
}

function exitTutorialGroup() {
  const group = enabledTutorialGroup(state.tutorial.groupId);
  if (!group) return;
  if (!state.tutorial.replay) {
    state.tutorial.progress = updateTutorialGroupProgress(state.tutorial.progress, group.id, { nextStep: state.tutorial.stepIndex, complete: false });
    persistTutorialProgress();
  }
  restoreTutorialOrigin();
  state.tutorial.surface = "hub";
  state.tutorial.groupId = "";
  state.tutorial.replay = false;
  state.tutorial.announcement = `${group.label} progress saved.`;
  render();
  queueMicrotask(() => window.scrollTo({ top: state.tutorial.origin?.scrollY || 0, left: state.tutorial.origin?.scrollX || 0, behavior: "auto" }));
}

function closeTutorial() {
  const origin = state.tutorial.origin;
  restoreTutorialOrigin();
  state.tutorial.surface = "closed";
  state.tutorial.groupId = "";
  state.tutorial.stepIndex = 0;
  state.tutorial.replay = false;
  state.tutorial.announcement = "";
  state.tutorial.origin = null;
  persistTutorialProgress();
  render();
  queueMicrotask(() => {
    window.scrollTo({ top: origin?.scrollY || 0, left: origin?.scrollX || 0, behavior: "auto" });
    (document.getElementById(origin?.returnFocusId) || document.querySelector("#viewTitle"))?.focus();
  });
}

function bindTutorialEvents() {
  document.querySelector("#openTutorialButton")?.addEventListener("click", (event) => openTutorialHub(event.currentTarget));
  if (state.tutorial.surface === "closed") return;
  document.querySelectorAll("[data-tutorial-group]").forEach((button) => button.addEventListener("click", () => startTutorialGroup(button.dataset.tutorialGroup, { replay: button.dataset.tutorialReplay === "true" })));
  document.querySelector("#tutorialBackButton")?.addEventListener("click", () => moveTutorialStep(-1));
  document.querySelector("#tutorialNextButton")?.addEventListener("click", () => moveTutorialStep(1));
  document.querySelector("#tutorialExitButton")?.addEventListener("click", exitTutorialGroup);
  document.querySelector("#tutorialCloseButton")?.addEventListener("click", closeTutorial);
  document.querySelector("#tutorialCloseFooterButton")?.addEventListener("click", closeTutorial);
  queueMicrotask(() => {
    const focusTarget = state.tutorial.surface === "hub" ? document.querySelector("#tutorialPrimaryButton:not(:disabled), [data-tutorial-group], #tutorialCloseButton") : document.querySelector("#tutorialTitle");
    focusTarget?.focus({ preventScroll: true });
  });
}

function tutorialFocusableElements() {
  return [...document.querySelectorAll('#tutorialDialog button:not([disabled]), #tutorialDialog [href], #tutorialDialog [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.hidden && element.getClientRects().length);
}

function handleTutorialKeydown(event) {
  if (state.tutorial.surface === "closed") return;
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (state.tutorial.surface === "spotlight") exitTutorialGroup();
    else closeTutorial();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = tutorialFocusableElements();
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!document.querySelector("#tutorialDialog")?.contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
  } else if (!focusable.includes(document.activeElement)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function tutorialTargetElements(step) {
  if (!step) return [];
  if (step.target === "workspace-navigation") {
    if (window.matchMedia("(max-width: 620px)").matches) return [document.querySelector("#workspaceViews")].filter(Boolean);
    if (window.matchMedia("(max-width: 1100px)").matches) {
      const nav = document.querySelector("#workspaceViews");
      nav?.classList.add("open");
      document.querySelector("#viewsToggle")?.setAttribute("aria-expanded", "true");
    }
    return [document.querySelector(".sidebar")].filter(Boolean);
  }
  if (step.target === "workspace-controls") {
    return [document.querySelector(".topbar"), document.querySelector(".weekly-loop"), document.querySelector(".timeline-toolbar")].filter(Boolean);
  }
  if (step.target === "active-mode") return [document.querySelector('.space-modes [aria-current="page"]')].filter(Boolean);
  return [];
}

function unionTutorialRect(elements) {
  const rects = elements.map((element) => element.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
  if (!rects.length) return null;
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function scheduleTutorialLayout() {
  if (state.tutorial.surface !== "spotlight") return;
  if (tutorialLayoutFrame) cancelAnimationFrame(tutorialLayoutFrame);
  tutorialLayoutFrame = requestAnimationFrame(() => {
    tutorialLayoutFrame = 0;
    layoutTutorial();
  });
}

function layoutTutorial() {
  if (state.tutorial.surface !== "spotlight") return;
  const group = enabledTutorialGroup(state.tutorial.groupId);
  const step = group?.steps[state.tutorial.stepIndex];
  const layer = document.querySelector("#tutorialLayer");
  const spotlight = document.querySelector("#tutorialSpotlight");
  const dialog = document.querySelector("#tutorialDialog");
  if (!layer || !spotlight || !dialog) return;
  const targetRect = unionTutorialRect(tutorialTargetElements(step));
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const padding = 7;
  let anchor = null;
  if (targetRect) {
    const left = Math.max(6, targetRect.left - padding);
    const top = Math.max(6, targetRect.top - padding);
    const right = Math.min(viewport.width - 6, targetRect.right + padding);
    const bottom = Math.min(viewport.height - 6, targetRect.bottom + padding);
    anchor = { left, top, right, bottom, width: right - left, height: bottom - top };
    spotlight.hidden = false;
    spotlight.style.left = `${Math.round(left)}px`;
    spotlight.style.top = `${Math.round(top)}px`;
    spotlight.style.width = `${Math.round(anchor.width)}px`;
    spotlight.style.height = `${Math.round(anchor.height)}px`;
    layer.classList.remove("tutorial-target-missing");
  } else {
    spotlight.hidden = true;
    layer.classList.add("tutorial-target-missing");
  }
  const cardRect = dialog.getBoundingClientRect();
  const tabletNavigation = window.matchMedia("(min-width: 621px) and (max-width: 1100px)").matches
    ? document.querySelector(".sidebar")?.getBoundingClientRect()
    : null;
  const placement = computeCoachmarkPlacement(anchor, { width: cardRect.width, height: cardRect.height }, viewport, {
    mobile: window.matchMedia("(max-width: 620px)").matches,
    bottomInset: 92,
    topInset: tabletNavigation ? tabletNavigation.bottom + 14 : 0
  });
  dialog.dataset.placement = placement.placement;
  dialog.style.left = `${placement.left}px`;
  dialog.style.top = `${placement.top}px`;
  dialog.classList.add("is-positioned");
}

function teamSourceMarkup() {
  const team = state.team;
  const disabled = state.dataBusy ? "disabled" : "";
  const localServer = state.sourceSelection === "local-server";
  if (team.mode === "loading") return `<div class="team-setup" role="status"><strong>Loading Team workspace...</strong><p>Your work on this device stays active while Team setup loads.</p></div>`;
  if (team.mode === "unavailable") return `<div class="team-setup team-error" role="alert"><strong>Team workspace is unavailable in this build.</strong><p>${escapeHtml(team.status)}</p><button class="secondary" id="retryTeamLoadButton" ${disabled} type="button">Try again</button></div>`;
  if (team.mode === "choose-setup") {
    const managed = team.managedConfig;
    return `<div class="team-setup"><p>Your work on this device stays active until a server workspace opens successfully.</p>${managed ? `<p><strong>${escapeHtml(managed.label)}</strong> is configured for your team. Sign in with your account to open your shared work.</p><details><summary>Connect a different server</summary>` : ""}<div class="team-deployment-note"><strong>${localServer ? "Run your PM OS Local Server" : "Connect your Team server"}</strong><p>${localServer ? "From this repository, run npm run local:prepare and npm run local:up. Refresh PM OS after the health check passes." : "Supabase provides Team sign-in and shared storage. Ask your administrator for the server address and public connection key."}</p><a class="team-guide-link" href="${localServer ? "deploy/local/index.html" : "deploy/self-host/index.html"}" target="_blank" rel="noreferrer">${localServer ? "Open local server guide" : "Self-host PM OS and Supabase"}</a></div>${managed ? "</details>" : ""}<div class="team-actions">${managed ? `<button class="primary" id="teamManagedButton" ${disabled} type="button">Sign in to ${escapeHtml(managed.label)}</button>` : ""}<button class="${managed ? "secondary" : "primary"}" id="teamByoButton" ${disabled} type="button">${localServer ? "Connect local server" : "Enter server details"}</button><button class="secondary" id="cancelTeamSetupButton" ${disabled} type="button">Cancel</button></div></div>${teamStatusMarkup()}`;
  }
  if (team.mode === "byo") return `<form class="team-form" id="teamSetupForm"><p class="team-endpoint-hint" id="teamEndpointHelp">${localServer ? "Use http://127.0.0.1 only for a personal local server. LAN servers require HTTPS." : "Enter the server address supplied by your administrator (the Supabase API URL). It must start with https://. Choose the sign-in method supported by your account."}</p><label><span>Supabase API URL</span><input id="teamProjectUrl" name="url" type="url" inputmode="url" autocomplete="off" aria-describedby="teamEndpointHelp" placeholder="${localServer ? "http://127.0.0.1:4173" : "https://api.example.com"}" ${disabled} required></label><label><span>Publishable or anon key</span><input id="teamPublishableKey" name="publishableKey" type="password" autocomplete="off" aria-describedby="teamKeyHelp" ${disabled} required></label><p class="team-endpoint-hint" id="teamKeyHelp">This public connection key identifies your Team server; signing in determines your access. Ask your administrator for the Supabase publishable or legacy anon key. Secret and service-role keys are rejected.</p>${localServer ? "" : `<label><span>Sign-in method</span><select id="teamAuthMode" name="authMode" aria-describedby="teamAuthHelp" ${disabled}><option value="otp" ${team.authMode !== "password" ? "selected" : ""}>Email code</option><option value="password" ${team.authMode === "password" ? "selected" : ""}>Password</option></select></label><p class="team-endpoint-hint" id="teamAuthHelp">Choose Email code if your server sends a numeric sign-in code, or Password if your account already has one.</p>`}<div class="team-actions"><button class="primary" id="checkTeamSetupButton" ${disabled} type="submit">Run diagnostics</button><button class="secondary" id="cancelTeamSetupButton" ${disabled} type="button">Cancel</button></div><a class="team-guide-link" href="${localServer ? "deploy/local/index.html" : "deploy/self-host/index.html"}" target="_blank" rel="noreferrer">Open the ${localServer ? "local server" : "self-hosting"} guide</a></form>${teamStatusMarkup()}`;
  if (team.mode === "signed-out" && team.authMode === "password") return `<form class="team-form" id="teamPasswordForm"><p class="team-hint">${team.backendMode === "remote" ? "Sign in with your existing server account." : "Use a local password account. Email confirmation is automatic only in local and LAN profiles."}</p><label><span>Email</span><input id="teamEmail" name="email" type="email" autocomplete="username" value="${escapeHtml(team.email)}" ${disabled} required></label><label><span>Password</span><input id="teamPassword" name="password" type="password" minlength="8" maxlength="128" autocomplete="current-password" ${disabled} required></label><div class="team-actions"><button class="primary" name="authAction" value="sign-in" ${disabled} type="submit">Sign in</button>${team.backendMode === "remote" ? "" : `<button class="secondary" name="authAction" value="create" ${disabled} type="submit">Create local account</button>`}<button class="secondary" id="changeTeamProjectButton" ${disabled} type="button">Change server</button></div></form>${teamStatusMarkup()}`;
  if (team.mode === "signed-out") return `<form class="team-form" id="teamEmailForm"><label><span>Email</span><input id="teamEmail" name="email" type="email" autocomplete="email" value="${escapeHtml(team.email)}" ${disabled} required></label><div class="team-actions"><button class="primary" id="sendTeamCodeButton" ${disabled} type="submit">Send code</button><button class="secondary" id="changeTeamProjectButton" ${disabled} type="button">Change project</button></div></form>${teamStatusMarkup()}`;
  if (team.mode === "code-sent") return `<form class="team-form" id="teamCodeForm"><p class="team-hint">Enter the six-digit code sent to ${escapeHtml(team.email)}.</p><label><span>Sign-in code</span><input id="teamCode" name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" ${disabled} required></label><div class="team-actions"><button class="primary" id="verifyTeamCodeButton" ${disabled} type="submit">Verify</button><button class="secondary" id="resendTeamCodeButton" ${disabled} type="button">Resend code</button><button class="secondary" id="changeTeamEmailButton" ${disabled} type="button">Change email</button></div></form>${teamStatusMarkup()}`;
  if (team.mode === "workspaces") return `${teamWorkspaceChooserMarkup()}${teamStatusMarkup()}`;
  if (team.active) {
    const reconnecting = team.connection === "reconnecting" || team.connection === "offline";
    return `<div class="team-live"><div class="team-live-facts"><p><span>Workspace</span><strong>${escapeHtml(team.workspace?.name || "Team workspace")}</strong></p><p><span>Role</span><strong>${escapeHtml(team.role)}</strong></p><p><span>Status</span><strong>${reconnecting ? "Reconnecting" : "Live"}</strong></p></div>${reconnecting ? `<p class="team-warning">Reconnecting. Team changes are paused.</p>` : ""}<div class="team-actions">${reconnecting ? `<button class="secondary" id="retryTeamSyncButton" ${disabled} type="button">Try now</button>` : ""}<button class="secondary" id="switchTeamWorkspaceButton" ${disabled} type="button">Switch workspace</button><button class="secondary" id="leaveTeamButton" ${disabled} type="button">Return to Browser</button><button class="danger" id="signOutTeamButton" ${disabled} type="button">Sign out</button></div>${team.showWorkspaceList ? teamWorkspaceChooserMarkup() : ""}</div>${teamStatusMarkup()}`;
  }
  return `<div class="team-setup"><p>Choose a Team setup to continue.</p></div>${teamStatusMarkup()}`;
}

function teamWorkspaceChooserMarkup() {
  const disabled = state.dataBusy ? "disabled" : "";
  const rows = state.team.workspaces.map((workspace) => `<li class="team-workspace-row"><div><strong>${escapeHtml(workspace.name)}</strong><span>${escapeHtml(workspace.role || "viewer")} | ${escapeHtml(formatSyncTime(workspace.updatedAt))}</span></div><button class="secondary" data-open-team-workspace="${escapeHtml(workspace.id)}" ${disabled} type="button">Open</button></li>`).join("") || `<li class="empty">No team workspaces are available for this account.</li>`;
  const create = state.team.allowWorkspaceCreation ? `<form class="team-inline-form" id="createTeamWorkspaceForm"><label><span>Workspace name</span><input id="teamWorkspaceName" name="name" value="${escapeHtml(state.team.workspaceCreateAttempt?.name || "")}" ${disabled} required></label><button class="primary" ${disabled} type="submit">Create workspace</button></form>` : "";
  return `<div class="team-chooser"><ul class="team-workspace-list" aria-label="Team workspaces">${rows}</ul>${create}<form class="team-inline-form" id="joinTeamWorkspaceForm"><label><span>Invite code</span><input id="teamInviteJoinCode" name="code" autocomplete="off" ${disabled} required></label><button class="secondary" ${disabled} type="submit">Join workspace</button></form></div>`;
}

function teamStatusMarkup() {
  return `${teamBackendHealthMarkup()}<p class="team-status ${state.team.error ? "team-error-text" : ""}" id="teamStatus" tabindex="-1" role="${state.team.error ? "alert" : "status"}" aria-live="${state.team.error ? "assertive" : "polite"}" aria-atomic="true">${escapeHtml(state.team.status)}</p>`;
}

function teamBackendHealthMarkup() {
  const capabilities = state.team.capabilities;
  if (!capabilities) return "";
  const realtime = state.team.active && state.team.connection === "live" ? "Live" : "Supported";
  const auth = state.team.authMode === "password" ? "Password ready" : "Email OTP ready";
  const checks = [
    ["Backend", "Reachable"],
    ["Database", "Connected"],
    ["Migrations", `Schema v${capabilities.schemaVersion || 1}`],
    ["Authentication", auth],
    ["Realtime", realtime],
    ["Storage", "API routed"]
  ];
  return `<section class="backend-health" aria-labelledby="backendHealthTitle"><div class="backend-health-heading"><strong id="backendHealthTitle">Server readiness</strong><span>Diagnostics contain status only</span></div><dl>${checks.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd><span aria-hidden="true"></span>${escapeHtml(value)}</dd></div>`).join("")}</dl></section>`;
}

function teamMembersMarkup() {
  if (!state.team.active) return "";
  const disabled = state.dataBusy ? "disabled" : "";
  const owner = state.team.role === "owner";
  const rows = state.team.members.map((member) => {
    const self = member.userId === state.team.authUser?.id;
    const controls = owner && !self ? `<div class="team-member-actions"><label><span class="sr-only">Role for ${escapeHtml(member.displayName)}</span><select data-team-member-role="${escapeHtml(member.userId)}" ${disabled}><option value="viewer" ${member.role === "viewer" ? "selected" : ""}>Viewer</option><option value="editor" ${member.role === "editor" ? "selected" : ""}>Editor</option><option value="owner" ${member.role === "owner" ? "selected" : ""}>Owner</option></select></label><button class="danger" data-remove-team-member="${escapeHtml(member.userId)}" ${disabled} type="button">Remove</button></div>` : "";
    return `<li class="team-member-row"><div><strong>${escapeHtml(member.displayName)}</strong><span>${escapeHtml(member.role)}${self ? " | You" : ""}</span></div>${controls}</li>`;
  }).join("") || `<li class="empty">No members are available.</li>`;
  const invitationRows = state.team.invitations.map(invitation => {
    const closed = invitation.acceptedAt || invitation.revokedAt;
    return `<li class="team-member-row"><div><strong>${escapeHtml(invitation.email)}</strong><span>${escapeHtml(invitation.role)} · ${escapeHtml(invitationDeliveryLabel(invitation))}</span></div>${closed ? "" : `<div class="team-member-actions"><button class="secondary" data-resend-team-invite="${escapeHtml(invitation.id)}" ${disabled} type="button">Resend email</button><button class="danger" data-revoke-team-invite="${escapeHtml(invitation.id)}" ${disabled} type="button">Revoke</button></div>`}</li>`;
  }).join("");
  const invite = owner ? state.team.capabilities?.emailInvitations ? `<form class="team-inline-form team-invite-form" id="createTeamInviteForm"><label><span>Colleague’s email</span><input name="email" id="teamInviteEmail" type="email" autocomplete="off" value="${escapeHtml(state.team.inviteEmail)}" ${disabled} required></label><label><span>Invite role</span><select id="teamInviteRole" name="role" ${disabled}><option value="viewer">Viewer — can view work</option><option value="editor">Editor — can edit work</option></select></label><button class="secondary" ${disabled} type="submit">Send invitation</button></form><p>Only the recipient can join. Email links expire after 72 hours.</p><button class="secondary" id="refreshTeamInvitesButton" ${disabled} type="button">Refresh invitations</button><ul class="team-member-list" aria-label="Invitations">${invitationRows}</ul>` : '<p>Email invitations require the latest Team server setup. Ask your administrator to update this server.</p>' : "";
  return `<section class="panel data-panel team-members-panel" aria-labelledby="teamMembersTitle"><div class="panel-header"><h3 id="teamMembersTitle">Team Members</h3><span class="muted">${state.team.members.length} members | ${escapeHtml(state.team.role)}</span></div><ul class="team-member-list">${rows}</ul>${invite}</section>`;
}

function invitationDeliveryLabel(invitation) {
  if (invitation.acceptedAt) return "Accepted";
  if (invitation.revokedAt) return "Revoked";
  if (new Date(invitation.expiresAt).getTime() <= Date.now()) return "Expired";
  return ({ sent: "Email submitted", failed: "Email not sent", pending: "Delivery pending", unknown: "Delivery unconfirmed" })[invitation.deliveryState] || "Delivery unconfirmed";
}

function teamInviteDialogMarkup() {
  const invitation = state.team.invite;
  if (!invitation) return "";
  const submitted = invitation.deliveryState === "sent";
  return `<dialog class="confirmation-dialog team-invite-dialog" id="teamInviteDialog" aria-labelledby="teamInviteTitle"><form method="dialog"><h3 id="teamInviteTitle">${escapeHtml(invitationDeliveryLabel(invitation))}</h3><p>${escapeHtml(invitation.email)} · ${escapeHtml(invitation.role)}</p><p>${submitted ? "The email service accepted the invitation. Ask your colleague to open the link and choose Join workspace. Check spam if it does not arrive." : "The email has not been confirmed sent. Close this message to refresh, resend or revoke the invitation."}</p><p>Expires ${escapeHtml(formatSyncTime(invitation.expiresAt))}.</p><div class="confirmation-actions"><button class="primary" id="closeTeamInviteButton" value="close">Close</button></div></form></dialog>`;
}

function recoverySnapshotRow(snapshot, index) {
  const counts = workspaceSnapshotDetails(snapshot);
  const reason = backupReasonLabel(snapshot.reason);
  const time = formatSyncTime(snapshot.createdAt);
  const actionLabel = `${reason} from ${time}`;
  const disabled = state.dataBusy || state.team.active ? "disabled" : "";
  return `<div class="recovery-row"><div><strong>${escapeHtml(reason)}</strong><span><time datetime="${escapeHtml(snapshot.createdAt)}">${escapeHtml(time)}</time> | ${counts.itemCount} initiatives | ${counts.activityCount} activity events</span></div><div class="recovery-actions"><button class="secondary" id="restoreBackup-${index}" data-restore-backup="${escapeHtml(snapshot.id)}" aria-label="Restore ${escapeHtml(actionLabel)}" ${disabled} type="button">Restore</button><button class="secondary" data-download-backup="${escapeHtml(snapshot.id)}" aria-label="Download ${escapeHtml(actionLabel)}" ${disabled} type="button">Download Backup</button></div></div>`;
}

function driveConflictStatus(kind) {
  kind = typeof kind === "string" ? kind : kind?.kind;
  if (kind === "deleted") return "The Drive workspace file was deleted since your last sync. Save your work as a separate copy, then choose an existing Drive file or create a new project.";
  if (kind === "mismatch") return "The Drive file changed since your last sync. Download the Drive copy or save this device's work as a separate conflict copy before continuing.";
  return "PM OS cannot compare this device's copy with the Drive file yet. Download the Drive copy before uploading changes.";
}

function itemCard(item) {
  const disabled = teamMutationDisabled() ? "disabled" : "";
  const itemId = escapeHtml(item.id);
  const editReason = teamEditorReadOnlyReason();
  const describedBy = editReason ? 'aria-describedby="initiativeReadOnlyReason"' : "";
  const score = workspacePriorityForItem(item);
  return `<article class="item-card" data-item-id="${itemId}">
    <div class="item-main">
      <div><span class="pill status-pill status-${escapeHtml(statusForInitiative(state.workflow, item).color)}">${escapeHtml(initiativeStatusLabel(item))}</span><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.problem || "No problem statement yet.")}</p></div>
      <div class="item-card-tools"><div class="score ${score.complete ? "" : "unscored"}" aria-label="${escapeHtml(score.label)} ${score.complete ? `score ${score.value}` : "unscored"}"><span>${escapeHtml(score.label)}</span><strong>${score.complete ? score.value : "Unscored"}</strong></div>${initiativeDetailButton(item, "command", "View details")}<button class="secondary small" id="editItem-${itemId}" data-edit-item="${itemId}" type="button" aria-label="Edit ${escapeHtml(item.title)}" ${disabled} ${describedBy}>Edit initiative</button></div>
    </div>
    <dl class="item-facts"><div class="item-fact-wide"><dt>Targets</dt><dd>${initiativeTargetChips(item)}</dd></div><div><dt>Point of contact</dt><dd>${escapeHtml(organizationPersonName(item.pocPersonId) || item.owner || "Unowned")}</dd></div><div><dt>Team</dt><dd>${escapeHtml(organizationUnitPath(item.orgUnitId) || "Unassigned")}</dd></div><div><dt>Planned timeline</dt><dd>${escapeHtml(describeInitiativeTimeline(item, state.planningCalendar))}</dd></div><div class="item-fact-wide"><dt>Next step</dt><dd>${escapeHtml(item.nextStep || "No next step captured.")}</dd></div><div><dt>Active risks</dt><dd>${activeRisks(item).length}</dd></div><div><dt>Active dependencies</dt><dd>${activeDependencies(item).length}</dd></div>${primaryRiskText(item) ? `<div class="item-fact-wide"><dt>Highest-exposure risk</dt><dd>${escapeHtml(primaryRiskText(item))}</dd></div>` : ""}</dl>
    <details class="item-evidence"><summary>Evidence and decision</summary><dl class="item-facts"><div class="item-fact-wide"><dt>Experiment</dt><dd>${escapeHtml(item.experiment || "No experiment captured.")}</dd></div><div class="item-fact-wide"><dt>Decision</dt><dd>${escapeHtml(item.decision || "No decision captured.")}</dd></div></dl></details>
  </article>`;
}
function compactCard(item, context) { const score = workspacePriorityForItem(item); return `<article class="compact-card"><h4>${escapeHtml(item.title)}</h4>${initiativeTargetChips(item, 2)}<p>${escapeHtml(item.owner || "Unowned")}</p><span>${escapeHtml(score.label)} ${score.complete ? score.value : "Unscored"}</span><small class="initiative-timeline">${escapeHtml(describeInitiativeTimeline(item, state.planningCalendar))}</small>${initiativeReferenceActions(item, `compact-${context}`)}</article>`; }
function followUpCard(item, context) { const risk = primaryRiskText(item); const reason = !item.nextStep.trim() ? "Needs next step" : risk ? "Risk captured" : "May be stale"; return `<article class="follow-card"><span>${reason}</span><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.nextStep || risk || "Update this initiative.")}</p>${initiativeReferenceActions(item, `follow-up-${context}`)}</article>`; }
function validationCard(entry, options = {}) {
  const config = options && typeof options === "object" ? options : {};
  const actions = config.context && entry.item ? `<div class="contextual-card-actions">${initiativeDetailButton(entry.item, config.context)}${initiativeContextualEditButton(entry.item, config.context, config.focusField, config.actionLabel)}</div>` : "";
  return `<article class="validation-card"><span>${escapeHtml(entry.type)} | ${escapeHtml(entry.customer)} | confidence ${Math.round(entry.confidence * 100)}%</span><h4>${escapeHtml(entry.title)}</h4><p>${escapeHtml(entry.test)}</p><small>Urgency ${entry.priority} | ${escapeHtml(entry.priorityLabel)} ${entry.score ?? "Needs scoring"}</small>${actions}</article>`;
}
function supportCard(entry) { return `<article class="support-card ${entry.status === "Critical" ? "critical" : entry.status === "Watch" ? "watch" : ""}"><span>${escapeHtml(entry.status)} | severity ${entry.severity} | ${escapeHtml(entry.owner)}</span><h4>${escapeHtml(entry.item.title)}</h4><p>${escapeHtml(entry.response)}</p><small>${escapeHtml(entry.segment)} | ${escapeHtml(entry.followUp)}</small></article>`; }
function escalationCard(entry, context) { return `<article class="escalation-card ${entry.status.toLowerCase()}"><span>${escapeHtml(entry.status)} | severity ${entry.severity} | ${escapeHtml(entry.owner)}</span><h4>${escapeHtml(entry.title)}</h4><p>${escapeHtml(entry.ask)}</p><small>${escapeHtml(entry.segment)} | ${escapeHtml(entry.dueDate)}</small>${initiativeReferenceActions(entry.item, `escalation-${context}`, "risks", entry.recordId, "View risk")}</article>`; }
function deliveryCard(entry, context) { return `<article class="delivery-card ${entry.state.toLowerCase().replace(" ", "-")}"><span>${escapeHtml(entry.state)} | ${entry.readiness}% | ${escapeHtml(entry.dueDate)}</span><h4>${escapeHtml(entry.item.title)}</h4><p>${escapeHtml(entry.nextStep)}</p><small>${escapeHtml(entry.owner)} | ${escapeHtml(entry.milestone)}</small>${initiativeReferenceActions(entry.item, `delivery-${context}`)}</article>`; }
function rolloutCard(entry, context) { return `<article class="rollout-card ${entry.status.toLowerCase()}"><span>${escapeHtml(entry.status)} | ${entry.readiness}% | ${escapeHtml(entry.owner)}</span><h4>${escapeHtml(entry.item.title)}</h4><p>${escapeHtml(entry.stage)}</p><p>${escapeHtml(entry.audience)}</p><small>${escapeHtml(entry.nextStep)}</small>${initiativeReferenceActions(entry.item, `rollout-${context}`)}</article>`; }
function enablementCard(entry, context) { return `<article class="enablement-card ${entry.gaps.length ? "warning" : ""}"><span>${escapeHtml(entry.status)} | ${entry.readiness}% | ${escapeHtml(entry.launchDate)}</span><h4>${escapeHtml(entry.item.title)}</h4><p>${escapeHtml(entry.handoff)}</p><small>${entry.checks.filter((check) => check.done).length}/${entry.checks.length} areas recorded complete</small>${initiativeReferenceActions(entry.item, `enablement-${context}`)}</article>`; }
function retrospectiveFollowUpCard(entry) {
  const item = state.items.find((candidate) => candidate.id === entry.itemId);
  if (!item) return "";
  return `<article class="retro-card" data-retro-follow-up="${escapeHtml(item.id)}"><h4>${escapeHtml(entry.title)}</h4><p>${escapeHtml(entry.action)}</p>${workflowRecommendationControls(item, `retro-follow-up-${item.id}`, entry.targets)}</article>`;
}
function workflowRecommendationControls(item, context, actions = [], blockers = []) {
  const recordActions = blockers.map((blocker) => ({ section: "dependencies", recordId: blocker.record.id, label: `Review dependency: ${blocker.record.description}` }));
  return `<div class="contextual-card-actions workflow-recommendation-controls">${initiativeDetailButton(item, context)}${[...actions, ...recordActions].map((action, index) => action.section
    ? initiativeDetailButton(item, `${context}-${index}`, action.label, action.section, action.recordId)
    : initiativeContextualEditButton(item, `${context}-${action.field}`, action.field, action.label)).join("")}</div>`;
}
function operationsRecommendationCard(action) {
  const item = state.items.find((candidate) => candidate.id === action.itemId);
  if (!item) return "";
  return `<article class="operations-recommendation" data-operations-item="${escapeHtml(item.id)}" data-operations-field="${escapeHtml(action.field)}"><p>${escapeHtml(action.text)}</p>${workflowRecommendationControls(item, `operations-${item.id}-${action.field}`, [action])}</article>`;
}
function metricGapCard(entry) {
  const context = `metric-gap-${entry.item.id}`;
  return `<article class="metric-plan-card warning" data-metric-gap-item="${escapeHtml(entry.item.id)}">
    <h4>${escapeHtml(entry.item.title)}</h4>
    <p>${escapeHtml(entry.instrumentation)}</p>
    <ul class="measurement-gap-actions">${entry.gapActions.map((action) => `<li data-metric-gap-field="${escapeHtml(action.field)}"><p>${escapeHtml(action.description)}</p>${initiativeContextualEditButton(entry.item, `${context}-${action.field}`, action.field, action.label)}</li>`).join("")}</ul>
    ${initiativeReferenceActions(entry.item, context)}
  </article>`;
}
function metricPlanCard(entry, context) {
  const evidence = entry.measurementEvidence || [];
  const linkedEvidence = evidence.map(record => {
    const source = record.sourceAvailability === "available" && state.insightRecords.find(candidate => candidate.id === record.recordId && candidate.initiativeId === entry.item.id);
    return `<article class="review-card" data-measurement-evidence="${escapeHtml(record.recordId)}">
      <h5>${escapeHtml(record.title)}</h5><p>${escapeHtml(INSIGHT_STATUS_LABELS[record.status] || record.status)}</p>
      ${record.successMetric ? `<p>Experiment success metric: ${escapeHtml(record.successMetric)}</p>` : ""}
      ${record.result ? `<p>Reported result: ${escapeHtml(record.result)}</p>` : ""}
      ${record.learning ? `<p>Learning context: ${escapeHtml(record.learning)}</p>` : ""}
      ${source ? insightRecordLink(source, `metric-evidence-${entry.item.id}`) : "<p>Source record is unavailable in this workspace.</p>"}
    </article>`;
  }).join("");
  return `<article class="metric-plan-card ${entry.status === "Saved measure" ? "" : "warning"}" data-metric-plan-item="${escapeHtml(entry.item.id)}">
    <span>${escapeHtml(entry.status)} · ${entry.reviewDate ? `Review ${escapeHtml(entry.reviewDate)}` : "Review date not recorded"}</span>
    <h4>${escapeHtml(entry.item.title)}</h4>
    <p>${entry.origin === "captured" ? "Saved primary metric" : "Suggested primary metric"}: ${escapeHtml(entry.primaryMetric)}</p>
    <p>${entry.metricTarget ? `Authored target: ${escapeHtml(entry.metricTarget)}` : "Target not recorded."}</p>
    <p>Instrumentation is unverified. Achievement has not been assessed.</p>
    <small>${escapeHtml(entry.leadingIndicator)}</small>
    ${evidence.length ? `<details class="metric-linked-evidence"><summary>Linked evidence (${evidence.length})</summary>
      <p>These records support review. They do not change the saved primary metric or verify telemetry or achievement.</p>
      ${(entry.evidenceReviewReasons || []).map(reason => `<p>${escapeHtml(reason)}</p>`).join("")}
      ${linkedEvidence}</details>` : "<p>No linked measurement evidence recorded.</p>"}
    ${initiativeReferenceActions(entry.item, `metric-${context}`)}
  </article>`;
}
function groupActionQueueEntries(entries) {
  const groups = new Map();
  entries.forEach((entry, index) => {
    const existing = groups.get(entry.item.id);
    if (existing) {
      existing.actions.push({ entry, index });
      existing.priority = Math.max(existing.priority, entry.priority);
      return;
    }
    groups.set(entry.item.id, { item: entry.item, actions: [{ entry, index }], priority: entry.priority });
  });
  return [...groups.values()];
}
function actionCountLabel(count) {
  return `${count} ${count === 1 ? "action" : "actions"}`;
}
function actionIssueLabel(entry) {
  return ({
    Owner: "Owner missing",
    "Next Step": "Next step missing",
    Decision: "Decision missing",
    Metric: "Success evidence missing",
    Overdue: "Due date overdue",
    Blocker: "Active blocker",
    Stale: "Update overdue"
  })[entry.type] || `${entry.type} needs attention`;
}
function actionQueueGroupCard(group, groupIndex) {
  const count = group.actions.length;
  const countLabel = group.totalCount > count ? `${count} of ${actionCountLabel(group.totalCount)} shown` : `${actionCountLabel(count)} needed`;
  const context = `actions-group-${groupIndex}-${group.item.id}`;
  const headingId = `actionGroupTitle-${elementIdToken(group.item.id)}`;
  return `<article class="action-card action-initiative-card" data-item-id="${escapeHtml(group.item.id)}" aria-labelledby="${headingId}"><header class="action-initiative-header"><div class="action-initiative-heading"><span>${escapeHtml(countLabel)} · ${escapeHtml(workspacePriorityLabel())} ${escapeHtml(workspacePriorityValue(group.item))}</span><h4 id="${headingId}">${escapeHtml(group.item.title)}</h4></div><div class="action-initiative-tools"><span class="action-urgency" aria-label="Highest urgency ${group.priority}">Urgency ${group.priority}</span>${initiativeDetailButton(group.item, context)}</div></header><div class="action-gap-list">${group.actions.map(actionQueueRow).join("")}</div></article>`;
}
function actionQueueRow({ entry, index }) {
  const context = `actions-${index}`;
  const completionControl = actionCompletionControl(entry, { context, index, origin: "queue", className: "primary small" });
  const issueId = `actionIssue-${elementIdToken(entry.id)}`;
  const supportingDetail = ["Blocker", "Overdue"].includes(entry.type) ? `<p class="action-gap-detail">${escapeHtml(entry.action)}</p>` : "";
  return `<section class="action-gap" data-action-entry="${escapeHtml(entry.id)}" aria-labelledby="${issueId}"><div class="action-gap-copy"><h5 id="${issueId}">${escapeHtml(actionIssueLabel(entry))}</h5><p>${escapeHtml(entry.requestedOutcome)}</p>${supportingDetail}${entry.availability === "read-only" ? `<p class="action-availability">Read-only · ${escapeHtml(entry.unavailableReason)}</p>` : ""}</div><div class="action-gap-tools"><span class="action-gap-urgency">Urgency ${entry.priority}</span>${completionControl}</div></section>`;
}
function dependencyBlockerCard(blocker, index) {
  const context = `dependency-${index}`;
  return `<article class="dependency-card" data-item-id="${escapeHtml(blocker.item.id)}"><span>Urgency ${blocker.urgency} | ${escapeHtml(blocker.owner)}</span><h4>${escapeHtml(blocker.item.title)}</h4><p>${escapeHtml(blocker.dependency)}</p><small>${escapeHtml(blocker.ask)}</small><div class="contextual-card-actions">${initiativeDetailButton(blocker.item, context, "Manage dependency", "dependencies", blocker.record.id)}</div></article>`;
}
function decisionCard(item, index) {
  const context = `decision-${index}`;
  const actionLabel = item.decision ? "Edit decision" : "Record decision";
  return `<article class="decision" data-item-id="${escapeHtml(item.id)}"><div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.problem || "No problem statement yet.")}</p><div class="contextual-card-actions">${initiativeDetailButton(item, context)}${initiativeContextualEditButton(item, context, "decision", actionLabel)}</div></div><dl><dt>Experiment</dt><dd>${escapeHtml(item.experiment || "Not defined")}</dd><dt>Decision</dt><dd>${escapeHtml(item.decision || "Pending")}</dd><dt>Active risk</dt><dd>${escapeHtml(primaryRiskText(item) || "None captured")}</dd></dl></article>`;
}
function portfolioRecommendationCard(recommendation) {
  return `<article class="portfolio-card portfolio-recommendation" data-recommendation="${escapeHtml(recommendation.id)}"><p>${escapeHtml(recommendation.text)}</p><details ${portfolioOpenRecommendations.has(recommendation.id) ? "open" : ""}><summary>Choose work to act on (${recommendation.targets.length})</summary><ul class="portfolio-recommendation-targets">${recommendation.targets.map((target, index) => {
    const item = state.items.find(item => item.id === target.itemId);
    if (!item) return "";
    const context = `portfolio-${recommendation.id}-${index}`;
    const disabled = teamEditorReadOnlyReason() ? "disabled" : "";
    const action = target.recordId ? `<button class="primary small" id="portfolioRisk-${elementIdToken(item.id)}-${elementIdToken(target.recordId)}" data-portfolio-risk="${escapeHtml(target.recordId)}" data-risk-item="${escapeHtml(item.id)}" data-detail-section="risks" data-detail-record="${escapeHtml(target.recordId)}" type="button" ${disabled}>Edit risk</button>` : initiativeContextualEditButton(item, context, target.field === "status" ? "statusId" : target.field, target.label);
    const risk = target.recordId ? item.risks.find(record => record.id === target.recordId) : null;
    return `<li><strong>${escapeHtml(item.title)}</strong><span class="muted">${escapeHtml(item.owner || "Unassigned")} · ${escapeHtml(item.id.slice(-6))}</span>${risk ? `<p>${escapeHtml(risk.description)}</p>` : ""}<div class="contextual-card-actions">${initiativeDetailButton(item, context, "View initiative", target.recordId ? "risks" : "", target.recordId)}${action}</div></li>`;
  }).join("")}</ul></details></article>`;
}

function initiativeReferenceActions(reference, context, section = "", recordId = "", label = "View initiative") {
  const itemId = typeof reference === "string" ? reference : reference?.id;
  const item = state.items.find((candidate) => candidate.id === itemId);
  if (!item) return "";
  return `<div class="contextual-card-actions">${initiativeDetailButton(item, context, label, section, recordId)}</div>`;
}
function initiativeReferenceList(items, context) {
  return items.map((item, index) => `<div>${initiativeReferenceActions(item, `${context}-${index}`, "", "", item.title)}<p class="muted">${escapeHtml(initiativeReportingContext(state.workflow, item))}</p></div>`).join("");
}
function initiativeDetailButton(item, context, label = "View initiative", section = "", recordId = "") {
  if (!item?.id) return "";
  const id = `viewInitiative-${elementIdToken(context)}-${elementIdToken(item.id)}`;
  return `<button class="secondary small" id="${id}" data-open-initiative="${escapeHtml(item.id)}" ${section ? `data-detail-section="${escapeHtml(section)}"` : ""} ${recordId ? `data-detail-record="${escapeHtml(recordId)}"` : ""} type="button" aria-label="${escapeHtml(label)} for ${escapeHtml(item.title)}">${escapeHtml(label)}</button>`;
}
function initiativeContextualEditButton(item, context, focusField, label) {
  if (!item?.id || !focusField || !label) return "";
  const reason = teamEditorReadOnlyReason();
  const disabled = reason ? "disabled" : "";
  const describedBy = reason ? 'aria-describedby="initiativeReadOnlyReason"' : "";
  const id = `actOnInitiative-${elementIdToken(context)}-${elementIdToken(item.id)}`;
  return `<button class="primary small" id="${id}" data-edit-item="${escapeHtml(item.id)}" data-editor-focus="${escapeHtml(focusField)}" type="button" aria-label="${escapeHtml(label)} for ${escapeHtml(item.title)}" ${disabled} ${describedBy}>${escapeHtml(label)}</button>`;
}
function actionQueueBuildOptions() {
  return {
    enabledCapabilities: state.experience.enabledCapabilities,
    readOnlyReason: teamEditorReadOnlyReason()
  };
}
function actionCompletionControl(entry, { context, index, origin, className = "secondary small" }) {
  if (entry.availability !== "actionable") return "";
  const id = `completeAction-${elementIdToken(context)}-${elementIdToken(entry.id)}`;
  return `<button class="${className}" id="${id}" data-complete-action="${escapeHtml(entry.id)}" data-action-index="${index}" data-action-origin="${escapeHtml(origin)}" type="button" aria-label="${escapeHtml(entry.label)} for ${escapeHtml(entry.title)}">${escapeHtml(entry.label)}</button>`;
}
function findActionQueueEntry(actionId) {
  for (const item of state.items) {
    const entry = buildActionQueue([item], new Date(), state.prioritization, actionQueueBuildOptions()).queue.find((candidate) => candidate.id === actionId);
    if (entry) return entry;
  }
  return null;
}
function actionContextFromEntry(entry, trigger) {
  return {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    label: entry.label,
    heading: entry.heading,
    requestedOutcome: entry.requestedOutcome,
    target: { ...entry.target },
    editor: { ...entry.editor },
    completionCondition: { ...entry.completionCondition },
    origin: trigger?.dataset.actionOrigin || "queue",
    queueIndex: Number(trigger?.dataset.actionIndex || 0),
    triggerId: trigger?.id || ""
  };
}
function openActionQueueAction(event) {
  const trigger = event.currentTarget;
  const entry = findActionQueueEntry(trigger.dataset.completeAction);
  if (!entry || entry.availability !== "actionable") return;
  const actionContext = actionContextFromEntry(entry, trigger);
  if (entry.editor.surface === "risk") {
    openRiskActionEditor(actionContext);
    return;
  }
  openInitiativeEditor("edit", trigger, entry.target.itemId, null, actionContext);
}
function openRiskActionEditor(actionContext) {
  const item = state.items.find((entry) => entry.id === actionContext.target.itemId);
  const record = item?.risks.find((entry) => entry.id === actionContext.target.recordId);
  if (!item || !record || teamEditorReadOnlyReason()) return;
  const recordEditor = prepareInitiativeRecordEditor({
    kind: "risk",
    recordId: record.id,
    convertFromRiskId: "",
    returnFocusId: actionContext.triggerId,
    focusField: actionContext.editor.field,
    actionContext,
    draft: null,
    error: ""
  }, item);
  if (actionContext.origin === "detail" && state.initiativeDetail.selectedId === item.id) {
    state.initiativeDetail.recordEditor = recordEditor;
    state.initiativeDetail.focusSection = "risks";
    state.initiativeDetail.focusRecordId = record.id;
    render();
    return;
  }
  state.initiativeDetail = createInitiativeDetailState({
    selectedId: item.id,
    triggerId: actionContext.triggerId,
    historyOwned: true,
    focusSection: "risks",
    focusRecordId: record.id,
    recordEditor
  });
  const url = new URL(location.href);
  url.searchParams.set("view", state.selectedView);
  url.searchParams.set("initiative", item.id);
  url.searchParams.set("section", "risks");
  url.searchParams.set("record", record.id);
  if (demoMode) url.searchParams.set("demo", "1");
  history.pushState({ view: state.selectedView, initiative: item.id, detailOpenedFromUi: true, detailTriggerId: actionContext.triggerId }, "", url);
  render();
}
function elementIdToken(value) { return String(value || "item").replace(/[^a-zA-Z0-9_-]/g, (character) => `_${character.codePointAt(0).toString(16)}_`); }
function summarizeDashboard(plans, objective) { return plans.filter((plan) => plan.objective === objective).slice(0, 3).map((plan) => plan.primaryMetric).join(" | ") || "No metrics drafted yet."; }
function listPlanItems(items, context) { return initiativeReferenceList(items, context) || emptyState("No initiatives selected."); }
function releaseBucket(title, subtitle, items) { return `<section class="panel release"><div class="panel-header"><div><h3>${title}</h3><span class="muted">${subtitle}</span></div></div>${items.map((item, index) => compactCard(item, `${title}-${index}`)).join("") || emptyState("No matching work.")}</section>`; }

function copyDraftTargets() { return Object.freeze({
  copyManagerBriefButton: "managerBriefDraft",
  copyWeeklyUpdateButton: "weeklyUpdateDraft",
  copyTemplateButton: "templateDraft",
  copyActionMemoButton: "actionMemoDraft",
  copyExecutiveBriefMemoButton: "executiveBriefMemoDraft",
  copyMeetingAgendaButton: "meetingAgendaDraft",
  copySpecButton: "specDraft",
  copyReleaseNotesButton: "releaseNotesDraft",
  copyDeliveryMemoButton: "deliveryMemoDraft",
  copyRolloutMemoButton: "rolloutMemoDraft",
  copyLaunchMemoButton: "launchMemoDraft",
  copyEnablementMemoButton: "enablementMemoDraft",
  copyDiscoveryMemoButton: "discoveryMemoDraft",
  copyFeedbackDigestButton: "feedbackDigestDraft",
  copySupportMemoButton: "supportMemoDraft",
  copyResearchMemoButton: "researchMemoDraft",
  copyValidationMemoButton: "validationMemoDraft",
  copyPortfolioMemoButton: "portfolioMemoDraft",
  copyQuarterlyPlanButton: "quarterlyPlanDraft",
  copyOutcomeMemoButton: "outcomeMemoDraft",
  copyMetricsMemoButton: "metricsMemoDraft",
  copyStakeholderMemoButton: "stakeholderMemoDraft",
  copyEscalationMemoButton: "escalationMemoDraft",
  copyReviewMemoButton: "reviewMemoDraft",
  copyRetroMemoButton: "retroMemoDraft",
  copyCommsMemoButton: "commsMemoDraft",
  copyDependencyMemoButton: "dependencyMemoDraft",
  copyActivityDigestButton: "activityDigestDraft"
}); }

function handleDelegatedNavigation(event) {
  const target = event.target instanceof Element
    ? event.target.closest("[data-view], [data-weekly-view], [data-space-mode], [data-jump-space]")
    : null;
  if (!target || !app.contains(target)) return;
  if (target.matches("a")) event.preventDefault();
  if (target.dataset.view) {
    navigateToView(target.dataset.view, "sidebar", target.dataset.settingsMode || "");
    return;
  }
  if (target.dataset.weeklyView) {
    navigateToView(target.dataset.weeklyView, "weekly", target.dataset.weeklyMode);
    return;
  }
  if (target.dataset.spaceMode) {
    selectSpaceMode(target.dataset.spaceMode);
    return;
  }
  if (target.dataset.jumpSpace) navigateToView(target.dataset.jumpSpace, "content", target.dataset.jumpMode);
}

function bindEvents() {
  document.querySelector("#checkHomeHealthButton")?.addEventListener("click", checkHomeHealth);
  document.querySelector("#downloadManagerBriefButton")?.addEventListener("click", () => {
    const draft = document.querySelector("#managerBriefDraft");
    if (!draft) return;
    downloadFile(draft.value, "text/markdown", `pm-os-manager-briefing-${todayStamp()}.md`);
    document.querySelector("#copyStatus").textContent = "Briefing download requested. Check your browser's downloads.";
  });
  document.querySelector("#openDataRecoveryButton")?.addEventListener("click", () => navigateToView("settings", "content", "data"));
  bindWorkspaceModeEvents();
  bindTutorialEvents();
  bindProjectSwitcherEvents();
  const customerTableScroll = document.querySelector(".customer-table-scroll");
  if (customerTableScroll) {
    customerTableScroll.tabIndex = 0;
    customerTableScroll.setAttribute("role", "region");
    customerTableScroll.setAttribute("aria-label", "Scrollable customer account table");
  }
  const viewsToggle = document.querySelector("#viewsToggle");
  const viewsNav = document.querySelector("#workspaceViews");
  viewsToggle?.addEventListener("click", () => { const open = !viewsNav?.classList.contains("open"); viewsNav?.classList.toggle("open", open); viewsToggle.setAttribute("aria-expanded", String(open)); });
  document.querySelectorAll("details[data-nav-group]").forEach((group) => group.addEventListener("toggle", () => {
    if (!group.open) {
      if (state.expandedNavGroup === group.dataset.navGroup) state.expandedNavGroup = "";
      return;
    }
    state.expandedNavGroup = group.dataset.navGroup;
    document.querySelectorAll("details[data-nav-group]").forEach((otherGroup) => {
      if (otherGroup !== group) otherGroup.open = false;
    });
  }));
  document.querySelector("#customizeWorkspaceButton")?.addEventListener("click", () => navigateToView("settings", "sidebar", "setup"));
  document.querySelectorAll("[data-experience-bundle]").forEach((button) => button.addEventListener("click", toggleExperienceBundle));
  document.querySelectorAll("[data-experience-capability]").forEach((input) => input.addEventListener("change", toggleExperienceCapability));
  document.querySelector("#saveExperienceButton")?.addEventListener("click", saveWorkspaceExperience);
  document.querySelector("#workspacePreset")?.addEventListener("change", event => {
    if (!workflowCanManage()) return;
    const presetId = event.currentTarget.value;
    setExperienceDraft(workspaceExperienceForPreset(presetId, draftWorkspaceExperience()));
    state.experiencePresetChoice = presetId;
    renderAndFocus("workspacePreset");
  });
  document.querySelectorAll("[data-priority-move]").forEach((button) => button.addEventListener("click", movePriorityItem));
  document.querySelectorAll('.priority-row[draggable="true"]').forEach((row) => {
    row.addEventListener("dragstart", startPriorityDrag);
    row.addEventListener("dragover", allowPriorityDrop);
    row.addEventListener("drop", dropPriorityItem);
    row.addEventListener("dragend", finishPriorityDrag);
  });
  document.querySelector("#boardTeamSelect")?.addEventListener("change", selectBoardTeam);
  document.querySelector("#mobileBoardStage")?.addEventListener("change", selectMobileBoardStage);
  document.querySelectorAll("[data-add-board-status]").forEach((button) => button.addEventListener("click", openBoardInitiativeEditor));
  document.querySelectorAll("[data-move-item]").forEach((button) => button.addEventListener("click", moveInitiativeFromMenu));
  document.querySelectorAll('.board-card[draggable="true"]').forEach((card) => {
    card.addEventListener("dragstart", beginBoardDrag);
    card.addEventListener("dragend", endBoardDrag);
  });
  document.querySelectorAll(".board-drop-zone").forEach((column) => {
    column.addEventListener("dragover", boardDragOver);
    column.addEventListener("dragleave", boardDragLeave);
    column.addEventListener("drop", dropBoardItem);
  });
  document.querySelector("#openPrioritizationSettings")?.addEventListener("click", openPrioritySettings);
  document.querySelector("#periodKind")?.addEventListener("change", changeTimelineKind);
  document.querySelector("#previousPeriodButton")?.addEventListener("click", () => moveTimelinePeriod(-1, "previousPeriodButton"));
  document.querySelector("#currentPeriodButton")?.addEventListener("click", selectCurrentTimelinePeriod);
  document.querySelector("#nextPeriodButton")?.addEventListener("click", () => moveTimelinePeriod(1, "nextPeriodButton"));
  document.querySelector("#periodJumpDate")?.addEventListener("change", jumpTimelinePeriod);
  document.querySelector("#showUnscheduledButton")?.addEventListener("click", () => applyPeriodSelection({ kind: "unscheduled" }, "periodKind"));
  document.querySelectorAll("[data-empty-period]").forEach((button) => button.addEventListener("click", () => applyPeriodSelection({ kind: button.dataset.emptyPeriod }, "periodKind")));
  document.querySelector("#clearEmptyInitiativeSearch")?.addEventListener("click", () => {
    state.query = "";
    render();
    document.querySelector("#searchInput")?.focus();
  });
  document.querySelectorAll("[data-customer-view]").forEach((button) => button.addEventListener("click", () => selectCustomerView(button.dataset.customerView)));
  document.querySelector("#newCustomerButton")?.addEventListener("click", openNewCustomer);
  document.querySelector("#exportCustomersButton")?.addEventListener("click", exportCustomers);
  document.querySelector("#downloadCustomerTemplate")?.addEventListener("click", downloadCustomerTemplate);
  document.querySelector("#customerSearch")?.addEventListener("input", updateCustomerSearch);
  document.querySelectorAll("[data-select-customer]").forEach((button) => button.addEventListener("click", () => selectCustomerAccount(button.dataset.selectCustomer)));
  document.querySelectorAll("[data-customer-page]").forEach((button) => button.addEventListener("click", () => changeCustomerPage(button.dataset.customerPage)));
  document.querySelector("#customerAccountForm")?.addEventListener("submit", saveCustomerAccount);
  document.querySelector("#customerAccountForm")?.addEventListener("input", captureCustomerAccountDraft);
  document.querySelector("#customerAccountForm")?.addEventListener("change", captureCustomerAccountDraft);
  document.querySelector("#discardCustomerAccountDraft")?.addEventListener("click", discardCustomerAccountDraft);
  document.querySelector("#deleteCustomerButton")?.addEventListener("click", deleteCustomerAccount);
  document.querySelector("#customerCsvInput")?.addEventListener("change", previewCustomerImport);
  document.querySelector("#applyCustomerImport")?.addEventListener("click", applyCustomerImport);
  document.querySelector("#cancelCustomerImport")?.addEventListener("click", cancelCustomerImport);
  document.querySelector("#newSegmentButton")?.addEventListener("click", openNewSegment);
  document.querySelectorAll("[data-select-segment]").forEach((button) => button.addEventListener("click", () => selectCustomerSegment(button.dataset.selectSegment)));
  document.querySelector("#customerSegmentForm")?.addEventListener("submit", saveCustomerSegment);
  document.querySelector("#customerSegmentForm")?.addEventListener("input", captureCustomerSegmentDraft);
  document.querySelector("#customerSegmentForm")?.addEventListener("change", handleCustomerSegmentFieldChange);
  document.querySelector("#addSegmentRule")?.addEventListener("click", addCustomerSegmentRule);
  document.querySelectorAll("[data-remove-segment-rule]").forEach((button) => button.addEventListener("click", removeCustomerSegmentRule));
  document.querySelector("#deleteSegmentButton")?.addEventListener("click", deleteCustomerSegment);
  document.querySelector("#newCustomerTagForm")?.addEventListener("submit", addCustomerTag);
  document.querySelectorAll(".customerTagForm").forEach((form) => form.addEventListener("submit", editCustomerTag));
  document.querySelectorAll("[data-delete-tag]").forEach((button) => button.addEventListener("click", deleteCustomerTag));
  document.querySelector("#newCustomerFieldForm")?.addEventListener("submit", addCustomerField);
  document.querySelectorAll(".customerFieldForm").forEach((form) => form.addEventListener("submit", editCustomerField));
  document.querySelectorAll("[data-delete-field]").forEach((button) => button.addEventListener("click", deleteCustomerField));
  document.querySelector("#themeToggle")?.addEventListener("click", toggleTheme);
  document.querySelectorAll("[data-select-unit]").forEach((button) => {
    button.addEventListener("click", () => selectOrganizationUnit(button.dataset.selectUnit));
    button.addEventListener("keydown", handleOrganizationTreeKeydown);
  });
  document.querySelectorAll("[data-select-person]").forEach((button) => button.addEventListener("click", () => { state.selectedPersonId = button.dataset.selectPerson; pushViewUrl(true); renderAndFocus("viewTitle"); }));
  document.querySelector("#addPersonForm")?.addEventListener("submit", addOrganizationPerson);
  document.querySelector("#editPersonForm")?.addEventListener("submit", editOrganizationPerson);
  document.querySelector("#removePersonButton")?.addEventListener("click", removeOrganizationPerson);
  document.querySelector("#addUnitForm")?.addEventListener("submit", addOrganizationUnit);
  document.querySelector("#editUnitForm")?.addEventListener("submit", editOrganizationUnit);
  document.querySelector("#removeUnitButton")?.addEventListener("click", removeOrganizationUnit);
  document.querySelector("#newInitiativeButton")?.addEventListener("click", (event) => openInitiativeEditor("new", event.currentTarget));
  document.querySelectorAll("[data-plan-generated-ask]").forEach(button => button.addEventListener("click", event => planGeneratedAsk(event.currentTarget)));
  document.querySelectorAll("[data-author-measure]").forEach(button => button.addEventListener("click", event => authorMeasure(event.currentTarget)));
  document.querySelector("#checklistCreateInitiative")?.addEventListener("click", (event) => openInitiativeEditor("new", event.currentTarget));
  document.querySelector("#startProjectImport")?.addEventListener("click", () => {
    navigateToView("settings", "context", "data");
    document.querySelector("#importButton")?.focus();
  });
  document.querySelector("#startProjectWorkflows")?.addEventListener("click", () => {
    navigateToView("settings", "context", "setup");
    document.querySelector("#workspaceSetupTitle")?.setAttribute("tabindex", "-1");
    document.querySelector("#workspaceSetupTitle")?.focus();
  });
  document.querySelector("#checklistCopyUpdate")?.addEventListener("click", (event) => copyDraft(event.currentTarget, "weeklyUpdateDraft"));
  document.querySelector("#editInitiativeButton")?.addEventListener("click", (event) => openInitiativeEditor("edit", event.currentTarget));
  document.querySelectorAll("[data-add-initiative-decision]").forEach((button) => button.addEventListener("click", (event) => openInitiativeWorkRecord(event.currentTarget.dataset.addInitiativeDecision, "decision", event.currentTarget, null, true)));
  document.querySelectorAll("[data-add-initiative-validation]").forEach(button => button.addEventListener("click", event => openInitiativeWorkRecord(event.currentTarget.dataset.addInitiativeValidation, "validation", event.currentTarget, null, true)));
  document.querySelectorAll("[data-add-initiative-action]").forEach((button) => button.addEventListener("click", (event) => addInitiativeAction(event.currentTarget)));
  document.querySelectorAll("[data-plan-enablement]").forEach((button) => button.addEventListener("click", (event) => planEnablementAction(event.currentTarget)));
  document.querySelectorAll("[data-new-insight]").forEach((button) => button.addEventListener("click", (event) => openInsightEditor("new", event.currentTarget, "", event.currentTarget.dataset.newInsight)));
  document.querySelectorAll("[data-view-insight]").forEach((button) => button.addEventListener("click", (event) => openInsightEditor("view", event.currentTarget, event.currentTarget.dataset.viewInsight)));
  document.querySelectorAll("[data-edit-insight]").forEach((button) => button.addEventListener("click", (event) => openInsightEditor("edit", event.currentTarget, event.currentTarget.dataset.editInsight)));
  document.querySelector("#insightStatusFilter")?.addEventListener("change", (event) => { state.insightStatusFilter = event.currentTarget.value; pushViewUrl(true); render(); document.querySelector("#insightStatusFilter")?.focus(); });
  document.querySelector("#insightEditorForm")?.addEventListener("submit", saveInsightEditor);
  document.querySelector("#insightEditorForm")?.addEventListener("input", captureInsightEditorDraft);
  bindInsightRelationships();
  document.querySelector("#backToInsightButton")?.addEventListener("click", backToInsightRecord);
  document.querySelectorAll("[data-insight-initiative]").forEach((button) => button.addEventListener("click", () => {
    state.insightEditor = createInsightEditorState();
    openInitiativeDetail(button.dataset.insightInitiative, button, { replaceDetail: Boolean(state.initiativeDetail.selectedId) });
  }));
  document.querySelector("#closeInsightEditorButton")?.addEventListener("click", closeInsightEditor);
  document.querySelector("#cancelInsightEditorButton")?.addEventListener("click", closeInsightEditor);
  document.querySelector("#editInsightFromViewButton")?.addEventListener("click", editInsightFromView);
  document.querySelector("#deleteInsightButton")?.addEventListener("click", deleteInsightFromEditor);
  document.querySelector("#promoteInsightButton")?.addEventListener("click", promoteDiscoveryToInitiative);
  document.querySelector("#insightEditorDialog")?.addEventListener("cancel", (event) => { event.preventDefault(); closeInsightEditor(); });
  document.querySelector("#briefCreateInitiativeButton")?.addEventListener("click", (event) => openInitiativeEditor("new", event.currentTarget));
  document.querySelector("#briefChooseInitiativeButton")?.addEventListener("click", (event) => openInitiativeEditor("edit", event.currentTarget));
  document.querySelectorAll("[data-open-initiative]").forEach((button) => button.addEventListener("click", (event) => openInitiativeDetail(event.currentTarget.dataset.openInitiative, event.currentTarget)));
  document.querySelector("#closeInitiativeDetailButton")?.addEventListener("click", requestInitiativeDetailClose);
  document.querySelector("#dismissUnavailableInitiativeButton")?.addEventListener("click", requestInitiativeDetailClose);
  document.querySelectorAll("[data-add-record]").forEach((button) => button.addEventListener("click", () => openInitiativeRecordEditor(button.dataset.addRecord, "", button)));
  document.querySelectorAll("[data-recommendation] details").forEach(details => details.addEventListener("toggle", () => { const id = details.closest("[data-recommendation]").dataset.recommendation; if (details.open) portfolioOpenRecommendations.add(id); else portfolioOpenRecommendations.delete(id); }));
  document.querySelectorAll("[data-portfolio-risk]").forEach(button => button.addEventListener("click", () => {
    if (teamEditorReadOnlyReason()) return;
    const item = state.items.find(item => item.id === button.dataset.riskItem);
    if (!item?.risks.some(record => record.id === button.dataset.portfolioRisk)) return;
    openInitiativeDetail(item.id, button);
    openInitiativeRecordEditor("risk", button.dataset.portfolioRisk, button);
  }));
  document.querySelectorAll("[data-edit-record]").forEach((button) => button.addEventListener("click", () => openInitiativeRecordEditor(button.dataset.editRecord, button.dataset.recordId, button)));
  document.querySelectorAll("[data-toggle-closed]").forEach((button) => button.addEventListener("click", () => toggleClosedInitiativeRecords(button.dataset.toggleClosed)));
  document.querySelectorAll("[data-set-record-status]").forEach((button) => button.addEventListener("click", () => setInitiativeRecordStatus(button.dataset.recordKind, button.dataset.recordId, button.dataset.setRecordStatus)));
  document.querySelectorAll("[data-convert-risk]").forEach((button) => button.addEventListener("click", () => convertInitiativeRisk(button.dataset.convertRisk, button)));
  document.querySelectorAll("[data-delete-record]").forEach((button) => button.addEventListener("click", () => deleteInitiativeRecord(button.dataset.deleteRecord, button.dataset.recordId, button)));
  document.querySelector("#initiativeRecordForm")?.addEventListener("submit", saveInitiativeRecord);
  document.querySelector("#initiativeRecordForm")?.addEventListener("input", captureInitiativeRecordDraft);
  document.querySelector("#initiativeRecordForm")?.addEventListener("change", captureInitiativeRecordDraft);
  document.querySelector("#initiativeRecordForm")?.addEventListener("change", syncDependencyTargetFields);
  document.querySelector("#initiativeRecordForm")?.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    cancelInitiativeRecordEditor(false);
  });
  document.querySelector("#cancelInitiativeRecord")?.addEventListener("click", () => cancelInitiativeRecordEditor(true));
  document.querySelectorAll("[data-detail-view]").forEach((button) => button.addEventListener("click", (event) => navigateFromInitiativeDetail(event.currentTarget.dataset.detailView)));
  document.querySelector("#initiativeDetailDialog")?.addEventListener("close", finishInitiativeDetailClose);
  document.querySelectorAll("[data-complete-action]").forEach((button) => button.addEventListener("click", openActionQueueAction));
  document.querySelectorAll("[data-edit-item]").forEach((button) => button.addEventListener("click", (event) => openInitiativeEditor("edit", event.currentTarget, event.currentTarget.dataset.editItem)));
  document.querySelector("#initiativeEditorForm")?.addEventListener("submit", saveInitiativeEditor);
  document.querySelector(".initiative-more-details")?.addEventListener("toggle", (event) => {
    if (event.currentTarget.isConnected) state.initiativeEditor.moreDetailsOpen = event.currentTarget.open;
  });
  document.querySelector("#initiativeEditorForm")?.addEventListener("input", captureInitiativeEditorDraft);
  document.querySelector("#initiativeEditorForm")?.addEventListener("change", refreshInitiativePriorityFields);
  document.querySelector("#initiativeEditorSearch")?.addEventListener("input", filterInitiativeEditorOptions);
  document.querySelector("#clearInitiativeEditorSearch")?.addEventListener("click", () => {
    const search = document.querySelector("#initiativeEditorSearch");
    if (!search) return;
    search.value = "";
    filterInitiativeEditorOptions({ currentTarget: search });
    search.focus();
  });
  document.querySelector("#initiativeEditorPicker")?.addEventListener("change", selectInitiativeForEditor);
  document.querySelector("#initiativeTargetAudience")?.addEventListener("click", handleInitiativeTargetClick);
  document.querySelector("#initiativeTargetAudience")?.addEventListener("change", handleInitiativeTargetChange);
  document.querySelector("#initiativeTargetSearch")?.addEventListener("input", filterInitiativeTargets);
  document.querySelector("#closeInitiativeEditorButton")?.addEventListener("click", requestInitiativeEditorClose);
  document.querySelector("#cancelInitiativeEditorButton")?.addEventListener("click", requestInitiativeEditorClose);
  document.querySelector("#deleteInitiativeButton")?.addEventListener("click", deleteInitiativeFromEditor);
  document.querySelector("#initiativeEditorDialog")?.addEventListener("cancel", handleInitiativeEditorCancel);
  document.querySelector("#initiativeEditorDialog")?.addEventListener("close", finishInitiativeEditorClose);
  document.querySelectorAll("[data-template]").forEach((button) => button.addEventListener("click", () => { state.selectedTemplate = button.dataset.template; render(); }));
  document.querySelectorAll("[data-meeting]").forEach((button) => button.addEventListener("click", () => { state.selectedMeeting = button.dataset.meeting; render(); }));
  document.querySelectorAll("[data-spec]").forEach((button) => button.addEventListener("click", () => { state.selectedSpecId = button.dataset.spec; pushViewUrl(true); render(); }));
  document.querySelector("#searchInput")?.addEventListener("input", updateSearch);
  document.querySelector("#exportButton")?.addEventListener("click", () => exportWorkspaceData("json"));
  document.querySelector("#dataAdvanced")?.addEventListener("toggle", (event) => { state.dataAdvancedOpen = event.currentTarget.open; });
  document.querySelector("#exportCsvButton")?.addEventListener("click", () => exportWorkspaceData("csv"));
  document.querySelector("#exportIssuesButton")?.addEventListener("click", () => exportWorkspaceData("issues"));
  document.querySelector("#importButton")?.addEventListener("click", () => document.querySelector("#importInput")?.click());
  document.querySelector("#importInput")?.addEventListener("change", importFromFile);
  document.querySelectorAll("[data-restore-backup]").forEach((button) => button.addEventListener("click", restoreBackup));
  document.querySelectorAll("[data-download-backup]").forEach((button) => button.addEventListener("click", downloadBackup));
  document.querySelector("#sourceType")?.addEventListener("change", changeSourceSelection);
  document.querySelectorAll("[data-source-choice]").forEach((button) => button.addEventListener("click", () => changeSourceSelection({ currentTarget: { value: button.dataset.sourceChoice } })));
  document.querySelector("#useBrowserStorageButton")?.addEventListener("click", useBrowserStorage);
  document.querySelector("#linkWorkspaceFileButton")?.addEventListener("click", linkExistingWorkspaceFile);
  document.querySelector("#createWorkspaceFileButton")?.addEventListener("click", createNewWorkspaceFile);
  document.querySelector("#reviewLinkedFileConflictButton")?.addEventListener("click", showProjectSyncReview);
  document.querySelector("#saveLinkedFileButton")?.addEventListener("click", saveLinkedWorkspaceNow);
  document.querySelector("#requestLinkedFilePermissionButton")?.addEventListener("click", requestLinkedWorkspacePermission);
  document.querySelector("#unlinkWorkspaceFileButton")?.addEventListener("click", unlinkWorkspaceFile);
  document.querySelectorAll("[data-file-conflict-choice]").forEach((button) => button.addEventListener("click", resolveLinkedFileConflict));
  document.querySelector("#driveFolderName")?.addEventListener("blur", updateSourceSettings);
  document.querySelector("#driveFileName")?.addEventListener("blur", updateSourceSettings);
  document.querySelector("#driveClientId")?.addEventListener("blur", updateSourceSettings);
  document.querySelector("#connectDriveButton")?.addEventListener("click", connectDrive);
  document.querySelector("#chooseDriveFileButton")?.addEventListener("click", chooseDriveFile);
  document.querySelector("#syncDriveButton")?.addEventListener("click", syncDriveNow);
  document.querySelector("#checkDriveButton")?.addEventListener("click", checkDrive);
  document.querySelector("#pullDriveButton")?.addEventListener("click", pullFromDrive);
  document.querySelector("#advancedPullDriveButton")?.addEventListener("click", pullFromDrive);
  document.querySelector(".source-advanced")?.addEventListener("toggle", (event) => { state.driveAdvancedOpen = event.currentTarget.open; });
  document.querySelector("#pushDriveButton")?.addEventListener("click", pushToDrive);
  document.querySelector("#saveConflictCopyButton")?.addEventListener("click", saveLocalConflictCopy);
  document.querySelector("#retryTeamLoadButton")?.addEventListener("click", () => initializeTeamSetup());
  document.querySelector("#teamManagedButton")?.addEventListener("click", useManagedTeamSetup);
  document.querySelector("#teamByoButton")?.addEventListener("click", () => { state.team.mode = "byo"; state.team.error = false; state.team.status = state.sourceSelection === "local-server" ? "Enter the public endpoint generated by PM OS Local Server." : "Enter the public settings for Supabase Cloud or your self-hosted stack."; renderAndFocus("teamProjectUrl"); });
  document.querySelectorAll("#cancelTeamSetupButton").forEach((button) => button.addEventListener("click", cancelTeamSetup));
  document.querySelector("#teamSetupForm")?.addEventListener("submit", checkByoTeamSetup);
  document.querySelector("#teamAuthMode")?.addEventListener("change", (event) => { state.team.authMode = event.target.value === "password" ? "password" : "otp"; });
  document.querySelector("#teamEmailForm")?.addEventListener("submit", sendTeamCode);
  document.querySelector("#teamCodeForm")?.addEventListener("submit", verifyTeamCode);
  document.querySelector("#teamPasswordForm")?.addEventListener("submit", authenticateTeamPassword);
  document.querySelector("#resendTeamCodeButton")?.addEventListener("click", resendTeamCode);
  document.querySelector("#changeTeamEmailButton")?.addEventListener("click", changeTeamEmail);
  document.querySelector("#changeTeamProjectButton")?.addEventListener("click", resetTeamProject);
  document.querySelectorAll("[data-open-team-workspace]").forEach((button) => button.addEventListener("click", openTeamWorkspace));
  document.querySelector("#createTeamWorkspaceForm")?.addEventListener("submit", createTeamWorkspace);
  document.querySelector("#teamWorkspaceName")?.addEventListener("input", captureTeamWorkspaceCreateDraft);
  document.querySelector("#joinTeamWorkspaceForm")?.addEventListener("submit", joinTeamWorkspace);
  document.querySelector("#switchTeamWorkspaceButton")?.addEventListener("click", showTeamWorkspaceList);
  document.querySelector("#leaveTeamButton")?.addEventListener("click", leaveTeamWorkspace);
  document.querySelector("#signOutTeamButton")?.addEventListener("click", signOutTeamWorkspace);
  document.querySelector("#retryTeamSyncButton")?.addEventListener("click", retryTeamSync);
  document.querySelector("#createTeamInviteForm")?.addEventListener("submit", createTeamInvite);
  document.querySelectorAll("[data-team-member-role]").forEach((control) => control.addEventListener("change", changeTeamMemberRole));
  document.querySelectorAll("[data-remove-team-member]").forEach((button) => button.addEventListener("click", removeTeamMember));
  document.querySelector("#refreshTeamInvitesButton")?.addEventListener("click", refreshTeamInvitations);
  document.querySelectorAll("[data-resend-team-invite]").forEach(button => button.addEventListener("click", () => resendTeamInvitation(button.dataset.resendTeamInvite)));
  document.querySelectorAll("[data-revoke-team-invite]").forEach(button => button.addEventListener("click", () => revokeTeamInvitation(button.dataset.revokeTeamInvite)));
  document.querySelector("#teamInviteDialog")?.addEventListener("close", clearTeamInvite);
  document.querySelector("#reviewTeamConflictButton")?.addEventListener("click", reviewTeamConflict);
  document.querySelector("#retryTeamDraftButton")?.addEventListener("click", retryTeamDraft);
  document.querySelector("#discardTeamDraftButton")?.addEventListener("click", discardTeamDraft);
  document.querySelector("#resetButton")?.addEventListener("click", resetWorkspace);
  document.querySelector("#resetUsageButton")?.addEventListener("click", resetUsage);
  document.querySelectorAll("[data-select-workflow-status]").forEach((button) => button.addEventListener("click", () => {
    state.selectedWorkflowStatusId = button.dataset.selectWorkflowStatus;
    renderAndFocus("workflowInspectorTitle");
  }));
  document.querySelector("#workflowStatusForm")?.addEventListener("submit", saveWorkflowStatus);
  document.querySelector("#addWorkflowStatusButton")?.addEventListener("click", addWorkflowStatus);
  document.querySelector("#deleteWorkflowStatusButton")?.addEventListener("click", deleteWorkflowStatus);
  document.querySelectorAll("[data-move-workflow-status]").forEach((button) => button.addEventListener("click", moveWorkflowStatus));
  document.querySelector("#priorityDefaultForm")?.addEventListener("submit", savePriorityDefault);
  document.querySelector("#priorityLevelsForm")?.addEventListener("submit", savePriorityLevels);
  document.querySelector("#priorityLevelsForm")?.addEventListener("click", handlePriorityLevelSettingsClick);
  document.querySelector("#teamPriorityOverridesForm")?.addEventListener("submit", saveTeamPriorityOverrides);
  document.querySelector("#addPriorityFrameworkButton")?.addEventListener("click", addPriorityFramework);
  document.querySelectorAll("[data-select-priority-framework]").forEach((button) => button.addEventListener("click", () => {
    state.selectedPriorityFrameworkId = button.dataset.selectPriorityFramework;
    renderAndFocus("customFrameworkTitle");
  }));
  document.querySelector("#customPriorityFrameworkForm")?.addEventListener("submit", saveCustomPriorityFramework);
  document.querySelector("#addPriorityCriterionButton")?.addEventListener("click", addPriorityCriterion);
  bindPriorityCriterionRemoveButtons();
  document.querySelector("#deletePriorityFrameworkButton")?.addEventListener("click", deletePriorityFramework);
  bindPlanningCapacityEvents();
  document.querySelector("#planningCalendarForm")?.addEventListener("submit", savePlanningCalendar);
  document.querySelector("#planningCalendarForm")?.addEventListener("change", toggleSprintCalendarFields);
  bindCopyDraftControls();
  labelReadonlyDrafts();
  const inviteDialog = document.querySelector("#teamInviteDialog");
  if (inviteDialog && !inviteDialog.open) queueMicrotask(() => { if (inviteDialog.isConnected && !inviteDialog.open) inviteDialog.showModal(); });
  const detailDialog = document.querySelector("#initiativeDetailDialog");
  if (detailDialog && !detailDialog.open) queueMicrotask(() => {
    if (!detailDialog.isConnected || detailDialog.open) return;
    detailDialog.showModal();
    const detailFocus = state.initiativeDetail.recordEditor.kind
      ? `#initiativeRecordForm [name="${state.initiativeDetail.recordEditor.focusField || "description"}"]`
      : state.initiativeDetail.focusRecordId
        ? `#initiative-record-${elementIdToken(state.initiativeDetail.focusRecordId)}`
        : state.initiativeDetail.focusSection
          ? `#initiative-${state.initiativeDetail.focusSection}`
          : "#initiativeDetailTitle";
    document.querySelector(detailFocus)?.focus();
  });
  const editorDialog = document.querySelector("#initiativeEditorDialog");
  if (editorDialog && !editorDialog.open) queueMicrotask(() => {
    if (!editorDialog.isConnected || editorDialog.open) return;
    editorDialog.showModal();
    const requestedField = state.initiativeEditor.focusField === "customer" ? "#openInitiativeTargetPicker" : state.initiativeEditor.focusField ? `#initiativeEditorForm [name="${state.initiativeEditor.focusField}"]` : "";
    const editorFocus = state.initiativeEditor.mode === "edit" && !state.initiativeEditor.selectedFromCard ? "#initiativeEditorSearch" : requestedField || "#initiativeTitle";
    const focusTarget = document.querySelector(editorFocus);
    for (let parent = focusTarget?.parentElement; parent && parent !== editorDialog; parent = parent.parentElement) {
      if (parent.tagName === "DETAILS") parent.open = true;
    }
    focusTarget?.focus();
  });
  const insightDialog = document.querySelector("#insightEditorDialog");
  if (insightDialog && !insightDialog.open) queueMicrotask(() => {
    if (!insightDialog.isConnected || insightDialog.open) return;
    insightDialog.showModal();
    (document.querySelector(state.insightEditor.mode === "view" ? "#closeInsightEditorButton" : state.insightEditor.focusField ? `#insightEditorForm [name="${state.insightEditor.focusField}"]` : "#insightTitle") || document.querySelector("#insightTitle"))?.focus();
  });
}

function bindProjectSwitcherEvents() {
  const ui = state.projects;
  if (!ui) return;
  document.querySelector("#projectSwitcherButton")?.addEventListener("click", openProjectSwitcher);
  document.querySelector("#mobileProjectSwitcherButton")?.addEventListener("click", openProjectSwitcher);
  document.querySelector("#closeProjectSwitcherButton")?.addEventListener("click", closeProjectSwitcher);
  document.querySelector("#projectSwitcherSearch")?.addEventListener("input", updateProjectSearch);
  document.querySelectorAll("[data-switch-project]").forEach((button) => button.addEventListener("click", switchToLocalProject));
  document.querySelectorAll("[data-switch-server-project]").forEach((button) => button.addEventListener("click", switchToServerProject));
  document.querySelectorAll("[data-switch-team-project]").forEach((button) => button.addEventListener("click", switchToTeamProject));
  document.querySelector("#newProjectButton")?.addEventListener("click", openProjectWizard);
  document.querySelector("#manageProjectsButton")?.addEventListener("click", () => showProjectSurface("manage", "backToProjectSwitcherButton"));
  document.querySelector("#backToProjectSwitcherButton")?.addEventListener("click", () => showProjectSurface("switcher", "projectSwitcherSearch"));
  const wizardForm = document.querySelector("#projectWizardForm");
  if (ui.busy) wizardForm?.querySelectorAll("input, select").forEach(control => { control.disabled = true; });
  wizardForm?.addEventListener("submit", advanceProjectWizard);
  document.querySelector("#onboardingDemoButton")?.addEventListener("click", () => navigateToWorkspaceMode("demo"));
  document.querySelector("#onboardingImportFile")?.addEventListener("change", readOnboardingImport);
  document.querySelector("#onboardingPreset")?.addEventListener("change", updateProjectWizardChoice);
  document.querySelectorAll('[name="entryMode"]').forEach(control => control.addEventListener("change", updateProjectWizardChoice));
  document.querySelectorAll("[data-onboarding-capability]").forEach(control => control.addEventListener("change", () => {
    ui.wizard.customCapabilities = [...document.querySelectorAll("[data-onboarding-capability]:checked")].map(input => input.dataset.onboardingCapability);
  }));
  document.querySelector("#projectName")?.addEventListener("input", (event) => {
    ui.wizard.name = event.currentTarget.value;
    ui.wizard.error = "";
  });
  document.querySelectorAll('[name="provider"]').forEach((control) => control.addEventListener("change", updateProjectWizardChoice));
  document.querySelectorAll('[name="onboarding"]').forEach((control) => control.addEventListener("change", updateProjectWizardChoice));
  document.querySelectorAll('[name="serverAction"]').forEach((control) => control.addEventListener("change", updateProjectWizardChoice));
  document.querySelectorAll('[name="sourceAction"]').forEach((control) => control.addEventListener("change", updateProjectWizardChoice));
  for (const id of ["projectDriveClientId", "projectDriveFileLink", "projectDriveFolderName"]) {
    document.querySelector(`#${id}`)?.addEventListener("input", captureServerWizardFields);
  }
  for (const id of ["serverConnectorChoice", "serverConnectorMode", "serverConnectorAuthMode", "serverConnectorLabel", "serverConnectorUrl", "serverConnectorKey", "serverPersistSession", "serverWorkspaceChoice"]) {
    document.querySelector(`#${id}`)?.addEventListener("change", () => {
      captureServerWizardFields();
      if (id === "serverConnectorChoice" || id === "serverConnectorMode") renderAndFocus(id);
    });
    document.querySelector(`#${id}`)?.addEventListener("input", captureServerWizardFields);
  }
  document.querySelector("#projectWizardBackButton")?.addEventListener("click", stepBackProjectWizard);
  document.querySelector("#openTeamProjectSetupButton")?.addEventListener("click", openTeamProjectSetup);
  document.querySelectorAll("[data-rename-project]").forEach((button) => button.addEventListener("click", openRenameProject));
  document.querySelector("#renameProjectForm")?.addEventListener("submit", submitRenameProject);
  document.querySelector("#cancelRenameProjectButton")?.addEventListener("click", () => showProjectSurface("manage", "backToProjectSwitcherButton"));
  document.querySelectorAll("[data-archive-project]").forEach((button) => button.addEventListener("click", requestProjectArchive));
  document.querySelectorAll("[data-unarchive-project]").forEach((button) => button.addEventListener("click", unarchiveProject));
  document.querySelector("#cancelProjectArchiveButton")?.addEventListener("click", cancelProjectArchive);
  document.querySelector("#confirmProjectArchiveButton")?.addEventListener("click", confirmProjectArchive);
  document.querySelectorAll("[data-forget-project]").forEach((button) => button.addEventListener("click", openForgetProject));
  document.querySelectorAll("[data-delete-drive-project]").forEach((button) => button.addEventListener("click", openForgetProject));
  document.querySelector("#forgetProjectName")?.addEventListener("input", updateForgetProjectName);
  document.querySelector("#downloadProjectBackupButton")?.addEventListener("click", downloadProjectBackup);
  document.querySelector("#cancelForgetProjectButton")?.addEventListener("click", () => showProjectSurface("manage", "backToProjectSwitcherButton"));
  document.querySelector("#forgetProjectForm")?.addEventListener("submit", confirmForgetProject);
  document.querySelector("#serverProjectAuthForm")?.addEventListener("submit", submitServerProjectAuth);
  document.querySelector("#serverProjectUseEmailCode")?.addEventListener("click", () => {
    const gate = state.projects?.serverGate;
    if (!gate?.allowEmailCode || state.projects.busy) return;
    gate.email = document.querySelector("#serverProjectEmail")?.value || gate.email;
    gate.authMode = "otp";
    gate.codeSent = false;
    render();
  });
  document.querySelector("#cancelServerProjectAuthButton")?.addEventListener("click", cancelServerProjectAuth);
  document.querySelectorAll("[data-signout-connector]").forEach((button) => button.addEventListener("click", signOutServerConnector));
  document.querySelectorAll("[data-remove-connector]").forEach((button) => button.addEventListener("click", removeServerConnectorFromUi));

  const dialog = document.querySelector("#projectSwitcherDialog, #projectArchiveDialog");
  dialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    if (ui.surface === "confirm-archive") cancelProjectArchive();
    else if (["rename", "delete"].includes(ui.surface)) showProjectSurface("manage", "backToProjectSwitcherButton");
    else closeProjectSwitcher();
  });
  if (dialog && !dialog.open) queueMicrotask(() => {
    if (!dialog.isConnected || dialog.open) return;
    dialog.showModal();
    const selector = ui.surface === "switcher" ? "#projectSwitcherSearch"
      : ui.surface === "wizard" ? ui.wizard.step === 1 ? "#projectName" : ui.wizard.step === 3 || ui.wizard.error ? "#projectWizardContinueButton" : '[name="provider"]:checked'
        : ui.surface === "server-auth" ? "#serverProjectEmail"
        : ui.surface === "rename" ? "#renameProjectName"
          : ui.surface === "delete" ? ui.backupDownloaded ? "#forgetProjectName" : "#downloadProjectBackupButton"
            : ui.surface === "confirm-archive" ? "#projectArchiveTitle" : "#backToProjectSwitcherButton";
    document.querySelector(selector)?.focus();
  });
}

function openProjectSwitcher(event) {
  const ui = state.projects;
  if (!ui) return;
  ui.returnFocusId = event.currentTarget.id;
  ui.surface = "switcher";
  ui.error = "";
  ui.status = "";
  refreshLocalProjectCatalog();
  render();
  if (!ui.error) void refreshProjectCatalog();
}

function refreshLocalProjectCatalog() {
  const ui = state.projects;
  if (!ui?.persistent || ui.busy) return;
  try {
    ui.registry = readCurrentProjectRegistry(localStorage, ui.registry);
    projectRegistry = ui.registry;
  } catch (error) {
    ui.error = error.message;
  }
}

async function refreshProjectCatalog() {
  const ui = state.projects;
  if (!ui?.persistent || !serverConnectorPool || ui.surface !== "switcher") return;
  const generation = ui.catalogGeneration = (ui.catalogGeneration || 0) + 1;
  const poolRegistry = serverConnectorPool.registry;
  const current = () => state.projects === ui && ui.catalogGeneration === generation
    && ui.surface === "switcher" && !ui.busy && !ui.connectorBusyId && serverConnectorPool.registry === poolRegistry;
  await Promise.allSettled(poolRegistry.connectors.map(async (connector) => {
    if (!projectsForConnector(ui.registry, connector.id).some((project) => !project.archivedAt)) return;
    try {
      const client = serverConnectorPool.clientFor(connector.id);
      const auth = await client.getAuthState();
      if (!current()) return;
      const authenticated = auth?.status === "authenticated" && auth.user;
      const workspaces = authenticated
        ? collectionFrom(await client.teamService.listWorkspaces(), "workspaces").map(normalizeTeamWorkspace) : [];
      if (!current()) return;
      let changed = false;
      for (const project of projectsForConnector(ui.registry, connector.id)) {
        if (project.archivedAt) continue;
        const workspace = workspaces.find((entry) => entry.id === project.workspaceId);
        const patch = !authenticated ? { serverStatus: "sign-in-required" }
          : !workspace ? { serverStatus: "unavailable" }
            : { name: workspace.name, serverRole: workspace.role, serverRevision: workspace.revision, serverStatus: "available" };
        if (Object.entries(patch).every(([key, value]) => project[key] === value)) continue;
        ui.registry = updateProjectMetadata(localStorage, ui.registry, project.id, patch);
        projectRegistry = ui.registry;
        changed = true;
      }
      if (changed && current()) {
        const focused = document.activeElement;
        const focusId = focused?.id;
        const selection = focused?.id === "projectSwitcherSearch" ? [focused.selectionStart, focused.selectionEnd] : null;
        render();
        queueMicrotask(() => {
          if (!current()) return;
          const restored = focusId && document.getElementById(focusId);
          restored?.focus();
          if (selection) restored?.setSelectionRange(...selection);
        });
      }
    } catch {
      // Keep cached entries usable; opening a project still rechecks authorization.
    }
  }));
}

function closeProjectSwitcher() {
  const ui = state.projects;
  if (!ui || ui.busy) return;
  ui.catalogGeneration = (ui.catalogGeneration || 0) + 1;
  if (ui.wizard.firstRun && ui.surface === "wizard") return;
  ui.driveDeleteToken = "";
  ui.driveDeleteTicket = null;
  const focusId = ui.returnFocusId || "projectSwitcherButton";
  ui.surface = "closed";
  ui.error = "";
  ui.pendingProjectId = "";
  render();
  document.querySelector(`#${cssEscape(focusId)}`)?.focus();
}

function showProjectSurface(surface, focusId = "") {
  if (!state.projects || state.projects.busy) return;
  if (surface !== "delete") {
    state.projects.driveDeleteToken = "";
    state.projects.driveDeleteTicket = null;
  }
  state.projects.surface = surface;
  state.projects.error = "";
  if (["switcher", "manage"].includes(surface)) refreshLocalProjectCatalog();
  render();
  if (focusId) document.querySelector(`#${cssEscape(focusId)}`)?.focus();
}

function updateProjectSearch(event) {
  const ui = state.projects;
  if (!ui) return;
  ui.query = event.currentTarget.value;
  const cursor = event.currentTarget.selectionStart;
  render();
  const input = document.querySelector("#projectSwitcherSearch");
  input?.focus();
  if (input && Number.isInteger(cursor)) input.setSelectionRange(cursor, cursor);
}

async function switchToLocalProject(event) {
  await stageLocalProjectSwitch(event.currentTarget.dataset.switchProject, { trigger: event.currentTarget });
}

async function chooseProjectDeparture({ title, description, confirmLabel, secondaryLabel }) {
  const ui = state.projects;
  ui.surface = "closed";
  render();
  // Editor dialogs open in render's microtask; the decision must be the top modal.
  await Promise.resolve();
  let secondary = false;
  const confirmed = await requestDataConfirmation({
    title, description, confirmLabel, secondaryLabel,
    trigger: document.querySelector(`#${cssEscape(ui.returnFocusId || "projectSwitcherButton")}`),
    onSecondary: () => {
      secondary = true;
      document.querySelector("#confirmationDialog")?.close("secondary");
    }
  });
  return confirmed ? "confirm" : secondary ? "secondary" : "cancel";
}

function showProjectSyncReview() {
  state.projects.surface = "closed";
  state.selectedView = "settings";
  state.selectedMode = "data";
  state.spaceModes.settings = "data";
  pushViewUrl(true);
  render();
  document.querySelector(state.source.type === "local-file" ? ".linked-file-conflicts button, #syncStatus" : "#syncStatus")?.focus();
}

async function approveProjectDeparture({ replaceUrl = false } = {}) {
  const ui = state.projects;
  if (ui.departurePending) return false;
  if (state.dataBusy || state.team.mutationBusy) {
    ui.error = "Wait for the current save or sync to finish before switching projects.";
    ui.surface = "switcher";
    if (replaceUrl) pushViewUrl(true);
    render();
    return false;
  }
  const source = state.source;
  const workspace = state.team.workspace;
  const projectId = ui.registry.activeProjectId;
  const stillCurrent = () => state.source === source && state.team.workspace === workspace && ui.registry.activeProjectId === projectId;
  const cancel = () => {
    ui.surface = state.initiativeEditor.mode || state.insightEditor.mode ? "closed" : "switcher";
    if (replaceUrl) pushViewUrl(true);
    render();
    return false;
  };
  ui.departurePending = true;
  try {
    if (state.customerAccountDrafts.size) {
      const choice = await chooseProjectDeparture({ title: "Discard account drafts and switch?", description: "Your unsaved customer account edits are only in this tab. Cancel to return and save them, or discard them when this project closes.", confirmLabel: "Discard drafts and switch" });
      if (!stillCurrent() || choice === "cancel") return cancel();
    }
    if (documentComposer.hasEdits) {
      const choice = await chooseProjectDeparture({ title: "Discard your document draft and switch?", description: "This draft is only in this tab. Cancel and download a copy from Documents to keep your edits.", confirmLabel: "Discard draft and switch" });
      if (!stillCurrent() || choice === "cancel") return cancel();
    }

    if (state.initiativeEditor.mode || (state.insightEditor.mode && state.insightEditor.mode !== "view")) {
      const choice = await chooseProjectDeparture({
        title: "Save your draft before switching?", description: "Save this draft in the current project, discard it, or cancel to keep editing.",
        confirmLabel: "Save and switch", secondaryLabel: "Discard and switch"
      });
      if (!stillCurrent() || choice === "cancel") return cancel();
      if (choice === "confirm") {
        const initiative = Boolean(state.initiativeEditor.mode);
        const form = document.querySelector(initiative ? "#initiativeEditorForm" : "#insightEditorForm");
        if (!form) return cancel();
        await (initiative ? saveInitiativeEditor : saveInsightEditor)({ preventDefault() {}, currentTarget: form });
        if (!stillCurrent() || state.initiativeEditor.mode || state.insightEditor.mode) return cancel();
      } else {
        state.pendingInsightPromotionId = "";
        state.initiativeEditor = createInitiativeEditorState();
        state.insightEditor = createInsightEditorState();
      }
    }
    if (state.team.active && state.team.conflict) {
      const choice = await chooseProjectDeparture({
        title: "Review your unsaved team draft?", description: "The server version changed. Review your draft or discard it before leaving this project.",
        confirmLabel: "Discard draft and switch", secondaryLabel: "Review conflict"
      });
      if (!stillCurrent() || choice === "cancel") return cancel();
      if (choice === "secondary") { reviewTeamConflict(); pushViewUrl(true); return false; }
      discardTeamDraft();
    }
    if (!state.team.active && (state.sync.localPending || state.sync.fileConflicts.length || state.driveReview || state.sync.conflict)) {
      const conflict = Boolean(state.sync.fileConflicts.length || state.driveReview || state.sync.conflict);
      const choice = await chooseProjectDeparture({
        title: conflict ? "Switch with unresolved conflicts?" : "Switch with unsynced changes?",
        description: conflict ? "Resolve the conflict now, or keep it in this project's browser copy and return later. Neither external copy will be overwritten." : "Sync before leaving, or keep changes saved in this project's browser copy and return to sync later.",
        confirmLabel: conflict ? "Keep conflict and switch" : "Keep changes and switch",
        secondaryLabel: conflict ? "Resolve now" : "Sync and switch"
      });
      if (!stillCurrent() || choice === "cancel") return cancel();
      if (choice === "secondary") {
        if (conflict) { showProjectSyncReview(); return false; }
        if (state.source.type === "google-drive") await syncDriveNow();
        else if (state.source.type === "local-file") {
          // Inspect remote changes before writing so switching cannot overwrite a concurrent edit.
          const inspected = await inspectLinkedWorkspaceOnFocus({ forSwitch: true });
          if (inspected && stillCurrent() && !state.sync.fileConflicts.length && state.sync.localPending) await saveLinkedWorkspaceNow();
        }
        if (!stillCurrent()) return cancel();
        if (state.sync.localPending || state.sync.fileConflicts.length || state.driveReview || state.sync.conflict) {
          showProjectSyncReview();
          return false;
        }
      }
    }
    return stillCurrent();
  } finally { ui.departurePending = false; }
}

async function stageLocalProjectSwitch(projectId, { trigger = null, replaceUrl = false, prefix = "Opened", confirmTeamExit = true, departureApproved = false, preparedProject = null } = {}) {
  const ui = state.projects;
  const target = registryProjectById(ui?.registry, projectId);
  if (!ui || !target || target.provider === "server" || target.archivedAt || ui.busy) return false;
  if (state.dataBusy || state.team.mutationBusy) {
    ui.error = "Wait for the current save or sync to finish before switching projects.";
    ui.surface = "switcher";
    if (replaceUrl) pushViewUrl(true);
    render();
    return false;
  }
  if (!state.team.active && target.id === ui.registry.activeProjectId) {
    closeProjectSwitcher();
    return true;
  }
  if (!departureApproved && !await approveProjectDeparture({ replaceUrl })) return false;
  let prepared;
  ui.busy = true;
  render();
  try { prepared = preparedProject || await prepareLocalProject(target); }
  catch (error) {
    ui.busy = false;
    ui.error = `${target.name} could not be opened. ${error.message}`;
    ui.surface = "switcher";
    if (replaceUrl) pushViewUrl(true);
    render();
    return false;
  }
  ui.busy = false;
  if (state.team.active && confirmTeamExit) {
    const returnFocusId = ui.returnFocusId || "projectSwitcherButton";
    ui.surface = "closed";
    render();
    const confirmed = await requestDataConfirmation({
      title: "Leave team project?",
      description: `PM OS will close ${state.team.workspace?.name || "the Team workspace"} and open ${target.name}. Team data will not be copied.`,
      confirmLabel: "Open Local Project",
      trigger: document.querySelector(`#${cssEscape(returnFocusId)}`) || trigger
    });
    if (!confirmed) {
      ui.surface = "switcher";
      render();
      document.querySelector(`[data-switch-project="${cssEscape(target.id)}"]`)?.focus();
      return false;
    }
  }
  ui.pendingProjectId = target.id;
  ui.busy = true;
  ui.error = "";
  ui.status = `Opening ${target.name}…`;
  if (!replaceUrl) ui.surface = "switcher";
  render();
  try {
    projectRegistry = await prepared.writeScope.run(["pm-os-staging.projects.v1", ...Object.values(prepared.keys)], () => {
      if (prepared.cacheWorkspaceRaw) {
        if (prepared.previousWorkspaceRaw) storeWorkspaceSnapshot(localStorage, prepared.keys.backups, prepared.recovery.snapshots, prepared.previousWorkspaceRaw, backupReasons.import);
        localStorage.setItem(prepared.keys.workspace, prepared.cacheWorkspaceRaw);
        localStorage.setItem(prepared.keys.sync, serializeSync(prepared.sync));
        prepared.recovery = loadWorkspaceSnapshots(localStorage, prepared.keys.backups);
      }
      return activateProjectRegistryEntry(localStorage, ui.registry, target.id, captureRegisteredProjectLocation());
    });
    if (state.team.active) await closeTeamWorkspace("Closed the Team project. Its data was not copied.", { forProjectSwitch: true });
    ui.registry = projectRegistry;
    applyPreparedLocalProject(prepared, activeRegistryProject(projectRegistry));
    ui.pendingProjectId = "";
    ui.busy = false;
    ui.query = "";
    ui.surface = "closed";
    ui.status = `${prefix} ${target.name}.`;
    ui.error = "";
    pushViewUrl(replaceUrl);
    render();
    document.querySelector("#viewTitle")?.focus();
    return true;
  } catch (error) {
    ui.busy = false;
    ui.status = "";
    ui.error = `${target.name} could not be opened. ${error?.message || "The current project remains active."}`;
    ui.surface = "switcher";
    ui.pendingProjectId = "";
    if (replaceUrl) pushViewUrl(true);
    render();
    document.querySelector(`[data-switch-project="${cssEscape(target.id)}"]`)?.focus();
    return false;
  }
}

async function switchToServerProject(event) {
  await stageServerProjectSwitch(event.currentTarget.dataset.switchServerProject, { trigger: event.currentTarget });
}

async function stageServerProjectSwitch(projectId, { trigger = null, replaceUrl = false } = {}) {
  const ui = state.projects;
  const project = registryProjectById(ui?.registry, projectId);
  if (!ui || !project || project.provider !== "server" || project.archivedAt || ui.busy) return false;
  if (state.team.active && state.team.projectId === project.id) { closeProjectSwitcher(); return true; }
  if (!await approveProjectDeparture({ replaceUrl })) return false;
  const connector = serverConnectorPool?.connector(project.connectorId);
  if (!connector) {
    markConnectorProjects(project.connectorId, "sign-in-required");
    ui.error = "This project's server connection is not available on this device.";
    ui.surface = "switcher";
    if (replaceUrl) pushViewUrl(true);
    render();
    return false;
  }
  ui.busy = true;
  ui.pendingProjectId = project.id;
  ui.error = "";
  ui.status = `Checking ${project.name}…`;
  render();
  try {
    const client = serverConnectorPool.clientFor(connector.id);
    const config = serverConnectorClientConfig(connector);
    const capabilities = await client.checkCapabilities(config);
    const auth = await client.getAuthState();
    if (auth?.status !== "authenticated" || !auth.user) {
      markConnectorProjects(connector.id, "sign-in-required");
      ui.busy = false;
      ui.pendingProjectId = "";
      ui.serverGate = {
        intent: "switch", projectId: project.id, projectName: project.name, connectorId: connector.id,
        connectorLabel: connector.label, authMode: connector.authMode, allowEmailCode: capabilities.emailInvitations === true, allowLocalAccount: connector.mode === "personal-local", codeSent: false, email: ""
      };
      ui.surface = "server-auth";
      ui.status = "";
      if (replaceUrl) pushViewUrl(true);
      render();
      return false;
    }
    const listed = await client.teamService.listWorkspaces();
    const workspaces = collectionFrom(listed, "workspaces").map(normalizeTeamWorkspace);
    const workspace = workspaces.find((entry) => entry.id === project.workspaceId);
    if (!workspace) throw new Error("Your account is not authorized for this workspace.");
    const opened = await openTeamWorkspaceById(workspace.id, trigger, {
      skipConfirmation: true, departureChecked: true, client, connector, capabilities, workspace, serverProject: project, replaceUrl
    });
    ui.busy = false;
    ui.pendingProjectId = "";
    if (!opened) throw new Error(state.team.status || "The server project could not be opened.");
    render();
    return true;
  } catch (error) {
    ui.busy = false;
    ui.pendingProjectId = "";
    ui.error = safeTeamError(error, error?.message || "The server project could not be opened.");
    ui.surface = "switcher";
    ui.status = "";
    if (replaceUrl) pushViewUrl(true);
    render();
    return false;
  }
}

async function prepareLocalProject(target, { requestPermission = true } = {}) {
  const bundle = readProjectBundle(localStorage, target.id);
  const writeScope = createStorageWriteScope(localStorage, [bundle.keys.workspace, bundle.keys.activity, bundle.keys.sync, bundle.keys.source], { values: ["workspace", "activity", "sync", "source"].map(name => ({ key: bundle.keys[name], value: bundle[name] ?? null })) });
  let rawWorkspace = bundle.workspace || encodeWorkspaceDocument(createEmptyWorkspaceDocument());
  let workspace = importPortableWorkspace(rawWorkspace);
  const source = bundle.source ? loadSourceFromKey(bundle.keys.source) : sourceForProjectProvider(target.provider);
  const sync = bundle.sync ? loadSyncFromKey(bundle.keys.sync) : defaultSyncState();
  const recovery = loadWorkspaceSnapshots(localStorage, bundle.keys.backups);
  let linkedFile = { handle: null, name: "", permission: "unknown", lastModified: 0, status: "" };
  let cacheWorkspaceRaw = "";
  if (target.provider === "local-file") {
    if (!linkedFileSupported(globalThis)) throw new Error("Linked workspace files are unavailable in this browser.");
    const handle = await loadLinkedFileHandle(target.id);
    if (!handle) throw new Error("Choose the linked file again before opening this project.");
    let permission = await queryLinkedFilePermission(handle);
    if (permission === "prompt" && requestPermission) permission = await requestLinkedFilePermission(handle);
    if (permission !== "granted") throw new Error("Linked file permission was not granted; the current project remains open.");
    const file = await readLinkedWorkspaceFile(handle);
    const remoteWorkspace = importPortableWorkspace(file.text);
    if (!bundle.workspace || (!sync.localPending && !sync.fileConflicts.length)) {
      workspace = remoteWorkspace;
      rawWorkspace = file.text;
      cacheWorkspaceRaw = file.text;
      sync.fileBaselineDocument = mergeReadyDocument(JSON.parse(file.text));
      sync.fileLastModified = file.lastModified;
    }
    linkedFile = { handle, name: file.name, permission, lastModified: file.lastModified, status: "ready" };
  }
  return { project: target, writeScope, keys: bundle.keys, workspace, rawWorkspace, cacheWorkspaceRaw, previousWorkspaceRaw: bundle.workspace, source, sync, recovery, linkedFile };
}

function sourceForProjectProvider(provider) {
  if (provider === "local-file") return { ...defaultSource(), type: "local-file", fileName: "pm-os-workspace.json" };
  if (provider === "google-drive") return { ...defaultSource(), type: "google-drive", folderName: "PM OS", fileName: "pm-os-workspace.json", fileId: "" };
  return defaultSource();
}

function applyPreparedLocalProject(prepared, target) {
  window.clearTimeout(linkedFileWriteTimer);
  window.clearTimeout(automaticDriveTimer);
  activeProjectStorageKeys = prepared.keys;
  storageKey = prepared.keys.workspace;
  activityKey = prepared.keys.activity;
  sourceKey = prepared.keys.source;
  syncKey = prepared.keys.sync;
  backupKey = prepared.keys.backups;
  cachedOperationalWorkspaceRaw = undefined;
  cachedOperationalWorkspaceResult = undefined;
  applyTeamSnapshot({ ...prepared.workspace, activity: prepared.workspace.activity || [] });
  rememberLocalWorkspaceRead(prepared.writeScope.values());
  resetWorkspaceUiState();
  state.source = prepared.source;
  state.sourceSelection = sourceSelectionFor(prepared.source);
  state.sync = prepared.sync;
  state.backups = prepared.recovery.snapshots;
  state.linkedFile = prepared.linkedFile;
  state.driveToken = "";
  state.driveReview = null;
  restoreProjectLocation(target.location);
  state.syncStatus = target.provider === "google-drive"
    ? "Reconnect Google Drive for this session; the cached project is open."
    : target.provider === "local-file" ? `Linked ${prepared.linkedFile.name}.` : "Browser storage is active.";
  state.dataStatus = prepared.recovery.error || (prepared.recovery.ignoredCount ? `Ignored ${prepared.recovery.ignoredCount} malformed recovery snapshots.` : `${target.name} is open.`);
}

async function switchToTeamProject(event) {
  const workspaceId = event.currentTarget.dataset.switchTeamProject;
  const ui = state.projects;
  if (!ui || !workspaceId) return;
  ui.surface = "closed";
  render();
  await openTeamWorkspaceById(workspaceId, document.querySelector(`#${cssEscape(ui.returnFocusId)}`));
}

function openProjectWizard() {
  const ui = state.projects;
  if (!ui?.persistent) return;
  ui.surface = "wizard";
  const drive = normalizeDriveRuntimeConfig(globalThis.PM_OS_DRIVE_CONFIG);
  ui.wizard = newProjectWizardState({
    managedConfig: resolveBackendRuntimeConfig(globalThis),
    driveClientId: drive?.clientId || (state.source.type === "google-drive" ? state.source.clientId : ""),
    drivePickerAvailable: Boolean(drive?.pickerApiKey && drive?.appId)
  });
  render();
}

function updateProjectWizardChoice(event) {
  const ui = state.projects;
  if (!ui) return;
  captureServerWizardFields();
  ui.wizard[event.currentTarget.name] = event.currentTarget.value;
  if (ui.wizard.firstRun) {
    ui.wizard.onboarding = ui.wizard.entryMode === "blank" ? "blank" : "guided";
    if (event.currentTarget.name === "entryMode" || event.currentTarget.name === "provider") {
      ui.wizard.sourceAction = ui.wizard.entryMode === "import" ? "existing" : "create";
      ui.wizard.serverAction = ui.wizard.entryMode === "import" ? "existing" : "create";
    }
  }
  if (projectWizardConnection(ui)?.allowWorkspaceCreation === false) ui.wizard.serverAction = "existing";
  const selector = `[name="${cssEscape(event.currentTarget.name)}"][value="${cssEscape(event.currentTarget.value)}"]`;
  render();
  queueMicrotask(() => document.querySelector(selector)?.focus());
}

function captureServerWizardFields() {
  const wizard = state.projects?.wizard;
  if (!wizard) return;
  const value = (id, fallback = "") => document.querySelector(`#${id}`)?.value ?? fallback;
  const previousConnectorId = wizard.connectorId;
  wizard.connectorId = value("serverConnectorChoice", wizard.connectorId);
  if (previousConnectorId !== wizard.connectorId) {
    wizard.serverWorkspaceId = "";
    wizard.serverWorkspaces = [];
    wizard.createAttemptId = "";
    wizard.createdServerWorkspaceId = "";
  }
  if (projectWizardConnection(state.projects)?.allowWorkspaceCreation === false) wizard.serverAction = "existing";
  wizard.connectorMode = value("serverConnectorMode", wizard.connectorMode);
  wizard.connectorAuthMode = value("serverConnectorAuthMode", wizard.connectorAuthMode) === "password" ? "password" : "otp";
  wizard.connectorLabel = value("serverConnectorLabel", wizard.connectorLabel);
  wizard.connectorUrl = value("serverConnectorUrl", wizard.connectorUrl);
  wizard.connectorKey = value("serverConnectorKey", wizard.connectorKey);
  if (previousConnectorId === wizard.connectorId) wizard.serverWorkspaceId = value("serverWorkspaceChoice", wizard.serverWorkspaceId);
  const persist = document.querySelector("#serverPersistSession");
  if (persist) wizard.persistSession = persist.checked;
  wizard.driveClientId = value("projectDriveClientId", wizard.driveClientId);
  wizard.driveFileLink = value("projectDriveFileLink", wizard.driveFileLink);
  wizard.driveFolderName = value("projectDriveFolderName", wizard.driveFolderName);
}

async function advanceProjectWizard(event) {
  event.preventDefault();
  const ui = state.projects;
  if (!ui || ui.busy) return;
  if (ui.wizard.firstRun && ui.wizard.step === 3) {
    finishOnboarding(ui.wizard.readyCanCreate);
    return;
  }
  if (ui.wizard.step === 1) {
    const name = String(new FormData(event.currentTarget).get("name") || ui.wizard.name).trim();
    if (!name) {
      ui.wizard.error = "Enter a project name to continue.";
      render();
      document.querySelector("#projectName")?.focus();
      return;
    }
    ui.wizard.name = name;
    ui.wizard.step = 2;
    ui.wizard.error = "";
    render();
    return;
  }
  await createProductionProject();
}

function stepBackProjectWizard() {
  const ui = state.projects;
  if (!ui || ui.busy) return;
  if (ui.wizard.firstRun && ui.wizard.step === 3) { finishOnboarding(false); return; }
  if (ui.wizard.step === 1) ui.surface = "switcher";
  else ui.wizard.step -= 1;
  ui.wizard.error = "";
  render();
}

function onboardingExperience(wizard, current = { version: 1, enabledCapabilities: [] }) {
  return wizard.presetId === "custom"
    ? normalizeWorkspaceExperience({ version: current.version + 1, enabledCapabilities: wizard.customCapabilities })
    : workspaceExperienceForPreset(wizard.presetId, current);
}

async function readOnboardingImport(event) {
  const ui = state.projects;
  const wizard = ui?.wizard;
  const file = event.currentTarget.files?.[0];
  if (!wizard?.firstRun || !file || ui.busy) return;
  ui.busy = true;
  wizard.importDocument = null;
  wizard.importName = "";
  wizard.error = "";
  render();
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error("Choose a workspace backup smaller than 10 MB.");
    const imported = decodeWorkspaceDocument(JSON.parse(await file.text()));
    if (state.projects?.wizard !== wizard) return;
    wizard.importDocument = imported;
    wizard.importName = file.name;
  } catch (error) {
    if (state.projects?.wizard !== wizard) return;
    wizard.error = `This backup could not be opened. ${error?.message || "Choose a valid PM OS JSON backup."}`;
  } finally {
    if (state.projects?.wizard === wizard) {
      ui.busy = false;
      render();
      document.querySelector("#onboardingImportFile")?.focus();
    }
  }
}

function showOnboardingReady(wizard) {
  const preferenceSaved = saveWorkspaceModePreference("operation");
  state.modeChoiceOpen = false;
  state.storageChoiceOpen = false;
  wizard.step = 3;
  wizard.readyCanCreate = !state.team.active || ["owner", "editor"].includes(state.team.role);
  const name = currentProjectDescriptor(state.projects, state.team).name;
  const storage = state.team.active ? "saved on the Team server" : state.source.type === "google-drive"
    ? "saved in its Google Drive file" : state.source.type === "local-file" ? "saved in its linked workspace file" : "saved in this browser on this device";
  wizard.readySummary = `${name} is ${storage}. ${state.items.length} initiative${state.items.length === 1 ? "" : "s"} ready.`;
  wizard.readySharing = state.team.active
    ? "Team members share this workspace. Owners manage invitations and access in Settings → Data & backup."
    : "This workspace is not shared with a Team. You can download backups in Settings → Data & backup. For shared work, open a Team workspace from the project switcher.";
  wizard.error = preferenceSaved ? "" : "Your workspace is open, but this browser could not remember that setup is complete. Keep a backup before closing it.";
  state.projects.wizard = wizard;
  state.projects.surface = "wizard";
  render();
}

function finishOnboarding(createFirstInitiative) {
  state.projects.wizard.importDocument = null;
  state.projects.wizard.firstRun = false;
  state.projects.surface = "closed";
  render();
  if (createFirstInitiative) openInitiativeEditor("new", document.querySelector("#newInitiativeButton"));
  else focusAfterRender("viewTitle");
}

async function createProductionProject() {
  const ui = state.projects;
  const wizard = ui.wizard;
  captureServerWizardFields();
  if (wizard.provider === "server") {
    await createServerProjectFromWizard();
    return;
  }
  const projectId = `project-${globalThis.crypto?.randomUUID?.().toLowerCase() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`.slice(0, 80);
  let workspaceDocument = createEmptyWorkspaceDocument();
  let workspaceRaw = encodeWorkspaceDocument(workspaceDocument);
  let source = sourceForProjectProvider(wizard.provider);
  let sync = defaultSyncState();
  let handle = null;
  let driveToken = "";
  let externalReady = false;
  let registered = false;
  ui.busy = true;
  wizard.error = "";
  render();
  try {
    if (!wizard.name.trim() || wizard.name.length > 160) throw new Error("Enter a project name between 1 and 160 characters.");
    if (wizard.firstRun && wizard.entryMode === "template") {
      workspaceDocument = decodeWorkspaceDocument({ ...workspaceDocument, experience: onboardingExperience(wizard) });
      workspaceRaw = encodeWorkspaceDocument(workspaceDocument);
    }
    if (wizard.firstRun && wizard.provider === "browser" && wizard.entryMode === "import") {
      if (!wizard.importDocument) throw new Error("Choose a valid PM OS JSON backup before opening this workspace.");
      workspaceDocument = decodeWorkspaceDocument(wizard.importDocument);
      workspaceRaw = encodeWorkspaceDocument(workspaceDocument);
    }
    if (wizard.provider === "local-file") {
      handle = wizard.sourceAction === "existing"
        ? await openLinkedWorkspaceFile(globalThis, { storeHandle: false })
        : await createLinkedWorkspaceFile(globalThis, `${safeFileName(wizard.name)}.json`, { storeHandle: false });
      if (wizard.sourceAction === "existing") {
        let permission = await queryLinkedFilePermission(handle);
        if (permission === "prompt") permission = await requestLinkedFilePermission(handle);
        if (permission !== "granted") throw new Error("Allow access to the selected file before opening this project.");
      } else await writeLinkedWorkspaceFile(handle, workspaceRaw);
      const file = await readLinkedWorkspaceFile(handle);
      workspaceDocument = decodeWorkspaceDocument(JSON.parse(file.text));
      workspaceRaw = encodeWorkspaceDocument(workspaceDocument);
      source = { ...source, type: "local-file", fileName: file.name };
      sync = { ...sync, fileLastModified: file.lastModified, fileBaselineDocument: mergeReadyDocument(JSON.parse(workspaceRaw)) };
      externalReady = true;
      await storeLinkedFileHandle(projectId, handle);
    } else if (wizard.provider === "google-drive") {
      const clientId = wizard.driveClientId.trim();
      if (!clientId) throw new Error("Configure the Google client ID in connection settings before connecting this project.");
      const fileId = wizard.sourceAction === "existing" && wizard.driveFileLink.trim() ? driveWorkspaceFileId(wizard.driveFileLink) : "";
      const runtime = normalizeDriveRuntimeConfig(globalThis.PM_OS_DRIVE_CONFIG);
      if (wizard.sourceAction === "existing" && !fileId && !wizard.drivePickerAvailable) throw new Error("Paste the Drive workspace file link before continuing.");
      if (wizard.sourceAction === "create" && !wizard.driveFolderName.trim()) throw new Error("Enter the Drive folder for the new workspace file.");
      driveToken = await requestDriveAccessToken(clientId);
      source = { ...source, type: "google-drive", clientId, folderName: wizard.driveFolderName.trim(), fileName: `${safeFileName(wizard.name)}.json`, fileId };
      if (wizard.sourceAction === "existing" && !fileId) {
        const selected = await chooseDriveWorkspaceFile({ ...runtime, clientId }, driveToken);
        if (!selected) throw new DOMException("File selection cancelled.", "AbortError");
        source.fileId = selected.id;
        source.fileName = selected.name;
      } else if (wizard.sourceAction === "create") {
        const saved = await saveDriveWorkspace(source, driveToken, workspaceRaw);
        source.fileId = saved.id;
        wizard.driveFileLink = saved.id;
        externalReady = true;
      }
      const remote = await readDriveWorkspace(source, driveToken);
      if (!remote?.file?.id) throw new Error("The selected Drive workspace file was not returned.");
      workspaceDocument = decodeWorkspaceDocument(JSON.parse(remote.content));
      workspaceRaw = encodeWorkspaceDocument(workspaceDocument);
      source = { ...source, fileId: remote.file.id, fileName: remote.file.name || source.fileName };
      wizard.driveFileLink = source.fileId;
      sync = { ...advanceDriveBaseline(sync, remote.file, "pull"), baseDocument: mergeReadyDocument(JSON.parse(workspaceRaw)) };
      externalReady = true;
    }
    const bundle = {
      workspace: workspaceRaw,
      activity: JSON.stringify({ activity: workspaceDocument.activity || [] }),
      source: JSON.stringify(normalizeWorkspaceSource(source)),
      sync: serializeSync(sync),
      backups: JSON.stringify([])
    };
    const created = createRegistryProject(localStorage, ui.registry, {
      id: projectId, name: wizard.name, provider: wizard.provider,
      onboarding: wizard.provider === "browser" || wizard.sourceAction === "create" ? wizard.onboarding : "guided",
      location: { space: "today", mode: "focus" }
    }, bundle);
    registered = true;
    projectRegistry = created.registry;
    ui.registry = created.registry;
    ui.busy = false;
    ui.surface = "switcher";
    const opened = await stageLocalProjectSwitch(created.project.id, { prefix: "Created and opened" });
    if (opened && wizard.provider === "google-drive" && ui.registry.activeProjectId === created.project.id) {
      state.driveToken = driveToken;
      state.syncStatus = "Connected to Google Drive for this session. The workspace file is ready.";
      render();
    }
    if (opened && wizard.firstRun) showOnboardingReady(wizard);
  } catch (error) {
    if (handle && !registered) await clearLinkedFileHandle(projectId).catch(() => undefined);
    ui.busy = false;
    ui.surface = "wizard";
    if (!registered && externalReady) {
      wizard.sourceAction = "existing";
      wizard.error = `The source file is ready, but the project could not be added. Open that existing file to retry. ${error?.message || ""}`;
    } else if (wizard.provider === "google-drive" && wizard.sourceAction === "create" && error?.code === "DRIVE_CONFLICT" && error.remote?.id) {
      wizard.driveFileLink = error.remote.id;
      wizard.error = "A workspace file with this name already exists. Choose Open existing file to use it, or change the project name. Its contents were not changed.";
    } else wizard.error = error?.name === "AbortError" ? "File selection was cancelled. No project was added." : error?.message || "The project could not be created.";
    render();
    document.querySelector("#projectWizardContinueButton")?.focus();
  }
}

async function createServerProjectFromWizard() {
  const ui = state.projects;
  const wizard = ui.wizard;
  ui.busy = true;
  ui.wizard.error = "";
  render();
  try {
    const managed = wizard.connectorId === "__managed__" ? wizard.managedConfig : null;
    if (wizard.connectorId === "__managed__" && !managed) throw new Error("The configured server is unavailable. Choose another connection.");
    let connector = managed ? serverConnectorPool.registry.connectors.find(entry =>
      entry.url === managed.url && entry.publishableKey === managed.publishableKey && entry.mode === managed.mode
      && entry.authMode === managed.authMode && entry.persistSession === managed.persistSession
      && entry.allowWorkspaceCreation === managed.allowWorkspaceCreation)
      : wizard.connectorId ? serverConnectorPool.connector(wizard.connectorId) : null;
    if (!connector && wizard.connectorId && !managed) throw new Error("This saved connection is unavailable. Choose another connection.");
    if (!connector) {
      connector = serverConnectorPool.register({
        id: `server-${globalThis.crypto?.randomUUID?.().toLowerCase() || Date.now().toString(36)}`.slice(0, 80),
        label: wizard.connectorLabel, mode: wizard.connectorMode, url: wizard.connectorUrl,
        publishableKey: wizard.connectorKey, persistSession: wizard.persistSession,
        authMode: wizard.connectorMode === "remote" ? wizard.connectorAuthMode : "password", allowWorkspaceCreation: true,
        ...(managed || {})
      });
    }
    wizard.connectorId = connector.id;
    ui.connectors = serverConnectorPool.registry.connectors;
    const client = serverConnectorPool.clientFor(connector.id);
    const capabilities = await client.checkCapabilities(serverConnectorClientConfig(connector));
    const auth = await client.getAuthState();
    if (auth?.status !== "authenticated" || !auth.user) {
      ui.busy = false;
      ui.serverGate = {
        intent: "create", projectName: wizard.name, connectorId: connector.id, connectorLabel: connector.label,
        authMode: connector.authMode, allowEmailCode: capabilities.emailInvitations === true, allowLocalAccount: connector.mode === "personal-local", codeSent: false, email: ""
      };
      ui.surface = "server-auth";
      render();
      return;
    }
    const listed = collectionFrom(await client.teamService.listWorkspaces(), "workspaces").map(normalizeTeamWorkspace);
    let workspace;
    if (wizard.createdServerWorkspaceId) {
      workspace = listed.find(entry => entry.id === wizard.createdServerWorkspaceId);
      if (!workspace) throw new Error("The new Team workspace could not be reopened. Check your connection before retrying.");
    } else if (wizard.serverAction === "existing") {
      wizard.serverWorkspaces = listed;
      workspace = listed.find((entry) => entry.id === wizard.serverWorkspaceId);
      if (!workspace) {
        ui.busy = false;
        ui.surface = "wizard";
        wizard.error = listed.length ? "Choose a workspace to continue." : "No authorized workspaces are available on this connection.";
        render();
        return;
      }
    } else {
      if (capabilities?.workspaceLifecycle !== true || capabilities?.allowWorkspaceCreation === false || connector.allowWorkspaceCreation === false) {
        throw new Error("This server does not allow workspace creation.");
      }
      if (!wizard.createAttemptId) wizard.createAttemptId = teamCreateAttemptId("project");
      try {
        const result = await client.teamService.createWorkspace({
          name: wizard.name, templateId: wizard.onboarding === "blank" ? "blank" : "focused", createAttemptId: wizard.createAttemptId
        });
        const response = result?.workspace || result;
        workspace = normalizeTeamWorkspace({
          ...response,
          id: response?.id || response?.workspaceId || response?.workspace_id,
          name: response?.name || wizard.name,
          role: response?.role || "owner",
          revision: response?.revision
        });
        if (!workspace.id) {
          const refreshed = collectionFrom(await client.teamService.listWorkspaces(), "workspaces").map(normalizeTeamWorkspace);
          workspace = refreshed.find((entry) => entry.name === wizard.name);
        }
        wizard.createAttemptId = "";
      } catch (error) {
        if (!isAmbiguousTeamError(error)) wizard.createAttemptId = "";
        throw error;
      }
    }
    if (!workspace?.id) throw new Error("The server workspace was not returned.");
    if (wizard.firstRun && wizard.serverAction === "create") {
      wizard.createdServerWorkspaceId = workspace.id;
      if (wizard.entryMode === "template") {
        const repository = client.repositoryFor(workspace.id);
        const opened = await repository.open();
        const next = onboardingExperience(wizard, opened.snapshot.experience);
        if (JSON.stringify(next.enabledCapabilities) !== JSON.stringify(opened.snapshot.experience.enabledCapabilities)) {
          await repository.updateExperience(next, opened.snapshot.experience.version);
        }
      }
    }
    const projectId = `project-${globalThis.crypto?.randomUUID?.().toLowerCase() || Date.now().toString(36)}`.slice(0, 80);
    const created = createRegistryProject(localStorage, ui.registry, {
      id: projectId, name: workspace.name || wizard.name, provider: "server",
      onboarding: wizard.serverAction === "create" ? wizard.onboarding : "guided",
      connectorId: connector.id, workspaceId: workspace.id, serverRole: workspace.role || "viewer",
      serverRevision: workspace.revision || 0, serverStatus: "available", location: { space: "today", mode: "focus" }
    }, {});
    projectRegistry = created.registry;
    ui.registry = created.registry;
    ui.busy = false;
    ui.surface = "switcher";
    const opened = await stageServerProjectSwitch(created.project.id);
    if (opened && wizard.firstRun) showOnboardingReady(wizard);
  } catch (error) {
    ui.busy = false;
    ui.surface = "wizard";
    wizard.error = safeTeamError(error, error?.message || "The server project could not be created.");
    render();
  }
}

async function submitServerProjectAuth(event) {
  event.preventDefault();
  const ui = state.projects;
  const gate = ui?.serverGate;
  const connector = gate && serverConnectorPool?.connector(gate.connectorId);
  if (!ui || !gate || !connector || ui.busy) return;
  const form = new FormData(event.currentTarget);
  const createAccount = event.submitter?.value === "create-local-account";
  const email = String(form.get("email") || gate.email || "").trim();
  if (!email) return;
  gate.email = email;
  ui.busy = true;
  ui.error = "";
  render();
  let passwordSignInPending = false;
  try {
    const client = serverConnectorPool.clientFor(connector.id);
    if (gate.authMode === "password") {
      if (createAccount && connector.mode !== "personal-local") throw new Error("Account creation is available only on your local server.");
      const password = String(form.get("password") || "");
      if (!email.includes("@") || password.length < 8) throw new Error("Enter an email address and a password of at least eight characters.");
      passwordSignInPending = !createAccount;
      const auth = createAccount
        ? await client.signUpWithPassword(email, password)
        : await client.signInWithPassword(email, password);
      if (auth?.status !== "authenticated" && !auth?.user) throw { code: "AUTH_REQUIRED" };
      passwordSignInPending = false;
    } else if (!gate.codeSent) {
      await client.sendOtp(email);
      gate.codeSent = true;
      ui.busy = false;
      ui.surface = "server-auth";
      render();
      return;
    } else {
      const code = String(form.get("code") || "").trim();
      if (!/^[0-9]{6}$/.test(code)) throw new Error("Enter the six-digit sign-in code.");
      const auth = await client.verifyOtp(email, code);
      if (auth?.status !== "authenticated" && !auth?.user) throw { code: "AUTH_REQUIRED" };
    }
    markConnectorProjects(connector.id, "available");
    ui.busy = false;
    ui.serverGate = null;
    if (gate.intent === "create") {
      ui.surface = "wizard";
      await createServerProjectFromWizard();
    } else {
      ui.surface = "switcher";
      await stageServerProjectSwitch(gate.projectId, { replaceUrl: true });
    }
  } catch (error) {
    ui.busy = false;
    ui.error = safeTeamError(error, passwordSignInPending ? "Sign-in could not be completed. Please try again." : error?.message || "Sign-in could not be completed.", { passwordSignIn: passwordSignInPending });
    ui.surface = "server-auth";
    render();
  }
}

function cancelServerProjectAuth() {
  const ui = state.projects;
  if (!ui) return;
  const creating = ui.serverGate?.intent === "create";
  ui.serverGate = null;
  ui.error = "";
  ui.surface = creating ? "wizard" : "switcher";
  render();
}

async function signOutServerConnector(event) {
  await changeServerConnectorSession(event.currentTarget.dataset.signoutConnector, false);
}

async function removeServerConnectorFromUi(event) {
  await changeServerConnectorSession(event.currentTarget.dataset.removeConnector, true);
}

async function changeServerConnectorSession(connectorId, remove) {
  const ui = state.projects;
  if (!ui || ui.connectorBusyId) return;
  ui.catalogGeneration = (ui.catalogGeneration || 0) + 1;
  ui.connectorBusyId = connectorId;
  ui.error = "";
  render();
  try {
    if (state.team.active && state.team.connectorId === connectorId) {
      await closeTeamWorkspace("The server project was closed. Your saved browser project is open.");
    }
    if (remove) await serverConnectorPool.remove(connectorId);
    else await serverConnectorPool.signOut(connectorId);
    markConnectorProjects(connectorId, "sign-in-required");
    ui.connectors = serverConnectorPool.registry.connectors;
    ui.status = remove ? "Removed the server connection from this device." : "Signed out of that server connection.";
  } catch (error) {
    ui.error = error?.message || "The server connection could not be updated.";
  }
  ui.connectorBusyId = "";
  ui.surface = "manage";
  render();
}

function markConnectorProjects(connectorId, serverStatus) {
  const ui = state.projects;
  if (!ui) return;
  let next = ui.registry;
  for (const project of projectsForConnector(next, connectorId)) {
    next = updateProjectMetadata(localStorage, next, project.id, { serverStatus });
  }
  projectRegistry = next;
  ui.registry = next;
}

function safeFileName(value) {
  return String(value || "pm-os-workspace").trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, "-").replace(/\s+/g, "-").slice(0, 96) || "pm-os-workspace";
}

function openTeamProjectSetup() {
  if (!state.projects) return;
  state.projects.surface = "closed";
  navigateToView("settings", "content", "data");
}

function openRenameProject(event) {
  const ui = state.projects;
  ui.renameProjectId = event.currentTarget.dataset.renameProject;
  ui.surface = "rename";
  ui.error = "";
  render();
}

async function submitRenameProject(event) {
  event.preventDefault();
  const ui = state.projects;
  if (!ui || ui.busy) return;
  try {
    const { registry: currentRegistry, project, name, unchanged } = prepareProjectRename(localStorage, ui.registry, ui.renameProjectId, new FormData(event.currentTarget).get("name"));
    if (project.provider === "server" && project.serverRole !== "owner") throw new Error("Only an owner can rename this server project.");
    if (unchanged) {
      projectRegistry = currentRegistry;
      ui.registry = currentRegistry;
      ui.status = "Project name unchanged.";
      ui.error = "";
      ui.surface = "manage";
      ui.renameProjectId = "";
      ui.renameMutationId = "";
      render();
      document.querySelector("#backToProjectSwitcherButton")?.focus();
      return;
    }
    if (project?.provider === "server") {
      const connector = serverConnectorPool.connector(project.connectorId);
      if (!connector) throw new Error("Reconnect this server project before renaming it.");
      const client = serverConnectorPool.clientFor(connector.id);
      const auth = await client.getAuthState();
      if (auth?.status !== "authenticated" || !auth.user) throw new Error("Sign in to this connection before renaming the project.");
      const capabilities = await client.checkCapabilities(serverConnectorClientConfig(connector));
      if (capabilities?.workspaceLifecycle !== true) throw new Error("This server does not support project rename.");
      if (!ui.renameMutationId) ui.renameMutationId = teamCreateAttemptId("rename");
      ui.busy = true;
      render();
      try {
        const result = await client.teamService.renameWorkspace({
          workspaceId: project.workspaceId, name, expectedRevision: project.serverRevision, mutationId: ui.renameMutationId
        });
        const response = result?.workspace || result;
        const renamed = normalizeTeamWorkspace({
          ...response,
          id: response?.id || response?.workspaceId || project.workspaceId,
          name: response?.name || name,
          role: response?.role || project.serverRole,
          revision: response?.revision
        });
        projectRegistry = updateProjectMetadata(localStorage, ui.registry, project.id, {
          name: renamed.name || name, serverRevision: renamed.revision || project.serverRevision + 1, serverStatus: "available"
        });
        ui.renameMutationId = "";
        if (state.team.projectId === project.id) {
          state.team.workspace = { ...state.team.workspace, name: renamed.name || name, revision: renamed.revision || project.serverRevision + 1 };
        }
      } catch (error) {
        if (!isAmbiguousTeamError(error)) ui.renameMutationId = "";
        throw error;
      } finally {
        ui.busy = false;
      }
    } else {
      projectRegistry = renameRegistryProject(localStorage, ui.registry, ui.renameProjectId, name);
    }
    ui.registry = projectRegistry;
    ui.status = `Renamed the project to ${registryProjectById(projectRegistry, ui.renameProjectId).name}.`;
    ui.error = "";
    ui.surface = "manage";
    ui.renameProjectId = "";
    render();
    document.querySelector("#backToProjectSwitcherButton")?.focus();
  } catch (error) {
    ui.error = error.message;
    render();
    document.querySelector("#renameProjectName")?.focus();
  }
}

function requestProjectArchive(event) {
  state.projects.archiveProjectId = event.currentTarget.dataset.archiveProject;
  state.projects.surface = "confirm-archive";
  render();
}

function cancelProjectArchive() {
  const ui = state.projects;
  if (ui.busy) return;
  const projectId = ui.archiveProjectId;
  ui.archiveProjectId = "";
  ui.surface = "manage";
  render();
  document.querySelector(`[data-archive-project="${cssEscape(projectId)}"]`)?.focus();
}

async function confirmProjectArchive() {
  const ui = state.projects;
  if (!ui || ui.busy || ui.archivePending || state.dataBusy || state.team.mutationBusy) return;
  ui.archivePending = true;
  let createdFallbackId = "";
  try {
    const project = registryProjectById(ui.registry, ui.archiveProjectId);
    if (project.id === ui.registry.activeProjectId) {
      if (!await approveProjectDeparture()) return;
      ui.busy = true;
      render();
      let fallback;
      let prepared;
      for (const candidate of recentProjects(ui.registry).filter((entry) => entry.id !== project.id && entry.provider !== "server")) {
        try {
          prepared = await prepareLocalProject(candidate, { requestPermission: false });
          fallback = candidate;
          break;
        } catch { /* Keep unavailable projects intact and try the next recent local project. */ }
      }
      if (!fallback) {
        const created = createBlankBrowserProject(ui.registry);
        projectRegistry = created.registry;
        ui.registry = projectRegistry;
        fallback = created.project;
        createdFallbackId = fallback.id;
        prepared = await prepareLocalProject(fallback);
      }
      ui.busy = false;
      if (!await stageLocalProjectSwitch(fallback.id, { confirmTeamExit: false, departureApproved: true, preparedProject: prepared })) return;
    }
    projectRegistry = setProjectArchived(localStorage, ui.registry, project.id, true);
    ui.registry = projectRegistry;
    ui.status = `${project.name} is hidden on this device. Its source was not deleted.`;
    ui.archiveProjectId = "";
    ui.surface = "manage";
    render();
    document.querySelector("#backToProjectSwitcherButton")?.focus();
  } catch (error) {
    ui.error = error.message;
    ui.surface = "manage";
    ui.busy = false;
    render();
  } finally {
    ui.busy = false;
    if (createdFallbackId && ui.registry.activeProjectId !== createdFallbackId) {
      try {
        const keys = projectKeys(createdFallbackId);
        projectRegistry = await forgetStorageWriteScope(localStorage, keys.workspace, ["pm-os-staging.projects.v1", ...Object.values(keys)], () => {
          const archived = setProjectArchived(localStorage, ui.registry, createdFallbackId, true);
          return forgetRegistryProject(localStorage, archived, createdFallbackId);
        });
        ui.registry = projectRegistry;
      } catch {
        ui.error = "The archive was cancelled. An unused blank project remains available in Manage projects.";
      }
      render();
    }
    ui.archivePending = false;
  }
}

function createBlankBrowserProject(registry) {
  return createRegistryProject(localStorage, registry, {
    name: "Blank project", provider: "browser", onboarding: "blank", location: { space: "today", mode: "focus" }
  }, { workspace: encodeWorkspaceDocument(createEmptyWorkspaceDocument()), activity: JSON.stringify({ activity: [] }) });
}

function unarchiveProject(event) {
  const ui = state.projects;
  const projectId = event.currentTarget.dataset.unarchiveProject;
  const project = registryProjectById(ui.registry, projectId);
  projectRegistry = setProjectArchived(localStorage, ui.registry, projectId, false);
  ui.registry = projectRegistry;
  ui.status = `${project.name} is available in quick switching again.`;
  render();
  document.querySelector(`[data-archive-project="${cssEscape(projectId)}"]`)?.focus();
}

function openForgetProject(event) {
  const ui = state.projects;
  if (!ui || ui.busy) return;
  ui.deleteRemoteDrive = Boolean(event.currentTarget.dataset.deleteDriveProject);
  ui.deleteProjectId = event.currentTarget.dataset.deleteDriveProject || event.currentTarget.dataset.forgetProject;
  ui.driveDeleteTicket = null;
  ui.driveDeleteToken = "";
  ui.deleteName = "";
  ui.backupDownloaded = false;
  ui.deleteRevision = 0;
  ui.deleteMutationId = "";
  ui.error = "";
  ui.surface = "delete";
  render();
}

function updateForgetProjectName(event) {
  const ui = state.projects;
  ui.deleteName = event.currentTarget.value;
  const cursor = event.currentTarget.selectionStart;
  render();
  const input = document.querySelector("#forgetProjectName");
  input?.focus();
  if (input && Number.isInteger(cursor)) input.setSelectionRange(cursor, cursor);
}

async function downloadProjectBackup() {
  const ui = state.projects;
  if (!ui || ui.busy) return;
  const project = registryProjectById(ui.registry, ui.deleteProjectId);
  if (!project?.archivedAt) return;
  if (ui.deleteRemoteDrive && project.provider === "google-drive") {
    ui.busy = true;
    ui.error = "";
    ui.backupDownloaded = false;
    ui.driveDeleteTicket = null;
    ui.driveDeleteToken = "";
    render();
    try {
      const bundle = readProjectBundle(localStorage, project.id);
      const source = bundle.source ? loadSourceFromKey(bundle.keys.source) : null;
      if (!source?.fileId) throw new Error("This project has no saved Drive file ID. Reopen it and choose its Drive file before deleting.");
      const clientId = source.clientId || normalizeDriveRuntimeConfig(globalThis.PM_OS_DRIVE_CONFIG)?.clientId || "";
      // Use a fresh authorization for this archived source; never reuse the active project's token.
      ui.driveDeleteToken = await requestDriveAccessToken(clientId);
      ui.driveDeleteTicket = await prepareDriveWorkspaceDeletion(source, ui.driveDeleteToken, {
        projectName: project.name,
        startBackup(content, name) {
          downloadFile(content, "application/json", `${safeFileName(name)}-backup-${todayStamp()}.json`);
          return true;
        }
      });
      ui.backupDownloaded = true;
      ui.status = `Downloaded a fresh backup of ${project.name} from Drive.`;
    } catch (error) {
      ui.error = error?.message || "A fresh Drive backup could not be downloaded.";
      ui.driveDeleteToken = "";
    } finally {
      ui.busy = false;
      render();
      document.querySelector(ui.backupDownloaded ? "#forgetProjectName" : "#downloadProjectBackupButton")?.focus();
    }
    return;
  }
  if (project?.provider === "server") {
    ui.busy = true;
    ui.error = "";
    render();
    let repository;
    try {
      const connector = serverConnectorPool.connector(project.connectorId);
      if (!connector) throw new Error("Reconnect this server before deleting its project.");
      const client = serverConnectorPool.clientFor(connector.id);
      const auth = await client.getAuthState();
      if (auth?.status !== "authenticated" || !auth.user) throw new Error("Sign in to download a fresh authorized backup.");
      const capabilities = await client.checkCapabilities(serverConnectorClientConfig(connector));
      if (capabilities?.workspaceLifecycle !== true) throw new Error("This server does not support project deletion.");
      const workspace = collectionFrom(await client.teamService.listWorkspaces(), "workspaces").map(normalizeTeamWorkspace)
        .find((entry) => entry.id === project.workspaceId);
      if (!workspace) throw new Error("Your account is not authorized for this workspace.");
      if (workspace.role !== "owner") throw new Error("Only an owner can delete this server project.");
      repository = client.repositoryFor(project.workspaceId);
      const opened = await repository.open();
      const revision = Number(opened?.revision ?? opened?.snapshot?.revision ?? workspace.revision ?? project.serverRevision);
      if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("The current server revision could not be verified.");
      const content = encodeWorkspaceDocument(opened.snapshot);
      downloadFile(content, "application/json", `${safeFileName(workspace.name)}-backup-${todayStamp()}.json`);
      projectRegistry = updateProjectMetadata(localStorage, ui.registry, project.id, {
        name: workspace.name, serverRole: workspace.role, serverRevision: revision, serverStatus: "available"
      });
      ui.registry = projectRegistry;
      ui.deleteRevision = revision;
      ui.backupDownloaded = true;
      ui.status = `Downloaded a fresh authorized backup of ${workspace.name}.`;
    } catch (error) {
      ui.error = safeTeamError(error, error?.message || "A fresh server backup could not be downloaded.");
      ui.backupDownloaded = false;
    } finally {
      try { await repository?.disconnect?.(); } catch { /* The deletion gate remains closed on cleanup failure. */ }
      ui.busy = false;
      render();
      document.querySelector(ui.backupDownloaded ? "#forgetProjectName" : "#downloadProjectBackupButton")?.focus();
    }
    return;
  }
  const bundle = readProjectBundle(localStorage, project.id);
  const content = bundle.workspace || encodeWorkspaceDocument(createEmptyWorkspaceDocument());
  downloadFile(content, "application/json", `${safeFileName(project.name)}-backup-${todayStamp()}.json`);
  ui.backupDownloaded = true;
  ui.status = `Downloaded a backup of ${project.name}.`;
  render();
  document.querySelector("#forgetProjectName")?.focus();
}

async function confirmForgetProject(event) {
  event.preventDefault();
  const ui = state.projects;
  if (!ui || ui.busy) return;
  const project = registryProjectById(ui.registry, ui.deleteProjectId);
  if (!project?.archivedAt || ui.deleteName !== project.name || !ui.backupDownloaded) return;
  try {
    if (ui.deleteRemoteDrive && project.provider === "google-drive") {
      ui.busy = true;
      ui.error = "";
      render();
      try {
        await deletePreparedDriveWorkspace(ui.driveDeleteTicket, ui.driveDeleteToken, ui.deleteName);
      } finally {
        ui.busy = false;
      }
    }
    if (project.provider === "server") {
      const connector = serverConnectorPool.connector(project.connectorId);
      if (!connector) throw new Error("Reconnect this server before deleting its project.");
      const client = serverConnectorPool.clientFor(connector.id);
      const auth = await client.getAuthState();
      if (auth?.status !== "authenticated" || !auth.user) throw new Error("Sign in again before deleting this server project.");
      if (!ui.deleteMutationId) ui.deleteMutationId = teamCreateAttemptId("delete");
      ui.busy = true;
      render();
      try {
        await client.teamService.deleteWorkspace({
          workspaceId: project.workspaceId, expectedName: project.name,
          expectedRevision: ui.deleteRevision, mutationId: ui.deleteMutationId
        });
        ui.deleteMutationId = "";
      } catch (error) {
        if (!isAmbiguousTeamError(error)) ui.deleteMutationId = "";
        throw error;
      } finally {
        ui.busy = false;
      }
    }
    const forgottenKeys = projectKeys(project.id);
    projectRegistry = await forgetStorageWriteScope(localStorage, forgottenKeys.workspace, ["pm-os-staging.projects.v1", ...Object.values(forgottenKeys)], () => forgetRegistryProject(localStorage, ui.registry, project.id));
    ui.registry = projectRegistry;
    await clearLinkedFileHandle(project.id).catch(() => undefined);
    ui.status = project.provider === "server" ? `Deleted ${project.name} from the server and removed it from this device.`
      : ui.deleteRemoteDrive ? `Deleted ${project.name} from Drive and removed it from this device.`
        : project.provider === "local-file" ? `Forgot local data for ${project.name}. Its linked file remains on disk; delete that original file in your operating system if needed.`
          : `Forgot local data for ${project.name}. No external source was deleted.`;
    ui.driveDeleteTicket = null;
    ui.driveDeleteToken = "";
    ui.deleteProjectId = "";
    ui.surface = "manage";
    render();
    document.querySelector("#backToProjectSwitcherButton")?.focus();
  } catch (error) {
    ui.error = project?.provider === "server"
      ? safeTeamError(error, error?.message || "The server project was not deleted. Its saved project entry remains available.")
      : error.message;
    render();
  }
}

function toggleSprintCalendarFields() {
  const form = document.querySelector("#planningCalendarForm");
  if (!form) return;
  const enabled = [...form.querySelectorAll('input[name="periodTypes"]')].some((input) => input.value === "sprint" && input.checked);
  const length = form.elements.sprintLengthWeeks;
  const anchor = form.elements.sprintAnchorDate;
  if (length) length.disabled = !enabled;
  if (anchor) {
    anchor.disabled = !enabled;
    anchor.required = enabled;
  }
}

function restorePlanningCalendarDraft(data) {
  const form = document.querySelector("#planningCalendarForm");
  if (!form) return;
  const enabled = data.getAll("periodTypes").map(String);
  form.querySelectorAll('[name="periodTypes"]').forEach(input => { input.checked = enabled.includes(input.value); });
  for (const name of ["fiscalYearStartMonth", "sprintLengthWeeks", "sprintAnchorDate"]) {
    const input = form.elements.namedItem(name);
    if (input && data.has(name)) input.value = String(data.get(name));
  }
  toggleSprintCalendarFields();
}

async function savePlanningCalendar(event) {
  event.preventDefault();
  if (!planningCalendarCanManage()) return;
  const data = new FormData(event.currentTarget);
  const scope = captureDocumentArtifactScope();
  const expectedVersion = state.planningCalendar.version;
  let saved = false;
  try {
    const enabledPeriodTypes = data.getAll("periodTypes").map(String);
    if (!enabledPeriodTypes.length) throw new PlanningCalendarError("PERIOD_REQUIRED", "Enable at least one planning layer.");
    const next = patchPlanningCalendar(state.planningCalendar, {
      enabledPeriodTypes,
      fiscalYearStartMonth: Number(data.get("fiscalYearStartMonth")),
      sprintLengthWeeks: Number(data.get("sprintLengthWeeks") || state.planningCalendar.sprintLengthWeeks),
      sprintAnchorDate: String(data.get("sprintAnchorDate") || "")
    });
    const pending = writePlanningCalendar(next, expectedVersion, scope, "Planning calendar");
    render();
    await pending;
    if (!documentArtifactScopeIsCurrent(scope)) return;
    saved = true;
    state.planningCalendarStatus = "Planning calendar saved. Timeline scope reset to All time. Review any saved capacity against the updated calendar.";
    state.periodSelection = { kind: "all" };
    state.periodAnnouncement = "Planning calendar changed. Timeline scope reset to All time.";
    pushViewUrl(true);
  } catch (error) {
    if (documentArtifactScopeIsCurrent(scope)) state.planningCalendarStatus = planningSaveError(error);
  } finally {
    if (documentArtifactScopeIsCurrent(scope)) {
      renderAndFocus("planningCalendarStatus");
      if (!saved) restorePlanningCalendarDraft(data);
    }
  }
}

function selectSpaceMode(mode) {
  state.routeAnnouncement = "";
  state.selectedMode = String(mode || "");
  if (state.selectedView === "insights") { state.query = ""; state.insightStatusFilter = ""; }
  state.spaceModes[state.selectedView] = state.selectedMode;
  pushViewUrl();
  render();
  document.querySelector(`[data-space-mode="${cssEscape(state.selectedMode)}"]`)?.focus();
}

function selectCustomerView(view) {
  state.customerView = ["accounts", "segments", "fields"].includes(view) ? view : "accounts";
  state.customerStatus = "";
  state.customerSegmentDraft = null;
  pushViewUrl();
  render();
  document.querySelector(`[data-customer-view="${cssEscape(state.customerView)}"]`)?.focus();
}

function customerCanManage() {
  const role = demoTeamRole || state.team.role;
  if (demoTeamRole) return role === "owner" || role === "editor";
  if (!state.team.active) return true;
  return (role === "owner" || role === "editor") && state.team.connection === "live" && !state.team.mutationBusy;
}

function customerCanManageFields() {
  if (demoTeamRole) return demoTeamRole === "owner";
  return !state.team.active || (state.team.role === "owner" && state.team.connection === "live" && !state.team.mutationBusy);
}

async function commitCustomerDirectory(nextDirectory, message, onCommitted = () => {}) {
  if (!customerCanManage()) return false;
  let committed = false;
  const next = normalizeCustomerDirectory({ ...nextDirectory, version: state.customerDirectory.version + 1 });
  if (state.team.active) {
    state.team.mutationBusy = true;
    render();
    try {
      const result = await state.team.repository.updateCustomerDirectory(next, state.customerDirectory.version);
      if (!applyTeamSnapshot(result?.snapshot)) throw new Error("The customer save was not confirmed. Your draft is still available.");
      committed = true;
      state.customerStatus = message;
    } catch (error) {
      state.customerStatus = safeTeamError(error, "The customer directory could not be updated.");
    } finally {
      state.team.mutationBusy = false;
    }
  } else {
    await commitLocalWorkspacePatch({ customerDirectory: next }, [createActivityEntry("customer-directory-updated", { title: "Customer directory" }, { customerDirectory: message })]);
    committed = true;
    state.customerStatus = message;
  }
  if (committed) onCommitted();
  render();
  document.querySelector("#customerStatus")?.focus();
  return committed;
}

function openNewCustomer() {
  if (!customerCanManage()) return;
  state.customerView = "accounts";
  state.selectedCustomerId = "new";
  state.customerStatus = "";
  render();
  document.querySelector('#customerAccountForm [name="name"]')?.focus();
}

function selectCustomerAccount(id) {
  state.selectedCustomerId = id;
  pushViewUrl(true);
  render();
  document.querySelector(".customer-inspector h3")?.focus?.();
}

function updateCustomerSearch(event) {
  state.customerQuery = event.currentTarget.value;
  state.customerPage = 1;
  render();
  const input = document.querySelector("#customerSearch");
  input?.focus();
  input?.setSelectionRange(state.customerQuery.length, state.customerQuery.length);
}

function changeCustomerPage(page) {
  state.customerPage = Math.max(1, Number(page) || 1);
  render();
  document.querySelector("#accountDirectoryTitle")?.focus?.();
}

function captureCustomerAccountDraft(event) {
  if (!customerCanManage()) return;
  const form = event.currentTarget;
  const id = String(new FormData(form).get("accountId") || "");
  const key = id || "new";
  const previous = state.customerAccountDrafts.get(key);
  state.customerAccountDrafts.set(key, {
    baseline: previous?.baseline ?? JSON.stringify(state.customerDirectory.accounts.find(account => account.id === id) || null),
    fields: previous?.fields ?? JSON.stringify(state.customerDirectory.fields),
    values: { id, ...customerAccountFormValues(form, false) }
  });
  document.querySelector("#customerAccountDraftStatus")?.removeAttribute("hidden");
  document.querySelector("#discardCustomerAccountDraft")?.removeAttribute("hidden");
}

function discardCustomerAccountDraft() {
  const id = document.querySelector('#customerAccountForm [name="accountId"]')?.value || "new";
  state.customerAccountDrafts.delete(id);
  state.customerStatus = "Account draft discarded.";
  render();
  document.querySelector('#customerAccountForm [name="name"]')?.focus();
}

function customerAccountFormValues(form, trim = true) {
  const data = new FormData(form);
  const text = name => trim ? String(data.get(name) || "").trim() : String(data.get(name) || "");
  const attributes = {};
  for (const field of state.customerDirectory.fields) {
    const name = `attribute.${field.id}`;
    if (field.type === "multi-select") attributes[field.id] = data.getAll(name).map(String);
    else if (data.get(name) !== null && (trim ? String(data.get(name)).trim() : String(data.get(name))) !== "") {
      const raw = text(name);
      attributes[field.id] = field.type === "number" && trim ? Number(raw) : field.type === "boolean" ? raw === "true" : raw;
    }
  }
  return {
    name: text("name"), domain: text("domain"),
    status: String(data.get("status") || "prospect"), industry: text("industry"),
    region: text("region"), employeeCount: trim ? (data.get("employeeCount") === "" ? null : Number(data.get("employeeCount"))) : text("employeeCount"),
    planTier: text("planTier"), ownerPersonId: text("ownerPersonId"),
    notes: text("notes"), tagIds: data.getAll("tagIds").map(String), attributes
  };
}

async function saveCustomerAccount(event) {
  event.preventDefault();
  if (!customerCanManage()) return;
  try {
    const id = String(new FormData(event.currentTarget).get("accountId") || "");
    const draft = state.customerAccountDrafts.get(id || "new");
    if (draft && (draft.baseline !== JSON.stringify(state.customerDirectory.accounts.find(account => account.id === id) || null) || draft.fields !== JSON.stringify(state.customerDirectory.fields))) {
      throw new Error("This account or its custom fields changed while you were editing. Copy your draft, then discard it to load the latest version.");
    }
    const values = customerAccountFormValues(event.currentTarget);
    const next = id ? updateCustomerAccount(state.customerDirectory, id, values) : createCustomerAccount(state.customerDirectory, values);
    const saved = id ? id : next.accounts.at(-1).id;
    await commitCustomerDirectory(next, `${values.name} ${id ? "updated" : "added"}.`, () => {
      state.selectedCustomerId = saved;
      state.customerAccountDrafts.delete(id || "new");
    });
  } catch (error) { showCustomerError(error); }
}

async function deleteCustomerAccount(event) {
  const id = event.currentTarget.dataset.customerId;
  const account = state.customerDirectory.accounts.find((entry) => entry.id === id);
  if (!account) return;
  const confirmed = await requestDataConfirmation({ title: "Delete customer account?", description: `${account.name} can only be deleted when no initiative or Insights record links to it.`, confirmLabel: "Delete account", trigger: event.currentTarget });
  if (!confirmed) return;
  try {
    const next = removeCustomerAccount(state.customerDirectory, id, state.items, state.insightRecords);
    await commitCustomerDirectory(next, `${account.name} deleted.`, () => {
      state.selectedCustomerId = next.accounts[0]?.id || "";
      state.customerAccountDrafts.delete(id);
    });
  } catch (error) { showCustomerError(error); }
}

function exportCustomers() {
  downloadFile(exportCustomerCsv(state.customerDirectory), "text/csv", `pm-os-customers-${todayStamp()}.csv`);
  state.customerStatus = "Customer CSV exported.";
  render();
}

function downloadCustomerTemplate() {
  const empty = normalizeCustomerDirectory({ ...state.customerDirectory, accounts: [] });
  downloadFile(exportCustomerCsv(empty), "text/csv", "pm-os-customer-import-template.csv");
}

function previewCustomerImport(event) {
  const file = event.currentTarget.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = String(reader.result || "");
      state.customerImport = { name: file.name, text, preview: previewCustomerCsv(text, state.customerDirectory) };
      state.customerStatus = "Review the validation preview before applying this import.";
    } catch (error) { state.customerStatus = error.message; }
    render();
    document.querySelector("#customerImportTitle")?.focus?.();
  };
  reader.readAsText(file);
}

async function applyCustomerImport() {
  if (!state.customerImport?.preview.valid || !customerCanManage()) return;
  try {
    const result = applyCustomerCsvImport(state.customerImport.text, state.customerDirectory);
    if (!demoMode && !state.team.active) state.backups = storeWorkspaceSnapshot(localStorage, backupKey, state.backups, exportPortableWorkspace(), backupReasons.import);
    const total = result.preview.creates + result.preview.updates;
    const pendingImport = state.customerImport;
    await commitCustomerDirectory(result.directory, `Imported ${total} customer accounts with a recovery snapshot.`, () => {
      if (state.customerImport === pendingImport) state.customerImport = null;
    });
  } catch (error) { showCustomerError(error); }
}

function cancelCustomerImport() { state.customerImport = null; state.customerStatus = "Customer import cancelled."; render(); }

function openNewSegment() {
  if (!customerCanManage()) return;
  state.selectedSegmentId = "new";
  state.customerSegmentDraft = { id: "", name: "", description: "", match: "all", rules: [{ id: "new-rule", field: "status", operator: "equals", value: "active" }] };
  render();
  document.querySelector('#customerSegmentForm [name="name"]')?.focus();
}

function selectCustomerSegment(id) { state.selectedSegmentId = id; state.customerSegmentDraft = null; pushViewUrl(true); render(); }

function segmentDraftFromForm(form) {
  const data = new FormData(form);
  const rules = [];
  for (let index = 0; data.has(`rule.${index}.field`); index += 1) {
    const field = String(data.get(`rule.${index}.field`));
    const operator = String(data.get(`rule.${index}.operator`));
    const raw = String(data.get(`rule.${index}.value`) || "").trim();
    const type = customerRuleFieldType(field);
    let value = raw;
    if (["is_set", "not_set"].includes(operator)) value = "";
    else if (["multi-select"].includes(type)) value = data.getAll(`rule.${index}.value`).map(String);
    else if (operator === "in") value = data.getAll(`rule.${index}.value`).length > 1 ? data.getAll(`rule.${index}.value`).map(String) : raw.split(",").map((entry) => entry.trim()).filter(Boolean);
    else if (operator === "between") value = raw.split(",").map((entry) => type === "number" ? Number(entry.trim()) : entry.trim());
    else if (type === "number") value = Number(raw);
    else if (type === "boolean") value = raw.toLowerCase() === "true";
    rules.push({ id: state.customerSegmentDraft?.rules?.[index]?.id || `rule-${index + 1}`, field, operator, value });
  }
  return { id: String(data.get("segmentId") || ""), name: String(data.get("name") || "").trim(), description: String(data.get("description") || "").trim(), match: String(data.get("match") || "all"), rules };
}

function captureCustomerSegmentDraft(event) { state.customerSegmentDraft = segmentDraftFromForm(event.currentTarget); }
function handleCustomerSegmentFieldChange(event) {
  captureCustomerSegmentDraft(event);
  if (!String(event.target.name || "").endsWith(".field")) return;
  const draft = state.customerSegmentDraft;
  const index = Number(String(event.target.name).split(".")[1]);
  draft.rules[index].operator = customerDefaultOperator(draft.rules[index].field);
  draft.rules[index].value = "";
  render();
  document.querySelector(`[name="rule.${index}.operator"]`)?.focus();
}

function customerDefaultOperator(field) { return customerRuleFieldType(field) === "multi-select" ? "contains_any" : "equals"; }

function addCustomerSegmentRule() {
  const form = document.querySelector("#customerSegmentForm");
  const draft = form ? segmentDraftFromForm(form) : state.customerSegmentDraft;
  if (!draft || draft.rules.length >= 20) return;
  draft.rules.push({ id: `rule-${Date.now().toString(36)}`, field: "status", operator: "equals", value: "active" });
  state.customerSegmentDraft = draft;
  render();
  document.querySelector(`[name="rule.${draft.rules.length - 1}.field"]`)?.focus();
}

function removeCustomerSegmentRule(event) {
  const form = document.querySelector("#customerSegmentForm");
  const draft = form ? segmentDraftFromForm(form) : state.customerSegmentDraft;
  draft.rules.splice(Number(event.currentTarget.dataset.removeSegmentRule), 1);
  state.customerSegmentDraft = draft;
  render();
  document.querySelector("#addSegmentRule")?.focus();
}

async function saveCustomerSegment(event) {
  event.preventDefault();
  try {
    const values = segmentDraftFromForm(event.currentTarget);
    const next = values.id ? updateCustomerSegment(state.customerDirectory, values.id, values) : createCustomerSegment(state.customerDirectory, values);
    state.selectedSegmentId = values.id || next.segments.at(-1).id;
    state.customerSegmentDraft = null;
    await commitCustomerDirectory(next, `${values.name} ${values.id ? "updated" : "created"}.`);
  } catch (error) { showCustomerError(error); }
}

async function deleteCustomerSegment(event) {
  const id = event.currentTarget.dataset.segmentId;
  const segment = state.customerDirectory.segments.find((entry) => entry.id === id);
  const confirmed = await requestDataConfirmation({ title: "Delete segment?", description: `${segment?.name || "This segment"} can only be deleted when no initiative or Insights record links to it.`, confirmLabel: "Delete segment", trigger: event.currentTarget });
  if (!confirmed) return;
  try {
    const next = removeCustomerSegment(state.customerDirectory, id, state.items, state.insightRecords);
    await commitCustomerDirectory(next, `${segment.name} deleted.`, () => {
      state.selectedSegmentId = next.segments[0]?.id || "";
      state.customerSegmentDraft = null;
    });
  } catch (error) { showCustomerError(error); }
}

async function addCustomerTag(event) {
  event.preventDefault();
  try { const name = String(new FormData(event.currentTarget).get("name") || "").trim(); await commitCustomerDirectory(createCustomerTag(state.customerDirectory, { name }), `${name} tag added.`); }
  catch (error) { showCustomerError(error); }
}
async function editCustomerTag(event) {
  event.preventDefault();
  try { const data = new FormData(event.currentTarget); const name = String(data.get("name") || "").trim(); await commitCustomerDirectory(updateCustomerTag(state.customerDirectory, String(data.get("tagId")), { name }), `${name} tag updated.`); }
  catch (error) { showCustomerError(error); }
}
async function deleteCustomerTag(event) {
  try { const next = removeCustomerTag(state.customerDirectory, event.currentTarget.dataset.deleteTag); await commitCustomerDirectory(next, "Tag deleted."); }
  catch (error) { showCustomerError(error); }
}

function customerFieldValues(form) {
  const data = new FormData(form);
  return { name: String(data.get("name") || "").trim(), type: String(data.get("type") || "text"), options: String(data.get("options") || "").split(",").map((entry) => entry.trim()).filter(Boolean) };
}
async function addCustomerField(event) {
  event.preventDefault();
  try { const values = customerFieldValues(event.currentTarget); await commitCustomerDirectory(createCustomerField(state.customerDirectory, values), `${values.name} field added.`); }
  catch (error) { showCustomerError(error); }
}
async function editCustomerField(event) {
  event.preventDefault();
  try { const data = new FormData(event.currentTarget); const values = customerFieldValues(event.currentTarget); await commitCustomerDirectory(updateCustomerField(state.customerDirectory, String(data.get("fieldId")), values), `${values.name} field updated.`); }
  catch (error) { showCustomerError(error); }
}
async function deleteCustomerField(event) {
  try { const next = removeCustomerField(state.customerDirectory, event.currentTarget.dataset.deleteField); await commitCustomerDirectory(next, "Custom field deleted."); }
  catch (error) { showCustomerError(error); }
}

function showCustomerError(error) {
  state.customerStatus = error instanceof CustomerDirectoryError ? error.message : error?.message || "The customer directory could not be updated.";
  render();
  document.querySelector("#customerStatus")?.focus();
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(themeKey, next); } catch { /* Theme remains available for this session. */ }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#111318" : "#f5f6f8");
  render();
  document.querySelector("#themeToggle")?.focus();
}

function selectOrganizationUnit(unitId) {
  state.selectedOrgUnitId = unitId;
  pushViewUrl(true);
  render();
  requestAnimationFrame(() => {
    [...document.querySelectorAll("[data-select-unit]")]
      .find((button) => button.dataset.selectUnit === unitId)
      ?.focus();
  });
}

function handleOrganizationTreeKeydown(event) {
  const items = [...document.querySelectorAll("[data-select-unit]")];
  const index = items.indexOf(event.currentTarget);
  let target = null;
  if (event.key === "ArrowDown") target = items[Math.min(index + 1, items.length - 1)];
  if (event.key === "ArrowUp") target = items[Math.max(index - 1, 0)];
  if (event.key === "Home") target = items[0];
  if (event.key === "End") target = items.at(-1);
  if (event.key === "ArrowRight" && event.currentTarget.getAttribute("aria-expanded") === "true") {
    const candidate = items[index + 1];
    if (Number(candidate?.getAttribute("aria-level")) > Number(event.currentTarget.getAttribute("aria-level"))) target = candidate;
  }
  if (event.key === "ArrowLeft") {
    const level = Number(event.currentTarget.getAttribute("aria-level"));
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      if (Number(items[cursor].getAttribute("aria-level")) < level) {
        target = items[cursor];
        break;
      }
    }
  }
  if (!target) return;
  event.preventDefault();
  selectOrganizationUnit(target.dataset.selectUnit);
}

async function commitOrganization(nextOrganization, message) {
  const next = normalizeOrganization(nextOrganization);
  assertPriorityAssignments(state.prioritization, next, state.items);
  if (demoTeamRole && demoTeamRole !== "owner") return;
  if (state.team.active) {
    if (state.team.role !== "owner" || teamMutationDisabled()) return;
    state.team.mutationBusy = true;
    render();
    try {
      const result = await state.team.repository.updateOrganization(next, state.organization.version);
      applyTeamSnapshot(result?.snapshot);
      state.organizationStatus = message;
    } catch (error) {
      state.organizationStatus = safeTeamError(error, "The organization could not be updated.");
    } finally {
      state.team.mutationBusy = false;
    }
  } else {
    await commitLocalWorkspacePatch({ organization: next }, [createActivityEntry("organization-updated", { title: "Product organization" }, { organization: message })]);
    state.organizationStatus = message;
  }
  render();
  document.querySelector("#organizationStatus")?.focus();
}

function organizationFormValues(form) {
  return Object.fromEntries(new FormData(form));
}

async function addOrganizationPerson(event) {
  event.preventDefault();
  try {
    const values = organizationFormValues(event.currentTarget);
    await commitOrganization(createPerson(state.organization, values), `Added ${String(values.displayName).trim()} to the team.`);
  } catch (error) {
    showOrganizationError(error);
  }
}

async function editOrganizationPerson(event) {
  event.preventDefault();
  try {
    const values = organizationFormValues(event.currentTarget);
    await commitOrganization(updatePerson(state.organization, values.personId, values), `Updated ${String(values.displayName).trim()}.`);
  } catch (error) {
    showOrganizationError(error);
  }
}

async function removeOrganizationPerson(event) {
  const trigger = event.currentTarget;
  const personId = trigger.dataset.removePerson;
  const scope = captureDocumentArtifactScope();
  try {
    const person = state.organization.people.find((entry) => entry.id === personId);
    const confirmed = await requestDataConfirmation({
      title: "Remove person?",
      description: `${person?.displayName || "This person"} can only be removed when they lead no units and own no initiatives, risks, dependencies, or customer accounts.`,
      confirmLabel: "Remove Person",
      trigger
    });
    if (!confirmed || !documentArtifactScopeIsCurrent(scope)) return;
    const customerAssignments = state.customerDirectory.accounts.map((account) => ({ id: `customer:${account.id}`, title: account.name, pocPersonId: account.ownerPersonId, orgUnitId: "" }));
    const next = removePerson(state.organization, personId, [...state.items, ...customerAssignments]);
    await commitOrganization(next, `${person?.displayName || "Person"} removed.`);
    if (!documentArtifactScopeIsCurrent(scope)) return;
    if (state.organization.people.some(entry => entry.id === personId)) throw new Error("Removal was not confirmed. The saved person is still available; review the status and try again.");
    state.selectedPersonId = next.people[0]?.id || "";
    renderAndFocus("organizationStatus");
  } catch (error) {
    if (documentArtifactScopeIsCurrent(scope)) showOrganizationError(error);
  }
}

async function addOrganizationUnit(event) {
  event.preventDefault();
  try {
    const values = organizationFormValues(event.currentTarget);
    const next = createUnit(state.organization, values);
    state.selectedOrgUnitId = next.units.at(-1)?.id || state.selectedOrgUnitId;
    await commitOrganization(next, `Created ${String(values.name).trim()}.`);
  } catch (error) {
    showOrganizationError(error);
  }
}

async function editOrganizationUnit(event) {
  event.preventDefault();
  try {
    const values = organizationFormValues(event.currentTarget);
    let next = updateUnit(state.organization, values.unitId, { name: values.name, leadPersonId: values.leadPersonId });
    const current = state.organization.units.find((unit) => unit.id === values.unitId);
    if (current?.parentId && values.parentId !== current.parentId) next = moveUnit(next, values.unitId, values.parentId);
    await commitOrganization(next, `Updated ${String(values.name).trim()}.`);
  } catch (error) {
    showOrganizationError(error);
  }
}

async function removeOrganizationUnit(event) {
  const trigger = event.currentTarget;
  const unitId = trigger.dataset.removeUnit;
  const scope = captureDocumentArtifactScope();
  try {
    const unit = state.organization.units.find((entry) => entry.id === unitId);
    const confirmed = await requestDataConfirmation({
      title: "Remove organization unit?",
      description: `${unit?.name || "This unit"} can only be removed when it has no child units or assigned initiatives.`,
      confirmLabel: "Remove Unit",
      trigger
    });
    if (!confirmed || !documentArtifactScopeIsCurrent(scope)) return;
    const next = removeUnit(state.organization, unitId, state.items);
    await commitOrganization(next, `${unit?.name || "Unit"} removed.`);
    if (!documentArtifactScopeIsCurrent(scope)) return;
    if (state.organization.units.some(entry => entry.id === unitId)) throw new Error("Removal was not confirmed. The saved unit is still available; review the status and try again.");
    state.selectedOrgUnitId = rootUnits(next)[0]?.id || "";
    renderAndFocus("organizationStatus");
  } catch (error) {
    if (documentArtifactScopeIsCurrent(scope)) showOrganizationError(error);
  }
}

function showOrganizationError(error) {
  state.organizationStatus = error?.message || "The organization could not be updated.";
  render();
  document.querySelector("#organizationStatus")?.focus();
}

function updateSearch(event) {
  const selectionStart = event.currentTarget.selectionStart;
  const selectionEnd = event.currentTarget.selectionEnd;
  state.query = event.currentTarget.value;
  render();
  const input = document.querySelector("#searchInput");
  if (!input) return;
  input.focus({ preventScroll: true });
  input.setSelectionRange(selectionStart, selectionEnd);
}

function bindCopyDraftControls() {
  for (const [buttonId, draftId] of Object.entries(copyDraftTargets())) {
    document.querySelector(`#${buttonId}`)?.addEventListener("click", (event) => copyDraft(event.currentTarget, draftId));
  }
}

function labelReadonlyDrafts() {
  document.querySelectorAll("textarea[readonly]").forEach((draft) => {
    if (draft.labels?.length || draft.getAttribute("aria-label") || draft.getAttribute("aria-labelledby")) return;
    const heading = draft.closest(".panel")?.querySelector("h3")?.textContent?.trim() || "Generated content";
    draft.setAttribute("aria-label", `${heading} draft`);
  });
}

function weeklyChecklistStorageKey() {
  if (demoMode) return "";
  if (!state.team.active) return activeProjectStorageKeys.checklist;
  if (state.team.projectId) return projectKeys(state.team.projectId).checklist;
  const server = state.team.connectorId || state.team.config?.url || state.team.managedConfig?.url || state.team.mode;
  return `pm-os-staging.checklist.v1.team.${encodeURIComponent(JSON.stringify([server, state.team.workspace?.id]))}`;
}

async function copyDraft(button, draftId) {
  const draft = document.querySelector(`#${draftId}`);
  const liveRegion = document.querySelector(draftId === "executiveBriefMemoDraft" ? "#executiveBriefCopyStatus" : "#copyStatus");
  if (!button || !draft || !liveRegion) return;
  const originalLabel = button.textContent;
  const copiedWorkspace = state.items;
  const checklistKey = weeklyChecklistStorageKey();
  let progressWarning = "";
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(draft.value);
    if (draftId === "weeklyUpdateDraft" && state.items === copiedWorkspace) {
      state.weeklyUpdateCopied = true;
      if (checklistKey) {
        try { localStorage.setItem(checklistKey, "1"); }
        catch { progressWarning = " Checklist progress could not be saved on this device."; }
      }
      const step = document.querySelector("#checklistCopyUpdate")?.closest("li");
      step?.classList.add("complete");
      if (step?.querySelector("span")) step.querySelector("span").textContent = "✓";
      const progress = document.querySelector("#gettingStartedProgress");
      if (progress) progress.textContent = `${[state.items.length > 0, state.prioritization.manualOrder.length > 0, state.weeklyUpdateCopied].filter(Boolean).length} / 3`;
    }
    button.textContent = "Copied";
    liveRegion.textContent = draftId === "executiveBriefMemoDraft"
      ? "Executive brief copied to clipboard"
      : `${draft.getAttribute("aria-label") || "Draft"} copied to clipboard.${progressWarning}`;
    button.focus();
    window.setTimeout(() => { if (button.isConnected) button.textContent = originalLabel; }, 2000);
  } catch {
    const details = draft.closest("details");
    if (details) details.open = true;
    draft.focus();
    draft.select();
    liveRegion.textContent = draftId === "executiveBriefMemoDraft"
      ? "Copy failed. Select the memo and copy manually."
      : "Copy failed. The draft is selected for manual copying.";
  }
}

function createTeamState(overrides = {}) {
  return {
    active: false,
    mode: "idle",
    managedConfig: null,
    config: null,
    client: null,
    connectorId: "",
    projectId: "",
    capabilities: null,
    connection: "idle",
    status: "",
    error: false,
    email: "",
    authMode: "otp",
    backendMode: "remote",
    persistSession: false,
    authUser: null,
    allowWorkspaceCreation: false,
    workspaces: [],
    workspace: null,
    role: "viewer",
    repository: null,
    openResult: null,
    unsubscribeRepository: null,
    unsubscribeConnection: null,
    members: [],
    invite: null,
    invitations: [],
    inviteEmail: "",
    inviteAttempt: null,
    showWorkspaceList: false,
    mutationBusy: false,
    conflict: null,
    itemCreateAttempts: {},
    workspaceCreateAttempt: null,
    returnState: null,
    intentionalClose: false,
    boundaryPromise: null,
    ...overrides
  };
}

function createInitiativeDetailState(overrides = {}) {
  return {
    selectedId: "",
    triggerId: "",
    historyOwned: false,
    showClosedRisks: false,
    showClosedDependencies: false,
    focusSection: "",
    focusRecordId: "",
    recordEditor: { kind: "", recordId: "", convertFromRiskId: "", returnFocusId: "", focusField: "", actionContext: null, draft: null, error: "" },
    ...overrides
  };
}

function initiativeDetailItem() {
  return state.items.find((entry) => entry.id === state.initiativeDetail.selectedId) || null;
}

function revealFocusedInitiativeRecord(detail, item) {
  if (!detail.selectedId) return detail;
  const risk = item?.risks.find(record => record.id === detail.focusRecordId);
  const dependency = item?.dependencies.find(record => record.id === detail.focusRecordId);
  if (!item || (detail.focusRecordId && !risk && !dependency)) {
    const kind = detail.focusSection === "dependencies" ? "dependency" : "risk";
    detail.missingLinkMessage = !item
      ? "This initiative is no longer available in this workspace. Return to the workspace to choose an available initiative."
      : "The linked " + kind + " record is no longer available. Showing " + item.title + "; review its current records below or close details to return to the workspace.";
    detail.focusRecordId = "";
    detail.focusSection = "";
    state.editorAnnouncement = detail.missingLinkMessage;
    const url = new URL(location.href);
    if (url.searchParams.get("initiative") === detail.selectedId) {
      url.searchParams.delete("record");
      url.searchParams.delete("section");
      history.replaceState(history.state, "", url);
    }
    return detail;
  }
  if (risk) {
    detail.focusSection = "risks";
    if (["accepted", "resolved"].includes(risk.status)) detail.showClosedRisks = true;
  }
  if (dependency) {
    detail.focusSection = "dependencies";
    if (dependency.status === "resolved") detail.showClosedDependencies = true;
  }
  return detail;
}

function initiativeRecordDraftScope() {
  return JSON.stringify([demoMode, storageKey, documentComposerContext().projectKey,
    state.team.active ? [state.team.connectorId, state.team.workspace?.id, state.team.authUser?.id || ""]
      : [state.source.type, state.source.fileId || "", state.source.folderName || "", state.source.fileName || ""]]);
}

function prepareInitiativeRecordEditor(editor, item = initiativeDetailItem()) {
  const scope = initiativeRecordDraftScope();
  const key = recordDraftKey(scope, item?.id || "", editor);
  const retained = initiativeRecordDrafts.get(key);
  if (retained) {
    retained.returnFocusId = editor.returnFocusId;
    retained.actionContext = editor.actionContext;
    retained.focusField = editor.focusField;
    return retained;
  }
  return { ...editor, key, scope, initiativeId: item?.id || "", initiativeTitle: item?.title || "Initiative", baseline: recordDraftBaseline(item, editor), saving: false };
}

function initiativeRecordDraftRecoveryMarkup() {
  if (!initiativeRecordDrafts.size) return "";
  const drafts = [...initiativeRecordDrafts.values()].filter(draft => draft.scope === initiativeRecordDraftScope());
  return `<aside class="storage-warning" aria-label="Unsaved risk and dependency drafts"><div><strong>Unsaved risk and dependency drafts</strong><p>Kept in this tab while you navigate. Reloading or closing the tab discards them. Save or download before leaving.</p>${drafts.map(draft => `<div><span>${escapeHtml(draft.initiativeTitle)} · ${draft.kind}</span> <button class="secondary small" type="button" data-resume-record-draft="${escapeHtml(draft.key)}">Resume ${draft.kind} draft</button> <button class="secondary small" type="button" data-download-record-draft="${escapeHtml(draft.key)}">Download ${draft.kind} draft</button> <button class="text-button" type="button" data-discard-record-draft="${escapeHtml(draft.key)}" ${draft.saving ? "disabled" : ""}>Discard ${draft.kind} draft</button></div>`).join("")}${drafts.length < initiativeRecordDrafts.size ? "<p>Other drafts are retained in their original projects or data sources. Return there to review them.</p>" : ""}</div></aside>`;
}

function bindInitiativeRecordDraftRecovery() {
  document.querySelectorAll("[data-resume-record-draft]").forEach(button => button.addEventListener("click", () => {
    const draft = initiativeRecordDrafts.get(button.dataset.resumeRecordDraft);
    if (!draft || draft.scope !== initiativeRecordDraftScope()) return;
    if (!state.items.some(item => item.id === draft.initiativeId)) {
      state.editorAnnouncement = "The initiative is unavailable. Download the retained draft before discarding it.";
      button.parentElement.querySelector("span").textContent = state.editorAnnouncement;
      button.parentElement.querySelector("[data-download-record-draft]")?.focus();
      return;
    }
    openInitiativeDetail(draft.initiativeId, button, { replaceDetail: Boolean(state.initiativeDetail.selectedId) });
    state.initiativeDetail.recordEditor = draft;
    state.initiativeDetail.focusSection = draft.kind === "risk" ? "risks" : "dependencies";
    render();
  }));
  document.querySelectorAll("[data-download-record-draft]").forEach(button => button.addEventListener("click", () => {
    const draft = initiativeRecordDrafts.get(button.dataset.downloadRecordDraft);
    if (draft?.scope === initiativeRecordDraftScope()) downloadFile(JSON.stringify({ initiative: draft.initiativeTitle, kind: draft.kind, recordId: draft.recordId, convertFromRiskId: draft.convertFromRiskId, fields: draft.draft }, null, 2), "application/json", "pm-os-unsaved-record.json");
  }));
  document.querySelectorAll("[data-discard-record-draft]").forEach(button => button.addEventListener("click", () => {
    const draft = initiativeRecordDrafts.get(button.dataset.discardRecordDraft);
    if (!draft || draft.saving || draft.scope !== initiativeRecordDraftScope()) return;
    initiativeRecordDrafts.delete(draft.key);
    if (state.initiativeDetail.recordEditor === draft) state.initiativeDetail.recordEditor = createInitiativeDetailState().recordEditor;
    state.editorAnnouncement = `${draft.kind === "risk" ? "Risk" : "Dependency"} draft discarded.`;
    render();
  }));
}

function openInitiativeRecordEditor(kind, recordId = "", trigger = null) {
  if (!["risk", "dependency"].includes(kind) || teamEditorReadOnlyReason()) return;
  state.initiativeDetail.recordEditor = prepareInitiativeRecordEditor({ kind, recordId, convertFromRiskId: "", returnFocusId: trigger?.id || "", focusField: "", actionContext: null, draft: null, error: "" });
  state.initiativeDetail.focusSection = kind === "dependency" ? "dependencies" : "risks";
  render();
}

function cancelInitiativeRecordEditor(discard = true) {
  const editor = state.initiativeDetail.recordEditor;
  if (discard && editor.saving) return;
  if (discard) initiativeRecordDrafts.delete(editor.key);
  const { kind, returnFocusId } = state.initiativeDetail.recordEditor;
  state.initiativeDetail.recordEditor = { kind: "", recordId: "", convertFromRiskId: "", returnFocusId: "", focusField: "", actionContext: null, draft: null, error: "" };
  render();
  focusAfterRender(returnFocusId || `initiative${kind === "risk" ? "Risks" : "Dependencies"}Title`);
}

function captureInitiativeRecordDraft(event) {
  const form = event.currentTarget;
  const editor = state.initiativeDetail.recordEditor;
  if (!form.isConnected || editor.saving || editor.scope !== initiativeRecordDraftScope()) return;
  const data = new FormData(form);
  editor.draft = Object.fromEntries(data);
  initiativeRecordDrafts.set(editor.key, editor);
  const status = document.querySelector("#initiativeRecordDraftStatus");
  if (status) status.textContent = "Unsaved draft. Kept in this tab while you navigate. Save or download before reloading or closing the tab. Cancel discards this draft; Escape keeps it.";
}

function syncDependencyTargetFields(event) {
  if (event.target.name !== "targetType") return;
  const form = event.currentTarget;
  const internal = event.target.value === "initiative";
  form.querySelector("[data-target-field=initiative]")?.toggleAttribute("hidden", !internal);
  form.querySelector("[data-target-field=external]")?.toggleAttribute("hidden", internal);
}

function toggleClosedInitiativeRecords(kind) {
  if (kind === "risk") state.initiativeDetail.showClosedRisks = !state.initiativeDetail.showClosedRisks;
  if (kind === "dependency") state.initiativeDetail.showClosedDependencies = !state.initiativeDetail.showClosedDependencies;
  render();
  focusAfterRender(`initiative${kind === "risk" ? "Risks" : "Dependencies"}Title`);
}

function initiativeRecordAnnouncement(action, kind, description) {
  const text = String(description || "").trim();
  return `${action} ${kind}: ${/[.!?]$/.test(text) ? text : `${text}.`}`;
}

function convertInitiativeRisk(recordId, trigger = null) {
  const item = initiativeDetailItem();
  const record = item?.risks.find((entry) => entry.id === recordId);
  if (!record || teamEditorReadOnlyReason()) return;
  state.initiativeDetail.recordEditor = prepareInitiativeRecordEditor({
    kind: "dependency",
    recordId: "",
    convertFromRiskId: recordId,
    returnFocusId: trigger?.id || "",
    focusField: "",
    actionContext: null,
    moreDetailsOpen: false,
    error: "",
    draft: {
      description: record.description,
      targetType: "external",
      targetInitiativeId: "",
      targetName: "",
      status: "pending",
      ownerPersonId: record.ownerPersonId,
      ownerName: record.ownerName,
      neededBy: record.reviewDate
    }
  });
  initiativeRecordDrafts.set(state.initiativeDetail.recordEditor.key, state.initiativeDetail.recordEditor);
  state.initiativeDetail.focusSection = "dependencies";
  render();
}

async function saveInitiativeRecord(event) {
  event.preventDefault();
  if (teamEditorReadOnlyReason()) return;
  const item = initiativeDetailItem();
  if (!item) return;
  const editor = state.initiativeDetail.recordEditor;
  if (editor.saving) return;
  const data = new FormData(event.currentTarget);
  const raw = Object.fromEntries(data);
  editor.draft = raw;
  initiativeRecordDrafts.set(editor.key, editor);
  const staleError = recordDraftSaveError(item, editor, initiativeRecordDraftScope());
  if (staleError) return failInitiativeRecord(staleError);
  const description = String(raw.description || "").trim();
  if (!description) return failInitiativeRecord("Description is required.");
  const timestamp = new Date().toISOString();
  const collection = editor.kind === "risk" ? item.risks : item.dependencies;
  const existing = collection.find((record) => record.id === editor.recordId);
  if (!existing && collection.length >= 100) return failInitiativeRecord(`An initiative can have at most 100 ${editor.kind === "risk" ? "risks" : "dependencies"}.`);
  const selectedOwnerName = organizationPersonName(raw.ownerPersonId);
  let record;
  if (editor.kind === "risk") {
    record = normalizeRiskRecord({
      ...existing,
      id: existing?.id || (editor.pendingRecordId ||= initiativeRecordId("risk")),
      description,
      likelihood: Number(raw.likelihood),
      impact: Number(raw.impact),
      status: raw.status,
      ownerPersonId: raw.ownerPersonId,
      ownerName: String(raw.ownerName || "").trim() || selectedOwnerName,
      mitigation: raw.mitigation,
      reviewDate: raw.reviewDate,
      needsClassification: false,
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp
    });
  } else {
    const targetType = raw.targetType === "initiative" ? "initiative" : "external";
    const targetInitiative = state.items.find((entry) => entry.id === raw.targetInitiativeId);
    const targetName = targetType === "initiative" ? targetInitiative?.title || "" : String(raw.targetName || "").trim();
    if (targetType === "initiative" && !targetInitiative) return failInitiativeRecord("Choose an initiative target.", "[name=targetInitiativeId]");
    if (!targetName) return failInitiativeRecord("Target name is required for an external dependency.", "[name=targetName]");
    record = normalizeDependencyRecord({
      ...existing,
      id: existing?.id || (editor.pendingRecordId ||= initiativeRecordId("dependency")),
      description,
      targetType,
      targetInitiativeId: targetType === "initiative" ? targetInitiative.id : "",
      targetName,
      status: raw.status,
      ownerPersonId: raw.ownerPersonId,
      ownerName: String(raw.ownerName || "").trim() || selectedOwnerName,
      neededBy: raw.neededBy,
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp
    });
  }
  const nextCollection = existing ? collection.map((entry) => entry.id === existing.id ? record : entry) : [...collection, record];
  const patch = editor.kind === "risk" ? { risks: nextCollection } : { dependencies: nextCollection };
  if (editor.convertFromRiskId) patch.risks = item.risks.filter((entry) => entry.id !== editor.convertFromRiskId);
  const verb = editor.convertFromRiskId ? "Converted" : existing ? "Updated" : "Added";
  const actionContext = editor.actionContext;
  editor.saving = true;
  const scope = captureDocumentArtifactScope();
  render();
  try {
    await commitInitiativeRecordPatch(item, patch, initiativeRecordAnnouncement(verb, editor.kind, record.description), editor.kind, actionContext, { editor, recordId: record.id, scope });
  } finally {
    editor.saving = false;
    if (documentArtifactScopeIsCurrent(scope) && state.initiativeDetail.recordEditor === editor) {
      render();
      if (editor.error) focusAfterRender("initiativeRecordError");
    }
  }
}

function failInitiativeRecord(message, selector = "[name=description]") {
  state.initiativeDetail.recordEditor.error = message;
  const error = document.querySelector("#initiativeRecordError");
  if (error) error.textContent = message;
  document.querySelector(`#initiativeRecordForm ${selector}`)?.focus();
}

async function setInitiativeRecordStatus(kind, recordId, status) {
  if (teamEditorReadOnlyReason()) return;
  const item = initiativeDetailItem();
  const field = kind === "risk" ? "risks" : "dependencies";
  const record = item?.[field].find((entry) => entry.id === recordId);
  if (!item || !record) return;
  const next = item[field].map((entry) => entry.id === recordId ? { ...entry, status, updatedAt: new Date().toISOString() } : entry);
  if (kind === "risk" && ["accepted", "resolved"].includes(status)) state.initiativeDetail.showClosedRisks = true;
  if (kind === "dependency" && status === "resolved") state.initiativeDetail.showClosedDependencies = true;
  state.initiativeDetail.focusRecordId = recordId;
  await commitInitiativeRecordPatch(item, { [field]: next }, initiativeRecordAnnouncement(status === "resolved" ? "Resolved" : status === "accepted" ? "Accepted" : "Reopened", kind, record.description), kind);
}

async function deleteInitiativeRecord(kind, recordId, trigger) {
  if (teamEditorReadOnlyReason()) return;
  const item = initiativeDetailItem();
  const field = kind === "risk" ? "risks" : "dependencies";
  const record = item?.[field].find((entry) => entry.id === recordId);
  if (!item || !record) return;
  const confirmed = await requestDataConfirmation({
    title: `Delete ${kind}?`,
    description: `This permanently removes “${record.description}”. Resolve it instead when the history should be retained.`,
    confirmLabel: `Delete ${kind}`,
    trigger
  });
  if (!confirmed) return;
  state.initiativeDetail.focusRecordId = "";
  await commitInitiativeRecordPatch(item, { [field]: item[field].filter((entry) => entry.id !== recordId) }, initiativeRecordAnnouncement("Deleted", kind, record.description), kind);
}

async function commitInitiativeRecordPatch(item, patch, announcement, kind, actionContext = null, savedRecord = null) {
  const scope = savedRecord?.scope || captureDocumentArtifactScope();
  const scopeCurrent = () => documentArtifactScopeIsCurrent(scope);
  const finishSavedDraft = () => {
    if (!savedRecord) return;
    if (initiativeRecordDrafts.get(savedRecord.editor.key) === savedRecord.editor) initiativeRecordDrafts.delete(savedRecord.editor.key);
    if (scopeCurrent() && state.initiativeDetail.recordEditor === savedRecord.editor) {
      state.initiativeDetail.recordEditor = createInitiativeDetailState().recordEditor;
      state.initiativeDetail.focusRecordId = savedRecord.recordId;
    }
  };
  if (kind === "dependency" && findDependencyCycles(state.items.map((entry) => entry.id === item.id ? { ...entry, ...patch } : entry)).some((cycle) => cycle.itemIds.includes(item.id))) {
    announcement += " Circular dependency detected. Review the dependency loop before committing to this plan.";
  }
  const change = {};
  for (const field of ["risks", "dependencies"]) {
    if (!Array.isArray(patch[field]) || JSON.stringify(item[field]) === JSON.stringify(patch[field])) continue;
    const before = item[field];
    const after = patch[field];
    const beforeById = new Map(before.map((record) => [record.id, record]));
    const afterIds = new Set(after.map((record) => record.id));
    const added = after.filter((record) => !beforeById.has(record.id)).length;
    const removed = before.filter((record) => !afterIds.has(record.id)).length;
    const updated = after.filter((record) => beforeById.has(record.id) && JSON.stringify(beforeById.get(record.id)) !== JSON.stringify(record)).length;
    change[field] = { from: `${before.length} ${field}`, to: `${after.length} ${field}; added ${added}; updated ${updated}; removed ${removed}` };
  }
  if (!state.team.active) {
    try {
      await commitLocalInitiativeUpdate(updateItem(state.items, item.id, patch), createActivityEntry(`${kind}-updated`, item, change), scope);
    } catch (error) {
      const message = scopeCurrent() ? localInitiativeSaveError(error, Boolean(savedRecord)) : "The project changed while saving. Your draft is retained; check the original project for the saved result before retrying.";
      if (savedRecord && !scopeCurrent()) savedRecord.editor.requiresReview = true;
      if (savedRecord) {
        savedRecord.editor.error = message;
        const errorNode = scopeCurrent() && state.initiativeDetail.recordEditor === savedRecord.editor ? document.querySelector("#initiativeRecordError") : null;
        if (errorNode) {
          errorNode.textContent = message;
          errorNode.tabIndex = -1;
          errorNode.focus();
        }
      } else {
        state.editorAnnouncement = message;
        render();
        const dialog = document.querySelector("#initiativeDetailDialog");
        if (dialog) {
          const errorNode = document.createElement("p");
          errorNode.className = "initiative-editor-error";
          errorNode.setAttribute("role", "alert");
          errorNode.tabIndex = -1;
          errorNode.textContent = message;
          (dialog.querySelector(".initiative-detail-body") || dialog).prepend(errorNode);
          queueMicrotask(() => errorNode.focus());
        }
      }
      return;
    }
    finishSavedDraft();
    if (!scopeCurrent()) return;
    if (actionContext) finishActionMutation(actionContext, announcement);
    else {
      state.editorAnnouncement = announcement;
      render();
      focusInitiativeRecordAfterRender();
    }
    return;
  }
  state.team.mutationBusy = true;
  render();
  let saved = false;
  try {
    const result = await scope.repository.updateItem(item.id, patch, item.version);
    if (!scopeCurrent()) {
      if (savedRecord) {
        savedRecord.editor.requiresReview = true;
        savedRecord.editor.error = "The save completed in the original project. Your draft is retained; reopen that project and check its saved record before discarding.";
      }
      return;
    }
    if (!result?.snapshot || !applyTeamSnapshot(result.snapshot)) {
      if (savedRecord) savedRecord.editor.requiresReview = true;
      throw new Error("The server did not confirm the save. Your draft is retained; check the saved record before retrying.");
    }
    finishSavedDraft();
    state.team.conflict = null;
    state.team.status = "Team workspace updated.";
    state.editorAnnouncement = announcement;
    saved = true;
  } catch (error) {
    if (savedRecord) {
      if (isAmbiguousTeamError(error)) savedRecord.editor.requiresReview = true;
      savedRecord.editor.error = isTeamConflict(error) || isAmbiguousTeamError(error)
        ? "The saved record changed or the save could not be confirmed. Your draft is retained. Reopen the project to review its latest saved values before retrying."
        : safeTeamError(error, `The ${kind} could not be saved. Your draft is retained.`);
      if (scopeCurrent()) {
        state.team.status = savedRecord.editor.error;
        if (isTeamConflict(error) || isAmbiguousTeamError(error)) {
          try {
            const latest = await scope.repository.open();
            if (scopeCurrent()) applyTeamSnapshot(latest?.snapshot || latest);
          } catch { /* Preserve the raw draft when the latest workspace is unavailable. */ }
        }
        if (isTeamAccessLoss(error)) await exitTeamForBoundary(teamAccessLossMessage(error));
      }
    } else if (!scopeCurrent()) return;
    else if (isTeamConflict(error) || isAmbiguousTeamError(error)) {
      const draft = prepareTeamUpdateDraft({ operation: "update", itemId: item.id, itemTitle: item.title, patch, ambiguous: isAmbiguousTeamError(error) }, item);
      const outcome = draft.ambiguous ? (await preserveTeamConflict(draft), "conflict") : await resolveTeamConflictDraft(draft);
      clearInitiativeDetailUrl();
      state.initiativeDetail = createInitiativeDetailState();
      state.editorAnnouncement = outcome === "retried"
        ? `${announcement} An unrelated server edit was preserved.`
        : "The initiative changed. Your structured record draft is available in conflict review.";
    }
    else if (isTeamAccessLoss(error)) await exitTeamForBoundary(teamAccessLossMessage(error));
    else state.team.status = safeTeamError(error, `The ${kind} could not be saved.`);
  } finally { scope.team.mutationBusy = false; }
  if (!scopeCurrent()) return;
  if (saved && actionContext) finishActionMutation(actionContext, announcement);
  else {
    render();
    focusInitiativeRecordAfterRender();
  }
}

function focusInitiativeRecordAfterRender() {
  const id = state.initiativeDetail.focusRecordId;
  focusAfterRender(id ? `initiative-record-${elementIdToken(id)}` : "initiativeDetailTitle");
}

function initiativeRecordId(kind) {
  return globalThis.crypto?.randomUUID?.() || `${kind}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function activeSourceLabel() {
  if (state.team.active) return state.sourceSelection === "local-server" ? "Local Server" : "Team";
  if (demoMode) return "Demo";
  if (state.sourceSelection === "local-server" || state.sourceSelection === "team") return sourceChoiceLabel(state.sourceSelection);
  return sourceChoiceLabel(state.source.type);
}

function globalSyncLabel() {
  if (state.localWriteConflict) return "Not saved · review newer work";
  if (demoMode) return "Demo only";
  if (state.team.active) {
    if (state.team.connection !== "live") return "Read-only · reconnecting";
    if (state.team.mutationBusy) return "Saving to Team…";
    if (state.dataBusy) return "Preparing Team data…";
    return state.team.role === "viewer" ? "Viewer · read-only" : "Synced with Team";
  }
  if (state.storageWarning) return "Recovery needed · check saved work";
  if (state.dataBusy) return "Preparing your data…";
  if (state.source.type === "google-drive") {
    if (state.driveReview || state.sync.conflict) return "Conflict · review Drive changes";
    if (!navigator.onLine) return state.sync.localPending ? "Offline · Drive sync pending" : "Offline · device copy available";
    if (state.sync.localPending) return state.driveToken ? "Saved on device · Drive sync pending" : "Saved on device · connect Drive to sync";
    if (!state.driveToken) return "Offline · Drive disconnected";
    return state.sync.baseRemote ? "Synced with Drive" : "Drive connected · sync not checked";
  }
  if (state.source.type === "local-file") {
    if (state.linkedFile.permission === "denied") return "Read-only · permission needed";
    if (state.sync.fileConflicts.length) return "Conflict · review linked file";
    if (!state.linkedFile.handle) return "Offline · file unavailable";
    if (state.sync.localPending) return "Saved on device · file save pending";
    return "Saved to linked file";
  }
  return "Saved on this device";
}

function syncIndicatorTone() {
  const label = globalSyncLabel();
  if (/conflict|offline|read-only|pending|recovery|connect Drive|not checked/i.test(label)) return "is-warning";
  if (/Saving|Preparing/.test(label)) return "is-busy";
  return "is-saved";
}

function refreshSaveStatus() {
  if (demoMode) return;
  for (const pill of document.querySelectorAll(".global-sync-pill")) {
    pill.textContent = globalSyncLabel();
    pill.className = `global-sync-pill ${syncIndicatorTone()}`;
  }
  for (const status of document.querySelectorAll("[data-save-status]")) status.textContent = globalSyncLabel();
}

function initiativeDetailDialogMarkup() {
  const detail = state.initiativeDetail;
  if (!detail.selectedId) return "";
  const item = initiativeDetailItem();
  if (!item) {
    return `<dialog class="initiative-detail-dialog" id="initiativeDetailDialog" aria-labelledby="initiativeDetailTitle" aria-describedby="initiativeDetailDescription"><div class="initiative-detail-shell"><header class="initiative-detail-heading"><div><p class="eyebrow">Initiative</p><h3 id="initiativeDetailTitle" tabindex="-1">Initiative unavailable</h3><p id="initiativeDetailDescription">This initiative is not available in the active data source.</p></div><button class="editor-close" id="closeInitiativeDetailButton" type="button" aria-label="Close initiative details" title="Close">X</button></header><div class="initiative-detail-body">${emptyState("It may have been deleted, or this link may belong to a different Browser, Drive, or Team workspace.")}${initiativeRecordDraftRecoveryMarkup()}</div><footer class="initiative-detail-footer"><button class="secondary" id="dismissUnavailableInitiativeButton" type="button">Return to ${escapeHtml(selectedViewDefinition().title)}</button></footer></div></dialog>`;
  }
  const score = workspacePriorityValue(item);
  const readiness = calculateLaunchReadiness(item);
  const recommendations = buildActionQueue([item], new Date(), state.prioritization, actionQueueBuildOptions()).queue;
  const activity = state.activity.filter((entry) => entry.itemId === item.id).slice(0, 20);
  const reason = teamEditorReadOnlyReason();
  const disabled = reason ? "disabled" : "";
  const describedBy = reason ? 'aria-describedby="initiativeDetailReadOnlyReason"' : "";
  return `<dialog class="initiative-detail-dialog" id="initiativeDetailDialog" aria-labelledby="initiativeDetailTitle" aria-describedby="initiativeDetailDescription">
    <div class="initiative-detail-shell">
      <header class="initiative-detail-heading"><div><p class="eyebrow">Initiative</p><h3 id="initiativeDetailTitle" tabindex="-1">${escapeHtml(item.title)}</h3><p id="initiativeDetailDescription">Canonical initiative details from the active ${escapeHtml(activeSourceLabel())} workspace.</p></div><button class="editor-close" id="closeInitiativeDetailButton" type="button" aria-label="Close ${escapeHtml(item.title)} details" title="Close">X</button></header>
      <div class="initiative-detail-body">
        ${detail.missingLinkMessage ? `<p class="route-notice" id="initiativeMissingLinkStatus" role="status">${escapeHtml(detail.missingLinkMessage)}</p>` : ""}
        ${initiativeRecordDraftRecoveryMarkup()}
        <section class="initiative-detail-summary" aria-label="Initiative summary"><span class="pill status-pill status-${escapeHtml(statusForInitiative(state.workflow, item).color)}">${escapeHtml(initiativeStatusLabel(item))}</span><div class="initiative-detail-scores"><p><span>${escapeHtml(workspacePriorityLabel())}</span><strong>${escapeHtml(score)}</strong></p><p><span>Launch readiness</span><strong>${readiness}%</strong></p></div><dl class="initiative-detail-facts"><div class="initiative-detail-targets"><dt>Customer targets</dt><dd>${initiativeTargetChips(item, 12)}</dd></div><div><dt>Point of contact</dt><dd>${escapeHtml(organizationPersonName(item.pocPersonId) || item.owner || "Unassigned")}</dd></div><div><dt>Organization unit</dt><dd>${escapeHtml(organizationUnitPath(item.orgUnitId) || "Unassigned")}</dd></div><div><dt>Planned timeline</dt><dd>${escapeHtml(describeInitiativeTimeline(item, state.planningCalendar))}</dd></div><div><dt>Last updated</dt><dd>${escapeHtml(formatSyncTime(item.updatedAt))}</dd></div></dl></section>
        <section class="initiative-detail-section" aria-labelledby="initiativeProblemTitle"><h4 id="initiativeProblemTitle">Problem and priority</h4><p>${escapeHtml(item.problem || "No problem statement captured.")}</p>${initiativePriorityFactsMarkup(item)}</section>
        <section class="initiative-detail-section" aria-labelledby="initiativeMeasureTitle"><h4 id="initiativeMeasureTitle">Authored measure</h4><p>Saved intent; achievement requires observed results.</p><dl class="initiative-detail-facts stacked">${[["Objective", item.objective], ["Primary metric", item.primaryMetric], ["Metric target", item.metricTarget], ["Metric review date", item.metricReviewDate]].map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value || "Not recorded")}</dd></div>`).join("")}</dl>${initiativeContextualEditButton(item, "detail-measure", "primaryMetric", "Edit measure")}</section>
        <section class="initiative-detail-section" aria-labelledby="initiativeExecutionTitle"><h4 id="initiativeExecutionTitle">Current execution</h4><dl class="initiative-detail-facts stacked"><div><dt>Next step</dt><dd>${escapeHtml(item.nextStep || "No next step captured.")}</dd></div></dl></section>
        ${initiativeSavedActionsMarkup(item)}
        ${initiativeSavedDecisionsMarkup(item)}
        ${initiativeRecordCollectionMarkup("risk", item, reason)}
        ${initiativeRecordCollectionMarkup("dependency", item, reason)}
        <section class="initiative-detail-section" aria-labelledby="initiativeEvidenceTitle"><h4 id="initiativeEvidenceTitle">Experiment and research</h4>${initiativeSavedValidationsMarkup(item)}${initiativeLinkedLearningMarkup(item)}</section>
        <section class="initiative-detail-section" aria-labelledby="initiativeActionsTitle"><div class="initiative-detail-section-heading"><h4 id="initiativeActionsTitle">Recommended actions</h4><span class="muted">Derived from current gaps</span></div><div class="initiative-detail-action-list">${recommendations.map(detailRecommendationCard).join("") || emptyState("No immediate follow-ups detected for this initiative.")}</div></section>
        <section class="initiative-detail-section" aria-labelledby="initiativeActivityTitle"><div class="initiative-detail-section-heading"><h4 id="initiativeActivityTitle">Activity</h4><span class="muted">${activity.length} matching events</span></div><div class="initiative-detail-activity">${activity.map((entry) => `<article><time datetime="${escapeHtml(entry.createdAt)}">${escapeHtml(new Date(entry.createdAt).toLocaleString())}</time><h5>${escapeHtml(entry.action)} by ${escapeHtml(entry.actor)}</h5><p>${escapeHtml(formatActivityChanges(entry.changes))}</p></article>`).join("") || emptyState("No activity has been recorded for this initiative yet.")}</div></section>
        <nav class="initiative-related-views" aria-label="Related initiative views"><span>Related views</span>${initiativeRelatedViews(item).map((view) => `<button class="secondary small" data-detail-view="${escapeHtml(view.deepLink)}" type="button">${escapeHtml(view.label)}</button>`).join("")}</nav>
      </div>
      <footer class="initiative-detail-footer">${reason ? `<p id="initiativeDetailReadOnlyReason">${escapeHtml(reason)}</p>` : ""}<button class="primary" id="editInitiativeFromDetail" data-edit-item="${escapeHtml(item.id)}" type="button" aria-label="Edit ${escapeHtml(item.title)}" ${disabled} ${describedBy}>Edit initiative</button></footer>
    </div>
  </dialog>`;
}

function initiativeRecordCollectionMarkup(kind, item, reason) {
  const risk = kind === "risk";
  const records = risk ? item.risks : item.dependencies;
  const closed = records.filter((record) => risk ? ["accepted", "resolved"].includes(record.status) : record.status === "resolved");
  const active = records.filter((record) => !closed.includes(record));
  const showClosed = risk ? state.initiativeDetail.showClosedRisks : state.initiativeDetail.showClosedDependencies;
  const visible = showClosed ? [...active, ...closed] : active;
  const plural = risk ? "Risks" : "Dependencies";
  const sectionId = `initiative${plural}Title`;
  const disabled = reason ? "disabled" : "";
  const describedBy = reason ? 'aria-describedby="initiativeDetailReadOnlyReason"' : "";
  const editorOpen = state.initiativeDetail.recordEditor.kind === kind;
  const collection = kind === "dependency" ? "dependencies" : "risks";
  return `<section class="initiative-detail-section initiative-record-section" id="initiative-${collection}" aria-labelledby="${sectionId}">
    <div class="initiative-detail-section-heading"><div><h4 id="${sectionId}" tabindex="-1">${plural}</h4><span class="muted">${active.length} active${closed.length ? ` · ${closed.length} closed` : ""}</span></div><div class="initiative-record-section-actions">${closed.length ? `<button class="secondary small" data-toggle-closed="${kind}" type="button" aria-expanded="${showClosed}">${showClosed ? "Hide closed" : "Show closed"}</button>` : ""}<button class="secondary small" id="addInitiative${risk ? "Risk" : "Dependency"}" data-add-record="${kind}" type="button" ${disabled} ${describedBy}>Add ${kind}</button></div></div>
    ${risk ? "" : dependencyCycleWarnings([item], "detail", false)}
    ${editorOpen ? initiativeRecordFormMarkup(kind, item) : ""}
    <div class="initiative-record-list">${visible.map((record) => initiativeRecordCardMarkup(kind, record, item, reason)).join("") || emptyState(`No ${risk ? "active risks" : "dependencies"} captured.`)}</div>
  </section>`;
}

function initiativeRecordCardMarkup(kind, record, item, reason) {
  const risk = kind === "risk";
  const closed = risk ? ["accepted", "resolved"].includes(record.status) : record.status === "resolved";
  const owner = resolveRecordOwner(record, item, state.organization);
  const statusLabel = risk ? riskStatusLabels[record.status] : dependencyStatusLabels[record.status];
  const targetMissing = !risk && record.targetType === "initiative" && !state.items.some((entry) => entry.id === record.targetInitiativeId);
  const statusAction = closed ? (risk ? "open" : "pending") : "resolved";
  const disabled = reason ? "disabled" : "";
  const describedBy = reason ? 'aria-describedby="initiativeDetailReadOnlyReason"' : "";
  const token = elementIdToken(record.id);
  const signalClass = risk ? `risk-${riskSeverityLabel(record).toLowerCase()}` : `dependency-${record.status}`;
  const primarySignal = risk
    ? `<span class="record-severity">${riskSeverityLabel(record)} exposure · ${riskSeverityScore(record)}/100</span>`
    : `<span class="record-severity">Urgency · ${dependencyUrgency(record, item)}/100</span>`;
  return `<article class="initiative-record-card ${signalClass} ${closed ? "closed" : ""}" id="initiative-record-${elementIdToken(record.id)}" data-record-id="${escapeHtml(record.id)}" tabindex="-1">
    <div class="initiative-record-card-heading"><div>${primarySignal}<span class="record-status">${escapeHtml(statusLabel)}</span>${record.needsClassification ? `<span class="record-flag">Needs classification</span>` : ""}${targetMissing ? `<span class="record-flag">Target unavailable</span>` : ""}</div>${!risk ? `<strong>${escapeHtml(record.targetName)}</strong>` : ""}</div>
    <h5>${escapeHtml(record.description)}</h5>
    <dl class="initiative-record-facts"><div><dt>Owner</dt><dd>${escapeHtml(owner)}</dd></div>${risk ? `<div><dt>Likelihood / impact</dt><dd>${record.likelihood} / 5 · ${record.impact} / 5</dd></div><div><dt>Review</dt><dd>${escapeHtml(record.reviewDate || "Not set")}</dd></div><div><dt>Mitigation</dt><dd>${escapeHtml(record.mitigation || "Not captured")}</dd></div>` : `<div><dt>Target</dt><dd>${escapeHtml(record.targetName)}</dd></div><div><dt>Needed by</dt><dd>${escapeHtml(record.neededBy || "Not set")}</dd></div>`}</dl>
    <div class="initiative-record-actions"><button class="secondary small" id="edit-${kind}-${token}" data-edit-record="${kind}" data-record-id="${escapeHtml(record.id)}" type="button" ${disabled} ${describedBy}>${risk && record.needsClassification ? "Classify" : "Edit"}</button>${risk && record.needsClassification ? `<button class="secondary small" id="convert-risk-${token}" data-convert-risk="${escapeHtml(record.id)}" type="button" ${disabled} ${describedBy}>Convert to dependency</button>` : ""}${risk && !closed ? `<button class="secondary small" data-set-record-status="accepted" data-record-kind="risk" data-record-id="${escapeHtml(record.id)}" type="button" ${disabled} ${describedBy}>Accept</button>` : ""}<button class="secondary small" data-set-record-status="${statusAction}" data-record-kind="${kind}" data-record-id="${escapeHtml(record.id)}" type="button" ${disabled} ${describedBy}>${closed ? "Reopen" : "Resolve"}</button><button class="danger small" data-delete-record="${kind}" data-record-id="${escapeHtml(record.id)}" type="button" ${disabled} ${describedBy}>Delete</button></div>
  </article>`;
}

function initiativeRecordFormMarkup(kind, item) {
  const editor = state.initiativeDetail.recordEditor;
  const risk = kind === "risk";
  const collection = risk ? item.risks : item.dependencies;
  const existing = collection.find((record) => record.id === editor.recordId);
  const defaults = risk
    ? { description: "", likelihood: 3, impact: 3, status: "open", ownerPersonId: "", ownerName: "", mitigation: "", reviewDate: "", needsClassification: false }
    : { description: "", targetType: "external", targetInitiativeId: "", targetName: "", status: "pending", ownerPersonId: "", ownerName: "", neededBy: "" };
  const value = { ...defaults, ...(existing || {}), ...(editor.draft || {}) };
  const missingTarget = value.targetInitiativeId && !state.items.some(entry => entry.id === value.targetInitiativeId);
  const missingOwner = value.ownerPersonId && !state.organization.people.some(person => person.id === value.ownerPersonId);
  const otherInitiatives = (missingTarget ? `<option value="${escapeHtml(value.targetInitiativeId)}" selected>Unavailable initiative (${escapeHtml(value.targetInitiativeId)})</option>` : "") + state.items.filter((entry) => entry.id !== item.id).map((entry) => `<option value="${escapeHtml(entry.id)}" ${value.targetInitiativeId === entry.id ? "selected" : ""}>${escapeHtml(entry.title)}</option>`).join("");
  const editorHeading = editor.actionContext?.heading || `${existing ? "Edit" : editor.convertFromRiskId ? "Convert to" : "Add"} ${kind}`;
  const editorDescription = editor.actionContext?.requestedOutcome || "";
  return `<form class="initiative-record-form" id="initiativeRecordForm" data-record-kind="${kind}" aria-busy="${Boolean(editor.saving)}" novalidate><fieldset style="display:contents" ${editor.saving ? "disabled" : ""}>
    <div class="initiative-record-form-heading"><div><h5 id="initiativeRecordEditorTitle">${escapeHtml(editorHeading)}</h5>${editorDescription ? `<p>${escapeHtml(editorDescription)}</p>` : ""}</div><button class="text-button" id="cancelInitiativeRecord" type="button">Cancel</button></div>
    <p id="initiativeRecordDraftStatus" role="status">${editor.draft ? "Unsaved draft. " : ""}Edits stay in this tab while you navigate. Save or download before reloading or closing the tab. Cancel discards this draft; Escape keeps it.</p>
    ${editor.draft ? `<button class="secondary small" type="button" data-download-record-draft="${escapeHtml(editor.key)}">Download ${kind} draft</button>` : ""}
    <label class="record-wide"><span>Description</span><textarea name="description" maxlength="1000" required>${escapeHtml(value.description)}</textarea></label>
    ${risk ? `<div class="initiative-record-form-grid"><label><span>Likelihood</span><select name="likelihood">${[1,2,3,4,5].map((score) => `<option value="${score}" ${Number(value.likelihood) === score ? "selected" : ""}>${score}</option>`).join("")}</select></label><label><span>Impact</span><select name="impact">${[1,2,3,4,5].map((score) => `<option value="${score}" ${Number(value.impact) === score ? "selected" : ""}>${score}</option>`).join("")}</select></label><label><span>Status</span><select name="status">${Object.entries(riskStatusLabels).map(([status,label]) => `<option value="${status}" ${value.status === status ? "selected" : ""}>${label}</option>`).join("")}</select></label><label><span>Review date</span><input name="reviewDate" type="date" value="${escapeHtml(value.reviewDate)}"></label></div><label class="record-wide"><span>Mitigation</span><textarea name="mitigation" maxlength="2000">${escapeHtml(value.mitigation)}</textarea></label>` : `<div class="initiative-record-form-grid"><label><span>Target type</span><select name="targetType"><option value="external" ${value.targetType === "external" ? "selected" : ""}>External</option><option value="initiative" ${value.targetType === "initiative" ? "selected" : ""}>Initiative</option></select></label><label data-target-field="initiative" ${value.targetType === "initiative" ? "" : "hidden"}><span>Initiative target</span><select name="targetInitiativeId"><option value="">Select initiative</option>${otherInitiatives}</select></label><label data-target-field="external" ${value.targetType === "initiative" ? "hidden" : ""}><span>External target name</span><input name="targetName" maxlength="500" value="${escapeHtml(value.targetName)}" placeholder="Team, vendor, or approval"></label><label><span>Status</span><select name="status">${Object.entries(dependencyStatusLabels).map(([status,label]) => `<option value="${status}" ${value.status === status ? "selected" : ""}>${label}</option>`).join("")}</select></label><label><span>Needed by</span><input name="neededBy" type="date" value="${escapeHtml(value.neededBy)}"></label></div>`}
    <div class="initiative-record-form-grid"><label><span>Organization owner</span><select name="ownerPersonId"><option value="">Unlinked</option>${missingOwner ? `<option value="${escapeHtml(value.ownerPersonId)}" selected>Unavailable owner (${escapeHtml(value.ownerPersonId)})</option>` : ""}${personOptions(state.organization, value.ownerPersonId)}</select></label><label><span>External or fallback owner</span><input name="ownerName" maxlength="300" value="${escapeHtml(value.ownerName)}"></label></div>
    <p class="initiative-editor-error" id="initiativeRecordError" tabindex="-1" role="alert">${escapeHtml(editor.error || recordDraftSaveError(item, editor, initiativeRecordDraftScope()))}</p><button class="primary" type="submit">${editor.saving ? "Saving..." : `Save ${kind}`}</button>
  </fieldset></form>`;
}

function initiativePriorityFactsMarkup(item) {
  const result = priorityDisplay(item, state.prioritization, state.items);
  const facts = result.breakdown.length
    ? result.breakdown.map((entry) => `<div><dt>${escapeHtml(entry.label)}</dt><dd>${escapeHtml(entry.value)}</dd></div>`)
    : [`<div><dt>${escapeHtml(result.method.label)}</dt><dd>${escapeHtml(result.valueLabel)}</dd></div>`];
  if (result.missing.length) facts.push(`<div><dt>Missing inputs</dt><dd>${escapeHtml(result.missing.join(", "))}</dd></div>`);
  if (result.method.id !== "rice") {
    facts.push(`<div><dt>Evidence confidence</dt><dd>${confidencePercent(item.confidence)}%</dd></div>`);
    facts.push(`<div><dt>Delivery effort</dt><dd>${item.effort}</dd></div>`);
  }
  return `<dl class="initiative-detail-facts compact">${facts.join("")}</dl>`;
}

function detailRecommendationCard(entry, index) {
  const control = actionCompletionControl(entry, { context: `detail-${index}`, index, origin: "detail" });
  return `<article class="initiative-detail-action" data-action-entry="${escapeHtml(entry.id)}"><div><span>${escapeHtml(entry.type)}</span><p>${escapeHtml(entry.action)}</p>${entry.availability === "read-only" ? `<small>Read-only · ${escapeHtml(entry.unavailableReason)}</small>` : ""}</div>${control}</article>`;
}

function initiativeRelatedViews(item) {
  const deepLinks = ["actions"];
  if (item.status === "intake" || item.status === "discovery") deepLinks.push("discovery", "validation");
  if (item.status === "committed") deepLinks.push("delivery", "launch", "rollouts");
  if (activeRisks(item).length || item.experiment || item.decision) deepLinks.push("decisions");
  if (activeRisks(item).length) deepLinks.push("support", "escalations");
  return [...new Set(deepLinks)].map((deepLink) => viewByDeepLink.get(deepLink)).filter(Boolean);
}

function openInitiativeDetail(itemId, trigger, { replaceDetail = false } = {}) {
  if (!itemId) return;
  const triggerId = replaceDetail ? state.initiativeDetail.triggerId : trigger?.id || "";
  const historyOwned = replaceDetail ? state.initiativeDetail.historyOwned : true;
  const focusSection = trigger?.dataset.detailSection || "";
  const focusRecordId = trigger?.dataset.detailRecord || "";
  state.initiativeDetail = revealFocusedInitiativeRecord(
    createInitiativeDetailState({ selectedId: itemId, triggerId, historyOwned, focusSection, focusRecordId }),
    state.items.find((item) => item.id === itemId)
  );
  if (state.initiativeDetail.focusRecordId) {
    const kind = state.initiativeDetail.focusSection === "dependencies" ? "dependency" : "risk";
    state.editorAnnouncement = `Opened linked ${kind} record.`;
  }
  const url = new URL(location.href);
  url.searchParams.set("view", state.selectedView);
  url.searchParams.set("initiative", itemId);
  if (state.initiativeDetail.focusSection) url.searchParams.set("section", state.initiativeDetail.focusSection); else url.searchParams.delete("section");
  if (state.initiativeDetail.focusRecordId) url.searchParams.set("record", state.initiativeDetail.focusRecordId); else url.searchParams.delete("record");
  if (demoMode) url.searchParams.set("demo", "1");
  history[replaceDetail ? "replaceState" : "pushState"]({ view: state.selectedView, initiative: itemId, detailOpenedFromUi: historyOwned, detailTriggerId: triggerId }, "", url);
  persistCurrentProjectLocation();
  render();
}

function requestInitiativeDetailClose() {
  document.querySelector("#initiativeDetailDialog")?.close("close");
}

function finishInitiativeDetailClose() {
  const detail = state.initiativeDetail;
  if (!detail.selectedId) return;
  if (detail.historyOwned && new URLSearchParams(location.search).get("initiative") === detail.selectedId) {
    pendingInitiativeDetailReturnFocusId = detail.triggerId;
    history.back();
    return;
  }
  const returnFocusId = detail.triggerId;
  clearInitiativeDetailUrl();
  state.initiativeDetail = createInitiativeDetailState();
  render();
  focusAfterRender(returnFocusId);
}

function navigateFromInitiativeDetail(deepLink) {
  const nextView = viewByDeepLink.get(deepLink);
  if (!nextView) return;
  const changed = state.selectedView !== nextView.deepLink;
  state.selectedView = nextView.deepLink;
  state.expandedNavGroup = nextView.group === primaryViewGroup ? "" : nextView.group;
  state.query = "";
  state.initiativeDetail = createInitiativeDetailState();
  if (changed) recordViewUsage(nextView.deepLink);
  const url = new URL(location.href);
  url.searchParams.set("view", nextView.deepLink);
  url.searchParams.delete("initiative");
  url.searchParams.delete("section");
  url.searchParams.delete("record");
  if (demoMode) url.searchParams.set("demo", "1");
  history.pushState({ view: nextView.deepLink }, "", url);
  render();
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  focusAfterRender("viewTitle");
}

function clearInitiativeDetailUrl() {
  state.initiativeDetail = createInitiativeDetailState();
  const url = new URL(location.href);
  url.searchParams.delete("initiative");
  url.searchParams.delete("section");
  url.searchParams.delete("record");
  history.replaceState({ view: state.selectedView }, "", url);
  persistCurrentProjectLocation();
}

function focusAfterRender(id = "") {
  queueMicrotask(() => {
    const requested = id ? document.getElementById(id) : null;
    const fallback = document.querySelector(state.initiativeDetail.selectedId ? "#initiativeDetailTitle" : "#viewTitle");
    (requested || fallback)?.focus();
  });
}

function createInitiativeEditorState(overrides = {}) {
  return {
    mode: "",
    selectedId: "",
    selectedFromCard: false,
    search: "",
    draft: null,
    error: "",
    saving: false,
    triggerId: "",
    focusField: "",
    actionContext: null,
    targetPickerOpen: false,
    targetPickerKind: "segments",
    targetQuery: "",
    ...overrides
  };
}

function createInsightEditorState(overrides = {}) {
  return { mode: "", type: "discovery", selectedId: "", draft: null, error: "", saving: false, triggerId: "", backStack: [], ...overrides };
}

function insightCommandLabel(type) {
  return ({ discovery: "New discovery", research: "New study", validation: "New experiment", feedback: "Add feedback", support: "New support case", action: "New action", decision: "New decision" })[type] || "New record";
}

function insightCommandsMarkup() {
  const type = ["discovery", "research", "validation", "feedback", "support"].includes(state.selectedMode) ? state.selectedMode : "discovery";
  const reason = teamEditorReadOnlyReason();
  return `<div class="initiative-command-block"><div class="initiative-commands" role="group" aria-label="${escapeHtml(INSIGHT_TYPE_LABELS[type])} commands"><button class="primary" id="newInsightButton" data-new-insight="${type}" type="button" ${reason ? "disabled" : ""}>${escapeHtml(insightCommandLabel(type))}</button></div>${reason ? `<p class="initiative-readonly-reason" id="initiativeReadOnlyReason">${escapeHtml(reason)}</p>` : ""}</div>`;
}

function insightEditorRecord() {
  return state.insightRecords.find((record) => record.id === state.insightEditor.selectedId) || null;
}

function blankInsightValues(type) {
  const common = { type, title: "", status: INSIGHT_STATUSES[type]?.[0] || "open", owner: "", ownerPersonId: "", customerIds: [], segmentIds: [], initiativeId: "", relatedRecordIds: [], tags: [] };
  if (type === "discovery") return { ...common, problem: "", hypothesis: "", confidence: 0.5, nextStep: "" };
  if (type === "research") return { ...common, objective: "", questions: [], method: "", recruitmentTarget: 5, participantCount: 0, findings: "", dueDate: "" };
  if (type === "validation") return { ...common, hypothesis: "", method: "", successMetric: "", result: "", decision: "", decisionNotes: "", dueDate: "" };
  if (type === "decision") return { ...common, question: "", outcome: "", rationale: "", decidedAt: "" };
  if (type === "action") return { ...common, description: "", dueDate: "", sourceRecordId: "", enablementArea: "", completionEvidence: "" };
  if (type === "feedback") return { ...common, source: "", sourceRef: "", signal: "", receivedAt: todayStamp(), urgency: 3 };
  return { ...common, source: "", sourceRef: "", issue: "", customerImpact: "", severity: "medium", responseDueDate: "", resolution: "" };
}

function insightRelationshipEntries(field, values) {
  const entries = field === "customerIds" ? state.customerDirectory.accounts.map(entry => ({ id: entry.id, label: entry.name, detail: [entry.domain, entry.industry, entry.region].filter(Boolean).join(" · ") }))
    : field === "segmentIds" ? state.customerDirectory.segments.map(entry => ({ id: entry.id, label: entry.name, detail: segmentRuleSummary(entry) }))
      : state.insightRecords.filter(entry => entry.id !== state.insightEditor.selectedId).map(entry => ({ id: entry.id, label: `${INSIGHT_TYPE_LABELS[entry.type]}: ${entry.title}`, detail: INSIGHT_STATUS_LABELS[entry.status] || entry.status }));
  for (const id of values[field] || []) {
    if (!entries.some(entry => entry.id === id)) entries.push({ id, label: `Unavailable record (${id})`, detail: "Existing link retained. Remove it only if intended." });
  }
  return entries;
}

function insightRelationshipMarkup(field, title, values) {
  const selected = new Set(values[field] || []);
  const entries = insightRelationshipEntries(field, values);
  const query = state.insightEditor.relationshipQueries?.[field] || "";
  return `<fieldset class="initiative-wide-field insight-relationships" data-insight-relationship="${field}"><legend>${title}</legend>
    <div class="initiative-target-chip-list" data-relationship-chips role="group" aria-label="Selected ${title.toLowerCase()}"></div>
    <label class="initiative-target-search"><span>Search ${title.toLowerCase()}</span><input type="search" data-relationship-search value="${escapeHtml(query)}" autocomplete="off" aria-controls="insight-relationship-${field}"></label>
    <p data-relationship-summary role="status" aria-live="polite" aria-atomic="true"></p>
    <div class="initiative-target-results" id="insight-relationship-${field}">${entries.map(entry => `<label class="initiative-target-option" data-relationship-option data-search-text="${escapeHtml(`${entry.label} ${entry.detail}`.toLowerCase())}"><input type="checkbox" name="${field}" value="${escapeHtml(entry.id)}" aria-label="${escapeHtml(entry.label)}" ${selected.has(entry.id) ? "checked" : ""}><span><strong>${escapeHtml(entry.label)}</strong><small>${escapeHtml(entry.detail)}</small></span></label>`).join("")}</div>
    <p class="initiative-target-no-results" data-relationship-empty hidden>${entries.length ? "No matches. Try another search; your selected links are kept." : "No records available to link yet."}</p>
  </fieldset>`;
}

function refreshInsightRelationship(section) {
  const query = section.querySelector("[data-relationship-search]").value.trim().toLowerCase();
  const options = [...section.querySelectorAll("[data-relationship-option]")];
  const selected = options.map(option => option.querySelector("input")).filter(input => input.checked);
  let shown = 0;
  options.forEach(option => { option.hidden = !option.dataset.searchText.includes(query); if (!option.hidden) shown += 1; });
  section.querySelector("[data-relationship-summary]").textContent = `${selected.length} selected · ${shown} of ${options.length} shown`;
  section.querySelector("[data-relationship-empty]").hidden = shown > 0;
  section.querySelector("[data-relationship-chips]").innerHTML = selected.map(input => `<button class="initiative-target-chip" type="button" data-remove-insight-relationship="${escapeHtml(input.value)}" aria-label="Remove ${escapeHtml(input.getAttribute("aria-label"))}"><strong>${escapeHtml(input.getAttribute("aria-label"))}</strong><b aria-hidden="true">×</b></button>`).join("");
}

function bindInsightRelationships() {
  const form = document.querySelector("#insightEditorForm");
  if (!form) return;
  form.querySelectorAll("[data-insight-relationship]").forEach(refreshInsightRelationship);
  form.addEventListener("input", event => {
    const section = event.target.closest("[data-insight-relationship]");
    if (!section) return;
    if (event.target.matches("[data-relationship-search]")) {
      state.insightEditor.relationshipQueries ||= {};
      state.insightEditor.relationshipQueries[section.dataset.insightRelationship] = event.target.value;
    }
    refreshInsightRelationship(section);
  });
  form.addEventListener("click", event => {
    const button = event.target.closest("[data-remove-insight-relationship]");
    if (!button) return;
    const section = button.closest("[data-insight-relationship]");
    const input = [...section.querySelectorAll('input[type="checkbox"]')].find(input => input.value === button.dataset.removeInsightRelationship);
    if (!input || input.disabled || input.closest("fieldset[disabled]")) return;
    input.checked = false;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    section.querySelector("[data-relationship-search]").focus();
  });
}

function insightEditorDialogMarkup() {
  const editor = state.insightEditor;
  if (!editor.mode) return "";
  const record = insightEditorRecord();
  const values = { ...blankInsightValues(editor.type), ...(record || {}), ...(editor.draft || {}) };
  const viewing = editor.mode === "view";
  const editing = editor.mode === "edit";
  const typeLabel = INSIGHT_TYPE_LABELS[editor.type] || "Insight record";
  const title = editor.actionContext?.heading || (viewing ? typeLabel : editing ? `Edit ${typeLabel.toLowerCase()}` : insightCommandLabel(editor.type));
  const initiativeOptions = state.items.map((item) => `<option value="${escapeHtml(item.id)}" ${values.initiativeId === item.id ? "selected" : ""}>${escapeHtml(item.title)}</option>`).join("");
  const canPromote = editor.type === "discovery" && values.status === "validated" && !values.initiativeId && !viewing;
  return `<dialog class="initiative-editor-dialog insight-editor-dialog" id="insightEditorDialog" aria-modal="true" aria-busy="${editor.saving}" aria-labelledby="insightEditorTitle" aria-describedby="insightEditorDescription"><form id="insightEditorForm" novalidate><div class="initiative-editor-heading"><div><p class="eyebrow">${["action", "decision"].includes(editor.type) ? "Work" : "Insights"} · ${escapeHtml(typeLabel)}</p><h3 id="insightEditorTitle">${escapeHtml(title)}</h3><p id="insightEditorDescription">${editor.actionContext?.requestedOutcome ? escapeHtml(editor.actionContext.requestedOutcome) : viewing ? "Review this saved record and its links." : editor.type === "decision" ? "Record the question, outcome and rationale. Pending and Revisit keep the decision open for review." : editor.type === "action" ? "Keep the work, owner and evidence together. Done records completion; Deferred keeps the work for later." : "Capture source-accurate learning and keep it connected to customers and product work."}</p></div><button class="editor-close" id="closeInsightEditorButton" type="button" aria-label="${["action", "decision"].includes(editor.type) ? `Close ${editor.type} editor` : "Close insight editor"}" title="Close">X</button></div>${viewing ? insightReadViewMarkup(values) : `<fieldset class="insight-editor-fields" ${editor.saving ? "disabled" : ""}><div class="initiative-form-grid"><label class="initiative-title-field"><span>Title</span><input id="insightTitle" name="title" required value="${escapeHtml(values.title)}"></label><label><span>Status</span><select name="status">${INSIGHT_STATUSES[editor.type].map((status) => `<option value="${status}" ${values.status === status ? "selected" : ""}>${escapeHtml(INSIGHT_STATUS_LABELS[status])}</option>`).join("")}</select></label><label><span>Owner</span><input name="owner" value="${escapeHtml(values.owner)}"></label><label><span>Team owner</span><select name="ownerPersonId"><option value="">Unassigned</option>${personOptions(state.organization, values.ownerPersonId)}</select></label>${insightTypeFieldsMarkup(editor.type, values)}<label class="initiative-wide-field"><span>Tags / themes</span><input name="tags" value="${escapeHtml(values.tags.join(", "))}" placeholder="activation, billing, reliability"><small>Comma-separated and intentionally assigned.</small></label>${insightRelationshipMarkup("customerIds", "Customer accounts", values)}${insightRelationshipMarkup("segmentIds", "Segments", values)}<label class="initiative-wide-field"><span>Linked initiative</span><select name="initiativeId"><option value="">Not linked</option>${initiativeOptions}</select></label>${insightRelationshipMarkup("relatedRecordIds", "Related Insights records", values)}</div></fieldset>`}<p class="initiative-editor-error" id="insightEditorError" tabindex="-1" role="alert" aria-live="assertive">${escapeHtml(editor.error)}</p><div class="initiative-editor-actions">${viewing && editor.backStack.length ? `<button class="secondary" id="backToInsightButton" type="button">Back to previous record</button>` : ""}${editing ? `<button class="danger" id="deleteInsightButton" type="button" ${editor.saving ? "disabled" : ""}>Delete record</button>` : ""}${canPromote ? `<button class="secondary" id="promoteInsightButton" type="button">Create initiative</button>` : ""}<button class="secondary" id="cancelInsightEditorButton" type="button">${viewing ? "Close" : "Cancel"}</button>${viewing && !teamEditorReadOnlyReason() ? `<button class="primary" id="editInsightFromViewButton" type="button">Edit</button>` : !viewing ? `<button class="primary" id="saveInsightButton" type="submit" ${editor.saving ? "disabled" : ""}>${editor.saving ? "Saving..." : "Save"}</button>` : ""}</div></form></dialog>`;
}

function insightRecordLink(record, context) {
  return `<button class="secondary small" id="insight-link-${elementIdToken(context)}-${elementIdToken(record.id)}" data-view-insight="${escapeHtml(record.id)}" type="button">${escapeHtml(INSIGHT_TYPE_LABELS[record.type])}: ${escapeHtml(record.title)}</button>`;
}

function initiativeSavedValidationsMarkup(item) {
  const records = state.insightRecords.filter(record => record.type === "validation" && record.initiativeId === item.id);
  const current = records.filter(record => !["complete", "cancelled"].includes(record.status));
  const history = records.filter(record => ["complete", "cancelled"].includes(record.status));
  const rows = entries => entries.map(record => `<article class="review-card" data-validation-record="${escapeHtml(record.id)}"><h5>${escapeHtml(record.title)}</h5><p>${escapeHtml(INSIGHT_STATUS_LABELS[record.status])} · Captured experiment</p><p>${escapeHtml(record.method || "Method not recorded.")}</p>${record.successMetric ? `<p>Success metric: ${escapeHtml(record.successMetric)}</p>` : ""}${record.result ? `<p>Result: ${escapeHtml(record.result)}</p>` : ""}${record.decision || record.decisionNotes ? `<p>Decision: ${escapeHtml(validationDecisionSummary(record))}</p>` : ""}${insightRecordLink(record, `initiative-validation-${item.id}`)}</article>`).join("");
  return `<div class="saved-validations"><div class="contextual-card-actions">${!teamEditorReadOnlyReason() ? `<button class="secondary" id="addInitiativeValidation-${escapeHtml(item.id)}" data-add-initiative-validation="${escapeHtml(item.id)}" type="button">New experiment</button>` : ""}</div><h5>Current experiments</h5><div class="review-list">${rows(current) || "No current experiments linked."}</div>${history.length ? `<h5>Experiment history</h5><div class="review-list">${rows(history)}</div>` : ""}</div>`;
}

function validationStatusHistoryMarkup(board) {
  return [["Status not recorded", board.unknown], ["Cancelled experiments", board.cancelled]].map(([title, records]) => `<section class="panel"><div class="panel-header"><h3>${title}</h3><span class="muted">${records.length} records</span></div><div class="validation-list">${records.map(record => insightRecordCard(record, record.method || "Method not recorded.", record.result || (record.status === "unknown" ? "Set the status after reviewing this captured experiment." : "Retained experiment history."))).join("") || emptyState("No records in this status.")}</div></section>`).join("");
}


function initiativeLinkedLearningMarkup(item) {
  const linked = state.insightRecords.filter((record) => !["action", "decision", "validation"].includes(record.type) && record.initiativeId === item.id);
  return `<section class="linked-learning" aria-label="Linked learning"><h5>Linked learning</h5><p>Research records keep their own evidence, ownership and status. Opening a record does not change this initiative.</p><div class="contextual-card-actions">${linked.map((record) => insightRecordLink(record, `initiative-${item.id}`)).join("") || "No learning records linked to this initiative."}</div></section>`;
}

function insightReadViewMarkup(values) {
  const fields = {
    discovery: [["Problem", values.problem], ["Hypothesis", values.hypothesis], ["Confidence", `${Math.round(values.confidence * 100)}%`], ["Next step", values.nextStep]],
    research: [["Objective", values.objective], ["Research questions", values.questions], ["Method", values.method], ["Recruitment target", values.recruitmentTarget], ["Participants completed", values.participantCount], ["Due date", values.dueDate], ["Findings", values.findings]],
    validation: [["Hypothesis", values.hypothesis], ["Method", values.method], ["Success metric", values.successMetric], ["Due date", values.dueDate], ["Result", values.result], ["Decision", VALIDATION_DECISION_LABELS[values.decision] || values.decision], ["Decision notes", values.decisionNotes]],
    feedback: [["Source", values.source], ["Source reference", values.sourceRef], ["Received", values.receivedAt], ["Urgency", `${values.urgency} / 5`], ["Feedback signal", values.signal]],
    decision: [["Question", values.question], ["Outcome", values.outcome], ["Rationale", values.rationale], ["Decision date", values.decidedAt], ["Imported from", values.legacyField]],
    action: [["Work to complete", values.description], ["Due date", values.dueDate], ["Enablement area", values.enablementArea], ["Source record reference", values.sourceRecordId], ["Completion evidence", values.completionEvidence]],
    support: [["Source", values.source], ["Source reference", values.sourceRef], ["Severity", SUPPORT_SEVERITY_LABELS[values.severity] || values.severity], ["Response due", values.responseDueDate], ["Issue", values.issue], ["Customer impact", values.customerImpact], ["Resolution", values.resolution]]
  }[values.type] || [];
  const selectedNames = (ids, records) => ids.map((id) => records.find((record) => record.id === id)?.name || "Unavailable linked record");
  const facts = [
    ["Title", values.title], ["Status", INSIGHT_STATUS_LABELS[values.status] || values.status],
    ["Owner", values.owner], ["Team owner", organizationPersonName(values.ownerPersonId)], ...fields,
    ["Tags / themes", values.tags], ["Customer accounts", selectedNames(values.customerIds, state.customerDirectory.accounts)],
    ["Segments", selectedNames(values.segmentIds, state.customerDirectory.segments)]
  ];
  const initiative = state.items.find((item) => item.id === values.initiativeId);
  const related = values.relatedRecordIds.map((id) => state.insightRecords.find((record) => record.id === id));
  return `<section class="insight-read-view" tabindex="0" aria-label="${["action", "decision"].includes(values.type) ? `Saved ${values.type}` : "Saved learning record"}"><dl class="initiative-detail-facts stacked">${facts.map(([label, value]) => {
    const text = Array.isArray(value) ? value.join("\n") : String(value ?? "");
    return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(text || "Not captured")}</dd></div>`;
  }).join("")}</dl>${values.type === "discovery" && initiative ? `<p>Confidence and next step belong to this discovery record. Linked initiative fields are maintained separately.</p>` : ""}<section class="linked-learning" aria-label="Linked initiative"><h4>Linked initiative</h4>${initiative ? `<button class="secondary small" data-insight-initiative="${escapeHtml(initiative.id)}" type="button">${escapeHtml(initiative.title)}</button>` : `<p>${values.initiativeId ? "Linked initiative is unavailable." : "No initiative linked."}</p>`}</section><section class="linked-learning" aria-label="Related learning records"><h4>Related learning records</h4><div class="contextual-card-actions">${related.map((record) => record ? insightRecordLink(record, values.id) : "<p>A linked learning record is unavailable.</p>").join("") || "No related learning records."}</div></section></section>`;
}

function insightTypeFieldsMarkup(type, values) {
  if (type === "decision") return `<label class="initiative-wide-field"><span>Question</span><textarea name="question">${escapeHtml(values.question)}</textarea></label><label class="initiative-wide-field"><span>Outcome</span><textarea name="outcome">${escapeHtml(values.outcome)}</textarea><small>Required before marking a decision Decided.</small></label><label class="initiative-wide-field"><span>Rationale</span><textarea name="rationale">${escapeHtml(values.rationale)}</textarea></label><label><span>Decision date</span><input name="decidedAt" type="date" value="${escapeHtml(values.decidedAt)}"><small>Leave blank if the date is unknown.</small></label>`;
  if (type === "action") return `<label class="initiative-wide-field"><span>Work to complete</span><textarea name="description">${escapeHtml(values.description)}</textarea></label><label><span>Due date</span><input name="dueDate" type="date" value="${escapeHtml(values.dueDate)}"></label><label><span>Enablement area</span><select name="enablementArea"><option value="">Not an enablement action</option>${ENABLEMENT_AREAS.map((area) => `<option value="${area}" ${values.enablementArea === area ? "selected" : ""}>${area}</option>`).join("")}</select></label><label class="initiative-wide-field"><span>Completion evidence</span><textarea name="completionEvidence" placeholder="What was completed, when, and where the result can be reviewed">${escapeHtml(values.completionEvidence)}</textarea><small>Required with an owner before an enablement action can be marked Done.</small></label><label class="initiative-wide-field"><span>Source record reference</span><input name="sourceRecordId" value="${escapeHtml(values.sourceRecordId)}"><small>Optional reference captured for this action.</small></label>`;
  if (type === "discovery") return `<label class="initiative-wide-field"><span>Problem</span><textarea name="problem">${escapeHtml(values.problem)}</textarea></label><label class="initiative-wide-field"><span>Hypothesis</span><textarea name="hypothesis">${escapeHtml(values.hypothesis)}</textarea></label><label><span>Confidence (%)</span><input name="confidence" type="number" min="0" max="100" value="${Math.round(values.confidence * 100)}"></label><label class="initiative-wide-field"><span>Next step</span><textarea name="nextStep">${escapeHtml(values.nextStep)}</textarea></label>`;
  if (type === "research") return `<label class="initiative-wide-field"><span>Objective</span><textarea name="objective">${escapeHtml(values.objective)}</textarea></label><label class="initiative-wide-field"><span>Research questions</span><textarea name="questions" placeholder="One question per line">${escapeHtml(values.questions.join("\n"))}</textarea></label><label class="initiative-wide-field"><span>Method</span><textarea name="method">${escapeHtml(values.method)}</textarea></label><label><span>Recruitment target</span><input name="recruitmentTarget" type="number" min="0" max="10000" value="${values.recruitmentTarget}"></label><label><span>Participants completed</span><input name="participantCount" type="number" min="0" max="10000" value="${values.participantCount}"></label><label><span>Due date</span><input name="dueDate" type="date" value="${escapeHtml(values.dueDate)}"></label><label class="initiative-wide-field"><span>Findings</span><textarea name="findings">${escapeHtml(values.findings)}</textarea></label>`;
  if (type === "validation") return `<label class="initiative-wide-field"><span>Hypothesis</span><textarea name="hypothesis">${escapeHtml(values.hypothesis)}</textarea></label><label class="initiative-wide-field"><span>Method</span><textarea name="method">${escapeHtml(values.method)}</textarea></label><label class="initiative-wide-field"><span>Success metric</span><textarea name="successMetric">${escapeHtml(values.successMetric)}</textarea></label><label><span>Due date</span><input name="dueDate" type="date" value="${escapeHtml(values.dueDate)}"></label><label class="initiative-wide-field"><span>Result</span><textarea name="result">${escapeHtml(values.result)}</textarea></label><label><span>Decision</span><select name="decision">${VALIDATION_DECISIONS.map((decision) => `<option value="${decision}" ${values.decision === decision ? "selected" : ""}>${escapeHtml(VALIDATION_DECISION_LABELS[decision])}</option>`).join("")}</select></label><label class="initiative-wide-field"><span>Decision notes</span><textarea name="decisionNotes">${escapeHtml(values.decisionNotes)}</textarea></label>`;
  if (type === "feedback") return `<label><span>Source</span><input name="source" value="${escapeHtml(values.source)}" placeholder="Interview, email, ticket"></label><label><span>Source reference</span><input name="sourceRef" value="${escapeHtml(values.sourceRef)}" placeholder="URL or ticket ID"></label><label><span>Received</span><input name="receivedAt" type="date" value="${escapeHtml(values.receivedAt)}"></label><label><span>Urgency</span><select name="urgency">${[1, 2, 3, 4, 5].map((urgency) => `<option value="${urgency}" ${values.urgency === urgency ? "selected" : ""}>${urgency} / 5</option>`).join("")}</select></label><label class="initiative-wide-field"><span>Feedback signal</span><textarea name="signal">${escapeHtml(values.signal)}</textarea></label>`;
  return `<label><span>Source</span><input name="source" value="${escapeHtml(values.source)}" placeholder="Ticket, call, email"></label><label><span>Source reference</span><input name="sourceRef" value="${escapeHtml(values.sourceRef)}" placeholder="Ticket ID or URL"></label><label><span>Severity</span><select name="severity">${SUPPORT_SEVERITIES.map((severity) => `<option value="${severity}" ${values.severity === severity ? "selected" : ""}>${escapeHtml(SUPPORT_SEVERITY_LABELS[severity])}</option>`).join("")}</select></label><label><span>Response due</span><input name="responseDueDate" type="date" value="${escapeHtml(values.responseDueDate)}"></label><label class="initiative-wide-field"><span>Issue</span><textarea name="issue">${escapeHtml(values.issue)}</textarea></label><label class="initiative-wide-field"><span>Customer impact</span><textarea name="customerImpact">${escapeHtml(values.customerImpact)}</textarea></label><label class="initiative-wide-field"><span>Resolution</span><textarea name="resolution">${escapeHtml(values.resolution)}</textarea></label>`;
}

function openInsightEditor(mode, trigger, selectedId = "", type = state.selectedMode) {
  if (mode !== "view" && teamEditorReadOnlyReason()) return;
  const record = state.insightRecords.find((entry) => entry.id === selectedId);
  if (mode === "view" && !record) return;
  const resolvedType = record?.type || (["discovery", "research", "validation", "feedback", "support", "action", "decision"].includes(type) ? type : "discovery");
  const previous = state.insightEditor;
  const navigating = mode === "view" && previous.mode === "view";
  const backStack = navigating ? [...previous.backStack, { id: previous.selectedId, focusId: trigger?.id || "closeInsightEditorButton" }] : [];
  state.insightEditor = createInsightEditorState({ mode, type: resolvedType, selectedId: record?.id || "", triggerId: navigating ? previous.triggerId : trigger?.id || "viewTitle", backStack });
  if (mode === "view" || previous.mode === "view") pushViewUrl(true);
  render();
}

function insightValuesFromForm(form) {
  const input = Object.fromEntries(new FormData(form).entries());
  const type = state.insightEditor.type;
  const values = { ...blankInsightValues(type), ...input, type, customerIds: new FormData(form).getAll("customerIds"), segmentIds: new FormData(form).getAll("segmentIds"), relatedRecordIds: new FormData(form).getAll("relatedRecordIds"), tags: String(input.tags || "").split(",") };
  if (type === "discovery") values.confidence = Number(input.confidence || 0) / 100;
  if (type === "research") { values.questions = String(input.questions || "").split(/\r?\n/); values.recruitmentTarget = Number(input.recruitmentTarget || 0); values.participantCount = Number(input.participantCount || 0); }
  if (type === "feedback") values.urgency = Number(input.urgency || 3);
  return values;
}

function captureInsightEditorDraft(event) {
  if (event.target.matches("[data-relationship-search]")) return;
  if (!state.insightEditor.mode || state.insightEditor.mode === "view") return;
  state.insightEditor.draft = insightValuesFromForm(event.currentTarget);
}

async function saveInsightEditor(event) {
  event.preventDefault();
  const values = insightValuesFromForm(event.currentTarget);
  state.insightEditor.draft = values;
  if (!values.title.trim()) {
    state.insightEditor.error = "Title is required.";
    render();
    const title = document.querySelector("#insightTitle");
    title?.setCustomValidity("Title is required."); title?.reportValidity(); title?.focus();
    return;
  }
  try { normalizeInsightRecord({ ...values, id: state.insightEditor.selectedId || "validation", version: 1, createdAt: new Date(), updatedAt: new Date(), updatedBy: "pm-os" }, { legacy: true }); }
  catch (error) { state.insightEditor.error = error.message; render(); document.querySelector("#insightEditorError")?.focus(); return; }
  if (state.team.active) await saveTeamInsightEditor(values);
  else await saveBrowserInsightEditor(values);
}

async function saveBrowserInsightEditor(values) {
  const editor = state.insightEditor;
  let record;
  let records;
  let activity;
  if (editor.mode === "new") {
    record = createInsightRecord(values);
    records = [record, ...state.insightRecords];
    activity = createActivityEntry("insight-created", record, { type: record.type, title: record.title });
  } else {
    const current = insightEditorRecord();
    if (!current) { state.insightEditor.error = "That record is no longer available."; render(); return; }
    records = updateInsightRecord(state.insightRecords, current.id, values);
    record = records.find((entry) => entry.id === current.id);
    activity = createActivityEntry("insight-updated", record, insightRecordChanges(current, record));
  }
  try { await commitLocalInsightUpdate(records, activity); }
  catch (error) {
    editor.error = localInitiativeSaveError(error);
    render();
    queueMicrotask(() => document.querySelector("#insightEditorError")?.focus());
    return;
  }
  completeInsightEditorSave(`${editor.mode === "new" ? "Added" : "Updated"} ${record.title}.`, editor.triggerId);
}

async function commitLocalInsightUpdate(records, activityEntry) {
  await commitLocalWorkspacePatch({ insightRecords: records }, [activityEntry]);
}

async function saveTeamInsightEditor(values) {
  const editor = state.insightEditor;
  const current = insightEditorRecord();
  if (editor.mode === "edit" && !current) return;
  state.insightEditor.saving = true; state.insightEditor.error = ""; state.team.mutationBusy = true; render();
  try {
    const result = editor.mode === "new" ? await state.team.repository.createInsightRecord(values) : await state.team.repository.updateInsightRecord(current.id, values, current.version);
    applyTeamSnapshot(result.snapshot);
    state.team.mutationBusy = false;
    state.team.status = "Team workspace updated.";
    completeInsightEditorSave(`${editor.mode === "new" ? "Added" : "Updated"} ${values.title}.`, editor.triggerId);
  } catch (error) {
    state.team.mutationBusy = false;
    if (isTeamConflict(error)) await refreshActiveTeamSnapshot().catch(() => undefined);
    if (isTeamAccessLoss(error)) { state.insightEditor = createInsightEditorState(); await exitTeamForBoundary(teamAccessLossMessage(error)); return; }
    state.insightEditor.saving = false;
    state.insightEditor.error = isTeamConflict(error) ? "This record changed elsewhere. Your draft is preserved; review the latest version and save again." : safeTeamError(error, "The Insights record could not be saved.");
    render(); document.querySelector("#insightEditorError")?.focus();
  }
}

function completeInsightEditorSave(message, triggerId) {
  const actionContext = state.insightEditor.actionContext;
  state.insightEditor = createInsightEditorState();
  pushViewUrl(true);
  if (actionContext) {
    finishActionMutation(actionContext, message);
    return;
  }
  state.editorAnnouncement = message;
  render();
  queueMicrotask(() => (document.getElementById(triggerId) || document.querySelector("#viewTitle"))?.focus());
}

function closeInsightEditor() {
  const triggerId = state.insightEditor.triggerId;
  state.insightEditor = createInsightEditorState();
  pushViewUrl(true);
  render();
  queueMicrotask(() => (document.getElementById(triggerId) || document.querySelector(state.initiativeDetail.selectedId ? "#initiativeDetailTitle" : "#viewTitle"))?.focus());
}

function backToInsightRecord() {
  const editor = state.insightEditor;
  const backStack = [...editor.backStack];
  const previous = backStack.pop();
  if (!previous) return;
  const record = state.insightRecords.find((entry) => entry.id === previous.id);
  if (!record) { closeInsightEditor(); return; }
  state.insightEditor = createInsightEditorState({ mode: "view", selectedId: record.id, type: record.type, triggerId: editor.triggerId, backStack });
  pushViewUrl(true);
  render();
  queueMicrotask(() => (document.getElementById(previous.focusId) || document.querySelector("#closeInsightEditorButton"))?.focus());
}

function editInsightFromView() {
  const editor = state.insightEditor;
  state.insightEditor = createInsightEditorState({ ...editor, mode: "edit" });
  render();
}

async function deleteInsightFromEditor(event) {
  const record = insightEditorRecord();
  if (!record || teamEditorReadOnlyReason()) return;
  const confirmed = await requestDataConfirmation({ title: "Delete Insights record?", description: `Delete ${record.title}. Related records will stay available but their link to this record will be removed.`, confirmLabel: "Delete Record", trigger: event.currentTarget });
  if (!confirmed) return;
  if (state.team.active) {
    try { const result = await state.team.repository.deleteInsightRecord(record.id, record.version); applyTeamSnapshot(result.snapshot); }
    catch (error) { state.insightEditor.error = safeTeamError(error, "The Insights record could not be deleted."); render(); return; }
  } else {
    try { await commitLocalInsightUpdate(deleteInsightRecord(state.insightRecords, record.id), createActivityEntry("insight-deleted", record, {})); }
    catch (error) {
      state.insightEditor.error = localInitiativeSaveError(error);
      render(); queueMicrotask(() => document.querySelector("#insightEditorError")?.focus());
      return;
    }
  }
  completeInsightEditorSave(`Deleted ${record.title}.`, "viewTitle");
}

function insightRecordChanges(before, after) {
  const changes = {};
  for (const [field, value] of Object.entries(after)) if (!["version", "updatedAt", "updatedBy"].includes(field) && JSON.stringify(before[field]) !== JSON.stringify(value)) changes[field] = { from: before[field], to: value };
  return changes;
}

function promoteDiscoveryToInitiative() {
  const record = insightEditorRecord();
  if (!record || record.type !== "discovery" || record.status !== "validated" || record.initiativeId) return;
  state.pendingInsightPromotionId = record.id;
  state.insightEditor = createInsightEditorState();
  openInitiativeEditor("new", document.querySelector("#viewTitle"), "", { title: record.title, problem: record.problem, owner: record.owner, pocPersonId: record.ownerPersonId, customerIds: record.customerIds, segmentIds: record.segmentIds, confidence: record.confidence, nextStep: record.nextStep });
}

function initiativeCommandsMarkup() {
  const reason = teamEditorReadOnlyReason();
  const disabled = reason ? "disabled" : "";
  const editDisabled = reason || !state.items.length ? "disabled" : "";
  const describedBy = reason ? 'aria-describedby="initiativeReadOnlyReason"' : "";
  return `<div class="initiative-command-block"><div class="initiative-commands" role="group" aria-label="Initiative commands"><button class="primary" id="newInitiativeButton" ${disabled} ${describedBy} type="button">New initiative</button><button class="secondary" id="editInitiativeButton" ${editDisabled} ${describedBy} type="button">Edit initiative</button></div>${reason ? `<p class="initiative-readonly-reason" id="initiativeReadOnlyReason">${escapeHtml(reason)}</p>` : ""}</div>`;
}

function teamEditorReadOnlyReason() {
  if (demoTeamRole === "viewer") return "Viewer access is read-only.";
  if (!state.team.active) return "";
  if (state.team.role === "viewer") return "Viewer access is read-only.";
  if (state.team.connection !== "live") return "Reconnecting. Team changes are paused.";
  if (state.team.mutationBusy) return "A Team workspace change is being saved.";
  return "";
}

const initiativeTargetResultLimit = 50;

function initiativeTargetAudienceMarkup(values, editor) {
  const selectedCount = values.segmentIds.length + values.customerIds.length;
  return `<section class="initiative-wide-field initiative-target-audience" id="initiativeTargetAudience" aria-labelledby="initiativeTargetAudienceTitle">
    <div class="initiative-target-heading"><div><h4 id="initiativeTargetAudienceTitle">Target audience</h4><p>Combine saved segments and named customer accounts in one audience.</p></div><button class="secondary" id="openInitiativeTargetPicker" type="button" aria-expanded="${editor.targetPickerOpen}" aria-controls="initiativeTargetPicker">${editor.targetPickerOpen ? "Close picker" : "+ Add targets"}</button></div>
    <div id="initiativeTargetInputs" hidden>${initiativeTargetHiddenInputsMarkup(values)}</div>
    <div class="initiative-target-chip-list" id="initiativeTargetChipList" aria-label="Selected target audience">${initiativeTargetChipsMarkup(values)}</div>
    <p class="initiative-target-help">${selectedCount ? `${selectedCount} selected. ` : ""}Named accounts also contribute their matching saved segments to reporting.</p>
    ${editor.targetPickerOpen ? initiativeTargetPickerMarkup(values, editor) : ""}
    <p class="sr-only" id="initiativeTargetStatus" role="status" aria-live="polite" aria-atomic="true"></p>
  </section>`;
}

function initiativeTargetHiddenInputsMarkup(values) {
  return [
    ...values.segmentIds.map((id) => `<input type="hidden" name="segmentIds" value="${escapeHtml(id)}">`),
    ...values.customerIds.map((id) => `<input type="hidden" name="customerIds" value="${escapeHtml(id)}">`)
  ].join("");
}

function initiativeTargetChipsMarkup(values) {
  const segments = values.segmentIds.map((id) => state.customerDirectory.segments.find((segment) => segment.id === id)).filter(Boolean);
  const accounts = values.customerIds.map((id) => state.customerDirectory.accounts.find((account) => account.id === id)).filter(Boolean);
  const chips = [
    ...segments.map((segment) => `<button class="initiative-target-chip segment" type="button" data-remove-initiative-target="segments" data-target-id="${escapeHtml(segment.id)}" aria-label="Remove segment ${escapeHtml(segment.name)}"><span>Segment</span><strong>${escapeHtml(segment.name)}</strong><small>${segmentMembers(segment, state.customerDirectory).length} accounts</small><b aria-hidden="true">×</b></button>`),
    ...accounts.map((account) => `<button class="initiative-target-chip account" type="button" data-remove-initiative-target="customers" data-target-id="${escapeHtml(account.id)}" aria-label="Remove account ${escapeHtml(account.name)}"><span>Account</span><strong>${escapeHtml(account.name)}</strong>${account.domain ? `<small>${escapeHtml(account.domain)}</small>` : ""}<b aria-hidden="true">×</b></button>`)
  ];
  return chips.join("") || `<p class="initiative-target-empty">No target audience selected yet.</p>`;
}

function initiativeTargetPickerMarkup(values, editor) {
  const kind = initiativeTargetKind(editor.targetPickerKind);
  const result = initiativeTargetOptions(kind, editor.targetQuery, values);
  const segmentsDisabled = state.customerDirectory.segments.length ? "" : "disabled";
  const customersDisabled = state.customerDirectory.accounts.length ? "" : "disabled";
  return `<section class="initiative-target-picker" id="initiativeTargetPicker" aria-labelledby="initiativeTargetPickerTitle">
    <div class="initiative-target-picker-heading"><div><p class="panel-kicker">Audience picker</p><h5 id="initiativeTargetPickerTitle">Add targets</h5></div><span>Choose as many as this initiative needs.</span></div>
    <fieldset class="initiative-target-kind"><legend>Target type</legend><label><input type="radio" name="initiativeTargetKind" value="segments" ${kind === "segments" ? "checked" : ""} ${segmentsDisabled}><span><strong>Segments</strong><small>${state.customerDirectory.segments.length} saved audiences</small></span></label><label><input type="radio" name="initiativeTargetKind" value="customers" ${kind === "customers" ? "checked" : ""} ${customersDisabled}><span><strong>Customers</strong><small>${state.customerDirectory.accounts.length} named accounts</small></span></label></fieldset>
    <label class="initiative-target-search"><span>Search ${kind === "segments" ? "segments" : "customers"}</span><input id="initiativeTargetSearch" type="search" value="${escapeHtml(editor.targetQuery)}" placeholder="${kind === "segments" ? "Search segment name or rules" : "Search account, domain, industry, or region"}" autocomplete="off"></label>
    <div class="initiative-target-results" id="initiativeTargetPickerList" aria-label="${kind === "segments" ? "Segment" : "Customer"} targets">${result.html}</div>
    <div class="initiative-target-picker-footer"><span id="initiativeTargetResultSummary">${escapeHtml(result.summary)}</span><button class="primary" id="closeInitiativeTargetPicker" type="button">Done</button></div>
  </section>`;
}

function initiativeTargetOptions(kind, query, values) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const selectedIds = new Set(kind === "segments" ? values.segmentIds : values.customerIds);
  const entries = kind === "segments" ? state.customerDirectory.segments : state.customerDirectory.accounts;
  const matches = entries.filter((entry) => initiativeTargetSearchText(kind, entry).includes(normalizedQuery));
  const ordered = [...matches].sort((left, right) => Number(selectedIds.has(right.id)) - Number(selectedIds.has(left.id)) || left.name.localeCompare(right.name));
  const visible = ordered.slice(0, initiativeTargetResultLimit);
  const label = kind === "segments" ? "segments" : "customers";
  const summary = matches.length > visible.length ? `Showing ${visible.length} of ${matches.length} ${label}. Refine the search for more.` : `Showing ${visible.length} of ${matches.length} ${label}.`;
  const html = visible.map((entry) => initiativeTargetOptionMarkup(kind, entry, selectedIds.has(entry.id))).join("")
    || `<p class="initiative-target-no-results">${entries.length ? `No ${label} match this search.` : `No ${label} are available yet.`}</p>`;
  return { html, summary };
}

function initiativeTargetSearchText(kind, entry) {
  if (kind === "segments") return `${entry.name} ${entry.description} ${segmentRuleSummary(entry)}`.toLowerCase();
  const tags = entry.tagIds.map((id) => state.customerDirectory.tags.find((tag) => tag.id === id)?.name || "").join(" ");
  return `${entry.name} ${entry.domain} ${entry.industry} ${entry.region} ${entry.planTier} ${tags}`.toLowerCase();
}

function initiativeTargetOptionMarkup(kind, entry, checked) {
  if (kind === "segments") {
    const count = segmentMembers(entry, state.customerDirectory).length;
    return `<label class="initiative-target-option"><input type="checkbox" data-initiative-target-kind="segments" value="${escapeHtml(entry.id)}" ${checked ? "checked" : ""}><span><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(segmentRuleSummary(entry))}</small></span><b>${count} account${count === 1 ? "" : "s"}</b></label>`;
  }
  const context = [entry.domain, entry.planTier, entry.region].filter(Boolean).join(" · ");
  return `<label class="initiative-target-option"><input type="checkbox" data-initiative-target-kind="customers" value="${escapeHtml(entry.id)}" ${checked ? "checked" : ""}><span><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(context || "Account profile")}</small></span><b>Account</b></label>`;
}

function initiativeTargetKind(value) {
  if (value === "customers" && state.customerDirectory.accounts.length) return "customers";
  if (state.customerDirectory.segments.length) return "segments";
  return "customers";
}

function initiativeEditorDialogMarkup() {
  const editor = state.initiativeEditor;
  if (!editor.mode) return "";
  const item = initiativeEditorItem();
  const values = { ...blankInitiativeValues(), ...(item || {}), ...(editor.draft || {}) };
  const editing = editor.mode === "edit";
  const description = (editor.measureContext ? "Review the suggested wording, write your own target, and save this initiative's measure. Saving records intent; it does not establish achievement." : "") || editor.actionContext?.requestedOutcome || (editing
    ? editor.selectedFromCard ? "Update this initiative's product and delivery details." : "Choose an initiative, then update its product and delivery details."
    : "Capture the product problem and delivery details.");
  const editorTitle = editor.measureContext ? editor.measureContext === "captured" ? "Edit measure" : "Define measure" : editor.actionContext?.heading || (editing ? "Edit initiative" : "New initiative");
  const editorEyebrow = editor.actionContext ? "Action Queue" : "Initiative";
  const revealOwner = true;
  const openMoreDetails = editor.moreDetailsOpen;
  const searchQuery = editor.search.trim().toLowerCase();
  const searchText = (entry) => `${entry.title} ${entry.customer} ${entry.owner}`.toLowerCase();
  const matchCount = state.items.filter(entry => searchText(entry).includes(searchQuery)).length;
  const options = state.items.map((entry) => `<option value="${escapeHtml(entry.id)}" data-search-text="${escapeHtml(searchText(entry))}" ${searchText(entry).includes(searchQuery) ? "" : "hidden"} ${entry.id === editor.selectedId ? "selected" : ""}>${escapeHtml(entry.title)} | ${escapeHtml(entry.owner || "Unowned")}</option>`).join("");
  return `<dialog class="initiative-editor-dialog" id="initiativeEditorDialog" aria-modal="true" aria-busy="${editor.saving}" aria-labelledby="initiativeEditorTitle" aria-describedby="initiativeEditorDescription">
    <form id="initiativeEditorForm" novalidate>
      <div class="initiative-editor-heading"><div><p class="eyebrow">${escapeHtml(editorEyebrow)}</p><h3 id="initiativeEditorTitle">${escapeHtml(editorTitle)}</h3><p id="initiativeEditorDescription">${escapeHtml(description)}</p></div><button class="editor-close" id="closeInitiativeEditorButton" type="button" aria-label="Close initiative editor" title="Close">X</button></div>
      <fieldset class="initiative-editor-fields" ${editor.saving ? "disabled" : ""}>
        ${editing && !editor.selectedFromCard ? `<section class="initiative-picker" aria-labelledby="initiativePickerTitle"><h4 id="initiativePickerTitle">Choose initiative</h4><p id="initiativeEditingTarget">Editing: <strong>${escapeHtml(item?.title || "Unavailable initiative")}</strong></p><p id="initiativePickerHelp">Search filters this chooser. The initiative being edited stays the same until you select another one.</p><label><span>Search initiatives</span><input id="initiativeEditorSearch" type="search" value="${escapeHtml(editor.search)}" placeholder="Search title, customer, or owner" aria-describedby="initiativePickerHelp initiativePickerResults"></label><p id="initiativePickerResults" role="status" aria-live="polite">${escapeHtml(initiativePickerResultText(matchCount))}</p><button class="secondary small" id="clearInitiativeEditorSearch" type="button" ${editor.search ? "" : "disabled"}>Clear search</button><label><span>Initiatives</span><select id="initiativeEditorPicker" aria-describedby="initiativeEditingTarget initiativePickerHelp" size="${Math.max(2, Math.min(5, state.items.length))}">${options}</select></label></section>` : ""}
        <div class="initiative-form-grid simple-initiative-form">
          <label class="initiative-title-field"><span>Title</span><input id="initiativeTitle" name="title" value="${escapeHtml(values.title)}" required></label>
          <label class="initiative-wide-field"><span>Problem</span><textarea name="problem">${escapeHtml(values.problem)}</textarea></label>
          <label><span>Status</span><select name="statusId">${statusOptions(values.statusId || values.status)}</select></label>
          <p class="initiative-wide-field">Track next steps and decisions in this initiative’s saved action and decision records.</p>
          <label><span>Target date</span><input name="dueDate" type="date" aria-describedby="initiativeEditorError" value="${escapeHtml(values.dueDate)}"></label>
          <p class="initiative-editor-error" id="initiativeEditorError" tabindex="-1" role="alert" aria-live="assertive">${escapeHtml(editor.error)}</p>
          <details class="initiative-more-details initiative-wide-field" ${openMoreDetails ? "open" : ""}><summary>More details</summary><div class="initiative-form-grid">
            <input type="hidden" name="customer" value="${escapeHtml(customerDisplayProjection(values, state.customerDirectory))}">
            <section class="initiative-wide-field authored-measure-fields" aria-label="Authored measure"><h4>Objective and measurement</h4><p>Record the outcome you intend to achieve. Leave unknown targets and dates blank.</p><div class="initiative-form-grid">
              <label class="initiative-wide-field"><span>Objective</span><input name="objective" value="${escapeHtml(values.objective || "")}"></label>
              <label class="initiative-wide-field"><span>Primary metric</span><textarea name="primaryMetric">${escapeHtml(values.primaryMetric || "")}</textarea></label>
              <label class="initiative-wide-field"><span>Metric target</span><textarea name="metricTarget">${escapeHtml(values.metricTarget || "")}</textarea></label>
              <label><span>Metric review date</span><input name="metricReviewDate" type="date" value="${escapeHtml(values.metricReviewDate || "")}"></label>
            </div></section>
            ${editor.focusField === "customer" || experienceHas("research-validation") || experienceHas("customer-support") ? initiativeTargetAudienceMarkup(values, editor) : ""}
            ${revealOwner ? `<label><span>Owner</span><input name="owner" value="${escapeHtml(values.owner)}"></label>` : ""}${experienceHas("team-ownership") ? `<label><span>Point of contact</span><select name="pocPersonId"><option value="">Unassigned</option>${personOptions(state.organization, values.pocPersonId)}</select></label><label><span>Organization unit</span><select name="orgUnitId"><option value="">Unassigned</option>${unitOptions(state.organization, values.orgUnitId)}</select></label>` : ""}
            ${experienceHas("advanced-prioritization") ? initiativePriorityInputsMarkup(values) : ""}
            ${experienceHas("timeline-planning") ? `<label><span>Planned start</span><input name="startDate" type="date" value="${escapeHtml(values.startDate)}"></label><p class="initiative-wide-field initiative-timeline-preview" id="initiativeTimelinePreview" aria-live="polite">${escapeHtml(describeInitiativeTimeline(values, state.planningCalendar))}</p>` : ""}
            <p class="initiative-wide-field">Manage experiments and their evidence in Validation or this initiative’s details.</p>

          </div></details>
        </div>
      </fieldset>
      <div class="initiative-editor-actions">${editing ? `<button class="danger" id="deleteInitiativeButton" ${editor.saving ? "disabled" : ""} type="button" aria-label="Delete ${escapeHtml(values.title)}">Delete initiative</button>` : ""}<button class="secondary" id="cancelInitiativeEditorButton" ${editor.saving ? "disabled" : ""} type="button">Cancel</button><button class="primary" id="saveInitiativeButton" ${editor.saving ? "disabled" : ""} type="submit">${editor.saving ? "Saving..." : "Save"}</button></div>
    </form>
  </dialog>`;
}

function blankInitiativeValues() {
  const selected = statusForId(state.workflow, state.workflow.defaultStatusId);
  return { title: "", customer: "", customerIds: [], segmentIds: [], problem: "", owner: "", pocPersonId: "", orgUnitId: "", status: selected.category, statusId: selected.id, reach: 100, impact: 3, confidence: 0.7, effort: 3, priority: { valuesByMethod: {}, tierByMethod: {} }, priorityLevelId: "", priorityInputs: {}, startDate: "", dueDate: "", nextStep: "", risks: [], dependencies: [], experiment: "", decision: "", objective: "", primaryMetric: "", metricTarget: "", metricReviewDate: "" };
}

function initiativePriorityInputsMarkup(values) {
  const workspaceFramework = priorityFrameworkForId(state.prioritization, state.prioritization.defaultFrameworkId);
  const effectiveResult = effectivePriorityFramework(state.prioritization, state.organization, values.orgUnitId);
  const effectiveFramework = effectiveResult.framework;
  const teamPath = effectiveResult.source === "team" ? organizationUnitPath(values.orgUnitId) : "";
  const hasDistinctTeamOverride = effectiveResult.source === "team" && effectiveFramework.id !== workspaceFramework.id;
  const primarySourceLabel = effectiveResult.source === "team" ? `${teamPath} team board` : "Workspace default";
  const contextMessage = effectiveResult.source === "team"
    ? hasDistinctTeamOverride
      ? `${effectiveFramework.name} controls ${teamPath}'s board. Cross-team views continue to use ${workspaceFramework.name}.`
      : `${effectiveFramework.name} controls ${teamPath}'s board and matches the workspace default.`
    : `${effectiveFramework.name} is the workspace default for this initiative.`;
  const separateLevelControl = effectiveFramework.id !== "levels" && workspaceFramework.id !== "levels" ? priorityLevelControlMarkup(values) : "";
  const workspaceDisclosure = hasDistinctTeamOverride
    ? `<details class="initiative-priority-workspace"><summary><span>Cross-team workspace scoring</span><small>${escapeHtml(workspaceFramework.name)} workspace default</small></summary><div class="initiative-priority-workspace-body"><p>These inputs affect portfolio, All teams, and briefing views. They do not change the ${escapeHtml(teamPath)} board.</p>${priorityFrameworkEditorSection(workspaceFramework, values, "Workspace default")}</div></details>`
    : "";
  return `<section class="initiative-wide-field initiative-priority-inputs" aria-labelledby="initiativePriorityTitle"><div class="initiative-priority-heading"><div><h4 id="initiativePriorityTitle">Prioritization</h4><p>${escapeHtml(contextMessage)}</p></div></div><div class="initiative-priority-primary">${priorityFrameworkEditorSection(effectiveFramework, values, primarySourceLabel)}</div>${workspaceDisclosure}${separateLevelControl}</section>`;
}

function priorityLevelControlMarkup(values) {
  const selectedLevelId = values.priorityLevelId || values.priority?.tierByMethod?.levels || "";
  return `<label><span>Priority level</span><select name="priorityLevelId"><option value="">Unassigned</option>${state.prioritization.levels.map((level) => `<option value="${escapeHtml(level.id)}" ${level.id === selectedLevelId ? "selected" : ""}>${escapeHtml(level.label)}</option>`).join("")}</select></label>`;
}

function priorityFrameworkEditorSection(framework, values, sourceLabel) {
  if (framework.id === "manual") {
    return `<fieldset class="initiative-priority-framework initiative-priority-ordering"><legend><span>${escapeHtml(framework.name)}</span><small>${escapeHtml(sourceLabel)}</small></legend><p>The board uses the saved shared pecking order. No score inputs are required here.</p></fieldset>`;
  }
  if (framework.id === "levels") {
    return `<fieldset class="initiative-priority-framework initiative-priority-levels"><legend><span>${escapeHtml(framework.name)}</span><small>${escapeHtml(sourceLabel)}</small></legend><p>Choose the level used for this context. Missing assignments stay last.</p><div class="priority-input-grid">${priorityLevelControlMarkup(values)}</div></fieldset>`;
  }
  return priorityInputSection(framework, values.priorityInputs?.[framework.id] || {}, sourceLabel);
}

function priorityInputSection(framework, inputs, sourceLabel) {
  return `<fieldset class="initiative-priority-framework"><legend><span>${escapeHtml(framework.name)}</span><small>${escapeHtml(sourceLabel)}</small></legend><p>${escapeHtml(framework.description)}</p><p class="priority-score-preview" data-priority-preview="${escapeHtml(framework.id)}" role="status" aria-live="polite">${escapeHtml(priorityScorePreviewText(framework, inputs))}</p>${framework.id === "rice" ? riceScoringHelpMarkup() : ""}<div class="priority-input-grid">${framework.id === "rice" ? ricePriorityInputsMarkup(inputs) : framework.fields.map((field) => `<label><span>${escapeHtml(field.name)}${framework.builtIn ? "" : ` · weight ${field.weight}`}</span><input name="${escapeHtml(priorityFieldInputName(framework.id, field.id))}" data-priority-framework="${escapeHtml(framework.id)}" data-priority-field="${escapeHtml(field.id)}" aria-label="${escapeHtml(field.name)}" aria-describedby="priority-help-${escapeHtml(framework.id)}-${escapeHtml(field.id)}" type="number" min="${field.min}" max="${field.max}" step="${field.step}" value="${inputs[field.id] === undefined ? "" : escapeHtml(inputs[field.id])}" inputmode="decimal"><small id="priority-help-${escapeHtml(framework.id)}-${escapeHtml(field.id)}">${field.min} to ${field.max}. ${field.direction === "lower" ? "Lower is better" : "Higher is better"}.</small></label>`).join("")}</div></fieldset>`;
}

function ricePriorityInputsMarkup(inputs) {
  return `<label><span>Reach</span><input name="reach" aria-label="Reach" aria-describedby="priority-help-rice-reach" data-priority-framework="rice" data-priority-field="reach" type="number" min="0" max="100000" value="${inputs.reach === undefined ? "" : escapeHtml(inputs.reach)}"><small id="priority-help-rice-reach">0 to 100000 people.</small></label><label><span>Impact</span><input name="impact" aria-label="Impact" aria-describedby="priority-help-rice-impact" data-priority-framework="rice" data-priority-field="impact" type="number" min="1" max="5" value="${inputs.impact === undefined ? "" : escapeHtml(inputs.impact)}"><small id="priority-help-rice-impact">1 to 5. Higher is better.</small></label><label><span>Confidence (%)</span><input name="confidence" aria-label="Confidence (%)" aria-describedby="priority-help-rice-confidence" data-priority-framework="rice" data-priority-field="confidence" data-priority-scale="100" type="number" min="10" max="100" value="${inputs.confidence === undefined ? "" : confidencePercent(inputs.confidence)}"><small id="priority-help-rice-confidence">10% to 100%.</small></label><label><span>Effort</span><select name="effort" aria-label="Effort" aria-describedby="priority-help-rice-effort" data-priority-framework="rice" data-priority-field="effort"><option value="">Unscored</option>${effortOptions(inputs.effort)}</select><small id="priority-help-rice-effort">1 to 8. Lower is better.</small></label>`;
}

function riceScoringHelpMarkup() {
  return `<details class="priority-help"><summary>How RICE scoring works</summary><p>Compare initiatives using the same audience and time period.</p><ul><li><strong>Reach:</strong> how many people the work will affect.</li><li><strong>Impact:</strong> expected benefit per person, from 1 (low) to 5 (high).</li><li><strong>Confidence:</strong> how certain you are about the estimates, from 10% to 100%.</li><li><strong>Effort:</strong> relative work required: XS = 1, S = 2, M = 3, L = 5, XL = 8.</li></ul><p>Multiply Reach × Impact × Confidence, then divide by Effort. Use confidence as a fraction: 80% = 0.8. For example, 100 × 3 × 0.8 ÷ 2 gives a score of 120.</p></details>`;
}

function priorityEditorFocus(item, framework) {
  if (framework.id === "manual") return "";
  if (framework.id === "levels") return "priorityLevelId";
  const result = priorityScore(item, framework, state.prioritization);
  return priorityFieldInputName(framework.id, result.missingFields[0] || framework.fields[0]?.id || "");
}

function priorityScorePreviewText(framework, inputs) {
  const saved = state.initiativeEditor.mode === "edit" ? initiativeEditorItem() : null;
  const savedScore = saved ? priorityScore(saved, framework, state.prioritization) : null;
  const draftScore = priorityScore({ priorityInputs: { [framework.id]: inputs } }, framework, state.prioritization);
  return `Saved score: ${savedScore ? savedScore.complete ? savedScore.value : "Unscored" : "Not saved"}. Draft score: ${draftScore.complete ? draftScore.value : "Unscored"}. Changes apply after Save.`;
}

function refreshPriorityScorePreviews(form, values) {
  form.querySelectorAll("[data-priority-preview]").forEach(preview => {
    const framework = priorityFrameworkForId(state.prioritization, preview.dataset.priorityPreview);
    preview.textContent = priorityScorePreviewText(framework, values.priorityInputs?.[framework.id] || {});
  });
}

function priorityFieldInputName(frameworkId, fieldId) {
  return frameworkId === "rice" ? fieldId : `priority_${frameworkId}_${fieldId}`;
}

function initiativeEditorItem() {
  return state.items.find((entry) => entry.id === state.initiativeEditor.selectedId) || null;
}

function openInitiativeEditor(mode, trigger, selectedId = "", defaults = null, actionContext = null) {
  if (teamEditorReadOnlyReason() || (mode === "edit" && !state.items.length)) return;
  const initialId = mode === "edit" ? selectedId || state.items[0]?.id || "" : "";
  const recordField = actionContext?.editor?.field || trigger?.dataset?.editorFocus;
  if (mode === "edit" && ["nextStep", "decision", "experiment"].includes(recordField)) {
    openInitiativeWorkRecord(initialId, recordField === "nextStep" ? "action" : recordField === "experiment" ? "validation" : "decision", trigger, actionContext);
    return;
  }
  state.initiativeEditor = createInitiativeEditorState({
    mode,
    selectedId: initialId,
    selectedFromCard: Boolean(selectedId),
    triggerId: trigger?.id || (mode === "edit" ? "editInitiativeButton" : "newInitiativeButton"),
    focusField: actionContext?.editor?.field || trigger?.dataset?.editorFocus || "",
    actionContext,
    moreDetailsOpen: actionContext?.editor?.disclosure === "more-details" || Boolean(trigger?.dataset?.editorFocus),
    draft: mode === "new" && defaults ? { ...blankInitiativeValues(), ...defaults } : null
  });
  render();
}

function requestInitiativeEditorClose() {
  document.querySelector("#initiativeEditorDialog")?.close("cancel");
}

function finishInitiativeEditorClose() {
  const triggerId = state.initiativeEditor.triggerId;
  if (state.initiativeEditor.mode === "new") state.pendingInsightPromotionId = "";
  state.initiativeEditor = createInitiativeEditorState();
  render();
  document.getElementById(triggerId)?.focus();
}

function captureInitiativeEditorDraft(event) {
  if (!state.initiativeEditor.mode
    || ["initiativeEditorSearch", "initiativeEditorPicker", "initiativeTargetSearch"].includes(event.target.id)
    || event.target.name === "initiativeTargetKind"
    || event.target.dataset.initiativeTargetKind) return;
  if (event.target.name === "pocPersonId") {
    const ownerInput = event.currentTarget.elements.owner;
    if (ownerInput) ownerInput.value = organizationPersonName(event.target.value);
  }
  state.initiativeEditor.draft = initiativeValuesFromForm(event.currentTarget);
  if (event.target.dataset.priorityFramework) refreshPriorityScorePreviews(event.currentTarget, state.initiativeEditor.draft);
  if (["startDate", "dueDate"].includes(event.target.name)) refreshInitiativeTimelinePreview(event.currentTarget);
}

function refreshInitiativeTimelinePreview(form) {
  const preview = document.querySelector("#initiativeTimelinePreview");
  if (preview) preview.textContent = describeInitiativeTimeline(initiativeValuesFromForm(form), state.planningCalendar);
}

function refreshInitiativePriorityFields(event) {
  if (event.target.name !== "orgUnitId") return;
  state.initiativeEditor.draft = initiativeValuesFromForm(event.currentTarget);
  render();
  queueMicrotask(() => document.querySelector('#initiativeEditorForm [name="orgUnitId"]')?.focus());
}

function initiativePickerResultText(count) {
  return count ? `${count} of ${state.items.length} initiatives match.` : "No initiatives match. Clear search to see all initiatives.";
}

function filterInitiativeEditorOptions(event) {
  const query = event.currentTarget.value.trim().toLowerCase();
  state.initiativeEditor.search = event.currentTarget.value;
  const picker = document.querySelector("#initiativeEditorPicker");
  if (!picker) return;
  for (const option of picker.options) option.hidden = Boolean(query) && !option.dataset.searchText.includes(query);
  document.querySelector("#initiativePickerResults").textContent = initiativePickerResultText([...picker.options].filter(option => !option.hidden).length);
  document.querySelector("#clearInitiativeEditorSearch").disabled = !event.currentTarget.value;
}

async function selectInitiativeForEditor(event) {
  const picker = event.currentTarget;
  const nextId = picker.value;
  const editor = state.initiativeEditor;
  if (nextId === editor.selectedId || editor.saving) return;
  // Keep the displayed selection tied to the draft until departure is approved.
  picker.value = editor.selectedId;
  if (editor.draft) {
    const confirmed = await requestDataConfirmation({
      title: "Discard edits and switch initiative?",
      description: "Your edits have not been saved. Cancel to keep editing and save them, or discard these edits to open the other initiative.",
      confirmLabel: "Discard edits and switch",
      trigger: picker
    });
    if (!confirmed || state.initiativeEditor !== editor) return;
  }
  if (!state.items.some(item => item.id === nextId)) {
    editor.error = "That initiative is no longer available. Your current draft is unchanged.";
    document.querySelector("#initiativeEditorError").textContent = editor.error;
    return;
  }
  editor.selectedId = nextId;
  editor.draft = null;
  editor.error = "";
  render();
  queueMicrotask(() => document.querySelector("#initiativeTitle")?.focus());
}

function handleInitiativeTargetClick(event) {
  const openButton = event.target.closest("#openInitiativeTargetPicker");
  if (openButton) {
    if (state.initiativeEditor.targetPickerOpen) closeInitiativeTargetPicker();
    else openInitiativeTargetPicker();
    return;
  }
  const closeButton = event.target.closest("#closeInitiativeTargetPicker");
  if (closeButton) {
    closeInitiativeTargetPicker();
    return;
  }
  const removeButton = event.target.closest("[data-remove-initiative-target]");
  if (removeButton) removeInitiativeTarget(removeButton);
}

function handleInitiativeTargetChange(event) {
  if (event.target.name === "initiativeTargetKind") {
    state.initiativeEditor.targetPickerKind = initiativeTargetKind(event.target.value);
    state.initiativeEditor.targetQuery = "";
    const search = document.querySelector("#initiativeTargetSearch");
    if (search) {
      search.value = "";
      search.previousElementSibling.textContent = `Search ${state.initiativeEditor.targetPickerKind === "segments" ? "segments" : "customers"}`;
      search.placeholder = state.initiativeEditor.targetPickerKind === "segments" ? "Search segment name or rules" : "Search account, domain, industry, or region";
    }
    refreshInitiativeTargetPicker();
    search?.focus();
    return;
  }
  const checkbox = event.target.closest("[data-initiative-target-kind]");
  if (checkbox) toggleInitiativeTarget(checkbox);
}

function openInitiativeTargetPicker() {
  const form = document.querySelector("#initiativeEditorForm");
  if (!form) return;
  state.initiativeEditor.draft = initiativeValuesFromForm(form);
  state.initiativeEditor.targetPickerOpen = true;
  state.initiativeEditor.targetPickerKind = initiativeTargetKind(state.initiativeEditor.targetPickerKind);
  state.initiativeEditor.targetQuery = "";
  render();
  queueMicrotask(() => document.querySelector("#initiativeTargetSearch")?.focus());
}

function closeInitiativeTargetPicker() {
  const form = document.querySelector("#initiativeEditorForm");
  if (form) state.initiativeEditor.draft = initiativeValuesFromForm(form);
  state.initiativeEditor.targetPickerOpen = false;
  state.initiativeEditor.targetQuery = "";
  render();
  queueMicrotask(() => document.querySelector("#openInitiativeTargetPicker")?.focus());
}

function handleInitiativeEditorCancel(event) {
  if (!state.initiativeEditor.targetPickerOpen) return;
  event.preventDefault();
  closeInitiativeTargetPicker();
}

function filterInitiativeTargets(event) {
  state.initiativeEditor.targetQuery = event.currentTarget.value;
  refreshInitiativeTargetPicker();
}

function refreshInitiativeTargetPicker() {
  const form = document.querySelector("#initiativeEditorForm");
  const list = document.querySelector("#initiativeTargetPickerList");
  const summary = document.querySelector("#initiativeTargetResultSummary");
  if (!form || !list || !summary) return;
  const values = initiativeValuesFromForm(form);
  const result = initiativeTargetOptions(state.initiativeEditor.targetPickerKind, state.initiativeEditor.targetQuery, values);
  list.innerHTML = result.html;
  summary.textContent = result.summary;
  list.setAttribute("aria-label", `${state.initiativeEditor.targetPickerKind === "segments" ? "Segment" : "Customer"} targets`);
}

function toggleInitiativeTarget(checkbox) {
  const form = document.querySelector("#initiativeEditorForm");
  if (!form) return;
  const kind = checkbox.dataset.initiativeTargetKind;
  const field = kind === "segments" ? "segmentIds" : "customerIds";
  const values = initiativeValuesFromForm(form);
  const next = new Set(values[field]);
  if (checkbox.checked) next.add(checkbox.value);
  else next.delete(checkbox.value);
  values[field] = [...next];
  values.customer = customerDisplayProjection(values, state.customerDirectory);
  state.initiativeEditor.draft = values;
  syncInitiativeTargetControls(values);
  refreshInitiativeTargetPicker();
  const entry = kind === "segments"
    ? state.customerDirectory.segments.find((segment) => segment.id === checkbox.value)
    : state.customerDirectory.accounts.find((account) => account.id === checkbox.value);
  announceInitiativeTarget(`${checkbox.checked ? "Added" : "Removed"} ${kind === "segments" ? "segment" : "account"} ${entry?.name || "target"}.`);
  queueMicrotask(() => document.querySelector(`[data-initiative-target-kind="${cssEscape(kind)}"][value="${cssEscape(checkbox.value)}"]`)?.focus());
}

function removeInitiativeTarget(button) {
  const form = document.querySelector("#initiativeEditorForm");
  if (!form) return;
  const kind = button.dataset.removeInitiativeTarget;
  const field = kind === "segments" ? "segmentIds" : "customerIds";
  const values = initiativeValuesFromForm(form);
  values[field] = values[field].filter((id) => id !== button.dataset.targetId);
  values.customer = customerDisplayProjection(values, state.customerDirectory);
  state.initiativeEditor.draft = values;
  const label = button.querySelector("strong")?.textContent || "target";
  syncInitiativeTargetControls(values);
  if (state.initiativeEditor.targetPickerOpen) refreshInitiativeTargetPicker();
  announceInitiativeTarget(`Removed ${kind === "segments" ? "segment" : "account"} ${label}.`);
  queueMicrotask(() => document.querySelector("#openInitiativeTargetPicker")?.focus());
}

function syncInitiativeTargetControls(values) {
  const inputs = document.querySelector("#initiativeTargetInputs");
  const chips = document.querySelector("#initiativeTargetChipList");
  const help = document.querySelector(".initiative-target-help");
  if (inputs) inputs.innerHTML = initiativeTargetHiddenInputsMarkup(values);
  if (chips) chips.innerHTML = initiativeTargetChipsMarkup(values);
  const count = values.segmentIds.length + values.customerIds.length;
  if (help) help.textContent = `${count ? `${count} selected. ` : ""}Named accounts also contribute their matching saved segments to reporting.`;
}

function announceInitiativeTarget(message) {
  const status = document.querySelector("#initiativeTargetStatus");
  if (status) status.textContent = message;
}

function initiativeValuesFromForm(form) {
  const data = new FormData(form);
  const input = Object.fromEntries(data);
  const current = state.initiativeEditor.draft || initiativeEditorItem() || blankInitiativeValues();
  const currentPriorityLevelId = String(current.priorityLevelId || current.priority?.tierByMethod?.levels || "").trim();
  const priorityLevelControl = form.elements.namedItem("priorityLevelId");
  const hasField = (name) => Boolean(form.elements.namedItem(name));
  const priorityInputs = { ...normalizePriorityInputs(current.priorityInputs || {}) };
  for (const control of form.querySelectorAll("[data-priority-framework][data-priority-field]")) {
    const frameworkId = control.dataset.priorityFramework;
    const fieldId = control.dataset.priorityField;
    const nextFramework = { ...(priorityInputs[frameworkId] || {}) };
    if (String(control.value).trim() === "") delete nextFramework[fieldId];
    else nextFramework[fieldId] = Number(control.value) / Number(control.dataset.priorityScale || 1);
    if (Object.keys(nextFramework).length) priorityInputs[frameworkId] = nextFramework;
    else delete priorityInputs[frameworkId];
  }
  const rice = priorityInputs.rice || {};
  let pocPersonId = hasField("pocPersonId") ? String(input.pocPersonId || "").trim() : current.pocPersonId || "";
  const pointOfContact = organizationPersonName(pocPersonId);
  const typedOwner = hasField("owner") ? String(input.owner || "").trim() : current.owner || "";
  if (pocPersonId && typedOwner && typedOwner !== pointOfContact) pocPersonId = "";
  const values = {
    title: String(input.title || "").trim(),
    customer: "",
    customerIds: hasField("customerIds") ? data.getAll("customerIds").map(String) : [...(current.customerIds || [])],
    segmentIds: hasField("segmentIds") ? data.getAll("segmentIds").map(String) : [...(current.segmentIds || [])],
    problem: String(input.problem || "").trim(),
    objective: hasField("objective") ? String(input.objective || "").trim() : current.objective || "",
    primaryMetric: hasField("primaryMetric") ? String(input.primaryMetric || "").trim() : current.primaryMetric || "",
    metricTarget: hasField("metricTarget") ? String(input.metricTarget || "").trim() : current.metricTarget || "",
    metricReviewDate: hasField("metricReviewDate") ? String(input.metricReviewDate || "").trim() : current.metricReviewDate || "",
    owner: organizationPersonName(pocPersonId) || typedOwner,
    pocPersonId,
    orgUnitId: hasField("orgUnitId") ? String(input.orgUnitId || "").trim() : current.orgUnitId || "",
    priorityLevelId: priorityLevelControl ? String(input.priorityLevelId || "").trim() : currentPriorityLevelId,
    statusId: String(input.statusId || state.workflow.defaultStatusId),
    reach: rice.reach ?? current.reach,
    impact: rice.impact ?? current.impact,
    confidence: rice.confidence ?? current.confidence,
    effort: rice.effort ?? current.effort,
    priorityInputs,
    startDate: hasField("startDate") ? String(input.startDate || "").trim() : current.startDate || "",
    dueDate: String(input.dueDate || "").trim(),
    experiment: ""
  };
  values.priority = {
    ...(current.priority || { valuesByMethod: {}, tierByMethod: {} }),
    tierByMethod: values.priorityLevelId ? { levels: values.priorityLevelId } : {}
  };
  values.status = statusForId(state.workflow, values.statusId).category;
  values.customer = customerDisplayProjection(values, state.customerDirectory);
  return values;
}

async function saveInitiativeEditor(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const title = form.querySelector("#initiativeTitle");
  const values = initiativeValuesFromForm(form);
  state.initiativeEditor.draft = values;
  if (!values.title) {
    state.initiativeEditor.error = "Title is required.";
    title?.setCustomValidity("Title is required.");
    title?.reportValidity();
    title?.focus();
    const error = document.querySelector("#initiativeEditorError");
    if (error) error.textContent = state.initiativeEditor.error;
    return;
  }
  try {
    assertPriorityAssignments(state.prioritization, state.organization, [{ id: state.initiativeEditor.selectedId || "new-initiative", title: values.title, priorityInputs: values.priorityInputs, priority: values.priority, priorityLevelId: values.priorityLevelId }]);
  } catch (error) {
    state.initiativeEditor.error = error?.message || "The prioritization inputs are invalid.";
    const errorNode = document.querySelector("#initiativeEditorError");
    if (errorNode) errorNode.textContent = state.initiativeEditor.error;
    errorNode?.focus();
    return;
  }
  title?.setCustomValidity("");
  const dueDate = form.elements.dueDate;
  if (initiativeDateRange(values).invalid) {
    state.initiativeEditor.error = "Target / due date cannot be earlier than planned start.";
    dueDate?.setCustomValidity(state.initiativeEditor.error);
    dueDate?.reportValidity();
    dueDate?.focus();
    const error = document.querySelector("#initiativeEditorError");
    if (error) error.textContent = state.initiativeEditor.error;
    const fields = dueDate?.closest(".initiative-editor-fields");
    const dueDateField = dueDate?.closest("label");
    if (fields && dueDateField) fields.scrollTop += dueDateField.getBoundingClientRect().top - fields.getBoundingClientRect().top - 92;
    return;
  }
  dueDate?.setCustomValidity("");
  if (state.team.active) {
    await saveTeamInitiativeEditor(values);
    return;
  }
  await saveBrowserInitiativeEditor(values);
}

async function saveBrowserInitiativeEditor(values) {
  const editor = state.initiativeEditor;
  let announcement;
  if (editor.mode === "new") {
    const item = createItem(values);
    const discovery = state.insightRecords.find(record => record.id === state.pendingInsightPromotionId);
    const insightRecords = discovery ? updateInsightRecord(state.insightRecords, discovery.id, { initiativeId: item.id, status: "promoted" }) : state.insightRecords;
    const entries = [createActivityEntry("created", item, { title: item.title })];
    if (discovery) entries.unshift(createActivityEntry("insight-promoted", discovery, { initiativeId: { from: "", to: item.id }, status: { from: discovery.status, to: "promoted" } }));
    try { await commitLocalWorkspacePatch({ items: [item, ...state.items], insightRecords }, entries); }
    catch (error) { editor.error = localInitiativeSaveError(error); render(); return; }
    state.pendingInsightPromotionId = "";
    announcement = `Added ${item.title}.`;
  } else {
    const item = initiativeEditorItem();
    if (!item) {
      state.initiativeEditor.error = "That initiative is no longer available.";
      render();
      return;
    }
    const changes = initiativeChanges(item, values);
    try {
      await commitLocalInitiativeUpdate(updateItem(state.items, item.id, values), createActivityEntry("updated", item, changes));
    } catch (error) {
      editor.error = localInitiativeSaveError(error);
      const errorNode = document.querySelector("#initiativeEditorError");
      if (errorNode) errorNode.textContent = editor.error;
      errorNode?.focus();
      return;
    }
    announcement = `Updated ${values.title}.`;
  }
  completeInitiativeEditorSave(announcement, editor.triggerId, editor.actionContext);
}

async function commitLocalInitiativeUpdate(items, activityEntry, scope = null) {
  await commitLocalWorkspacePatch({ items }, [activityEntry], scope);
}

function localInitiativeSaveError(error, hasDraft = true) {
  if (error?.code === "LOCAL_WORKSPACE_CHANGED") return error.message;
  return error instanceof AggregateError
    ? `The change could not be saved and browser recovery was incomplete. ${hasDraft ? "Your draft is still open. Preserve it before reloading." : "Preserve your workspace before reloading."}`
    : `The change could not be saved in this browser. ${hasDraft ? "Your draft is still open. Try saving again." : "Try the change again."}`;
}

async function saveTeamInitiativeEditor(values) {
  if (teamMutationDisabled()) return;
  const editor = state.initiativeEditor;
  const mode = editor.mode;
  const item = mode === "edit" ? initiativeEditorItem() : null;
  const createAttempt = mode === "new"
    ? teamItemCreateAttempt("initiative-editor", values)
    : null;
  if (mode === "edit" && !item) {
    state.initiativeEditor.error = "That initiative is no longer available.";
    render();
    return;
  }
  state.initiativeEditor.saving = true;
  state.initiativeEditor.error = "";
  state.team.mutationBusy = true;
  render();
  const patch = mode === "edit" ? changedTeamItemPatch(item, values) : values;
  if (mode === "edit" && !Object.keys(patch).length) {
    state.team.mutationBusy = false;
    completeInitiativeEditorSave(`No changes to save for ${values.title}.`, editor.triggerId);
    return;
  }
  try {
    const result = mode === "new"
      ? await state.team.repository.createItem({
        ...createAttempt.item,
        createAttemptId: createAttempt.id
      })
      : await state.team.repository.updateItem(item.id, patch, item.version);
    if (createAttempt) clearTeamItemCreateAttempt("initiative-editor", createAttempt);
    applyTeamSnapshot(result?.snapshot);
    if (mode === "new" && state.pendingInsightPromotionId && result?.item?.id) {
      const discovery = state.insightRecords.find((record) => record.id === state.pendingInsightPromotionId);
      if (discovery) {
        const linked = await state.team.repository.updateInsightRecord(discovery.id, { initiativeId: result.item.id, status: "promoted" }, discovery.version);
        applyTeamSnapshot(linked?.snapshot);
      }
      state.pendingInsightPromotionId = "";
    }
    state.team.conflict = null;
    state.team.status = "Team workspace updated.";
    state.team.mutationBusy = false;
    completeInitiativeEditorSave(`${mode === "new" ? "Added" : "Updated"} ${values.title}.`, editor.triggerId, editor.actionContext);
  } catch (error) {
    state.team.mutationBusy = false;
    if (createAttempt && !isAmbiguousTeamError(error)) {
      clearTeamItemCreateAttempt("initiative-editor", createAttempt);
    }
    if (mode === "edit" && isTeamConflict(error)) {
      const outcome = await resolveTeamConflictDraft(prepareTeamUpdateDraft({ operation: "update", itemId: item.id, itemTitle: item.title, patch }, item));
      state.initiativeEditor = createInitiativeEditorState();
      state.editorAnnouncement = outcome === "retried"
        ? `Updated ${values.title}; an unrelated server edit was preserved.`
        : "The initiative changed. Your draft is available in conflict review.";
      render();
      document.querySelector(outcome === "retried" ? "#viewTitle" : "#teamConflictTitle")?.focus();
      return;
    }
    if (isTeamAccessLoss(error)) {
      state.initiativeEditor = createInitiativeEditorState();
      await exitTeamForBoundary(teamAccessLossMessage(error));
      return;
    }
    state.initiativeEditor.saving = false;
    state.initiativeEditor.error = safeTeamError(error, "The initiative could not be saved.");
    render();
    document.querySelector("#initiativeEditorError")?.focus();
  }
}

function initiativeChanges(item, values) {
  return Object.fromEntries(Object.entries(values).flatMap(([field, value]) => item[field] === value ? [] : [[field, { from: item[field], to: value }]]));
}

function changedTeamItemPatch(item, values) {
  const targetingUnchanged = teamValuesEqual(item?.customerIds || [], values.customerIds || [])
    && teamValuesEqual(item?.segmentIds || [], values.segmentIds || []);
  return Object.fromEntries(Object.entries(values).filter(([field, value]) => {
    if (field === "customer" && targetingUnchanged) return false;
    return !teamValuesEqual(item?.[field], value);
  }));
}

function completeInitiativeEditorSave(announcement, triggerId, actionContext = null) {
  state.initiativeEditor = createInitiativeEditorState();
  if (actionContext) {
    finishActionMutation(actionContext, announcement);
    return;
  }
  state.editorAnnouncement = announcement;
  render();
  (document.getElementById(triggerId) || document.querySelector("#viewTitle"))?.focus();
}

function finishActionMutation(actionContext, fallbackAnnouncement) {
  state.items = projectCanonicalInitiativeRecords(state.items, state.insightRecords);
  const completed = isActionQueueEntryComplete(actionContext, state.items, new Date());
  state.editorAnnouncement = completed
    ? `Completed: ${actionContext.heading}.`
    : `${fallbackAnnouncement} This action is still open: ${actionContext.requestedOutcome}`;
  if (actionContext.origin === "queue" && state.initiativeDetail.selectedId) {
    clearInitiativeDetailUrl();
    state.initiativeDetail = createInitiativeDetailState();
  }
  render();
  focusAfterActionMutation(actionContext, completed);
}

function focusAfterActionMutation(actionContext, completed) {
  queueMicrotask(() => {
    const container = actionContext.origin === "detail" ? ".initiative-detail-action-list" : ".action-queue";
    const sameAction = [...document.querySelectorAll(`${container} [data-action-entry]`)]
      .find((card) => card.dataset.actionEntry === actionContext.id);
    if (!completed && sameAction) {
      (sameAction.querySelector("[data-complete-action]") || sameAction.querySelector("[data-open-initiative]") || sameAction)?.focus();
      return;
    }
    const cards = [...document.querySelectorAll(`${container} [data-action-entry]`)];
    const nextCard = cards[Math.min(actionContext.queueIndex, Math.max(0, cards.length - 1))];
    const nextControl = nextCard?.querySelector("[data-complete-action]") || nextCard?.querySelector("[data-open-initiative]");
    const fallback = document.querySelector(actionContext.origin === "detail" ? "#initiativeActionsTitle" : "#actionQueueTitle");
    (nextControl || fallback || document.querySelector("#viewTitle"))?.focus();
  });
}

function teamMutationDisabled() {
  if (!state.team.active) return false;
  return state.team.mutationBusy
    || state.team.connection !== "live"
    || !["owner", "editor"].includes(state.team.role);
}

function teamConflictMarkup() {
  const conflict = state.team.conflict;
  if (!conflict) return "";
  const item = state.items.find((entry) => entry.id === conflict.itemId);
  const title = conflict.ambiguous ? "Confirm the initiative update" : "This initiative changed";
  const message = conflict.ambiguous
    ? "The connection ended before Team confirmed the update. Review the latest snapshot, then retry the same record patch if needed."
    : `${item?.title || conflict.itemTitle || "This initiative"} changed while you were editing. Your change was not saved.`;
  return `<section class="team-conflict" role="alert" aria-labelledby="teamConflictTitle"><h3 id="teamConflictTitle" tabindex="-1">${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p>${teamConflictDiffMarkup(conflict, item)}<div class="conflict-actions"><button class="secondary" id="reviewTeamConflictButton" type="button">Review latest</button><button class="secondary" id="retryTeamDraftButton" type="button">Retry my draft</button><button class="danger" id="discardTeamDraftButton" type="button">Discard draft</button></div></section>`;
}

function teamConflictDiffMarkup(conflict, current) {
  if (!conflict?.patch || !conflict.base || !current) return "";
  const fields = Object.keys(conflict.patch).filter((field) => !teamValuesEqual(conflict.base[field], current[field]));
  if (!fields.length) return "";
  return `<dl class="team-conflict-diff">${fields.map((field) => `<div><dt>${escapeHtml(field)}</dt><dd><span>Your value</span><code>${escapeHtml(teamConflictValue(conflict.patch[field]))}</code><span>Server value</span><code>${escapeHtml(teamConflictValue(current[field]))}</code></dd></div>`).join("")}</dl>`;
}

function teamConflictValue(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return String(text ?? "Not set").slice(0, 360);
}

async function deleteInitiativeFromEditor(event) {
  if (teamMutationDisabled()) return;
  const item = initiativeEditorItem();
  if (!item) return;
  const confirmed = await requestDataConfirmation({
    title: `Delete ${item.title}?`,
    description: "This permanently removes the initiative. Its existing activity history remains available for audit.",
    confirmLabel: "Delete initiative",
    trigger: event.currentTarget
  });
  if (!confirmed) {
    state.editorAnnouncement = `Deletion cancelled. ${item.title} was not changed.`;
    const status = document.querySelector("#initiativeEditorStatus");
    if (status) status.textContent = state.editorAnnouncement;
    return;
  }
  if (!state.team.active) {
    try { await commitLocalWorkspacePatch({ items: deleteItem(state.items, item.id) }, [createActivityEntry("deleted", item, { status: item.status })]); }
    catch (error) { state.initiativeEditor.error = localInitiativeSaveError(error); render(); return; }
    state.initiativeEditor = createInitiativeEditorState();
    state.editorAnnouncement = `Deleted ${item.title}.`;
    clearDeletedInitiativeDetail(item.id);
    render();
    document.querySelector("#viewTitle")?.focus();
    return;
  }
  state.initiativeEditor = createInitiativeEditorState();
  await runTeamMutation(
    { operation: "delete", itemId: item.id, itemTitle: item.title },
    () => state.team.repository.deleteItem(item.id, item.version),
    { successAnnouncement: `Deleted ${item.title}.` }
  );
}

function clearDeletedInitiativeDetail(itemId) {
  if (state.initiativeDetail.selectedId === itemId || new URLSearchParams(location.search).get("initiative") === itemId) {
    clearInitiativeDetailUrl();
  }
}

async function runTeamMutation(draft, action, { successAnnouncement = "", createAttempt = null } = {}) {
  if (!state.team.active || state.team.mutationBusy || teamMutationDisabled()) return;
  state.team.mutationBusy = true;
  state.team.error = false;
  const preparedDraft = prepareTeamUpdateDraft(draft);
  try {
    const result = await action();
    const applied = applyTeamSnapshot(result?.snapshot);
    if (applied && draft.operation === "delete" && !state.items.some(item => item.id === draft.itemId)) clearDeletedInitiativeDetail(draft.itemId);
    if (createAttempt) clearTeamItemCreateAttempt(createAttempt.scope, createAttempt.attempt);
    state.team.conflict = null;
    state.team.status = "Team workspace updated.";
    if (successAnnouncement) state.editorAnnouncement = successAnnouncement;
  } catch (error) {
    if (createAttempt && !isAmbiguousTeamError(error)) {
      clearTeamItemCreateAttempt(createAttempt.scope, createAttempt.attempt);
    }
    if (isTeamConflict(error)) {
      const outcome = await resolveTeamConflictDraft(preparedDraft);
      if (outcome === "retried" && successAnnouncement) state.editorAnnouncement = `${successAnnouncement} An unrelated server edit was preserved.`;
    }
    else if (isTeamAccessLoss(error)) await exitTeamForBoundary(teamAccessLossMessage(error));
    else {
      state.team.error = true;
      state.team.status = safeTeamError(error, "The team change could not be saved.");
    }
  } finally {
    state.team.mutationBusy = false;
    render();
    document.querySelector(state.team.conflict ? "#teamConflictTitle" : "#viewTitle")?.focus();
  }
}

function isTeamConflict(error) {
  return error?.code === "VERSION_CONFLICT" || error?.code === "REMOTE_CONFLICT";
}

function prepareTeamUpdateDraft(draft, item = state.items.find((entry) => entry.id === draft?.itemId)) {
  if (draft?.operation !== "update" || !draft.patch || draft.base) return draft;
  return {
    ...draft,
    base: Object.fromEntries(Object.keys(draft.patch).map((field) => [field, structuredClone(item?.[field])]))
  };
}

async function resolveTeamConflictDraft(draft) {
  if (draft?.operation !== "update" || !draft.patch || !draft.base || draft.ambiguous) {
    await preserveTeamConflict(draft);
    return "conflict";
  }
  let refreshed = false;
  try {
    await refreshActiveTeamSnapshot();
    refreshed = true;
    const current = state.items.find((entry) => entry.id === draft.itemId);
    const fieldsUnchanged = current && Object.keys(draft.patch).every((field) => teamValuesEqual(current[field], draft.base[field]));
    if (fieldsUnchanged) {
      const result = await state.team.repository.updateItem(draft.itemId, draft.patch, current.version);
      applyTeamSnapshot(result?.snapshot);
      state.team.conflict = null;
      state.team.error = false;
      state.team.status = "Saved after preserving an unrelated server change.";
      return "retried";
    }
  } catch (error) {
    if (isTeamAccessLoss(error)) {
      await exitTeamForBoundary(teamAccessLossMessage(error));
      return "access-lost";
    }
  }
  await preserveTeamConflict(draft, { refresh: !refreshed });
  return "conflict";
}

function teamValuesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isAmbiguousTeamError(error) {
  return error?.code === "REMOTE_ERROR" && error?.details?.ambiguous === true;
}

function isTeamAccessLoss(error) {
  return error?.code === "AUTH_REQUIRED"
    || (error?.code === "PERMISSION_DENIED" && error?.details?.accessRevoked !== false);
}

function teamAccessLossMessage(error) {
  return error?.code === "AUTH_REQUIRED"
    ? "Your team session ended. Sign in again to reopen this workspace."
    : "You no longer have access to that team workspace. Your browser workspace is open.";
}

function teamItemCreateAttempt(scope, values) {
  const key = JSON.stringify(values);
  const retained = state.team.itemCreateAttempts[scope];
  if (retained?.key === key) return retained;
  const attempt = {
    id: teamCreateAttemptId("item"),
    item: createItem(values),
    key
  };
  state.team.itemCreateAttempts[scope] = attempt;
  return attempt;
}

function clearTeamItemCreateAttempt(scope, attempt) {
  if (state.team.itemCreateAttempts[scope] === attempt) {
    delete state.team.itemCreateAttempts[scope];
  }
}

function teamCreateAttemptId(kind) {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) return `${kind}-${randomId}`;
  teamAttemptSequence += 1;
  return `${kind}-${Date.now().toString(36)}-${teamAttemptSequence.toString(36)}`;
}

async function preserveTeamConflict(draft, { refresh = true } = {}) {
  state.team.conflict = { ...draft };
  state.team.error = true;
  state.team.status = draft.ambiguous
    ? "Team did not confirm the update. The exact record patch is retained for review and retry."
    : "The initiative changed before your update was saved.";
  if (refresh) {
    try { await refreshActiveTeamSnapshot(); } catch { /* The current snapshot remains readable while reconnecting. */ }
  }
}

function reviewTeamConflict() {
  if (!state.team.conflict) return;
  state.selectedView = "initiatives";
  state.selectedMode = "list";
  state.query = "";
  render();
  document.querySelector(`[data-item-id="${cssEscape(state.team.conflict.itemId)}"]`)?.scrollIntoView({ block: "center" });
  document.querySelector("#teamConflictTitle")?.focus();
}

async function retryTeamDraft() {
  const draft = state.team.conflict;
  if (!draft || teamMutationDisabled()) return;
  const item = state.items.find((entry) => entry.id === draft.itemId);
  if (!item) {
    state.team.conflict = null;
    state.team.status = "The initiative is no longer available.";
    render();
    return;
  }
  if (draft.operation === "delete") {
    await runTeamMutation(draft, () => state.team.repository.deleteItem(item.id, item.version));
    return;
  }
  if (draft.operation === "update") {
    await runTeamMutation(draft, () => state.team.repository.updateItem(item.id, draft.patch, item.version));
  }
}

function discardTeamDraft() {
  state.team.conflict = null;
  state.team.error = false;
  state.team.status = "Your draft was discarded. The latest team version is open.";
  render();
  document.querySelector("#viewTitle")?.focus();
}

function applyTeamSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.items) || !Array.isArray(snapshot.activity)) return false;
  const artifacts = (Object.hasOwn(snapshot, "artifacts") ? snapshot.artifacts : []).map(normalizeArtifactRecord);
  state.items = snapshot.items.map((item) => ({
    ...createItem(item),
    version: Number.isInteger(item.version) ? item.version : 1,
    updatedAt: item.updatedAt,
    updatedBy: item.updatedBy
  }));
  state.insightRecords = (snapshot.insightRecords || []).map((record) => normalizeInsightRecord(record, { legacy: true, now: record.updatedAt, updatedBy: record.updatedBy }));
  state.codeRepositories = snapshot.codeRepositories || [];
  state.implementationRuns = snapshot.implementationRuns || [];
  state.artifacts = artifacts;
  state.activity = snapshot.activity.map((entry) => ({
    ...entry,
    actorId: typeof entry.actor === "object" ? entry.actor?.id || "" : entry.actorId || "",
    actor: typeof entry.actor === "object" ? entry.actor?.displayName || "Team member" : entry.actor || "Team member"
  }));
  const requestedPeriod = state.periodSelection;
  state.planningCalendar = normalizePlanningCalendar(snapshot.planningCalendar || emptyPlanningCalendar());
  state.periodSelection = normalizePeriodSelection(requestedPeriod, state.planningCalendar);
  if (requestedPeriod.kind !== "all" && state.periodSelection.kind === "all") {
    state.periodAnnouncement = "Planning calendar changed. Timeline scope reset to All time.";
  }
  state.organization = normalizeOrganization(snapshot.organization || emptyOrganization());
  state.customerDirectory = normalizeCustomerDirectory(snapshot.customerDirectory || emptyCustomerDirectory());
  state.workflow = normalizeInitiativeWorkflow(snapshot.workflow || defaultInitiativeWorkflow());
  state.prioritization = normalizePrioritization(snapshot.prioritization || defaultPrioritization());
  state.experience = normalizeWorkspaceExperience(snapshot.experience || fullWorkspaceExperience());
  state.experienceDraft = [...state.experience.enabledCapabilities];
  return true;
}

async function changeSourceSelection(event) {
  const selection = event.currentTarget.value;
  if (selection === "team" || selection === "local-server") {
    if (demoMode) {
      state.sourceSelection = sourceSelectionFor(state.source);
      state.syncStatus = "Team workspace is unavailable in demo mode.";
      renderAndFocus("syncStatus");
      return;
    }
    if (state.team.active) return;
    state.sourceSelection = selection;
    state.syncStatus = selection === "local-server"
      ? "Browser storage remains active until a local server workspace opens."
      : "Browser storage remains active until a Team Server workspace opens.";
    await initializeTeamSetup(selection);
    return;
  }
  if (state.team.active) {
    const confirmed = await requestDataConfirmation({
      title: "Leave team workspace?",
      description: `PM OS will close ${state.team.workspace?.name || "this team workspace"} and return to your saved browser workspace. Team data will not be copied.`,
      confirmLabel: "Return to Browser",
      trigger: event.currentTarget
    });
    if (!confirmed) {
      render();
      document.querySelector("#sourceType")?.focus();
      return;
    }
    await closeTeamWorkspace("Returned to the saved browser workspace. Team data was not copied.");
    if (selection !== state.source.type) {
      state.sourceSelection = selection;
      updateSourceSettings();
    }
    return;
  }
  if (state.team.client) await disposeTeamClient();
  state.team = createTeamState();
  state.sourceSelection = selection;
  updateSourceSettings();
}

async function initializeTeamSetup(selection = state.sourceSelection === "local-server" ? "local-server" : "team") {
  if (demoMode) return;
  const previousClient = state.team.client;
  if (previousClient) await disposeTeamClient();
  state.team = createTeamState({ mode: "loading", status: "Loading Team workspace setup." });
  state.sourceSelection = selection;
  render();
  try {
    const module = await import("./supabase-team-client.js?v=26");
    const injectedFactory = globalThis[teamFactoryHook];
    const factory = typeof injectedFactory === "function" ? injectedFactory : module.createSupabaseTeamClient;
    if (typeof factory !== "function") throw new Error("TEAM_UNAVAILABLE");
    const client = factory({});
    const managedConfig = readManagedTeamConfig(selection);
    state.team = createTeamState({
      mode: "choose-setup",
      status: managedConfig ? "Choose how to connect to Team workspace." : "Connect a Supabase project to use Team workspace.",
      managedConfig,
      client,
      allowWorkspaceCreation: Boolean(managedConfig?.allowWorkspaceCreation),
      authMode: managedConfig?.authMode || (selection === "local-server" ? "password" : "otp"),
      backendMode: managedConfig?.mode || (selection === "local-server" ? "personal-local" : "remote"),
      persistSession: Boolean(managedConfig?.persistSession)
    });
    state.team.unsubscribeConnection = client.subscribeConnection?.((status) => handleTeamConnection(status, client)) || null;
  } catch {
    state.team = createTeamState({ mode: "unavailable", error: true, status: "The Team workspace components could not be loaded." });
  }
  render();
  document.querySelector(state.team.mode === "unavailable" ? "#retryTeamLoadButton" : state.team.managedConfig ? "#teamManagedButton" : "#teamByoButton")?.focus();
}

function readManagedTeamConfig(selection = state.sourceSelection) {
  const config = resolveBackendRuntimeConfig(globalThis);
  if (!config) return null;
  if (selection === "local-server" && config.mode === "remote") return null;
  if (selection === "team" && config.mode !== "remote") return null;
  return config;
}

async function useManagedTeamSetup() {
  const managed = state.team.managedConfig;
  if (!managed) return;
  state.team.allowWorkspaceCreation = managed.allowWorkspaceCreation;
  await prepareTeamProject(managed);
}

async function checkByoTeamSetup(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.team.allowWorkspaceCreation = true;
  const local = state.sourceSelection === "local-server";
  await prepareTeamProject({
    url: form.get("url"),
    publishableKey: form.get("publishableKey"),
    mode: local ? "personal-local" : "remote",
    authMode: local ? "password" : form.get("authMode") === "password" ? "password" : "otp",
    persistSession: local
  });
}

async function prepareTeamProject(input) {
  let config;
  try {
    config = validateTeamConfigInput(input);
    state.team.client.validateConfig?.(config);
  } catch (error) {
    state.team.error = true;
    state.team.status = safeConfigError(error, input);
    render();
    document.querySelector(state.team.mode === "byo" ? "#teamProjectUrl" : "#teamManagedButton")?.focus();
    return;
  }
  await runTeamAction(async () => {
    if (state.projects?.persistent && serverConnectorPool?.persistent) {
      let connector = serverConnectorPool.registry.connectors.find((entry) =>
        entry.url === config.url && entry.publishableKey === config.publishableKey
        && entry.mode === config.mode && entry.authMode === config.authMode
        && entry.persistSession === config.persistSession
        && entry.allowWorkspaceCreation === state.team.allowWorkspaceCreation);
      if (!connector) connector = serverConnectorPool.register({
        ...config,
        id: `server-${globalThis.crypto?.randomUUID?.().toLowerCase() || Date.now().toString(36)}`.slice(0, 80),
        label: new URL(config.url).host,
        allowWorkspaceCreation: state.team.allowWorkspaceCreation
      });
      const client = serverConnectorPool.clientFor(connector.id);
      if (client !== state.team.client) {
        await disposeTeamClient();
        state.team.client = client;
        state.team.unsubscribeConnection = client.subscribeConnection?.((status) => handleTeamConnection(status, client)) || null;
      }
      state.team.connectorId = connector.id;
      state.projects.connectors = serverConnectorPool.registry.connectors;
      config = serverConnectorClientConfig(connector);
    }
    state.team.config = config;
    state.team.authMode = config.authMode;
    state.team.backendMode = config.mode;
    state.team.persistSession = config.persistSession;
    const capabilities = await state.team.client.checkCapabilities(config);
    state.team.capabilities = capabilities;
    state.team.allowWorkspaceCreation = state.team.allowWorkspaceCreation !== false && capabilities?.allowWorkspaceCreation !== false;
    const auth = await state.team.client.getAuthState();
    state.team.authUser = auth?.user || null;
    if (auth?.status === "authenticated" && auth.user) {
      await loadTeamWorkspaces();
      state.team.mode = "workspaces";
      state.team.status = "Choose a team workspace to open.";
      return;
    }
    state.team.mode = "signed-out";
    state.team.connection = "signed-out";
    state.team.status = "Sign in with your pre-provisioned account.";
  }, { pendingStatus: "Checking Team workspace setup...", focusId: "teamStatus" });
}

function validateTeamConfigInput(input = {}) {
  const rawUrl = String(input.url || "").trim();
  const key = String(input.publishableKey || input.key || "").trim();
  let url;
  try { url = new URL(rawUrl); } catch { throw new Error("INVALID_URL"); }
  const mode = ["personal-local", "lan", "remote"].includes(input.mode) ? input.mode : "remote";
  const loopbackHttp = mode === "personal-local" && url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if ((!loopbackHttp && url.protocol !== "https:") || !url.hostname || url.username || url.password) throw new Error("INVALID_URL");
  if (/^sb_secret_/i.test(key) || /service[_-]?role/i.test(key)) throw new Error("SECRET_KEY");
  if (!isBrowserSafeSupabaseKey(key)) throw new Error("INVALID_KEY");
  return { url: url.origin, publishableKey: key, mode, authMode: input.authMode === "password" ? "password" : "otp", persistSession: mode !== "remote" && input.persistSession !== false };
}

function safeConfigError(error, input = {}) {
  const key = String(input.publishableKey || input.key || "");
  if (error?.message === "SECRET_KEY" || /^sb_secret_/i.test(key) || /service[_-]?role/i.test(key)) {
    return "Ask your administrator for the public connection key (Supabase publishable or legacy anon key). Secret and service-role keys are not accepted.";
  }
  if (error?.message === "INVALID_URL") return state.sourceSelection === "local-server" ? "Enter an HTTPS Supabase API URL, or a loopback HTTP URL for a personal local server." : "Enter the HTTPS Supabase API URL.";
  if (error?.message === "INVALID_KEY") return "Enter your server's public connection key (Supabase publishable or legacy anon key).";
  return "This project is not ready for PM OS team workspaces. Run the PM OS setup, then check again.";
}

async function sendTeamCode(event) {
  event.preventDefault();
  const email = String(new FormData(event.currentTarget).get("email") || "").trim();
  if (!email || !email.includes("@")) {
    state.team.error = true;
    state.team.status = "Enter the email for your pre-provisioned account.";
    renderAndFocus("teamEmail");
    return;
  }
  await runTeamAction(async () => {
    await state.team.client.sendOtp(email);
    state.team.email = email;
    state.team.mode = "code-sent";
    state.team.error = false;
    state.team.status = "If this email can sign in, a code has been sent.";
  }, { pendingStatus: "Requesting a sign-in code...", focusId: "teamCode" });
}

async function resendTeamCode() {
  await runTeamAction(async () => {
    await state.team.client.sendOtp(state.team.email);
    state.team.status = "If this email can sign in, a code has been sent.";
  }, { pendingStatus: "Requesting a new sign-in code...", focusId: "teamCode" });
}

async function verifyTeamCode(event) {
  event.preventDefault();
  const code = String(new FormData(event.currentTarget).get("code") || "").trim();
  if (!/^[0-9]{6}$/.test(code)) {
    state.team.error = true;
    state.team.status = "That code could not be verified. Check it or request a new one.";
    renderAndFocus("teamCode");
    return;
  }
  await runTeamAction(async () => {
    const auth = await state.team.client.verifyOtp(state.team.email, code);
    if (auth?.status !== "authenticated" || !auth.user) throw { code: "AUTH_REQUIRED" };
    state.team.authUser = auth.user;
    await loadTeamWorkspaces();
    state.team.mode = "workspaces";
    state.team.error = false;
    state.team.status = "Signed in. Choose a team workspace to open.";
  }, { pendingStatus: "Verifying the sign-in code...", focusId: "teamStatus", invalidCode: true });
}

function changeTeamEmail() {
  state.team.mode = "signed-out";
  state.team.email = "";
  state.team.error = false;
  state.team.status = "Enter the email for your pre-provisioned account.";
  renderAndFocus("teamEmail");
}

async function resetTeamProject() {
  await disposeTeamClient();
  state.team = createTeamState();
  await initializeTeamSetup();
}

async function cancelTeamSetup() {
  await disposeTeamClient();
  state.team = createTeamState();
  state.sourceSelection = sourceSelectionFor(state.source);
  render();
  document.querySelector("#sourceType")?.focus();
}

async function disposeTeamClient() {
  const team = state.team;
  try { team.unsubscribeRepository?.(); } catch { /* Local cleanup continues. */ }
  try { team.unsubscribeConnection?.(); } catch { /* Local cleanup continues. */ }
  try { await team.repository?.disconnect?.(); } catch { /* Local cleanup continues. */ }
  if (!team.connectorId) {
    try { await team.client?.dispose?.(); } catch { /* Local cleanup continues. */ }
  }
}

async function loadTeamWorkspaces() {
  const result = await state.team.client.teamService.listWorkspaces();
  state.team.workspaces = collectionFrom(result, "workspaces").map(normalizeTeamWorkspace).filter((entry) => entry.id);
}

function normalizeTeamWorkspace(input = {}) {
  return {
    id: String(input.id || input.workspaceId || input.workspace_id || "").trim(),
    name: String(input.name || input.workspaceName || input.workspace_name || "Team workspace").trim() || "Team workspace",
    role: String(input.role || "viewer").trim().toLowerCase(),
    revision: Number.isSafeInteger(Number(input.revision ?? input.workspaceRevision ?? input.workspace_revision)) ? Number(input.revision ?? input.workspaceRevision ?? input.workspace_revision) : 0,
    updatedAt: input.updatedAt || input.updated_at || ""
  };
}

function collectionFrom(value, key) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.[key])) return value[key];
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

async function runTeamAction(action, { pendingStatus, focusId = "teamStatus", invalidCode = false, errorContext } = {}) {
  if (state.dataBusy) return { skipped: true };
  state.dataBusy = true;
  state.team.error = false;
  if (pendingStatus) state.team.status = pendingStatus;
  render();
  let value;
  let failure;
  try {
    value = await action();
  } catch (error) {
    failure = error;
    if (isTeamAccessLoss(error) && (state.team.active || state.team.boundaryPromise)) {
      await exitTeamForBoundary(teamAccessLossMessage(error));
    } else {
      state.team.error = true;
      state.team.status = invalidCode
        ? "That code could not be verified. Check it or request a new one."
        : safeTeamError(error, "The Team workspace action could not be completed.", errorContext);
    }
  } finally {
    state.dataBusy = false;
    render();
    document.querySelector(focusId ? `#${focusId}` : "#sourceType")?.focus();
  }
  return { value, error: failure };
}

function safeTeamError(error, fallback, context = {}) {
  if (["LOCAL_WORKSPACE_CHANGED", "LOCAL_WORKSPACE_LOCK_UNAVAILABLE", "PROJECT_CHANGED"].includes(error?.code)) return error.message;
  if (error?.code === "PERMISSION_DENIED") {
    const signal = JSON.stringify(error?.details || {}).toLowerCase();
    return signal.includes("last") && signal.includes("owner")
      ? "This workspace must keep at least one owner."
      : "Your role does not allow that Team workspace action.";
  }
  if (isTeamConflict(error)) return "The Team workspace changed before this action was saved.";
  if (error?.code === "AUTH_REQUIRED") return context.passwordSignIn
    ? "Those sign-in details were not accepted. Check your email and password, then try again."
    : "Your team session ended. Sign in again to reopen this workspace.";
  if (error?.code === "INVALID_DOCUMENT" || error?.code === "UNKNOWN_SCHEMA") {
    return "This project is not ready for PM OS team workspaces. Run the PM OS setup, then check again.";
  }
  if (error?.code === "NOT_CONNECTED") return "Reconnecting. Team changes are paused.";
  if (error?.code === "REMOTE_ERROR") return "PM OS could not reach this project. Check the address and your connection.";
  return fallback;
}

async function createTeamWorkspace(event) {
  event.preventDefault();
  const name = String(new FormData(event.currentTarget).get("name") || "").trim();
  if (!name) return;
  await runTeamAction(async () => {
    let attempt = state.team.workspaceCreateAttempt;
    if (!attempt || attempt.name !== name) {
      attempt = { id: teamCreateAttemptId("workspace"), name };
      state.team.workspaceCreateAttempt = attempt;
    }
    try {
      await state.team.client.teamService.createWorkspace({
        name: attempt.name,
        createAttemptId: attempt.id
      });
      state.team.workspaceCreateAttempt = null;
      await loadTeamWorkspaces();
      state.team.status = "Workspace created. Choose it to open.";
    } catch (error) {
      if (!isAmbiguousTeamError(error)) state.team.workspaceCreateAttempt = null;
      throw error;
    }
  }, { pendingStatus: "Creating team workspace...", focusId: "teamStatus" });
}

function captureTeamWorkspaceCreateDraft(event) {
  const attempt = state.team.workspaceCreateAttempt;
  if (attempt && event.currentTarget.value.trim() !== attempt.name) {
    state.team.workspaceCreateAttempt = null;
  }
}

async function joinTeamWorkspace(event) {
  event.preventDefault();
  const code = String(new FormData(event.currentTarget).get("code") || "").trim();
  if (!code) return;
  await runTeamAction(async () => {
    await state.team.client.teamService.acceptInvite({ code });
    await loadTeamWorkspaces();
    state.team.status = "Invite accepted. Choose the workspace to open.";
  }, { pendingStatus: "Joining team workspace...", focusId: "teamStatus" });
}

async function openTeamWorkspace(event) {
  const workspaceId = event.currentTarget.dataset.openTeamWorkspace;
  await openTeamWorkspaceById(workspaceId, event.currentTarget);
}

async function openTeamWorkspaceById(workspaceId, trigger, options = {}) {
  const workspace = options.workspace || state.team.workspaces.find((entry) => entry.id === workspaceId);
  if (!workspace || state.dataBusy) return;
  const switching = state.team.active;
  if (switching && state.team.workspace?.id === workspace.id) {
    state.team.showWorkspaceList = false;
    state.team.status = `${workspace.name} is already open.`;
    renderAndFocus("teamStatus");
    return;
  }
  if (state.projects && !options.departureChecked && !await approveProjectDeparture({ replaceUrl: options.replaceUrl })) return false;
  const title = switching ? "Switch team workspace?" : "Open team workspace?";
  const description = switching
    ? `PM OS will open ${workspace.name} before closing ${state.team.workspace?.name || "the current team workspace"}.`
    : `Your browser workspace will stay saved here. PM OS will create a recovery snapshot, then open ${workspace.name}. Team changes are shared with its members.`;
  const confirmed = options.skipConfirmation || await requestDataConfirmation({
    title,
    description,
    confirmLabel: switching ? "Switch Workspace" : "Open Team Workspace",
    trigger
  });
  if (!confirmed) {
    render();
    (document.querySelector(`[data-open-team-workspace="${cssEscape(workspaceId)}"]`) || document.querySelector("#projectSwitcherButton"))?.focus();
    return;
  }
  const action = await runTeamAction(async () => {
    const previousLocation = captureRegisteredProjectLocation();
    const returnState = switching ? state.team.returnState : captureBrowserReturnState();
    const backup = switching ? null : createTeamSwitchBackup();
    const client = options.client || state.team.client;
    let repository;
    let unsubscribe;
    try {
      repository = client.repositoryFor(workspace.id);
      const opened = await repository.open();
      let stagedSnapshot = opened.snapshot;
      unsubscribe = repository.subscribe((snapshot) => {
        stagedSnapshot = snapshot;
        if (state.team.active && state.team.repository === repository) {
          applyTeamSnapshot(snapshot);
          render();
          void refreshActiveTeamMetadata(repository);
        }
      });
      const auth = await client.getAuthState();
      const members = await membersForWorkspace(workspace.id, client).catch(() => []);
      const capabilities = options.capabilities || state.team.capabilities;
      const invitations = capabilities?.emailInvitations && (opened.role || workspace.role) === "owner"
        ? collectionFrom(await client.teamService.listInvites(workspace.id).catch(() => []), "invitations") : [];
      const connector = options.connector || serverConnectorPool?.connector(state.team.connectorId || "missing");
      if (!options.serverProject && connector && state.projects?.persistent) {
        const registry = state.projects.registry;
        let project = registry.projects.find((entry) => entry.provider === "server"
          && entry.connectorId === connector.id && entry.workspaceId === workspace.id);
        if (!project) {
          const created = createRegistryProject(localStorage, registry, {
            id: `project-${globalThis.crypto?.randomUUID?.().toLowerCase() || Date.now().toString(36)}`.slice(0, 80),
            name: workspace.name, provider: "server", onboarding: "guided",
            connectorId: connector.id, workspaceId: workspace.id,
            serverRole: opened.role || workspace.role || "viewer", serverRevision: workspace.revision || 0,
            serverStatus: "available", location: captureProjectLocation()
          }, {});
          state.projects.registry = created.registry;
          project = created.project;
        } else if (project.archivedAt) {
          state.projects.registry = setProjectArchived(localStorage, registry, project.id, false);
        }
        options = { ...options, connector, serverProject: project };
      }
      if (options.serverProject) {
        const nextRegistry = runStorageTransaction(localStorage, ["pm-os-staging.projects.v1"], () => {
          const activated = activateProjectRegistryEntry(localStorage, state.projects.registry, options.serverProject.id, previousLocation);
          return updateProjectMetadata(localStorage, activated, options.serverProject.id, {
            name: workspace.name, serverRole: opened.role || workspace.role || "viewer",
            serverRevision: Number(opened?.revision ?? opened?.snapshot?.revision ?? workspace.revision ?? options.serverProject.serverRevision),
            serverStatus: "available"
          });
        });
        projectRegistry = nextRegistry;
        state.projects.registry = nextRegistry;
      }
      const oldRepository = switching ? state.team.repository : null;
      const oldUnsubscribe = switching ? state.team.unsubscribeRepository : null;
      const oldConnectionUnsubscribe = switching ? state.team.unsubscribeConnection : null;
      const oldClient = switching ? state.team.client : null;
      const oldConnectorId = switching ? state.team.connectorId : "";
      state.team.active = true;
      state.team.mode = "live";
      state.team.workspace = { ...workspace, role: opened.role || workspace.role };
      state.team.role = String(opened.role || workspace.role || "viewer").toLowerCase();
      state.team.client = client;
      state.team.authUser = auth?.user || null;
      state.team.connectorId = options.connector?.id || state.team.connectorId;
      state.team.projectId = options.serverProject?.id || "";
      state.team.capabilities = options.capabilities || state.team.capabilities;
      state.team.backendMode = options.connector?.mode || state.team.backendMode;
      state.team.authMode = options.connector?.authMode || state.team.authMode;
      state.team.persistSession = options.connector?.persistSession ?? state.team.persistSession;
      state.team.repository = repository;
      state.team.openResult = opened;
      state.team.unsubscribeRepository = unsubscribe;
      state.team.unsubscribeConnection = client.subscribeConnection?.((status) => handleTeamConnection(status, client)) || null;
      state.team.members = members;
      state.team.invitations = invitations;
      state.team.invite = null;
      state.team.inviteAttempt = null;
      state.team.returnState = returnState;
      state.team.showWorkspaceList = false;
      state.team.connection = "live";
      state.team.status = `${workspace.name} is live.`;
      state.team.error = false;
      state.team.conflict = null;
      state.sourceSelection = state.team.backendMode === "remote" ? "team" : "local-server";
      state.syncStatus = `Team workspace is active. Changes are shared with members of ${workspace.name}.`;
      state.driveToken = "";
      applyTeamSnapshot(stagedSnapshot);
      state.weeklyUpdateCopied = readWeeklyUpdateCopied(localStorage, weeklyChecklistStorageKey());
      if (switching) {
        try { oldUnsubscribe?.(); } catch { /* The staged workspace is already active. */ }
        try { oldConnectionUnsubscribe?.(); } catch { /* The staged workspace owns the connection listener. */ }
        try { await oldRepository?.disconnect?.(); } catch { /* The staged workspace remains active. */ }
        if (oldClient && oldClient !== client && !oldConnectorId) {
          try { await oldClient.dispose?.(); } catch { /* The new workspace remains active. */ }
        }
      }
      if (options.serverProject) {
        resetWorkspaceUiState();
        restoreProjectLocation(activeRegistryProject(projectRegistry)?.location);
        state.projects.surface = "closed";
        state.projects.status = `Opened ${workspace.name}.`;
        pushViewUrl(Boolean(options.replaceUrl));
      }
      state.dataStatus = "Browser recovery remains separate from Team workspace data.";
    } catch (error) {
      try { unsubscribe?.(); } catch { /* Staging cleanup continues. */ }
      try { await repository?.disconnect?.(); } catch { /* Staging cleanup continues. */ }
      backup?.rollback();
      throw error;
    }
  }, { pendingStatus: switching ? "Opening the new team workspace..." : "Backing up Browser memory and opening Team workspace...", focusId: "teamStatus" });
  if (options.serverProject && action.error) throw action.error;
  return !action.error;
}

async function refreshActiveTeamMetadata(repository) {
  try {
    const opened = await repository.open();
    if (!state.team.active || state.team.repository !== repository) return;
    state.team.openResult = opened;
    state.team.role = String(opened.role || state.team.role || "viewer").toLowerCase();
    state.team.workspace = { ...state.team.workspace, role: state.team.role };
    if (state.team.projectId) {
      projectRegistry = updateProjectMetadata(localStorage, state.projects.registry, state.team.projectId, {
        name: state.team.workspace.name,
        serverRole: state.team.role,
        serverRevision: Number(opened?.revision ?? opened?.snapshot?.revision ?? state.team.workspace.revision ?? 0),
        serverStatus: "available"
      });
      state.projects.registry = projectRegistry;
    }
    render();
  } catch (error) {
    if (isTeamAccessLoss(error)) await exitTeamForBoundary(teamAccessLossMessage(error));
  }
}

function captureBrowserReturnState() {
  return {
    location: captureProjectLocation(),
    projectId: state.projects?.registry.activeProjectId || "",
    items: state.items,
    insightRecords: state.insightRecords,
    codeRepositories: state.codeRepositories,
    implementationRuns: state.implementationRuns,
    artifacts: state.artifacts,
    activity: state.activity,
    planningCalendar: state.planningCalendar,
    organization: state.organization,
    customerDirectory: state.customerDirectory,
    workflow: state.workflow,
    prioritization: state.prioritization,
    experience: state.experience,
    source: { ...state.source },
    sync: structuredClone(state.sync),
    driveReview: state.driveReview ? structuredClone(state.driveReview) : null,
    syncStatus: state.syncStatus
  };
}

function createTeamSwitchBackup() {
  if (demoMode || state.team.active) throw new Error("TEAM_BACKUP_UNAVAILABLE");
  const previousRaw = localStorage.getItem(backupKey);
  const previousBackups = state.backups;
  const payload = exportPortableWorkspace();
  const nextBackups = storeWorkspaceSnapshot(localStorage, backupKey, state.backups, payload, backupReasons.teamSwitch);
  state.backups = nextBackups;
  let active = true;
  return {
    rollback() {
      if (!active) return;
      active = false;
      try {
        if (previousRaw === null) localStorage.removeItem(backupKey);
        else localStorage.setItem(backupKey, previousRaw);
        state.backups = previousBackups;
      } catch { /* A recovery snapshot never changes the current browser workspace. */ }
    }
  };
}

async function membersForWorkspace(workspaceId, client = state.team.client) {
  const result = await client.teamService.listMembers(workspaceId);
  return collectionFrom(result, "members").map(normalizeTeamMember).filter((entry) => entry.userId).sort((left, right) => {
    if (left.role === "owner" && right.role !== "owner") return -1;
    if (right.role === "owner" && left.role !== "owner") return 1;
    return left.displayName.localeCompare(right.displayName);
  });
}

function normalizeTeamMember(input = {}) {
  return {
    userId: String(input.userId || input.user_id || input.id || "").trim(),
    displayName: String(input.displayName || input.display_name || input.name || "Team member").trim() || "Team member",
    role: String(input.role || "viewer").trim().toLowerCase()
  };
}

async function refreshActiveTeamSnapshot() {
  if (!state.team.active || !state.team.repository) return null;
  const refreshed = typeof state.team.openResult?.extension?.refresh === "function"
    ? await state.team.openResult.extension.refresh()
    : (await state.team.repository.open()).snapshot;
  const snapshot = refreshed?.snapshot || refreshed;
  applyTeamSnapshot(snapshot);
  state.team.connection = "live";
  return snapshot;
}

function handleTeamConnection(status, client) {
  if (client !== state.team.client || state.team.intentionalClose) return;
  const next = String(status || "idle");
  state.team.connection = next === "connecting" && state.team.active ? "reconnecting" : next;
  if (!state.team.active) return;
  if (next === "signed-out") {
    void exitTeamForBoundary("Your team session ended. Sign in again to reopen this workspace.");
    return;
  }
  if (next === "forbidden") {
    void exitTeamForBoundary("You no longer have access to that team workspace. Your browser workspace is open.");
    return;
  }
  if (next === "reconnecting" || next === "offline" || next === "connecting") {
    state.team.status = "Reconnecting. Team changes are paused.";
  } else if (next === "live") {
    state.team.status = `${state.team.workspace?.name || "Team workspace"} is live.`;
    state.team.error = false;
  }
  render();
}

async function retryTeamSync() {
  await runTeamAction(async () => {
    await refreshActiveTeamSnapshot();
    state.team.status = `${state.team.workspace?.name || "Team workspace"} is live.`;
  }, { pendingStatus: "Checking for the latest team changes...", focusId: "teamStatus" });
}

async function showTeamWorkspaceList() {
  await runTeamAction(async () => {
    await loadTeamWorkspaces();
    state.team.showWorkspaceList = true;
    state.team.status = "Choose another team workspace. The current workspace stays open until the new one is ready.";
  }, { pendingStatus: "Loading team workspaces...", focusId: "teamStatus" });
}

async function leaveTeamWorkspace(event) {
  const confirmed = await requestDataConfirmation({
    title: "Leave team workspace?",
    description: `PM OS will close ${state.team.workspace?.name || "this team workspace"} and return to your saved browser workspace. Team data will not be copied.${state.team.conflict ? " Your unsaved team draft will be discarded." : ""}`,
    confirmLabel: "Return to Browser",
    trigger: event.currentTarget
  });
  if (!confirmed) return;
  await runTeamAction(() => closeTeamWorkspace("Returned to the saved browser workspace. Team data was not copied."), { pendingStatus: "Closing Team workspace...", focusId: "sourceType" });
}

async function signOutTeamWorkspace() {
  await runTeamAction(async () => {
    state.team.intentionalClose = true;
    const connectorId = state.team.connectorId;
    let confirmed = true;
    try {
      if (connectorId) await serverConnectorPool.signOut(connectorId);
      else await state.team.client.signOut();
    } catch {
      confirmed = false;
    }
    if (connectorId) markConnectorProjects(connectorId, "sign-in-required");
    await closeTeamWorkspace(confirmed
      ? "Signed out. Your saved browser workspace is open."
      : "Team data was cleared locally. Supabase could not confirm the remote sign-out.");
  }, { pendingStatus: "Signing out of Team workspace...", focusId: "sourceType" });
}

async function exitTeamForBoundary(message) {
  const team = state.team;
  if (team.boundaryPromise) return team.boundaryPromise;
  if (!team.active) return undefined;
  team.intentionalClose = true;
  team.boundaryPromise = closeTeamWorkspace(message);
  return team.boundaryPromise;
}

async function closeTeamWorkspace(message, { forProjectSwitch = false } = {}) {
  const team = state.team;
  const previousLocation = captureRegisteredProjectLocation();
  const returning = team.returnState;
  team.intentionalClose = true;
  await disposeTeamClient();
  if (returning) {
    state.items = returning.items;
    state.insightRecords = returning.insightRecords;
    state.codeRepositories = returning.codeRepositories;
    state.implementationRuns = returning.implementationRuns;
    state.artifacts = returning.artifacts || [];
    state.activity = returning.activity;
    state.planningCalendar = returning.planningCalendar;
    state.organization = returning.organization;
    state.customerDirectory = returning.customerDirectory;
    state.workflow = returning.workflow;
    state.prioritization = returning.prioritization;
    state.experience = returning.experience;
    state.source = returning.source;
    state.sync = returning.sync;
    state.driveReview = returning.driveReview;
    state.syncStatus = returning.syncStatus;
    if (!forProjectSwitch && returning.projectId && registryProjectById(state.projects?.registry, returning.projectId)) {
      projectRegistry = activateProjectRegistryEntry(localStorage, state.projects.registry, returning.projectId, previousLocation);
      state.projects.registry = projectRegistry;
    }
  } else {
    localWriteScope = createLocalWriteScope();
    state.items = loadItems();
    state.insightRecords = loadInsightRecords();
    state.codeRepositories = loadCodeRepositories();
    state.implementationRuns = loadImplementationRuns();
    state.artifacts = loadArtifacts();
    state.activity = loadActivity();
    state.planningCalendar = loadPlanningCalendar();
    state.organization = loadOrganization();
    state.customerDirectory = loadCustomerDirectory();
    state.workflow = loadWorkflow();
    state.prioritization = loadPrioritization();
    state.experience = loadExperience();
    state.source = loadSource();
    state.sync = loadSync();
    state.driveReview = null;
    localCommittedWorkspace = localCanonicalFields();
  }
  state.driveToken = "";
  state.team = createTeamState();
  state.initiativeEditor = createInitiativeEditorState();
  state.sourceSelection = sourceSelectionFor(state.source);
  state.dataStatus = message;
  if (!forProjectSwitch) {
    resetWorkspaceUiState();
    state.driveReview = returning?.driveReview || null;
    restoreProjectLocation(returning?.location || activeRegistryProject(state.projects?.registry)?.location);
    if (state.projects) pushViewUrl(true);
    render();
  }
}

async function exportWorkspaceData(format) {
  if (!state.team.active) {
    downloadWorkspaceFormat(format);
    announceDataStatus(state.dataStatus);
    return;
  }
  await runTeamAction(async () => {
    await refreshActiveTeamSnapshot();
    downloadWorkspaceFormat(format);
    state.team.status = format === "json"
      ? "Backup download requested from the latest Team data. Check your browser's downloads and keep the file somewhere safe."
      : "Export download requested from the latest Team data.";
  }, { pendingStatus: "Refreshing Team workspace for export...", focusId: "teamStatus" });
}

function downloadWorkspaceFormat(format) {
  const scopedItems = filterItemsByPeriod(state.items, state.periodSelection, state.planningCalendar);
  const scopeSlug = periodSelectionSlug(state.periodSelection, state.planningCalendar);
  const scopeLabel = periodSelectionLabel(state.periodSelection, state.planningCalendar);
  if (format === "csv") {
    downloadFile(exportCsv(scopedItems), "text/csv", `pm-os-workspace-${scopeSlug}-${scopedItems.length}-${todayStamp()}.csv`);
    state.dataStatus = `Exported ${scopedItems.length} initiatives for ${scopeLabel}.`;
    return;
  }
  if (format === "issues") {
    downloadFile(buildGitHubIssueBundle(scopedItems, state.prioritization), "text/markdown", `pm-os-github-issues-${scopeSlug}-${scopedItems.length}-${todayStamp()}.md`);
    state.dataStatus = `Exported ${scopedItems.length} GitHub issue drafts for ${scopeLabel}.`;
    return;
  }
  downloadFile(exportPortableWorkspace(), "application/json", `pm-os-workspace-${todayStamp()}.json`);
  state.dataStatus = "Backup download requested. Check your browser's downloads and keep the file somewhere safe.";
}

async function createTeamInvite(event) {
  event.preventDefault();
  if (!state.team.active || state.team.role !== "owner") return;
  const form = new FormData(event.currentTarget);
  const role = String(form.get("role") || "viewer");
  const email = String(form.get("email") || "").trim().toLowerCase();
  state.team.inviteEmail = email;
  if (!state.team.inviteAttempt || state.team.inviteAttempt.email !== email || state.team.inviteAttempt.role !== role) {
    state.team.inviteAttempt = { email, role, requestId: globalThis.crypto.randomUUID() };
  }
  await runTeamAction(async () => {
    const result = await state.team.client.teamService.createInvite({ workspaceId: state.team.workspace.id, ...state.team.inviteAttempt });
    showSentTeamInvitation(result);
    state.team.inviteAttempt = null;
  }, { pendingStatus: "Submitting invitation email…", focusId: "teamInviteTitle" });
}

function showSentTeamInvitation(result) {
  const invitation = result?.invitation;
  if (!invitation?.id) throw { code: "INVALID_DOCUMENT" };
  state.team.invite = invitation;
  state.team.invitations = [invitation, ...state.team.invitations.filter(entry => entry.id !== invitation.id)];
  state.team.status = invitationDeliveryLabel(invitation);
}

async function refreshTeamInvitations() {
  await runTeamAction(async () => {
    state.team.invitations = collectionFrom(await state.team.client.teamService.listInvites(state.team.workspace.id), "invitations");
    state.team.status = "Invitations refreshed.";
  }, { pendingStatus: "Checking invitations…", focusId: "teamStatus" });
}

async function resendTeamInvitation(id) {
  const invitation = state.team.invitations.find(entry => entry.id === id);
  if (!invitation || state.team.role !== "owner") return;
  await runTeamAction(async () => {
    const result = await state.team.client.teamService.createInvite({ workspaceId: state.team.workspace.id,
      email: invitation.email, role: invitation.role, previousInviteId: id, requestId: globalThis.crypto.randomUUID() });
    showSentTeamInvitation(result);
    state.team.invitations = state.team.invitations.map(entry => entry.id === id ? { ...entry, revokedAt: new Date().toISOString() } : entry);
  }, { pendingStatus: "Replacing the invitation and sending email…", focusId: "teamInviteTitle" });
}

async function revokeTeamInvitation(id) {
  if (state.team.role !== "owner") return;
  await runTeamAction(async () => {
    await state.team.client.teamService.revokeInvite({ workspaceId: state.team.workspace.id, inviteId: id });
    state.team.invitations = state.team.invitations.map(entry => entry.id === id ? { ...entry, revokedAt: new Date().toISOString() } : entry);
    state.team.status = "Invitation revoked. Its link can no longer join this workspace.";
  }, { pendingStatus: "Revoking invitation…", focusId: "teamStatus" });
}

function clearTeamInvite() {
  state.team.invite = null;
  render();
  document.querySelector("#createTeamInviteForm button")?.focus();
}

async function changeTeamMemberRole(event) {
  if (state.team.role !== "owner") return;
  const userId = event.currentTarget.dataset.teamMemberRole;
  const member = state.team.members.find((entry) => entry.userId === userId);
  const role = event.currentTarget.value;
  if (!member || member.role === role) return;
  const confirmed = await requestDataConfirmation({
    title: "Change member role?",
    description: `Change ${member.displayName} from ${member.role} to ${role}.`,
    confirmLabel: "Change Role",
    trigger: event.currentTarget
  });
  if (!confirmed) {
    render();
    return;
  }
  await runTeamAction(async () => {
    await state.team.client.teamService.setMemberRole({ workspaceId: state.team.workspace.id, userId, role });
    state.team.members = await membersForWorkspace(state.team.workspace.id);
    state.team.status = `${member.displayName} is now ${role}.`;
  }, { pendingStatus: "Changing member role...", focusId: "teamStatus" });
}

async function removeTeamMember(event) {
  if (state.team.role !== "owner") return;
  const userId = event.currentTarget.dataset.removeTeamMember;
  const member = state.team.members.find((entry) => entry.userId === userId);
  if (!member) return;
  const confirmed = await requestDataConfirmation({
    title: "Remove team member?",
    description: `Remove ${member.displayName} from ${state.team.workspace.name}.`,
    confirmLabel: "Remove Member",
    trigger: event.currentTarget
  });
  if (!confirmed) return;
  await runTeamAction(async () => {
    await state.team.client.teamService.removeMember({ workspaceId: state.team.workspace.id, userId });
    state.team.members = await membersForWorkspace(state.team.workspace.id);
    state.team.status = `${member.displayName} was removed.`;
  }, { pendingStatus: "Removing team member...", focusId: "teamStatus" });
}

function createDemoWorkspace(items) {
  const migrated = migrateLegacyOwners(items);
  let organization = migrated.organization;
  const personByName = (name) => organization.people.find((person) => person.displayName === name)?.id || organization.people[0]?.id;
  organization = createUnit(organization, { id: "unit:product", name: "Product", parentId: "", leadPersonId: personByName("Platform PM") });
  organization = createUnit(organization, { id: "unit:experience", name: "Experience", parentId: "unit:product", leadPersonId: personByName("Growth PM") });
  organization = createUnit(organization, { id: "unit:onboarding", name: "Onboarding", parentId: "unit:experience", leadPersonId: personByName("Growth PM") });
  organization = createUnit(organization, { id: "unit:onboarding-flow", name: "Onboarding flow", parentId: "unit:onboarding", leadPersonId: personByName("Growth PM") });
  organization = createUnit(organization, { id: "unit:website", name: "Website", parentId: "unit:onboarding", leadPersonId: personByName("Monetization PM") });
  organization = createUnit(organization, { id: "unit:platform", name: "Platform", parentId: "unit:product", leadPersonId: personByName("Platform PM") });
  organization = createUnit(organization, { id: "unit:trust", name: "Trust", parentId: "unit:platform", leadPersonId: personByName("Trust PM") });
  const assignedItems = migrated.items.map((item) => ({
    ...item,
    orgUnitId: item.title.includes("onboarding") ? "unit:onboarding-flow"
      : item.title.includes("conversion") ? "unit:website"
        : item.title.includes("feedback") ? "unit:platform"
          : item.title.includes("enterprise") || item.title.includes("audit") ? "unit:trust"
            : ""
  }));
  const customers = migrateLegacyCustomers(assignedItems);
  return { experience: fullWorkspaceExperience(), organization, customerDirectory: customers.directory, planningCalendar: emptyPlanningCalendar(), workflow: defaultInitiativeWorkflow(), prioritization: defaultPrioritization(), items: customers.items, insightRecords: createDemoInsightRecords(customers.items) };
}

async function linkPromotedDiscoveryBrowser(item) {
  if (!state.pendingInsightPromotionId) return;
  const discovery = state.insightRecords.find((record) => record.id === state.pendingInsightPromotionId);
  state.pendingInsightPromotionId = "";
  if (!discovery) return;
  state.insightRecords = updateInsightRecord(state.insightRecords, discovery.id, { initiativeId: item.id, status: "promoted" });
  const linked = state.insightRecords.find((record) => record.id === discovery.id);
  logActivity("insight-promoted", linked, { initiativeId: { from: "", to: item.id }, status: { from: discovery.status, to: "promoted" } });
}

function createDemoInsightRecords(items) {
  const item = (fragment) => items.find((entry) => entry.title.toLowerCase().includes(fragment)) || items[0];
  const timestamp = demoReferenceDate;
  const records = [
    { id: "insight-discovery-feedback", type: "discovery", title: "Unify the feedback triage workflow", status: "researching", owner: "Platform PM", problem: "Support and success teams cannot see whether repeated feedback has been triaged.", hypothesis: "A shared, tagged inbox will reduce duplicate analysis and missed follow-up.", confidence: 0.62, nextStep: "Interview five success managers.", initiativeId: item("feedback").id, relatedRecordIds: ["insight-research-triage", "insight-validation-triage"] },
    { id: "insight-research-triage", type: "research", title: "Success manager triage study", status: "recruiting", owner: "Platform PM", objective: "Understand how customer feedback is captured, tagged, and escalated today.", questions: ["Where does feedback get lost?", "Which tags drive a product decision?"], method: "Five 30-minute customer-success interviews", recruitmentTarget: 5, participantCount: 2, findings: "", dueDate: demoDate(5), relatedRecordIds: ["insight-discovery-feedback"] },
    { id: "insight-validation-triage", type: "validation", title: "Tagged inbox concierge test", status: "running", owner: "Platform PM", hypothesis: "A single tagged queue will shorten weekly synthesis time.", method: "Manually consolidate one week of incoming feedback for two success pods.", successMetric: "At least 30% less synthesis time with no missed urgent signals.", result: "", decision: "", decisionNotes: "", dueDate: demoDate(9), initiativeId: item("feedback").id, relatedRecordIds: ["insight-discovery-feedback"] },
    { id: "insight-feedback-onboarding", type: "feedback", title: "Setup progress is hard to recover", status: "new", source: "Customer interview", sourceRef: "INT-104", signal: "We stop halfway through setup and cannot tell what remains when we return.", receivedAt: demoDate(-2), urgency: 4, tags: ["onboarding", "progress"], owner: "Growth PM", initiativeId: item("onboarding").id },
    { id: "insight-feedback-export", type: "feedback", title: "Export permissions are unclear", status: "triaged", source: "Success call", sourceRef: "CALL-228", signal: "Security admins need an explicit record of who can export workspace data.", receivedAt: demoDate(-3), urgency: 3, tags: ["security", "exports"], owner: "Trust PM", initiativeId: item("export").id },
    { id: "insight-support-audit", type: "support", title: "Audit export omits actor details", status: "in-progress", source: "Support ticket", sourceRef: "SUP-492", issue: "Downloaded audit rows do not identify the actor for some workspace events.", customerImpact: "A security review is blocked for one enterprise account.", severity: "critical", responseDueDate: demoDate(1), resolution: "", tags: ["security", "audit"], owner: "Trust PM", initiativeId: item("audit").id },
    { id: "insight-support-trial", type: "support", title: "Trial banner returns after upgrade", status: "waiting", source: "Support ticket", sourceRef: "SUP-487", issue: "The trial banner remains visible after a completed upgrade.", customerImpact: "Confusing but does not block product use.", severity: "medium", responseDueDate: demoDate(4), resolution: "Waiting for a session trace.", tags: ["billing", "trial"], owner: "Monetization PM", initiativeId: item("trial").id }
  ];
  return migrateLegacyWorkRecords(items, records.map((record) => createInsightRecord(record, timestamp, "pm-os")));
}

function workspaceActivityForApp(activity = []) {
  return activity.map((entry) => ({
    ...entry,
    actorId: typeof entry.actor === "object" ? entry.actor.id || "" : entry.actorId || "",
    actor: typeof entry.actor === "object" ? entry.actor.displayName || "PM OS" : entry.actor || "PM OS"
  })).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

function exportPortableWorkspace(items = state.items, activity = state.activity, organization = state.organization, customerDirectory = state.customerDirectory, planningCalendar = state.planningCalendar, workflow = state.workflow, prioritization = state.prioritization, insightRecords = state.insightRecords, codeRepositories = state.codeRepositories, implementationRuns = state.implementationRuns, experience = state.experience, artifacts = state.artifacts) {
  return encodeWorkspaceDocument(createWorkspaceDocument({
    schema: WORKSPACE_DOCUMENT_SCHEMA,
    workspaceId: state.team.active ? state.team.workspace?.id : "browser",
    experience,
    planningCalendar,
    organization,
    customerDirectory,
    workflow,
    prioritization,
    items,
    insightRecords,
    codeRepositories,
    implementationRuns,
    artifacts,
    activity: activity.map((entry) => ({
      ...entry,
      actor: entry.actorId
        ? { id: entry.actorId, displayName: typeof entry.actor === "object" ? entry.actor.displayName : entry.actor }
        : entry.actor
    }))
  }));
}

function importPortableWorkspace(text) {
  const document = decodeWorkspaceDocument(text);
  return {
    items: document.items.map((item) => createItem(item)),
    insightRecords: document.insightRecords.map((record) => normalizeInsightRecord(record, { legacy: true, now: record.updatedAt, updatedBy: record.updatedBy })),
    activity: workspaceActivityForApp(document.activity),
    planningCalendar: normalizePlanningCalendar(document.planningCalendar),
    organization: normalizeOrganization(document.organization),
    customerDirectory: normalizeCustomerDirectory(document.customerDirectory),
    workflow: normalizeInitiativeWorkflow(document.workflow),
    prioritization: normalizePrioritization(document.prioritization),
    codeRepositories: document.codeRepositories,
    implementationRuns: document.implementationRuns,
    artifacts: document.artifacts || [],
    experience: normalizeWorkspaceExperience(document.experience)
  };
}

function loadOperationalWorkspaceResult() {
  let raw;
  try {
    raw = localStorage.getItem(storageKey) || "";
  } catch {
    return {
      raw: "",
      workspace: emptyOperationWorkspace,
      corrupted: true,
      warning: "This browser's workspace could not be accessed. PM OS did not load demo data or overwrite anything."
    };
  }
  if (cachedOperationalWorkspaceResult && raw === cachedOperationalWorkspaceRaw) return cachedOperationalWorkspaceResult;
  cachedOperationalWorkspaceRaw = raw;
  if (!raw) {
    cachedOperationalWorkspaceResult = { raw, workspace: emptyOperationWorkspace, corrupted: false, warning: "" };
    return cachedOperationalWorkspaceResult;
  }
  try {
    cachedOperationalWorkspaceResult = { raw, workspace: importPortableWorkspace(raw), corrupted: false, warning: "" };
  } catch {
    cachedOperationalWorkspaceResult = {
      raw,
      workspace: emptyOperationWorkspace,
      corrupted: true,
      warning: "Your saved workspace could not be read. It has not been overwritten. Download the unreadable data, import a backup, or deliberately clear the workspace from Settings."
    };
  }
  return cachedOperationalWorkspaceResult;
}

function loadExperience() {
  if (demoMode) return demoWorkspace.experience;
  return loadOperationalWorkspaceResult().workspace.experience;
}

function loadPlanningCalendar() {
  if (demoMode) return demoWorkspace.planningCalendar;
  return loadOperationalWorkspaceResult().workspace.planningCalendar;
}

function loadItems() {
  if (demoMode) return demoWorkspace.items;
  return loadOperationalWorkspaceResult().workspace.items;
}

function loadInsightRecords() {
  if (demoMode) return demoWorkspace.insightRecords;
  return loadOperationalWorkspaceResult().workspace.insightRecords;
}

function loadCodeRepositories() {
  if (demoMode) return demoWorkspace.codeRepositories || [];
  return loadOperationalWorkspaceResult().workspace.codeRepositories;
}

function loadArtifacts() {
  if (demoMode) return demoWorkspace.artifacts || [];
  return loadOperationalWorkspaceResult().workspace.artifacts || [];
}

function loadImplementationRuns() {
  if (demoMode) return demoWorkspace.implementationRuns || [];
  return loadOperationalWorkspaceResult().workspace.implementationRuns;
}

function loadActivity() {
  if (demoMode) return [];
  try {
    const loaded = loadOperationalWorkspaceResult();
    if (loaded.raw) return loaded.workspace.activity;
    const legacyRaw = localStorage.getItem(activityKey);
    return legacyRaw ? importActivityLog(legacyRaw).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
  } catch {
    return [];
  }
}

function loadOrganization() {
  if (demoMode) return demoWorkspace.organization;
  return loadOperationalWorkspaceResult().workspace.organization;
}

function loadCustomerDirectory() {
  if (demoMode) return demoWorkspace.customerDirectory;
  return loadOperationalWorkspaceResult().workspace.customerDirectory;
}

function loadWorkflow() {
  if (demoMode) return demoWorkspace.workflow;
  return loadOperationalWorkspaceResult().workspace.workflow;
}

function loadPrioritization() {
  if (demoMode) return demoWorkspace.prioritization;
  return loadOperationalWorkspaceResult().workspace.prioritization;
}

function defaultSource() {
  return { schema: WORKSPACE_SOURCE_SCHEMA, type: "browser", clientId: "", folderName: "PM OS", fileName: "pm-os-workspace.json" };
}

async function authenticateTeamPassword(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const create = event.submitter?.value === "create";
  if (create && state.team.backendMode === "remote") {
    state.team.error = true;
    state.team.status = "Ask your administrator for an existing server account.";
    renderAndFocus("teamEmail");
    return;
  }
  if (!email.includes("@") || password.length < 8) {
    state.team.error = true;
    state.team.status = "Enter a valid email and a password of at least 8 characters.";
    renderAndFocus(!email.includes("@") ? "teamEmail" : "teamPassword");
    return;
  }
  state.team.email = email;
  const errorContext = { passwordSignIn: false };
  await runTeamAction(async () => {
    errorContext.passwordSignIn = !create;
    const auth = create
      ? await state.team.client.signUpWithPassword(email, password)
      : await state.team.client.signInWithPassword(email, password);
    if (auth?.status !== "authenticated" || !auth.user) throw { code: "AUTH_REQUIRED" };
    errorContext.passwordSignIn = false;
    state.team.email = email;
    state.team.authUser = auth.user;
    await loadTeamWorkspaces();
    state.team.mode = "workspaces";
    state.team.error = false;
    state.team.status = create ? "Local account created. Create or open a workspace." : "Signed in. Choose a workspace to open.";
  }, { pendingStatus: create ? "Creating the local account..." : "Signing in...", focusId: "teamStatus", errorContext });
}

function defaultSyncState() {
  return { lastPulledAt: "", lastPushedAt: "", baseRemote: null, remote: null, conflict: null, baseDocument: null, localPending: false, fileLastModified: 0, fileBaselineDocument: null, fileReview: null, fileResolutionDocument: null, fileConflicts: [] };
}

function loadSource() {
  return loadSourceFromKey(sourceKey);
}

function loadSourceFromKey(key) {
  const defaults = defaultSource();
  if (demoMode) return defaults;
  try {
    const raw = JSON.parse(localStorage.getItem(key) || (key === "pm-os-staging.source.v2" ? localStorage.getItem(legacySourceKey) : "") || "{}");
    return { ...defaults, ...normalizeWorkspaceSource(raw) };
  } catch {
    return defaults;
  }
}

function loadSync() {
  return loadSyncFromKey(syncKey);
}

function loadSyncFromKey(key) {
  const defaults = defaultSyncState();
  if (demoMode) return defaults;
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || (key === "pm-os-staging.sync.v2" ? localStorage.getItem(legacySyncKey) : "") || "{}");
    const baseRemote = parsed.baseRemote ? driveFileFingerprint(parsed.baseRemote) : null;
    const remote = parsed.remote ? driveFileFingerprint(parsed.remote) : null;
    return {
      ...defaults,
      lastPulledAt: String(parsed.lastPulledAt || ""),
      lastPushedAt: String(parsed.lastPushedAt || ""),
      baseRemote,
      remote,
      conflict: buildSyncConflict(baseRemote, remote),
      baseDocument: parsed.baseDocument && typeof parsed.baseDocument === "object" ? parsed.baseDocument : null,
      localPending: Boolean(parsed.localPending),
      fileLastModified: Number(parsed.fileLastModified || 0),
      fileBaselineDocument: parsed.fileBaselineDocument && typeof parsed.fileBaselineDocument === "object" ? parsed.fileBaselineDocument : null,
      fileReview: parsed.fileReview && typeof parsed.fileReview === "object" ? parsed.fileReview : null,
      fileResolutionDocument: parsed.fileResolutionDocument && typeof parsed.fileResolutionDocument === "object" ? parsed.fileResolutionDocument : null,
      fileConflicts: Array.isArray(parsed.fileConflicts) ? parsed.fileConflicts : []
    };
  } catch {
    return defaults;
  }
}

async function persistSource() {
  if (demoMode) return;
  await runLocalStorageTransaction([sourceKey], () => localStorage.setItem(sourceKey, JSON.stringify(normalizeWorkspaceSource(state.source))));
  if (state.projects?.persistent && !state.team.active) {
    projectRegistry = updateActiveProjectProvider(localStorage, state.projects.registry, state.source.type);
    state.projects.registry = projectRegistry;
  }
}

function sourceSelectionFor(source) {
  return ({ browser: "local", "google-drive": "drive-folder", "local-file": "local-file" })[source?.type] || "local";
}

async function persistSync() {
  if (demoMode) return;
  await runLocalStorageTransaction([syncKey], () => localStorage.setItem(syncKey, serializeSync(state.sync)));
  state.localExternalEffect = "";
}

async function commitSync(nextSync) {
  if (state.localExternalEffect) state.localExternalPendingSync = nextSync;
  if (!demoMode) await runLocalStorageTransaction([syncKey], () => localStorage.setItem(syncKey, serializeSync(nextSync)));
  state.sync = nextSync;
  state.localExternalEffect = "";
  state.localExternalPendingSync = null;
}

function serializeSync(sync) {
  return JSON.stringify({ ...sync, schema: WORKSPACE_SYNC_SCHEMA });
}

async function updateSourceSettings() {
  if (demoMode) {
    state.syncStatus = "Drive settings and actions are disabled in demo mode.";
    renderAndFocus("syncStatus");
    return;
  }
  const previousSource = state.source, previousSync = state.sync;
  const previousType = state.source.type;
  const folderName = document.querySelector("#driveFolderName")?.value?.trim() || state.source.folderName || "PM OS";
  const fileName = document.querySelector("#driveFileName")?.value?.trim() || state.source.fileName || "pm-os-workspace.json";
  const namedLocationChanged = folderName !== state.source.folderName || fileName !== state.source.fileName;
  const nextSource = {
    type: ({ local: "browser", "local-file": "local-file", "drive-folder": "google-drive" })[state.sourceSelection] || state.source.type,
    clientId: document.querySelector("#driveClientId")?.value?.trim() ?? state.source.clientId ?? normalizeDriveRuntimeConfig(globalThis.PM_OS_DRIVE_CONFIG)?.clientId ?? "",
    folderName,
    fileName,
    fileId: namedLocationChanged ? "" : state.source.fileId || ""
  };
  const locationChanged = nextSource.type === "google-drive" && (nextSource.folderName !== state.source.folderName || nextSource.fileName !== state.source.fileName);
  state.source = nextSource;
  if (previousType !== nextSource.type) {
    state.driveToken = "";
    state.syncStatus = nextSource.type === "google-drive"
      ? "Add your Google OAuth client ID, then connect Drive."
      : nextSource.type === "local-file" ? "Choose a workspace file to link." : "Browser storage is active.";
  }
  if (locationChanged || (previousType !== nextSource.type && nextSource.type === "google-drive")) {
    state.sync = defaultSyncState();
    state.driveReview = null;
    state.syncStatus = "Drive folder or file changed. Use Sync now to preview an existing file before upload.";
  }
  try {
    const candidateSource = state.source, candidateSync = state.sync;
    state.source = previousSource; state.sync = previousSync;
    await runLocalStorageTransaction([sourceKey, syncKey], () => {
      localStorage.setItem(sourceKey, JSON.stringify(normalizeWorkspaceSource(candidateSource)));
      localStorage.setItem(syncKey, serializeSync(candidateSync));
    });
    state.source = candidateSource; state.sync = candidateSync;
    if (state.projects?.persistent) { projectRegistry = updateActiveProjectProvider(localStorage, state.projects.registry, state.source.type); state.projects.registry = projectRegistry; }
  } catch (error) {
    state.syncStatus = `Drive settings could not be saved. ${error.message}`;
  }
  renderAndFocus("syncStatus");
}

function sourceHelpText() {
  if (demoMode) return "Demo changes and recovery snapshots reset whenever this page reloads. External sources are disabled.";
  if (state.sourceSelection === "local-server") return "Share work through a server on this device or your local network. Your current work stays open until setup succeeds.";
  if (state.sourceSelection === "team") return "Team work is saved on the server. Access depends on your role. Team content is not kept in this browser after you leave the workspace.";
  if (state.source.type === "google-drive") return `Drive sync combines changes in ${state.source.fileName} when they do not conflict. A copy stays on this device for offline work.`;
  if (state.source.type === "local-file") return "The browser keeps a recovery copy and autosaves to the linked file while permission remains available.";
  return "Your work and recovery copies are saved in this browser on this device. Download a backup to keep a separate copy.";
}

async function useBrowserStorage() {
  if (state.dataBusy || demoMode) return;
  const source = { ...state.source, type: "browser" };
  const sync = { ...state.sync, fileLastModified: 0, fileBaselineDocument: null, fileReview: null, fileResolutionDocument: null, fileConflicts: [] };
  try {
    await runLocalStorageTransaction([sourceKey, syncKey], () => {
      localStorage.setItem(sourceKey, JSON.stringify(normalizeWorkspaceSource(source)));
      localStorage.setItem(syncKey, serializeSync(sync));
    });
    state.source = source;
    state.sync = sync;
    state.sourceSelection = "local";
    state.linkedFile = { handle: null, name: "", permission: "unknown", lastModified: 0, status: "" };
    try {
      await runLocalExternalEffect(() => clearLinkedFileHandle(state.projects?.registry.activeProjectId || PRIMARY_PROJECT_ID), "Disconnect linked file");
      state.localExternalEffect = "";
    } catch { /* The durable browser source remains active; a retained handle does not write files. */ }
    state.syncStatus = "Browser storage is active. The previously linked file was not changed.";
  } catch (error) { state.syncStatus = safeTeamError(error, "Browser storage could not be activated."); }
  renderAndFocus("syncStatus");
}

async function linkExistingWorkspaceFile(event) {
  if (state.dataBusy || demoMode) return;
  await runLinkedFileAction(async () => {
    const handle = await openLinkedWorkspaceFile();
    const file = await readLinkedWorkspaceFile(handle);
    const workspace = importPortableWorkspace(file.text);
    const confirmed = await requestDataConfirmation({
      title: "Use this workspace file?",
      description: `${file.name} contains ${workspace.items.length} initiatives. PM OS will store a browser recovery snapshot before replacing the current workspace.`,
      confirmLabel: "Use File",
      trigger: event?.currentTarget
    });
    if (!confirmed) return { cancelled: true };
    const baseline = mergeReadyDocument(JSON.parse(file.text));
    const nextSync = { ...state.sync, fileLastModified: file.lastModified, fileBaselineDocument: baseline, fileReview: null, fileResolutionDocument: null, fileConflicts: [], localPending: false };
    await replaceWorkspace(workspace.items, workspace.activity, backupReasons.import, nextSync, workspace.organization, workspace.customerDirectory, workspace.planningCalendar, workspace.workflow, workspace.prioritization, workspace.insightRecords, workspace.codeRepositories, workspace.implementationRuns, workspace.experience, workspace.artifacts || []);
    state.linkedFile = { handle, name: file.name, permission: await queryLinkedFilePermission(handle), lastModified: file.lastModified, status: "ready" };
    await storeLinkedFileHandle(state.projects.registry.activeProjectId, handle);
    state.sourceSelection = "local-file";
    state.source = { ...state.source, type: "local-file", fileName: file.name };
    await persistSource();
    state.syncStatus = `Linked ${file.name}. Future changes autosave to this file.`;
    return { focusId: "syncStatus" };
  });
}

async function createNewWorkspaceFile(event) {
  if (state.dataBusy || demoMode) return;
  await runLinkedFileAction(async () => {
    const handle = await createLinkedWorkspaceFile(globalThis, state.source.fileName || "pm-os-workspace.json");
    const content = exportPortableWorkspace();
    await withWorkspaceFileLock(() => runLocalExternalEffect(() => writeLinkedWorkspaceFile(handle, content), "Workspace file creation"));
    const file = await readLinkedWorkspaceFile(handle);
    state.linkedFile = { handle, name: file.name, permission: await queryLinkedFilePermission(handle), lastModified: file.lastModified, status: "ready" };
    await storeLinkedFileHandle(state.projects.registry.activeProjectId, handle);
    state.sourceSelection = "local-file";
    state.source = { ...state.source, type: "local-file", fileName: file.name };
    state.sync = { ...state.sync, fileLastModified: file.lastModified, fileBaselineDocument: mergeReadyDocument(JSON.parse(content)), fileReview: null, fileResolutionDocument: null, fileConflicts: [], localPending: false };
    await persistSource();
    await persistSync();
    state.syncStatus = `Created and linked ${file.name}.`;
    return { focusId: "syncStatus" };
  }, event?.currentTarget);
}

async function saveLinkedWorkspaceNow() {
  await runLinkedFileAction(async () => {
    await writeCurrentLinkedWorkspace();
  });
}

async function requestLinkedWorkspacePermission() {
  let ready = false;
  await runLinkedFileAction(async () => {
    const permission = await requestLinkedFilePermission(state.linkedFile.handle);
    state.linkedFile.permission = permission;
    if (permission !== "granted") throw new Error("Write permission was not granted. Browser storage remains available.");
    ready = true;
    state.syncStatus = "Linked file permission is ready.";
  });
  // The inspection owns its busy guard; run it after permission checking releases it.
  if (ready) await inspectLinkedWorkspaceOnFocus();
}

async function unlinkWorkspaceFile() {
  await useBrowserStorage();
}

async function restoreLinkedWorkspaceHandle() {
  if (demoMode || state.source.type !== "local-file" || !linkedFileSupported()) return;
  const projectId = state.projects?.registry.activeProjectId || PRIMARY_PROJECT_ID;
  const source = state.source;
  const stillCurrent = () => state.source === source && !state.team.active && (state.projects?.registry.activeProjectId || PRIMARY_PROJECT_ID) === projectId;
  try {
    let handle = await loadLinkedFileHandle(projectId);
    if (!handle && projectId === PRIMARY_PROJECT_ID) {
      handle = await loadLinkedFileHandle();
      if (handle) await storeLinkedFileHandle(projectId, handle);
    }
    if (!handle) throw new Error("Choose the workspace file again to restore access.");
    const permission = await queryLinkedFilePermission(handle);
    if (!stillCurrent()) return;
    state.linkedFile = { handle, name: handle.name || state.source.fileName, permission, lastModified: state.sync.fileLastModified, status: permission };
    state.syncStatus = permission === "granted" ? `Linked ${handle.name}.` : "Linked file permission is needed before autosave can resume.";
    render();
  } catch (error) {
    if (!stillCurrent()) return;
    state.linkedFile.status = "unavailable";
    state.syncStatus = error.message;
    render();
  }
}

async function synchronizeLinkedWorkspace({ resolution } = {}) {
  assertLocalWorkspaceCurrent();
  const handle = state.linkedFile.handle;
  if (!handle) throw new Error("Choose a linked workspace file first.");
  const source = state.source;
  const projectId = state.projects?.registry.activeProjectId || PRIMARY_PROJECT_ID;
  const assertCurrent = () => {
    if (state.source !== source || state.linkedFile.handle !== handle || state.team.active
      || (state.projects?.registry.activeProjectId || PRIMARY_PROJECT_ID) !== projectId) {
      throw new Error("The active workspace changed. The linked-file operation stopped.");
    }
  };
  const currentDocument = () => mergeReadyDocument(JSON.parse(exportPortableWorkspace()));
  const sameDocument = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  return withWorkspaceFileLock(async () => {
    assertCurrent();
    const permission = await queryLinkedFilePermission(handle);
    assertCurrent();
    state.linkedFile.permission = permission;
    if (permission !== "granted") throw new Error("Linked file write permission is required. Your changes remain in this browser.");
    const file = await readLinkedWorkspaceFile(handle);
    assertCurrent();
    // Validate every read, including files whose modification time did not change.
    importPortableWorkspace(file.text);
    const remoteDocument = mergeReadyDocument(JSON.parse(file.text));
    const localDocument = currentDocument();
    const baseDocument = state.sync.fileBaselineDocument;
    if (!baseDocument) throw new Error("Reopen the linked file so PM OS can save a version to compare changes against.");
    const reviewCurrent = state.sync.fileReview
      && sameDocument(state.sync.fileReview.local, localDocument)
      && sameDocument(state.sync.fileReview.remote, remoteDocument);
    let result = reviewCurrent && state.sync.fileResolutionDocument
      ? { merged: state.sync.fileResolutionDocument, conflicts: state.sync.fileConflicts, clean: !state.sync.fileConflicts.length }
      : mergeWorkspaceDocuments(baseDocument, localDocument, remoteDocument);
    // A choice only applies to the exact versions the customer reviewed.
    if (resolution && reviewCurrent) {
      result = resolveWorkspaceConflicts(result, { [resolution.path]: resolution.choice });
    }
    if (result.conflicts.length) {
      state.sync = { ...state.sync, fileResolutionDocument: result.merged,
        fileConflicts: result.conflicts, fileReview: { local: localDocument, remote: remoteDocument }, localPending: true };
      await persistSync();
      state.syncStatus = (resolution && !reviewCurrent ? "The workspace changed during review. Review the latest values. " : "")
        + result.conflicts.length + " linked-file conflict" + (result.conflicts.length === 1 ? "" : "s")
        + " need review. The external file was not overwritten.";
      return false;
    }
    const workspace = importPortableWorkspace(JSON.stringify(result.merged));
    const writeRemote = !sameDocument(result.merged, remoteDocument);
    if (writeRemote) {
      assertCurrent();
      try {
        await runLocalExternalEffect(() => writeLinkedWorkspaceFile(handle, JSON.stringify(result.merged, null, 2), { expectedText: file.text }), "Linked file update");
      } catch (error) {
        assertCurrent();
        // Preserve a clean merge in recovery even when the disk is unavailable.
        // Keep the previous baseline and all unresolved review state until a write succeeds.
        if (!resolution && !state.sync.fileConflicts.length
          && sameDocument(localDocument, currentDocument()) && !sameDocument(result.merged, localDocument)) {
          const pendingSync = { ...state.sync, localPending: true };
          await replaceWorkspace(workspace.items, workspace.activity, backupReasons.linkedFileMerge, pendingSync,
            workspace.organization, workspace.customerDirectory, workspace.planningCalendar,
            workspace.workflow, workspace.prioritization, workspace.insightRecords,
            workspace.codeRepositories, workspace.implementationRuns, workspace.experience, workspace.artifacts || []);
        }
        throw error;
      }
      assertCurrent();
    }
    // An initiative may be saved while the asynchronous file write is in progress.
    // Retain the earlier common baseline so the next pass can merge that new edit.
    if (!sameDocument(localDocument, currentDocument())) {
      state.sync = { ...state.sync, localPending: true };
      await persistSync();
      state.syncStatus = "New browser changes are waiting to sync. Checking the file again.";
      scheduleLinkedWorkspaceWrite();
      return false;
    }
    const updated = await readLinkedWorkspaceFile(handle);
    assertCurrent();
    if (!sameDocument(localDocument, currentDocument())) {
      state.sync = { ...state.sync, localPending: true };
      await persistSync();
      state.syncStatus = "New browser changes are waiting to sync. Checking the file again.";
      scheduleLinkedWorkspaceWrite();
      return false;
    }
    // A later external edit remains remote work; never accept it as our saved baseline.
    const expectedText = writeRemote ? JSON.stringify(result.merged, null, 2) : file.text;
    const changedAgain = updated.text !== expectedText;
    const nextSync = { ...state.sync, fileLastModified: updated.lastModified,
      fileBaselineDocument: result.merged, fileResolutionDocument: null, fileConflicts: [],
      fileReview: null, localPending: changedAgain };
    if (!sameDocument(result.merged, localDocument)) {
      await replaceWorkspace(workspace.items, workspace.activity, backupReasons.linkedFileMerge, nextSync,
        workspace.organization, workspace.customerDirectory, workspace.planningCalendar,
        workspace.workflow, workspace.prioritization, workspace.insightRecords,
        workspace.codeRepositories, workspace.implementationRuns, workspace.experience, workspace.artifacts || []);
    } else {
      state.sync = nextSync;
      await persistSync();
    }
    state.linkedFile.lastModified = updated.lastModified;
    state.syncStatus = changedAgain ? "The file changed again after syncing. Check the latest changes before continuing."
      : resolution ? "Resolved every linked-file conflict and saved the merged workspace."
      : writeRemote ? "Saved " + file.name + ". Merged browser and external file changes."
      : "Loaded changes from the linked workspace file.";
    return !changedAgain;
  });
}

async function inspectLinkedWorkspaceOnFocus({ forSwitch = false } = {}) {
  if (demoMode || state.dataBusy || state.projects?.busy || (state.projects?.departurePending && !forSwitch) || state.source.type !== "local-file" || !state.linkedFile.handle) return false;
  state.dataBusy = true;
  try { return await synchronizeLinkedWorkspace(); }
  catch (error) { state.syncStatus = "Linked file check stopped. " + error.message; return false; }
  finally { state.dataBusy = false; render(); }
}

async function resolveLinkedFileConflict(event) {
  const path = event.currentTarget.dataset.fileConflictPath || "";
  const choice = event.currentTarget.dataset.fileConflictChoice;
  if (!state.sync.fileConflicts.some((entry) => entry.path === path) || !["local", "remote"].includes(choice)) return;
  await runLinkedFileAction(() => synchronizeLinkedWorkspace({ resolution: { path, choice } }));
}

let linkedFileWriteTimer = 0;
function scheduleLinkedWorkspaceWrite() {
  if (state.source.type !== "local-file" || !state.linkedFile.handle || state.sync.fileConflicts.length) return;
  window.clearTimeout(linkedFileWriteTimer);
  const projectId = state.projects?.registry.activeProjectId || PRIMARY_PROJECT_ID;
  linkedFileWriteTimer = window.setTimeout(() => {
    if ((state.projects?.registry.activeProjectId || PRIMARY_PROJECT_ID) !== projectId || state.team.active || state.projects?.busy || state.projects?.departurePending) return;
    void runLinkedFileAction(writeCurrentLinkedWorkspace);
  }, 500);
}

async function writeCurrentLinkedWorkspace() {
  return synchronizeLinkedWorkspace();
}

async function runLinkedFileAction(action) {
  if (state.dataBusy) return;
  state.dataBusy = true;
  render();
  try { await action(); }
  catch (error) { state.syncStatus = error?.name === "AbortError" ? "File selection cancelled." : error.message; }
  finally { state.dataBusy = false; render(); }
}

function withWorkspaceFileLock(callback) {
  const projectId = state.projects?.registry.activeProjectId || PRIMARY_PROJECT_ID;
  if (navigator.locks?.request) return navigator.locks.request(`pm-os-staging-linked-workspace:${projectId}`, { mode: "exclusive" }, callback);
  return callback();
}

function mergeReadyDocument(document) {
  const copy = structuredClone(document);
  delete copy.exportedAt;
  return copy;
}

async function connectDrive(event) {
  await runDriveAction(async () => {
    assertDriveAvailable(false);
    const runtimeClientId = normalizeDriveRuntimeConfig(globalThis.PM_OS_DRIVE_CONFIG)?.clientId || "";
    const clientId = state.source.clientId || runtimeClientId;
    if (!state.source.clientId && clientId) {
      state.source = { ...state.source, clientId };
      await persistSource();
    }
    state.driveToken = await requestDriveAccessToken(clientId);
    await refreshDriveMetadata();
    state.syncStatus = "Connected to Google Drive for this session.";
  }, { pendingStatus: "Connecting to Google Drive...", triggerId: event?.currentTarget?.id || "connectDriveButton" });
}

async function chooseDriveFile(event) {
  await runDriveAction(async () => {
    assertDriveAvailable();
    const runtime = normalizeDriveRuntimeConfig(globalThis.PM_OS_DRIVE_CONFIG);
    const selected = await chooseDriveWorkspaceFile(runtime, state.driveToken);
    if (!selected) {
      state.syncStatus = "Drive file selection cancelled. The current source was not changed.";
      return { cancelled: true, focusId: event?.currentTarget?.id || "chooseDriveFileButton" };
    }
    state.source = { ...state.source, fileId: selected.id, fileName: selected.name || state.source.fileName };
    state.sync = defaultSyncState();
    state.driveReview = null;
    await persistSource();
    await persistSync();
    state.syncStatus = `Selected ${state.source.fileName}. Choose Sync now to preview and activate its content.`;
  }, { pendingStatus: "Opening Google Picker...", triggerId: event?.currentTarget?.id || "chooseDriveFileButton" });
}

async function checkDrive(event) {
  await runDriveAction(async () => {
    assertDriveAvailable();
    await refreshDriveMetadata();
  }, { pendingStatus: "Checking Drive metadata...", triggerId: event?.currentTarget?.id || "checkDriveButton" });
}

async function syncDriveNow(event) {
  await runDriveAction(async () => {
    assertDriveAvailable();
    const remoteWorkspace = await readDriveWorkspace(state.source, state.driveToken);
    if (!remoteWorkspace) {
      await pushCurrentWorkspaceToDrive();
      state.syncStatus = "Created the Drive workspace and saved the browser copy.";
      return;
    }
    const remoteFingerprint = driveFileFingerprint(remoteWorkspace.file);
    const remoteDocument = mergeReadyDocument(JSON.parse(remoteWorkspace.content));
    const conflict = buildSyncConflict(state.sync.baseRemote, remoteFingerprint);
    if (!conflict) {
      if (state.sync.localPending) await pushCurrentWorkspaceToDrive();
      else {
        await commitSync({ ...state.sync, remote: remoteFingerprint, conflict: null });
        state.syncStatus = "Drive and browser are already in sync.";
      }
      return;
    }
    if (!state.sync.localPending) {
      const workspace = importPortableWorkspace(remoteWorkspace.content);
      const nextSync = { ...advanceDriveBaseline(state.sync, remoteFingerprint, "pull"), baseDocument: remoteDocument, localPending: false };
      await replaceWorkspace(workspace.items, workspace.activity, backupReasons.drivePull, nextSync, workspace.organization, workspace.customerDirectory, workspace.planningCalendar, workspace.workflow, workspace.prioritization, workspace.insightRecords, workspace.codeRepositories, workspace.implementationRuns, workspace.experience, workspace.artifacts || []);
      state.driveReview = null;
      state.syncStatus = "Downloaded Drive changes and stored a browser recovery snapshot.";
      return;
    }
    if (!state.sync.baseDocument) {
      state.driveReview = conflict;
      state.syncStatus = "Drive and this device both have changes, but PM OS has no shared saved version to compare them against. Review the options under Replace one copy with another.";
      return;
    }
    const localDocument = mergeReadyDocument(JSON.parse(exportPortableWorkspace()));
    const merged = mergeWorkspaceDocuments(state.sync.baseDocument, localDocument, remoteDocument);
    if (!merged.clean) {
      state.driveReview = { ...conflict, conflicts: merged.conflicts };
      state.syncStatus = `${merged.conflicts.length} overlapping Drive change${merged.conflicts.length === 1 ? "" : "s"} need review. Neither copy was overwritten.`;
      return;
    }
    const mergedContent = JSON.stringify(merged.merged, null, 2);
    const saved = await runLocalExternalEffect(() => saveDriveWorkspace(state.source, state.driveToken, mergedContent, remoteFingerprint), "Drive merge upload");
    const savedFingerprint = driveFileFingerprint(saved);
    const workspace = importPortableWorkspace(mergedContent);
    const nextSync = { ...advanceDriveBaseline(state.sync, savedFingerprint, "push"), baseDocument: merged.merged, localPending: false };
    await replaceWorkspace(workspace.items, workspace.activity, backupReasons.drivePull, nextSync, workspace.organization, workspace.customerDirectory, workspace.planningCalendar, workspace.workflow, workspace.prioritization, workspace.insightRecords, workspace.codeRepositories, workspace.implementationRuns, workspace.experience, workspace.artifacts || []);
    state.driveReview = null;
    state.syncStatus = "Merged non-overlapping browser and Drive changes, then saved both copies.";
  }, { pendingStatus: "Synchronizing browser and Drive...", triggerId: event?.currentTarget?.id || "syncDriveButton" });
}

async function pullFromDrive(event) {
  const triggerId = event?.currentTarget?.id || "pullDriveButton";
  await runDriveAction(async () => {
    assertDriveAvailable();
    const workspace = await readDriveWorkspace(state.source, state.driveToken);
    if (!workspace) {
      state.syncStatus = "No Drive workspace file was found.";
      return;
    }
    const remoteWorkspace = importPortableWorkspace(workspace.content);
    const remote = driveFileFingerprint(workspace.file);
    const confirmed = await requestDataConfirmation({
      title: "Replace this device's copy with Drive?",
      description: "The Drive file will replace the workspace on this device. PM OS first saves a recovery copy here so you can restore the previous work.",
      confirmLabel: "Use Drive copy",
      trigger: document.querySelector(`#${triggerId}`)
    });
    if (!confirmed) {
      state.syncStatus = "Download cancelled. The workspace on this device was not changed.";
      return { cancelled: true, focusId: triggerId };
    }
    const nextSync = { ...advanceDriveBaseline(state.sync, remote, "pull"), baseDocument: mergeReadyDocument(JSON.parse(workspace.content)), localPending: false };
    await replaceWorkspace(remoteWorkspace.items, remoteWorkspace.activity, backupReasons.drivePull, nextSync, remoteWorkspace.organization, remoteWorkspace.customerDirectory, remoteWorkspace.planningCalendar, remoteWorkspace.workflow, remoteWorkspace.prioritization, remoteWorkspace.insightRecords, remoteWorkspace.codeRepositories, remoteWorkspace.implementationRuns, remoteWorkspace.experience, remoteWorkspace.artifacts || []);
    state.driveReview = null;
    state.dataStatus = "Saved a recovery copy before downloading the Drive workspace.";
    state.syncStatus = "Downloaded the Drive workspace and saved the version used to compare future changes.";
  }, { pendingStatus: "Reading a stable Drive workspace...", triggerId });
}

async function pushToDrive(event) {
  const triggerId = event?.currentTarget?.id || "pushDriveButton";
  await runDriveAction(async () => {
    assertDriveAvailable();
    const info = await inspectDriveWorkspace(state.source, state.driveToken);
    const remoteBeforePush = driveFileFingerprint(info.file);
    const conflict = buildSyncConflict(state.sync.baseRemote, remoteBeforePush);
    if (conflict) {
      state.driveReview = conflict;
      state.syncStatus = driveConflictStatus(conflict);
      return { review: true };
    }
    const file = await runLocalExternalEffect(() => saveDriveWorkspace(state.source, state.driveToken, exportPortableWorkspace(), state.sync.baseRemote), "Drive upload");
    const remote = driveFileFingerprint(file);
    const complete = driveFingerprintComplete(remote);
    if (!complete) {
      state.driveReview = { kind: "unknown", baseRemote: state.sync.baseRemote, remote };
      state.syncStatus = "Drive saved the workspace, but PM OS could not verify its file details. Download the Drive copy before uploading again.";
      return { review: true };
    }
    const nextSync = { ...advanceDriveBaseline(state.sync, remote, "push"), baseDocument: mergeReadyDocument(JSON.parse(exportPortableWorkspace())), localPending: false };
    await commitSync(nextSync);
    state.driveReview = null;
    state.syncStatus = "Uploaded this device's workspace to the Drive file.";
  }, { pendingStatus: "Checking Drive and pushing local workspace...", triggerId });
}

async function pushCurrentWorkspaceToDrive() {
  assertLocalWorkspaceCurrent();
  const content = exportPortableWorkspace();
  const file = await runLocalExternalEffect(() => saveDriveWorkspace(state.source, state.driveToken, content, state.sync.baseRemote), "Drive upload");
  const remote = driveFileFingerprint(file);
  if (!driveFingerprintComplete(remote)) throw new Error("Drive saved the file but did not return a complete revision. Inspect Drive before continuing.");
  await commitSync({ ...advanceDriveBaseline(state.sync, remote, "push"), baseDocument: mergeReadyDocument(JSON.parse(content)), localPending: false });
  state.driveReview = null;
}

async function saveLocalConflictCopy(event) {
  await runDriveAction(async () => {
    assertDriveAvailable();
    if (!(state.driveReview || state.sync.conflict)) throw new Error("No Drive conflict is active.");
    const result = await runLocalExternalEffect(() => saveDriveConflictCopy(state.source, state.driveToken, exportPortableWorkspace()), "Drive conflict copy");
    state.localExternalEffect = "";
    state.syncStatus = `Saved ${result.fileName}. The original Drive file was not changed. Its conflicting changes still need review.`;
  }, { pendingStatus: "Saving a local conflict copy to Drive...", triggerId: event?.currentTarget?.id || "saveConflictCopyButton" });
}

async function refreshDriveMetadata() {
  const info = await inspectDriveWorkspace(state.source, state.driveToken);
  const remote = driveFileFingerprint(info.file);
  const conflict = buildSyncConflict(state.sync.baseRemote, remote);
  await commitSync({ ...state.sync, remote, conflict });
  state.driveReview = null;
  if (conflict) state.syncStatus = driveConflictStatus(conflict);
  else state.syncStatus = info.file ? "The Drive file matches the version saved at your last sync." : "The Drive folder exists, but no workspace file was found.";
}

function buildSyncConflict(baseRemote, remote) {
  const kind = driveConflictKind(baseRemote, remote);
  return kind ? { kind, baseRemote, remote } : null;
}

async function runDriveAction(action, { pendingStatus, triggerId }) {
  const reviewBefore = JSON.stringify(state.driveReview || state.sync.conflict);
  const outcome = await runExclusiveAsyncAction({
    isBusy: () => state.dataBusy,
    setBusy: (value) => { state.dataBusy = value; },
    onStart: () => { state.syncStatus = pendingStatus; render(); },
    action
  });
  if (outcome.skipped) return;
  const result = outcome.value;
  if (outcome.error) {
    if (outcome.error?.code === "DRIVE_CONFLICT") {
      state.driveReview = { kind: outcome.error.kind, baseRemote: state.sync.baseRemote, remote: outcome.error.remote };
    }
    state.syncStatus = outcome.error.message;
  }
  if (result?.cancelled) {
    render();
    document.querySelector(`#${result.focusId || triggerId}`)?.focus();
    return;
  }
  const review = state.driveReview || state.sync.conflict;
  const reviewChanged = review && JSON.stringify(review) !== reviewBefore;
  renderAndFocus(reviewChanged ? "driveConflictTitle" : "syncStatus");
}

function assertDriveAvailable(requireToken = true) {
  if (demoMode) throw new Error("Drive actions are disabled in demo mode.");
  const source = { ...state.source, clientId: state.source.clientId || normalizeDriveRuntimeConfig(globalThis.PM_OS_DRIVE_CONFIG)?.clientId || "" };
  if (state.source.type !== "google-drive" || !driveSourceReady(source)) throw new Error("Complete the Drive source settings first.");
  if (requireToken && !state.driveToken) throw new Error("Connect Drive before continuing.");
}

function formatSyncTime(value) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

function loadRecoverySnapshots() {
  if (demoMode) return { snapshots: [], ignoredCount: 0, error: "" };
  return loadWorkspaceSnapshots(localStorage, backupKey);
}

function recoveryLoadStatus(result) {
  if (result.error) return result.error;
  if (result.ignoredCount) return `Ignored ${result.ignoredCount} malformed recovery snapshot${result.ignoredCount === 1 ? "" : "s"}.`;
  return demoMode ? "Demo recovery snapshots reset whenever this page reloads. Download a backup to keep a separate copy." : "Recovery snapshots are ready.";
}

async function restoreBackup(event) {
  const snapshotId = event.currentTarget.dataset.restoreBackup;
  const triggerId = event.currentTarget.id;
  const outcome = await runExclusiveAsyncAction({
    isBusy: () => state.dataBusy,
    setBusy: (value) => { state.dataBusy = value; },
    onStart: () => { state.dataStatus = "Preparing recovery snapshot restore..."; render(); },
    action: async () => {
      const restored = restoreWorkspaceSnapshot(state.backups, snapshotId);
      const reason = backupReasonLabel(restored.snapshot.reason);
      const time = formatSyncTime(restored.snapshot.createdAt);
      const confirmed = await requestDataConfirmation({
        title: "Restore recovery snapshot?",
        description: `Restore ${reason.toLowerCase()} from ${time}. The current workspace will be replaced after storing a before-restore recovery snapshot.`,
        confirmLabel: "Restore Snapshot",
        trigger: document.querySelector(`#${triggerId}`)
      });
      if (!confirmed) return { cancelled: true };
      const nextWorkspace = importPortableWorkspace(restored.snapshot.payload);
      await replaceWorkspace(nextWorkspace.items, nextWorkspace.activity, backupReasons.restore, undefined, nextWorkspace.organization, nextWorkspace.customerDirectory, nextWorkspace.planningCalendar, nextWorkspace.workflow, nextWorkspace.prioritization, nextWorkspace.insightRecords, nextWorkspace.codeRepositories, nextWorkspace.implementationRuns, nextWorkspace.experience, nextWorkspace.artifacts || []);
      state.dataStatus = `Restored ${reason.toLowerCase()} from ${time}.`;
      return { cancelled: false };
    }
  });
  if (outcome.skipped) return;
  if (outcome.error) state.dataStatus = `Restore stopped. ${outcome.error.message}`;
  else if (outcome.value?.cancelled) state.dataStatus = "Restore cancelled. The workspace was not changed.";
  render();
  document.querySelector(outcome.value?.cancelled ? `#${triggerId}` : "#dataStatus")?.focus();
}

function downloadBackup(event) {
  try {
    const restored = restoreWorkspaceSnapshot(state.backups, event.currentTarget.dataset.downloadBackup);
    const filename = backupDownloadName(restored.snapshot);
    downloadFile(restored.snapshot.payload, "application/json", filename);
    announceDataStatus(`Backup download requested: ${filename}. Check your browser's downloads.`);
  } catch (error) {
    announceDataStatus(`Backup download failed. ${error.message}`);
  }
}

async function resetWorkspace(event) {
  const clearingOperationWorkspace = !demoMode;
  const confirmed = await requestDataConfirmation({
    title: clearingOperationWorkspace ? "Clear workspace?" : "Reset demo data?",
    description: clearingOperationWorkspace
      ? "This removes all initiatives, insights, activity, organization and customer records, planning data, workflow settings, prioritization settings, and cached selections from this workspace. A before-reset recovery snapshot is stored in this browser first. Browser preferences, source configuration, tutorial progress, usage data, and existing recovery snapshots remain. Connected Drive and Team workspaces are not changed."
      : "Reset will restore the built-in sample data after storing a before-reset recovery snapshot. Demo changes and recovery snapshots reset whenever this page reloads. Your saved workspace will not change.",
    confirmLabel: clearingOperationWorkspace ? "Clear Workspace" : "Reset Demo Data",
    secondaryLabel: clearingOperationWorkspace ? "Download backup first" : "",
    onSecondary: clearingOperationWorkspace ? downloadBeforeClearBackup : undefined,
    trigger: event.currentTarget
  });
  if (!confirmed) {
    announceDataStatus(clearingOperationWorkspace ? "Clear cancelled. The workspace was not changed." : "Reset cancelled. The demo was not changed.", false);
    return;
  }
  try {
    const resetTarget = demoMode ? demoWorkspace : createEmptyWorkspaceDocument();
    await replaceWorkspace([...resetTarget.items], [], backupReasons.reset, clearingOperationWorkspace ? defaultSyncState() : undefined, resetTarget.organization, resetTarget.customerDirectory, resetTarget.planningCalendar, resetTarget.workflow, resetTarget.prioritization, resetTarget.insightRecords, resetTarget.codeRepositories || [], resetTarget.implementationRuns || [], resetTarget.experience, resetTarget.artifacts || []);
    if (clearingOperationWorkspace) resetWorkspaceUiState();
    state.dataStatus = clearingOperationWorkspace
      ? "Stored a recovery snapshot and cleared the workspace. To recover, use Restore Snapshot below or import the JSON backup you downloaded."
      : "Reset the demo data. Your workspace was not changed.";
    if (clearingOperationWorkspace) pushViewUrl(true);
    renderAndFocus("dataStatus");
  } catch (error) {
    announceDataStatus(`Reset stopped. ${error.message}`);
  }
}

function downloadBeforeClearBackup() {
  const loaded = loadOperationalWorkspaceResult();
  const content = loaded.corrupted && loaded.raw ? loaded.raw : exportPortableWorkspace();
  const filename = loaded.corrupted ? `pm-os-unreadable-workspace-${todayStamp()}.json` : `pm-os-backup-before-clear-${todayStamp()}.json`;
  downloadFile(content, "application/json", filename);
}

function resetWorkspaceUiState() {
  portfolioOpenRecommendations.clear();
  documentComposer.reset();
  state.homeHealth = null;
  state.experiencePresetChoice = "";
  state.dataAdvancedOpen = false;
  state.weeklyUpdateCopied = readWeeklyUpdateCopied(localStorage, weeklyChecklistStorageKey());
  state.spaceModes = {};
  state.query = "";
  state.periodSelection = normalizePeriodSelection({ kind: "all" }, state.planningCalendar);
  state.periodAnnouncement = "";
  state.selectedOrgUnitId = "";
  state.selectedPersonId = "";
  state.customerView = "accounts";
  state.selectedCustomerId = "";
  state.selectedSegmentId = "";
  state.customerQuery = "";
  state.customerPage = 1;
  state.customerStatus = "";
  state.customerImport = null;
  state.customerSegmentDraft = null;
  state.customerAccountDrafts.clear();
  state.organizationStatus = "";
  state.workflowStatus = "";
  state.selectedWorkflowStatusId = "";
  state.prioritizationStatus = "";
  state.priorityDragId = "";
  state.selectedPriorityFrameworkId = "";
  state.boardTeamId = "all";
  state.mobileBoardStatusId = "";
  state.boardStatus = "";
  state.boardBusyItemId = "";
  state.draggedItemId = "";
  state.selectedSpecId = "";
  state.initiativeDetail = createInitiativeDetailState();
  state.initiativeEditor = createInitiativeEditorState();
  state.insightEditor = createInsightEditorState();
  state.insightStatusFilter = "";
  state.pendingInsightPromotionId = "";
  state.editorAnnouncement = "";
  state.driveReview = null;
  state.storageWarning = "";
}

async function replaceWorkspace(items, activity, backupReason, nextSync, organization = state.organization, customerDirectory = state.customerDirectory, planningCalendar = state.planningCalendar, workflow = state.workflow, prioritization = state.prioritization, insightRecords = state.insightRecords, codeRepositories = state.codeRepositories, implementationRuns = state.implementationRuns, experience = state.experience, artifacts = []) {
  if (state.team.active) throw new Error("Team workspace data cannot be stored in browser recovery.");
  const synchronizeReplacement = !demoMode && nextSync === undefined && [backupReasons.import, backupReasons.restore].includes(backupReason);
  if (synchronizeReplacement && ["google-drive", "local-file"].includes(state.source.type)) {
    // Persist the dirty marker in the same rollback-safe transaction as the import.
    nextSync = { ...state.sync, localPending: true };
  }
  const replacementCandidate = { items, activity, organization, customerDirectory, planningCalendar, workflow, prioritization, insightRecords, codeRepositories, implementationRuns, experience, artifacts };
  const previousItems = state.items;
  const previousInsightRecords = state.insightRecords;
  const previousCodeRepositories = state.codeRepositories;
  const previousImplementationRuns = state.implementationRuns;
  const previousArtifacts = state.artifacts;
  const previousActivity = state.activity;
  const previousPlanningCalendar = state.planningCalendar;
  const previousPeriodSelection = state.periodSelection;
  const previousOrganization = state.organization;
  const previousCustomerDirectory = state.customerDirectory;
  const previousWorkflow = state.workflow;
  const previousPrioritization = state.prioritization;
  const previousExperience = state.experience;
  const previousBackups = state.backups;
  const previousSync = state.sync;
  const backupPayload = exportPortableWorkspace(previousItems, previousActivity, previousOrganization, previousCustomerDirectory, previousPlanningCalendar, previousWorkflow, previousPrioritization, previousInsightRecords, previousCodeRepositories, previousImplementationRuns, previousExperience, previousArtifacts);
  let nextBackups;
  if (demoMode) {
    nextBackups = addWorkspaceSnapshot(previousBackups, backupPayload, backupReason);
  } else {
    const checklistKey = weeklyChecklistStorageKey();
    const clearingChecklist = backupReason === backupReasons.reset && Boolean(checklistKey);
    await runLocalStorageTransaction([storageKey, activityKey, backupKey, syncKey, ...(clearingChecklist ? [checklistKey] : [])], () => {
      nextBackups = storeWorkspaceSnapshot(localStorage, backupKey, previousBackups, backupPayload, backupReason);
      localStorage.setItem(storageKey, exportPortableWorkspace(items, activity, organization, customerDirectory, planningCalendar, workflow, prioritization, insightRecords, codeRepositories, implementationRuns, experience, artifacts));
      localStorage.setItem(activityKey, JSON.stringify({ activity }));
      if (nextSync) localStorage.setItem(syncKey, serializeSync(nextSync));
      if (clearingChecklist) localStorage.removeItem(checklistKey);
    }, () => {
      state.items = previousItems;
      state.insightRecords = previousInsightRecords;
      state.codeRepositories = previousCodeRepositories;
      state.implementationRuns = previousImplementationRuns;
      state.artifacts = previousArtifacts;
      state.activity = previousActivity;
      state.planningCalendar = previousPlanningCalendar;
      state.periodSelection = previousPeriodSelection;
      state.organization = previousOrganization;
      state.customerDirectory = previousCustomerDirectory;
      state.workflow = previousWorkflow;
      state.prioritization = previousPrioritization;
      state.experience = previousExperience;
      state.backups = previousBackups;
      state.sync = previousSync;
    }, replacementCandidate);
  }
  try {
    state.items = items;
    state.insightRecords = insightRecords;
    state.codeRepositories = codeRepositories;
    state.implementationRuns = implementationRuns;
    state.artifacts = artifacts;
    state.activity = activity;
    state.planningCalendar = normalizePlanningCalendar(planningCalendar);
    state.periodSelection = normalizePeriodSelection(state.periodSelection, state.planningCalendar);
    state.organization = organization;
    state.customerDirectory = customerDirectory;
    state.workflow = workflow;
    state.prioritization = prioritization;
    state.experience = normalizeWorkspaceExperience(experience);
    state.experienceDraft = [...state.experience.enabledCapabilities];
    state.backups = nextBackups;
    if (nextSync) state.sync = nextSync;
    state.storageWarning = "";
    localCommittedWorkspace = localCanonicalFields();
    state.localExternalEffect = "";
  } catch (error) {
    state.items = previousItems;
    state.insightRecords = previousInsightRecords;
    state.codeRepositories = previousCodeRepositories;
    state.implementationRuns = previousImplementationRuns;
    state.artifacts = previousArtifacts;
    state.activity = previousActivity;
    state.planningCalendar = previousPlanningCalendar;
    state.periodSelection = previousPeriodSelection;
    state.organization = previousOrganization;
    state.customerDirectory = previousCustomerDirectory;
    state.workflow = previousWorkflow;
    state.prioritization = previousPrioritization;
    state.experience = previousExperience;
    state.experienceDraft = [...previousExperience.enabledCapabilities];
    state.backups = previousBackups;
    state.sync = previousSync;
    throw error;
  }
  if (synchronizeReplacement) {
    if (state.source.type === "local-file") scheduleLinkedWorkspaceWrite();
    if (state.source.type === "google-drive" && state.driveToken) scheduleAutomaticDriveSync();
  }
}

async function persist() {
  if (demoMode || state.team.active) return;
  const candidate = localCanonicalFields();
  Object.assign(state, localCommittedWorkspace);
  await commitLocalWorkspacePatch(candidate);
}

async function persistActivity() {
  await persist();
}

async function persistLocalValue() {
  await persist();
}


function localCanonicalFields() {
  return Object.fromEntries(["items", "activity", "organization", "customerDirectory", "planningCalendar", "workflow", "prioritization", "insightRecords", "codeRepositories", "implementationRuns", "experience", "artifacts"].map(key => [key, state[key]]));
}

function localWorkspacePayload(workspace) {
  return exportPortableWorkspace(workspace.items, workspace.activity, workspace.organization, workspace.customerDirectory, workspace.planningCalendar, workspace.workflow, workspace.prioritization, workspace.insightRecords, workspace.codeRepositories, workspace.implementationRuns, workspace.experience, workspace.artifacts);
}

function createLocalWriteScope(values) {
  return createStorageWriteScope(localStorage, [storageKey, activityKey, syncKey, sourceKey], values ? { values } : {});
}

function rememberLocalWorkspaceRead(values) {
  localWriteScope = createLocalWriteScope(values);
  localCommittedWorkspace = localCanonicalFields();
  state.localWriteConflict = null;
}

function describeLocalWorkspaceChanges(before, after, path = []) {
  const display = value => value === undefined ? 'Not present' : value === null || value === '' ? 'Not set' : typeof value === 'object' ? (value.title || value.name || value.displayName || value.itemTitle || 'Record') : String(value);
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (Array.isArray(before) && Array.isArray(after) && [...before, ...after].every(value => value && typeof value === 'object' && value.id)) {
    const rows = [];
    for (const id of new Set([...before, ...after].map(value => value.id))) {
      const oldValue = before.find(value => value.id === id), newValue = after.find(value => value.id === id);
      rows.push(...describeLocalWorkspaceChanges(oldValue, newValue, [...path, display(newValue || oldValue)]));
    }
    if (before.map(value => value.id).join('|') !== after.map(value => value.id).join('|') && before.length === after.length && before.every(value => after.some(next => next.id === value.id))) rows.push({ label: [...path, 'Order'].join(' / '), before: before.map(display).join(', '), after: after.map(display).join(', ') });
    return rows;
  }
  if (before && after && !Array.isArray(before) && !Array.isArray(after) && typeof before === 'object' && typeof after === 'object') return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(key => !['exportedAt', 'updatedAt', 'updatedBy', 'version', 'actorId'].includes(key)).flatMap(key => describeLocalWorkspaceChanges(before[key], after[key], [...path, key.replace(/([a-z])([A-Z])/g, '$1 $2')]));
  return [{ label: path.join(' / ') || 'Workspace', before: Array.isArray(before) ? before.map(display).join(', ') : display(before), after: Array.isArray(after) ? after.map(display).join(', ') : display(after) }];
}

function localFormDraftScope() {
  return JSON.stringify([storageKey, state.source.type, location.search, state.selectedWorkflowStatusId, state.selectedPriorityFrameworkId, state.selectedCustomerId, state.selectedSegmentId, state.selectedOrgUnitId, state.selectedPersonId, state.initiativeEditor.mode, state.initiativeEditor.selectedId, state.insightEditor.mode, state.insightEditor.type, state.insightEditor.selectedId]);
}

function captureLocalFormDrafts() {
  return [...document.querySelectorAll('form[id]')].map(form => ({ id: form.id, scope: localFormDraftScope(), fields: [...form.elements].filter(field => field.name && !['password', 'file', 'submit', 'button'].includes(field.type)).map(field => ({ name: field.name, value: field.value, checked: field.checked, type: field.type, selectedValues: field.multiple ? [...field.selectedOptions].map(option => option.value) : undefined })) }));
}

function restoreLocalFormDrafts(drafts) {
  for (const draft of drafts || []) {
    const form = document.getElementById(draft.id);
    if (!form || draft.scope !== localFormDraftScope()) continue;
    for (const saved of draft.fields) {
      const fields = [...form.elements].filter(field => field.name === saved.name);
      const field = ['checkbox', 'radio'].includes(saved.type) ? fields.find(field => field.value === saved.value) : fields[0];
      if (!field) continue;
      if (saved.selectedValues && field.multiple) [...field.options].forEach(option => { option.selected = saved.selectedValues.includes(option.value); });
      else if (['checkbox', 'radio'].includes(saved.type)) field.checked = saved.checked;
      else field.value = saved.value;
    }
  }
}

function reportLocalWriteFailure(error, candidate) {
  const external = state.localExternalEffect;
  const message = external ? `${external} completed, but its local summary was not saved. Do not repeat the external action. ${error?.message || 'Review newer saved work.'}` : error?.message || 'The change could not be saved. Your draft is still available.';
  if (external) {
    const values = Object.fromEntries(localWriteScope.values().map(entry => [entry.key, entry.value]));
    state.localExternalSavePending = { label: external, candidate, sync: state.localExternalPendingSync || state.sync, source: state.source,
      baseSync: values[syncKey] ? JSON.parse(values[syncKey]) : defaultSyncState(), baseSource: values[sourceKey] ? JSON.parse(values[sourceKey]) : defaultSource() };
  }
  {
    // Retain exact scoped form values for quota and I/O failures too.
    state.localWriteConflict = { message, storageKey, baseline: localCommittedWorkspace, candidate, forms: captureLocalFormDrafts() };
    state.editorAnnouncement = message;
    document.querySelectorAll('.global-sync-pill').forEach(node => { node.textContent = 'Not saved · review newer work'; });
    const existing = document.getElementById('localWriteRecovery');
    existing?.remove();
    const target = document.querySelector('dialog[open] .initiative-editor-body') || document.querySelector('dialog[open]') || document.querySelector('main');
    target?.insertAdjacentHTML('afterbegin', localWriteRecoveryMarkup());
    bindLocalWriteRecovery();
  }
}

function localWriteRecoveryMarkup() {
  const conflict = state.localWriteConflict;
  if (!conflict || conflict.storageKey !== storageKey || state.team.active) return '';
  return `<aside id="localWriteRecovery" class="storage-warning" role="alert"><div><strong>Changes were not saved</strong><p>${escapeHtml(conflict.message)}</p><p>Keep editing or download your draft. Review the latest saved workspace before choosing which changes to submit again.</p></div><button type="button" class="secondary" id="downloadLocalWriteDraft">Download my draft</button><button type="button" class="secondary" id="reviewLocalWriteLatest">Review latest saved work</button></aside>`;
}

function bindLocalWriteRecovery() {
  for (const form of document.querySelectorAll('form[id]')) {
    const remember = () => { if (state.localWriteConflict?.forms.some(draft => draft.scope === localFormDraftScope())) state.localWriteConflict.forms = captureLocalFormDrafts(); };
    form.addEventListener('input', remember);
    form.addEventListener('change', remember);
  }
  document.getElementById('downloadLocalWriteDraft')?.addEventListener('click', () => {
    const conflict = state.localWriteConflict;
    downloadFile(JSON.stringify({ workspace: conflict.candidate, forms: captureLocalFormDrafts() }, null, 2), 'application/json', 'pm-os-unsaved-draft.json');
  });
  document.getElementById('reviewLocalWriteLatest')?.addEventListener('click', async event => {
    const conflict = state.localWriteConflict;
    if (!conflict || conflict.storageKey !== storageKey) return;
    const forms = captureLocalFormDrafts();
    conflict.forms = forms;
    const sourceType = state.source.type;
    const projectId = state.projects?.registry?.activeProjectId;
    let values, latest, reviewSnapshot;
    const reviewScope = localWriteScope;
    try {
      reviewSnapshot = await reviewScope.reviewSnapshot();
      values = reviewSnapshot.values;
      if (!values[0].value && localWriteScope.values().find(entry => entry.key === storageKey)?.value) throw new Error("The saved workspace was removed.");
      latest = importPortableWorkspace(values[0].value || encodeWorkspaceDocument(emptyOperationWorkspace));
    } catch { conflict.message = 'The latest saved workspace is missing or cannot be read. Download your draft and recover the saved data in Settings; it has not been overwritten.'; render(); return; }
    const review = document.createElement('dialog');
    review.setAttribute('aria-label', 'Review newer saved work');
    review.className = 'confirmation-dialog';
    const changes = describeLocalWorkspaceChanges(conflict.baseline, latest);
    const pendingExternal = state.localExternalSavePending;
    const summaryMerge = pendingExternal ? mergeWorkspaceDocuments(
      { workspace: conflict.baseline, sync: pendingExternal.baseSync, source: pendingExternal.baseSource },
      { workspace: pendingExternal.candidate, sync: pendingExternal.sync, source: pendingExternal.source },
      { workspace: latest, sync: values[2].value ? JSON.parse(values[2].value) : defaultSyncState(), source: values[3].value ? JSON.parse(values[3].value) : defaultSource() }) : null;
    review.innerHTML = `<h2>Review newer saved work</h2><p>These changes were saved in another tab. Nothing will be written now. Your form draft will stay available; saving it afterwards replaces the fields you submit. Download the draft first to preserve a non-form action or a completed external result.</p><ul>${changes.map(change => `<li><strong>${escapeHtml(change.label)}</strong>: ${escapeHtml(change.before)} → ${escapeHtml(change.after)}</li>`).join('') || '<li>The saved workspace or connection metadata changed.</li>'}</ul><button type="button" class="secondary" data-keep>Keep editing without saving</button><button type="button" class="primary" data-review>Use latest and keep my form draft</button>`;
    const uncoordinated = reviewSnapshot.committed && JSON.stringify(reviewSnapshot.committed) !== JSON.stringify(values);
    if (uncoordinated) {
      const warning = document.createElement('section');
      const committedText = reviewSnapshot.committed.find(entry => entry.key === storageKey)?.value;
      let differences = [];
      try { differences = describeLocalWorkspaceChanges(importPortableWorkspace(committedText || encodeWorkspaceDocument(emptyOperationWorkspace)), latest); } catch { /* Metadata or recovery-only mismatch. */ }
      warning.innerHTML = `<h3>Stored values differ from the last protected save</h3><p>Another app version, an interrupted save, or a delayed browser update may explain this difference. Choosing the displayed stored values explicitly uses them as your next save's starting point. Keep editing or download your draft if you do not recognize these changes.</p><ul>${differences.map(change => `<li><strong>${escapeHtml(change.label)}</strong>: last protected save ${escapeHtml(change.before)}; displayed stored value ${escapeHtml(change.after)}</li>`).join('') || '<li>Connection or history metadata differs.</li>'}</ul>`;
      review.append(warning);
      review.querySelector('[data-review]').textContent = 'Use displayed stored values and keep my form draft';
    }
    if (pendingExternal) {
      const explanation = document.createElement('p');
      explanation.textContent = `${pendingExternal.label} already completed. Save only its local summary; this will not repeat that action.`;
      review.prepend(explanation);
      const saveSummary = document.createElement('button');
      saveSummary.type = 'button';
      saveSummary.className = 'primary';
      saveSummary.textContent = summaryMerge.clean ? 'Save completed action summary' : 'Use completed action values for listed conflicts';
      if (!summaryMerge.clean) {
        const list = document.createElement('ul');
        for (const entry of summaryMerge.conflicts) {
          const row = document.createElement('li');
          row.textContent = describeLocalWorkspaceChanges(entry.remote, entry.local, [entry.path]).map(change => `${change.label}: latest ${change.before}; completed action ${change.after}`).join(". ") + ". Choosing the completed action values replaces these saved fields.";
          list.append(row);
        }
        review.append(list);
      }
      saveSummary.onclick = async () => {
        if (storageKey !== conflict.storageKey || state.team.active || state.source.type !== sourceType || state.projects?.registry?.activeProjectId !== projectId || values.some(entry => localStorage.getItem(entry.key) !== entry.value)) { review.close(); reportLocalWriteFailure(staleWorkspaceWriteError(), conflict.candidate); return; }
        const approved = summaryMerge.clean ? summaryMerge : resolveWorkspaceConflicts(summaryMerge, Object.fromEntries(summaryMerge.conflicts.map(entry => [entry.path, 'local'])));
        if (!approved.clean) return;
        try {
          await reviewScope.adoptReviewed(reviewSnapshot, () => localWriteScope === reviewScope && storageKey === conflict.storageKey && !state.team.active && state.source.type === sourceType && state.projects?.registry?.activeProjectId === projectId);
          Object.assign(state, latest);
          localCommittedWorkspace = localCanonicalFields();
          const candidate = approved.merged.workspace;
          const sync = approved.merged.sync;
          const source = approved.merged.source;
          await runLocalStorageTransaction([storageKey, activityKey, syncKey, sourceKey], () => {
            localStorage.setItem(storageKey, localWorkspacePayload(candidate));
            localStorage.setItem(activityKey, JSON.stringify({ activity: candidate.activity }));
            localStorage.setItem(syncKey, serializeSync(sync));
            localStorage.setItem(sourceKey, JSON.stringify(normalizeWorkspaceSource(source)));
          }, () => {}, candidate);
          Object.assign(state, candidate);
          state.sync = sync;
          state.source = source;
          state.sourceSelection = sourceSelectionFor(source);
          localCommittedWorkspace = localCanonicalFields();
          state.localExternalEffect = '';
          state.localExternalPendingSync = null;
          state.localExternalSavePending = null;
          state.localWriteConflict = null;
          state.editorAnnouncement = 'Completed action summary saved. The external action was not repeated.';
          review.close(); render(); restoreLocalFormDrafts(forms);
        } catch (error) { review.close(); reportLocalWriteFailure(error, approved.merged.workspace); render(); }
      };
      review.append(saveSummary);
      review.querySelector('[data-review]').hidden = true;
    }
    review.style.cssText = 'width:min(900px,90vw); max-height:85vh; overflow:auto; padding:22px';

    review.querySelector('[data-keep]').onclick = () => review.close();
    review.addEventListener('close', () => review.remove());
    review.querySelector('[data-review]').onclick = async () => {
      if (storageKey !== conflict.storageKey || state.team.active || state.source.type !== sourceType || state.projects?.registry?.activeProjectId !== projectId || values.some(entry => localStorage.getItem(entry.key) !== entry.value)) {
        review.close();
        reportLocalWriteFailure(staleWorkspaceWriteError(), conflict.candidate);
        return;
      }
      try {
        await reviewScope.adoptReviewed(reviewSnapshot, () => localWriteScope === reviewScope && storageKey === conflict.storageKey && !state.team.active && state.source.type === sourceType && state.projects?.registry?.activeProjectId === projectId);
      } catch (error) { review.close(); reportLocalWriteFailure(error, conflict.candidate); return; }
      const experienceDraft = state.experienceDraft;
      Object.assign(state, latest);
      state.experienceDraft = experienceDraft;
      state.sync = loadSync();
      state.source = loadSource();
      localCommittedWorkspace = localCanonicalFields();
      state.localWriteConflict = null;
      review.close();
      render();
      restoreLocalFormDrafts(forms);
      state.editorAnnouncement = 'Latest saved work loaded. Your form draft is retained for review before saving.';
    };
    document.body.append(review);
    review.showModal();
  });
}

async function runLocalStorageTransaction(keys, operation, rollbackMemory = () => {}, candidate = localCanonicalFields()) {
  const scope = localWriteScope;
  const workspaceKey = storageKey;
  try {
    if (!scope) throw staleWorkspaceWriteError();
    const result = await scope.run(keys, operation, rollbackMemory, () => scope === localWriteScope && workspaceKey === storageKey && !state.team.active);
    if (scope === localWriteScope && workspaceKey === storageKey && !state.localExternalSavePending) state.localWriteConflict = null;
    return result;
  } catch (error) {
    if (workspaceKey === storageKey) {
      reportLocalWriteFailure(error, candidate);
      const observed = Object.fromEntries(scope?.values().map(entry => [entry.key, entry.value]) || []);
      try { state.source = observed[sourceKey] ? normalizeWorkspaceSource(JSON.parse(observed[sourceKey])) : defaultSource(); } catch { /* Retain the recoverable source draft. */ }
      try { state.sync = observed[syncKey] ? { ...defaultSyncState(), ...JSON.parse(observed[syncKey]) } : defaultSyncState(); } catch { /* The saved metadata needs recovery. */ }
    }
    throw error;
  }
}

function assertLocalWorkspaceCurrent() {
  if (demoMode || state.team.active) return;
  if (state.localExternalSavePending) throw Object.assign(new Error('An external action already completed, but its local summary is not saved. Review or download that result before starting another action; do not repeat the external operation.'), { code: 'LOCAL_WORKSPACE_CHANGED' });
  try { localWriteScope?.assertCurrent(); if (!localWriteScope) throw staleWorkspaceWriteError(); }
  catch (error) { reportLocalWriteFailure(error, localCanonicalFields()); throw error; }
}

async function runLocalExternalEffect(operation, label) {
  if (demoMode || state.team.active) return operation();
  const scope = localWriteScope, workspaceKey = storageKey;
  assertLocalWorkspaceCurrent();
  let operationStarted = false;
  try {
    const result = await scope.externalEffect(() => {
      operationStarted = true;
      return operation();
    }, () => scope === localWriteScope && storageKey === workspaceKey && !state.team.active);
    if (scope === localWriteScope && storageKey === workspaceKey) state.localExternalEffect = label;
    return result;
  } catch (error) {
    // A rejected external write does not invalidate an already saved local copy.
    if (!operationStarted && storageKey === workspaceKey) reportLocalWriteFailure(error, localCanonicalFields());
    throw error;
  }
}

async function commitLocalWorkspacePatch(patch, entries = [], scope = null) {
  const candidate = { ...localCanonicalFields(), ...patch };
  if (entries.length) candidate.activity = [...entries, ...candidate.activity].slice(0, 250);
  const sync = ['local-file', 'google-drive'].includes(state.source.type) ? { ...state.sync, localPending: true } : state.sync;
  if (!demoMode) {
    const payload = localWorkspacePayload(candidate);
    await runLocalStorageTransaction([storageKey, activityKey, syncKey], () => {
      localStorage.setItem(storageKey, payload);
      localStorage.setItem(activityKey, JSON.stringify({ activity: candidate.activity }));
      if (sync !== state.sync) localStorage.setItem(syncKey, serializeSync(sync));
    }, () => {}, candidate);
  }
  if (scope && !documentArtifactScopeIsCurrent(scope)) throw documentArtifactError("PROJECT_CHANGED", "The original project save completed after the active project changed.");
  Object.assign(state, candidate);
  localCommittedWorkspace = localCanonicalFields();
  state.localExternalEffect = "";
  if (!demoMode) { state.sync = sync; markExternalSourcePending(); }
}

function markExternalSourcePending() {
  if (state.source.type === "local-file") scheduleLinkedWorkspaceWrite();
  if (state.source.type === "google-drive" && state.driveToken) scheduleAutomaticDriveSync();
}
let automaticDriveTimer = 0;
function scheduleAutomaticDriveSync() {
  window.clearTimeout(automaticDriveTimer);
  automaticDriveTimer = window.setTimeout(() => { if (!state.dataBusy && !state.projects?.departurePending && navigator.onLine) void syncDriveNow(); }, 1800);
}
async function logActivity(action, item, changes) {
  if (state.team.active) return;
  await commitLocalWorkspacePatch({}, [createActivityEntry(action, item, changes)]);
}

function formatActivityChanges(changes) { return describeActivityChanges(changes, state); }
function downloadFile(content, type, filename) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }

async function importFromFile(event) {
  const input = event.currentTarget;
  const file = input.files?.[0];
  if (!file || state.dataBusy || state.team.active) return;
  const scope = captureDocumentArtifactScope();
  const captureImportWorkspace = () => {
    const snapshot = JSON.parse(exportPortableWorkspace());
    delete snapshot.exportedAt;
    return snapshot;
  };
  const workspace = captureImportWorkspace();
  const original = JSON.stringify(workspace);
  const importedAt = new Date().toISOString();
  const assertImportScope = () => {
    if (!documentArtifactScopeIsCurrent(scope) || JSON.stringify(captureImportWorkspace()) !== original) {
      throw new Error("The project or its saved work changed after this preview. Cancel and select the file again to review the latest work.");
    }
    assertLocalWorkspaceCurrent();
  };
  let completionFocus = "dataStatus";
  state.dataBusy = true;
  try {
    const text = await file.text();
    assertImportScope();
    const model = parseInboundFile(text, file.name);
    if (model) {
      const result = await reviewInboundImport({ model, workspace, fileName: file.name,
        storage: localStorage, demo: demoMode, trigger: document.querySelector("#importButton"),
        apply: async options => {
          assertImportScope();
          const prepared = buildInboundWorkspace(model, { ...options, workspace, now: importedAt });
          const next = prepared.workspace;
          const activityEntry = createActivityEntry("imported", { title: file.name }, { source: file.name, items: prepared.addedCount, skipped: prepared.skippedCount });
          await replaceWorkspace(next.items, [activityEntry, ...state.activity].slice(0, 250), backupReasons.import, undefined,
            next.organization, next.customerDirectory, next.planningCalendar, next.workflow, next.prioritization,
            next.insightRecords, next.codeRepositories, next.implementationRuns, next.experience, next.artifacts);
          return { addedCount: prepared.addedCount, skippedCount: prepared.skippedCount };
        }
      });
      if (!result) completionFocus = "importButton";
      if (documentArtifactScopeIsCurrent(scope)) state.dataStatus = result
        ? `Stored a recovery snapshot and imported ${file.name}. Added ${result.addedCount} initiatives; skipped ${result.skippedCount}.${result.preferenceWarning}`
        : "Import cancelled. The workspace was not changed.";
      return;
    }
    const prepared = importPortableWorkspace(text);
    const confirmed = await requestDataConfirmation({
      title: "Import workspace data?",
      description: `Import ${file.name} will replace the current workspace data after storing a before-import recovery snapshot.`,
      confirmLabel: "Import File", trigger: document.querySelector("#importButton")
    });
    if (!confirmed) { completionFocus = "importButton"; state.dataStatus = "Import cancelled. The workspace was not changed."; return; }
    assertImportScope();
    const activityEntry = createActivityEntry("imported", { title: file.name }, { source: file.name });
    await replaceWorkspace(prepared.items, [activityEntry, ...prepared.activity].slice(0, 250), backupReasons.import, undefined,
      prepared.organization, prepared.customerDirectory, prepared.planningCalendar, prepared.workflow, prepared.prioritization,
      prepared.insightRecords, prepared.codeRepositories || [], prepared.implementationRuns || [], prepared.experience, prepared.artifacts || []);
    state.dataStatus = `Stored a recovery snapshot and imported ${file.name}.`;
  } catch (error) {
    if (documentArtifactScopeIsCurrent(scope)) state.dataStatus = `Import stopped. ${error.message}`;
  } finally {
    input.value = "";
    state.dataBusy = false;
    if (documentArtifactScopeIsCurrent(scope)) renderAndFocus(completionFocus);
  }
}

function confirmationDialogMarkup() {
  return `<dialog class="confirmation-dialog" id="confirmationDialog" aria-labelledby="confirmationTitle" aria-describedby="confirmationDescription"><form method="dialog"><h3 id="confirmationTitle">Confirm action</h3><p id="confirmationDescription"></p><div class="confirmation-actions"><button class="secondary" id="confirmationSecondary" type="button" hidden></button><button class="secondary" id="confirmationCancel" value="cancel" autofocus>Cancel</button><button class="danger" id="confirmationConfirm" value="confirm">Continue</button></div></form></dialog>`;
}

function requestDataConfirmation({ title, description, confirmLabel, secondaryLabel = "", onSecondary, trigger, scrollable = false }) {
  const dialog = document.querySelector("#confirmationDialog");
  const titleElement = document.querySelector("#confirmationTitle");
  const descriptionElement = document.querySelector("#confirmationDescription");
  const cancelButton = document.querySelector("#confirmationCancel");
  const confirmButton = document.querySelector("#confirmationConfirm");
  const secondaryButton = document.querySelector("#confirmationSecondary");
  if (!dialog || !titleElement || !descriptionElement || !cancelButton || !confirmButton) return Promise.resolve(false);
  descriptionElement.classList.toggle("scrollable-import-preview", scrollable);
  descriptionElement.tabIndex = scrollable ? 0 : -1;
  return requestNativeConfirmation({ dialog, titleElement, descriptionElement, cancelButton, confirmButton, secondaryButton, trigger, title, description, confirmLabel, secondaryLabel, onSecondary });
}

function announceDataStatus(message, focus = true) {
  state.dataStatus = message;
  const status = document.querySelector("#dataStatus");
  if (status) {
    status.textContent = message;
    if (focus) status.focus();
  }
}

function renderAndFocus(id) {
  render();
  document.querySelector(`#${id}`)?.focus();
}
function experienceHas(capabilityId, experience = state.experience) { return policyExperienceHas(experience, capabilityId); }
function enabledViewDefinitions() { return policyEnabledViewDefinitions(state.experience, VIEW_REGISTRY); }
function visibleViewDefinition(deepLink) { return policyVisibleViewDefinition(deepLink, enabledViewDefinitions()); }
function viewLabel(view) { return policyViewLabel(view); }
function shellViewLabel(view) { return viewLabel(viewByDeepLink.get(policyShellParentView(view.id))); }
function allowedModes(space, experience = state.experience) { return policyAllowedModes(space, experience); }
function enabledTutorialGroups() {
  return TUTORIAL_GROUPS.map((group) => ({
    ...group,
    steps: group.steps.filter((step) => allowedModes(step.space).includes(step.mode))
  })).filter((group) => group.steps.length > 0);
}
function enabledTutorialGroup(groupId) {
  return enabledTutorialGroups().find((group) => group.id === groupId) || null;
}
function nearestCoreView(space) { return policyNearestCoreView(space); }
function recoverUnavailableRoute() {
  if (!visibleViewDefinition(state.selectedView)) {
    const requested = state.selectedView;
    const known = viewByDeepLink.has(requested) && allowedModes(requested, fullWorkspaceExperience()).includes(state.selectedMode);
    state.selectedView = nearestCoreView(requested);
    state.selectedMode = defaultSpaceMode(state.selectedView);
    state.routeAnnouncement = known
      ? `${titleCase(requested)} is hidden in this workspace. Showing ${viewLabel(visibleViewDefinition(state.selectedView))}; enable it in Workspace setup.`
      : `This link points to an unknown page or view. Showing ${viewLabel(visibleViewDefinition(state.selectedView))}. Check the link or choose a view from the navigation.`;
    pushViewUrl(true);
    return;
  }
  const modes = allowedModes(state.selectedView);
  if (!modes.includes(state.selectedMode)) {
    const requested = state.selectedMode;
    state.selectedMode = defaultSpaceMode(state.selectedView);
    state.spaceModes[state.selectedView] = state.selectedMode;
    state.routeAnnouncement = allowedModes(state.selectedView, fullWorkspaceExperience()).includes(requested)
      ? `${titleCase(requested)} is hidden in this workspace. Showing ${titleCase(state.selectedMode)}; enable it in Workspace setup.`
      : `This link points to an unknown view. Showing ${titleCase(state.selectedMode)}. Check the link or choose a view from the navigation.`;
    pushViewUrl(true);
  }
}
function defaultSpaceMode(space, experience = state.experience) { return policyDefaultSpaceMode(space, experience); }
function initialView() {
  const params = new URLSearchParams(location.search);
  const space = params.get("space");
  if (space !== null) return space;
  return LEGACY_VIEW_REDIRECTS[params.get("view")]?.[0] || params.get("view") || (!params.has("space") && !params.has("view") ? activeRegistryProject(projectRegistry)?.location.space : "") || "today";
}
function initialMode() {
  const params = new URLSearchParams(location.search);
  const initialSpace = initialView();
  return params.get("mode") || LEGACY_VIEW_REDIRECTS[params.get("view")]?.[1] || (!params.has("space") && !params.has("view") ? activeRegistryProject(projectRegistry)?.location.mode : "") || ({ today: "focus", initiatives: "list", insights: "discovery", planning: "quarter", delivery: "board", briefings: "executive", team: "organization", settings: "setup" })[initialSpace] || "focus";
}
function initialInitiative() { return new URLSearchParams(location.search).get("initiative")?.trim() || ""; }
function captureProjectLocation() {
  const period = normalizePeriodSelection(state.periodSelection, state.planningCalendar);
  return normalizeProjectLocation({
    space: state.selectedView, mode: state.selectedMode, period: period.kind, periodStart: period.startDate,
    boardTeam: state.boardTeamId, boardStage: state.mobileBoardStatusId,
    customerView: state.customerView, customerId: state.selectedCustomerId, segmentId: state.selectedSegmentId,
    initiative: state.initiativeDetail.selectedId, section: state.initiativeDetail.focusSection, record: state.initiativeDetail.focusRecordId,
    insightId: state.insightEditor.mode === "view" ? state.insightEditor.selectedId : "", insightStatus: state.insightStatusFilter,
    orgUnitId: state.selectedOrgUnitId, personId: state.selectedPersonId, specId: state.selectedSpecId
  });
}

function persistCurrentProjectLocation() {
  if (!state.projects?.persistent || (state.team.active && !state.team.projectId)) return;
  try {
    projectRegistry = updateActiveProjectLocation(localStorage, state.projects.registry, captureProjectLocation());
    state.projects.registry = projectRegistry;
  } catch { /* Navigation remains usable when location metadata cannot be saved. */ }
}

function captureRegisteredProjectLocation() {
  return state.team.active && !state.team.projectId ? state.team.returnState?.location || activeRegistryProject(state.projects?.registry)?.location : captureProjectLocation();
}

function restoreProjectLocation(value) {
  const saved = normalizeProjectLocation(value);
  state.selectedView = visibleViewDefinition(saved.space) ? saved.space : "today";
  state.selectedMode = allowedModes(state.selectedView).includes(saved.mode) ? saved.mode : defaultSpaceMode(state.selectedView);
  state.spaceModes[state.selectedView] = state.selectedMode;
  state.periodSelection = normalizePeriodSelection({ kind: saved.period, startDate: saved.periodStart }, state.planningCalendar);
  state.boardTeamId = ["all", "unassigned"].includes(saved.boardTeam) || state.organization.units.some(({ id }) => id === saved.boardTeam) ? saved.boardTeam : "all";
  state.mobileBoardStatusId = state.workflow.statuses.some(({ id }) => id === saved.boardStage) ? saved.boardStage : "";
  state.customerView = saved.customerView || "accounts";
  state.selectedCustomerId = state.customerDirectory.accounts.some(({ id }) => id === saved.customerId) ? saved.customerId : "";
  state.selectedSegmentId = state.customerDirectory.segments.some(({ id }) => id === saved.segmentId) ? saved.segmentId : "";
  state.selectedOrgUnitId = state.organization.units.some(({ id }) => id === saved.orgUnitId) ? saved.orgUnitId : "";
  state.selectedPersonId = state.organization.people.some(({ id }) => id === saved.personId) ? saved.personId : "";
  state.selectedSpecId = state.items.some(({ id }) => id === saved.specId) ? saved.specId : "";
  state.insightStatusFilter = validInsightStatus(saved.insightStatus);
  const item = state.items.find(({ id }) => id === saved.initiative);
  state.initiativeDetail = item ? revealFocusedInitiativeRecord(createInitiativeDetailState({
    selectedId: item.id, focusSection: saved.section || "", focusRecordId: saved.record || ""
  }), item) : createInitiativeDetailState();
  const insight = restoreInsightSelection(saved.insightId);
  const missingNestedRecord = saved.record && ![...(item?.risks || []), ...(item?.dependencies || [])].some(({ id }) => id === saved.record);
  if ((saved.initiative && !item) || (saved.insightId && !insight) || missingNestedRecord) {
    state.initiativeDetail = createInitiativeDetailState();
    state.insightEditor = createInsightEditorState();
    state.selectedView = "today"; state.selectedMode = "focus";
    state.routeAnnouncement = "The saved record is no longer available. Showing Today.";
  }
}

function validInsightStatus(value) {
  return Object.values(INSIGHT_STATUSES).some((statuses) => statuses.includes(value)) ? value : "";
}

function restoreInsightSelection(id) {
  const record = state.insightRecords.find((entry) => entry.id === id);
  state.insightEditor = record ? createInsightEditorState({ mode: "view", selectedId: record.id, type: record.type }) : createInsightEditorState();
  return record;
}

function pushViewUrl(replace = false) {
  const url = new URL(location.href);
  const activeProjectId = state.projects?.registry.activeProjectId || "";
  if (activeProjectId) url.searchParams.set("project", activeProjectId);
  else url.searchParams.delete("project");
  url.searchParams.set("space", state.selectedView);
  url.searchParams.set("mode", state.selectedMode);
  const periodSelection = normalizePeriodSelection(state.periodSelection, state.planningCalendar);
  url.searchParams.set("period", periodSelection.kind);
  if (periodSelection.startDate) url.searchParams.set("periodStart", periodSelection.startDate);
  else url.searchParams.delete("periodStart");
  url.searchParams.delete("view");
  url.searchParams.delete("experience");
  if (state.selectedView === "insights" && state.selectedMode === "customers") {
    url.searchParams.set("customerView", state.customerView);
    if (state.selectedCustomerId && state.customerView === "accounts") url.searchParams.set("customerId", state.selectedCustomerId);
    else url.searchParams.delete("customerId");
    if (state.selectedSegmentId && state.customerView === "segments") url.searchParams.set("segmentId", state.selectedSegmentId);
    else url.searchParams.delete("segmentId");
  } else {
    url.searchParams.delete("customerView");
    url.searchParams.delete("customerId");
    url.searchParams.delete("segmentId");
  }
  if (state.selectedView === "initiatives" && state.selectedMode === "board") {
    url.searchParams.set("boardTeam", selectedBoardTeamId());
    if (state.mobileBoardStatusId) url.searchParams.set("boardStage", state.mobileBoardStatusId);
  } else {
    url.searchParams.delete("boardTeam");
    url.searchParams.delete("boardStage");
  }
  if (demoMode) url.searchParams.set("demo", "1");
  for (const [key, value] of Object.entries({ initiative: state.initiativeDetail.selectedId, section: state.initiativeDetail.focusSection, record: state.initiativeDetail.focusRecordId,
    insightId: state.insightEditor.mode === "view" ? state.insightEditor.selectedId : "", insightStatus: state.selectedView === "insights" ? state.insightStatusFilter : "",
    orgUnitId: state.selectedView === "team" ? state.selectedOrgUnitId : "", personId: state.selectedView === "team" ? state.selectedPersonId : "",
    specId: state.selectedMode === "specs" ? state.selectedSpecId : "" })) {
    if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
  }
  persistCurrentProjectLocation();
  history[replace ? "replaceState" : "pushState"]({ space: state.selectedView, mode: state.selectedMode, project: activeProjectId }, "", url);
}
function selectedViewDefinition() { return visibleViewDefinition(state.selectedView) || viewByDeepLink.get("today"); }
function navButton(view) {
  const active = policyShellParentView(state.selectedView) === view.id;
  return `<button class="${active ? "active" : ""}" data-view="${escapeHtml(view.deepLink)}" data-view-id="${escapeHtml(view.id)}" type="button"${active ? ' aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${spaceIcon(view.id)}</span><span>${escapeHtml(viewLabel(view))}</span></button>`;
}
function navigationMarkup() {
  const views = policySimpleNavigationViewDefinitions(VIEW_REGISTRY);
  return `<div class="nav-primary core-nav" role="group" aria-label="Primary workspace areas">${views.slice(0, 3).map(navButton).join("")}</div><div class="nav-secondary" role="group" aria-label="Workspace administration">${views.slice(3).map(navButton).join("")}</div>`;
}
function weeklyLoopMarkup() {
  const loop = [{ label: "Capture", deepLink: "today", mode: "actions" }, { label: "Prioritize", deepLink: "initiatives", mode: "priorities" }, { label: "Next steps", deepLink: "initiatives", mode: "list" }, { label: "Update", deepLink: "today", mode: "focus" }];
  const steps = loop.map((step) => `<button type="button" data-weekly-view="${escapeHtml(step.deepLink)}" data-weekly-mode="${escapeHtml(step.mode)}"${state.selectedView === step.deepLink && state.selectedMode === step.mode ? ' aria-current="page"' : ""}>${escapeHtml(step.label)}</button>`).join("");
  return `<nav class="weekly-loop" aria-label="Weekly loop"><span>Weekly loop</span>${steps}</nav>`;
}
function periodRequestInvalid(params, calendar) { return policyPeriodRequestInvalid(params, calendar); }
function handleViewsEscape(event) {
  if (state.tutorial.surface !== "closed" || state.modeChoiceOpen) return;
  if (event.key !== "Escape" || !window.matchMedia("(max-width: 1100px)").matches) return;
  if (event.defaultPrevented || document.querySelector("dialog[open]")) return;
  const viewsNav = document.querySelector("#workspaceViews");
  const viewsToggle = document.querySelector("#viewsToggle");
  if (!viewsNav?.classList.contains("open")) return;
  event.preventDefault();
  viewsNav.classList.remove("open");
  viewsToggle?.setAttribute("aria-expanded", "false");
  viewsToggle?.focus();
}
function navigateToView(deepLink, origin, requestedMode = "") {
  state.routeAnnouncement = "";
  let nextView = visibleViewDefinition(deepLink);
  if (!nextView) {
    const recovered = nearestCoreView(deepLink);
    nextView = visibleViewDefinition(recovered) || viewByDeepLink.get("today");
    state.routeAnnouncement = `${titleCase(deepLink)} is hidden in this workspace. Showing ${viewLabel(nextView)}; enable it in Workspace setup.`;
  }
  const changed = state.selectedView !== nextView.deepLink;
  const previousMode = state.selectedMode;
  state.selectedView = nextView.deepLink;
  const candidateMode = requestedMode || state.spaceModes[nextView.deepLink] || defaultSpaceMode(nextView.deepLink);
  state.selectedMode = allowedModes(nextView.deepLink).includes(candidateMode) ? candidateMode : defaultSpaceMode(nextView.deepLink);
  const modeChanged = previousMode !== state.selectedMode;
  state.spaceModes[nextView.deepLink] = state.selectedMode;
  if (changed) {
    state.query = "";
    recordViewUsage(nextView.deepLink);
  }
  if (changed || modeChanged) {
    pushViewUrl();
  }
  render();
  if (changed) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  const compactNavigation = window.matchMedia("(max-width: 1100px)").matches;
  const focusTarget = origin === "sidebar"
    ? compactNavigation ? document.querySelector("#viewsToggle") : document.querySelector(`[data-view="${policyShellParentView(nextView.id)}"]`)
    : document.querySelector("#viewTitle");
  focusTarget?.focus();
}
async function restoreViewFromLocation() {
  if (state.projects?.archivedLinkPending) {
    document.querySelector("#confirmationDialog")?.close("cancel");
    return;
  }
  const params = new URLSearchParams(location.search);
  const projectId = params.get("project")?.trim() || "";
  const switchingProject = state.projects && projectId && projectId !== state.projects.registry.activeProjectId;
  if (switchingProject) {
    const target = registryProjectById(state.projects.registry, projectId);
    if (!target) { state.projects.status = "This project link is unavailable on this device. Your current project remains open."; pushViewUrl(true); render(); return; }
    if (target.archivedAt && !await reopenArchivedProjectLink(target)) return;
    const opened = target.provider === "server"
      ? await stageServerProjectSwitch(projectId, { replaceUrl: true })
      : await stageLocalProjectSwitch(projectId, { replaceUrl: true });
    if (!opened) { pushViewUrl(true); return; }
    if (!params.has("space") && !params.has("view")) return;
  }
  const legacy = LEGACY_VIEW_REDIRECTS[params.get("view")];
  const requestedSpace = params.get("space") ?? legacy?.[0] ?? params.get("view") ?? "today";
  const nextView = viewByDeepLink.get(requestedSpace) || { deepLink: requestedSpace };
  const nextMode = params.get("mode") || legacy?.[1] || defaultSpaceMode(nextView.deepLink);
  const selectedId = params.get("initiative")?.trim() || "";
  const focusSection = ["risks", "dependencies"].includes(params.get("section")) ? params.get("section") : "";
  const focusRecordId = params.get("record")?.trim() || "";
  const changed = state.selectedView !== nextView.deepLink;
  state.selectedView = nextView.deepLink;
  state.selectedMode = nextMode;
  state.routeAnnouncement = "";
  state.periodSelection = normalizePeriodSelection(params, state.planningCalendar);
  state.periodAnnouncement = periodRequestInvalid(params, state.planningCalendar) ? "That timeline selection is invalid or unavailable. Showing All time." : "";
  state.customerView = params.get("customerView") || state.customerView || "accounts";
  state.selectedCustomerId = params.get("customerId") || "";
  state.selectedSegmentId = params.get("segmentId") || "";
  state.selectedOrgUnitId = params.get("orgUnitId") || "";
  state.selectedPersonId = params.get("personId") || "";
  state.selectedSpecId = params.get("specId") || "";
  state.insightStatusFilter = validInsightStatus(params.get("insightStatus"));
  if (!state.insightEditor.mode || state.insightEditor.mode === "view") restoreInsightSelection(params.get("insightId"));
  state.boardTeamId = params.get("boardTeam") || "all";
  state.mobileBoardStatusId = params.get("boardStage") || state.mobileBoardStatusId;
  state.initiativeDetail = revealFocusedInitiativeRecord(createInitiativeDetailState({
    selectedId,
    focusSection,
    focusRecordId,
    triggerId: history.state?.detailTriggerId || "",
    historyOwned: Boolean(selectedId && history.state?.detailOpenedFromUi)
  }), state.items.find((item) => item.id === selectedId));
  recoverUnavailableRoute();
  state.spaceModes[state.selectedView] = state.selectedMode;
  if (switchingProject) pushViewUrl(true);
  else persistCurrentProjectLocation();
  if (changed) {
    state.query = "";
    recordViewUsage(state.selectedView);
  }
  render();
  if (changed) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  const returnFocusId = !selectedId ? pendingInitiativeDetailReturnFocusId : "";
  pendingInitiativeDetailReturnFocusId = "";
  focusAfterRender(selectedId
    ? focusRecordId ? `initiative-record-${elementIdToken(focusRecordId)}` : focusSection ? `initiative-${focusSection}` : "initiativeDetailTitle"
    : returnFocusId || "viewTitle");
}

async function reopenArchivedProjectLink(project) {
  const ui = state.projects;
  const requestedUrl = location.href;
  ui.archivedLinkPending = true;
  let confirmed = false;
  try {
    // Let any restored record dialog open before placing this decision on top.
    await Promise.resolve();
    confirmed = await requestDataConfirmation({
      title: "Project is archived",
      description: `${project.name} is archived on this device. Unarchive it to open it again. Your current project stays open until the destination is ready.`,
      confirmLabel: "Unarchive and open",
      trigger: document.querySelector("#projectSwitcherButton, #mobileProjectSwitcherButton")
    });
    if (confirmed && location.href === requestedUrl) {
      projectRegistry = setProjectArchived(localStorage, ui.registry, project.id, false);
      ui.registry = projectRegistry;
    }
  } catch (error) {
    ui.status = error.message || "The project could not be unarchived.";
    confirmed = false;
  } finally {
    ui.archivedLinkPending = false;
  }
  if (location.href !== requestedUrl) {
    void restoreViewFromLocation();
    return false;
  }
  if (!confirmed) {
    pushViewUrl(true);
    render();
    document.querySelector(window.matchMedia("(max-width: 1100px)").matches ? "#mobileProjectSwitcherButton" : "#projectSwitcherButton")?.focus();
  }
  return confirmed;
}
function spaceIcon(space) {
  return ({ today: "⌁", initiatives: "▤", insights: "◌", planning: "◇", delivery: "→", briefings: "▱", team: "◎", settings: "⚙" })[space] || "·";
}
function loadUsage() {
  if (demoMode) return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(usageKey) || "{}");
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return {};
    const views = parsed.schema === "pm-os.usage.v2" && parsed.views && !Array.isArray(parsed.views) && typeof parsed.views === "object"
      ? parsed.views
      : !("schema" in parsed) && !("views" in parsed) ? parsed : {};
    return Object.fromEntries(VIEW_REGISTRY.flatMap((view) => {
      const count = views[view.deepLink];
      return Number.isSafeInteger(count) && count > 0 ? [[view.deepLink, count]] : [];
    }));
  } catch {
    return {};
  }
}
function recordViewUsage(deepLink) {
  if (demoMode || !viewByDeepLink.has(deepLink)) return;
  const current = Number.isSafeInteger(state.usage[deepLink]) ? state.usage[deepLink] : 0;
  state.usage = { ...state.usage, [deepLink]: Math.min(Number.MAX_SAFE_INTEGER, current + 1) };
  try { localStorage.setItem(usageKey, JSON.stringify({ schema: "pm-os.usage.v2", views: state.usage })); } catch { /* Usage measurement never blocks the workspace. */ }
}
function usageSummaryMarkup() {
  if (demoMode) return `<p class="usage-empty">Measurement is off in demo mode.</p>`;
  const visited = VIEW_REGISTRY.filter((view) => Number.isSafeInteger(state.usage[view.deepLink]) && state.usage[view.deepLink] > 0);
  if (!visited.length) return `<p class="usage-empty">No local view counts yet.</p>`;
  const total = visited.reduce((sum, view) => sum + state.usage[view.deepLink], 0);
  const rows = visited.map((view) => `<div data-usage-view="${escapeHtml(view.deepLink)}"><dt>${escapeHtml(view.label)}</dt><dd>${state.usage[view.deepLink]}</dd></div>`).join("");
  return `<dl class="usage-summary"><div class="usage-total"><dt>Total</dt><dd>${total}</dd></div>${rows}</dl>`;
}
function resetUsage() {
  if (demoMode) return;
  state.usage = {};
  try { localStorage.removeItem(usageKey); } catch { /* Reset remains limited to in-memory counts if storage is unavailable. */ }
  render();
  document.querySelector("#resetUsageButton")?.focus();
  const status = document.querySelector("#usageStatus");
  if (status) status.textContent = "Usage counts reset.";
}
function numberOrDefault(value, fallback) { const normalized = String(value ?? "").trim(); return normalized === "" ? fallback : Number(normalized); }
function confidencePercent(value) { return Math.round(numberOrDefault(value, 0.7) * 100); }
function titleCase(value) { return String(value || "").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function scopeGeneratedText(text, items) {
  const label = periodSelectionLabel(state.periodSelection, state.planningCalendar);
  const range = periodSelectionRangeLabel(state.periodSelection, state.planningCalendar);
  const count = Array.isArray(items) ? items.length : 0;
  return `Scope: ${label} | ${range} | ${count} initiative${count === 1 ? "" : "s"}\n\n${String(text || "")}

${workflowReportingNote(items, state.workflow)}`;
}
function decorateInitiativeAudiences(items) {
  return items.map((item) => {
    const resolved = resolveInitiativeAudience(item, state.customerDirectory);
    const audienceSegments = resolved.segmentIds.map((id) => state.customerDirectory.segments.find((segment) => segment.id === id)?.name).filter(Boolean);
    return { ...item, customer: customerDisplayProjection(item, state.customerDirectory), audienceSegments };
  });
}
function decorateWorkspacePriorities(items) {
  const framework = priorityFrameworkForId(state.prioritization, state.prioritization.defaultFrameworkId);
  const ordinal = new Map((framework.id === "manual" || framework.id === "levels" ? prioritizeConfiguredItems(items, state.prioritization) : []).map((item, index, ranked) => [item.id, ranked.length - index]));
  return items.map((item) => {
    const score = priorityScore(item, framework, state.prioritization);
    return { ...item, configuredPriorityScore: score.complete ? ordinal.get(item.id) ?? score.value : null, configuredPriorityLabel: framework.name };
  });
}
function workspacePriorityForItem(item) {
  const framework = priorityFrameworkForId(state.prioritization, state.prioritization.defaultFrameworkId);
  return priorityScore(item, framework, state.prioritization);
}
function initiativeTargetChips(item, limit = 4) {
  const labels = initiativeAudienceLabels(item, state.customerDirectory);
  const targets = [...labels.segments.map((label) => ({ label, kind: "segment" })), ...labels.accounts.map((label) => ({ label, kind: "account" }))];
  if (!targets.length) return item.customer?.trim()
    ? `<span>${escapeHtml(item.customer)}</span> <span class="muted">(audience text; not linked)</span>`
    : `<span class="muted">No customer targets</span>`;
  const shown = targets.slice(0, limit);
  return `<span class="target-chip-list">${shown.map((target) => `<span class="target-chip ${target.kind}">${escapeHtml(target.label)}</span>`).join("")}${targets.length > shown.length ? `<span class="target-chip more">+${targets.length - shown.length}</span>` : ""}</span>`;
}
function initiativeStatusLabel(item) { return statusForInitiative(state.workflow, item).name; }
function groupByInitiativeWorkflow(items) {
  const groups = new Map(state.workflow.statuses.map((status) => [status.id, { status, items: [] }]));
  for (const item of items) {
    const status = statusForInitiative(state.workflow, item);
    if (!groups.has(status.id)) groups.set(status.id, { status, items: [] });
    groups.get(status.id).items.push(item);
  }
  return [...groups.values()];
}
function initiativeCountLabel(count) { return `${count} ${count === 1 ? "initiative" : "initiatives"}`; }
function metric(label, value, explanation = "") { return `<article class="metric"><span>${label}</span><strong>${value}</strong>${explanation ? `<small>${escapeHtml(explanation)}</small>` : ""}</article>`; }
function statusOptions(selected) { return state.workflow.statuses.map((status) => `<option value="${escapeHtml(status.id)}" ${status.id === selected ? "selected" : ""}>${escapeHtml(status.name)}</option>`).join(""); }
function effortOptions(selected) { return Object.entries(effortLabels).map(([value, label]) => `<option value="${value}" ${Number(value) === Number(selected) ? "selected" : ""}>${label}</option>`).join(""); }
function emptyState(text) { return `<p class="empty">${text}</p>`; }
function todayStamp() { return localDateStamp(); }
function cssEscape(value) { return globalThis.CSS?.escape ? globalThis.CSS.escape(String(value)) : String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&"); }
function escapeHtml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
