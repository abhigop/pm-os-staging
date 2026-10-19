import { IMPORT_FIELDS, buildInboundPreview } from './inbound-import.js';

const IMPORT_MAPPING_SCHEMA = 'pm-os.import-mappings.v1';
export const IMPORT_MAPPING_KEY = "pm-os-staging.import-mappings.v1";
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const headerKey = headers => JSON.stringify(headers.map(header => String(header).trim().toLowerCase()));
const safeMapping = (mapping, headers) => Object.fromEntries(IMPORT_FIELDS.map(({ key }) => [key,
  Number.isInteger(mapping?.[key]) && mapping[key] >= -1 && mapping[key] < headers.length ? mapping[key] : -1]));

export function loadImportMapping(storage, model, demo = false) {
  if (demo || model.format !== 'csv') return { ...model.mapping };
  try {
    const saved = JSON.parse(storage.getItem(IMPORT_MAPPING_KEY));
    const entry = saved?.schema === IMPORT_MAPPING_SCHEMA && Array.isArray(saved.entries)
      ? saved.entries.find(entry => Array.isArray(entry.headers) && headerKey(entry.headers) === headerKey(model.headers)) : null;
    return entry ? { ...model.mapping, ...safeMapping(entry.mapping, model.headers) } : { ...model.mapping };
  } catch { return { ...model.mapping }; }
}

export function saveImportMapping(storage, model, mapping, demo = false) {
  if (demo || model.format !== 'csv') return;
  let previous = [];
  try {
    const saved = JSON.parse(storage.getItem(IMPORT_MAPPING_KEY));
    if (saved?.schema === IMPORT_MAPPING_SCHEMA && Array.isArray(saved.entries)) previous = saved.entries;
  } catch { /* Invalid preferences never prevent importing work. */ }
  // Reconstruct every entry: file names, values and unknown properties are never retained.
  const entries = previous.filter(entry => Array.isArray(entry.headers) && entry.headers.every(header => typeof header === 'string')
    && headerKey(entry.headers) !== headerKey(model.headers)).slice(0, 24)
    .map(entry => ({ headers: entry.headers, mapping: safeMapping(entry.mapping, entry.headers) }));
  storage.setItem(IMPORT_MAPPING_KEY, JSON.stringify({ schema: IMPORT_MAPPING_SCHEMA,
    entries: [{ headers: [...model.headers], mapping: safeMapping(mapping, model.headers) }, ...entries] }));
}

