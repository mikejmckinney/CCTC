import { useMemo, useState } from 'react';
import type { HistoryEntry } from '../types/exam';
import { getBlueprintLabel } from '../data/blueprints';
import { buildHistoryTrend, formatTrendDelta } from '../lib/historyTrend';
import { buildCategoryHistoryTrend, listHistoryCategories } from '../lib/categoryHistoryTrend';

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) return 'Untimed';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((p) => String(p).padStart(2, '0')).join(':');
}

interface HistoryPageProps {
  history: HistoryEntry[];
  onClearHistory: () => void;
  onViewDetail: (entry: HistoryEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onNavigateToReportedItems: () => void;
}

export default function HistoryPage({ history, onClearHistory, onViewDetail, onDeleteEntry, onNavigateToReportedItems }: HistoryPageProps) {
  const historyTrend = useMemo(() => buildHistoryTrend(history), [history]);
  const historyCategories = useMemo(() => listHistoryCategories(history), [history]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const categoryTrend = useMemo(
    () => (selectedCategoryId ? buildCategoryHistoryTrend(history, selectedCategoryId) : null),
    [history, selectedCategoryId]
  );

  return (
    <div className="dashboard-grid">
      {/* Session list */}
      <div className="card card-stack">
        <div className="card-header">
          <div>
            <p className="eyebrow">Stored results</p>
            <h2>History</h2>
          </div>
          <div className="btn-group">
            <button className="btn-ghost" onClick={onClearHistory} disabled={history.length === 0}>Clear history</button>
          </div>
        </div>

        {history.length === 0 ? (
          <p className="status-card">No completed sessions yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {history.map((entry) => (
              <div key={entry.id} className="history-list-card">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3>{getBlueprintLabel(entry.settings.blueprintId)}</h3>
                  <p>
                    {new Date(entry.completedAt).toLocaleString()} · {entry.settings.mode} · {entry.result.correct}/{entry.result.total} correct · {entry.result.percent}%
                  </p>
                  <p style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
                    {entry.settings.blueprintId} · Duration: {formatDuration(entry.timeUsedSeconds)}
                  </p>
                  {entry.result.breakdown.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.4rem' }}>
                      {entry.result.breakdown.map((bd) => (
                        <span key={bd.categoryId} className="badge badge-default">
                          {bd.categoryLabel}: {bd.correct}/{bd.total}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="btn-group" style={{ flexDirection: 'column', flexShrink: 0 }}>
                  <button className="btn-secondary" onClick={() => onViewDetail(entry)}>Review</button>
                  <button className="btn-ghost" onClick={() => onDeleteEntry(entry.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reported Items link at bottom */}
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.85rem' }}>
          <button className="btn-ghost" onClick={onNavigateToReportedItems} style={{ gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
            Reported items
          </button>
        </div>
      </div>

      {/* Score trend + Category trend */}
      <div className="card card-stack">
        <div className="card-header">
          <div>
            <p className="eyebrow">Trend snapshot</p>
            <h2>Score trend</h2>
          </div>
        </div>

        {historyTrend.points.length === 0 ? (
          <p className="status-card">Complete a session to see your score trend.</p>
        ) : (
          <>
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
                  <strong>{formatTrendDelta(historyTrend.recentDelta)}</strong>
                </div>
              )}
            </div>

            <div className="trend-chart" role="img" aria-label={`Score trend across ${historyTrend.points.length} sessions`}>
              <div className="trend-chart__plot">
                {historyTrend.targetThreshold !== null && (
                  <div className="trend-chart__target" style={{ bottom: `${historyTrend.targetThreshold}%` }}>
                    <span className="trend-chart__target-label">Target {historyTrend.targetThreshold}%</span>
                  </div>
                )}
                {historyTrend.points.map((point) => (
                  <div key={point.id} className="trend-chart__bar-wrap">
                    <div
                      className={`trend-chart__bar ${point.belowTarget ? 'is-below-target' : ''}`}
                      style={{ height: `${point.percent}%` }}
                      title={`${point.label}: ${point.percent}% (${point.mode})`}
                    />
                  </div>
                ))}
              </div>
              <div className="trend-chart__labels">
                {historyTrend.points.map((point) => (
                  <span key={point.id} className="trend-chart__label">{point.label}</span>
                ))}
              </div>
            </div>

            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.4rem' }}>
              {[...historyTrend.points].reverse().slice(0, 5).map((point) => (
                <li key={point.id} className="trend-row">
                  <span>{point.label} · {point.mode}</span>
                  <strong>{point.percent}%</strong>
                </li>
              ))}
            </ul>
          </>
        )}

        {historyCategories.length > 0 && (
          <>
            <div style={{ marginTop: '0.5rem' }}>
              <p className="eyebrow">Per-category drill-down</p>
              <h3>Category trend</h3>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Select a content category to plot your score across sessions.</p>
            <div className="category-pills" role="group" aria-label="Content categories">
              {historyCategories.map((cat) => (
                <button
                  key={cat.categoryId}
                  className={`category-pill ${selectedCategoryId === cat.categoryId ? 'active' : ''}`}
                  onClick={() => setSelectedCategoryId(cat.categoryId)}
                >
                  {cat.categoryLabel}
                </button>
              ))}
            </div>

            {categoryTrend && (
              <>
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
                  {categoryTrend.recentDelta !== null && (
                    <div>
                      <p className="eyebrow">Latest change</p>
                      <strong>{formatTrendDelta(categoryTrend.recentDelta)}</strong>
                    </div>
                  )}
                </div>

                <div className="trend-chart" role="img" aria-label={`${categoryTrend.categoryLabel} trend`}>
                  <div className="trend-chart__plot">
                    {categoryTrend.points.map((point) => (
                      <div key={point.sessionId} className="trend-chart__bar-wrap">
                        <div
                          className={`trend-chart__bar ${point.belowTarget ? 'is-below-target' : ''}`}
                          style={{ height: `${point.percent}%` }}
                          title={`${point.label}: ${point.correct}/${point.total} (${point.percent}%)`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="trend-chart__labels">
                    {categoryTrend.points.map((point) => (
                      <span key={point.sessionId} className="trend-chart__label">{point.label}</span>
                    ))}
                  </div>
                </div>

                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.4rem' }}>
                  {[...categoryTrend.points].reverse().slice(0, 5).map((point) => (
                    <li key={point.sessionId} className="trend-row">
                      <span>{point.label} · {point.correct}/{point.total} · {point.mode}</span>
                      <strong>{point.percent}%</strong>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
