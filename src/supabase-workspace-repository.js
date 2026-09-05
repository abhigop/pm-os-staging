import {
  TeamWorkspaceService,
  WORKSPACE_CONFLICT_STRATEGIES,
  WORKSPACE_REPOSITORY_ERROR_CODES,
  WorkspaceRepository,
  WorkspaceRepositoryError,
  createWorkspaceOpenResult,
  createWorkspaceRepositoryCapabilities,
  immutableWorkspaceValue
} from "./workspace-contract.js";
import {
  WORKSPACE_MUTABLE_INSIGHT_FIELDS,
  WORKSPACE_MUTABLE_ITEM_FIELDS,
  decodeWorkspaceDocument,
  encodeWorkspaceDocument
} from "./workspace-document.js";
import { normalizeOrganization } from "./organization.js";
import { CustomerDirectoryError, normalizeCustomerDirectory } from "./customers.js";
import { InitiativeWorkflowError, normalizeInitiativeWorkflow } from "./workflow.js";
import { PrioritizationError, normalizePrioritization } from "./prioritization.js";
import { PlanningCalendarError, normalizePlanningCalendar } from "./planning-calendar.js";
import { WorkspaceExperienceError, normalizeWorkspaceExperience } from "./experience.js";

export const SUPABASE_WORKSPACE_PROVIDER_ID = "supabase";
export const SUPABASE_WORKSPACE_CAPABILITIES = createWorkspaceRepositoryCapabilities({
  offline: false,
  offlineCache: false,
  realtime: true,
  membership: true,
  conflictStrategy: WORKSPACE_CONFLICT_STRATEGIES.OPTIMISTIC_VERSION,
  optimisticConcurrency: true,
  remoteSync: true,
  writerMode: "multi"
});

const roles = new Set(["owner", "editor", "viewer"]);
const realtimeFailureStates = new Set(["CHANNEL_ERROR", "CLOSED", "TIMED_OUT"]);
const defaultReconnectDelays = Object.freeze([0, 250, 1000, 3000]);
const MAX_ITEM_PAYLOAD_BYTES = 32768;
const MAX_INSIGHT_PAYLOAD_BYTES = 32768;
const MAX_ACTIVITY_PAYLOAD_BYTES = 32768;
const MAX_ORGANIZATION_PAYLOAD_BYTES = 262144;
const MAX_CUSTOMER_DIRECTORY_PAYLOAD_BYTES = 4 * 1024 * 1024;
const MAX_WORKFLOW_PAYLOAD_BYTES = 65536;
const MAX_PRIORITIZATION_PAYLOAD_BYTES = 65536;
const MAX_PLANNING_CALENDAR_PAYLOAD_BYTES = 8192;
const MAX_EXPERIENCE_PAYLOAD_BYTES = 8192;
const MAX_SNAPSHOT_BYTES = 16 * 1024 * 1024;
const MAX_WORKSPACE_ITEMS = 1000;
const MAX_WORKSPACE_INSIGHTS = 5000;
const MAX_WORKSPACE_ACTIVITY = 10000;
const itemTextLimits = Object.freeze({
  id: 200,
  title: 500,
  customer: 300,
  problem: 8000,
  owner: 200,
  status: 40,
  statusId: 64,
  startDate: 40,
  dueDate: 40,
  nextStep: 8000,
  experiment: 8000,
  decision: 8000,
  pocPersonId: 200,
  orgUnitId: 200
});

/** Multi-writer Supabase repository with server-authoritative snapshots. */
export class SupabaseWorkspaceRepository extends WorkspaceRepository {
  constructor(options = {}) {
    super(SUPABASE_WORKSPACE_CAPABILITIES, SUPABASE_WORKSPACE_PROVIDER_ID);
    this.client = requireClient(options.client, this.providerId, "constructor");
    this.workspaceId = requiredIdentity(options.workspaceId, this.providerId, "constructor", "workspace");
    this._now = options.now || options.clock || (() => new Date());
    this._idFactory = typeof options.idFactory === "function" ? options.idFactory : defaultIdFactory;
    this._schedule = typeof options.schedule === "function" ? options.schedule : defaultSchedule;
    this._setTimer = typeof options.setTimer === "function" ? options.setTimer : setTimeout;
    this._clearTimer = typeof options.clearTimer === "function" ? options.clearTimer : clearTimeout;
    this._reconnectDelays = normalizeReconnectDelays(options.reconnectDelays);
    this._subscribeTimeoutMs = positiveInteger(options.subscribeTimeoutMs, 10000);
    this._onSubscriberError = typeof options.onSubscriberError === "function"
      ? options.onSubscriberError
      : null;
    this._onRealtimeError = typeof options.onRealtimeError === "function"
      ? options.onRealtimeError
      : null;
    this._onConnectionStateChange = typeof options.onConnectionStateChange === "function"
      ? options.onConnectionStateChange
      : null;
    this._onOperationError = typeof options.onOperationError === "function"
      ? options.onOperationError
      : null;
    this._connected = false;
    this._connectPromise = null;
    this._state = "disconnected";
    this._role = "viewer";
    this._snapshot = null;
    this._revision = -1;
    this._listeners = new Set();
    this._channel = null;
    this._channelGeneration = 0;
    this._channelLive = false;
    this._handshaking = false;
    this._reconnectAttempt = 0;
    this._reconnectTimer = null;
    this._pendingRevision = -1;
    this._forceResync = false;
    this._resyncScheduled = false;
    this._resyncPromise = null;
    this._retryMutations = new Map();
    this._createAttempts = new Map();
    this._generation = 0;
    this._extension = supabaseExtension(this);
  }

  get connected() { return this._connected; }
  get connectionState() { return this._state; }
  get revision() { this._assertConnected("open"); return this._revision; }

  connect() { return this._withAsyncContext("connect", () => this._connect()); }
  open() { return this._withAsyncContext("open", () => this._open()); }
  subscribe(listener) { return this._withContext("subscribe", () => this._subscribe(listener)); }
  createItem(input) { return this._withAsyncContext("createItem", () => this._createItem(input)); }
  createInsightRecord(input) {
    return this._withAsyncContext("createInsightRecord", () => this._createInsightRecord(input));
  }
  updateItem(id, patch, expectedVersion) {
    return this._withAsyncContext("updateItem", () => this._updateItem(id, patch, expectedVersion));
  }
  updateInsightRecord(id, patch, expectedVersion) {
    return this._withAsyncContext(
      "updateInsightRecord",
      () => this._updateInsightRecord(id, patch, expectedVersion)
    );
  }
  updateExperience(input, expectedVersion) {
    return this._withAsyncContext("updateExperience", () => this._updateExperience(input, expectedVersion));
  }
  updateOrganization(input, expectedVersion) {
    return this._withAsyncContext(
      "updateOrganization",
      () => this._updateOrganization(input, expectedVersion)
    );
  }
  updateCustomerDirectory(input, expectedVersion) {
    return this._withAsyncContext(
      "updateCustomerDirectory",
      () => this._updateCustomerDirectory(input, expectedVersion)
    );
  }
  updateWorkflow(input, expectedVersion) {
    return this._withAsyncContext("updateWorkflow", () => this._updateWorkflow(input, expectedVersion));
  }
  updatePrioritization(input, expectedVersion) {
    return this._withAsyncContext("updatePrioritization", () => this._updatePrioritization(input, expectedVersion));
  }
  updatePlanningCalendar(input, expectedVersion) {
    return this._withAsyncContext(
      "updatePlanningCalendar",
      () => this._updatePlanningCalendar(input, expectedVersion)
    );
  }
  deleteItem(id, expectedVersion) {
    return this._withAsyncContext("deleteItem", () => this._deleteItem(id, expectedVersion));
  }
  deleteInsightRecord(id, expectedVersion) {
    return this._withAsyncContext(
      "deleteInsightRecord",
      () => this._deleteInsightRecord(id, expectedVersion)
    );
  }
  appendActivity(entry) {
    return this._withAsyncContext("appendActivity", () => this._appendActivity(entry));
  }
  exportSnapshot(options) {
    return this._withContext("exportSnapshot", () => this._exportSnapshot(options));
  }
  disconnect() { return this._withAsyncContext("disconnect", () => this._disconnect()); }

