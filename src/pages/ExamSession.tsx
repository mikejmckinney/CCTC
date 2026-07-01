import { useEffect, useRef } from 'react';
import type { ActiveSession, SessionItemSnapshot } from '../types/exam';

interface ExamSessionProps {
  session: ActiveSession;
  onAnswer: (optionId: string) => void;
  onNavigate: (direction: -1 | 1) => void;
  onGoTo: (index: number) => void;
  onToggleBookmark: () => void;
  onSubmit: () => void;
  isFinalizing: boolean;
}

export default function ExamSession({
  session,
  onAnswer,
  onNavigate,
  onGoTo,
  onToggleBookmark,
  onSubmit,
  isFinalizing,
}: ExamSessionProps) {
  const currentItem = session.items[session.currentIndex];
  const answeredCount = Object.values(session.answers).filter(Boolean).length;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); onNavigate(-1); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); onNavigate(1); }
      else if (e.key.length === 1 && currentItem) {
        const idx = e.key.toUpperCase().charCodeAt(0) - 65;
        if (idx >= 0 && idx < currentItem.optionOrder.length) {
          e.preventDefault();
          onAnswer(currentItem.optionOrder[idx]);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentItem, onAnswer, onNavigate]);

  if (!currentItem) return null;

  const isStudy = session.settings.mode === 'study';
  const isRevealed = isStudy ? session.revealed[currentItem.itemId] : Boolean(session.submittedAt);
  const selectedAnswer = session.answers[currentItem.itemId];

  return (
    <div className="stack">
      {/* Header bar */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="badge badge-accent">Q {session.currentIndex + 1}/{session.items.length}</span>
          <span className="badge badge-muted">Answered {answeredCount}</span>
          <span className="badge badge-muted">Remaining {session.items.length - answeredCount}</span>
          {session.flaggedForReview.length > 0 && (
            <span className="badge badge-warning">Bookmarks {session.flaggedForReview.length}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {session.settings.timed && session.remainingSeconds !== null && (
            <span className="badge badge-muted" style={{ fontFamily: 'var(--font-mono)' }}>
              {formatTimer(session.remainingSeconds)}
            </span>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onToggleBookmark}>
            {session.flaggedForReview.includes(currentItem.itemId) ? '★ Bookmarked' : '☆ Bookmark'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={onSubmit} disabled={isFinalizing}>
            {session.settings.mode === 'exam' ? 'Submit Exam' : 'Complete Session'}
          </button>
        </div>
      </div>

      {/* Question */}
      <div className="card stack">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="badge badge-accent">{currentItem.categoryLabel}</span>
          <span className={`badge badge-${currentItem.question.status === 'draft' ? 'warning' : 'success'}`}>
            {currentItem.question.status}
          </span>
          <span className="badge badge-muted">
            {currentItem.question.type === 'one_best' ? 'Single best' : 'Complex combo'}
          </span>
        </div>

        <p style={{ fontSize: 16, lineHeight: 1.6, fontWeight: 500 }}>{currentItem.question.stem}</p>

        {currentItem.question.elements && (
          <ol style={{ paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {currentItem.question.elements.map((el) => (
              <li key={el.id} style={{ fontSize: 14 }}>
                <strong>{el.id}.</strong> {el.text}
              </li>
            ))}
          </ol>
        )}

        <div className="stack-sm" role="radiogroup" aria-label="Answer choices">
          {currentItem.optionOrder.map((optionId, idx) => {
            const option = currentItem.question.options.find((o) => o.id === optionId)!;
            const letter = String.fromCharCode(65 + idx);
            const selected = selectedAnswer === option.id;
            const correct = option.id === currentItem.question.correct;
            const showCorrect = isRevealed && correct;
            const showIncorrect = isRevealed && selected && !correct;

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className="btn btn-secondary"
                style={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  padding: '12px 16px',
                  minHeight: 44,
                  borderColor: selected ? 'var(--accent)' : undefined,
                  background: showCorrect
                    ? 'var(--success-soft)'
                    : showIncorrect
                    ? 'var(--danger-soft)'
                    : selected
                    ? 'var(--accent-soft)'
                    : undefined,
                }}
                onClick={() => onAnswer(option.id)}
              >
                <span style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  background: selected ? 'var(--accent)' : 'var(--surface-muted)',
                  color: selected ? 'var(--accent-fg)' : 'var(--fg-muted)',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {letter}
                </span>
                <span style={{ fontSize: 14 }}>
                  {option.text}
                  {option.selects && (
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
                      Selects: {option.selects.join(', ')}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Explanation (study mode or after submit) */}
        {isRevealed && (
          <div className="notice notice-info" style={{ marginTop: 8 }}>
            <p style={{ marginBottom: 8 }}>
              <strong>Correct ({String.fromCharCode(65 + currentItem.optionOrder.indexOf(currentItem.question.correct))}):</strong>{' '}
              {currentItem.question.explanation.rationale_correct}
            </p>
            {currentItem.question.options
              .filter((o) => o.id !== currentItem.question.correct)
              .map((o) => {
                const rationale = currentItem.question.explanation.rationale_incorrect?.[o.id];
                if (!rationale) return null;
                const letter = String.fromCharCode(65 + currentItem.optionOrder.indexOf(o.id));
                return (
                  <p key={o.id} style={{ fontSize: 13, marginBottom: 4 }}>
                    <strong>{letter}:</strong> {rationale}
                  </p>
                );
              })}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <button className="btn btn-secondary" onClick={() => onNavigate(-1)} disabled={session.currentIndex === 0}>
          Previous
        </button>
        <button className="btn btn-secondary" onClick={() => onNavigate(1)} disabled={session.currentIndex === session.items.length - 1}>
          Next
        </button>
      </div>

      {/* Question navigator */}
      <div className="card">
        <div className="card-header">
          <div className="card-subtitle">Navigator</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {session.items.map((item, i) => {
            const answered = Boolean(session.answers[item.itemId]);
            const bookmarked = session.flaggedForReview.includes(item.itemId);
            const isCurrent = i === session.currentIndex;
            return (
              <button
                key={item.itemId}
                type="button"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  border: `1px solid ${isCurrent ? 'var(--accent)' : bookmarked ? 'var(--warning)' : 'var(--border)'}`,
                  background: isCurrent ? 'var(--accent)' : answered ? 'var(--success-soft)' : 'var(--surface)',
                  color: isCurrent ? 'var(--accent-fg)' : answered ? 'var(--success)' : 'var(--fg-muted)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={() => onGoTo(i)}
                aria-label={`Question ${i + 1}${answered ? ' (answered)' : ''}${bookmarked ? ' (bookmarked)' : ''}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((p) => String(p).padStart(2, '0')).join(':');
}
