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
          const fillStyle = {
            width: `${pct}%`,
            background: pct >= 75 ? 'var(--teal)' : pct >= 65 ? 'var(--gold)' : 'var(--danger)',
            height: '100%',
            borderRadius: 5,
            transition: 'width 0.3s ease'
          };
          return (
            <div key={bd.categoryId} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}>
                <span>Domain {bd.categoryId} · {bd.categoryLabel}</span>
                <span style={{ color: 'var(--muted)' }}>{bd.correct}/{bd.total} · {pct}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 5, background: 'var(--goldsoft)', overflow: 'hidden' }}>
                <div style={fillStyle} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="action-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={onReview} style={{ flex: 1, minWidth: 160 }}>Review answers</button>
        <button className="btn-secondary" onClick={onRetake}>Retake</button>
        <button className="btn-secondary" onClick={onHome}>Home</button>
      </div>
    </div>
  );
}
