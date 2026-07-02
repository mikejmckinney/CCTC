import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { ChevronRight, Clock, FileText } from 'lucide-react';
import type { HistoryEntry } from '../../types/exam';

type View = 'dashboard' | 'setup' | 'history' | 'reported-items' | 'session' | 'session-review';

interface HistoryViewProps {
  history: HistoryEntry[];
  targetThreshold: number;
  onSelectSession: (entry: HistoryEntry) => void;
  onNavigate: (view: View) => void;
}

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) return 'Untimed';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

const CHART_COLORS = ['#123b3a', '#2d8a4e', '#c77d2a', '#7b5ea7', '#3a7ab8', '#9c7a4f'];

export function HistoryView({ history, targetThreshold, onSelectSession, onNavigate }: HistoryViewProps) {
  // Build chart data: stacked area by domain
  const { chartData, domainKeys } = useMemo(() => {
    if (history.length === 0) return { chartData: [], domainKeys: [] };

    // Collect all domain IDs
    const domainSet = new Set<string>();
    for (const entry of history) {
      if (entry.result?.breakdown) {
        for (const bd of entry.result.breakdown) {
          domainSet.add(bd.categoryId);
        }
      }
    }
    const keys = Array.from(domainSet);

    // Build data points (newest first in history, reverse for chart)
    const reversed = [...history].reverse();
    const data = reversed.map((entry) => {
      const point: Record<string, string | number> = {
        date: new Date(entry.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: entry.completedAt,
      };
      for (const bd of entry.result?.breakdown ?? []) {
        point[bd.categoryId] = bd.total > 0 ? Math.round((bd.correct / bd.total) * 100) : 0;
      }
      return point;
    });

    return { chartData: data, domainKeys: keys };
  }, [history]);

  // Domain labels for legend
  const domainLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const entry of history) {
      for (const bd of entry.result?.breakdown ?? []) {
        labels[bd.categoryId] = bd.categoryLabel;
      }
    }
    return labels;
  }, [history]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
            Progress
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {history.length} sessions completed
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('reported-items')}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--surface-raised)]"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <FileText className="h-3.5 w-3.5" />
          Reported Items
        </button>
      </div>

      {/* Stacked Area Chart */}
      <div
        className="rounded-2xl border p-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <p className="mb-4 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Score Over Time by Domain
        </p>

        {chartData.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Complete a session to see your progress chart.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {domainKeys.map((key, i) => (
                  <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--text)',
                }}
                formatter={(value: unknown, name: unknown) => [`${value}%`, domainLabels[String(name)] ?? String(name)]}
              />
              <ReferenceLine
                y={targetThreshold}
                stroke="var(--accent)"
                strokeDasharray="6 4"
                label={{
                  value: `Target ${targetThreshold}%`,
                  position: 'right',
                  fontSize: 11,
                  fill: 'var(--accent)',
                }}
              />
              {domainKeys.map((key, i) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId="1"
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  fill={`url(#grad-${key})`}
                  strokeWidth={2}
                />
              ))}
              <Legend
                formatter={(value: string) => domainLabels[value] ?? value}
                wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Session list */}
      <div
        className="rounded-2xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="border-b px-5 py-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Session History
          </p>
        </div>

        {history.length === 0 ? (
          <p className="px-5 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            No completed sessions yet.
          </p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {history.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelectSession(entry)}
                className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-[var(--surface-raised)]"
              >
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums"
                  style={{
                    background: entry.result?.estimatedPass ? 'var(--color-success-light)' : 'var(--color-warning-light)',
                    color: entry.result?.estimatedPass ? 'var(--color-success)' : 'var(--color-warning)',
                  }}
                >
                  {entry.result?.percent ?? 0}%
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {entry.settings.mode === 'exam' ? 'Exam' : 'Study'} · {entry.settings.questionCount} Qs
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ background: 'var(--surface-raised)', color: 'var(--text-muted)' }}
                    >
                      {getBlueprintShort(entry.settings.blueprintId)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    <span>{formatDate(entry.completedAt)} at {formatTime(entry.completedAt)}</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDuration(entry.timeUsedSeconds)}
                    </span>
                  </div>
                  {/* Per-domain correct */}
                  <div className="mt-1 flex flex-wrap gap-2">
                    {entry.result?.breakdown.map((bd) => (
                      <span
                        key={bd.categoryId}
                        className="text-[10px] tabular-nums"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {bd.categoryLabel}: {bd.correct}/{bd.total}
                      </span>
                    ))}
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getBlueprintShort(id: string): string {
  if (id === 'cctc-from-2026-07') return '2026-07';
  if (id === 'cctc-thru-2026-06') return '≤2026-06';
  return id;
}
