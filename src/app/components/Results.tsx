import type { HistoryEntry } from '../../types/exam';
import { formatDuration } from '../lib/helpers';
import { findWeakestDomain } from '../../lib/weakestDomain';

interface ResultsProps {
  result: HistoryEntry;
  onReviewAnswers: () => void;
  onDrillWeakest: (categoryId: string) => void;
  onGoHome: () => void;
}

export function Results({ result, onReviewAnswers, onDrillWeakest, onGoHome }: ResultsProps) {
  const weakest = findWeakestDomain([result]);

  return (
    <>
      <section className="panel stack-gap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Practice complete</p>
            <h2>Results</h2>
          </div>
        </div>

        <div className="results-hero">
          <div className="results-hero__score">
            <strong className="results-hero__percent">{result.result.percent}%</strong>
            <span className="field-hint">
              {result.result.correct} of {result.result.total} correct
            </span>
          </div>
          <div className="results-hero__estimate">
            <p className={result.result.estimatedPass ? 'text-success' : 'text-warning'}>
              {result.result.estimatedPass ? 'At or above' : 'Below'} your {result.settings.targetThreshold}% target
            </p>
            <span className="field-hint">
              Unofficial practice estimate
            </span>
          </div>
          {result.timeUsedSeconds !== null && (
            <div className="results-hero__time">
              <p>{formatDuration(result.timeUsedSeconds)}</p>
              <span className="field-hint">Time used</span>
            </div>
          )}
        </div>

        <div className="action-row">
          <button className="primary-button" onClick={onReviewAnswers}>
            Review answers
          </button>
          <button className="ghost-button" onClick={onGoHome}>
            Back to home
          </button>
        </div>
      </section>

      <section className="panel stack-gap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Domain breakdown</p>
            <h2>Performance by domain</h2>
          </div>
        </div>

        <div className="breakdown-grid">
          {result.result.breakdown.map((entry) => {
            const isWeakest = weakest?.categoryId === entry.categoryId && entry.total > 0;
            const percent = entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0;

            return (
              <div
                key={entry.categoryId}
                className={`breakdown-card ${isWeakest ? 'breakdown-card--weakest' : ''}`}
              >
                <h3>{entry.categoryLabel}</h3>
                <p className="breakdown-card__score">{percent}%</p>
                <p className="field-hint">{entry.correct} / {entry.total} correct</p>
                {isWeakest && (
                  <button
                    className="secondary-button breakdown-card__drill"
                    onClick={() => onDrillWeakest(entry.categoryId)}
                  >
                    Drill this domain
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
