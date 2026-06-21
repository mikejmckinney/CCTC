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
    expect(banks.scenario.questions.length).toBe(330);
    expect(banks.scenario.notes).toEqual(['Scenario companion bank: 330/506 item(s) loaded.']);
    expect(banks.standard.questions.every((question) => !question.companion_of)).toBe(true);
    expect(banks.scenario.questions.every((question) => typeof question.companion_of === 'string')).toBe(
      true,
    );
    expect(banks.scenario.questions.filter((question) => question.status === 'reviewed').length).toBe(30);
    expect(banks.scenario.questions.filter((question) => question.status === 'draft').length).toBe(300);
  });
});
