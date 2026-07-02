import { describe, expect, it } from 'vitest';
import { buildItemPerformanceMap, getWeakestItems, getRecentlyIncorrectItems } from './itemPerformance';
import type { HistoryEntry, SessionItemSnapshot } from '../types/exam';

function makeItem(id: string, correct: string): SessionItemSnapshot {
  return {
    itemId: id,
    question: {
      id,
      status: 'reviewed',
      type: 'one_best',
      domain: 1,
      stem: `Question ${id}`,
      options: [
        { id: 'a', text: 'Option A' },
        { id: 'b', text: 'Option B' }
      ],
      correct,
      explanation: { rationale_correct: 'because', rationale_incorrect: {} },
      references: []
    } as any,
    optionOrder: ['a', 'b'],
    categoryId: '1',
    categoryLabel: 'Education'
  };
}

function makeEntry(
  id: string,
  items: SessionItemSnapshot[],
  answers: Record<string, string | null>,
  completedAt: string
): HistoryEntry {
  return {
    id,
    completedAt,
    settings: {
      blueprintId: 'cctc-from-2026-07',
      questionSet: 'standard',
      questionCount: items.length,
      timed: false,
      timeMinutes: 0,
      showTimer: false,
      mode: 'exam',
      includeDrafts: false,
      targetThreshold: 65
    },
    timeUsedSeconds: null,
    itemIds: items.map((i) => i.itemId),
    items,
    answers,
    flaggedForReview: [],
    result: {
      correct: Object.values(answers).filter((a, i) => a === items[i]?.question.correct).length,
      total: items.length,
      percent: 70,
      estimatedPass: true,
      breakdown: []
    }
  } as HistoryEntry;
}

describe('buildItemPerformanceMap', () => {
  it('returns empty map for no history', () => {
    const map = buildItemPerformanceMap([]);
    expect(map.size).toBe(0);
  });

  it('tracks correct and incorrect attempts', () => {
    const items = [makeItem('q1', 'a'), makeItem('q2', 'b')];
    const entry = makeEntry('s1', items, { q1: 'a', q2: 'a' }, '2026-07-01T12:00:00Z');

    const map = buildItemPerformanceMap([entry]);
    expect(map.get('q1')!.correct).toBe(1);
    expect(map.get('q1')!.incorrect).toBe(0);
    expect(map.get('q2')!.correct).toBe(0);
    expect(map.get('q2')!.incorrect).toBe(1);
  });

  it('accumulates across multiple sessions', () => {
    const items = [makeItem('q1', 'a')];
    const entries = [
      makeEntry('s1', items, { q1: 'a' }, '2026-07-01T12:00:00Z'),
      makeEntry('s2', items, { q1: 'b' }, '2026-07-02T12:00:00Z')
    ];

    const map = buildItemPerformanceMap(entries);
    const q1 = map.get('q1')!;
    expect(q1.attempts).toBe(2);
    expect(q1.correct).toBe(1);
    expect(q1.incorrect).toBe(1);
    expect(q1.lastCorrect).toBe(false);
  });

  it('calculates weakness score higher for items with more errors', () => {
    const items = [makeItem('q1', 'a'), makeItem('q2', 'b')];
    // q1 always correct, q2 always wrong
    const entries = [
      makeEntry('s1', items, { q1: 'a', q2: 'a' }, '2026-07-01T12:00:00Z'),
      makeEntry('s2', items, { q1: 'a', q2: 'a' }, '2026-07-02T12:00:00Z')
    ];

    const map = buildItemPerformanceMap(entries);
    expect(map.get('q2')!.weaknessScore).toBeGreaterThan(map.get('q1')!.weaknessScore);
  });
});

describe('getWeakestItems', () => {
  it('returns items sorted by weakness', () => {
    const items = [makeItem('q1', 'a'), makeItem('q2', 'b'), makeItem('q3', 'a')];
    const entries = [
      makeEntry('s1', items, { q1: 'a', q2: 'a', q3: 'b' }, '2026-07-01T12:00:00Z'),
      makeEntry('s2', items, { q1: 'a', q2: 'a', q3: 'b' }, '2026-07-02T12:00:00Z')
    ];

    const map = buildItemPerformanceMap(entries);
    const weakest = getWeakestItems(map, 2);
    expect(weakest).toHaveLength(2);
    // q2 and q3 were always wrong
    expect(weakest.map((w) => w.itemId)).toContain('q2');
    expect(weakest.map((w) => w.itemId)).toContain('q3');
  });
});

describe('getRecentlyIncorrectItems', () => {
  it('returns recently incorrect item ids', () => {
    const items = [makeItem('q1', 'a'), makeItem('q2', 'b')];
    const entries = [
      makeEntry('s1', items, { q1: 'b', q2: 'b' }, '2026-07-01T12:00:00Z'),
      makeEntry('s2', items, { q1: 'a', q2: 'a' }, '2026-07-02T12:00:00Z')
    ];

    const map = buildItemPerformanceMap(entries);
    const recent = getRecentlyIncorrectItems(map);
    // q2 was last answered incorrectly
    expect(recent).toContain('q2');
  });
});
