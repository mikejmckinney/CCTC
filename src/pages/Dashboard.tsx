import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../app/AppContext';
import { computeReadiness, getWeakAreaItemIds } from '../lib/readiness';
import { getBlueprintLabel } from '../data/blueprints';

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function ReadinessRing({ score, tier }: { score: number; tier: string }) {
  const r = 68;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;

  const tierColor = score >= 85 ? 'var(--success)' : score >= 70 ? 'var(--accent)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="readiness-ring">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
        <circle
          cx="80" cy="80" r={r} fill="none"
          stroke={tierColor} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="readiness-ring__score">
        <span className="readiness-score">{score}</span>
        <span className="readiness-tier" style={{ color: tierColor }}>{tier}</span>
      </div>
    </div>
  );
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'Untimed';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((p) => String(p).padStart(2, '0')).join(':');
}

export function Dashboard() {
  const navigate = useNavigate();
  const { history, activeSession, settings, beginNewSession } = useApp();

  const readiness = useMemo(() => computeReadiness(history), [history]);
  const recent5 = useMemo(() => [...history].sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 5), [history]);
  const hasIncomplete = activeSession && !activeSession.submittedAt;
  const examDaysLeft = settings.examDate ? daysUntil(settings.examDate) : null;

  function quickStartFull() {
    beginNewSession({ ...settings, questionCount: 150, mode: 'exam', timed: true, timeMinutes: 180 });
    navigate('/session');
  }

  function quickStartQuick() {
    beginNewSession({ ...settings, questionCount: 25, mode: 'study', timed: false });
    navigate('/session');
  }

  function quickStartWeak() {
    const weakIds = getWeakAreaItemIds(history, 30);
    beginNewSession({ ...settings, questionCount: 20, mode: 'study', timed: false }, weakIds);
    navigate('/session');
  }

  function quickStartLast() {
    beginNewSession();
    navigate('/session');
  }

  function resumeSession() {
    navigate('/session');
  }

  return (
    <div className="app-content">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Am I Ready + Readiness */}
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', padding: '1.5rem', alignItems: 'center' }}>
            <ReadinessRing score={readiness.score} tier={readiness.tier} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <p className="eyebrow">Am I Ready?</p>
              <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 600 }}>
                {readiness.trend === 'improving' ? '↑ Improving' : readiness.trend === 'declining' ? '↓ Behind' : '→ Steady'}
                {readiness.score > 0 && (
                  <span style={{ marginLeft: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--muted)' }}>
                    {readiness.score}% ready
                  </span>
                )}
              </h2>
              {examDaysLeft !== null && examDaysLeft > 0 && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--muted)', margin: 0 }}>
                  {examDaysLeft} day{examDaysLeft !== 1 ? 's' : ''} until exam
                </p>
              )}
              {examDaysLeft !== null && examDaysLeft <= 0 && examDaysLeft > -30 && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--warning)', margin: 0 }}>
                  Exam date passed
                </p>
              )}
              {readiness.suggestedFocus && (
                <div className="insight-box" style={{ marginTop: '0.75rem' }}>
                  <p><strong>Focus area:</strong> {readiness.suggestedFocus}</p>
                </div>
              )}
              {readiness.score === 0 && (
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: 0 }}>
                  Complete your first session to see readiness insights.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* KPI Strip */}
        <div className="kpi-strip">
          <div className="card kpi-card">
            <div className="kpi-card__value">{readiness.coverage}%</div>
            <div className="kpi-card__label">Coverage</div>
            <div className="kpi-card__bar"><div className="kpi-card__bar-fill" style={{ width: `${readiness.coverage}%` }} /></div>
          </div>
          <div className="card kpi-card">
            <div className="kpi-card__value">{readiness.mastery}%</div>
            <div className="kpi-card__label">Mastery</div>
            <div className="kpi-card__bar"><div className="kpi-card__bar-fill" style={{ width: `${readiness.mastery}%` }} /></div>
          </div>
          <div className="card kpi-card">
            <div className="kpi-card__value">{readiness.mockPerf}%</div>
            <div className="kpi-card__label">Mock Performance</div>
            <div className="kpi-card__bar"><div className="kpi-card__bar-fill" style={{ width: `${readiness.mockPerf}%` }} /></div>
          </div>
        </div>

        {/* Quick Start */}
        <section className="card stack-gap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">One-click start</p>
              <h2 style={{ fontSize: '1rem' }}>Quick Start</h2>
            </div>
          </div>
          {hasIncomplete && (
            <button className="quick-start-btn" onClick={resumeSession} style={{ borderColor: 'var(--accent)', borderWidth: 2 }}>
              <div className="quick-start-btn__icon"><PlayIcon /></div>
              <div>
                <div className="quick-start-btn__label">Resume Session</div>
                <div className="quick-start-btn__desc">Item {(activeSession.currentIndex ?? 0) + 1} of {activeSession.items.length}</div>
              </div>
            </button>
          )}
          <div className="quick-start-grid">
            <button className="quick-start-btn" onClick={quickStartFull}>
              <div className="quick-start-btn__icon">
                <ClipboardIcon />
              </div>
              <div>
                <div className="quick-start-btn__label">Full Exam</div>
                <div className="quick-start-btn__desc">150 questions, 3 hours</div>
              </div>
            </button>
            <button className="quick-start-btn" onClick={quickStartQuick}>
              <div className="quick-start-btn__icon">
                <LightningIcon />
              </div>
              <div>
                <div className="quick-start-btn__label">Quick Session</div>
                <div className="quick-start-btn__desc">25 questions, untimed study</div>
              </div>
            </button>
            <button className="quick-start-btn" onClick={quickStartWeak}>
              <div className="quick-start-btn__icon">
                <TargetIcon />
              </div>
              <div>
                <div className="quick-start-btn__label">Weak Areas</div>
                <div className="quick-start-btn__desc">Spaced repetition on misses</div>
              </div>
            </button>
            <button className="quick-start-btn" onClick={quickStartLast}>
              <div className="quick-start-btn__icon">
                <RepeatIcon />
              </div>
              <div>
                <div className="quick-start-btn__label">Last Custom</div>
                <div className="quick-start-btn__desc">Repeat your recent setup</div>
              </div>
            </button>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Study Plan */}
          <section className="card stack-gap">
            <p className="eyebrow">Recommended next action</p>
            <h2 style={{ fontSize: '1rem', margin: 0 }}>Study Plan</h2>
            {readiness.suggestedFocus ? (
              <div className="study-plan-card">
                <p>
                  <strong>Focus on your weakest domain first.</strong>{' '}
                  {readiness.suggestedFocus}. Work through 10–15 targeted questions in study mode, reviewing each explanation before moving on.
                </p>
              </div>
            ) : (
              <div className="study-plan-card">
                <p>
                  <strong>You're on track.</strong> Keep up consistent practice sessions of 20–30 questions. Mix exam mode with study mode to build both speed and depth.
                </p>
              </div>
            )}
          </section>

          {/* Category Breakdown */}
          <section className="card stack-gap">
            <p className="eyebrow">Domain performance</p>
            <h2 style={{ fontSize: '1rem', margin: 0 }}>Category Breakdown</h2>
            {readiness.domainBreakdown.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Complete a session to see domain breakdown.</p>
            ) : (
              readiness.domainBreakdown.map((d) => (
                <div key={d.domainId} className="domain-bar">
                  <span className="domain-bar__label">{d.domainLabel}</span>
                  <div className="domain-bar__track">
                    <div className="domain-bar__fill" style={{ width: `${d.ema}%` }} />
                  </div>
                  <span className="domain-bar__pct">{d.ema}%</span>
                  <span className="domain-bar__weight">{d.domainWeight}%</span>
                </div>
              ))
            )}
          </section>
        </div>

        {/* Recent Session History */}
        <section className="card stack-gap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Recent sessions</p>
              <h2 style={{ fontSize: '1rem' }}>History</h2>
            </div>
            <button className="ghost-button" onClick={() => navigate('/history')} style={{ fontSize: '0.8rem', minHeight: 'auto', padding: '0.4rem 0.75rem' }}>
              View all →
            </button>
          </div>
          {recent5.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No completed sessions yet.</p>
          ) : (
            <table className="mini-history">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Questions</th>
                  <th>Score</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {recent5.map((entry) => (
                  <tr key={entry.id} onClick={() => navigate(`/review/${entry.id}`)}>
                    <td>{new Date(entry.completedAt).toLocaleDateString()}</td>
                    <td style={{ textTransform: 'capitalize' }}>{entry.settings.mode}</td>
                    <td>{entry.result.correct}/{entry.result.total}</td>
                    <td><strong>{entry.result.percent}%</strong></td>
                    <td>{formatDuration(entry.timeUsedSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
