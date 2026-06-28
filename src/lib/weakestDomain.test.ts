import { describe, expect, it } from 'vitest';
import { findWeakestDomain } from './weakestDomain';
import type { HistoryEntry } from '../types/exam';

function makeEntry(breakdown: Array<{ categoryId: string; categoryLabel: string; correct: number; total: number }>): HistoryEntry {
  return {
    id: 'test-1',
    completedAt: '2026-06-01T00:00:00Z',
    settings: {
      blueprintId: 'cctc-from-2026-07',
      questionSet: 'standard',
      questionCount: 10,
      timed: false,
      timeMinutes: 0,
      showTimer: false,
      mode: 'exam',
      includeDrafts: false,
      targetThreshold: 70
    },
    timeUsedSeconds: null,
    itemIds: [],
    items: [],
    answers: {},
    flaggedForReview: [],
    result: {
      correct: breakdown.reduce((s, b) => s + b.correct, 0),
      total: breakdown.reduce((s, b) => s + b.total, 0),
      percent: 0,
      estimatedPass: false,
      breakdown
    }
  };
}

describe('findWeakestDomain', () => {
  it('returns null for empty history', () => {
    expect(findWeakestDomain([])).toBeNull();
  });

  it('identifies the domain with the lowest percent', () => {
    const entry = makeEntry([
      { categoryId: '1', categoryLabel: 'Education', correct: 8, total: 10 },
      { categoryId: '2', categoryLabel: 'Evaluation', correct: 3, total: 10 },
      { categoryId: '3', categoryLabel: 'Monitoring', correct: 7, total: 10 }
    ]);

    const result = findWeakestDomain([entry]);
    expect(result).toEqual({ categoryId: '2', categoryLabel: 'Evaluation', percent: 30, total: 10 });
  });

  it('aggregates across multiple history entries', () => {
    const entry1 = makeEntry([
      { categoryId: '1', categoryLabel: 'Education', correct: 5, total: 10 },
      { categoryId: '2', categoryLabel: 'Evaluation', correct: 9, total: 10 }
    ]);
    const entry2 = makeEntry([
      { categoryId: '1', categoryLabel: 'Education', correct: 4, total: 10 },
      { categoryId: '2', categoryLabel: 'Evaluation', correct: 2, total: 10 }
    ]);

    const result = findWeakestDomain([entry1, entry2]);
    expect(result).not.toBeNull();
    expect(result!.categoryId).toBe('1');
    expect(result!.percent).toBe(45);
    expect(result!.total).toBe(20);
  });

  it('skips domains with zero total', () => {
    const entry = makeEntry([
      { categoryId: '1', categoryLabel: 'Education', correct: 0, total: 0 },
      { categoryId: '2', categoryLabel: 'Evaluation', correct: 3, total: 10 }
    ]);

    const result = findWeakestDomain([entry]);
    expect(result!.categoryId).toBe('2');
  });
});
