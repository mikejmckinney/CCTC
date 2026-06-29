import type { HistoryEntry } from '../../types/exam';

interface ResultsViewProps {
  entry: HistoryEntry;
  onReview: () => void;
  onRetake: () => void;
  onHome: () => void;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'Untimed';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((p) => String(p).padStart(2, '0')).join(':');
}

export function ResultsView({ entry, onReview, onRetake, onHome }: ResultsViewProps) {
  const { result, settings } = entry;
  const passed = result.estimatedPass;

  return (
    <div className="stack stack--gap-lg">
      <div className="results-hero">
        <p className="eyebrow-text" style={{ color: 'rgba(255,255,255,0.7)' }}>{settings.mode === 'exam' ? 'Exam' : 'Study'} session complete</p>
        <div className="results-hero__big">{result.percent}%</div>
        <p className="results-hero__detail">{result.correct} of {result.total} correct</p>
        <p className="results-hero__detail">Time used: {formatDuration(entry.timeUsedSeconds)}</p>
        <span className={`badge badge--${passed ? 'success' : 'danger'}`} style={{ marginTop: 8 }}>
          {passed ? `At or above ${settings.targetThreshold}% target` : `Below ${settings.targetThreshold}% target`}
        </span>
      </div>

      <div className="card card--panel stack stack--gap">
        <p className="eyebrow">By domain</p>
        {result.breakdown.map((bd) => {
          const pct = bd.total > 0 ? Math.round((bd.correct / bd.total) * 100) : 0;
          return (
            <div key={bd.categoryId} className="focus-bar-row">
              <span className="focus-bar-label">{bd.categoryLabel}</span>
              <div className="focus-bar-track">
                <div
                  className="focus-bar-fill"
                  style={{
                    width: `${pct}%`,
                    background: pct >= 75 ? 'var(--teal)' : pct >= 65 ? 'var(--gold)' : 'var(--danger)'
                  }}
                />
              </div>
              <span className="focus-bar-value">{bd.correct}/{bd.total}</span>
            </div>
          );
        })}
      </div>

      <div className="action-row">
        <button className="btn-primary" onClick={onReview}>Review answers</button>
        <button className="btn-secondary" onClick={onRetake}>Retake same settings</button>
        <button className="btn-ghost" onClick={onHome}>Home</button>
      </div>
    </div>
  );
}
