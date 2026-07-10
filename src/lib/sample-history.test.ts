import { describe, it, expect } from 'vitest';
import { loadQuestionBanks } from '../data/questionBank';
import { loadSampleHistory } from '../lib/storage';
import type { Question } from '../types/exam';

describe('sample-history fixture', () => {
  const banks = loadQuestionBanks();
  const allQuestions: Question[] = [...banks.standard.questions, ...banks.scenario.questions];

  it('produces 6 sample sessions', () => {
    const sample = loadSampleHistory(allQuestions);
    expect(sample).toHaveLength(6);
  });

  it('marks every entry as sample: true', () => {
    const sample = loadSampleHistory(allQuestions);
    sample.forEach((entry) => {
      expect(entry.sample).toBe(true);
    });
  });

  it('uses real item IDs that exist in the question bank', () => {
    const sample = loadSampleHistory(allQuestions);
    const validIds = new Set(allQuestions.map((q) => q.id));
    sample.forEach((entry) => {
      entry.items.forEach((item) => {
        expect(validIds.has(item.itemId)).toBe(true);
      });
    });
  });

  it('generates answers for every item in every session', () => {
    const sample = loadSampleHistory(allQuestions);
    sample.forEach((entry) => {
      entry.items.forEach((item) => {
        expect(entry.answers[item.itemId]).not.toBeNull();
        expect(entry.answers[item.itemId]).toBeDefined();
      });
    });
  });

  it('keeps answer counts consistent with per-domain correct/total', () => {
    const sample = loadSampleHistory(allQuestions);
    sample.forEach((entry) => {
      const correctByDomain = new Map<string, number>();
      const totalByDomain = new Map<string, number>();
      entry.items.forEach((item) => {
        const d = item.categoryId;
        totalByDomain.set(d, (totalByDomain.get(d) ?? 0) + 1);
        if (entry.answers[item.itemId] === item.question.correct) {
          correctByDomain.set(d, (correctByDomain.get(d) ?? 0) + 1);
        }
      });
      entry.result.breakdown.forEach((b) => {
        expect(correctByDomain.get(b.categoryId)).toBe(b.correct);
        expect(totalByDomain.get(b.categoryId)).toBe(b.total);
      });
    });
  });

  it('produces the same data on repeated calls (deterministic)', () => {
    const first = loadSampleHistory(allQuestions);
    const second = loadSampleHistory(allQuestions);
    expect(first).toEqual(second);
  });

  it('uses fixed timestamps (not Date.now())', () => {
    const sample = loadSampleHistory(allQuestions);
    const timestamps = sample.map((e) => e.completedAt);
    const unique = new Set(timestamps);
    expect(unique.size).toBe(6);
    timestamps.forEach((ts) => {
      expect(ts).toMatch(/^2026-/);
    });
  });

  it('produces sessions in fixture order (oldest first); bootstrapState sorts newest-first', () => {
    const sample = loadSampleHistory(allQuestions);
    expect(sample[0].id).toBe('sample-0');
    expect(sample[5].id).toBe('sample-5');
    expect(sample[0].completedAt < sample[5].completedAt).toBe(true);
  });
});
