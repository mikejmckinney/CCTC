import type { HistoryEntry } from '../../types/exam';
import { formatDuration } from '../lib/helpers';
import { QuestionReview } from './QuestionReview';

interface HistoryDetailProps {
  selectedHistory: HistoryEntry;
  reviewIndex: number;
  setReviewIndex: (index: number) => void;
  setView: (view: 'history') => void;
  openCategoryTrend: (categoryId: string) => void;
  openFlagComposer: (item: import('../../types/exam').Question, sessionId: string, blueprint: import('../../types/exam').BlueprintId, mode: import('../../types/exam').ExamMode) => void;
}

export function HistoryDetail({
  selectedHistory,
  reviewIndex,
  setReviewIndex,
  setView,
  openCategoryTrend,
  openFlagComposer
}: HistoryDetailProps) {
  const selectedHistoryItem = selectedHistory.items[reviewIndex];

  return (
    <>
      <section className="panel panel--span-2 stack-gap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Session review</p>
            <h2>
              {selectedHistory.result.correct}/{selectedHistory.result.total} correct · {selectedHistory.result.percent}%
            </h2>
          </div>
          <button className="secondary-button" onClick={() => setView('history')}>
            Back to history
          </button>
        </div>
        <p className="field-hint">Keyboard: use Left/Right arrow keys to move between items. Click a category card to open its trend chart.</p>

        <div className="notice-block">
          <p>
            Unofficial practice estimate: {selectedHistory.result.estimatedPass ? 'at or above' : 'below'} your {selectedHistory.settings.targetThreshold}% target.
          </p>
          <p>Time used: {formatDuration(selectedHistory.timeUsedSeconds)}</p>
        </div>

        <div className="breakdown-grid">
          {selectedHistory.result.breakdown.map((entry) => (
            <button
              key={entry.categoryId}
              type="button"
              className="summary-card summary-card--interactive"
              onClick={() => openCategoryTrend(entry.categoryId)}
            >
              <h3>{entry.categoryLabel}</h3>
              <p>
                {entry.correct} / {entry.total} correct
              </p>
              <span className="field-hint">View category trend</span>
            </button>
          ))}
        </div>

        <div className="action-row action-row--spread">
          <button className="secondary-button" onClick={() => setReviewIndex(Math.max(reviewIndex - 1, 0))} disabled={reviewIndex === 0}>
            Previous item
          </button>
          <button
            className="ghost-button"
            onClick={() => openFlagComposer(selectedHistoryItem.question, selectedHistory.id, selectedHistory.settings.blueprintId, selectedHistory.settings.mode)}
          >
            Flag this item
          </button>
          <button
            className="secondary-button"
            onClick={() => setReviewIndex(Math.min(reviewIndex + 1, selectedHistory.items.length - 1))}
            disabled={reviewIndex === selectedHistory.items.length - 1}
          >
            Next item
          </button>
        </div>

        {selectedHistoryItem && (
          <QuestionReview item={selectedHistoryItem} answer={selectedHistory.answers[selectedHistoryItem.itemId]} />
        )}
      </section>

      <section className="panel stack-gap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Category totals</p>
            <h2>Breakdown</h2>
          </div>
        </div>
        <ul className="plain-list">
          {selectedHistory.result.breakdown.map((entry) => (
            <li key={entry.categoryId}>
              <button type="button" className="text-link-button" onClick={() => openCategoryTrend(entry.categoryId)}>
                {entry.categoryLabel}: {entry.correct}/{entry.total}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
