import { useMemo, useRef, useEffect, useId } from 'react';
import { cn } from '../lib/cn';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '../components/ui';
import { computeReadiness } from '../lib/readiness';
import { formatDuration } from '../lib/format';
import type { HistoryEntry } from '../types/exam';
import {
  BarChart3, ChevronRight, Trash2, TrendingUp, Target
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

interface HistoryProps {
  history: HistoryEntry[];
  onViewSession: (entry: HistoryEntry) => void;
  onDeleteSession: (id: string) => void;
  onClearAll: () => void;
}

export function History({ history, onViewSession, onDeleteSession, onClearAll }: HistoryProps) {
  const readiness = useMemo(() => computeReadiness(history), [history]);

  const chartData = useMemo(() => {
    const chronological = [...history].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
    return chronological.map((entry) => {
      const date = new Date(entry.completedAt);
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const domains: Record<string, number> = {};
      for (const bd of entry.result.breakdown) {
        domains[`d${bd.categoryId}`] = bd.total > 0 ? Math.round((bd.correct / bd.total) * 100) : 0;
      }
      return { label, ...domains, total: entry.result.percent };
    });
  }, [history]);

  // Track whether chart has already animated to prevent re-animation on theme toggle
  const hasAnimatedChart = useRef(false);
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (chartData.length > 0) hasAnimatedChart.current = true;
  }, [chartData]);

  // Unique gradient IDs to prevent collision if multiple charts mount
  const chartId = useId();
  const g1 = `grad-${chartId}-1`;
  const g2 = `grad-${chartId}-2`;
  const g3 = `grad-${chartId}-3`;

  const targetThreshold = history[0]?.settings.targetThreshold ?? 70;

  return (
    <div className="space-y-6">
      {/* Stats summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-[var(--primary)]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Readiness</p>
                <p className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>{readiness.overallEma}%</p>
              </div>
              <Target className="h-5 w-5 text-[var(--primary)]" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[var(--accent)]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Sessions</p>
                <p className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>{history.length}</p>
              </div>
              <BarChart3 className="h-5 w-5 text-[var(--accent)]" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[var(--success)]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Trend</p>
                <p className="text-lg font-bold capitalize" style={{ fontFamily: 'var(--font-serif)' }}>{readiness.recentTrend}</p>
              </div>
              <TrendingUp className={cn('h-5 w-5', readiness.recentTrend === 'improving' ? 'text-[var(--success)]' : readiness.recentTrend === 'declining' ? 'text-[var(--destructive)]' : 'text-[var(--muted-foreground)]')} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stacked Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id={g1} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={g2} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={g3} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--foreground)',
                  }}
                  formatter={(value: unknown, name: unknown) => [`${value}%`, String(name)]}
                  labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                />
                <ReferenceLine y={targetThreshold} stroke="var(--accent)" strokeDasharray="6 3" label={{ value: `Target ${targetThreshold}%`, fill: 'var(--accent)', fontSize: 11, position: 'right' }} />
                <Area type="monotone" dataKey="d1" name="Domain 1" stackId="1" stroke="var(--chart-1)" fill={`url(#${g1})`} isAnimationActive={!hasAnimatedChart.current && !prefersReducedMotion} />
                <Area type="monotone" dataKey="d2" name="Domain 2" stackId="1" stroke="var(--chart-2)" fill={`url(#${g2})`} isAnimationActive={!hasAnimatedChart.current && !prefersReducedMotion} />
                <Area type="monotone" dataKey="d3" name="Domain 3" stackId="1" stroke="var(--chart-3)" fill={`url(#${g3})`} isAnimationActive={!hasAnimatedChart.current && !prefersReducedMotion} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-12">Complete sessions to see your progress chart.</p>
          )}
        </CardContent>
      </Card>

      {/* Session list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Sessions</CardTitle>
            {history.length > 0 && (
              <Button variant="ghost" size="sm" onClick={onClearAll} className="gap-1 text-[var(--destructive)]">
                <Trash2 className="h-4 w-4" /> Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <div className="divide-y divide-[var(--border)]">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-3 -mx-2 px-2 rounded-lg hover:bg-[var(--muted)]/50 transition-colors">
                  <button onClick={() => onViewSession(entry)} className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {new Date(entry.completedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}
                      {new Date(entry.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="outline">{getBlueprintShort(entry.settings.blueprintId)}</Badge>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {entry.settings.mode} · {entry.settings.questionCount}q · {formatDuration(entry.timeUsedSeconds)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {entry.result.breakdown.map((bd) => (
                        <span key={bd.categoryId} className="text-xs text-[var(--muted-foreground)]">
                          {bd.categoryLabel.split(':')[0]}: {bd.correct}/{bd.total}
                        </span>
                      ))}
                    </div>
                  </button>
                  <div className="flex items-center gap-3 ml-4">
                    <Badge variant={entry.result.percent >= 70 ? 'success' : 'warning'}>
                      {entry.result.percent}%
                    </Badge>
                    <Button variant="ghost" size="icon-sm" onClick={() => onDeleteSession(entry.id)} aria-label="Delete session">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-12">No completed sessions yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getBlueprintShort(id: string): string {
  return id === 'cctc-from-2026-07' ? '2026-07' : 'Legacy';
}
