import { describe, expect, it, vi } from 'vitest';
import { createSession } from './sessionAssembly';
import type { ActiveSession, Question, SessionSettings } from '../types/exam';

const settings: SessionSettings = {
  blueprintId: 'cctc-from-2026-07',
  questionCount: 2,
  timed: true,
  timeMinutes: 90,
  showTimer: false,
  mode: 'exam',
  includeDrafts: true,
  targetThreshold: 75
};

const question = (id: string, domain: 1 | 2 | 3, shuffle = true): Question => ({
  id,
  version: 1,
  status: 'reviewed',
  type: 'one_best',
  domain,
  task: domain === 1 ? '010100' : domain === 2 ? '020100' : '030100',
  cognitive_level: 'application',
  organ: 'general',
  stem: `Stem ${id}`,
  shuffle,
  options: [
    { id: 'A', text: 'A' },
    { id: 'B', text: 'B' },
    { id: 'C', text: 'C' },
    { id: 'D', text: 'D' }
  ],
  correct: 'A',
  explanation: {
    rationale_correct: 'Because.',
    rationale_incorrect: { B: 'No', C: 'No', D: 'No' }
  },
  references: [{ citation: 'Ref' }]
});

describe('session resume fidelity', () => {
  it('preserves frozen structure and learner state across IndexedDB-style round trip', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.42);

    const created = createSession(
      [question('cctc-r1', 1, false), question('cctc-r2', 2)],
      settings,
      new Set(['cctc-r9'])
    );

    const inFlight: ActiveSession = {
      ...created,
      currentIndex: 1,
      remainingSeconds: 1234,
      timerHidden: true,
      flaggedForReview: [created.items[0].itemId],
      answers: {
        [created.items[0].itemId]: 'B',
        [created.items[1].itemId]: null
      },
      revealed: {
        [created.items[0].itemId]: false,
        [created.items[1].itemId]: false
      }
    };

    const restored = JSON.parse(JSON.stringify(inFlight)) as ActiveSession;

    expect(restored.items.map((item) => item.itemId)).toEqual(inFlight.items.map((item) => item.itemId));
    expect(restored.items.map((item) => item.optionOrder)).toEqual(inFlight.items.map((item) => item.optionOrder));
    expect(restored.answers).toEqual(inFlight.answers);
    expect(restored.flaggedForReview).toEqual(inFlight.flaggedForReview);
    expect(restored.currentIndex).toBe(1);
    expect(restored.remainingSeconds).toBe(1234);
    expect(restored.timerHidden).toBe(true);
    const fixedItem = restored.items.find((item) => item.itemId === 'cctc-r1');
    expect(fixedItem?.optionOrder).toEqual(['A', 'B', 'C', 'D']);
    expect(restored.items.map((item) => item.optionOrder)).toEqual(inFlight.items.map((item) => item.optionOrder));
  });
});
