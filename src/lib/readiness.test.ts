import { describe, expect, it } from 'vitest';
import { calculateEMA, calculateCoverageBreadth, calculateDomainEMA, calculateReadiness } from './readiness';
import type { HistoryEntry } from '../types/exam';

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 'test-1',
    completedAt: '2026-07-01T12:00:00Z',
    settings: {
      blueprintId: 'cctc-from-2026-07',
      questionSet: 'standard',
      questionCount: 10,
      timed: false,
      timeMinutes: 0,
      showTimer: false,
      mode: 'exam',
      includeDrafts: false,
      targetThreshold: 65
    },
    timeUsedSeconds: null,
    itemIds: [],
    items: [],
    answers: {},
    flaggedForReview: [],
    result: {
      correct: 7,
      total: 10,
      percent: 70,
      estimatedPass: true,
      breakdown: [
        { categoryId: '1', categoryLabel: 'Education', correct: 3, total: 4 },
        { categoryId: '2', categoryLabel: 'Pre-Transplant', correct: 2, total: 3 },
        { categoryId: '3', categoryLabel: 'Post-Op', correct: 2, total: 3 }
      ]
    },
    ...overrides
  } as HistoryEntry;
}

describe('calculateEMA', () => {
  it('returns 0 for empty array', () => {
    expect(calculateEMA([])).toBe(0);
  });

  it('returns the single value for one score', () => {
    expect(calculateEMA([70])).toBe(70);
  });

  it('calculates EMA with default alpha', () => {
    const result = calculateEMA([60, 70, 80]);
    // EMA: start at 60, then 0.18*70 + 0.82*60 = 12.6+49.2=61.8, then 0.18*80+0.82*61.8=14.4+50.676=65.076
    expect(result).toBeCloseTo(65.08, 1);
  });

  it('reacts to recent scores more with higher alpha', () => {
    const lowAlpha = calculateEMA([50, 50, 50, 90], 0.1);
    const highAlpha = calculateEMA([50, 50, 50, 90], 0.5);
    expect(highAlpha).toBeGreaterThan(lowAlpha);
  });
});

describe('calculateCoverageBreadth', () => {
  it('returns 0 for no history', () => {
    const result = calculateCoverageBreadth([], 'cctc-from-2026-07');
    expect(result.breadth).toBe(0);
    expect(result.practicedDomains.size).toBe(0);
  });

  it('calculates breadth from history entries', () => {
    const entry = makeEntry();
    const result = calculateCoverageBreadth([entry], 'cctc-from-2026-07');
    // 3 domains practiced out of 3 total = 100%
    expect(result.breadth).toBe(100);
    expect(result.practicedDomains.size).toBe(3);
    expect(result.totalDomains).toBe(3);
  });

  it('handles partial coverage', () => {
    const entry = makeEntry({
      result: {
        correct: 5,
        total: 10,
        percent: 50,
        estimatedPass: false,
        breakdown: [
          { categoryId: '1', categoryLabel: 'Education', correct: 5, total: 10 }
        ]
      }
    } as any);
    const result = calculateCoverageBreadth([entry], 'cctc-from-2026-07');
    // 1 of 3 domains
    expect(result.breadth).toBeCloseTo(33, 0);
  });
});

describe('calculateDomainEMA', () => {
  it('returns 0 for no history', () => {
    const result = calculateDomainEMA([], '1');
    expect(result.ema).toBe(0);
    expect(result.totalAttempted).toBe(0);
  });

  it('calculates domain-level EMA', () => {
    const entries = [
      makeEntry({
        completedAt: '2026-07-01T12:00:00Z',
        result: {
          correct: 6, total: 10, percent: 60, estimatedPass: false,
          breakdown: [{ categoryId: '1', categoryLabel: 'Education', correct: 3, total: 5 }]
        }
      }),
      makeEntry({
        id: 'test-2',
        completedAt: '2026-07-02T12:00:00Z',
        result: {
          correct: 8, total: 10, percent: 80, estimatedPass: true,
          breakdown: [{ categoryId: '1', categoryLabel: 'Education', correct: 4, total: 5 }]
        }
      })
    ] as HistoryEntry[];

    const result = calculateDomainEMA(entries, '1');
    expect(result.totalAttempted).toBe(10);
    expect(result.totalCorrect).toBe(7);
    expect(result.ema).toBeGreaterThan(0);
  });
});

describe('calculateReadiness', () => {
  it('returns zeros for no history', () => {
    const result = calculateReadiness([], 'cctc-from-2026-07');
    expect(result.composite).toBe(0);
    expect(result.emaScore).toBe(0);
    expect(result.coverageBreadth).toBe(0);
    expect(result.totalSessions).toBe(0);
  });

  it('calculates composite score', () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeEntry({
        id: `test-${i}`,
        completedAt: `2026-07-0${i + 1}T12:00:00Z`,
        result: {
          correct: 7, total: 10, percent: 70, estimatedPass: true,
          breakdown: [
            { categoryId: '1', categoryLabel: 'Education', correct: 3, total: 4 },
            { categoryId: '2', categoryLabel: 'Pre-Transplant', correct: 2, total: 3 },
            { categoryId: '3', categoryLabel: 'Post-Op', correct: 2, total: 3 }
          ]
        }
      })
    );

    const result = calculateReadiness(entries, 'cctc-from-2026-07');
    expect(result.composite).toBeGreaterThan(0);
    expect(result.emaScore).toBe(70);
    expect(result.coverageBreadth).toBe(100);
    expect(result.totalSessions).toBe(5);
    expect(result.domains).toHaveLength(3);
  });

  it('identifies weak domains', () => {
    const entry = makeEntry({
      result: {
        correct: 4, total: 10, percent: 40, estimatedPass: false,
        breakdown: [
          { categoryId: '1', categoryLabel: 'Education', correct: 1, total: 3 },
          { categoryId: '2', categoryLabel: 'Pre-Transplant', correct: 1, total: 3 },
          { categoryId: '3', categoryLabel: 'Post-Op', correct: 2, total: 4 }
        ]
      }
    } as any);

    const result = calculateReadiness([entry], 'cctc-from-2026-07');
    // Education: 33% and Pre-Transplant: 33% should be weak (< 60%)
    expect(result.weakDomains.length).toBeGreaterThanOrEqual(2);
  });
});