  async _connect() {
    if (this._connected && this._state === "ready" && this._channelLive) return this;
    if (this._connectPromise) return this._connectPromise;
    this._setState("connecting");
    const generation = this._generation;
    this._connectPromise = (async () => {
      await this._requireAuthenticatedUser("connect");
      const data = await this._rpc("pm_open_workspace", {
        p_workspace_id: this.workspaceId
      }, "connect");
      if (generation !== this._generation) {
        throw this._error(
          WORKSPACE_REPOSITORY_ERROR_CODES.NOT_CONNECTED,
          "connect",
          "The Supabase workspace connection was cancelled."
        );
      }
      this._acceptEnvelope(data, "connect", false);
      this._connected = true;
      await this._establishRealtime(generation, "connect");
      return this;
    })();
    try {
      return await this._connectPromise;
    } catch (error) {
      this._setState("disconnected");
      if (this._connected && generation === this._generation
        && !isAccessBoundaryError(error)) this._scheduleReconnect();
      throw error;
    } finally {
      this._connectPromise = null;
    }
  }

  async _open() {
    if (!this._connected) await this.connect();
    return createWorkspaceOpenResult({
      providerId: this.providerId,
      workspaceId: this.workspaceId,
      role: this._role,
      capabilities: this.capabilities,
      snapshot: this._snapshot,
      extension: this._extension
    });
  }

