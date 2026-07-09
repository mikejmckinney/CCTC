import type { ActiveSession, SessionSettings } from '../../types/exam';
import type { ReadinessResult, FocusArea, WeakDomain, RecentSession, ReadinessInsight } from '../../lib/readiness';

interface DashboardViewProps {
  activeSession: ActiveSession | null;
  settings: SessionSettings;
  readiness: ReadinessResult;
  scoreTrendPoints: Array<{ id: string; percent: number; label: string; belowTarget: boolean }>;
  focusAreas: FocusArea[];
  weakDomains: WeakDomain[];
  recentSessions: RecentSession[];
  readinessInsight: ReadinessInsight;
  daysToExam: number | null;
  examDateText: string | null;
  lastCustomSettings?: SessionSettings;
  onStartSession: () => void;
  onResumeSession: () => void;
  onNavigate: (view: 'setup' | 'review' | 'history') => void;
  onLaunchPreset: (preset: Partial<SessionSettings>) => void;
  onLaunchLastCustom: () => void;
  onLaunchWeakAreas: () => void;
  onSelectSession: (sessionId: string) => void;
}

function donutColor(percent: number): string {
  if (percent >= 75) return 'var(--teal)';
  if (percent >= 65) return 'var(--gold)';
  return 'var(--danger)';
}

function DonutChart({ percent }: { percent: number | null }) {
  const r = 34;
  const circumference = 2 * Math.PI * r;
  const fill = percent !== null ? (percent / 100) * circumference : 0;
  const offset = circumference - fill;

  return (
    <svg className="donut-svg" viewBox="0 0 80 80">
      <circle className="donut-empty" cx="40" cy="40" r={r} />
      {percent !== null && (
        <circle
          className="donut-fill"
          cx="40" cy="40" r={r}
          stroke={donutColor(percent)}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
        />
      )}
      <text className="donut-value" x="40" y="42" textAnchor="middle" dominantBaseline="central">
        {percent !== null ? `${percent}%` : '—'}
      </text>
    </svg>
  );
}

