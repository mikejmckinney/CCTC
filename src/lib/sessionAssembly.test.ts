import { describe, expect, it, vi } from 'vitest';
import { createSession, getScaledDomainTolerance, isBlueprintApplicable, summarizeSoftTargets } from './sessionAssembly';
import { LEGACY_BLUEPRINT } from '../data/blueprints';
import { getBlueprint } from '../data/blueprints';
import type { Question, SessionSettings } from '../types/exam';

const baseSettings: SessionSettings = {
  blueprintId: 'cctc-from-2026-07',
  questionSet: 'standard',
  questionCount: 3,
  timed: true,
  timeMinutes: 180,
  showTimer: true,
  mode: 'exam',
  includeDrafts: false,
  targetThreshold: 70
};

const reviewedQuestion = (
  id: string,
  domain: 1 | 2 | 3,
  task: string,
  shuffle = true,
  cognitive_level: Question['cognitive_level'] = 'application',
  organ: Question['organ'] = 'general'
): Question => ({
  id,
  version: 1,
  status: 'reviewed',
  type: 'one_best',
  domain,
  task,
  cognitive_level,
  organ,
  stem: `Stem for ${id}`,
  shuffle,
  options: [
    { id: 'A', text: 'Option A' },
    { id: 'B', text: 'Option B' },
    { id: 'C', text: 'Option C' },
    { id: 'D', text: 'Option D' }
  ],
  correct: 'A',
  explanation: {
    rationale_correct: 'Correct because.',
    rationale_incorrect: { B: 'Wrong', C: 'Wrong', D: 'Wrong' }
  },
  references: [{ citation: 'Reference' }]
});

describe('createSession', () => {
  it('keeps option order fixed for non-shuffle questions and reports shortages', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const session = createSession(
      [
        reviewedQuestion('cctc-1001', 1, '010100', false),
        reviewedQuestion('cctc-1002', 2, '020100'),
        reviewedQuestion('cctc-1003', 3, '030100')
      ],
      baseSettings,
      new Set()
    );

    const fixedItem = session.items.find((item) => item.itemId === 'cctc-1001');

    expect(fixedItem?.optionOrder).toEqual(['A', 'B', 'C', 'D']);
    expect(session.items).toHaveLength(3);
    expect(session.remainingSeconds).toBe(10800);
  });

  it('falls short gracefully when the reviewed bank cannot satisfy the request', () => {
    const session = createSession([reviewedQuestion('cctc-1004', 1, '010200')], baseSettings, new Set());

    expect(session.items).toHaveLength(1);
    expect(session.bankSummary[0]).toContain('can only assemble 1');
    expect(session.shortageNotes.length).toBeGreaterThan(0);
  });

  it('scales blueprint domain tolerance to the requested session size', () => {
    const blueprint = getBlueprint('cctc-from-2026-07');
    expect(getScaledDomainTolerance(blueprint, 150)).toBe(2);
    expect(getScaledDomainTolerance(blueprint, 15)).toBe(0);
  });

  it('excludes legacy-inapplicable items from legacy blueprint sessions', () => {
    const unmapped = { ...reviewedQuestion('cctc-3001', 1, '010100'), task: undefined };
    expect(isBlueprintApplicable(LEGACY_BLUEPRINT, unmapped)).toBe(false);

    const session = createSession(
      [unmapped, reviewedQuestion('cctc-3002', 2, '020100')],
      { ...baseSettings, blueprintId: 'cctc-thru-2026-06', questionCount: 1, includeDrafts: true },
      new Set()
    );

    expect(session.items).toHaveLength(1);
    expect(session.items[0].itemId).toBe('cctc-3002');
  });

  it('biases selection toward under-represented cognitive levels when possible', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    const bank = [
      reviewedQuestion('cctc-2001', 1, '010100', true, 'recall'),
      reviewedQuestion('cctc-2002', 1, '010200', true, 'recall'),
      reviewedQuestion('cctc-2003', 1, '010300', true, 'application'),
      reviewedQuestion('cctc-2004', 1, '010400', true, 'application')
    ];
    const index = new Map(bank.map((q) => [q.id, q]));

    const session = createSession(
      bank,
      { ...baseSettings, questionCount: 2, includeDrafts: true },
      new Set()
    );

    const picked = session.items.map((item) => index.get(item.itemId)?.cognitive_level);
    const summary = summarizeSoftTargets(session.items, getBlueprint('cctc-from-2026-07'), index);

    expect(picked).toContain('application');
    expect((summary.cognitive.get('application') ?? 0) >= 1).toBe(true);
  });
});