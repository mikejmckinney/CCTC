import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ItemFlag, FlagReason, Question, BlueprintId, ExamMode } from '../types/exam';
import { getBlueprintLabel } from '../data/blueprints';

const FLAG_REASONS: FlagReason[] = [
  'factual error',
  'outdated policy/guideline',
  'ambiguous / >1 defensible answer',
  'typo / wording',
  'broken or wrong reference link',
  'other',
];

interface ReportedItemsProps {
  flags: ItemFlag[];
  allQuestions: Question[];
  onUpdateFlag: (flag: ItemFlag) => void;
  onDeleteFlag: (flagId: string) => void;
}

export default function ReportedItems({ flags, allQuestions, onUpdateFlag, onDeleteFlag }: ReportedItemsProps) {
  const navigate = useNavigate();
  const [editDraft, setEditDraft] = useState<{
    flagId: string;
    itemId: string;
    reason: FlagReason;
    comment: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function handleEdit(flag: ItemFlag) {
    setEditDraft({ flagId: flag.id, itemId: flag.item_id, reason: flag.reason, comment: flag.comment });
  }

  function handleSaveEdit() {
    if (!editDraft) return;
    const existing = flags.find((f) => f.id === editDraft.flagId);
    if (!existing) return;
    onUpdateFlag({
      ...existing,
      reason: editDraft.reason,
      comment: editDraft.comment,
      updatedAt: new Date().toISOString(),
    });
    setEditDraft(null);
  }

  function handleDelete(flagId: string) {
    onDeleteFlag(flagId);
    setDeleteConfirm(null);
  }

  // Group flags by item_id
  const grouped = new Map<string, ItemFlag[]>();
  for (const flag of flags) {
    const existing = grouped.get(flag.item_id) ?? [];
    existing.push(flag);
    grouped.set(flag.item_id, existing);
  }

  return (
    <div className="stack">
      <div className="page-header">
        <h1 className="page-title">Reported Items</h1>
        <p className="page-desc">Items you flagged for review — edit or delete reports here</p>
      </div>

      {grouped.size === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state__icon">🚩</div>
            <div className="empty-state__title">No reported items</div>
            <p style={{ fontSize: 13 }}>Flag items during sessions to see them here.</p>
          </div>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([itemId, itemFlags]) => {
          const question = allQuestions.find((q) => q.id === itemId);
          return (
            <div key={itemId} className="card stack">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="card-subtitle">Item {itemId}</div>
                  {question && <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>{question.stem.slice(0, 120)}...</p>}
                </div>
              </div>

              {itemFlags.map((flag) => (
                <div key={flag.id} style={{ padding: '12px 0', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{flag.reason}</div>
                      <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>
                        {flag.comment || 'No comment provided.'}
                      </p>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>
                        {getBlueprintLabel(flag.blueprint)} · {flag.mode} · {new Date(flag.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(flag)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(flag.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })
      )}

      {/* Edit modal */}
      {editDraft && (
        <div className="modal-backdrop" onClick={() => setEditDraft(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Edit Report</h2>
            <div className="stack">
              <div className="form-group">
                <label className="form-label">Reason</label>
                <select className="form-select" value={editDraft.reason} onChange={(e) => setEditDraft({ ...editDraft, reason: e.target.value as FlagReason })}>
                  {FLAG_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Comment</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={editDraft.comment}
                  onChange={(e) => setEditDraft({ ...editDraft, comment: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditDraft(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Delete Report?</h2>
            <p style={{ fontSize: 14 }}>This will permanently remove this report. This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
