import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBlueprintLabel } from '../data/blueprints';
import type { HistoryEntry, SessionItemSnapshot, ItemFlag, FlagReason, BlueprintId, ExamMode, Question } from '../types/exam';

const FLAG_REASONS: FlagReason[] = [
  'factual error',
  'outdated policy/guideline',
  'ambiguous / >1 defensible answer',
  'typo / wording',
  'broken or wrong reference link',
  'other',
];

interface SessionReviewProps {
  history: HistoryEntry[];
  flags: ItemFlag[];
  onSaveFlag: (flag: ItemFlag) => void;
}

export default function SessionReview({ history, flags, onSaveFlag }: SessionReviewProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const entry = history.find((h) => h.id === id);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [flagDraft, setFlagDraft] = useState<{
    item: Question;
    sessionId: string;
    blueprint: BlueprintId;
    mode: ExamMode;
    reason: FlagReason;
    comment: string;
  } | null>(null);

  if (!entry) {
    return (
      <div className="stack">
        <div className="empty-state">
          <div className="empty-state__title">Session not found</div>
          <button className="btn btn-secondary" onClick={() => navigate('/history')}>Back to History</button>
        </div>
      </div>
    );
  }

  const currentItem = entry.items[reviewIndex];
  const answer = currentItem ? entry.answers[currentItem.itemId] : null;

  function handleSaveFlag() {
    if (!flagDraft) return;
    const existing = flags.find((f) => f.item_id === flagDraft.item.id);
    const now = new Date().toISOString();
    const flag: ItemFlag = {
      id: existing?.id ?? crypto.randomUUID(),
      item_id: flagDraft.item.id,
      version: flagDraft.item.version ?? 1,
      status: flagDraft.item.status,
      reason: flagDraft.reason,
      comment: flagDraft.comment,
      session_id: flagDraft.sessionId,
      blueprint: flagDraft.blueprint,
      mode: flagDraft.mode,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    onSaveFlag(flag);
    setFlagDraft(null);
  }

  return (
    <div className="stack">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Session Review</h1>
          <p className="page-desc">
            {getBlueprintLabel(entry.settings.blueprintId)} · {new Date(entry.completedAt).toLocaleString()} ·{' '}
            {entry.settings.mode} mode
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/history')}>Back to History</button>
      </div>

      {/* Score summary */}
      <div className="card" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div className="stat-value">{entry.result.percent}%</div>
          <div className="stat-label">{entry.result.correct}/{entry.result.total} correct</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
          Duration: {formatDuration(entry.timeUsedSeconds)} · Blueprint: {getBlueprintLabel(entry.settings.blueprintId)}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span className={`badge badge-${entry.result.estimatedPass ? 'success' : 'danger'}`}>
            {entry.result.estimatedPass ? 'Pass estimate' : 'Below target'}
          </span>
        </div>
      </div>

      {/* Domain breakdown */}
      <div className="card">
        <div className="card-header">
          <div className="card-subtitle">Domains</div>
          <div className="card-title">Correct per Domain</div>
        </div>
        <div className="stack-sm">
          {entry.result.breakdown.map((b) => {
            const pct = b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0;
            return (
              <div key={b.categoryId} className="category-bar">
                <span className="category-bar__label">{b.categoryLabel}</span>
                <div className="category-bar__track">
                  <div
                    className="category-bar__fill"
                    style={{ width: `${pct}%`, background: pct < 60 ? 'var(--danger)' : pct >= 80 ? 'var(--success)' : 'var(--accent)' }}
                  />
                </div>
                <span className="category-bar__value">{b.correct}/{b.total}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Question review */}
      {currentItem && (
        <div className="card stack">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-accent">Item {reviewIndex + 1} of {entry.items.length}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setFlagDraft({
                item: currentItem.question,
                sessionId: entry.id,
                blueprint: entry.settings.blueprintId,
                mode: entry.settings.mode,
                reason: 'factual error',
                comment: '',
              })}
            >
              Report Item
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge badge-accent">{currentItem.categoryLabel}</span>
            <span className={answer === currentItem.question.correct ? 'badge badge-success' : 'badge badge-warning'}>
              {answer === currentItem.question.correct ? 'Correct' : 'Incorrect'}
            </span>
          </div>

          <p style={{ fontSize: 15, lineHeight: 1.6 }}>{currentItem.question.stem}</p>

          <div className="stack-sm">
            {currentItem.optionOrder.map((optId, idx) => {
              const opt = currentItem.question.options.find((o) => o.id === optId)!;
              const letter = String.fromCharCode(65 + idx);
              const selected = answer === opt.id;
              const correct = opt.id === currentItem.question.correct;
              return (
                <div
                  key={opt.id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: `1px solid ${correct ? 'var(--success)' : selected ? 'var(--danger)' : 'var(--border)'}`,
                    background: correct ? 'var(--success-soft)' : selected ? 'var(--danger-soft)' : 'var(--surface)',
                    display: 'flex',
                    gap: 10,
                    fontSize: 14,
                  }}
                >
                  <span style={{ fontWeight: 700, minWidth: 20 }}>{letter}.</span>
                  <span>{opt.text}</span>
                </div>
              );
            })}
          </div>

          <div className="notice notice-info">
            <p><strong>Correct ({String.fromCharCode(65 + currentItem.optionOrder.indexOf(currentItem.question.correct))}):</strong> {currentItem.question.explanation.rationale_correct}</p>
            {currentItem.question.options.filter((o) => o.id !== currentItem.question.correct).map((o) => {
              const r = currentItem.question.explanation.rationale_incorrect?.[o.id];
              if (!r) return null;
              return <p key={o.id} style={{ fontSize: 13, marginTop: 4 }}><strong>{String.fromCharCode(65 + currentItem.optionOrder.indexOf(o.id))}:</strong> {r}</p>;
            })}
          </div>

          {currentItem.question.references.length > 0 && (
            <div style={{ fontSize: 13 }}>
              <strong>References:</strong>
              <ul style={{ paddingLeft: 20, marginTop: 4 }}>
                {currentItem.question.references.map((ref) => (
                  <li key={ref.citation}>
                    {ref.url ? <a href={ref.url} target="_blank" rel="noreferrer">{ref.citation}</a> : ref.citation}
                    {ref.locator && <span style={{ color: 'var(--fg-muted)' }}> — {ref.locator}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => setReviewIndex((i) => Math.max(0, i - 1))} disabled={reviewIndex === 0}>
              Previous
            </button>
            <button className="btn btn-secondary" onClick={() => setReviewIndex((i) => Math.min(entry.items.length - 1, i + 1))} disabled={reviewIndex === entry.items.length - 1}>
              Next
            </button>
          </div>
        </div>
      )}

      {/* Flag modal */}
      {flagDraft && (
        <div className="modal-backdrop" onClick={() => setFlagDraft(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Report Item</h2>
            <div className="stack">
              <div className="form-group">
                <label className="form-label">Reason</label>
                <select className="form-select" value={flagDraft.reason} onChange={(e) => setFlagDraft({ ...flagDraft, reason: e.target.value as FlagReason })}>
                  {FLAG_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Comment</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={flagDraft.comment}
                  onChange={(e) => setFlagDraft({ ...flagDraft, comment: e.target.value })}
                  placeholder="Describe the issue..."
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setFlagDraft(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveFlag}>Save Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}
