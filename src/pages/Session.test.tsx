import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SessionView } from './Session';
import type { ActiveSession, Question } from '../types/exam';

const question: Question = {
  id: 'q1',
  status: 'reviewed',
  type: 'one_best',
  domain: 1,
  stem: 'Example question?',
  options: [
    { id: 'A', text: 'First' },
    { id: 'B', text: 'Second' },
  ],
  correct: 'A',
  explanation: { rationale_correct: 'Correct.', rationale_incorrect: { B: 'Incorrect.' } },
  references: [],
};

const session: ActiveSession = {
  id: 'session-1',
  createdAt: '2026-07-12T00:00:00.000Z',
  updatedAt: '2026-07-12T00:00:00.000Z',
  settings: {
    blueprintId: 'cctc-from-2026-07',
    questionSet: 'standard',
    questionCount: 1,
    timed: true,
    timeMinutes: 30,
    showTimer: false,
    mode: 'exam',
    includeDrafts: false,
    targetThreshold: 70,
  },
  shortageNotes: [],
  bankSummary: [],
  items: [{ itemId: 'q1', optionOrder: ['A', 'B'], categoryId: '1', categoryLabel: 'Education' }],
  answers: {},
  revealed: {},
  flaggedForReview: [],
  currentIndex: 0,
  remainingSeconds: 1800,
  timerHidden: true,
};

describe('SessionView', () => {
  it('honors the showTimer setting', () => {
    render(
      <SessionView
        session={session}
        questionIndex={new Map([[question.id, question]])}
        onAnswer={() => undefined}
        onNavigate={() => undefined}
        onToggleBookmark={() => undefined}
        onReport={() => undefined}
        onSubmit={() => undefined}
        onGoToQuestion={() => undefined}
      />
    );

    expect(screen.queryByText('00:30:00')).not.toBeInTheDocument();
  });
});