export function DashboardView({
  activeSession, settings, readiness, focusAreas, weakDomains,
  recentSessions, readinessInsight, daysToExam, examDateText,
  lastCustomSettings, onStartSession, onResumeSession, onNavigate,
  onLaunchPreset, onLaunchLastCustom, onLaunchWeakAreas, onSelectSession
}: DashboardViewProps) {
  const hasUnfinished = activeSession && !activeSession.submittedAt;

  return (
    <div className="stack stack--gap-lg">
      {/* Greeting + exam date */}
      <div>
        <h1>Welcome back</h1>
        <p className="field-hint" style={{ marginTop: 4 }}>
          {examDateText ?? (
            <button className="btn-ghost" style={{ padding: 0, minHeight: 'auto', fontSize: 12, color: 'var(--tealtext)' }}
              onClick={() => onNavigate('setup')}>
              Set your exam date
            </button>
          )}
          {' · '}{settings.questionSet === 'scenario' ? 'Scenario' : 'Standard'} bank
        </p>
      </div>

      {/* Resume banner */}
      {hasUnfinished && (
        <div className="resume-banner">
          <div className="resume-banner__content">
            <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Continue</p>
            <span className="resume-banner__text" style={{ color: '#fff', fontWeight: 600 }}>
              Resume your session
            </span>
            <span style={{ color: '#bfe0d6', marginLeft: 6 }}>
              · Item {(activeSession.currentIndex + 1)} of {activeSession.items.length}
            </span>
          </div>
          <button className="resume-banner__btn" onClick={onResumeSession} style={{ background: '#fff', color: '#123b3a', border: 'none' }}>Resume →</button>
        </div>
      )}

      {/* Main grid */}
      <div className="dashboard-grid">
        {/* Left column */}
          <div className="card card--panel" style={{ padding: 20 }}>
            {/* Donut / Readiness Header */}
            <div className="donut-wrap" style={{ paddingBottom: 18, borderBottom: '1px solid var(--line)' }}>
              <DonutChart percent={readiness.percent} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ font: '600 13px var(--sans)', color: 'var(--ink)' }}>Practice readiness</span>
                  <span className={`badge badge--${readinessInsight.status === 'on_track' ? 'success' : readinessInsight.status === 'nearly_ready' ? 'gold' : readinessInsight.status === 'below_target' ? 'danger' : ''}`} style={{ fontSize: '10.5px', padding: '2px 8px' }}>
                    {readinessInsight.status === 'not_measured' ? 'Not measured' :
                     readinessInsight.status === 'below_target' ? 'Below target' :
                     readinessInsight.status === 'nearly_ready' ? 'Nearly ready' : 'On track'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>Weighted recent exam average</div>
                {readiness.delta !== null && (
                  <div style={{
                    fontSize: 12,
                    fontWeight: 700,
                    marginTop: 9,
                    color: readiness.delta >= 0 ? 'var(--successtext)' : 'var(--dangertext)'
                  }}>
                    {readiness.delta > 0 ? `+${readiness.delta}` : readiness.delta} pts vs last week
                  </div>
                )}
              </div>
            </div>

            {/* Recommendation Insight */}
            <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink)', margin: 0 }}>{readinessInsight.verdict}</p>
              <button
                className="btn-primary"
                style={{
                  marginTop: 11,
                  padding: '9px 14px',
                  border: 'none',
                  borderRadius: 9,
                  background: 'var(--teal)',
                  color: '#fff',
                  font: '600 12.5px var(--sans)',
                  cursor: 'pointer',
                  alignSelf: 'flex-start'
                }}
                onClick={readinessInsight.weakestDomain ? onLaunchWeakAreas : onStartSession}
              >
                {readinessInsight.recommendedAction}
              </button>
            </div>

            {/* Focus areas header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '18px 0 14px' }}>
              <span style={{ font: '600 11px var(--sans)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Domains</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>recent performance · share of exam</span>
            </div>

            {/* Focus areas progress bars */}
            <div className="stack" style={{ gap: 14 }}>
              {focusAreas.map((area) => {
                const pct = area.pooledPercent;
                const target = settings.targetThreshold;
                let statusLabel = 'Weak';
                let statusColorClass = 'danger';
                let statusColor = 'var(--danger)';
                if (pct !== null) {
                  if (pct >= target) {
                    statusLabel = 'Strong';
                    statusColorClass = 'success';
                    statusColor = 'var(--success)';
                  } else if (pct >= target - 15) {
                    statusLabel = 'Developing';
                    statusColorClass = 'gold';
                    statusColor = 'var(--gold)';
                  }
                }

                const fillStyle = {
                  width: `${pct ?? 0}%`,
                  background: statusColor,
                  height: '100%',
                  borderRadius: 5,
                  transition: 'width 0.3s ease'
                };
                return (
                  <div key={area.categoryId}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--ink)', marginBottom: 6, gap: 10 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        Domain {area.categoryId} · {area.categoryShort}
                        <span className="focus-bar-chip only-desktop">
                          {area.examWeightPct}% of exam
                        </span>
                        <span className={`badge badge--${statusColorClass} only-mobile`} style={{ fontSize: '9px', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>
                          {statusLabel}
                        </span>
                      </span>
                      <span style={{ color: 'var(--muted)' }}>{pct !== null ? `${pct}%` : '—'}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 5, background: 'var(--goldsoft)', overflow: 'hidden' }}>
                      <div style={fillStyle} />
                    </div>
                  </div>
                );
              })}
            </div>
           </div>

        {/* Right: quick start */}
          <div className="card card--panel">
            <p className="eyebrow">Quick start</p>
            <button className="quick-card" onClick={() => onLaunchPreset({ mode: 'exam', questionCount: settings.blueprintId === 'cctc-from-2026-07' ? 175 : 150, timed: true, timeMinutes: 180 })}>
              <span className="quick-card__title">Full mock exam</span>
              <span className="quick-card__desc">All {settings.blueprintId === 'cctc-from-2026-07' ? 175 : 150} items · timed 180 min</span>
            </button>
            <button className="quick-card" onClick={() => onLaunchPreset({ mode: 'exam', questionCount: 25, timed: true, timeMinutes: 30 })}>
              <span className="quick-card__title">Quick exam</span>
              <span className="quick-card__desc">25 questions · 30 min · exam</span>
            </button>
            <button className="quick-card" onClick={onLaunchWeakAreas}>
              <span className="quick-card__title">Weak areas</span>
              <span className="quick-card__desc">
                {weakDomains.length > 0
                  ? `${weakDomains.length} domain${weakDomains.length > 1 ? 's' : ''} below target`
                  : 'All areas on target'}
              </span>
            </button>
            {lastCustomSettings && (
              <button className="quick-card" onClick={onLaunchLastCustom}>
                <span className="quick-card__title">Your last custom setup</span>
                <span className="quick-card__desc">
                  {lastCustomSettings.mode} · {lastCustomSettings.questionCount} q · {lastCustomSettings.timed ? `${lastCustomSettings.timeMinutes} min` : 'Untimed'}
                </span>
              </button>
            )}
            <button className="btn-ghost" style={{ justifyContent: 'flex-start', fontSize: 13, color: 'var(--tealtext)' }} onClick={() => onNavigate('setup')}>
              Customize a session →
            </button>
          </div>
      </div>

      {/* Recent sessions */}
      <div className="card card--panel">
        <div className="row row--spread">
          <p className="eyebrow">Recent sessions</p>
          <button className="btn-ghost" style={{ padding: 0, minHeight: 'auto', fontSize: 12, color: 'var(--tealtext)' }}
            onClick={() => onNavigate('history')}>
            View all history →
          </button>
        </div>
        {recentSessions.length === 0 ? (
          <p className="empty-state">No completed sessions yet.</p>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
            <table className="recent-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Questions</th>
                  <th>Score</th>
                  <th>Result</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((s) => (
                  <tr key={s.id} onClick={() => onSelectSession(s.id)}>
                    <td>{new Date(s.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                    <td><span className={`badge badge--${s.mode === 'exam' ? 'exam' : 'study'}`}>{s.mode}</span></td>
                    <td>{s.correct}/{s.total}</td>
                    <td style={{ color: donutColor(s.percent), fontWeight: 600 }}>{s.percent}%</td>
                    <td><span className={`badge badge--${s.resultLabel === 'Pass' ? 'success' : 'danger'}`}>{s.resultLabel}</span></td>
                    <td>{s.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