  _subscribe(listener) {
    this._assertConnected("subscribe");
    if (typeof listener !== "function") {
      throw this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT,
        "subscribe",
        "Workspace subscription listener must be a function."
      );
    }
    this._listeners.add(listener);
    this._deliver(listener, this._snapshot);
    let active = true;
    return () => {
      if (!active) return false;
      active = false;
      return this._listeners.delete(listener);
    };
  }

  async _createItem(input) {
    this._assertWritable("createItem");
    const suppliedItem = pickItemInput(input, true, this.providerId, "createItem");
    const intent = pickItemInput(input, false, this.providerId, "createItem");
    const suppliedAttemptId = optionalAttemptIdentity(
      input,
      this.providerId,
      "createItem"
    );
    const attemptKey = suppliedAttemptId
      ? `id:${suppliedAttemptId}`
      : `intent:${canonicalStringify(intent)}`;
    let attempt = this._createAttempts.get(attemptKey);
    if (!attempt) {
      attempt = {
        item: immutableWorkspaceValue(suppliedItem),
        mutationId: suppliedAttemptId || this._newMutationId("createItem")
      };
      this._createAttempts.set(attemptKey, attempt);
    }
    const parameters = {
      p_workspace_id: this.workspaceId,
      p_item: attempt.item
    };
    try {
      const result = await this._executeMutation(
        "createItem",
        "pm_create_item",
        parameters,
        (envelope) => itemMutationResult(envelope, "createItem", this),
        { mutationId: attempt.mutationId, identityKey: `createItem:${attemptKey}` }
      );
      this._createAttempts.delete(attemptKey);
      return result;
    } catch (error) {
      if (!isAmbiguousRemoteError(error)) this._createAttempts.delete(attemptKey);
      throw error;
    }
  }

  async _createInsightRecord(input) {
    this._assertWritable("createInsightRecord");
    const suppliedRecord = pickInsightInput(input, true, this.providerId, "createInsightRecord");
    const intent = pickInsightInput(input, false, this.providerId, "createInsightRecord");
    const suppliedAttemptId = optionalAttemptIdentity(input, this.providerId, "createInsightRecord");
    const attemptKey = suppliedAttemptId
      ? `insight:id:${suppliedAttemptId}`
      : `insight:intent:${canonicalStringify(intent)}`;
    let attempt = this._createAttempts.get(attemptKey);
    if (!attempt) {
      attempt = {
        record: immutableWorkspaceValue(suppliedRecord),
        mutationId: suppliedAttemptId || this._newMutationId("createInsightRecord")
      };
      this._createAttempts.set(attemptKey, attempt);
    }
    try {
      const result = await this._executeMutation(
        "createInsightRecord",
        "pm_create_insight_record",
        { p_workspace_id: this.workspaceId, p_record: attempt.record },
        (envelope) => insightMutationResult(envelope, "createInsightRecord", this),
        { mutationId: attempt.mutationId, identityKey: `createInsightRecord:${attemptKey}` }
      );
      this._createAttempts.delete(attemptKey);
      return result;
    } catch (error) {
      if (!isAmbiguousRemoteError(error)) this._createAttempts.delete(attemptKey);
      throw error;
    }
  }

  async _updateItem(idValue, patch, expectedVersion) {
    this._assertWritable("updateItem");
    const id = requiredIdentity(idValue, this.providerId, "updateItem", "item");
    this._assertExpectedVersion(expectedVersion, id, "updateItem");
    const parameters = {
      p_workspace_id: this.workspaceId,
      p_item_id: id,
      p_patch: pickItemInput(patch, false, this.providerId, "updateItem"),
      p_expected_version: expectedVersion
    };
    return this._executeMutation(
      "updateItem",
      "pm_update_item",
      parameters,
      (envelope) => itemMutationResult(envelope, "updateItem", this)
    );
  }

  async _updateInsightRecord(idValue, patch, expectedVersion) {
    this._assertWritable("updateInsightRecord");
    const id = requiredIdentity(idValue, this.providerId, "updateInsightRecord", "insight record");
    this._assertExpectedVersion(expectedVersion, id, "updateInsightRecord", "Insight record");
    return this._executeMutation(
      "updateInsightRecord",
      "pm_update_insight_record",
      {
        p_workspace_id: this.workspaceId,
        p_record_id: id,
        p_patch: pickInsightInput(patch, false, this.providerId, "updateInsightRecord"),
        p_expected_version: expectedVersion
      },
      (envelope) => insightMutationResult(envelope, "updateInsightRecord", this)
    );
  }

  async _deleteItem(idValue, expectedVersion) {
    this._assertWritable("deleteItem");
    const id = requiredIdentity(idValue, this.providerId, "deleteItem", "item");
    this._assertExpectedVersion(expectedVersion, id, "deleteItem");
    const parameters = {
      p_workspace_id: this.workspaceId,
      p_item_id: id,
      p_expected_version: expectedVersion
    };
    return this._executeMutation("deleteItem", "pm_delete_item", parameters, (envelope) => (
      immutableWorkspaceValue({
        deleted: Boolean(envelope.deleted),
        activity: resolveActivity(envelope),
        snapshot: this._snapshot,
        revision: this._revision
      })
    ));
  }

  async _deleteInsightRecord(idValue, expectedVersion) {
    this._assertWritable("deleteInsightRecord");
    const id = requiredIdentity(idValue, this.providerId, "deleteInsightRecord", "insight record");
    this._assertExpectedVersion(expectedVersion, id, "deleteInsightRecord", "Insight record");
    return this._executeMutation(
      "deleteInsightRecord",
      "pm_delete_insight_record",
      { p_workspace_id: this.workspaceId, p_record_id: id, p_expected_version: expectedVersion },
      (envelope) => immutableWorkspaceValue({
        deleted: Boolean(envelope.deleted),
        activity: resolveActivity(envelope),
        snapshot: this._snapshot,
        revision: this._revision
      })
    );
  }

  async _updateOrganization(input, expectedVersion) {
    this._assertWritable("updateOrganization");
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.VERSION_CONFLICT,
        "updateOrganization",
        "The product organization requires a current version before it can be changed.",
        { expectedVersion }
      );
    }
    const organization = normalizeOrganization(input);
    if (byteLength(organization) > MAX_ORGANIZATION_PAYLOAD_BYTES) {
      throw this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT,
        "updateOrganization",
        "The product organization is too large.",
        { limit: MAX_ORGANIZATION_PAYLOAD_BYTES }
      );
    }
    const parameters = {
      p_workspace_id: this.workspaceId,
      p_organization: organization,
      p_expected_version: expectedVersion
    };
    return this._executeMutation(
      "updateOrganization",
      "pm_update_organization",
      parameters,
      (envelope) => immutableWorkspaceValue({
        organization: this._snapshot.organization,
        activity: resolveActivity(envelope),
        snapshot: this._snapshot,
        revision: this._revision
      })
    );
  }

  async _updateCustomerDirectory(input, expectedVersion) {
    this._assertWritable("updateCustomerDirectory");
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.VERSION_CONFLICT,
        "updateCustomerDirectory",
        "The customer directory requires its current version before it can be changed.",
        { expectedVersion }
      );
    }
    let customerDirectory;
    try {
      customerDirectory = normalizeCustomerDirectory(input);
    } catch (cause) {
      if (!(cause instanceof CustomerDirectoryError)) throw cause;
      throw this._error(WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT, "updateCustomerDirectory", cause.message, cause.details, cause);
    }
    if (byteLength(customerDirectory) > MAX_CUSTOMER_DIRECTORY_PAYLOAD_BYTES) {
      throw this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT,
        "updateCustomerDirectory",
        "The customer directory is too large.",
        { limit: MAX_CUSTOMER_DIRECTORY_PAYLOAD_BYTES }
      );
    }
    return this._executeMutation(
      "updateCustomerDirectory",
      "pm_update_customer_directory",
      {
        p_workspace_id: this.workspaceId,
        p_customer_directory: customerDirectory,
        p_expected_version: expectedVersion
      },
      (envelope) => immutableWorkspaceValue({
        customerDirectory: this._snapshot.customerDirectory,
        activity: resolveActivity(envelope),
        snapshot: this._snapshot,
        revision: this._revision
      })
    );
  }

  async _updateWorkflow(input, expectedVersion) {
    this._assertWritable("updateWorkflow");
    if (this._role !== "owner") {
      throw this._error(WORKSPACE_REPOSITORY_ERROR_CODES.PERMISSION_DENIED, "updateWorkflow", "Only workspace owners can change the initiative workflow.");
    }
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw this._error(WORKSPACE_REPOSITORY_ERROR_CODES.VERSION_CONFLICT, "updateWorkflow", "The initiative workflow requires its current version before it can be changed.", { expectedVersion });
    }
    let workflow;
    try {
      workflow = normalizeInitiativeWorkflow(input);
    } catch (cause) {
      if (!(cause instanceof InitiativeWorkflowError)) throw cause;
      throw this._error(WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT, "updateWorkflow", cause.message, cause.details, cause);
    }
    if (byteLength(workflow) > MAX_WORKFLOW_PAYLOAD_BYTES) {
      throw this._error(WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT, "updateWorkflow", "The initiative workflow is too large.", { limit: MAX_WORKFLOW_PAYLOAD_BYTES });
    }
    return this._executeMutation(
      "updateWorkflow",
      "pm_update_workflow",
      { p_workspace_id: this.workspaceId, p_workflow: workflow, p_expected_version: expectedVersion },
      (envelope) => immutableWorkspaceValue({
        workflow: this._snapshot.workflow,
        activity: resolveActivity(envelope),
        snapshot: this._snapshot,
        revision: this._revision
      })
    );
  }

  async _updateExperience(input, expectedVersion) {
    this._assertWritable("updateExperience");
    if (this._role !== "owner") {
      throw this._error(WORKSPACE_REPOSITORY_ERROR_CODES.PERMISSION_DENIED, "updateExperience", "Only workspace owners can customize the workspace experience.");
    }
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw this._error(WORKSPACE_REPOSITORY_ERROR_CODES.VERSION_CONFLICT, "updateExperience", "The workspace experience requires its current version before it can be changed.", { expectedVersion });
    }
    let experience;
    try {
      experience = normalizeWorkspaceExperience(input);
    } catch (cause) {
      if (!(cause instanceof WorkspaceExperienceError)) throw cause;
      throw this._error(WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT, "updateExperience", cause.message, cause.details, cause);
    }
    if (byteLength(experience) > MAX_EXPERIENCE_PAYLOAD_BYTES) {
      throw this._error(WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT, "updateExperience", "The workspace experience is too large.", { limit: MAX_EXPERIENCE_PAYLOAD_BYTES });
    }
    return this._executeMutation(
      "updateExperience",
      "pm_update_experience",
      { p_workspace_id: this.workspaceId, p_experience: experience, p_expected_version: expectedVersion },
      (envelope) => immutableWorkspaceValue({
        experience: this._snapshot.experience,
        activity: resolveActivity(envelope),
        snapshot: this._snapshot,
        revision: this._revision
      })
    );
  }

  async _updatePrioritization(input, expectedVersion) {
    this._assertWritable("updatePrioritization");
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw this._error(WORKSPACE_REPOSITORY_ERROR_CODES.VERSION_CONFLICT, "updatePrioritization", "Prioritization settings require their current version before they can be changed.", { expectedVersion });
    }
    let prioritization;
    try {
      prioritization = normalizePrioritization(input, { items: this._snapshot?.items || [] });
      if (this._role !== "owner" && ownerPriorityConfigurationChanged(this._snapshot?.prioritization, prioritization)) {
        throw this._error(
          WORKSPACE_REPOSITORY_ERROR_CODES.PERMISSION_DENIED,
          "updatePrioritization",
          "Only workspace owners can change prioritization frameworks, levels, and defaults."
        );
      }
    } catch (cause) {
      if (cause instanceof WorkspaceRepositoryError) throw cause;
      if (!(cause instanceof PrioritizationError)) throw cause;
      throw this._error(WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT, "updatePrioritization", cause.message, cause.details, cause);
    }
    if (byteLength(prioritization) > MAX_PRIORITIZATION_PAYLOAD_BYTES) {
      throw this._error(WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT, "updatePrioritization", "Prioritization settings are too large.", { limit: MAX_PRIORITIZATION_PAYLOAD_BYTES });
    }
    return this._executeMutation(
      "updatePrioritization",
      "pm_update_prioritization",
      { p_workspace_id: this.workspaceId, p_prioritization: prioritization, p_expected_version: expectedVersion },
      (envelope) => immutableWorkspaceValue({
        prioritization: this._snapshot.prioritization,
        activity: resolveActivity(envelope),
        snapshot: this._snapshot,
        revision: this._revision
      })
    );
  }

  async _updatePlanningCalendar(input, expectedVersion) {
    this._assertWritable("updatePlanningCalendar");
    if (this._role !== "owner") {
      throw this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.PERMISSION_DENIED,
        "updatePlanningCalendar",
        "Only workspace owners can change the planning calendar.",
        { accessRevoked: false, role: this._role }
      );
    }
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.VERSION_CONFLICT,
        "updatePlanningCalendar",
        "The planning calendar requires a current version before it can be changed.",
        { expectedVersion }
      );
    }
    let planningCalendar;
    try {
      planningCalendar = normalizePlanningCalendar(input);
    } catch (cause) {
      if (!(cause instanceof PlanningCalendarError)) throw cause;
      throw this._error(WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT, "updatePlanningCalendar", cause.message, cause.details, cause);
    }
    if (byteLength(planningCalendar) > MAX_PLANNING_CALENDAR_PAYLOAD_BYTES) {
      throw this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT,
        "updatePlanningCalendar",
        "The planning calendar is too large.",
        { limit: MAX_PLANNING_CALENDAR_PAYLOAD_BYTES }
      );
    }
    return this._executeMutation(
      "updatePlanningCalendar",
      "pm_update_planning_calendar",
      {
        p_workspace_id: this.workspaceId,
        p_planning_calendar: planningCalendar,
        p_expected_version: expectedVersion
      },
      (envelope) => immutableWorkspaceValue({
        planningCalendar: this._snapshot.planningCalendar,
        activity: resolveActivity(envelope),
        snapshot: this._snapshot,
        revision: this._revision
      })
    );
  }

  async _appendActivity(input) {
    this._assertWritable("appendActivity");
    const parameters = {
      p_workspace_id: this.workspaceId,
      p_entry: pickActivityInput(input, this.providerId, "appendActivity")
    };
    return this._executeMutation("appendActivity", "pm_append_activity", parameters, (envelope) => {
      const activity = resolveActivity(envelope);
      if (!activity) throw this._invalidEnvelope("appendActivity");
      return immutableWorkspaceValue({
        activity,
        snapshot: this._snapshot,
        revision: this._revision
      });
    });
  }

  _exportSnapshot(options = {}) {
    this._assertConnected("exportSnapshot");
    return encodeWorkspaceDocument(this._snapshot, {
      ...options,
      now: options.now || this._timestamp("exportSnapshot")
    });
  }

  async _disconnect() {
    if (!this._connected && !this._channel && !this._connectPromise) return false;
    this._generation += 1;
    const channel = this._clearSensitiveState();
    await this._removeChannel(channel);
    return true;
  }

  async _refresh() {
    this._assertConnected("refresh");
    this._setState("resyncing");
    try {
      const data = await this._rpc("pm_open_workspace", {
        p_workspace_id: this.workspaceId
      }, "refresh");
      this._acceptEnvelope(data, "refresh", true);
      if (this._channelLive) this._setState("ready");
      else await this._reconnectNow();
      return this._snapshot;
    } catch (error) {
      this._setState("disconnected");
      throw error;
    }
  }

  async _requireAuthenticatedUser(operation) {
    if (typeof this.client.auth?.getUser !== "function") {
      throw this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.AUTH_REQUIRED,
        operation,
        "Sign in to use the Supabase team workspace."
      );
    }
    let result;
    try {
      result = await this.client.auth.getUser();
    } catch {
      throw this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.AUTH_REQUIRED,
        operation,
        "Sign in to use the Supabase team workspace.",
        {},
        true
      );
    }
    if (result?.error || !result?.data?.user?.id) {
      throw this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.AUTH_REQUIRED,
        operation,
        "Sign in to use the Supabase team workspace."
      );
    }
  }

  async _rpc(name, parameters, operation) {
    let result;
    try {
      result = await this.client.rpc(name, parameters);
    } catch (error) {
      throw remoteError(error, this.providerId, operation, true);
    }
    if (result?.error) throw remoteError(result.error, this.providerId, operation, Number(result.status || 0) === 0);
    const data = result?.data;
    if (data === undefined || data === null) throw this._invalidEnvelope(operation);
    return data;
  }

  _acceptEnvelope(input, operation, notify) {
    const envelope = normalizeEnvelope(input, this.workspaceId, this.providerId, operation);
    const previousRevision = this._revision;
    if (this._snapshot && envelope.revision === previousRevision
      && JSON.stringify(envelope.snapshot) !== JSON.stringify(this._snapshot)) {
      throw this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.REMOTE_CONFLICT,
        operation,
        "Supabase returned different workspace data for the same revision.",
        { revision: envelope.revision }
      );
    }
    if (!this._snapshot || envelope.revision >= previousRevision) {
      this._snapshot = envelope.snapshot;
      this._revision = envelope.revision;
      this._role = envelope.role;
      if (notify && envelope.revision > previousRevision) this._notify();
    }
    return envelope;
  }

  async _establishRealtime(generation, operation) {
    if (typeof this.client.channel !== "function") {
      throw this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.NOT_CONNECTED,
        operation,
        "Supabase Realtime is required for team workspace writes.",
        {},
        true
      );
    }
    const previous = this._channel;
    this._channel = null;
    this._channelLive = false;
    await this._removeChannel(previous);
    if (!this._connected || generation !== this._generation) throw this._cancelled(operation);

    this._handshaking = true;
    const channelGeneration = ++this._channelGeneration;
    this._setState(operation === "connect" ? "connecting" : "resyncing");
    let channel;
    let resolveSubscribed;
    let rejectSubscribed;
    let settled = false;
    const subscribed = new Promise((resolve, reject) => {
      resolveSubscribed = resolve;
      rejectSubscribed = reject;
    });
    try {
      channel = this.client.channel(`pm-os-workspace:${this.workspaceId}`);
      channel.on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "pm_workspaces",
        filter: `id=eq.${this.workspaceId}`
      }, (payload) => this._handleRealtimePayload(
        payload,
        channel,
        generation,
        channelGeneration
      ));
      this._channel = channel;
      channel.subscribe((statusValue) => {
        if (this._channel !== channel || generation !== this._generation) return;
        const status = String(statusValue || "").toUpperCase();
        if (status === "SUBSCRIBED" && !settled) {
          settled = true;
          resolveSubscribed();
          return;
        }
        if (!realtimeFailureStates.has(status)) return;
        const failure = this._realtimeTransportError(operation, status);
        if (!settled) {
          settled = true;
          rejectSubscribed(failure);
        } else {
          this._handleRealtimeFailure(failure, channel, generation, channelGeneration);
        }
      });
    } catch (error) {
      this._handshaking = false;
      throw remoteError(error, this.providerId, operation, true);
    }

    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = this._setTimer(() => {
        if (!settled) {
          settled = true;
          reject(this._realtimeTransportError(operation, "TIMED_OUT"));
        }
      }, this._subscribeTimeoutMs);
    });
    try {
      await Promise.race([subscribed, timeout]);
      if (!this._connected || generation !== this._generation || this._channel !== channel) {
        throw this._cancelled(operation);
      }
      await this._postSubscriptionResync(generation, operation);
      if (!this._connected
        || generation !== this._generation
        || channelGeneration !== this._channelGeneration
        || this._channel !== channel) {
        throw this._realtimeTransportError(operation, "CLOSED_DURING_HANDSHAKE");
      }
      this._channelLive = true;
      this._reconnectAttempt = 0;
      this._setState("ready");
    } finally {
      this._clearTimer(timeoutId);
      this._handshaking = false;
    }
  }

  async _postSubscriptionResync(generation, operation) {
    do {
      const targetRevision = this._pendingRevision;
      const data = await this._rpc("pm_open_workspace", {
        p_workspace_id: this.workspaceId
      }, operation === "connect" ? "connect" : "resync");
      if (!this._connected || generation !== this._generation) throw this._cancelled(operation);
      this._acceptEnvelope(data, operation === "connect" ? "connect" : "resync", true);
      if (this._revision >= targetRevision) this._pendingRevision = -1;
    } while (this._pendingRevision > this._revision);
  }

  _handleRealtimePayload(
    payload,
    channel = this._channel,
    generation = this._generation,
    channelGeneration = this._channelGeneration
  ) {
    if (!this._connected
      || this._channel !== channel
      || generation !== this._generation
      || channelGeneration !== this._channelGeneration) return;
    const revision = Number(payload?.new?.revision);
    if (!Number.isInteger(revision) || revision <= this._revision) return;
    this._pendingRevision = Math.max(this._pendingRevision, revision);
    if (!this._handshaking) this._queueResync(false);
  }

  _handleRealtimeFailure(error, channel, generation, channelGeneration) {
    if (!this._connected
      || this._channel !== channel
      || generation !== this._generation
      || channelGeneration !== this._channelGeneration) return;
    this._channelGeneration += 1;
    this._channelLive = false;
    this._setState("disconnected");
    this._reportRealtimeError(error);
    this._scheduleReconnect();
  }

  _scheduleReconnect() {
    if (!this._connected || this._reconnectTimer !== null || this._handshaking) return;
    if (this._reconnectAttempt >= this._reconnectDelays.length) return;
    const delay = this._reconnectDelays[this._reconnectAttempt];
    this._reconnectAttempt += 1;
    this._reconnectTimer = this._setTimer(() => {
      this._reconnectTimer = null;
      void this._attemptReconnect();
    }, delay);
  }

  async _attemptReconnect() {
    if (!this._connected) return false;
    const generation = this._generation;
    try {
      await this._establishRealtime(generation, "reconnect");
      return true;
    } catch (error) {
      const contextualized = this._contextualize(error, "reconnect");
      if (isAccessBoundaryError(contextualized)) {
        this._revokeAccess(contextualized);
        this._reportOperationError(contextualized);
      }
      else {
        this._channelLive = false;
        this._setState("disconnected");
        this._reportRealtimeError(contextualized);
        this._scheduleReconnect();
      }
      return false;
    }
  }

  async _reconnectNow() {
    if (!this._connected) throw this._cancelled("reconnect");
    if (this._reconnectTimer !== null) {
      this._clearTimer(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._reconnectAttempt = 0;
    const connected = await this._attemptReconnect();
    if (!connected) {
      throw this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.NOT_CONNECTED,
        "reconnect",
        "Supabase Realtime could not reconnect.",
        {},
        true
      );
    }
    return this._snapshot;
  }

  _queueResync(force) {
    if (!this._connected) return;
    this._forceResync = this._forceResync || force;
    this._setState("resyncing");
    if (this._resyncScheduled || this._resyncPromise) return;
    this._resyncScheduled = true;
    this._schedule(() => {
      this._resyncScheduled = false;
      void this._runResync();
    });
  }

  async _runResync() {
    if (!this._connected || this._resyncPromise) return this._resyncPromise;
    const generation = this._generation;
    this._resyncPromise = (async () => {
      while (this._connected && generation === this._generation
        && (this._forceResync || this._pendingRevision > this._revision)) {
        this._forceResync = false;
        const targetRevision = this._pendingRevision;
        const data = await this._rpc("pm_open_workspace", {
          p_workspace_id: this.workspaceId
        }, "resync");
        if (!this._connected || generation !== this._generation) return;
        this._acceptEnvelope(data, "resync", true);
        if (this._revision >= targetRevision) this._pendingRevision = -1;
      }
      if (this._connected && generation === this._generation && this._channelLive) {
        this._setState("ready");
      }
    })();
    try {
      await this._resyncPromise;
    } catch (error) {
      const contextualized = this._contextualize(error, "resync");
      if (isAccessBoundaryError(contextualized)) {
        this._revokeAccess(contextualized);
        this._reportOperationError(contextualized);
      }
      else this._handleRealtimeFailure(
        contextualized,
        this._channel,
        generation,
        this._channelGeneration
      );
    } finally {
      this._resyncPromise = null;
      if (this._connected && (this._forceResync || this._pendingRevision > this._revision)) {
        this._queueResync(false);
      }
    }
  }

  _notify() {
    for (const listener of [...this._listeners]) this._deliver(listener, this._snapshot);
  }

  _deliver(listener, snapshot) {
    try {
      listener(snapshot);
    } catch (error) {
      if (!this._onSubscriberError) return;
      try {
        this._onSubscriberError(error, immutableWorkspaceValue({
          providerId: this.providerId,
          workspaceId: this.workspaceId,
          operation: "subscribe",
          revision: this._revision
        }));
      } catch {
        // Subscriber diagnostics cannot affect committed remote state.
      }
    }
  }

  _reportRealtimeError(error) {
    if (!this._onRealtimeError) return;
    try {
      this._onRealtimeError(error);
    } catch {
      // Realtime diagnostics cannot restart or mutate the repository.
    }
  }

  _setState(next) {
    if (this._state === next) return;
    this._state = next;
    if (!this._onConnectionStateChange) return;
    try {
      this._onConnectionStateChange(next);
    } catch {
      // Connection observers cannot affect repository state transitions.
    }
  }

  _assertConnected(operation) {
    if (!this._connected || !this._snapshot) {
      throw this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.NOT_CONNECTED,
        operation,
        "Connect the Supabase team workspace before using it."
      );
    }
  }

  _assertWritable(operation) {
    this._assertConnected(operation);
    if (this._state !== "ready" || !this._channelLive) {
      throw this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.NOT_CONNECTED,
        operation,
        "Team workspace writes are paused while Supabase reconnects.",
        { connectionState: this._state },
        true
      );
    }
    if (this._role === "viewer") {
      throw this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.PERMISSION_DENIED,
        operation,
        "Viewer access cannot change this team workspace.",
        { accessRevoked: false, role: "viewer" }
      );
    }
  }

  _assertExpectedVersion(value, itemId, operation, label = "Item") {
    if (!Number.isInteger(value) || value < 1) {
      throw this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.VERSION_CONFLICT,
        operation,
        `${label} ${itemId} requires its current version.`,
        { itemId, expectedVersion: Number.isInteger(value) ? value : null }
      );
    }
  }

  async _executeMutation(operation, rpcName, parameters, createResult, options = {}) {
    const identity = this._mutationIdentity(
      operation,
      parameters,
      options.mutationId,
      options.identityKey
    );
    try {
      const data = await this._rpc(rpcName, {
        ...parameters,
        p_mutation_id: identity.id
      }, operation);
      const envelope = this._acceptEnvelope(data, operation, true);
      const result = createResult(envelope);
      this._retryMutations.delete(identity.key);
      return result;
    } catch (error) {
      if (!(error instanceof WorkspaceRepositoryError)
        || error.code !== WORKSPACE_REPOSITORY_ERROR_CODES.REMOTE_ERROR) {
        this._retryMutations.delete(identity.key);
      }
      throw error;
    }
  }

  _mutationIdentity(operation, parameters, preferredId = "", preferredKey = "") {
    const key = preferredKey || `${operation}:${canonicalStringify(parameters)}`;
    const retained = this._retryMutations.get(key);
    if (retained) return { key, id: retained };
    const value = preferredId || this._newMutationId(operation);
    this._retryMutations.set(key, value);
    return { key, id: value };
  }

  _newMutationId(operation) {
    const value = String(this._idFactory("mutation", operation) || "").trim();
    if (!value || value.length > 200) {
      throw this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT,
        operation,
        "A mutation identity could not be created."
      );
    }
    return value;
  }

  _clearSensitiveState() {
    if (this._reconnectTimer !== null) {
      this._clearTimer(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    const channel = this._channel;
    this._channel = null;
    this._channelGeneration += 1;
    this._connected = false;
    this._channelLive = false;
    this._handshaking = false;
    this._setState("disconnected");
    this._pendingRevision = -1;
    this._forceResync = false;
    this._resyncScheduled = false;
    this._reconnectAttempt = 0;
    this._listeners.clear();
    this._snapshot = null;
    this._revision = -1;
    this._role = "viewer";
    this._retryMutations.clear();
    this._createAttempts.clear();
    return channel;
  }

  _revokeAccess() {
    this._generation += 1;
    const channel = this._clearSensitiveState();
    void this._removeChannel(channel);
  }

  async _removeChannel(channel) {
    if (!channel) return;
    try {
      if (typeof this.client.removeChannel === "function") {
        await this.client.removeChannel(channel);
      } else if (typeof channel.unsubscribe === "function") {
        await channel.unsubscribe();
      }
    } catch {
      // Sensitive local state is cleared before transport cleanup is attempted.
    }
  }

  _cancelled(operation) {
    return this._error(
      WORKSPACE_REPOSITORY_ERROR_CODES.NOT_CONNECTED,
      operation,
      "The Supabase workspace connection was cancelled."
    );
  }

  _realtimeTransportError(operation, status) {
    return this._error(
      WORKSPACE_REPOSITORY_ERROR_CODES.REMOTE_ERROR,
      operation,
      "Supabase Realtime is temporarily unavailable.",
      { realtimeStatus: status },
      true
    );
  }

  _timestamp(operation) {
    const value = typeof this._now === "function" ? this._now() : this._now;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT,
        operation,
        "Workspace clock returned an invalid timestamp."
      );
    }
    return date.toISOString();
  }

  _invalidEnvelope(operation) {
    return this._error(
      WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT,
      operation,
      "Supabase returned an invalid workspace response."
    );
  }

  async _withAsyncContext(operation, callback) {
    try {
      return await callback();
    } catch (error) {
      const contextualized = this._contextualize(error, operation);
      if (isAccessBoundaryError(contextualized)) this._revokeAccess(contextualized);
      this._reportOperationError(contextualized);
      throw contextualized;
    }
  }

  _withContext(operation, callback) {
    try {
      return callback();
    } catch (error) {
      const contextualized = this._contextualize(error, operation);
      if (isAccessBoundaryError(contextualized)) this._revokeAccess(contextualized);
      this._reportOperationError(contextualized);
      throw contextualized;
    }
  }

  _reportOperationError(error) {
    if (!this._onOperationError) return;
    try {
      this._onOperationError(error);
    } catch {
      // Operation observers cannot change repository error semantics.
    }
  }

  _contextualize(error, operation) {
    if (!(error instanceof WorkspaceRepositoryError)) {
      return this._error(
        WORKSPACE_REPOSITORY_ERROR_CODES.REMOTE_ERROR,
        operation,
        "The Supabase workspace operation could not be completed.",
        {},
        true
      );
    }
    if (error.providerId === this.providerId && error.operation === operation) return error;
    return this._error(
      remoteBoundaryCode(error.code),
      operation,
      safeErrorMessage(remoteBoundaryCode(error.code)),
      error.details,
      error.retryable
    );
  }

  _error(code, operation, message, details = {}, retryable = false) {
    return new WorkspaceRepositoryError(code, message, {
      providerId: this.providerId,
      operation,
      details,
      retryable
    });
  }
}

