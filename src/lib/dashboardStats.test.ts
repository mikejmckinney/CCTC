import { describe, expect, it } from 'vitest';
import {
  buildReadinessScore,
  buildFocusAreas,
  buildRecentSessions,
  collectIncorrectIds,
  getBlueprintVersionLabel,
} from './dashboardStats';
import type { HistoryEntry, SessionItemSnapshot } from '../types/exam';

function makeEntry(
  id: string,
  completedAt: string,
  percent: number,
  mode: 'exam' | 'study' = 'exam',
  breakdown: HistoryEntry['result']['breakdown'] = [],
  items: SessionItemSnapshot[] = [],
  answers: Record<string, string | null> = {}
): HistoryEntry {
  const correct = Math.round((percent / 100) * 10);
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
      mode,
      includeDrafts: false,
      targetThreshold: 70,
    },
    timeUsedSeconds: 600,
    itemIds: items.map((i) => i.itemId),
    items,
    answers,
    flaggedForReview: [],
    result: {
      correct,
      total: 10,
      percent,
      estimatedPass: percent >= 70,
      breakdown,
    },
  };
}

describe('buildReadinessScore', () => {
  it('returns zero avg when no exam history', () => {
    expect(buildReadinessScore([])).toEqual({ avg: 0, delta: null, examCount: 0 });
  });

  it('ignores study mode sessions', () => {
    const history = [makeEntry('1', '2026-06-01T12:00:00Z', 80, 'study')];
    expect(buildReadinessScore(history)).toEqual({ avg: 0, delta: null, examCount: 0 });
  });

  it('computes avg and delta from exam sessions', () => {
    const history = [
      makeEntry('a', '2026-06-01T12:00:00Z', 60),
      makeEntry('b', '2026-06-02T12:00:00Z', 70),
      makeEntry('c', '2026-06-03T12:00:00Z', 80),
    ];
    const result = buildReadinessScore(history);
    expect(result.avg).toBe(70);
    expect(result.delta).toBe(10);
    expect(result.examCount).toBe(3);
  });

  it('limits to last 8 exam sessions', () => {
    const history = Array.from({ length: 12 }, (_, i) =>
      makeEntry(`e-${i}`, `2026-06-${String(i + 1).padStart(2, '0')}T12:00:00Z`, 50 + i)
    );
    const result = buildReadinessScore(history);
    expect(result.examCount).toBe(12);
    // last 8 sessions (indices 4–11): scores 54,55,56,57,58,59,60,61 = 460/8 = 57.5 → 58
    expect(result.avg).toBe(58);
  });
});

describe('buildFocusAreas', () => {
  it('returns empty when no history', () => {
    expect(buildFocusAreas([])).toEqual([]);
  });

  it('aggregates breakdown across entries and sorts weakest first', () => {
    const history = [
      makeEntry('1', '2026-06-01T12:00:00Z', 80, 'exam', [
        { categoryId: '1', categoryLabel: 'Education', correct: 5, total: 6 },
        { categoryId: '2', categoryLabel: 'Donor Mgmt', correct: 2, total: 4 },
      ]),
      makeEntry('2', '2026-06-02T12:00:00Z', 70, 'exam', [
        { categoryId: '1', categoryLabel: 'Education', correct: 3, total: 4 },
        { categoryId: '2', categoryLabel: 'Donor Mgmt', correct: 4, total: 4 },
      ]),
    ];
    const areas = buildFocusAreas(history);
    expect(areas).toHaveLength(2);
    // Donor Mgmt: 6/8 = 75%, Education: 8/10 = 80%
    expect(areas[0].categoryId).toBe('2');
    expect(areas[0].pct).toBe(75);
    expect(areas[1].categoryId).toBe('1');
    expect(areas[1].pct).toBe(80);
  });
});

describe('buildRecentSessions', () => {
  it('returns empty when no history', () => {
    expect(buildRecentSessions([])).toEqual([]);
  });

  it('returns most recent sessions in reverse chronological order', () => {
    const history = [
      makeEntry('a', '2026-06-01T12:00:00Z', 60),
      makeEntry('b', '2026-06-03T12:00:00Z', 80),
      makeEntry('c', '2026-06-02T12:00:00Z', 70),
    ];
    const recent = buildRecentSessions(history, 2);
    expect(recent).toHaveLength(2);
    expect(recent[0].id).toBe('b');
    expect(recent[1].id).toBe('c');
  });
});

describe('collectIncorrectIds', () => {
  it('returns empty set when no history', () => {
    expect(collectIncorrectIds([]).size).toBe(0);
  });

  it('collects items where answer !== correct', () => {
    const items: SessionItemSnapshot[] = [
      {
        itemId: 'q1',
        question: { id: 'q1' } as any,
        optionOrder: [],
        categoryId: '1',
        categoryLabel: 'Test',
      },
      {
        itemId: 'q2',
        question: { id: 'q2', correct: 'B' } as any,
        optionOrder: [],
        categoryId: '1',
        categoryLabel: 'Test',
      },
    ];
    // override question.correct for q1
    items[0].question = { ...items[0].question, correct: 'A' } as any;

    const history = [
      makeEntry('1', '2026-06-01T12:00:00Z', 50, 'exam', [], items, {
        q1: 'B', // wrong
        q2: 'B', // correct
      }),
    ];
    const ids = collectIncorrectIds(history);
    expect(ids.has('q1')).toBe(true);
    expect(ids.has('q2')).toBe(false);
  });
});

describe('getBlueprintVersionLabel', () => {
  it('returns BP: 2026-07 for current blueprint', () => {
    expect(getBlueprintVersionLabel('cctc-from-2026-07')).toBe('BP: 2026-07');
  });

  it('returns BP: ≤2026-06 for legacy blueprint', () => {
    expect(getBlueprintVersionLabel('cctc-thru-2026-06')).toBe('BP: ≤2026-06');
  });
});
