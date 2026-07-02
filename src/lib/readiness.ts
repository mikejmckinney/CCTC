import type { HistoryEntry, SessionResultBreakdown } from '../types/exam';
import type { DomainPerformance, ReadinessState } from '../types/dashboard';
import { getBlueprint } from '../data/blueprints';

// ─── EMA Calculation ───
// α = 2 / (span + 1). Span of 10 sessions → α ≈ 0.18
const DEFAULT_ALPHA = 2 / (10 + 1);

export function calculateEMA(scores: number[], alpha = DEFAULT_ALPHA): number {
  if (scores.length === 0) return 0;
  let ema = scores[0];
  for (let i = 1; i < scores.length; i++) {
    ema = alpha * scores[i] + (1 - alpha) * ema;
  }
  return Math.round(ema * 100) / 100;
}

// ─── Coverage Breadth ───
// Measures what fraction of blueprint domains the user has practiced
export function calculateCoverageBreadth(
  history: HistoryEntry[],
  blueprintId: string
): { breadth: number; practicedDomains: Set<string>; totalDomains: number } {
  const blueprint = getBlueprint(blueprintId as any);
  const allDomainIds =
    blueprint.structure === 'domain_task'
      ? blueprint.domains.map((d) => String(d.id))
      : blueprint.sections.map((s) => s.id);

  const totalDomains = allDomainIds.length;
  if (totalDomains === 0) return { breadth: 0, practicedDomains: new Set(), totalDomains: 0 };

  const practicedDomains = new Set<string>();
  for (const entry of history) {
    for (const row of entry.result.breakdown) {
      if (row.total > 0) {
        practicedDomains.add(row.categoryId);
      }
    }
  }

  const breadth = Math.round((practicedDomains.size / totalDomains) * 100);
  return { breadth, practicedDomains, totalDomains };
}

// ─── Domain-level EMA ───
export function calculateDomainEMA(
  history: HistoryEntry[],
  domainId: string,
  alpha = DEFAULT_ALPHA
): { ema: number; totalAttempted: number; totalCorrect: number } {
  const chronological = [...history].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const scores: number[] = [];
  let totalAttempted = 0;
  let totalCorrect = 0;

  for (const entry of chronological) {
    const row = entry.result.breakdown.find((b) => b.categoryId === domainId);
    if (!row || row.total === 0) continue;
    totalAttempted += row.total;
    totalCorrect += row.correct;
    scores.push(Math.round((row.correct / row.total) * 100));
  }

  return {
    ema: scores.length > 0 ? calculateEMA(scores, alpha) : 0,
    totalAttempted,
    totalCorrect
  };
}

// ─── Composite Readiness Score ───
// 70% EMA performance + 30% coverage breadth
const EMA_WEIGHT = 0.7;
const COVERAGE_WEIGHT = 0.3;
const WEAK_THRESHOLD = 60; // domains below this % are "weak"

export function calculateReadiness(
  history: HistoryEntry[],
  blueprintId: string
): ReadinessState {
  if (history.length === 0) {
    return {
      composite: 0,
      emaScore: 0,
      coverageBreadth: 0,
      domains: [],
      weakDomains: [],
      strongDomains: [],
      totalSessions: 0,
      totalQuestionsAttempted: 0,
      overallEmaPercent: 0
    };
  }

  // Overall EMA from session scores
  const chronological = [...history].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const sessionScores = chronological.map((e) => e.result.percent);
  const overallEma = calculateEMA(sessionScores);

  // Coverage breadth
  const { breadth } = calculateCoverageBreadth(history, blueprintId);

  // Composite
  const composite = Math.round(overallEma * EMA_WEIGHT + breadth * COVERAGE_WEIGHT);

  // Per-domain performance
  const blueprint = getBlueprint(blueprintId as any);
  const domainDefs =
    blueprint.structure === 'domain_task'
      ? blueprint.domains.map((d) => ({
          id: String(d.id),
          label: d.name,
          weightPct: d.weight_pct
        }))
      : blueprint.sections.map((s) => ({
          id: s.id,
          label: s.name,
          weightPct: Math.round((s.items / blueprint.scored_items) * 100)
        }));

  const domains: DomainPerformance[] = domainDefs.map((def) => {
    const { ema, totalAttempted, totalCorrect } = calculateDomainEMA(history, def.id);
    return {
      domainId: def.id,
      domainLabel: def.label,
      domainWeightPct: def.weightPct,
      emaScore: ema,
      totalAttempted,
      totalCorrect,
      isWeak: ema < WEAK_THRESHOLD && totalAttempted > 0
    };
  });

  const weakDomains = domains.filter((d) => d.isWeak);
  const strongDomains = domains.filter((d) => !d.isWeak && d.totalAttempted > 0);

  return {
    composite,
    emaScore: overallEma,
    coverageBreadth: breadth,
    domains,
    weakDomains,
    strongDomains,
    totalSessions: history.length,
    totalQuestionsAttempted: history.reduce((sum, e) => sum + e.result.total, 0),
    overallEmaPercent: overallEma
  };
}
