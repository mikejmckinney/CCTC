import type { HistoryEntry } from '../types/exam';

export type HistoryTrendPoint = {
  id: string;
  label: string;
  percent: number;
  completedAt: string;
  mode: string;
  belowTarget: boolean;
};

export type HistoryTrendSummary = {
  points: HistoryTrendPoint[];
  averagePercent: number | null;
  bestPercent: number | null;
  recentDelta: number | null;
  targetThreshold: number | null;
};

export function buildHistoryTrend(entries: HistoryEntry[], limit = 20): HistoryTrendSummary {
  if (entries.length === 0) {
    return {
      points: [],
      averagePercent: null,
      bestPercent: null,
      recentDelta: null,
      targetThreshold: null
    };
  }

  const chronological = [...entries].sort((left, right) => left.completedAt.localeCompare(right.completedAt));
  const slice = chronological.slice(-limit);
  const points = slice.map((entry) => ({
    id: entry.id,
    label: new Date(entry.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    percent: entry.result.percent,
    completedAt: entry.completedAt,
    mode: entry.settings.mode,
    belowTarget: entry.result.percent < entry.settings.targetThreshold
  }));

  const percents = points.map((point) => point.percent);
  const averagePercent = Math.round(percents.reduce((sum, value) => sum + value, 0) / percents.length);
  const bestPercent = Math.max(...percents);
  const recentDelta = points.length >= 2 ? points[points.length - 1].percent - points[points.length - 2].percent : null;
  const targetThreshold = slice[slice.length - 1]?.settings.targetThreshold ?? null;

  return {
    points,
    averagePercent,
    bestPercent,
    recentDelta,
    targetThreshold
  };
}

export function formatTrendDelta(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta} pts`;
}
