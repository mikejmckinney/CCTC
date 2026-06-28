import { useState } from 'react';
import type { ItemFlag, Question, FlagReason, BlueprintId, ExamMode } from '../types/exam';
import { getBlueprintLabel } from '../data/blueprints';

const FLAG_REASONS: FlagReason[] = [
  'factual error',
  'outdated policy/guideline',
  'ambiguous / >1 defensible answer',
  'typo / wording',
  'broken or wrong reference link',
  'other'
];

interface ReportedItemsProps {
  flags: ItemFlag[];
  bank: Question[];
  onBack: () => void;
  onExportFlags: () => void;
  onClearAll: () => void;
  onSaveFlag: (flag: ItemFlag) => void;
  onDeleteFlag: (flagId: string) => void;
}

export default function ReportedItems({ flags, bank, onBack, onExportFlags, onClearAll, onSaveFlag, onDeleteFlag }: ReportedItemsProps) {
  const [editingFlag, setEditingFlag] = useState<ItemFlag | null>(null);
  const [editReason, setEditReason] = useState<FlagReason>('factual error');
  const [editComment, setEditComment] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function openEdit(flag: ItemFlag) {
    setEditingFlag(flag);
    setEditReason(flag.reason);
    setEditComment(flag.comment);
  }

  function saveEdit() {
    if (!editingFlag) return;
    onSaveFlag({
      ...editingFlag,
      reason: editReason,
      comment: editComment,
      updatedAt: new Date().toISOString()
    });
    setEditingFlag(null);
  }

  function confirmDeleteFlag(flagId: string) {
    setConfirmDelete(flagId);
  }

  function executeDelete() {
    if (confirmDelete) {
      onDeleteFlag(confirmDelete);
      setConfirmDelete(null);
    }
  }

  return (
    <div className="dashboard-grid">
      <div className="card card-stack">
        <div className="card-header">
          <div>
            <p className="eyebrow">Structured review feedback</p>
            <h2>Reported items</h2>
          </div>
          <div className="btn-group">
            <button className="btn-secondary" onClick={onExportFlags} disabled={flags.length === 0}>Export</button>
            <button className="btn-ghost" onClick={onClearAll} disabled={flags.length === 0}>Clear all</button>
            <button className="btn-ghost" onClick={onBack}>Back</button>
          </div>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
          Use <strong>Export</strong> to download <code>cctc-flags.json</code> for SME review. Items are stored locally only.
        </p>

        {flags.length === 0 ? (
          <p className="status-card">No reported items yet.</p>
        ) : (
          Object.entries(
            flags.reduce<Record<string, ItemFlag[]>>((groups, flag) => {
              groups[flag.item_id] = [...(groups[flag.item_id] ?? []), flag];
              return groups;
            }, {})
          ).map(([itemId, itemFlags]) => {
            const question = bank.find((q) => q.id === itemId);
            return (
              <div key={itemId} className="history-list-card">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3>{itemId}</h3>
                  {question && <p style={{ fontSize: '0.82rem', marginBottom: '0.35rem' }}>{question.stem.slice(0, 120)}...</p>}
                  {itemFlags.map((flag) => (
                    <div key={flag.id} className="flag-row">
                      <p>
                        <strong>{flag.reason}</strong> · {flag.mode} · {getBlueprintLabel(flag.blueprint)}
                      </p>
                      <p>{flag.comment || 'No comment provided.'}</p>
                    </div>
                  ))}
                </div>
                <div className="btn-group" style={{ flexDirection: 'column', flexShrink: 0 }}>
                  <button className="btn-secondary" onClick={() => openEdit(itemFlags[0])}>Edit</button>
                  <button className="btn-ghost" onClick={() => confirmDeleteFlag(itemFlags[0].id)}>Delete</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Modal */}
      {editingFlag && (
        <section className="modal-backdrop" aria-label="Edit reported item">
          <div className="modal-card">
            <h2>Edit report for {editingFlag.item_id}</h2>
            <label className="form-label">
              Reason
              <select value={editReason} onChange={(e) => setEditReason(e.target.value as FlagReason)}>
                {FLAG_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="form-label">
              Comment
              <textarea rows={4} value={editComment} onChange={(e) => setEditComment(e.target.value)} />
            </label>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingFlag(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveEdit}>Save changes</button>
            </div>
          </div>
        </section>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <section className="modal-backdrop" aria-label="Confirm deletion">
          <div className="modal-card">
            <h2>Delete reported item?</h2>
            <p>This will permanently remove this report. This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-danger" onClick={executeDelete}>Delete</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
