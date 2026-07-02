import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../app/AppContext';
import { getBlueprintLabel } from '../data/blueprints';
import { buildStackedAreaData, getDomainKeys } from '../lib/readiness';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

const CHART_COLORS = ['#0d9488', '#6366f1', '#d97706', '#dc2626', '#059669'];

export function HistoryPage() {
  const navigate = useNavigate();
  const { history, removeHistoryEntry, handleClearHistory, settings } = useApp();
  const sorted = useMemo(() => [...history].sort((a, b) => b.completedAt.localeCompare(a.completedAt)), [history]);
  const domainKeys = useMemo(() => getDomainKeys(history), [history]);
  const stackedData = useMemo(() => buildStackedAreaData(history), [history]);

  return (
    <div className="app-content">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Stacked Area Chart */}
        {stackedData.length > 1 && (
          <section className="card stack-gap">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Progress over time</p>
                <h2 style={{ fontSize: '1rem' }}>Readiness by Domain (EMA)</h2>
              </div>
            </div>
            <div className="stacked-chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={stackedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface-strong)',
                      border: '1px solid var(--line)',
                      borderRadius: 8,
                      fontSize: '0.8rem'
                    }}
                  />
                  <ReferenceLine y={settings.targetThreshold} stroke="var(--warning)" strokeDasharray="6 4" label={{ value: `Target ${settings.targetThreshold}%`, fill: 'var(--warning)', fontSize: 11 }} />
                  {domainKeys.map((key, i) => (
                    <Area key={key} type="monotone" dataKey={key} stackId="1" stroke={CHART_COLORS[i % CHART_COLORS.length]} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.6} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {domainKeys.map((key, i) => (
                <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length], display: 'inline-block' }} />
                  {key}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Session records */}
        <section className="card stack-gap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">All sessions</p>
              <h2 style={{ fontSize: '1rem' }}>History</h2>
            </div>
            {sorted.length > 0 && (
              <button className="ghost-button" onClick={() => void handleClearHistory()} style={{ fontSize: '0.8rem', minHeight: 'auto', padding: '0.4rem 0.75rem' }}>
                Clear all
              </button>
            )}
          </div>

          {sorted.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No completed sessions yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {sorted.map((entry) => {
                const date = new Date(entry.completedAt);
                return (
                  <article key={entry.id} className="history-card">
                    <div>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{getBlueprintLabel(entry.settings.blueprintId)}</h3>
                      <p style={{ fontSize: '0.82rem', margin: '0.25rem 0' }}>
                        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' · '}{entry.settings.mode}
                        {' · '}{entry.result.correct}/{entry.result.total} correct
                        {' · '}{entry.result.percent}%
                        {' · '}{entry.timeUsedSeconds != null ? formatDuration(entry.timeUsedSeconds) : 'Untimed'}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
                        {entry.result.breakdown.map((bd) => (
                          <span key={bd.categoryId} className="badge badge--soft" style={{ fontSize: '0.7rem' }}>
                            {bd.categoryLabel}: {bd.correct}/{bd.total}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="action-row action-row--column" style={{ flexShrink: 0 }}>
                      <button
                        className="secondary-button"
                        onClick={() => navigate(`/review/${entry.id}`)}
                        style={{ fontSize: '0.8rem', minHeight: 'auto', padding: '0.4rem 0.75rem' }}
                      >
                        Review
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() => void removeHistoryEntry(entry.id)}
                        style={{ fontSize: '0.8rem', minHeight: 'auto', padding: '0.4rem 0.75rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Reported Items link */}
        <section className="card">
          <button className="ghost-button" onClick={() => navigate('/reported')} style={{ width: '100%', justifyContent: 'center' }}>
            View Reported Items
          </button>
        </section>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((p) => String(p).padStart(2, '0')).join(':');
}