function ownerPriorityConfigurationChanged(current, next) {
  return ["defaultFrameworkId", "customFrameworks", "activeMethodId", "levels", "customScorecard"]
    .some((field) => JSON.stringify(current?.[field]) !== JSON.stringify(next?.[field]));
}

/** Supabase team discovery and membership administration. */
export class SupabaseTeamWorkspaceService extends TeamWorkspaceService {
  constructor(options = {}) {
    super(SUPABASE_WORKSPACE_PROVIDER_ID);
    this.client = requireClient(options.client, this.providerId, "constructor");
    this._idFactory = typeof options.idFactory === "function" ? options.idFactory : defaultIdFactory;
    this._onOperationError = typeof options.onOperationError === "function"
      ? options.onOperationError
      : null;
    this._retryMutations = new Map();
    this._createAttempts = new Map();
  }

  listWorkspaces() { return this._call("listWorkspaces", "pm_list_workspaces", {}); }
  async createWorkspace(input = {}) {
    const suppliedName = requiredText(input.name, this.providerId, "createWorkspace", "workspace name", 160);
    const suppliedAttemptId = optionalAttemptIdentity(
      input,
      this.providerId,
      "createWorkspace"
    );
    const attemptKey = suppliedAttemptId
      ? `id:${suppliedAttemptId}`
      : `intent:${canonicalStringify({ name: suppliedName })}`;
    let attempt = this._createAttempts.get(attemptKey);
    if (!attempt) {
      attempt = {
        name: suppliedName,
        mutationId: suppliedAttemptId || this._mutationId("createWorkspace")
      };
      this._createAttempts.set(attemptKey, attempt);
    }
    const parameters = { p_name: attempt.name };
    const identityKey = `createWorkspace:${attemptKey}`;
    const retainedMutationId = this._retryMutations.get(identityKey) || attempt.mutationId;
    this._retryMutations.set(identityKey, retainedMutationId);
    try {
      const result = await this._call("createWorkspace", "pm_create_workspace", {
        ...parameters,
        p_mutation_id: retainedMutationId
      });
      this._retryMutations.delete(identityKey);
      this._createAttempts.delete(attemptKey);
      return result;
    } catch (error) {
      if (!isAmbiguousRemoteError(error)) {
        this._retryMutations.delete(identityKey);
        this._createAttempts.delete(attemptKey);
      }
      throw error;
    }
  }
  listMembers(workspaceId) {
    return this._call("listMembers", "pm_list_members", {
      p_workspace_id: requiredIdentity(workspaceId, this.providerId, "listMembers", "workspace")
    });
  }
  createInvite(input = {}) {
    const role = requireInviteRole(input.role || "editor", this.providerId, "createInvite");
    const hours = Number(input.expiresInHours ?? 72);
    if (!Number.isInteger(hours) || hours < 1 || hours > 168) {
      throw invalidInput(this.providerId, "createInvite", "Invite expiry must be between 1 and 168 hours.");
    }
    return this._call("createInvite", "pm_create_invite", {
      p_workspace_id: requiredIdentity(input.workspaceId, this.providerId, "createInvite", "workspace"),
      p_role: role,
      p_expires_in_hours: hours
    });
  }
  acceptInvite(input = {}) {
    return this._call("acceptInvite", "pm_accept_invite", {
      p_code: requiredText(input.code, this.providerId, "acceptInvite", "invite code", 200)
    });
  }
  setMemberRole(input = {}) {
    return this._call("setMemberRole", "pm_set_member_role", {
      p_workspace_id: requiredIdentity(input.workspaceId, this.providerId, "setMemberRole", "workspace"),
      p_user_id: requiredIdentity(input.userId, this.providerId, "setMemberRole", "user"),
      p_role: requireRole(input.role, this.providerId, "setMemberRole")
    });
  }
  removeMember(input = {}) {
    return this._call("removeMember", "pm_remove_member", {
      p_workspace_id: requiredIdentity(input.workspaceId, this.providerId, "removeMember", "workspace"),
      p_user_id: requiredIdentity(input.userId, this.providerId, "removeMember", "user")
    });
  }

