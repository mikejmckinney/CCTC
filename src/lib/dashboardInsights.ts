import type { HistoryEntry } from '../types/exam';

export type CategoryPerformance = {
  categoryId: string;
  categoryLabel: string;
  percent: number;
  correct: number;
  total: number;
};

export type DashboardInsights = {
  sessionCount: number;
  latestPercent: number | null;
  latestCompletedAt: string | null;
  recentDelta: number | null;
  categories: CategoryPerformance[];
  weakCategories: CategoryPerformance[];
};

function aggregateCategoryPerformance(entries: HistoryEntry[]): CategoryPerformance[] {
  const totals = new Map<string, { categoryLabel: string; correct: number; total: number }>();

  for (const entry of entries) {
    for (const row of entry.result.breakdown) {
      if (row.total <= 0) {
        continue;
      }

      const current = totals.get(row.categoryId) ?? {
        categoryLabel: row.categoryLabel,
        correct: 0,
        total: 0
      };

      current.correct += row.correct;
      current.total += row.total;
      totals.set(row.categoryId, current);
    }
  }

  return [...totals.entries()]
    .map(([categoryId, value]) => ({
      categoryId,
      categoryLabel: value.categoryLabel,
      correct: value.correct,
      total: value.total,
      percent: Math.round((value.correct / value.total) * 100)
    }))
    .sort((left, right) => left.categoryLabel.localeCompare(right.categoryLabel));
}

export function buildDashboardInsights(history: HistoryEntry[], weakThreshold: number): DashboardInsights {
  if (history.length === 0) {
    return {
      sessionCount: 0,
      latestPercent: null,
      latestCompletedAt: null,
      recentDelta: null,
      categories: [],
      weakCategories: []
    };
  }

  const chronological = [...history].sort((left, right) => left.completedAt.localeCompare(right.completedAt));
  const latest = chronological[chronological.length - 1];
  const previous = chronological.length >= 2 ? chronological[chronological.length - 2] : null;
  const categories = aggregateCategoryPerformance(history);
  const weakCategories = categories
    .filter((category) => category.percent < weakThreshold)
    .sort((left, right) => left.percent - right.percent);

  return {
    sessionCount: history.length,
    latestPercent: latest.result.percent,
    latestCompletedAt: latest.completedAt,
    recentDelta: previous ? latest.result.percent - previous.result.percent : null,
    categories,
    weakCategories
  };
}
