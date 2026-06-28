import { useMemo } from 'react';
import type { ActiveSession, HistoryEntry, SessionSettings } from '../types/exam';
import { getBlueprint, getBlueprintLabel } from '../data/blueprints';
import { buildReadiness } from '../lib/readinessScore';

interface DashboardProps {
  history: HistoryEntry[];
  settings: SessionSettings;
  activeSession: ActiveSession | null;
  onStartSession: (mode: 'full' | 'quick' | 'weak' | 'custom') => void;
  onResumeSession: () => void;
  onViewHistory: () => void;
  onViewHistoryDetail: (entry: HistoryEntry) => void;
}

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) return 'Untimed';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((p) => String(p).padStart(2, '0')).join(':');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function scoreClass(pct: number): string {
  if (pct >= 70) return 'good';
  if (pct >= 60) return 'mid';
  return 'low';
}

export default function Dashboard({
  history,
  settings,
  activeSession,
  onStartSession,
  onResumeSession,
  onViewHistory,
  onViewHistoryDetail,
}: DashboardProps) {
  const blueprint = useMemo(() => getBlueprint(settings.blueprintId), [settings.blueprintId]);
  const domainCount = 'domains' in blueprint ? blueprint.domains.length : ('sections' in blueprint ? blueprint.sections.length : 0);
  const readiness = useMemo(
    () => buildReadiness(history, settings.examDate ?? null, domainCount, settings.targetThreshold),
    [history, domainCount, settings.targetThreshold, settings.examDate]
  );

  const recentSessions = useMemo(() => [...history].slice(0, 5), [history]);

  // Gauge arc math: 270° arc, stroke-dasharray=245, offset = 245 - (pct/100)*245
  const circumference = 245;
  const gaugeOffset = circumference - (readiness.overallEma / 100) * circumference;
  const gaugeColor = readiness.overallEma >= settings.targetThreshold ? '' : readiness.overallEma >= settings.targetThreshold - 10 ? 'warn' : 'danger';

  // Trend: compare last 3 sessions average vs prior 3
  const trendDelta = useMemo(() => {
    if (history.length < 2) return null;
    const sorted = [...history].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
    const recent = sorted.slice(-3);
    const prior = sorted.slice(-6, -3);
    if (recent.length === 0) return null;
    const recentAvg = recent.reduce((s, e) => s + e.result.percent, 0) / recent.length;
    if (prior.length === 0) return null;
    const priorAvg = prior.reduce((s, e) => s + e.result.percent, 0) / prior.length;
    return Math.round(recentAvg - priorAvg);
  }, [history]);

  // Best score
  const bestScore = useMemo(() => {
    if (history.length === 0) return null;
    return Math.max(...history.map((e) => e.result.percent));
  }, [history]);

  // Total items reviewed
  const totalReviewed = useMemo(() => {
    const ids = new Set<string>();
    for (const e of history) {
      for (const id of e.itemIds) ids.add(id);
    }
    return ids.size;
  }, [history]);

  // Estimated coverage
  const coveragePct = readiness.estimatedCoveragePercent;

  // Build insight list
  const insights: Array<{ type: 'pass' | 'warn' | 'info'; text: string }> = [];
  if (readiness.sessionCount === 0) {
    insights.push({ type: 'info', text: 'Take your first session to establish a baseline and unlock personalized insights.' });
  } else {
    // Readiness vs target
    if (readiness.overallEma >= settings.targetThreshold) {
      insights.push({
        type: 'pass',
        text: `EMA readiness <strong>${readiness.overallEma}%</strong> meets your ${settings.targetThreshold}% target. You're on track.`,
      });
    } else {
      insights.push({
        type: 'warn',
        text: `EMA readiness <strong>${readiness.overallEma}%</strong> is ${readiness.overallEma >= settings.targetThreshold - 10 ? 'close to' : 'below'} your ${settings.targetThreshold}% target.`,
      });
    }

    // Weakest domain
    if (readiness.weakestDomains.length > 0) {
      const w = readiness.weakestDomains[0];
      insights.push({
        type: 'warn',
        text: `<strong>${w.categoryLabel}</strong> at ${w.emaPercent}% is your weakest domain. A focused session would help raise it.`,
      });
    }

    // Coverage
    if (coveragePct > 0) {
      insights.push({
        type: 'info',
        text: `${coveragePct}% of blueprint content areas covered. ${domainCount > 0 ? `${domainCount - Math.round(coveragePct / 100 * domainCount)} domains remain with low coverage.` : ''}`,
      });
    }

    // Trend
    if (trendDelta !== null && trendDelta > 0) {
      insights.push({
        type: 'pass',
        text: `Recent sessions trending <strong>+${trendDelta} pts</strong> — consistent improvement.`,
      });
    }

    // Days until exam
    if (readiness.daysUntilExam !== null) {
      insights.push({
        type: 'info',
        text: `<strong>${readiness.daysUntilExam}</strong> day${readiness.daysUntilExam !== 1 ? 's' : ''} until exam date.`,
      });
    }
  }

  // Study plan recommendation
  const planRecommendation = useMemo(() => {
    if (readiness.sessionCount === 0) {
      return {
        title: 'Take your first full exam',
        desc: 'Complete a full exam session to establish your baseline readiness score and unlock personalized study recommendations.',
        action: 'Start full exam',
        mode: 'full' as const,
      };
    }
    if (readiness.weakestDomains.length > 0) {
      const w = readiness.weakestDomains[0];
      return {
        title: `Study ${w.categoryLabel} — Weak Areas Session`,
        desc: `Your EMA in this domain is ${w.emaPercent}%, which is below your ${settings.targetThreshold}% target. A focused session targeting previously-incorrect items will reinforce the gaps using spaced repetition.`,
        action: 'Start weak areas session',
        mode: 'weak' as const,
      };
    }
    return {
      title: 'Keep the momentum going',
      desc: 'You\'re on track across all domains. Continue with regular sessions to maintain your readiness through exam day.',
      action: 'Start quick session',
      mode: 'quick' as const,
    };
  }, [readiness, settings.targetThreshold]);

  return (
    <>
      {/* Readiness Score — first on mobile */}
      <section className="readiness-hero" aria-label="Readiness score">
        <div className="readiness-gauge">
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle className="gauge-bg" cx="65" cy="65" r="52" fill="none" strokeWidth="10"
              strokeDasharray={circumference} strokeDashoffset={circumference / 3} />
            <circle className={`gauge-fill ${gaugeColor}`} cx="65" cy="65" r="52" fill="none" strokeWidth="10"
              strokeDasharray={circumference} strokeDashoffset={readiness.sessionCount === 0 ? circumference / 3 : gaugeOffset} />
          </svg>
          <div className="gauge-label">
            <span className="gauge-score">{readiness.sessionCount === 0 ? '—' : readiness.overallEma}</span>
            <span className="gauge-unit">Readiness</span>
          </div>
        </div>
        <div className="readiness-content">
          <h2>
            {readiness.sessionCount === 0
              ? 'Welcome — take your first session'
              : readiness.overallEma >= settings.targetThreshold
                ? 'You\'re on track for the exam'
                : readiness.overallEma >= settings.targetThreshold - 10
                  ? 'Almost there — keep pushing'
                  : 'Focus needed on weak areas'}
          </h2>
          <p>
            {readiness.sessionCount === 0
              ? 'Complete a session to see your EMA readiness score and personalized study plan.'
              : readiness.overallEma >= settings.targetThreshold
                ? `Your exponential moving average is trending well. ${readiness.weakestDomains.length > 0 ? `Focus on ${readiness.weakestDomains[0].categoryLabel} to close your weakest domain gap.` : 'Keep up regular sessions to maintain readiness.'}`
                : `Your EMA needs improvement. ${readiness.weakestDomains.length > 0 ? `Focus on ${readiness.weakestDomains[0].categoryLabel} — a focused study session could raise it significantly.` : 'Take more sessions to build your score.'}`}
          </p>
          {readiness.sessionCount > 0 && (
            <div className="readiness-stats">
              {trendDelta !== null && (
                <div className="rs-item">
                  <div className="rs-label">Trend</div>
                  <div className={`rs-value ${trendDelta > 0 ? 'positive' : ''}`}>{trendDelta > 0 ? '+' : ''}{trendDelta} pts</div>
                </div>
              )}
              <div className="rs-item">
                <div className="rs-label">Sessions</div>
                <div className="rs-value">{readiness.sessionCount}</div>
              </div>
              {bestScore !== null && (
                <div className="rs-item">
                  <div className="rs-label">Best Score</div>
                  <div className="rs-value">{bestScore}%</div>
                </div>
              )}
              <div className="rs-item">
                <div className="rs-label">Items Reviewed</div>
                <div className="rs-value">{totalReviewed}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Quick Start */}
      <section>
        <div className="section-label">Quick Start</div>
        <div className="quickstart-grid">
          <div className="qs-card" onClick={() => onStartSession('full')} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStartSession('full'); } }}>
            <div className="qs-icon-row"><div className="qs-icon teal">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg>
            </div></div>
            <h3>Full Exam</h3>
            <p>{blueprint.default_exam_items} items, timed, exam conditions</p>
            <span className="qs-badge">{getBlueprintLabel(settings.blueprintId)}</span>
          </div>

          <div className="qs-card" onClick={() => onStartSession('quick')} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStartSession('quick'); } }}>
            <div className="qs-icon-row"><div className="qs-icon amber">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
            </div></div>
            <h3>Quick Session</h3>
            <p>25 items, {settings.timed ? 'timed' : 'untimed'}, rapid review</p>
            <span className="qs-badge">~15 min</span>
          </div>

          <div className="qs-card" onClick={() => onStartSession('weak')} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStartSession('weak'); } }}>
            <div className="qs-icon-row"><div className="qs-icon orange">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div></div>
            <h3>Weak Areas</h3>
            <p>Spaced repetition of missed items</p>
            <span className="qs-badge">Prioritize gaps</span>
          </div>

          <div className="qs-card" onClick={() => onStartSession('custom')} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStartSession('custom'); } }}>
            <div className="qs-icon-row"><div className="qs-icon green">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </div></div>
            <h3>Last Settings</h3>
            <p>{settings.questionCount} items, {settings.mode} mode</p>
            <span className="qs-badge">Resume config</span>
          </div>

          {activeSession && (
            <div className="qs-card" onClick={onResumeSession} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onResumeSession(); } }}
              style={{ borderColor: 'var(--brand)' }}>
              <div className="qs-icon-row"><div className="qs-icon teal">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div></div>
              <h3>Resume Session</h3>
              <p>Pick up where you left off</p>
              <span className="qs-badge">In progress</span>
            </div>
          )}
        </div>
      </section>

      {/* Two-col: Category Breakdown + Am I Ready */}
      <div className="two-col">
        <div className="module-card">
          <h3>Category Breakdown</h3>
          {readiness.domainReadiness.length === 0 ? (
            <p className="empty-state">Complete sessions to see your domain breakdown.</p>
          ) : (
            readiness.domainReadiness.map((domain) => {
              const level = domain.emaPercent >= settings.targetThreshold ? 'strong' : domain.emaPercent >= settings.targetThreshold - 10 ? 'mid' : 'weak';
              const tagLabel = level === 'strong' ? 'Strong' : level === 'mid' ? 'Focus' : 'Weak';
              return (
                <div key={domain.categoryId} className="cat-row">
                  <div className={`cat-indicator ${level}`} />
                  <div className="cat-info">
                    <div className="cat-name">{domain.categoryLabel}</div>
                    <div className="cat-bar-outer"><div className={`cat-bar-inner ${level}`} style={{ width: `${Math.min(100, domain.emaPercent)}%` }} /></div>
                  </div>
                  <div className="cat-right">
                    <div className="cat-pct">{domain.emaPercent}%</div>
                    <span className={`cat-tag ${level === 'strong' ? 'strong' : level === 'mid' ? 'focus' : 'weak'}`}>{tagLabel}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="module-card">
          <h3>Am I Ready?</h3>
          <div className="insight-list">
            {insights.map((insight, i) => (
              <div key={i} className="insight-row">
                <div className={`insight-pip ${insight.type}`}>
                  {insight.type === 'pass' ? '\u2713' : insight.type === 'warn' ? '!' : 'i'}
                </div>
                <span dangerouslySetInnerHTML={{ __html: insight.text }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Study Plan */}
      <section className="plan-section">
        <div className="section-label">Recommended Next Action</div>
        <div className="plan-card">
          <div className="plan-badge">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <div className="plan-body">
            <h3>{planRecommendation.title}</h3>
            <p>{planRecommendation.desc}</p>
          </div>
          <button className="plan-btn" onClick={() => onStartSession(planRecommendation.mode)}>
            {planRecommendation.action}
          </button>
        </div>
      </section>

      {/* Recent Session History */}
      <section className="history-section">
        <div className="history-header">
          <div className="section-label" style={{ marginBottom: 0 }}>Recent Sessions</div>
          {history.length > 0 && (
            <button className="view-all" onClick={onViewHistory}>View all history →</button>
          )}
        </div>
        {recentSessions.length === 0 ? (
          <p className="empty-state">No completed sessions yet. Start your first session above.</p>
        ) : (
          <table className="history-table">
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
              {recentSessions.map((entry) => (
                <tr key={entry.id} onClick={() => onViewHistoryDetail(entry)}>
                  <td>{formatDate(entry.completedAt)}</td>
                  <td><span className={`mode-pill ${entry.settings.mode}`}>{entry.settings.mode === 'exam' ? 'Exam' : 'Study'}</span></td>
                  <td>{entry.result.correct}/{entry.result.total}</td>
                  <td><span className={`score-badge ${scoreClass(entry.result.percent)}`}>{entry.result.percent}%</span></td>
                  <td>{formatDuration(entry.timeUsedSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