  async _call(operation, name, parameters) {
    let result;
    try {
      result = await this.client.rpc(name, parameters);
    } catch (error) {
      const mapped = remoteError(error, this.providerId, operation, true);
      this._reportOperationError(mapped);
      throw mapped;
    }
    if (result?.error) {
      const mapped = remoteError(
        result.error,
        this.providerId,
        operation,
        Number(result.status || 0) === 0
      );
      this._reportOperationError(mapped);
      throw mapped;
    }
    const data = result?.data;
    if (data === undefined || data === null) {
      const error = invalidInput(
        this.providerId,
        operation,
        "Supabase returned an invalid team workspace response."
      );
      this._reportOperationError(error);
      throw error;
    }
    return immutableWorkspaceValue(data);
  }

  _reportOperationError(error) {
    if (!this._onOperationError) return;
    try {
      this._onOperationError(error);
    } catch {
      // Operation observers cannot change service error semantics.
    }
  }

  _mutationId(operation) {
    const value = String(this._idFactory("mutation", operation) || "").trim();
    if (!value || value.length > 200) throw invalidInput(this.providerId, operation, "A mutation identity could not be created.");
    return value;
  }
}

function normalizeEnvelope(input, workspaceId, providerId, operation) {
  const source = input && typeof input === "object" ? input : {};
  const returnedWorkspaceId = String(source.workspaceId || source.workspace_id || "").trim();
  const role = String(source.role || "").trim();
  const revision = Number(source.revision);
  if (returnedWorkspaceId !== workspaceId || !roles.has(role)
    || !Number.isInteger(revision) || revision < 0 || !source.document) {
    throw new WorkspaceRepositoryError(
      WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT,
      "Supabase returned an invalid workspace response.",
      { providerId, operation }
    );
  }
  assertPayloadSize(source.document, MAX_SNAPSHOT_BYTES, providerId, operation, "workspace snapshot");
  if (!Array.isArray(source.document.items) || source.document.items.length > MAX_WORKSPACE_ITEMS
    || !Array.isArray(source.document.insightRecords)
    || source.document.insightRecords.length > MAX_WORKSPACE_INSIGHTS
    || !Array.isArray(source.document.activity)
    || source.document.activity.length > MAX_WORKSPACE_ACTIVITY) {
    throw invalidInput(providerId, operation, "Supabase returned a workspace beyond supported limits.");
  }
  let document;
  try {
    document = decodeWorkspaceDocument(source.document);
  } catch (error) {
    if (error instanceof WorkspaceRepositoryError) {
      throw new WorkspaceRepositoryError(error.code, safeErrorMessage(error.code), {
        providerId,
        operation,
        details: error.details
      });
    }
    throw error;
  }
  return immutableWorkspaceValue({
    workspaceId: returnedWorkspaceId,
    role,
    revision,
    snapshot: { ...document, revision },
    item: source.item || null,
    record: source.record || null,
    activity: source.activity || null,
    deleted: Boolean(source.deleted)
  });
}

