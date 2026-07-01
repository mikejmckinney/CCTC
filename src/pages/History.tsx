import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { calcEMA, calcDomainStrengths } from '../lib/ema';
import { getBlueprintLabel } from '../data/blueprints';
import type { HistoryEntry, ItemFlag } from '../types/exam';

interface HistoryProps {
  history: HistoryEntry[];
  flags: ItemFlag[];
  onClearHistory: () => void;
}

export default function History({ history, flags, onClearHistory }: HistoryProps) {
  const navigate = useNavigate();
  const emaData = useMemo(() => calcEMA(history), [history]);
  const domainStrengths = useMemo(() => calcDomainStrengths(history), [history]);

  const chartData = useMemo(() => {
    return emaData.map((point, idx) => {
      const d = new Date(point.date);
      return {
        idx,
        ema: point.value,
        session: point.sessionPercent,
        dateLabel: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        timeLabel: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
      };
    });
  }, [emaData]);

  const targetThreshold = history.length > 0 ? history[0].settings.targetThreshold : 70;

  return (
    <div className="stack">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">History & Progress</h1>
          <p className="page-desc">Track your readiness over time</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/reported')}>
            Reported Items ({flags.length})
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onClearHistory} disabled={history.length === 0}>
            Clear History
          </button>
        </div>
      </div>

      {/* EMA Trend Chart */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-subtitle">Readiness Trend</div>
            <div className="card-title">EMA Progress Over Time</div>
          </div>
        </div>
        {chartData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">📈</div>
            <div className="empty-state__title">No data yet</div>
            <p style={{ fontSize: 13 }}>Complete sessions to see your readiness trend.</p>
          </div>
        ) : (
          <div className="chart-container" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="emaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="idx"
                  type="number"
                  domain={[0, Math.max(chartData.length - 1, 1)]}
                  tickFormatter={(i: number) => chartData[i]?.dateLabel ?? ''}
                  tick={{ fontSize: 11, fill: 'var(--fg-muted)' }}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(_, payload) => {
                    if (payload && payload.length > 0) {
                      const p = payload[0].payload;
                      return `${p.dateLabel} ${p.timeLabel}`;
                    }
                    return '';
                  }}
                />
                <ReferenceLine
                  y={targetThreshold}
                  stroke="var(--warning)"
                  strokeDasharray="6 4"
                  label={{ value: `Target ${targetThreshold}%`, position: 'right', fontSize: 11, fill: 'var(--warning)' }}
                />
                <Area type="monotone" dataKey="ema" stroke="var(--accent)" fill="url(#emaGradient)" strokeWidth={2} name="EMA" />
                <Area type="monotone" dataKey="session" stroke="var(--fg-muted)" fill="transparent" strokeWidth={1} strokeDasharray="4 2" name="Session %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Domain Strengths */}
      {domainStrengths.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-subtitle">Domains</div>
              <div className="card-title">Category Strengths</div>
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
                <span style={{ fontSize: 11, color: 'var(--fg-muted)', minWidth: 50, textAlign: 'right' }}>
                  {d.totalAttempted} Qs
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-subtitle">Sessions</div>
            <div className="card-title">All History</div>
          </div>
        </div>
        {history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">📋</div>
            <div className="empty-state__title">No completed sessions</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Blueprint</th>
                <th>Mode</th>
                <th>Questions</th>
                <th>Score</th>
                <th>Duration</th>
                <th>Domains</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id} className="clickable-row" onClick={() => navigate(`/review/${entry.id}`)}>
                  <td>
                    <div>{new Date(entry.completedAt).toLocaleDateString()}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                      {new Date(entry.completedAt).toLocaleTimeString()}
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>{getBlueprintLabel(entry.settings.blueprintId)}</td>
                  <td><span className={`badge badge-${entry.settings.mode === 'exam' ? 'accent' : 'muted'}`}>{entry.settings.mode}</span></td>
                  <td>{entry.result.correct}/{entry.result.total}</td>
                  <td><strong>{entry.result.percent}%</strong></td>
                  <td>{formatDuration(entry.timeUsedSeconds)}</td>
                  <td>
                    <div style={{ fontSize: 11, lineHeight: 1.4 }}>
                      {entry.result.breakdown.map((b) => (
                        <div key={b.categoryId}>{b.categoryLabel}: {b.correct}/{b.total}</div>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/review/${entry.id}`); }}>
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

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}
