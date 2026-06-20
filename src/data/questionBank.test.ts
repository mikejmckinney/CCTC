import { describe, expect, it } from 'vitest';
import { loadQuestionBanks, resolveLoadedBank } from './questionBank';
import type { Question } from '../types/exam';

const exampleQuestion: Question = {
  id: 'cctc-0001',
  status: 'draft',
  type: 'one_best',
  domain: 1,
  stem: 'Example',
  options: [{ id: 'A', text: 'A' }],
  correct: 'A',
  explanation: { rationale_correct: 'Yes', rationale_incorrect: {} },
  references: [{ citation: 'Ref' }]
};

describe('resolveLoadedBank', () => {
  it('uses examples when primary shards exist but are empty', () => {
    const bank = resolveLoadedBank([], [exampleQuestion]);

    expect(bank.questions).toEqual([exampleQuestion]);
    expect(bank.notes.length).toBeGreaterThan(0);
  });

  it('prefers non-empty primary shards over examples', () => {
    const bank = resolveLoadedBank([exampleQuestion], []);

    expect(bank.questions).toEqual([exampleQuestion]);
    expect(bank.notes).toEqual([]);
  });

  it('loads standard and scenario banks separately', () => {
    const banks = loadQuestionBanks();

    expect(banks.standard.questions.length).toBeGreaterThan(0);
    expect(banks.scenario.questions).toEqual([]);
    expect(banks.scenario.notes.length).toBeGreaterThan(0);
    expect(banks.standard.questions.every((question) => !question.companion_of)).toBe(true);
  });
});
