import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../app/AppContext';
import type { ItemFlag } from '../types/exam';

export function ReportedItemsPage() {
  const navigate = useNavigate();
  const { flags, clearFlagById, exportFlags, resetFlags, openFlagComposer, allQuestions } = useApp();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  function handleDelete(flagId: string) {
    setConfirmDelete(flagId);
  }

  function confirmDeleteAction() {
    if (confirmDelete) {
      void clearFlagById(confirmDelete);
      setConfirmDelete(null);
    }
  }

  function handleClearAll() {
    setConfirmClearAll(true);
  }

  function confirmClearAllAction() {
    void resetFlags();
    setConfirmClearAll(false);
  }

  return (
    <div className="app-content">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 820 }}>
        {/* Confirm dialogs */}
        {confirmDelete && (
          <section className="modal-backdrop" aria-label="Confirm delete">
            <div className="modal-card confirm-dialog">
              <h2>Delete reported item?</h2>
              <p>This will permanently remove this reported item. This action cannot be undone.</p>
              <div className="confirm-dialog__actions">
                <button className="ghost-button" onClick={() => setConfirmDelete(null)}>Cancel</button>
                <button className="primary-button" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={confirmDeleteAction}>
                  Delete
                </button>
              </div>
            </div>
          </section>
        )}

        {confirmClearAll && (
          <section className="modal-backdrop" aria-label="Confirm clear all">
            <div className="modal-card confirm-dialog">
              <h2>Clear all reported items?</h2>
              <p>This will permanently remove all {flags.length} reported items. This action cannot be undone.</p>
              <div className="confirm-dialog__actions">
                <button className="ghost-button" onClick={() => setConfirmClearAll(false)}>Cancel</button>
                <button className="primary-button" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={confirmClearAllAction}>
                  Clear All
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="card stack-gap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Reported items</p>
              <h2 style={{ fontSize: '1.1rem' }}>Reported Items</h2>
            </div>
            <div className="action-row">
              <button className="secondary-button" onClick={() => void exportFlags()} disabled={flags.length === 0} style={{ fontSize: '0.8rem', minHeight: 'auto', padding: '0.4rem 0.75rem' }}>
                Export JSON
              </button>
              <button className="ghost-button" onClick={handleClearAll} disabled={flags.length === 0} style={{ fontSize: '0.8rem', minHeight: 'auto', padding: '0.4rem 0.75rem' }}>
                Clear all
              </button>
            </div>
          </div>

          <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
            Items you've reported during exam or review sessions. Export as JSON to share with your SME reviewer.
          </p>

          {flags.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No reported items yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {groupFlagsByItem(flags).map(([itemId, itemFlags]) => (
                <article key={itemId} className="history-card">
                  <div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{itemId}</h3>
                    {itemFlags.map((flag) => (
                      <div key={flag.id} className="flag-row">
                        <p style={{ fontSize: '0.82rem' }}>
                          <strong>{flag.reason}</strong> · {flag.mode} · {new Date(flag.updatedAt).toLocaleDateString()}
                        </p>
                        <p style={{ fontSize: '0.82rem' }}>{flag.comment || 'No comment provided.'}</p>
                      </div>
                    ))}
                  </div>
                  <div className="action-row action-row--column" style={{ flexShrink: 0 }}>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        const firstFlag = itemFlags[0];
                        const question = allQuestions.find((q) => q.id === firstFlag.item_id);
                        if (question) {
                          openFlagComposer(question, firstFlag.session_id, firstFlag.blueprint, firstFlag.mode);
                        }
                      }}
                      style={{ fontSize: '0.8rem', minHeight: 'auto', padding: '0.4rem 0.75rem' }}
                    >
                      Edit
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => handleDelete(itemFlags[0].id)}
                      style={{ fontSize: '0.8rem', minHeight: 'auto', padding: '0.4rem 0.75rem', color: 'var(--danger)' }}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function groupFlagsByItem(flags: ItemFlag[]): [string, ItemFlag[]][] {
  const groups = new Map<string, ItemFlag[]>();
  for (const flag of flags) {
    const existing = groups.get(flag.item_id) ?? [];
    existing.push(flag);
    groups.set(flag.item_id, existing);
  }
  return Array.from(groups.entries());
}
