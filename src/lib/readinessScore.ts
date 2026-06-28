import type { HistoryEntry, SessionResultBreakdown } from '../types/exam';

const EMA_ALPHA = 0.3;

export interface DomainReadiness {
  categoryId: string;
  categoryLabel: string;
  emaPercent: number;
  sessionCount: number;
  isWeak: boolean;
  recentCorrect: number;
  recentTotal: number;
}

export interface ReadinessSummary {
  overallEma: number;
  domainReadiness: DomainReadiness[];
  weakestDomains: DomainReadiness[];
  sessionCount: number;
  daysUntilExam: number | null;
  estimatedCoveragePercent: number;
}

function emaForSeries(percents: number[], alpha: number = EMA_ALPHA): number {
  if (percents.length === 0) return 0;
  let ema = percents[0];
  for (let i = 1; i < percents.length; i++) {
    ema = alpha * percents[i] + (1 - alpha) * ema;
  }
  return Math.round(ema);
}

export function buildReadiness(
  history: HistoryEntry[],
  examDate: string | null,
  blueprintDomainCount: number,
  targetThreshold: number
): ReadinessSummary {
  if (history.length === 0) {
    return {
      overallEma: 0,
      domainReadiness: [],
      weakestDomains: [],
      sessionCount: 0,
      daysUntilExam: examDate ? Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000)) : null,
      estimatedCoveragePercent: 0
    };
  }

  const chronological = [...history].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const overallPercents = chronological.map((e) => e.result.percent);
  const overallEma = emaForSeries(overallPercents);

  const domainMap = new Map<string, {
    label: string;
    percents: number[];
    recentCorrect: number;
    recentTotal: number;
  }>();

  for (const entry of chronological) {
    for (const bd of entry.result.breakdown) {
      if (!domainMap.has(bd.categoryId)) {
        domainMap.set(bd.categoryId, { label: bd.categoryLabel, percents: [], recentCorrect: 0, recentTotal: 0 });
      }
      const bucket = domainMap.get(bd.categoryId)!;
      if (bd.total > 0) {
        bucket.percents.push(Math.round((bd.correct / bd.total) * 100));
      }
      bucket.recentCorrect = bd.correct;
      bucket.recentTotal = bd.total;
    }
  }

  const domainReadiness: DomainReadiness[] = [];
  for (const [categoryId, data] of domainMap) {
    const emaPercent = emaForSeries(data.percents);
    domainReadiness.push({
      categoryId,
      categoryLabel: data.label,
      emaPercent,
      sessionCount: data.percents.length,
      isWeak: emaPercent < targetThreshold,
      recentCorrect: data.recentCorrect,
      recentTotal: data.recentTotal
    });
  }

  domainReadiness.sort((a, b) => a.emaPercent - b.emaPercent);
  const weakestDomains = domainReadiness.filter((d) => d.isWeak).slice(0, 3);

  const testedDomainIds = new Set<string>();
  for (const entry of chronological) {
    for (const bd of entry.result.breakdown) {
      if (bd.total > 0) testedDomainIds.add(bd.categoryId);
    }
  }
  const estimatedCoveragePercent = blueprintDomainCount > 0
    ? Math.round((testedDomainIds.size / blueprintDomainCount) * 100)
    : 0;

  const daysUntilExam = examDate
    ? Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000))
    : null;

  return {
    overallEma,
    domainReadiness,
    weakestDomains,
    sessionCount: chronological.length,
    daysUntilExam,
    estimatedCoveragePercent
  };
}

export function getReadinessLabel(ema: number, threshold: number): string {
  if (ema >= threshold + 10) return 'Strong';
  if (ema >= threshold) return 'On track';
  if (ema >= threshold - 10) return 'Close';
  return 'Needs focus';
}

export function getReadinessColor(ema: number, threshold: number): 'success' | 'warning' | 'danger' {
  if (ema >= threshold) return 'success';
  if (ema >= threshold - 10) return 'warning';
  return 'danger';
}
