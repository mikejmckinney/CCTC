import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
  function renderSession(overrides: Partial<React.ComponentProps<typeof SessionView>> = {}) {
    return render(
      <SessionView
        session={{ ...session, items: [...session.items, { ...session.items[0], itemId: 'q2' }] }}
        questionIndex={new Map([[question.id, question]])}
        onAnswer={() => undefined}
        onNavigate={() => undefined}
        onToggleBookmark={() => undefined}
        onReport={() => undefined}
        onSubmit={() => undefined}
        onGoToQuestion={() => undefined}
        {...overrides}
      />
    );
  }

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

  it('selects displayed answers with letter and number shortcuts', () => {
    const onAnswer = vi.fn();
    renderSession({ onAnswer });

    fireEvent.keyDown(window, { key: 'b' });
    fireEvent.keyDown(window, { key: '1' });

    expect(onAnswer).toHaveBeenNthCalledWith(1, 'B');
    expect(onAnswer).toHaveBeenNthCalledWith(2, 'A');
  });

  it('navigates questions with page-level left and right shortcuts', () => {
    const onNavigate = vi.fn();
    renderSession({ onNavigate });

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    expect(onNavigate).toHaveBeenNthCalledWith(1, 1);
    expect(onNavigate).not.toHaveBeenCalledWith(-1);
  });

  it('does not trigger shortcuts while a dialog is open', () => {
    const onAnswer = vi.fn();
    renderSession({ onAnswer });
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);

    fireEvent.keyDown(window, { key: 'a' });

    expect(onAnswer).not.toHaveBeenCalled();
    dialog.remove();
  });

  it('shows positional progress through the session', () => {
    renderSession();

    expect(screen.getByRole('progressbar', { name: 'Session position: item 1 of 2' })).toHaveAttribute('aria-valuenow', '50');
  });
});
