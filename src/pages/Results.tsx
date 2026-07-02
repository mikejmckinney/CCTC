import { useNavigate } from 'react-router-dom';
import { useApp } from '../app/AppContext';

export function ResultsPage() {
  const navigate = useNavigate();
  const { activeSession, history } = useApp();

  // If there's an active session that was just submitted, show its results
  // Otherwise show the most recent history entry
  const result = activeSession?.result ?? history[0]?.result;
  const session = activeSession ?? history[0];

  if (!result || !session) {
    return (
      <div className="app-content">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--muted)' }}>No results to display.</p>
          <button className="primary-button" onClick={() => navigate('/')} style={{ marginTop: '1rem' }}>Go to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-content">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 640, margin: '0 auto' }}>
        <section className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p className="eyebrow">Session Complete</p>
          <div style={{ fontSize: '3.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
            {result.percent}%
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0.5rem 0' }}>
            {result.correct} of {result.total} correct
          </p>
          <p style={{ fontWeight: 600, color: result.estimatedPass ? 'var(--success)' : 'var(--warning)' }}>
            {result.estimatedPass ? 'At or above' : 'Below'} your {session.settings.targetThreshold}% target
          </p>
        </section>

        <section className="card stack-gap">
          <p className="eyebrow">Domain breakdown</p>
          <div className="breakdown-grid">
            {result.breakdown.map((bd) => (
              <div key={bd.categoryId} className="summary-card">
                <h3 style={{ fontSize: '0.85rem' }}>{bd.categoryLabel}</h3>
                <p style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                  {bd.correct}/{bd.total}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="action-row" style={{ justifyContent: 'center' }}>
          <button className="primary-button" onClick={() => navigate('/')}>Back to Dashboard</button>
          <button className="secondary-button" onClick={() => navigate('/history')}>View History</button>
        </div>
      </div>
    </div>
  );
}
