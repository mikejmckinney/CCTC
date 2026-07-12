import { describe, expect, it } from 'vitest';
import { computeReadiness, computeSpacedRepetition } from './readiness';
import type { ExamMode, HistoryEntry, Question } from '../types/exam';

function makeEntry(id: string, mode: ExamMode, percent: number, domainPercent: number): HistoryEntry {
  return {
    id,
    completedAt: `2026-07-${id.padStart(2, '0')}T00:00:00.000Z`,
    settings: {
      blueprintId: 'cctc-from-2026-07', questionSet: 'standard', questionCount: 10,
      timed: mode === 'exam', timeMinutes: 10, showTimer: true, mode, includeDrafts: false,
      targetThreshold: 70,
    },
    timeUsedSeconds: 600,
    itemIds: [], items: [], answers: {}, flaggedForReview: [],
    result: {
      correct: Math.round(percent / 10), total: 10, percent, estimatedPass: percent >= 70,
      breakdown: [{ categoryId: '1', categoryLabel: 'Education', correct: Math.round(domainPercent / 10), total: 10 }],
    },
  };
}

describe('computeReadiness', () => {
  it('derives readiness exclusively from exam sessions', () => {
    const readiness = computeReadiness([
      makeEntry('1', 'exam', 60, 50),
      makeEntry('2', 'study', 100, 100),
      makeEntry('3', 'exam', 80, 70),
    ]);

    expect(readiness.totalSessions).toBe(2);
    expect(readiness.overallEma).toBe(66);
    expect(readiness.domains[0]?.emaScore).toBe(56);
  });

  it('returns no readiness signal when history only contains study sessions', () => {
    const readiness = computeReadiness([makeEntry('1', 'study', 90, 90)]);

    expect(readiness.overallEma).toBe(0);
    expect(readiness.domains).toEqual([]);
    expect(readiness.totalSessions).toBe(0);
  });

  it('keeps study-session misses in the weak-area queue', () => {
    const entry = makeEntry('1', 'study', 50, 50);
    entry.items = [{ itemId: 'q1', optionOrder: ['A', 'B'], categoryId: '1', categoryLabel: 'Education' }];
    entry.itemIds = ['q1'];
    entry.answers = { q1: 'B' };
    const question: Question = {
      id: 'q1', status: 'reviewed', type: 'one_best', domain: 1, stem: 'Question',
      options: [{ id: 'A', text: 'Correct' }, { id: 'B', text: 'Incorrect' }], correct: 'A',
      explanation: { rationale_correct: 'Correct.', rationale_incorrect: { B: 'Incorrect.' } }, references: [],
    };

    expect(computeSpacedRepetition([entry], new Map([['q1', question]]))).toEqual(['q1']);
  });
});