function insightMutationResult(envelope, operation, repository) {
  const recordId = String(envelope.record?.id || "").trim();
  const record = repository._snapshot.insightRecords.find((entry) => entry.id === recordId);
  if (!record) throw repository._invalidEnvelope(operation);
  return immutableWorkspaceValue({
    record,
    activity: resolveActivity(envelope),
    snapshot: repository._snapshot,
    revision: repository._revision
  });
}

function itemMutationResult(envelope, operation, repository) {
  const itemId = String(envelope.item?.id || "").trim();
  const item = repository._snapshot.items.find((entry) => entry.id === itemId);
  if (!item) throw repository._invalidEnvelope(operation);
  return immutableWorkspaceValue({
    item,
    activity: resolveActivity(envelope),
    snapshot: repository._snapshot,
    revision: repository._revision
  });
}

function resolveActivity(envelope) {
  const activityId = String(envelope.activity?.id || "").trim();
  if (!activityId) return null;
  return envelope.snapshot.activity.find((entry) => entry.id === activityId) || null;
}

function pickItemInput(input, includeId, providerId, operation) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw invalidInput(providerId, operation, "Workspace item input must be an object.");
  }
  const output = {};
  if (includeId && Object.prototype.hasOwnProperty.call(input, "id")) {
    const id = String(input.id || "").trim();
    if (id) output.id = id;
  }
  for (const field of WORKSPACE_MUTABLE_ITEM_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) output[field] = input[field];
  }
  for (const [field, limit] of Object.entries(itemTextLimits)) {
    if (!Object.prototype.hasOwnProperty.call(output, field)) continue;
    if (String(output[field] ?? "").length > limit) {
      throw invalidInput(providerId, operation, `Workspace item ${field} is too long.`);
    }
  }
  for (const field of ["customerIds", "segmentIds"]) {
    if (!Object.prototype.hasOwnProperty.call(output, field)) continue;
    if (!Array.isArray(output[field]) || output[field].length > 250
      || output[field].some((value) => typeof value !== "string" || !value.trim() || value.length > 200)) {
      throw invalidInput(providerId, operation, `Workspace item ${field} must be a list of valid identifiers.`);
    }
  }
  for (const field of ["risks", "dependencies"]) {
    if (!Object.prototype.hasOwnProperty.call(output, field)) continue;
    if (!Array.isArray(output[field]) || output[field].length > 100
      || output[field].some((record) => !record || typeof record !== "object" || Array.isArray(record))) {
      throw invalidInput(providerId, operation, `Workspace item ${field} must be a valid record collection.`);
    }
  }
  assertPayloadSize(output, MAX_ITEM_PAYLOAD_BYTES, providerId, operation, "workspace item");
  return output;
}

