import type { HistoryEntry, SessionResultBreakdown } from '../types/exam';

export interface WeakestDomainResult {
  categoryId: string;
  categoryLabel: string;
  percent: number;
  total: number;
}

export function findWeakestDomain(entries: HistoryEntry[]): WeakestDomainResult | null {
  if (entries.length === 0) {
    return null;
  }

  const totals = new Map<string, { label: string; correct: number; total: number }>();

  for (const entry of entries) {
    for (const row of entry.result.breakdown) {
      const existing = totals.get(row.categoryId);
      if (existing) {
        existing.correct += row.correct;
        existing.total += row.total;
      } else {
        totals.set(row.categoryId, { label: row.categoryLabel, correct: row.correct, total: row.total });
      }
    }
  }

  let weakest: WeakestDomainResult | null = null;

  for (const [categoryId, { label, correct, total }] of totals) {
    if (total === 0) {
      continue;
    }

    const percent = Math.round((correct / total) * 100);

    if (!weakest || percent < weakest.percent) {
      weakest = { categoryId, categoryLabel: label, percent, total };
    }
  }

  return weakest;
}
