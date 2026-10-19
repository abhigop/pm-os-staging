import { workflowReportingNote } from './workflow.js';
import {
  buildCommunicationMemo, buildDecisionSynthesis, buildExecutiveBriefMemo, buildEscalationMemo, buildMeetingAgendaMarkdown,
  buildProductSpecMarkdown, buildReleaseNotes, buildReviewMemo, buildRetrospectiveMemo,
  buildStakeholderMemo, buildStakeholderUpdate, buildTemplateDraft, pmTemplates, prioritizeItems
} from './domain.js';
import { filterItemsByPeriod, normalizePeriodSelection, periodSelectionLabel, periodSelectionRangeLabel } from './planning-calendar.js';
import { workspaceCapabilityEnabled } from './experience.js';

const definition = (id, label, capability = '', requiresInitiative = false) => Object.freeze({ id, label, capability, requiresInitiative });
export const DOCUMENT_TYPES = Object.freeze([
  definition('weekly', 'Weekly update'),
  definition('executive', 'Executive brief', 'leadership-briefing'),
  definition('stakeholders', 'Stakeholder memo', 'leadership-briefing'),
  definition('escalations', 'Escalation memo', 'leadership-briefing'),
  definition('updates', 'Stakeholder update', 'communications-reviews'),
  definition('release-notes', 'Release notes', 'communications-reviews'),
  definition('comms', 'Communications plan', 'communications-reviews'),
  definition('review', 'Product review', 'communications-reviews'),
  definition('retros', 'Retrospective', 'communications-reviews'),
  definition('specs', 'Product specification', 'communications-reviews', true),
  ...['weekly-review', 'daily-triage', 'launch-review', 'decision-review'].map(id => definition(`meeting:${id}`, `${id.replaceAll('-', ' ')} agenda`, 'communications-reviews')),
  ...pmTemplates.map(entry => definition(`template:${entry.id}`, `${entry.title} template`, 'communications-reviews', ['prd', 'launch-plan'].includes(entry.id)))
]);
export function availableDocumentTypes(experience) {
  return DOCUMENT_TYPES.filter(type => !type.capability || workspaceCapabilityEnabled(experience, type.capability));
}

export function buildWeeklyUpdateMarkdown(items, priority, options = {}) {
  const top = prioritizeItems(items, priority).filter(item => !['shipped', 'parked'].includes(item.status)).slice(0, 5);
  const decisions = buildDecisionSynthesis(items, options);
  const recordLine = entry => `- ${entry.initiativeTitle || entry.title}: ${entry.title}; ${entry.status === 'decided' ? `Outcome: ${entry.outcome}; Decided: ${entry.decidedAt || 'Not recorded'}` : `Question: ${entry.ask}`}; ${entry.context}; Owner: ${entry.owner}; Due: ${entry.dueDate}; ${entry.origin}; Sources: ${entry.sourceIds.join(', ')}`;
  return `# Weekly update\n\n## Top priorities\n${top.map(item => `- ${item.title}: ${item.nextStep || 'Next step to define'}`).join('\n') || '- No active priorities yet'}\n\n## Decisions and changes\n${decisions.decided.map(recordLine).join('\n') || '- No decisions recorded'}\n\n## Pending decisions\n${decisions.pending.map(recordLine).join('\n') || '- No pending decisions captured'}`;
}

