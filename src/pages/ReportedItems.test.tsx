import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReportedItems } from './ReportedItems';
import type { ItemFlag, Question } from '../types/exam';

const question: Question = {
  id: 'q-context', status: 'reviewed', type: 'one_best', domain: 2,
  stem: 'Which finding requires follow-up?',
  options: [{ id: 'A', text: 'Finding A' }, { id: 'B', text: 'Finding B' }],
  correct: 'A',
  explanation: { rationale_correct: 'Correct.', rationale_incorrect: { B: 'Incorrect.' } },
  references: [],
};

const flag: ItemFlag = {
  id: 'flag-1', item_id: question.id, version: 1, status: 'reviewed', reason: 'factual error',
  comment: 'Needs review', session_id: 'session-1', blueprint: 'cctc-from-2026-07', mode: 'study',
  createdAt: '2026-07-12T00:00:00.000Z', updatedAt: '2026-07-12T00:00:00.000Z',
};

describe('ReportedItems', () => {
  it('resolves question context from the live bank', () => {
    render(
      <ReportedItems
        flags={[flag]}
        questionIndex={new Map([[question.id, question]])}
        onEdit={() => undefined}
        onDelete={() => undefined}
        onExport={() => undefined}
        onClearAll={() => undefined}
      />
    );

    expect(screen.getByText(question.stem)).toBeInTheDocument();
    expect(screen.getByText('D2: Pre-Transplant')).toBeInTheDocument();
  });
});
