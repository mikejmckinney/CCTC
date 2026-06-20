import { describe, expect, it } from 'vitest';
import { buildHistoryTrend, formatTrendDelta } from './historyTrend';
import type { HistoryEntry } from '../types/exam';

function makeEntry(id: string, completedAt: string, percent: number): HistoryEntry {
  return {
    id,
    completedAt,
    settings: {
      blueprintId: 'cctc-from-2026-07',
      questionSet: 'standard',
      questionCount: 10,
      timed: false,
      timeMinutes: 180,
      showTimer: true,
      mode: 'exam',
      includeDrafts: false,
      targetThreshold: 70
    },
    timeUsedSeconds: 600,
    itemIds: ['cctc-1001'],
    items: [],
    answers: {},
    flaggedForReview: [],
    result: {
      correct: Math.round((percent / 100) * 10),
      total: 10,
      percent,
      estimatedPass: percent >= 70,
      breakdown: []
    }
  };
}

describe('buildHistoryTrend', () => {
  it('returns empty summary when there is no history', () => {
    expect(buildHistoryTrend([])).toEqual({
      points: [],
      averagePercent: null,
      bestPercent: null,
      recentDelta: null,
      targetThreshold: null
    });
  });

  it('orders points chronologically and computes summary stats', () => {
    const summary = buildHistoryTrend([
      makeEntry('b', '2026-06-02T12:00:00.000Z', 80),
      makeEntry('a', '2026-06-01T12:00:00.000Z', 60),
      makeEntry('c', '2026-06-03T12:00:00.000Z', 70)
    ]);

    expect(summary.points.map((point) => point.id)).toEqual(['a', 'b', 'c']);
    expect(summary.averagePercent).toBe(70);
    expect(summary.bestPercent).toBe(80);
    expect(summary.recentDelta).toBe(-10);
    expect(summary.targetThreshold).toBe(70);
    expect(summary.points[0]?.belowTarget).toBe(true);
    expect(summary.points[2]?.belowTarget).toBe(false);
  });

  it('limits the number of plotted points', () => {
    const entries = Array.from({ length: 25 }, (_, index) =>
      makeEntry(`id-${index}`, `2026-06-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`, 50 + index)
    );

    expect(buildHistoryTrend(entries, 20).points).toHaveLength(20);
  });
});

describe('formatTrendDelta', () => {
  it('prefixes positive deltas with a plus sign', () => {
    expect(formatTrendDelta(5)).toBe('+5 pts');
    expect(formatTrendDelta(-3)).toBe('-3 pts');
  });
});