export function generateDocument(context, selection, now = new Date()) {
  const type = availableDocumentTypes(context.experience).find(type => type.id === selection.type);
  if (!type) throw new Error('This document type is unavailable. Enable its supporting workflow in Settings.');
  const period = normalizePeriodSelection(context.timelineEnabled ? { kind: selection.period, startDate: selection.startDate } : { kind: 'all' }, context.calendar);
  if (context.timelineEnabled && selection.period && period.kind !== selection.period) throw new Error('Choose an enabled planned period and a valid date.');
  const query = String(selection.query || '').trim().toLowerCase();
  let items = filterItemsByPeriod(context.items, period, context.calendar).filter(item =>
    `${item.title} ${item.customer || ''} ${item.problem || ''} ${item.owner || ''} ${(item.audienceSegments || []).join(' ')}`.toLowerCase().includes(query));
  if (selection.initiative) {
    items = items.filter(item => item.id === selection.initiative);
    if (!items.length) throw new Error('The selected initiative is outside this scope or no longer available. Adjust the scope before generating.');
  }
  if (type.requiresInitiative && !selection.initiative) throw new Error('Choose one initiative for this document.');
  const ids = new Set(items.map(item => item.id));
  // Unassociated events are included only for the complete project scope.
  const wholeProject = period.kind === 'all' && !query && !selection.initiative;
  const activity = sourceActivity(context).filter(entry => ids.has(entry.itemId) || (wholeProject && !entry.itemId));
  const priority = context.prioritization;
  const themeEvidence = { insightRecords: context.insightRecords || [], customerDirectory: context.customerDirectory, includeUnlinked: wholeProject };
  const generators = {
    weekly: () => buildWeeklyUpdateMarkdown(items, priority, themeEvidence),
    executive: () => buildExecutiveBriefMemo(items, now, priority, themeEvidence),
    stakeholders: () => buildStakeholderMemo(items, now, priority, themeEvidence),
    escalations: () => buildEscalationMemo(items, now, priority),
    updates: () => {
      const update = buildStakeholderUpdate(items, now, priority);
      return ['# Stakeholder update', '', update.headline, ...['shipped', 'now', 'next', 'risks', 'asks'].flatMap(section =>
        ['', `## ${section[0].toUpperCase() + section.slice(1)}`, update[section].map(item => `- ${item.title}: ${item.nextStep || 'Next step to define'}`).join('\n') || '- No items in this scope'])].join('\n');
    },
    'release-notes': () => buildReleaseNotes(items, now, priority),
    comms: () => buildCommunicationMemo(items, now, priority, themeEvidence),
    review: () => buildReviewMemo(items, now, priority, themeEvidence),
    retros: () => buildRetrospectiveMemo(items, activity, now, priority, themeEvidence),
    specs: () => buildProductSpecMarkdown(items[0], items, now, priority)
  };
  const content = type.id.startsWith('meeting:') ? buildMeetingAgendaMarkdown(items, type.id.slice(8), now, priority, themeEvidence)
    : type.id.startsWith('template:') ? buildTemplateDraft(type.id.slice(9), items, priority) : generators[type.id]();
  const scope = `${context.projectName} | ${periodSelectionLabel(period, context.calendar)} | ${periodSelectionRangeLabel(period, context.calendar)} | ${items.length} initiative${items.length === 1 ? '' : 's'}${query ? ` | Search: ${selection.query.trim()}` : ''}${selection.initiative ? ` | Initiative: ${items[0].title}` : ''}`;
  return Object.freeze({ type: type.id, label: type.label, scope, count: items.length, itemIds: Object.freeze([...ids]), generatedAt: now.toISOString(),
    text: `Project and scope: ${scope}\nGenerated: ${now.toISOString()}\nPlanned dates determine initiative scope; this is not an activity-date filter.\n\n${content}\n\n${workflowReportingNote(items, context.workflow)}` });
}

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const freshSelection = () => ({ type: 'weekly', initiative: '', query: '', period: 'all', startDate: '' });
const sourceActivity = context => context.activity.filter(entry => !['artifact-created', 'artifact-deleted'].includes(entry.action));
const contextRevision = context => JSON.stringify([context.items, sourceActivity(context), context.prioritization, context.calendar, context.experience, context.workflow, context.insightRecords || [], context.customerDirectory]);

