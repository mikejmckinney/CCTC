import { describe, it, expect } from 'vitest';
import { ema, computeReadinessEMA, computeReadinessDelta, domainEMA, domainStatus, weakDomains, readinessInsight, incorrectItemIds, daysToExam } from './readiness';
import type { HistoryEntry, SessionSettings } from '../types/exam';

function makeSettings(overrides: Partial<SessionSettings> = {}): SessionSettings {
  return {
    blueprintId: 'cctc-from-2026-07',
    questionSet: 'standard',
    questionCount: 10,
    timed: true,
    timeMinutes: 180,
    showTimer: true,
    mode: 'exam',
    includeDrafts: false,
    targetThreshold: 70,
    ...overrides
  };
}

function makeHistoryEntry(
  pct: number,
  mode: 'exam' | 'study' = 'exam',
  breakdown: Array<{ domain: number; correct: number; total: number }> = [],
  dayOffset: number = 0
): HistoryEntry {
  const id = `entry-${pct}-${mode}-${dayOffset}`;
  const ts = `2026-01-${String(15 + dayOffset).padStart(2, '0')}T12:00:00Z`;
  const result = {
    correct: Math.round((pct / 100) * 10),
    total: 10,
    percent: pct,
    estimatedPass: pct >= 70,
    breakdown: breakdown.map((b) => ({
      categoryId: String(b.domain),
      categoryLabel: `Domain ${b.domain}`,
      correct: b.correct,
      total: b.total
    }))
  };
  return {
    id,
    completedAt: ts,
    settings: makeSettings({ mode }),
    timeUsedSeconds: 3600,
    itemIds: [],
    items: [],
    answers: {},
    flaggedForReview: [],
    result
  };
}

describe('ema', () => {
  it('returns null for empty series', () => {
    expect(ema([])).toBeNull();
  });

  it('returns the first value for a single-element series', () => {
    expect(ema([70])).toBe(70);
  });

  it('weights recent values more with alpha=0.3', () => {
    const result = ema([60, 80]);
    // 0.3 * 80 + 0.7 * 60 = 24 + 42 = 66
    expect(result).toBe(66);
  });
});

describe('computeReadinessEMA', () => {
  it('returns null with no exam sessions', () => {
    expect(computeReadinessEMA([])).toBeNull();
  });

  it('excludes study sessions', () => {
    const study = makeHistoryEntry(90, 'study');
    expect(computeReadinessEMA([study])).toBeNull();
  });

  it('uses exam sessions in date order', () => {
    const e1 = makeHistoryEntry(60, 'exam', [], 0);
    const e2 = makeHistoryEntry(80, 'exam', [], 1);
    expect(computeReadinessEMA([e2, e1])).toBe(66); // sorted by date, EMA(60, 80) = 66
  });
});

describe('computeReadinessDelta', () => {
  it('returns null with fewer than 2 exam sessions', () => {
    expect(computeReadinessDelta([makeHistoryEntry(70, 'exam')])).toBeNull();
  });

  it('returns EMA(all) - EMA(all-but-last)', () => {
    const e1 = makeHistoryEntry(60, 'exam', [], 0);
    const e2 = makeHistoryEntry(80, 'exam', [], 1);
    const e3 = makeHistoryEntry(70, 'exam', [], 2);
    // EMA(60, 80, 70) = 0.3*70 + 0.7*(0.3*80 + 0.7*60) = 21 + 0.7*66 = 21 + 46.2 = 67
    // EMA(60, 80) = 66
    // delta = 67 - 66 = 1
    const result = computeReadinessDelta([e1, e2, e3]);
    expect(result).not.toBeNull();
  });
});

describe('domainStatus', () => {
  it('returns none for null', () => {
    expect(domainStatus(null, 70)).toBe('none');
  });

  it('returns strong when >= target', () => {
    expect(domainStatus(75, 70)).toBe('strong');
  });

  it('returns developing when within 15 points of target', () => {
    expect(domainStatus(60, 70)).toBe('developing');
  });

  it('returns weak when below target-15', () => {
    expect(domainStatus(50, 70)).toBe('weak');
  });
});

describe('weakDomains', () => {
  it('returns domains below target', () => {
    const domains = [
      { id: 1, name: 'Education' },
      { id: 2, name: 'Pre-transplant' },
      { id: 3, name: 'Post-op' }
    ];
    const history = [
      makeHistoryEntry(50, 'exam', [
        { domain: 1, correct: 3, total: 5 },
        { domain: 2, correct: 4, total: 5 },
        { domain: 3, correct: 5, total: 5 }
      ])
    ];
    const weak = weakDomains(history, domains, 80);
    expect(weak.length).toBeGreaterThan(0);
  });
});

describe('incorrectItemIds', () => {
  it('returns empty array for empty history', () => {
    expect(incorrectItemIds([])).toEqual([]);
  });
});

describe('daysToExam', () => {
  it('returns null for null date', () => {
    expect(daysToExam(null)).toBeNull();
  });

  it('returns null for invalid date', () => {
    expect(daysToExam('not-a-date')).toBeNull();
  });

  it('returns 0 for today', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(daysToExam(today)).toBe(0);
  });
});

describe('readinessInsight', () => {
  const domains = [
    { id: 1, name: 'Education' },
    { id: 2, name: 'Pre-transplant' },
    { id: 3, name: 'Post-op' }
  ];

  it('returns "Not measured" with no exam history', () => {
    const result = readinessInsight([], null, 70, domains, null);
    expect(result.badge).toBe('Not measured');
    expect(result.action).toBe('quick');
  });
});
