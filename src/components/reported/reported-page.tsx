import { useState } from 'react';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import type { ItemFlag, Question } from '../../types/exam';
import type { FlagReason } from '../../types/exam';

const FLAG_REASONS: FlagReason[] = [
  'factual error',
  'outdated policy/guideline',
  'ambiguous / >1 defensible answer',
  'typo / wording',
  'broken or wrong reference link',
  'other'
];

interface ReportedPageProps {
  flags: ItemFlag[];
  questions: Question[];
  onBack: () => void;
  onUpdateFlag: (flag: ItemFlag) => void;
  onDeleteFlag: (flagId: string) => void;
  onClearAll: () => void;
}

export function ReportedPage({ flags, questions, onBack, onUpdateFlag, onDeleteFlag, onClearAll }: ReportedPageProps) {
  const [editingFlag, setEditingFlag] = useState<ItemFlag | null>(null);
  const [editReason, setEditReason] = useState<FlagReason>('factual error');
  const [editComment, setEditComment] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  function startEdit(flag: ItemFlag) {
    setEditingFlag(flag);
    setEditReason(flag.reason);
    setEditComment(flag.comment);
  }

  function saveEdit() {
    if (!editingFlag) return;
    onUpdateFlag({
      ...editingFlag,
      reason: editReason,
      comment: editComment,
      updatedAt: new Date().toISOString()
    });
    setEditingFlag(null);
  }

  // Group flags by item_id
  const grouped = flags.reduce<Record<string, ItemFlag[]>>((acc, flag) => {
    acc[flag.item_id] = [...(acc[flag.item_id] ?? []), flag];
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-text-muted hover:text-text">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-text">Reported Items</h1>
          <span className="text-sm text-text-muted">({flags.length})</span>
        </div>
        {flags.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmClearAll(true)}
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Empty state */}
      {flags.length === 0 && (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">No reported items. Use the "Report" button during a session to flag items for review.</p>
        </div>
      )}

      {/* Clear all confirmation */}
      {confirmClearAll && (
        <div className="rounded-lg border border-error/30 bg-error/5 p-4">
          <p className="mb-3 text-sm text-text">Clear all {flags.length} reported items? This cannot be undone.</p>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={() => { onClearAll(); setConfirmClearAll(false); }}>
              Clear All
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmClearAll(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Flag list */}
      {Object.entries(grouped).map(([itemId, itemFlags]) => {
        const question = questions.find((q) => q.id === itemId);
        return (
          <div key={itemId} className="rounded-lg border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-5 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-text">{itemId}</span>
                  {question && (
                    <span className="ml-2 text-xs text-text-muted">
                      Domain {question.domain} · {question.type === 'one_best' ? 'Single best' : 'Complex combo'}
                    </span>
                  )}
                </div>
              </div>
              {question && (
                <p className="mt-1 text-xs text-text-secondary line-clamp-2">{question.stem}</p>
              )}
            </div>

            <div className="divide-y divide-border">
              {itemFlags.map((flag) => (
                <div key={flag.id} className="px-5 py-3">
                  {editingFlag?.id === flag.id ? (
                    /* Edit mode */
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-text">Reason</label>
                        <select
                          className="input-field"
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value as FlagReason)}
                        >
                          {FLAG_REASONS.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-text">Comment</label>
                        <textarea
                          className="input-field"
                          rows={3}
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit}>Save</Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingFlag(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    /* Display mode */
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-text">{flag.reason}</span>
                          <span className="text-[10px] text-text-muted">· {flag.mode} · {flag.blueprint === 'cctc-from-2026-07' ? '2026-07' : 'Legacy'}</span>
                        </div>
                        {flag.comment && (
                          <p className="mt-1 text-xs text-text-secondary">{flag.comment}</p>
                        )}
                        <p className="mt-1 text-[10px] text-text-muted">
                          {new Date(flag.updatedAt).toLocaleDateString()} {new Date(flag.updatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(flag)}
                          className="rounded p-1.5 text-text-muted hover:bg-surface-muted hover:text-text"
                          aria-label="Edit report"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {confirmDelete === flag.id ? (
                          <div className="flex items-center gap-1">
                            <Button variant="destructive" size="sm" onClick={() => { onDeleteFlag(flag.id); setConfirmDelete(null); }}>
                              Delete
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(flag.id)}
                            className="rounded p-1.5 text-text-muted hover:bg-error/10 hover:text-error"
                            aria-label="Delete report"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