export async function documentSourceRevision(context) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(contextRevision(context)));
  return `sha256:${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export class DocumentComposer {
  constructor() { this.reset(); }
  reset() {
    this.selection = freshSelection(); this.draft = null; this.text = ''; this.title = '';
    this.error = ''; this.status = ''; this.revision = ''; this.projectKey = '';
    this.savedArtifactId = ''; this.savedVersion = null; this.regenerated = false; this.busy = false; this.operation = null;
  }
  get hasEdits() { return this.busy || Boolean(this.draft && (this.regenerated || this.text !== this.draft.text || this.title !== (this.draft.title || this.draft.label))); }
  choose(type, initiative = '') {
    this.selection = { ...freshSelection(), type, initiative }; this.draft = null; this.text = ''; this.title = '';
    this.status = ''; this.error = ''; this.revision = ''; this.savedArtifactId = ''; this.savedVersion = null; this.regenerated = false; this.operation = null; this.busy = false;
  }
  openArtifact(artifact, asNew = false) {
    this.selection = { ...freshSelection(), ...artifact.sourceSelection, type: artifact.artifactType };
    this.draft = Object.freeze({ type: artifact.artifactType, label: DOCUMENT_TYPES.find(type => type.id === artifact.artifactType)?.label || artifact.artifactType,
      title: artifact.title, text: artifact.content, scope: artifact.sourceScope, itemIds: artifact.itemIds,
      count: artifact.itemIds.length, generatedAt: artifact.generatedAt, sourceRevision: artifact.sourceRevision,
      sourceSelection: { ...this.selection }, captured: true });
    this.text = artifact.content; this.title = artifact.title; this.revision = '';
    this.savedArtifactId = asNew ? '' : artifact.id; this.savedVersion = asNew ? null : artifact.version; this.regenerated = false;
    this.error = ''; this.status = asNew ? 'New draft copied from saved content. Save explicitly to keep it as a separate document.' : `Opened saved version ${artifact.version}. The content has not been regenerated.`;
  }
  markup(context) {
    if (this.projectKey && this.projectKey !== context.projectKey) this.reset();
    this.projectKey = context.projectKey;
    const types = availableDocumentTypes(context.experience);
    const unavailable = !types.some(type => type.id === this.selection.type);
    const changed = this.draft && this.revision && this.revision !== contextRevision(context);
    const periods = context.timelineEnabled ? ['all', 'unscheduled', ...context.calendar.enabledPeriodTypes] : ['all'];
    const artifacts = [...(context.artifacts || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
    const label = this.hasEdits ? 'Unsaved edits' : this.savedArtifactId ? `Saved version ${this.savedVersion}` : this.draft ? 'Unsaved draft' : 'Ready to generate';
    return `<section class="document-composer" aria-labelledby="documentComposerTitle">
      <header class="document-composer-heading"><p class="panel-kicker">Create a document</p><h3 id="documentComposerTitle">Turn your work into a draft</h3><p>Choose a document and its source work, then edit, save, copy, or download the result.</p></header>
      <div class="document-composer-layout"><form class="panel document-composer-controls" id="documentComposerForm">
        <h4>Document and scope</h4><p><strong>${escape(context.projectName)}</strong><br>Only this project’s work is included.</p>
        <label for="documentType">Document type</label><select id="documentType" name="type" ${this.busy ? 'disabled' : ''}>${unavailable ? '<option value="" selected>Choose an available document</option>' : ''}${types.map(type => `<option value="${escape(type.id)}" ${type.id === this.selection.type ? 'selected' : ''}>${escape(type.label)}</option>`).join('')}</select>
        <label for="documentInitiative">Initiative</label><select id="documentInitiative" name="initiative"><option value="">All matching initiatives</option>${this.selection.initiative && !context.items.some(item => item.id === this.selection.initiative) ? '<option selected value="missing">Selected initiative unavailable</option>' : ''}${context.items.map(item => `<option value="${escape(item.id)}" ${item.id === this.selection.initiative ? 'selected' : ''}>${escape(item.title)} · ${escape(item.id.slice(-6))}</option>`).join('')}</select>
        <p class="muted">Specifications, PRD templates, and launch-plan templates require one initiative.</p>
        <label for="documentQuery">Search source work</label><input id="documentQuery" name="query" type="search" value="${escape(this.selection.query)}" placeholder="Title, customer, problem, or owner">
        <label for="documentPeriod">Planned period</label><select id="documentPeriod" name="period">${periods.map(kind => `<option value="${kind}" ${this.selection.period === kind ? 'selected' : ''}>${kind === 'all' ? 'All dates' : kind === 'unscheduled' ? 'Unscheduled' : escape(kind[0].toUpperCase() + kind.slice(1))}</option>`).join('')}</select>
        <label for="documentPeriodStart">Date within the period</label><input id="documentPeriodStart" name="startDate" type="date" value="${escape(this.selection.startDate)}" ${['all', 'unscheduled'].includes(this.selection.period) ? 'disabled' : 'required'}>
        <p class="muted">Planned dates select initiatives. Reports may include their earlier decisions and activity.</p>
        <button class="primary" type="submit" ${this.busy ? 'disabled' : ''}>${this.draft ? 'Regenerate draft' : 'Generate draft'}</button>
      </form><section class="panel document-composer-draft" aria-labelledby="documentDraftTitle" aria-busy="${this.busy}">
        <div class="panel-header"><h4 id="documentDraftTitle">${escape(this.draft?.label || 'Your draft')}</h4><span>${escape(label)}</span></div>
        ${this.draft ? `<p class="document-scope">${escape(this.draft.scope)}</p>${changed ? '<p role="status">Source work changed. Regenerate to include the latest work; your draft is unchanged.</p>' : this.draft.captured ? '<p class="muted">Captured content from a saved document. Source work may have changed; regenerate explicitly to include it.</p>' : ''}
        <label for="documentTitle">Document title</label><input id="documentTitle" value="${escape(this.title)}" maxlength="500">
        <label class="sr-only" for="documentDraft">Document draft</label><textarea id="documentDraft" spellcheck="true">${escape(this.text)}</textarea>
        <div class="data-actions"><button class="primary" id="saveDocumentDraft" type="button" ${this.busy || !context.canSave || (this.savedArtifactId && !this.hasEdits) ? 'disabled' : ''}>${this.savedArtifactId ? 'Save new version' : 'Save to workspace'}</button>
        <button class="secondary" id="copyDocumentDraft" type="button">Copy document</button><button class="secondary" id="downloadDocumentDraft" type="button">Download Markdown</button>
        ${this.savedArtifactId ? `<button class="secondary" id="reuseDocumentDraft" type="button" ${this.busy ? 'disabled' : ''}>Use as new draft</button>` : ''}
        <button class="secondary" id="clearDocumentDraft" type="button" ${this.busy ? 'disabled' : ''}>Discard draft</button></div>` : '<p>Choose the document and scope, then generate. The draft uses your saved work and can be edited before sharing.</p>'}
        ${context.saveUnavailableReason ? `<p class="muted">${escape(context.saveUnavailableReason)}</p>` : ''}
        <p class="muted">Only Save keeps a document in this workspace. Each saved version keeps its original text. Unsaved edits stay in this tab; editing does not change source work or send anything.</p>
        ${this.error ? `<p role="alert">${escape(this.error)}</p>` : ''}<p id="documentComposerStatus" role="status">${escape(this.status)}</p>
      </section></div>
      <section class="panel document-library" aria-labelledby="savedDocumentsTitle"><h3 id="savedDocumentsTitle">Saved documents and history</h3><p>Open the saved text, or reuse it as a separate draft. Older versions remain available.</p>
      ${artifacts.length ? `<ul>${artifacts.map(artifact => `<li class="document-history-entry" data-artifact-id="${escape(artifact.id)}"><h4>${escape(artifact.title)}</h4><p>Version ${artifact.version} · Saved ${escape(artifact.createdAt)}${artifact.supersedesId ? ` · ${artifacts.some(entry => entry.id === artifact.supersedesId) ? 'Revises an earlier saved version' : 'Earlier version is no longer available'}` : ''}</p><p class="document-scope">${escape(artifact.sourceScope)}</p>
      <details><summary>Source and version details</summary><p>Generated ${escape(artifact.generatedAt)}. Saved by ${escape(artifact.updatedBy.displayName)}.</p><p class="document-scope">Source snapshot: ${escape(artifact.sourceRevision)}</p><p>Source initiatives: ${artifact.itemIds.length ? artifact.itemIds.map(id => escape(context.items.find(item => item.id === id)?.title || `Removed initiative (${id})`)).join(', ') : 'No initiatives'}</p>${artifact.supersedesId && artifacts.some(entry => entry.id === artifact.supersedesId) ? `<button type="button" class="secondary" data-open-artifact="${escape(artifact.supersedesId)}" ${this.busy ? 'disabled' : ''}>Open previous version of ${escape(artifact.title)}</button>` : ''}</details>
      <div class="data-actions"><button class="secondary" data-open-artifact="${escape(artifact.id)}" type="button" ${this.busy ? 'disabled' : ''}>Open ${escape(artifact.title)} version ${artifact.version}</button><button class="secondary" data-reuse-artifact="${escape(artifact.id)}" type="button" ${this.busy ? 'disabled' : ''}>Reuse ${escape(artifact.title)} version ${artifact.version}</button><button class="secondary" data-delete-artifact="${escape(artifact.id)}" type="button" ${this.busy || !context.canSave ? 'disabled' : ''}>Delete ${escape(artifact.title)} version ${artifact.version}</button></div></li>`).join('')}</ul>` : '<p>No saved documents yet. Generate a draft, then choose Save to workspace.</p>'}
      </section></section>`;
  }
  bind({ root, context, refresh, confirm, download, saveArtifact, deleteArtifact }) {
    const form = root.querySelector('#documentComposerForm');
    if (!form) return;
    const read = () => { this.selection = { ...freshSelection(), ...Object.fromEntries(new FormData(form)) }; };
    const updateStatus = () => { const status = root.querySelector('#documentComposerStatus'); if (status) status.textContent = this.status; };
    const currentOperation = token => this.operation === token && context().projectKey === token.key && this.projectKey === token.key;
    const confirmReplace = async () => !this.hasEdits || await confirm('Replace your edited draft?', 'Your unsaved edits will be replaced. Save, copy, or download them first to keep them.', 'Replace draft');
    form.addEventListener('input', () => { read(); const date = form.querySelector('#documentPeriodStart'); date.disabled = ['all', 'unscheduled'].includes(this.selection.period); date.required = !date.disabled; });
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (this.busy) return; read();
      const key = this.projectKey;
      if (!await confirmReplace() || this.projectKey !== key || context().projectKey !== key) return;
      const token = { key }; this.operation = token; this.busy = true;
      try {
        const current = context(); const selected = { ...this.selection }; const draft = generateDocument(current, selected);
        const revision = contextRevision(current); const sourceRevision = await documentSourceRevision(current);
        if (!currentOperation(token)) return;
        const title = this.title && this.title !== this.draft?.label ? this.title : draft.label;
        this.draft = Object.freeze({ ...draft, title, sourceRevision, sourceSelection: selected });
        this.regenerated = Boolean(this.savedArtifactId);
        this.text = this.draft.text; this.title = this.draft.title; this.revision = revision;
        this.error = ''; this.status = `Generated ${draft.count} initiative${draft.count === 1 ? '' : 's'}. Review the draft before saving or sharing.`;
      } catch (error) { if (currentOperation(token)) this.error = error.message; }
      finally { if (currentOperation(token)) { this.busy = false; this.operation = null; refresh(this.error ? 'documentType' : 'documentDraft'); } }
    });
    const edit = (field, event) => {
      this[field] = event.target.value;
      const label = root.querySelector('.document-composer-draft .panel-header span');
      if (label) label.textContent = this.hasEdits ? 'Unsaved edits' : this.savedArtifactId ? `Saved version ${this.savedVersion}` : 'Unsaved draft';
      const save = root.querySelector('#saveDocumentDraft'); if (save) save.disabled = this.busy || !context().canSave || Boolean(this.savedArtifactId && !this.hasEdits);
    };
    root.querySelector('#documentDraft')?.addEventListener('input', event => edit('text', event));
    root.querySelector('#documentTitle')?.addEventListener('input', event => edit('title', event));
    root.querySelector('#saveDocumentDraft')?.addEventListener('click', async () => {
      if (this.busy || !this.draft || !context().canSave || !saveArtifact) return;
      const token = { key: this.projectKey }; const draft = this.draft; const text = this.text; const title = this.title;
      const input = { artifactType: draft.type, title, itemIds: [...draft.itemIds], content: text, sourceRevision: draft.sourceRevision,
        supersedesId: this.savedArtifactId, sourceScope: draft.scope, sourceSelection: draft.sourceSelection, generatedAt: draft.generatedAt };
      const expected = this.savedVersion; this.operation = token; this.busy = true; this.error = ''; this.status = 'Saving document…'; refresh('documentDraft');
      try {
        const saved = await saveArtifact(input, expected);
        if (!currentOperation(token)) return;
        this.draft = Object.freeze({ ...draft, text: saved.content, title: saved.title, captured: true });
        this.savedArtifactId = saved.id; this.savedVersion = saved.version; this.regenerated = false;
        // Edits made while a provider request was pending are still unsaved.
        if (this.title === title) this.title = saved.title;
        this.status = `Saved version ${saved.version} to this workspace. Earlier versions are unchanged.`;
      } catch (error) { if (currentOperation(token)) { this.error = `${error.message || 'The document could not be saved.'} Your draft is still here. Retry, or use it as a new draft to save a separate copy.`; this.status = ''; } }
      finally { if (currentOperation(token)) { this.busy = false; this.operation = null; refresh('documentDraft'); } }
    });
    root.querySelector('#copyDocumentDraft')?.addEventListener('click', async () => {
      const draft = this.draft;
      try { await globalThis.navigator.clipboard.writeText(this.text); if (this.draft === draft) { this.status = 'Document copied. Paste it where you want to share it.'; updateStatus(); } }
      catch { if (this.draft === draft) { root.querySelector('#documentDraft')?.select(); this.status = 'Copy was unavailable. The draft is selected; use your keyboard to copy it.'; updateStatus(); } }
    });
    root.querySelector('#downloadDocumentDraft')?.addEventListener('click', () => {
      try { download(this.text, 'text/markdown;charset=utf-8', `pm-os-${this.draft.type.replace(/[^a-z0-9-]/g, '-')}.md`); this.status = 'Markdown download requested. Check your browser’s downloads.'; }
      catch { this.status = 'The download could not start. Copy the draft or try again.'; } updateStatus();
    });
    root.querySelector('#reuseDocumentDraft')?.addEventListener('click', () => {
      if (this.busy) return;
      this.savedArtifactId = ''; this.savedVersion = null; this.regenerated = false; this.error = ''; this.status = 'This is now a separate, unsaved draft. Your current edits are preserved.'; refresh('documentTitle');
    });
    root.querySelector('#clearDocumentDraft')?.addEventListener('click', async () => {
      if (this.busy) return; const draft = this.draft;
      if (this.hasEdits && !await confirm('Discard this draft?', 'Unsaved edits will be lost. Saved versions remain in your document history.', 'Discard draft')) return;
      if (this.draft !== draft) return;
      this.choose(this.selection.type, this.selection.initiative); this.status = 'Draft discarded. Saved documents and source work are unchanged.'; refresh('documentType');
    });
    const open = async (id, asNew) => {
      if (this.busy) return; const key = this.projectKey;
      if (!await confirmReplace() || key !== this.projectKey || context().projectKey !== key) return;
      const artifact = (context().artifacts || []).find(entry => entry.id === id);
      if (!artifact) { this.error = 'That saved version is no longer available. Your draft is unchanged.'; refresh('documentDraft'); return; }
      this.openArtifact(artifact, asNew); refresh('documentDraft');
    };
    root.querySelectorAll('[data-open-artifact]').forEach(button => button.addEventListener('click', () => open(button.dataset.openArtifact, false)));
    root.querySelectorAll('[data-reuse-artifact]').forEach(button => button.addEventListener('click', () => open(button.dataset.reuseArtifact, true)));
    root.querySelectorAll('[data-delete-artifact]').forEach(button => button.addEventListener('click', async () => {
      if (this.busy || !context().canSave || !deleteArtifact) return;
      const key = this.projectKey; const artifact = (context().artifacts || []).find(entry => entry.id === button.dataset.deleteArtifact);
      if (!artifact || !await confirm('Delete this saved version?', `Delete “${artifact.title}” version ${artifact.version}? Other saved versions, your open draft, and source work will remain.`, 'Delete saved version')) return;
      if (key !== this.projectKey || context().projectKey !== key) return;
      const token = { key }; this.operation = token; this.busy = true; this.error = ''; refresh('documentDraft');
      try { await deleteArtifact(artifact.id, artifact.version); if (currentOperation(token)) { this.status = 'Saved version deleted. Other versions remain available.'; if (this.savedArtifactId === artifact.id) { this.savedArtifactId = ''; this.savedVersion = null; this.status += ' Your open content is now an unsaved draft.'; } } }
      catch (error) { if (currentOperation(token)) this.error = error.message || 'The saved version could not be deleted.'; }
      finally { if (currentOperation(token)) { this.busy = false; this.operation = null; refresh(this.draft ? 'documentDraft' : 'savedDocumentsTitle'); } }
    }));
  }
}
