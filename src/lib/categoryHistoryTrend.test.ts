import { describe, expect, it } from 'vitest';
import { buildCategoryHistoryTrend, listHistoryCategories } from './categoryHistoryTrend';
import type { HistoryEntry } from '../types/exam';

function makeEntry(
  id: string,
  completedAt: string,
  breakdown: Array<{ categoryId: string; categoryLabel: string; correct: number; total: number }>
): HistoryEntry {
  const correct = breakdown.reduce((sum, row) => sum + row.correct, 0);
  const total = breakdown.reduce((sum, row) => sum + row.total, 0);

  return {
    id,
    completedAt,
    settings: {
      blueprintId: 'cctc-from-2026-07',
      questionSet: 'standard',
      questionCount: total,
      timed: false,
      timeMinutes: 180,
      showTimer: true,
      mode: 'exam',
      includeDrafts: false,
      targetThreshold: 70
    },
    timeUsedSeconds: 600,
    itemIds: [],
    items: [],
    answers: {},
    flaggedForReview: [],
    result: {
      correct,
      total,
      percent: total === 0 ? 0 : Math.round((correct / total) * 100),
      estimatedPass: true,
      breakdown
    }
  };
}

describe('listHistoryCategories', () => {
  it('returns unique categories sorted by label', () => {
    const categories = listHistoryCategories([
      makeEntry('a', '2026-06-01T12:00:00.000Z', [
        { categoryId: 'd2', categoryLabel: 'Pre-transplant', correct: 2, total: 4 },
        { categoryId: 'd1', categoryLabel: 'Education', correct: 1, total: 2 }
      ]),
      makeEntry('b', '2026-06-02T12:00:00.000Z', [{ categoryId: 'd2', categoryLabel: 'Pre-transplant', correct: 3, total: 4 }])
    ]);

    expect(categories).toEqual([
      { categoryId: 'd1', categoryLabel: 'Education' },
      { categoryId: 'd2', categoryLabel: 'Pre-transplant' }
    ]);
  });
});

describe('buildCategoryHistoryTrend', () => {
  it('builds per-category percentages across sessions', () => {
    const trend = buildCategoryHistoryTrend(
      [
        makeEntry('a', '2026-06-01T12:00:00.000Z', [{ categoryId: 'd1', categoryLabel: 'Education', correct: 1, total: 2 }]),
        makeEntry('b', '2026-06-02T12:00:00.000Z', [{ categoryId: 'd1', categoryLabel: 'Education', correct: 2, total: 2 }])
      ],
      'd1'
    );

    expect(trend?.categoryLabel).toBe('Education');
    expect(trend?.points.map((point) => point.percent)).toEqual([50, 100]);
    expect(trend?.averagePercent).toBe(75);
    expect(trend?.bestPercent).toBe(100);
    expect(trend?.recentDelta).toBe(50);
    expect(trend?.points[0]?.belowTarget).toBe(true);
    expect(trend?.points[1]?.belowTarget).toBe(false);
  });

  it('skips sessions without the selected category', () => {
    const trend = buildCategoryHistoryTrend(
      [
        makeEntry('a', '2026-06-01T12:00:00.000Z', [{ categoryId: 'd2', categoryLabel: 'Pre-transplant', correct: 2, total: 4 }]),
        makeEntry('b', '2026-06-02T12:00:00.000Z', [{ categoryId: 'd1', categoryLabel: 'Education', correct: 1, total: 1 }])
      ],
      'd1'
    );

    expect(trend?.points).toHaveLength(1);
    expect(trend?.points[0]?.percent).toBe(100);
  });

  it('returns null when the category never appears', () => {
    expect(
      buildCategoryHistoryTrend(
        [makeEntry('a', '2026-06-01T12:00:00.000Z', [{ categoryId: 'd1', categoryLabel: 'Education', correct: 1, total: 2 }])],
        'missing'
      )
    ).toBeNull();
  });
});
