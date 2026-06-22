import { describe, expect, it } from 'vitest';
import { shouldRunSessionTimer } from './sessionTimer';
import type { ActiveSession } from '../types/exam';

function makeSession(overrides: Partial<ActiveSession> = {}): ActiveSession {
  return {
    id: 'sess-1',
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
    settings: {
      blueprintId: 'cctc-from-2026-07',
      questionSet: 'standard',
      questionCount: 10,
      timed: true,
      timeMinutes: 180,
      showTimer: true,
      mode: 'exam',
      includeDrafts: false,
      targetThreshold: 70
    },
    items: [],
    answers: {},
    revealed: {},
    flaggedForReview: [],
    shortageNotes: [],
    bankSummary: [],
    currentIndex: 0,
    remainingSeconds: 120,
    timerHidden: false,
    submittedAt: undefined,
    ...overrides
  };
}

describe('shouldRunSessionTimer', () => {
  it('runs only on the session view for active timed sessions', () => {
    const session = makeSession();
    expect(shouldRunSessionTimer('session', session)).toBe(true);
    expect(shouldRunSessionTimer('dashboard', session)).toBe(false);
    expect(shouldRunSessionTimer('setup', session)).toBe(false);
    expect(shouldRunSessionTimer('history', session)).toBe(false);
  });

  it('does not run for untimed, submitted, or exhausted timers', () => {
    expect(shouldRunSessionTimer('session', makeSession({ settings: { ...makeSession().settings, timed: false } }))).toBe(false);
    expect(shouldRunSessionTimer('session', makeSession({ submittedAt: '2026-06-01T13:00:00.000Z' }))).toBe(false);
    expect(shouldRunSessionTimer('session', makeSession({ remainingSeconds: 0 }))).toBe(false);
    expect(shouldRunSessionTimer('session', null)).toBe(false);
  });
});