export function reviewInboundImport({ model, workspace, fileName, storage, demo = false, apply, trigger }) {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    dialog.className = 'initiative-editor-dialog inbound-import-dialog';
    dialog.id = 'inboundImportDialog';
    dialog.setAttribute('aria-labelledby', 'inboundImportTitle');
    dialog.setAttribute('aria-describedby', 'inboundImportDescription');
    let mapping = loadImportMapping(storage, model, demo);
    let importDuplicates = [];
    let remember = !demo;
    let duplicatePage = 0;
    let busy = false;
    let error = '';
    let preview;
    const close = result => {
      if (busy) return;
      dialog.close(); dialog.remove();
      if (trigger?.isConnected) trigger.focus();
      resolve(result);
    };
    function render(focusId = '') {
      try { preview = buildInboundPreview(model, { mapping, workspace, importDuplicates }); }
      catch (failure) { preview = { entries: [], firstRows: [], errors: [{ message: failure.message }], valid: false, addedCount: 0, skippedCount: 0 }; }
      const duplicates = preview.entries.filter(entry => entry.duplicate);
      duplicatePage = Math.min(duplicatePage, Math.max(0, Math.ceil(duplicates.length / 25) - 1));
      const page = duplicates.slice(duplicatePage * 25, (duplicatePage + 1) * 25);
      const warnings = [...new Set([...(preview.warnings || []), ...(preview.inspectedFields?.length ? [`Recognized fields: ${preview.inspectedFields.join(", ")}.`] : [])])];
      dialog.setAttribute('aria-busy', String(busy));
      dialog.innerHTML = `<form id="inboundImportForm">
        <header class="initiative-editor-heading"><div><h3 id="inboundImportTitle">Review initiative import</h3><p id="inboundImportDescription">${escape(fileName)} · Add selected rows to this project. Existing work and documents stay in place. Apply creates a recovery snapshot.</p></div></header>
        <div class="inbound-import-body">
          ${model.format === 'csv' ? `<fieldset class="inbound-mapping" ${busy ? 'disabled' : ''}><legend>Match your columns</legend><p>Title is required. Other fields can be left unmapped. Recognized PM OS fields are also retained.</p><div class="initiative-form-grid">${IMPORT_FIELDS.map(field => `<label for="inbound-map-${field.key}">${escape(field.label)}${field.required ? ' (required)' : ''}<select id="inbound-map-${field.key}" data-import-field="${field.key}"><option value="-1" ${mapping[field.key] === -1 || mapping[field.key] === undefined ? 'selected' : ''}>Not mapped</option>${model.headers.map((header, index) => `<option value="${index}" ${mapping[field.key] === index ? 'selected' : ''}>${escape(header || `Column ${index + 1}`)}</option>`).join('')}</select></label>`).join('')}</div><label class="inbound-remember"><input id="rememberImportMapping" type="checkbox" ${remember ? 'checked' : ''} ${demo ? 'disabled' : ''}>Remember these column choices on this device</label><p class="muted">Only headers and mapping choices are stored, never row values. Preferences are excluded from backups and sync.${demo ? ' Demo imports do not store preferences.' : ''}</p></fieldset>` : '<p>Review the parsed issue fields before adding them. No service connection is needed.</p>'}
          <h4>First five rows</h4><div class="customer-table-scroll" tabindex="0" role="region" aria-label="Import preview table"><table class="customer-table"><thead><tr><th scope="col">Row</th><th scope="col">Title</th><th scope="col">Customer</th><th scope="col">Problem</th><th scope="col">Owner</th><th scope="col">Stage</th><th scope="col">Due date</th><th scope="col">Result</th></tr></thead><tbody>${preview.firstRows.map(entry => {
            const row = model.rows[entry.row - 1] || [];
            const value = field => row[mapping[field]] || '';
            return `<tr><th scope="row">${entry.row}</th><td>${escape(entry.title)}</td><td>${escape(value('customer'))}</td><td>${escape(value('problem'))}</td><td>${escape(value('owner'))}</td><td>${escape(entry.statusLabel || value('status'))}</td><td>${escape(value('dueDate'))}</td><td>${!entry.selected ? 'Skip duplicate' : entry.valid ? 'Add' : 'Fix errors'}</td></tr>`;
          }).join('')}</tbody></table></div>
          ${duplicates.length ? `<fieldset class="inbound-duplicates" ${busy ? 'disabled' : ''}><legend>Duplicate titles (${duplicates.length})</legend><p>Matching ignores capitalization and repeated spaces. Duplicates are skipped unless you explicitly import another copy.</p>${page.map(entry => `<label><input type="checkbox" data-import-duplicate="${entry.row}" ${importDuplicates.includes(entry.row) ? 'checked' : ''}>Import anyway: row ${entry.row} — ${escape(entry.title)}</label>`).join('')}${duplicates.length > 25 ? `<div class="data-actions"><button type="button" id="inboundPreviousDuplicates" ${duplicatePage === 0 ? 'disabled' : ''}>Previous duplicates</button><span>Page ${duplicatePage + 1} of ${Math.ceil(duplicates.length / 25)}</span><button type="button" id="inboundNextDuplicates" ${(duplicatePage + 1) * 25 >= duplicates.length ? 'disabled' : ''}>Next duplicates</button></div>` : ''}</fieldset>` : ''}
          ${warnings.length ? `<details><summary>Field and stage details (${warnings.length})</summary><ul>${warnings.map(message => `<li>${escape(message)}</li>`).join('')}</ul></details>` : ''}
          ${preview.errors.length ? `<div role="alert"><strong>${preview.errors.length} error${preview.errors.length === 1 ? '' : 's'} to resolve before importing</strong><ul>${preview.errors.slice(0, 20).map(entry => `<li>${entry.row ? `Row ${entry.row}: ` : ''}${escape(entry.message)}</li>`).join('')}</ul>${preview.errors.length > 20 ? '<p>Showing the first 20 errors. Correct the file and select it again.</p>' : ''}</div>` : ''}
          <p>Use a JSON backup when you need to restore a complete workspace.</p>
        </div>
        <footer class="inbound-import-footer"><p id="inboundImportSummary" role="status">${preview.addedCount} to add · ${preview.skippedCount} skipped · ${preview.entries.length} rows</p><p id="inboundImportError" role="alert">${escape(error)}</p><div class="data-actions"><button type="button" class="secondary" id="cancelInboundImport" ${busy ? 'disabled' : ''}>Cancel</button><button type="submit" class="primary" id="applyInboundImport" ${busy || !preview.valid || !preview.addedCount ? 'disabled' : ''}>${busy ? 'Importing…' : 'Apply import'}</button></div></footer>
      </form>`;
      dialog.querySelectorAll('[data-import-field]').forEach(select => select.addEventListener('change', () => {
        mapping = { ...mapping, [select.dataset.importField]: Number(select.value) };
        importDuplicates = []; duplicatePage = 0; error = ''; render(select.id);
      }));
      dialog.querySelector('#rememberImportMapping')?.addEventListener('change', event => { remember = event.currentTarget.checked; });
      dialog.querySelectorAll('[data-import-duplicate]').forEach(checkbox => checkbox.addEventListener('change', () => {
        const row = Number(checkbox.dataset.importDuplicate);
        importDuplicates = checkbox.checked ? [...importDuplicates, row] : importDuplicates.filter(value => value !== row);
        error = ''; render(); dialog.querySelector(`[data-import-duplicate="${row}"]`)?.focus();
      }));
      dialog.querySelector('#inboundPreviousDuplicates')?.addEventListener('click', () => { duplicatePage--; render('inboundNextDuplicates'); });
      dialog.querySelector('#inboundNextDuplicates')?.addEventListener('click', () => { duplicatePage++; render('inboundPreviousDuplicates'); });
      dialog.querySelector('#cancelInboundImport').addEventListener('click', () => close(false));
      dialog.querySelector('form').addEventListener('submit', async event => {
        event.preventDefault();
        if (busy || !preview.valid || !preview.addedCount) return;
        busy = true; error = ''; render();
        try {
          const result = await apply({ mapping: { ...mapping }, importDuplicates: [...importDuplicates] });
          let preferenceWarning = '';
          if (remember) { try { saveImportMapping(storage, model, mapping, demo); } catch { preferenceWarning = ' Column choices could not be saved on this device.'; } }
          busy = false; close({ ...result, preferenceWarning });
        } catch (failure) { busy = false; error = `Import stopped. ${failure.message} Your preview is retained; retry or cancel.`; render('inboundImportError'); }
      });
      if (focusId) { const target = dialog.querySelector(`#${focusId}`); if (target) { if (!target.matches('input,select,button')) target.tabIndex = -1; target.focus(); } }
    }
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(false); });
    render(); document.body.append(dialog); dialog.showModal(); dialog.querySelector('#cancelInboundImport').focus();
  });
}
