import type { HistoryEntry } from '../../types/exam';
import { getBlueprintLabel } from '../../data/blueprints';
import { formatTrendDelta } from '../../lib/historyTrend';
import type { CategoryOption, CategoryTrendSummary } from '../../lib/categoryHistoryTrend';
import type { HistoryTrendSummary } from '../../lib/historyTrend';

interface ProgressHistoryProps {
  history: HistoryEntry[];
  historyTrend: HistoryTrendSummary;
  historyCategories: CategoryOption[];
  selectedCategoryId: string | null;
  setSelectedCategoryId: (id: string | null) => void;
  categoryTrend: CategoryTrendSummary | null;
  setSelectedHistory: (entry: HistoryEntry) => void;
  setReviewIndex: (index: number) => void;
  setView: (view: 'history' | 'history-detail') => void;
  handleClearHistory: () => void;
  removeHistoryEntry: (id: string) => void;
}

export function ProgressHistory({
  history,
  historyTrend,
  historyCategories,
  selectedCategoryId,
  setSelectedCategoryId,
  categoryTrend,
  setSelectedHistory,
  setReviewIndex,
  setView,
  handleClearHistory,
  removeHistoryEntry
}: ProgressHistoryProps) {
  return (
    <>
      <section className="panel panel--span-2 stack-gap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Stored results</p>
            <h2>History</h2>
          </div>
          <div className="action-row">
            <button className="ghost-button" onClick={() => void handleClearHistory()} disabled={history.length === 0}>
              Clear history
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <p className="status-card">No completed sessions yet.</p>
        ) : (
          history.map((entry) => (
            <article key={entry.id} className="history-card">
              <div>
                <h3>{getBlueprintLabel(entry.settings.blueprintId)}</h3>
                <p>
                  {new Date(entry.completedAt).toLocaleString()} · {entry.settings.mode} · {entry.result.correct}/{entry.result.total} correct · {entry.result.percent}%
                </p>
                <p>
                  Unofficial practice estimate: {entry.result.estimatedPass ? 'at or above' : 'below'} your {entry.settings.targetThreshold}% target.
                </p>
              </div>
              <div className="action-row action-row--column">
                <button
                  className="secondary-button"
                  onClick={() => {
                    setSelectedHistory(entry);
                    setReviewIndex(0);
                    setView('history-detail');
                  }}
                >
                  Review session
                </button>
                <button className="ghost-button" onClick={() => void removeHistoryEntry(entry.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="panel stack-gap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Trend snapshot</p>
            <h2>Score trend</h2>
          </div>
        </div>

        {historyTrend.points.length === 0 ? (
          <p className="status-card">Complete a session to see your unofficial practice score trend.</p>
        ) : (
          <>
            <div className="trend-summary" aria-label="Score trend summary">
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

            <div
              className="trend-chart"
              role="img"
              aria-label={`Score trend across the last ${historyTrend.points.length} sessions`}
            >
              <div className="trend-chart__plot">
                {historyTrend.targetThreshold !== null && (
                  <div className="trend-chart__target" style={{ bottom: `${historyTrend.targetThreshold}%` }}>
                    <span className="trend-chart__target-label">Target {historyTrend.targetThreshold}%</span>
                  </div>
                )}
                {historyTrend.points.map((point) => (
                  <div key={point.id} className="trend-chart__bar-wrap">
                    <div
                      className={['trend-chart__bar', point.belowTarget ? 'is-below-target' : ''].filter(Boolean).join(' ')}
                      style={{ height: `${point.percent}%` }}
                      title={`${point.label}: ${point.percent}% (${point.mode})`}
                    />
                  </div>
                ))}
              </div>
              <div className="trend-chart__labels">
                {historyTrend.points.map((point) => (
                  <span key={point.id} className="trend-chart__label">
                    {point.label}
                  </span>
                ))}
              </div>
            </div>

            <ul className="plain-list">
              {[...historyTrend.points].reverse().slice(0, 5).map((point) => (
                <li key={point.id} className="trend-row">
                  <span>
                    {point.label} · {point.mode}
                  </span>
                  <strong>{point.percent}%</strong>
                </li>
              ))}
            </ul>
          </>
        )}

        {historyCategories.length > 0 && (
          <>
            <div className="section-heading section-heading--compact">
              <div>
                <p className="eyebrow">Per-category drill-down</p>
                <h2>Category trend</h2>
              </div>
            </div>
            <p className="field-hint">Select a content category to plot your unofficial score in that area across completed sessions.</p>
            <div className="category-pills" role="group" aria-label="Content categories">
              {historyCategories.map((category) => (
                <button
                  key={category.categoryId}
                  type="button"
                  className={['pill', selectedCategoryId === category.categoryId ? 'active' : ''].filter(Boolean).join(' ')}
                  aria-pressed={selectedCategoryId === category.categoryId}
                  onClick={() => setSelectedCategoryId(category.categoryId)}
                >
                  {category.categoryLabel}
                </button>
              ))}
            </div>

            {categoryTrend ? (
              <>
                <div className="trend-summary" aria-label={`${categoryTrend.categoryLabel} trend summary`}>
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

                <div
                  className="trend-chart"
                  role="img"
                  aria-label={`${categoryTrend.categoryLabel} score trend across the last ${categoryTrend.points.length} sessions`}
                >
                  <div className="trend-chart__plot">
                    {categoryTrend.points.map((point) => (
                      <div key={point.sessionId} className="trend-chart__bar-wrap">
                        <div
                          className={['trend-chart__bar', point.belowTarget ? 'is-below-target' : ''].filter(Boolean).join(' ')}
                          style={{ height: `${point.percent}%` }}
                          title={`${point.label}: ${point.correct}/${point.total} (${point.percent}%) · ${point.mode}`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="trend-chart__labels">
                    {categoryTrend.points.map((point) => (
                      <span key={point.sessionId} className="trend-chart__label">
                        {point.label}
                      </span>
                    ))}
                  </div>
                </div>

                <ul className="plain-list">
                  {[...categoryTrend.points].reverse().slice(0, 5).map((point) => (
                    <li key={point.sessionId} className="trend-row">
                      <span>
                        {point.label} · {point.correct}/{point.total} · {point.mode}
                      </span>
                      <strong>{point.percent}%</strong>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              selectedCategoryId && <p className="status-card">No scored items in this category yet.</p>
            )}
          </>
        )}
      </section>
    </>
  );
}
