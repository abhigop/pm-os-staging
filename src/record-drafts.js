// Session-only: raw form values never enter workspace storage until an explicit save.
export function recordDraftKey(scope, initiativeId, editor) {
  return JSON.stringify([scope, initiativeId, editor.kind, editor.recordId || "", editor.convertFromRiskId || ""]);
}

export function recordDraftBaseline(item, editor) {
  const records = editor.convertFromRiskId ? item?.risks : editor.kind === "risk" ? item?.risks : item?.dependencies;
  const id = editor.convertFromRiskId || editor.recordId;
  return JSON.stringify(id ? records?.find(record => record.id === id) || null : null);
}

export function recordDraftSaveError(item, editor, scope) {
  if (editor.requiresReview) return "The previous save could not be confirmed. Your draft is retained. Download it, review the latest saved record, then discard this draft before making another change.";
  if (editor.scope !== scope) return "This draft belongs to another project or data source. Return there before saving.";
  if (!item || item.id !== editor.initiativeId) return "This initiative is unavailable. Download your draft before discarding it.";
  const current = recordDraftBaseline(item, editor);
  if ((editor.recordId || editor.convertFromRiskId) && current === "null") return "This record was deleted. Your draft is retained; download it before discarding. Saving cannot recreate a deleted record.";
  if (current !== editor.baseline) return "This record changed since editing began. Your draft is retained. Download or copy it, then Cancel to discard and reopen the latest saved record.";
  return "";
}
