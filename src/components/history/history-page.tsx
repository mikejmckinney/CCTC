import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { BarChart3, Clock, ChevronRight, Trash2, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import type { HistoryEntry } from '../../types/exam';
import type { DomainPerformance } from '../../types/dashboard';

interface HistoryPageProps {
  history: HistoryEntry[];
  domains: DomainPerformance[];
  onSelectEntry: (entry: HistoryEntry) => void;
  onViewReported: () => void;
  onClearHistory: () => void;
}

export function HistoryPage({ history, domains, onSelectEntry, onViewReported, onClearHistory }: HistoryPageProps) {
  // Build stacked area chart data
  const chartData = useMemo(() => {
    const chronological = [...history].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
    return chronological.slice(-20).map((entry) => {
      const point: Record<string, string | number> = {
        date: new Date(entry.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        overall: entry.result.percent,
      };
      // Add per-domain scores
      for (const row of entry.result.breakdown) {
        if (row.total > 0) {
          point[row.categoryLabel] = Math.round((row.correct / row.total) * 100);
        }
      }
      return point;
    });
  }, [history]);

  const domainNames = useMemo(() => {
    const names = new Set<string>();
    for (const entry of history) {
      for (const row of entry.result.breakdown) {
        if (row.total > 0) names.add(row.categoryLabel);
      }
    }
    return [...names].sort();
  }, [history]);

  const domainColors = ['var(--color-primary)', 'var(--color-accent)', 'var(--color-success)'];

  if (history.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-text">History & Progress</h1>
        </div>
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">No completed sessions yet. Start a practice session to see your progress here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-text">History & Progress</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onViewReported}>
            <FileText className="h-4 w-4" />
            Reported Items
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearHistory} disabled={history.length === 0}>
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Stacked Area Chart */}
      {chartData.length >= 2 && (
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Progress Over Time
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              {/* Target line */}
              <ReferenceLine y={65} stroke="var(--color-error)" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: 'Target', fontSize: 10, fill: 'var(--color-error)' }} />
              {/* Domain areas */}
              {domainNames.map((name, i) => (
                <Area
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stackId="1"
                  stroke={domainColors[i % domainColors.length]}
                  fill={domainColors[i % domainColors.length]}
                  fillOpacity={0.15}
                  strokeWidth={1.5}
                />
              ))}
              {/* Overall line */}
              <Area
                type="monotone"
                dataKey="overall"
                stroke="var(--color-text)"
                fill="none"
                strokeWidth={2}
                strokeDasharray="0"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Domain Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {domains.map((domain) => (
          <div key={domain.domainId} className="rounded-lg border border-border bg-surface p-4">
            <div className="text-xs font-medium text-text-secondary truncate" title={domain.domainLabel}>
              {domain.domainLabel}
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-text">{domain.emaScore}%</div>
            <div className="text-[10px] text-text-muted">
              {domain.totalCorrect}/{domain.totalAttempted} correct · {domain.domainWeightPct}% of exam
            </div>
          </div>
        ))}
      </div>

      {/* Session List */}
      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            All Sessions ({history.length})
          </h2>
        </div>
        <div className="divide-y divide-border">
          {history.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onSelectEntry(entry)}
              className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-surface-muted"
            >
              {/* Date + time */}
              <div className="w-32 flex-shrink-0">
                <div className="text-xs font-medium text-text">
                  {new Date(entry.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="text-[10px] text-text-muted">
                  {new Date(entry.completedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Mode */}
              <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                entry.settings.mode === 'exam' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'
              }`}>
                {entry.settings.mode === 'exam' ? 'Exam' : 'Study'}
              </span>

              {/* Blueprint */}
              <span className="text-[10px] text-text-muted">
                {entry.settings.blueprintId === 'cctc-from-2026-07' ? '2026-07' : 'Legacy'}
              </span>

              {/* Questions */}
              <span className="w-12 text-xs text-text-muted">{entry.result.total}q</span>

              {/* Per-domain scores */}
              <div className="hidden flex-1 gap-2 sm:flex">
                {entry.result.breakdown.filter((b) => b.total > 0).map((b) => (
                  <span key={b.categoryId} className="text-[10px] text-text-muted">
                    {b.categoryLabel.split(' ')[0]}: {b.correct}/{b.total}
                  </span>
                ))}
              </div>

              {/* Score */}
              <span className={`ml-auto font-mono text-sm font-semibold ${
                entry.result.percent >= entry.settings.targetThreshold
                  ? 'text-success'
                  : entry.result.percent >= entry.settings.targetThreshold * 0.85
                    ? 'text-warning'
                    : 'text-error'
              }`}>
                {entry.result.percent}%
              </span>

              {/* Duration */}
              <div className="flex w-14 items-center gap-1 text-xs text-text-muted">
                <Clock className="h-3 w-3" />
                {formatDuration(entry.timeUsedSeconds)}
              </div>

              <ChevronRight className="h-4 w-4 flex-shrink-0 text-text-muted" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '--';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h${rem > 0 ? ` ${rem}m` : ''}`;
}
