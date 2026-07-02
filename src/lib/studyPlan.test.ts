import { describe, expect, it } from 'vitest';
import { generateStudyPlan, generateAmIReady } from './studyPlan';
import type { HistoryEntry } from '../types/exam';
import type { ReadinessState } from '../types/dashboard';

function makeReadiness(overrides: Partial<ReadinessState> = {}): ReadinessState {
  return {
    composite: 70,
    emaScore: 70,
    coverageBreadth: 100,
    domains: [
      { domainId: '1', domainLabel: 'Education', domainWeightPct: 31, emaScore: 78, totalAttempted: 50, totalCorrect: 39, isWeak: false },
      { domainId: '2', domainLabel: 'Pre-Transplant', domainWeightPct: 30, emaScore: 55, totalAttempted: 50, totalCorrect: 28, isWeak: true },
      { domainId: '3', domainLabel: 'Post-Op', domainWeightPct: 39, emaScore: 71, totalAttempted: 50, totalCorrect: 36, isWeak: false }
    ],
    weakDomains: [
      { domainId: '2', domainLabel: 'Pre-Transplant', domainWeightPct: 30, emaScore: 55, totalAttempted: 50, totalCorrect: 28, isWeak: true }
    ],
    strongDomains: [
      { domainId: '1', domainLabel: 'Education', domainWeightPct: 31, emaScore: 78, totalAttempted: 50, totalCorrect: 39, isWeak: false },
      { domainId: '3', domainLabel: 'Post-Op', domainWeightPct: 39, emaScore: 71, totalAttempted: 50, totalCorrect: 36, isWeak: false }
    ],
    totalSessions: 10,
    totalQuestionsAttempted: 250,
    overallEmaPercent: 70,
    ...overrides
  };
}

describe('generateStudyPlan', () => {
  it('prioritizes weak domains', () => {
    const readiness = makeReadiness();
    const plan = generateStudyPlan([], readiness, null, 65);
    expect(plan.items[0].priority).toBe('high');
    expect(plan.items[0].domainId).toBe('2');
  });

  it('includes exam countdown when date is set', () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const readiness = makeReadiness();
    const plan = generateStudyPlan([], readiness, futureDate, 65);
    expect(plan.examCountdown).toBeGreaterThan(25);
  });

  it('returns null countdown when no exam date', () => {
    const readiness = makeReadiness();
    const plan = generateStudyPlan([], readiness, null, 65);
    expect(plan.examCountdown).toBeNull();
  });

  it('sets ready level based on composite vs target', () => {
    const ready = makeReadiness({ composite: 80 });
    const plan = generateStudyPlan([], ready, null, 65);
    expect(plan.readyLevel).toBe('ready');

    const notReady = makeReadiness({ composite: 30 });
    const plan2 = generateStudyPlan([], notReady, null, 65);
    expect(plan2.readyLevel).toBe('not-ready');
  });
});

describe('generateAmIReady', () => {
  it('generates positive insights when above target', () => {
    const readiness = makeReadiness({ composite: 75 });
    const result = generateAmIReady(readiness, 65, null);
    expect(result.level).toBe('ready');
    expect(result.insights.some((i) => i.type === 'positive')).toBe(true);
  });

  it('generates warning insights for weak domains', () => {
    const readiness = makeReadiness();
    const result = generateAmIReady(readiness, 65, null);
    expect(result.insights.some((i) => i.type === 'warning' && i.message.includes('Pre-Transplant'))).toBe(true);
  });

  it('generates warning for low coverage', () => {
    const readiness = makeReadiness({ coverageBreadth: 33 });
    const result = generateAmIReady(readiness, 65, null);
    expect(result.insights.some((i) => i.type === 'warning' && i.message.includes('33%'))).toBe(true);
  });

  it('generates info for few sessions', () => {
    const readiness = makeReadiness({ totalSessions: 1 });
    const result = generateAmIReady(readiness, 65, null);
    expect(result.insights.some((i) => i.type === 'info')).toBe(true);
  });
});
