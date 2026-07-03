import type { HistoryEntry } from '../../types/exam';
import type { HistoryTrendSummary } from '../../lib/historyTrend';
import type { CategoryTrendSummary } from '../../lib/categoryHistoryTrend';

import type { CategoryTrendPoint } from '../../lib/categoryHistoryTrend';

interface HistoryViewProps {
  history: HistoryEntry[];
  historyTrend: HistoryTrendSummary;
  historyCategories: Array<{ categoryId: string; categoryLabel: string; categoryShort?: string }>;
  selectedCategoryId: string | null;
  categoryTrend: CategoryTrendSummary | null;
  onSelectCategory: (id: string | null) => void;
  onSelectHistory: (entry: HistoryEntry) => void;
  onDeleteEntry: (id: string) => void;
  onClearHistory: () => void;
  onNavigateToFlags: () => void;
  focusAreas?: Array<{ categoryId: string; categoryShort: string; pooledPercent: number | null; examWeightPct: number }>;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'Untimed';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((p) => String(p).padStart(2, '0')).join(':');
}

export function HistoryView({
  history, historyTrend, historyCategories, selectedCategoryId,
  categoryTrend, onSelectCategory, onSelectHistory, onDeleteEntry,
  onClearHistory, onNavigateToFlags, focusAreas
}: HistoryViewProps) {
  return (
    <div className="stack stack--gap-lg">
      <div className="row row--spread">
        <h1>Progress</h1>
        <button className="btn-ghost" onClick={onClearHistory} disabled={history.length === 0} style={{ fontSize: 13 }}>
          Clear history
        </button>
      </div>

      {history.length > 0 && (
        <div className="dashboard-grid">
          {/* Trend summary */}
          {historyTrend.points.length > 0 && (
            <div className="card card--panel stack stack--gap">
              <p className="eyebrow">Score trend</p>
              <div className="trend-summary">
                <div>
                  <p className="eyebrow">Average</p>
                  <strong>{historyTrend.averagePercent}%</strong>
                </div>
                <div>
                  <p className="eyebrow">Best</p>
                  <strong>{historyTrend.bestPercent}%</strong>
                </div>
                {historyTrend.recentDelta !== null && (
                  <div>
                    <p className="eyebrow">Latest change</p>
                    <strong>{historyTrend.recentDelta > 0 ? '+' : ''}{historyTrend.recentDelta} pts</strong>
                  </div>
                )}
              </div>

              <div className="trend-chart">
                <div className="trend-chart__plot">
                  {historyTrend.targetThreshold !== null && (
                    <div className="trend-chart__target" style={{ bottom: `${historyTrend.targetThreshold}%` }}>
                      <span className="trend-chart__target-label">Target {historyTrend.targetThreshold}%</span>
                    </div>
                  )}
                  {historyTrend.points.map((pt) => (
                    <div key={pt.id} className="trend-chart__bar-wrap">
                      <div
                        className={`trend-chart__bar${pt.belowTarget ? ' is-below-target' : ''}`}
                        style={{ height: `${pt.percent}%` }}
                        title={`${pt.label}: ${pt.percent}% (${pt.mode})`}
                      />
                    </div>
                  ))}
                </div>
                <div className="trend-chart__labels">
                  {historyTrend.points.map((pt) => (
                    <span key={pt.id} className="trend-chart__label">{pt.label}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* By domain */}
          {focusAreas && focusAreas.length > 0 && (
            <div className="card card--panel stack stack--gap">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <p className="eyebrow">By domain</p>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>accuracy · share of exam</span>
              </div>
              {focusAreas.map((area) => (
                <div key={area.categoryId} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink)', marginBottom: 6, gap: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      {area.categoryShort}
                      <span style={{ flexShrink: 0, font: '600 10px var(--sans)', color: 'var(--tealtext)', background: 'var(--tealsoft)', padding: '2px 7px', borderRadius: 6 }}>
                        {area.examWeightPct}% of exam
                      </span>
                    </span>
                    <span style={{ color: 'var(--muted)' }}>
                      {area.pooledPercent !== null ? `${area.pooledPercent}%` : '—'}
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 5, background: 'var(--goldsoft)' }}>
                    <div style={{ width: `${area.pooledPercent ?? 0}%`, height: '100%', borderRadius: 5, background: area.pooledPercent !== null ? (area.pooledPercent >= 75 ? 'var(--teal)' : area.pooledPercent >= 65 ? 'var(--gold)' : 'var(--danger)') : 'var(--line2)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Per-category drill-down */}
      {historyCategories.length > 0 && (
        <div className="card card--panel stack stack--gap">
          <p className="eyebrow">Per-category drill-down</p>
          <div className="focus-chips">
            {historyCategories.map((cat) => (
              <button
                key={cat.categoryId}
                className={`focus-chip${selectedCategoryId === cat.categoryId ? ' is-selected' : ''}`}
                onClick={() => onSelectCategory(selectedCategoryId === cat.categoryId ? null : cat.categoryId)}
              >
                {cat.categoryLabel}
              </button>
            ))}
          </div>
          {categoryTrend && (
            <div className="stack stack--gap">
              <div className="trend-summary">
                <div>
                  <p className="eyebrow">Category</p>
                  <strong>{categoryTrend.categoryLabel}</strong>
                </div>
                <div>
                  <p className="eyebrow">Average</p>
                  <strong>{categoryTrend.averagePercent}%</strong>
                </div>
                <div>
                  <p className="eyebrow">Best</p>
                  <strong>{categoryTrend.bestPercent}%</strong>
                </div>
              </div>
              <div className="trend-chart">
                <div className="trend-chart__plot">
                  {categoryTrend.points.map((pt: CategoryTrendPoint) => (
                    <div key={pt.sessionId} className="trend-chart__bar-wrap">
                      <div
                        className={`trend-chart__bar${pt.belowTarget ? ' is-below-target' : ''}`}
                        style={{ height: `${pt.percent}%` }}
                        title={`${pt.label}: ${pt.correct}/${pt.total} (${pt.percent}%) · ${pt.mode}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="trend-chart__labels">
                  {categoryTrend.points.map((pt: CategoryTrendPoint) => (
                    <span key={pt.sessionId} className="trend-chart__label">{pt.label}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Session list */}
      <div className="card card--panel stack stack--gap">
        <div className="row row--spread">
          <p className="eyebrow">Sessions</p>
          <button className="btn-ghost" style={{ padding: 0, minHeight: 'auto', fontSize: 12, color: 'var(--tealtext)' }}
            onClick={onNavigateToFlags}>
            Manage flags →
          </button>
        </div>
        {history.length === 0 ? (
          <p className="empty-state">No completed sessions yet.</p>
        ) : (
          history.map((entry) => {
            const modeLabel = entry.settings.mode;
            const passed = entry.result.estimatedPass;
            const blueprintLabel = entry.settings.blueprintId === 'cctc-from-2026-07' ? '2026-07 outline' : 'Legacy (thru 2026-06)';
            return (
              <div key={entry.id} className="history-row" onClick={() => onSelectHistory(entry)}>
                <div className="history-row__info">
                  <strong>{entry.result.correct}/{entry.result.total} · {entry.result.percent}%</strong>
                  <div className="history-row__meta">
                    <span>{new Date(entry.completedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                    <span className={`badge badge--${modeLabel === 'exam' ? 'exam' : 'study'}`}>{modeLabel}</span>
                    <span className={`badge badge--${passed ? 'success' : 'danger'}`}>{passed ? 'Pass' : 'Below'}</span>
                    <span className="badge">{blueprintLabel}</span>
                    <span>{formatDuration(entry.timeUsedSeconds)}</span>
                  </div>
                  <div className="history-row__domains">
                    {entry.result.breakdown.map((bd) => (
                      <span key={bd.categoryId} className="domain-chip">
                        {bd.categoryLabel}: {bd.correct}/{bd.total}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="action-row" style={{ flexDirection: 'column', flexShrink: 0 }}>
                  <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px', minHeight: 32 }}
                    onClick={(e) => { e.stopPropagation(); onSelectHistory(entry); }}>
                    Review →
                  </button>
                  <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px', minHeight: 32, color: 'var(--dangertext)' }}
                    onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id); }}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
