import { useNavigate } from 'react-router-dom';
import type { HistoryEntry } from '../types/exam';

interface ResultsProps {
  entry: HistoryEntry;
}

export default function Results({ entry }: ResultsProps) {
  const navigate = useNavigate();
  const { result, settings } = entry;

  return (
    <div className="stack">
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1 className="page-title">Session Complete</h1>
        <p className="page-desc">
          {settings.mode === 'exam' ? 'Exam results' : 'Study session summary'}
        </p>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: 32 }}>
        <div className="stat-value" style={{ fontSize: 48, color: result.estimatedPass ? 'var(--success)' : 'var(--danger)' }}>
          {result.percent}%
        </div>
        <div style={{ fontSize: 15, marginTop: 8 }}>
          {result.correct} / {result.total} correct
        </div>
        <div style={{ marginTop: 12 }}>
          <span className={`badge badge-${result.estimatedPass ? 'success' : 'danger'}`}>
            {result.estimatedPass ? 'At or above' : 'Below'} your {settings.targetThreshold}% target
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-subtitle">Breakdown</div>
            <div className="card-title">Domain Results</div>
          </div>
        </div>
        <div className="stack-sm">
          {result.breakdown.map((b) => {
            const pct = b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0;
            return (
              <div key={b.categoryId} className="category-bar">
                <span className="category-bar__label">{b.categoryLabel}</span>
                <div className="category-bar__track">
                  <div
                    className="category-bar__fill"
                    style={{
                      width: `${pct}%`,
                      background: pct < 60 ? 'var(--danger)' : pct >= 80 ? 'var(--success)' : 'var(--accent)',
                    }}
                  />
                </div>
                <span className="category-bar__value">{b.correct}/{b.total}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/history')}>
          View History
        </button>
        <button className="btn btn-primary" onClick={() => navigate(`/review/${entry.id}`)}>
          Review Answers
        </button>
      </div>
    </div>
  );
}