function pickInsightInput(input, includeId, providerId, operation) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw invalidInput(providerId, operation, "Insight record input must be an object.");
  }
  const output = {};
  if (includeId && Object.prototype.hasOwnProperty.call(input, "id")) {
    const id = String(input.id || "").trim();
    if (id) output.id = id;
  }
  if (Object.prototype.hasOwnProperty.call(input, "type")) output.type = input.type;
  for (const field of WORKSPACE_MUTABLE_INSIGHT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) output[field] = input[field];
  }
  for (const field of ["id", "type", "title", "status", "owner", "ownerPersonId", "initiativeId", "source", "sourceRef", "severity", "decision"]) {
    if (!Object.prototype.hasOwnProperty.call(output, field)) continue;
    if (String(output[field] ?? "").length > (field === "title" ? 500 : 200)) {
      throw invalidInput(providerId, operation, `Insight record ${field} is too long.`);
    }
  }
  for (const field of ["customerIds", "segmentIds", "relatedRecordIds", "tags", "questions"]) {
    if (!Object.prototype.hasOwnProperty.call(output, field)) continue;
    if (!Array.isArray(output[field]) || output[field].length > 250
      || output[field].some((value) => typeof value !== "string" || !value.trim() || value.length > 500)) {
      throw invalidInput(providerId, operation, `Insight record ${field} must be a list of valid values.`);
    }
  }
  assertPayloadSize(output, MAX_INSIGHT_PAYLOAD_BYTES, providerId, operation, "insight record");
  return output;
}

function pickActivityInput(input, providerId, operation) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw invalidInput(providerId, operation, "Workspace activity input must be an object.");
  }
  const output = {};
  for (const field of ["id", "action", "itemId", "itemTitle", "itemVersion", "changes", "createdAt"]) {
    if (Object.prototype.hasOwnProperty.call(input, field)) output[field] = input[field];
  }
  for (const field of ["id", "action", "itemId", "itemTitle"]) {
    if (String(output[field] ?? "").length > (field === "itemTitle" ? 500 : 200)) {
      throw invalidInput(providerId, operation, `Workspace activity ${field} is too long.`);
    }
  }
  assertPayloadSize(output, MAX_ACTIVITY_PAYLOAD_BYTES, providerId, operation, "workspace activity");
  return output;
}

