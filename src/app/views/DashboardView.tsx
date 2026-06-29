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
      <text className="donut-value" x="40" y="37" textAnchor="middle" dominantBaseline="central">
        {percent !== null ? `${percent}%` : '—'}
      </text>
      <text className="donut-label" x="40" y="52" textAnchor="middle" dominantBaseline="central">
        readiness
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
        {/* Left: combined readiness + focus card */}
        <div className="card card--panel stack stack--gap">
          <div className="row row--spread" style={{ alignItems: 'flex-start' }}>
            <div>
              <p className="eyebrow">Practice readiness</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 8px' }}>Weighted recent exam average</p>
              <DonutChart percent={readiness.percent} />
            </div>
            {readiness.delta !== null && (
              <div style={{ textAlign: 'right' }}>
                <p className="eyebrow">Latest change</p>
                <strong style={{ fontSize: 16, fontFamily: 'var(--serif)' }}>
                  {readiness.delta > 0 ? '+' : ''}{readiness.delta} pts
                </strong>
              </div>
            )}
          </div>

          {/* Readiness insight */}
          <div className="readiness-insight">
            <span className={`badge badge--${readinessInsight.status === 'on_track' ? 'success' : readinessInsight.status === 'nearly_ready' ? 'gold' : readinessInsight.status === 'below_target' ? 'danger' : ''}`}>
              {readinessInsight.status === 'not_measured' ? 'Not measured' :
               readinessInsight.status === 'below_target' ? 'Below target' :
               readinessInsight.status === 'nearly_ready' ? 'Nearly ready' : 'On track'}
            </span>
            <p className="readiness-verdict">{readinessInsight.verdict}</p>
            <button className="btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={
              readinessInsight.weakestDomain ? onLaunchWeakAreas : onStartSession
            }>
              {readinessInsight.recommendedAction} →
            </button>
          </div>

          {/* Focus areas */}
          <div>
            <p className="eyebrow" style={{ marginBottom: 8 }}>Focus areas</p>
            <div className="stack stack--gap">
              {focusAreas.map((area) => (
                <div key={area.categoryId} className="focus-bar-row">
                  <span className="focus-bar-label">{area.categoryLabel}</span>
                  <div className="focus-bar-track">
                    <div
                      className="focus-bar-fill"
                      style={{
                        width: `${area.pooledPercent ?? 0}%`,
                        background: area.pooledPercent !== null ? donutColor(area.pooledPercent) : 'var(--line2)'
                      }}
                    />
                  </div>
                  <span className="focus-bar-value" style={{ color: area.pooledPercent !== null ? donutColor(area.pooledPercent) : 'var(--muted)' }}>
                    {area.pooledPercent !== null ? `${area.pooledPercent}%` : '—'}
                  </span>
                  <span className="focus-bar-chip">{area.examWeightPct}% of exam</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: quick start */}
        <div className="stack stack--gap">
          <div className="card card--panel stack stack--gap">
            <p className="eyebrow">Quick start</p>
            <button className="quick-card" onClick={() => onLaunchPreset({ mode: 'exam', questionCount: settings.blueprintId === 'cctc-from-2026-07' ? 175 : 150, timed: true, timeMinutes: 180 })}>
              <span className="quick-card__title">Full mock exam</span>
              <span className="quick-card__desc">175 questions · 180 min · exam</span>
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
      </div>

      {/* Recent sessions */}
      <div className="card card--panel stack stack--gap">
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
        )}
      </div>
    </div>
  );
}
