import { describe, expect, it } from 'vitest';
import { buildDashboardInsights } from './dashboardInsights';
import type { HistoryEntry } from '../types/exam';

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 'session-1',
    completedAt: '2026-06-20T12:00:00.000Z',
    settings: {
      blueprintId: 'cctc-from-2026-07',
      questionSet: 'standard',
      mode: 'exam',
      questionCount: 25,
      timed: true,
      timeMinutes: 180,
      showTimer: true,
      includeDrafts: false,
      targetThreshold: 75
    },
    timeUsedSeconds: 3600,
    itemIds: ['cctc-1'],
    answers: { 'cctc-1': 'a' },
    flaggedForReview: [],
    items: [],
    result: {
      correct: 18,
      total: 25,
      percent: 72,
      estimatedPass: false,
      breakdown: [
        { categoryId: '1', categoryLabel: 'Education', correct: 9, total: 10 },
        { categoryId: '2', categoryLabel: 'Pre-transplant', correct: 5, total: 8 }
      ]
    },
    ...overrides
  };
}

describe('buildDashboardInsights', () => {
  it('returns empty insights when there is no history', () => {
    expect(buildDashboardInsights([], 75)).toEqual({
      sessionCount: 0,
      latestPercent: null,
      latestCompletedAt: null,
      recentDelta: null,
      categories: [],
      weakCategories: []
    });
  });

  it('aggregates category performance and flags weak areas below threshold', () => {
    const insights = buildDashboardInsights(
      [
        makeEntry(),
        makeEntry({
          id: 'session-2',
          completedAt: '2026-06-22T12:00:00.000Z',
          result: {
            correct: 20,
            total: 25,
            percent: 80,
            estimatedPass: true,
            breakdown: [
              { categoryId: '1', categoryLabel: 'Education', correct: 10, total: 10 },
              { categoryId: '2', categoryLabel: 'Pre-transplant', correct: 4, total: 8 }
            ]
          }
        })
      ],
      75
    );

    expect(insights.sessionCount).toBe(2);
    expect(insights.latestPercent).toBe(80);
    expect(insights.recentDelta).toBe(8);
    expect(insights.categories).toEqual([
      { categoryId: '1', categoryLabel: 'Education', correct: 19, total: 20, percent: 95 },
      { categoryId: '2', categoryLabel: 'Pre-transplant', correct: 9, total: 16, percent: 56 }
    ]);
    expect(insights.weakCategories.map((category) => category.categoryLabel)).toEqual(['Pre-transplant']);
  });
});