function supabaseExtension(repository) {
  const extension = {};
  Object.defineProperties(extension, {
    kind: { value: "supabase", enumerable: true },
    connectionState: { get: () => repository.connectionState, enumerable: true },
    writable: { get: () => repository.connected && repository.connectionState === "ready" && repository._channelLive && repository._role !== "viewer", enumerable: true },
    refresh: {
      value: () => repository._withAsyncContext("refresh", () => repository._refresh()),
      enumerable: true
    },
    reconnect: {
      value: () => repository._withAsyncContext("reconnect", () => repository._reconnectNow()),
      enumerable: true
    }
  });
  return Object.freeze(extension);
}

function remoteError(error, providerId, operation, ambiguous = false) {
  if (error instanceof WorkspaceRepositoryError
    && error.providerId === providerId && error.operation === operation) return error;
  const signal = [error?.code, error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
  let code = WORKSPACE_REPOSITORY_ERROR_CODES.REMOTE_ERROR;
  if (/PM_AUTH_REQUIRED|PGRST301|\b28000\b/.test(signal)) code = WORKSPACE_REPOSITORY_ERROR_CODES.AUTH_REQUIRED;
  else if (/PM_PERMISSION_DENIED|\b42501\b/.test(signal)) code = WORKSPACE_REPOSITORY_ERROR_CODES.PERMISSION_DENIED;
  else if (/PM_VERSION_CONFLICT|\b40001\b/.test(signal)) code = WORKSPACE_REPOSITORY_ERROR_CODES.VERSION_CONFLICT;
  else if (/PM_REMOTE_CONFLICT/.test(signal)) code = WORKSPACE_REPOSITORY_ERROR_CODES.REMOTE_CONFLICT;
  else if (/PM_NOT_FOUND|PGRST116/.test(signal)) code = WORKSPACE_REPOSITORY_ERROR_CODES.NOT_FOUND;
  else if (/PM_DUPLICATE_ID|\b23505\b/.test(signal)) code = WORKSPACE_REPOSITORY_ERROR_CODES.DUPLICATE_ID;
  else if (/PM_INVALID_VERSION/.test(signal)) code = WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_VERSION;
  else if (/PM_PAYLOAD_TOO_LARGE|PM_WORKSPACE_LIMIT|PM_MUTATION_REUSE|\b54000\b/.test(signal)) code = WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT;
  else if (/PM_INVALID|PM_CUSTOMER_.*ASSIGNED|\b23503\b|\b22023\b|\b22P02\b/.test(signal)) code = WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT;
  const status = Number(error?.status || error?.statusCode || 0);
  const details = {};
  if (status) details.status = status;
  if (code === WORKSPACE_REPOSITORY_ERROR_CODES.REMOTE_ERROR && ambiguous) details.ambiguous = true;
  if (code === WORKSPACE_REPOSITORY_ERROR_CODES.PERMISSION_DENIED) {
    details.accessRevoked = !/PM_LAST_OWNER|PM_OWNER_REQUIRED/.test(signal);
    if (/PM_LAST_OWNER/.test(signal)) details.reason = "last-owner";
    if (/PM_OWNER_REQUIRED/.test(signal)) details.reason = "owner-required";
  }
  return new WorkspaceRepositoryError(code, safeErrorMessage(code), {
    providerId,
    operation,
    retryable: code === WORKSPACE_REPOSITORY_ERROR_CODES.REMOTE_ERROR,
    details
  });
}

function isAccessBoundaryError(error) {
  return error?.code === WORKSPACE_REPOSITORY_ERROR_CODES.AUTH_REQUIRED
    || (error?.code === WORKSPACE_REPOSITORY_ERROR_CODES.PERMISSION_DENIED
      && error?.details?.accessRevoked !== false);
}

function remoteBoundaryCode(code) {
  return Object.values(WORKSPACE_REPOSITORY_ERROR_CODES).includes(code)
    ? code
    : WORKSPACE_REPOSITORY_ERROR_CODES.REMOTE_ERROR;
}

function safeErrorMessage(code) {
  const messages = {
    AUTH_REQUIRED: "Sign in to use the Supabase team workspace.",
    DUPLICATE_ID: "The workspace already contains that identifier.",
    INVALID_DOCUMENT: "Supabase returned invalid workspace data.",
    INVALID_VERSION: "The workspace contains an invalid version.",
    NOT_CONNECTED: "The Supabase team workspace is not connected.",
    NOT_FOUND: "The requested team workspace record was not found.",
    PERMISSION_DENIED: "Your team workspace role does not allow this operation.",
    REMOTE_CONFLICT: "The team workspace changed while it was being refreshed.",
    VERSION_CONFLICT: "The item changed before this update could be applied."
  };
  return messages[code] || "The Supabase workspace operation could not be completed.";
}

function requireClient(client, providerId, operation) {
  if (!client || typeof client.rpc !== "function") {
    throw invalidInput(providerId, operation, "A Supabase client is required.");
  }
  return client;
}

function requiredIdentity(value, providerId, operation, label) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.length > 200) throw invalidInput(providerId, operation, `A valid ${label} identity is required.`);
  return normalized;
}

function optionalAttemptIdentity(input, providerId, operation) {
  if (!input || !Object.prototype.hasOwnProperty.call(input, "createAttemptId")) return "";
  return requiredIdentity(input.createAttemptId, providerId, operation, "create attempt");
}

function requiredText(value, providerId, operation, label, maxLength = 8000) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.length > maxLength) throw invalidInput(providerId, operation, `A valid ${label} is required.`);
  return normalized;
}

function requireRole(value, providerId, operation) {
  const role = String(value || "").trim();
  if (!roles.has(role)) throw invalidInput(providerId, operation, "Role must be owner, editor, or viewer.");
  return role;
}

function requireInviteRole(value, providerId, operation) {
  const role = String(value || "").trim();
  if (!new Set(["editor", "viewer"]).has(role)) {
    throw invalidInput(providerId, operation, "Invite role must be editor or viewer.");
  }
  return role;
}

function assertPayloadSize(value, maxBytes, providerId, operation, label) {
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw invalidInput(providerId, operation, `${label} must be serializable.`);
  }
  if (serialized === undefined || utf8ByteLength(serialized) > maxBytes) {
    throw invalidInput(providerId, operation, `${label} is too large.`);
  }
}

function invalidInput(providerId, operation, message) {
  return new WorkspaceRepositoryError(
    WORKSPACE_REPOSITORY_ERROR_CODES.INVALID_DOCUMENT,
    message,
    { providerId, operation }
  );
}

function defaultSchedule(callback) {
  queueMicrotask(callback);
}

function normalizeReconnectDelays(value) {
  if (!Array.isArray(value)) return defaultReconnectDelays;
  const normalized = value
    .filter((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 30000)
    .slice(0, 8);
  return Object.freeze(normalized.length ? normalized : [...defaultReconnectDelays]);
}

function positiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function canonicalStringify(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => (
    `${JSON.stringify(key)}:${canonicalStringify(value[key])}`
  )).join(",")}}`;
}

function byteLength(value) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function isAmbiguousRemoteError(error) {
  return error?.code === WORKSPACE_REPOSITORY_ERROR_CODES.REMOTE_ERROR
    && error?.details?.ambiguous === true;
}

function utf8ByteLength(value) {
  if (typeof TextEncoder === "function") return new TextEncoder().encode(value).byteLength;
  return unescape(encodeURIComponent(value)).length;
}

let fallbackId = 0;
function defaultIdFactory(kind) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  fallbackId += 1;
  return `${kind}-${Date.now().toString(36)}-${fallbackId.toString(36)}`;
}
