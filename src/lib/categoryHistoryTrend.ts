import type { ExamMode, HistoryEntry } from '../types/exam';

export type CategoryOption = {
  categoryId: string;
  categoryLabel: string;
};

export type CategoryTrendPoint = {
  sessionId: string;
  label: string;
  percent: number;
  correct: number;
  total: number;
  completedAt: string;
  mode: ExamMode;
  belowTarget: boolean;
};

export type CategoryTrendSummary = {
  categoryId: string;
  categoryLabel: string;
  points: CategoryTrendPoint[];
  averagePercent: number | null;
  bestPercent: number | null;
  recentDelta: number | null;
};

export function listHistoryCategories(entries: HistoryEntry[]): CategoryOption[] {
  const byId = new Map<string, string>();

  for (const entry of entries) {
    for (const row of entry.result.breakdown) {
      if (row.total > 0) {
        byId.set(row.categoryId, row.categoryLabel);
      }
    }
  }

  return [...byId.entries()]
    .map(([categoryId, categoryLabel]) => ({ categoryId, categoryLabel }))
    .sort((left, right) => left.categoryLabel.localeCompare(right.categoryLabel));
}

export function buildCategoryHistoryTrend(
  entries: HistoryEntry[],
  categoryId: string,
  limit = 20
): CategoryTrendSummary | null {
  const chronological = [...entries].sort((left, right) => left.completedAt.localeCompare(right.completedAt));
  const points: CategoryTrendPoint[] = [];
  let categoryLabel: string | null = null;

  for (const entry of chronological) {
    const row = entry.result.breakdown.find((breakdown) => breakdown.categoryId === categoryId);
    if (!row || row.total === 0) {
      continue;
    }

    categoryLabel = row.categoryLabel;
    const percent = Math.round((row.correct / row.total) * 100);

    points.push({
      sessionId: entry.id,
      label: new Date(entry.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      percent,
      correct: row.correct,
      total: row.total,
      completedAt: entry.completedAt,
      mode: entry.settings.mode,
      belowTarget: percent < (entry.settings.targetThreshold ?? 70)
    });
  }

  if (points.length === 0 || !categoryLabel) {
    return null;
  }

  const slice = points.slice(-limit);
  const percents = slice.map((point) => point.percent);
  const averagePercent = Math.round(percents.reduce((sum, value) => sum + value, 0) / percents.length);
  const bestPercent = Math.max(...percents);
  const recentDelta = slice.length >= 2 ? slice[slice.length - 1].percent - slice[slice.length - 2].percent : null;

  return {
    categoryId,
    categoryLabel,
    points: slice,
    averagePercent,
    bestPercent,
    recentDelta
  };
}
