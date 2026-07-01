import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentEMA, calcDomainStrengths, getReadinessAdvice } from '../lib/ema';
import { getBlueprintLabel } from '../data/blueprints';
import type { HistoryEntry, ActiveSession } from '../types/exam';

interface DashboardProps {
  history: HistoryEntry[];
  activeSession: ActiveSession | null;
  onStartSession: (mode: 'full' | 'quick' | 'weak' | 'resume') => void;
}

export default function Dashboard({ history, activeSession, onStartSession }: DashboardProps) {
  const navigate = useNavigate();
  const ema = useMemo(() => getCurrentEMA(history), [history]);
  const domainStrengths = useMemo(() => calcDomainStrengths(history), [history]);
  const advice = useMemo(() => getReadinessAdvice(ema, domainStrengths), [ema, domainStrengths]);
  const recentSessions = useMemo(() => history.slice(0, 5), [history]);

  const weakDomains = domainStrengths.filter((d) => d.level === 'weak');
  const strongDomains = domainStrengths.filter((d) => d.level === 'strong');

  return (
    <div className="stack">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-desc">Your study overview and quick actions</p>
      </div>

      {/* Readiness + Am I Ready */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-subtitle">Readiness Score</div>
              <div className="card-title">EMA Progress</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <ReadinessRing value={ema} />
            <div className="stack-sm" style={{ flex: 1 }}>
              <div>
                <span className="stat-value">{ema}%</span>
                <span className="stat-label" style={{ display: 'block' }}>Exponential Moving Average</span>
              </div>
              {history.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                  Based on {history.length} session{history.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-subtitle">Insights</div>
              <div className="card-title">Am I Ready?</div>
            </div>
          </div>
          <div className="stack-sm">
            {advice.map((line, i) => (
              <p key={i} style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--fg)' }}>{line}</p>
            ))}
            {domainStrengths.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {weakDomains.length > 0 && (
                  <span className="badge badge-danger">Weak: {weakDomains.length}</span>
                )}
                {strongDomains.length > 0 && (
                  <span className="badge badge-success">Strong: {strongDomains.length}</span>
                )}
                <span className="badge badge-muted">Domains: {domainStrengths.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-subtitle">One-Click Start</div>
            <div className="card-title">Quick Start</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/setup')}>
            Advanced Setup
          </button>
        </div>
        <div className="quick-start-grid">
          <button className="quick-start-card" onClick={() => onStartSession('full')}>
            <div className="quick-start-card__icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>📋</div>
            <div className="quick-start-card__title">Full Exam</div>
            <div className="quick-start-card__desc">175 questions, timed, exam mode — simulate the real test</div>
          </button>
          <button className="quick-start-card" onClick={() => onStartSession('quick')}>
            <div className="quick-start-card__icon" style={{ background: 'var(--secondary-soft)', color: 'var(--secondary)' }}>⚡</div>
            <div className="quick-start-card__title">Quick Session</div>
            <div className="quick-start-card__desc">25 questions, untimed, study mode — rapid practice</div>
          </button>
          <button className="quick-start-card" onClick={() => onStartSession('weak')}>
            <div className="quick-start-card__icon" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>🎯</div>
            <div className="quick-start-card__title">Weak Areas</div>
            <div className="quick-start-card__desc">Focus on your weakest domains with spaced repetition</div>
          </button>
          <button
            className="quick-start-card"
            onClick={() => onStartSession('resume')}
            disabled={!activeSession || !!activeSession.submittedAt}
            style={{ opacity: !activeSession || activeSession.submittedAt ? 0.5 : 1 }}
          >
            <div className="quick-start-card__icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>▶</div>
            <div className="quick-start-card__title">Resume</div>
            <div className="quick-start-card__desc">
              {activeSession && !activeSession.submittedAt
                ? `Continue item ${activeSession.currentIndex + 1} of ${activeSession.items.length}`
                : 'No session in progress'}
            </div>
          </button>
        </div>
      </div>

      {/* Category Breakdown */}
      {domainStrengths.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-subtitle">Performance</div>
              <div className="card-title">Category Breakdown</div>
            </div>
          </div>
          <div className="stack-sm">
            {domainStrengths.map((d) => (
              <div key={d.categoryId} className="category-bar">
                <span className="category-bar__label">{d.categoryLabel}</span>
                <div className="category-bar__track">
                  <div
                    className="category-bar__fill"
                    style={{
                      width: `${d.ema}%`,
                      background: d.level === 'weak' ? 'var(--danger)' : d.level === 'strong' ? 'var(--success)' : 'var(--accent)',
                    }}
                  />
                </div>
                <span className="category-bar__value">{d.ema}%</span>
                <span className={`badge badge-${d.level === 'weak' ? 'danger' : d.level === 'strong' ? 'success' : 'muted'}`}>
                  {d.level}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Study Plan */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-subtitle">Recommendation</div>
            <div className="card-title">Study Plan</div>
          </div>
        </div>
        <div className="stack-sm">
          {history.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
              Complete your first session to get personalized study recommendations.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                {ema < 60
                  ? 'Your next action: Take a focused weak-areas session to build foundational knowledge.'
                  : ema < 80
                  ? 'Your next action: Mix full-length exams with targeted weak-area reviews.'
                  : 'Your next action: Take a timed full-length exam to verify readiness under pressure.'}
              </p>
              {weakDomains.length > 0 && (
                <div style={{ fontSize: 13 }}>
                  <strong>Priority domains:</strong>{' '}
                  {weakDomains.map((d) => d.categoryLabel).join(', ')}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-subtitle">History</div>
            <div className="card-title">Recent Sessions</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/history')}>
            View All
          </button>
        </div>
        {recentSessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">📊</div>
            <div className="empty-state__title">No sessions yet</div>
            <p style={{ fontSize: 13 }}>Start your first session to see history here.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Mode</th>
                <th>Questions</th>
                <th>Score</th>
                <th>Duration</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.map((entry) => (
                <tr key={entry.id} className="clickable-row" onClick={() => navigate(`/review/${entry.id}`)}>
                  <td>{new Date(entry.completedAt).toLocaleDateString()}</td>
                  <td><span className={`badge badge-${entry.settings.mode === 'exam' ? 'accent' : 'muted'}`}>{entry.settings.mode}</span></td>
                  <td>{entry.result.correct}/{entry.result.total}</td>
                  <td><strong>{entry.result.percent}%</strong></td>
                  <td>{formatDuration(entry.timeUsedSeconds)}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => { e.stopPropagation(); navigate(`/review/${entry.id}`); }}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ReadinessRing({ value }: { value: number }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value < 60 ? 'var(--danger)' : value < 80 ? 'var(--accent)' : 'var(--success)';

  return (
    <div className="readiness-ring">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--surface-muted)" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      <div className="readiness-ring__label">
        <span className="readiness-ring__value" style={{ color }}>{value}%</span>
        <span className="readiness-ring__text">Ready</span>
      </div>
    </div>
  );
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}
