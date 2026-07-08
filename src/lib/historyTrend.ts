import type { ExamMode, HistoryEntry } from '../types/exam';

export type HistoryTrendPoint = {
  id: string;
  label: string;
  percent: number;
  completedAt: string;
  mode: ExamMode;
  belowTarget: boolean;
};

export type HistoryTrendSummary = {
  points: HistoryTrendPoint[];
  averagePercent: number | null;
  bestPercent: number | null;
  recentDelta: number | null;
  targetThreshold: number | null;
  emaDelta: number | null;
  emaPoints: Array<{ label: string; ema: number }>;
};

/**
 * Compute a simple EMA with small alpha.
 * Seeds EMA₀ = first value (not blended with zero).
 */
function computeEma(values: number[], alpha: number): number[] {
  if (values.length === 0) return [];
  const result = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result[i] = alpha * values[i] + (1 - alpha) * result[i - 1];
  }
  return result;
}

export function buildHistoryTrend(entries: HistoryEntry[], limit = 20): HistoryTrendSummary {
  if (entries.length === 0) {
    return {
      points: [],
      averagePercent: null,
      bestPercent: null,
      recentDelta: null,
      targetThreshold: null,
      emaDelta: null,
      emaPoints: [],
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
    belowTarget: entry.result.percent < (entry.settings.targetThreshold ?? 70)
  }));

  const percents = points.map((point) => point.percent);
  const averagePercent = Math.round(percents.reduce((sum, value) => sum + value, 0) / percents.length);
  const bestPercent = Math.max(...percents);
  const recentDelta = points.length >= 2 ? points[points.length - 1].percent - points[points.length - 2].percent : null;
  const targetThreshold = slice[slice.length - 1]?.settings.targetThreshold ?? null;

  // EMA slope comparison: EMA of last N scores, delta between last two EMA values
  const alpha = 0.3;
  const emaValues = computeEma(percents, alpha);
  const emaDelta = emaValues.length >= 2
    ? Math.round(emaValues[emaValues.length - 1] - emaValues[emaValues.length - 2])
    : null;

  const emaPoints = points.map((p, i) => ({
    label: p.label,
    ema: Math.round(emaValues[i]),
  }));

  return {
    points,
    averagePercent,
    bestPercent,
    recentDelta,
    targetThreshold,
    emaDelta,
    emaPoints,
  };
}

export function formatTrendDelta(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta} pts`;
}

