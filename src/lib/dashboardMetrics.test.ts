import { describe, expect, it } from 'vitest';
import {
  buildFocusAreas,
  buildReadinessSummary,
  formatDomainBarName,
  formatHomeSubtitle,
  formatReadinessDelta,
  performanceBand,
  readinessDeltaTone
} from './dashboardMetrics';
import type { HistoryEntry } from '../types/exam';

function entry(percent: number, categoryId = '1', categoryLabel = 'Domain 1'): HistoryEntry {
  return {
    id: `hist-${percent}-${Math.random()}`,
    completedAt: new Date(2026, 0, percent).toISOString(),
    settings: {
      blueprintId: 'cctc-from-2026-07',
      questionSet: 'standard',
      questionCount: 10,
      timed: false,
      timeMinutes: 180,
      showTimer: true,
      mode: 'exam',
      includeDrafts: false,
      targetThreshold: 70
    },
    timeUsedSeconds: 600,
    itemIds: ['q1'],
    items: [],
    answers: {},
    flaggedForReview: [],
    result: {
      correct: percent,
      total: 100,
      percent,
      estimatedPass: percent >= 70,
      breakdown: [{ categoryId, categoryLabel, correct: percent, total: 100 }]
    }
  };
}

describe('dashboardMetrics', () => {
  it('maps performance bands', () => {
    expect(performanceBand(80)).toBe('teal');
    expect(performanceBand(70)).toBe('gold');
    expect(performanceBand(50)).toBe('danger');
  });

  it('computes readiness average and delta across windows', () => {
    const history = Array.from({ length: 10 }, (_, index) => entry(index < 8 ? 80 : 60));
    const summary = buildReadinessSummary(history);
    expect(summary.averagePercent).toBe(80);
    expect(summary.deltaPercent).toBe(20);
    expect(summary.sessionCount).toBe(8);
  });

  it('formats home subtitle for prototype-style status line', () => {
    const today = new Date(2026, 5, 7);
    expect(formatHomeSubtitle('2026-06-21', 24, today)).toBe('14 days to your exam · 24 practice items');
    expect(formatHomeSubtitle(undefined, 506)).toBe('506 practice items');
  });

  it('formats readiness delta labels', () => {
    expect(formatReadinessDelta(5)).toBe('▲ 5 pts');
    expect(formatReadinessDelta(-3)).toBe('▼ 3 pts');
    expect(formatReadinessDelta(0)).toBe('No change');
    expect(readinessDeltaTone(5)).toBe('success');
    expect(readinessDeltaTone(-3)).toBe('danger');
  });

  it('formats domain bar labels like the prototype', () => {
    expect(formatDomainBarName('1', 'Transplant Education')).toBe('Domain 1 · Education');
    expect(formatDomainBarName('3', 'Post-operative Monitoring')).toBe('Domain 3 · Post-op');
  });

  it('builds focus areas from category breakdown', () => {
    const areas = buildFocusAreas([
      entry(90, '1', 'Kidney'),
      entry(55, '2', 'Liver')
    ]);
    expect(areas.map((area) => area.categoryLabel)).toEqual(['Liver', 'Kidney']);
    expect(areas[0]?.band).toBe('danger');
  });
});
