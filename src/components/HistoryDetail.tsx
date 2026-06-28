import { useState, useEffect } from 'react';
import type { HistoryEntry, Question, BlueprintId, ExamMode, ItemFlag, FlagReason } from '../types/exam';
import { getBlueprintLabel } from '../data/blueprints';
import { formatDuration, displayLetterForOptionId, incorrectRationalesForDisplay, References } from './SessionView';

interface HistoryDetailProps {
  entry: HistoryEntry;
  onBack: () => void;
  onOpenCategoryTrend: (categoryId: string) => void;
  onReportItem: (item: Question, sessionId: string, blueprint: BlueprintId, mode: ExamMode, existing?: ItemFlag) => void;
  flags: ItemFlag[];
}

export default function HistoryDetail({ entry, onBack, onOpenCategoryTrend, onReportItem, flags }: HistoryDetailProps) {
  const [reviewIndex, setReviewIndex] = useState(0);
  const currentItem = entry.items[reviewIndex];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setReviewIndex((c) => Math.max(c - 1, 0));
      }
      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault();
        setReviewIndex((c) => Math.min(c + 1, entry.items.length - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [entry]);

  if (!currentItem) return null;

  const answer = entry.answers[currentItem.itemId];

  return (
    <div className="dashboard-grid">
      <div className="card card-stack">
        <div className="card-header">
          <div>
            <p className="eyebrow">Session review</p>
            <h2>{entry.result.correct}/{entry.result.total} correct · {entry.result.percent}%</h2>
          </div>
          <button className="btn-secondary" onClick={onBack}>Back to history</button>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
          Keyboard: use Left/Right arrow keys to navigate. Click a category card to open its trend.
        </p>

        <div className="notice-block">
          <p>Unofficial practice estimate: {entry.result.estimatedPass ? 'at or above' : 'below'} your {entry.settings.targetThreshold}% target.</p>
          <p>Time used: {formatDuration(entry.timeUsedSeconds)}</p>
        </div>

        <div className="breakdown-grid">
          {entry.result.breakdown.map((bd) => (
            <button
              key={bd.categoryId}
              className="card card-interactive"
              onClick={() => onOpenCategoryTrend(bd.categoryId)}
              style={{ textAlign: 'left', padding: '0.85rem' }}
            >
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.92rem' }}>{bd.categoryLabel}</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{bd.correct} / {bd.total} correct</p>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent)' }}>View trend</span>
            </button>
          ))}
        </div>

        <div className="btn-group" style={{ justifyContent: 'space-between' }}>
          <button className="btn-secondary" onClick={() => setReviewIndex((c) => Math.max(c - 1, 0))} disabled={reviewIndex === 0}>
            Previous item
          </button>
          <button className="btn-ghost" onClick={() => {
            const existing = flags.find((f) => f.item_id === currentItem.question.id);
            onReportItem(currentItem.question, entry.id, entry.settings.blueprintId, entry.settings.mode, existing);
          }}>
            Report item
          </button>
          <button className="btn-secondary" onClick={() => setReviewIndex((c) => Math.min(c + 1, entry.items.length - 1))} disabled={reviewIndex === entry.items.length - 1}>
            Next item
          </button>
        </div>

        {/* Question card */}
        <article className="question-card">
          <div className="question-meta">
            <span className="badge badge-accent">{currentItem.categoryLabel}</span>
            <span className={`badge ${answer === currentItem.question.correct ? 'badge-success' : 'badge-warning'}`}>
              {answer === currentItem.question.correct ? 'Correct' : 'Review'}
            </span>
          </div>
          <p className="question-stem">{currentItem.question.stem}</p>
          {currentItem.question.elements && (
            <ol className="element-list">
              {currentItem.question.elements.map((el) => (
                <li key={el.id}><strong>{el.id}.</strong> {el.text}</li>
              ))}
            </ol>
          )}
          <div className="option-list">
            {currentItem.optionOrder.map((optionId, optionIndex) => {
              const option = currentItem.question.options.find((o) => o.id === optionId)!;
              const selected = answer === option.id;
              const correct = option.id === currentItem.question.correct;
              return (
                <div
                  key={option.id}
                  className={[
                    'option-button',
                    correct ? 'is-correct' : '',
                    selected && !correct ? 'is-incorrect' : '',
                    selected ? 'is-selected' : ''
                  ].filter(Boolean).join(' ')}
                >
                  <span className="option-letter">{String.fromCharCode('A'.charCodeAt(0) + optionIndex)}</span>
                  <span>{option.text}</span>
                </div>
              );
            })}
          </div>
          <div className="explanation-card">
            <p>
              <strong>Correct answer ({displayLetterForOptionId(currentItem.optionOrder, currentItem.question.correct)}):</strong>{' '}
              {currentItem.question.explanation.rationale_correct}
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {incorrectRationalesForDisplay(currentItem).map(({ displayLetter, rationale }) => (
                <li key={displayLetter}><strong>{displayLetter}:</strong> {rationale}</li>
              ))}
            </ul>
            <References question={currentItem.question} />
          </div>
        </article>
      </div>
    </div>
  );
}
