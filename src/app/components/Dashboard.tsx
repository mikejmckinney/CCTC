import type { HistoryEntry, ActiveSession } from '../../types/exam';
import type { HistoryTrendSummary } from '../../lib/historyTrend';
import { formatTrendDelta } from '../../lib/historyTrend';
import { findWeakestDomain } from '../../lib/weakestDomain';

interface DashboardProps {
  history: HistoryEntry[];
  historyTrend: HistoryTrendSummary;
  activeSession: ActiveSession | null;
  onStartPractice: () => void;
  onResumeSession: () => void;
  onViewHistory: () => void;
}

export function Dashboard({
  history,
  historyTrend,
  activeSession,
  onStartPractice,
  onResumeSession,
  onViewHistory
}: DashboardProps) {
  const latest = history[0] ?? null;
  const weakest = findWeakestDomain(history);

  return (
    <>
      <section className="panel stack-gap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your readiness</p>
            <h2>Dashboard</h2>
          </div>
        </div>

        {latest ? (
          <div className="dashboard-snapshot">
            <div className="snapshot-stat">
              <p className="eyebrow">Latest practice estimate</p>
              <strong className={latest.result.estimatedPass ? 'text-success' : 'text-warning'}>
                {latest.result.percent}%
              </strong>
              <span className="field-hint">
                {latest.result.estimatedPass ? 'At or above' : 'Below'} your {latest.settings.targetThreshold}% target
              </span>
            </div>

            {historyTrend.averagePercent !== null && (
              <div className="snapshot-stat">
                <p className="eyebrow">Average</p>
                <strong>{historyTrend.averagePercent}%</strong>
                {historyTrend.recentDelta !== null && (
                  <span className="field-hint">{formatTrendDelta(historyTrend.recentDelta)} last session</span>
                )}
              </div>
            )}

            {weakest && weakest.total >= 3 && (
              <div className="snapshot-stat">
                <p className="eyebrow">Weakest domain</p>
                <strong>{weakest.categoryLabel}</strong>
                <span className="field-hint">{weakest.percent}% across {weakest.total} items</span>
              </div>
            )}
          </div>
        ) : (
          <p className="status-card">Complete your first practice session to see your readiness snapshot.</p>
        )}

        <div className="action-row">
          {activeSession && !activeSession.submittedAt && (
            <button className="secondary-button" onClick={onResumeSession}>
              Resume
            </button>
          )}
          <button className="primary-button" onClick={onStartPractice}>
            Start practice
          </button>
        </div>

        {history.length > 0 && (
          <button className="text-link-button" onClick={onViewHistory}>
            View full history and trends
          </button>
        )}
      </section>

      {weakest && weakest.total >= 3 && (
        <section className="panel stack-gap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Focus areas</p>
              <h2>Where to improve</h2>
            </div>
          </div>
          <p className="field-hint">
            Your lowest-scoring domain across all completed sessions. Focus your next practice here for the biggest gains.
          </p>
          <div className="weakest-domain-card">
            <h3>{weakest.categoryLabel}</h3>
            <p>{weakest.percent}% correct over {weakest.total} items</p>
          </div>
        </section>
      )}
    </>
  );
}
