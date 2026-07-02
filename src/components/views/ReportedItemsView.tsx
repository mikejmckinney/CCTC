import { useState } from 'react';
import { Edit3, Trash2, X, FileText } from 'lucide-react';
import type { ItemFlag, FlagReason } from '../../types/exam';
import { getBlueprintLabel } from '../../data/blueprints';

type View = 'dashboard' | 'setup' | 'history' | 'reported-items' | 'session' | 'session-review';

interface ReportedItemsViewProps {
  flags: ItemFlag[];
  onDelete: (flagId: string) => void;
  onEdit: (flag: ItemFlag) => void;
  onNavigate: (view: View) => void;
}

const FLAG_REASONS: FlagReason[] = [
  'factual error',
  'outdated policy/guideline',
  'ambiguous / >1 defensible answer',
  'typo / wording',
  'broken or wrong reference link',
  'other',
];

export function ReportedItemsView({ flags, onDelete, onEdit, onNavigate }: ReportedItemsViewProps) {
  const [deleteTarget, setDeleteTarget] = useState<ItemFlag | null>(null);
  const [editTarget, setEditTarget] = useState<ItemFlag | null>(null);
  const [editReason, setEditReason] = useState<FlagReason>('factual error');
  const [editComment, setEditComment] = useState('');

  function confirmDelete() {
    if (deleteTarget) {
      onDelete(deleteTarget.id);
      setDeleteTarget(null);
    }
  }

  function startEdit(flag: ItemFlag) {
    setEditTarget(flag);
    setEditReason(flag.reason);
    setEditComment(flag.comment);
  }

  function saveEdit() {
    if (editTarget) {
      onEdit({ ...editTarget, reason: editReason, comment: editComment });
      setEditTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
          Reported Items
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {flags.length} reported item{flags.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* List */}
      {flags.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border p-8 text-center"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <FileText className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No reported items yet. Flag questions during a session to report them.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {flags.map((flag) => (
            <div
              key={flag.id}
              className="flex items-start gap-4 rounded-2xl border p-4"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {flag.item_id}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ background: 'var(--surface-raised)', color: 'var(--text-muted)' }}
                  >
                    {getBlueprintLabel(flag.blueprint)}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ background: 'var(--surface-raised)', color: 'var(--text-muted)' }}
                  >
                    {flag.mode}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {flag.reason}
                </p>
                {flag.comment && (
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {flag.comment}
                  </p>
                )}
                <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Updated {new Date(flag.updatedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(flag)}
                  className="rounded-lg p-2 transition-colors hover:bg-[var(--surface-raised)]"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Edit"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(flag)}
                  className="rounded-lg p-2 transition-colors hover:bg-[var(--color-danger-light)]"
                  style={{ color: 'var(--color-danger)' }}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div
            className="w-full max-w-sm rounded-2xl border p-6 shadow-xl"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
              Delete Reported Item
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Remove <strong>{deleteTarget.item_id}</strong> from your reported items? This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-raised)]"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
                style={{ background: 'var(--color-danger)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div
            className="w-full max-w-md rounded-2xl border p-6 shadow-xl"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                Edit Report — {editTarget.item_id}
              </h2>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="rounded-lg p-1 transition-colors hover:bg-[var(--surface-raised)]"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  Reason
                </span>
                <select
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value as FlagReason)}
                  className="rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                >
                  {FLAG_REASONS.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  Comment
                </span>
                <textarea
                  rows={3}
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  className="resize-none rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                />
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-raised)]"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
