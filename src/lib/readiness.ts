import type { HistoryEntry } from '../types/exam';

/**
 * Exponential Moving Average smoothing factor.
 * Higher alpha = more weight on recent sessions (0.3 = moderate smoothing).
 */
const EMA_ALPHA = 0.3;

/**
 * First-session rule: when only one session exists, EMA equals that session's
 * score directly (no prior baseline of 0). This prevents the misleading case
 * where a first session of 85% would show as EMA 59% (= 0.3 * 85 + 0.7 * 0).
 */

export interface DomainReadiness {
  domainId: string;
  domainLabel: string;
  emaScore: number;
  examWeight: number;
  isWeak: boolean;
  sessions: number;
}

export interface ReadinessState {
  overallEma: number;
  domains: DomainReadiness[];
  totalSessions: number;
  recentTrend: 'improving' | 'declining' | 'stable';
  weakDomains: string[];
}

function computeEma(values: number[], alpha: number): number {
  if (values.length === 0) return 0;
  // First value initializes the EMA directly (not blended with 0)
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = alpha * values[i] + (1 - alpha) * ema;
  }
  return Math.round(ema);
}

export function computeReadiness(history: HistoryEntry[]): ReadinessState {
  if (history.length === 0) {
    return {
      overallEma: 0,
      domains: [],
      totalSessions: 0,
      recentTrend: 'stable',
      weakDomains: [],
    };
  }

  const chronological = [...history].sort((a, b) => a.completedAt.localeCompare(b.completedAt));

  const overallScores = chronological.map((e) => e.result.percent);
  const overallEma = computeEma(overallScores, EMA_ALPHA);

  const domainMap = new Map<string, { label: string; scores: number[]; examWeight: number }>();

  for (const entry of chronological) {
    const totalItems = entry.result.breakdown.reduce((sum, b) => sum + b.total, 0);

    for (const bd of entry.result.breakdown) {
      if (!domainMap.has(bd.categoryId)) {
        domainMap.set(bd.categoryId, {
          label: bd.categoryLabel,
          scores: [],
          examWeight: 0,
        });
      }
      const domain = domainMap.get(bd.categoryId)!;
      const pct = bd.total > 0 ? Math.round((bd.correct / bd.total) * 100) : 0;
      domain.scores.push(pct);
      domain.examWeight = totalItems > 0 ? Math.round((bd.total / totalItems) * 100) : 0;
    }
  }

  const domains: DomainReadiness[] = [];
  for (const [domainId, data] of domainMap) {
    const emaScore = computeEma(data.scores, EMA_ALPHA);
    domains.push({
      domainId,
      domainLabel: data.label,
      emaScore,
      examWeight: data.examWeight,
      isWeak: emaScore < 70,
      sessions: data.scores.length,
    });
  }

  domains.sort((a, b) => a.emaScore - b.emaScore);
  const weakDomains = domains.filter((d) => d.isWeak).map((d) => d.domainLabel);

  let recentTrend: 'improving' | 'declining' | 'stable' = 'stable';
  if (chronological.length >= 3) {
    const recent3 = chronological.slice(-3).map((e) => e.result.percent);
    const earlier3 = chronological.slice(-6, -3).map((e) => e.result.percent);
    if (earlier3.length > 0) {
      const recentAvg = recent3.reduce((s, v) => s + v, 0) / recent3.length;
      const earlierAvg = earlier3.reduce((s, v) => s + v, 0) / earlier3.length;
      if (recentAvg - earlierAvg > 3) recentTrend = 'improving';
      else if (earlierAvg - recentAvg > 3) recentTrend = 'declining';
    }
  }

  return { overallEma, domains, totalSessions: chronological.length, recentTrend, weakDomains };
}

export function computeSpacedRepetition(history: HistoryEntry[]): string[] {
  const incorrectMap = new Map<string, { count: number; lastSeen: string }>();

  for (const entry of [...history].sort((a, b) => a.completedAt.localeCompare(b.completedAt))) {
    for (const item of entry.items) {
      const answer = entry.answers[item.itemId];
      if (answer !== item.question.correct) {
        const existing = incorrectMap.get(item.itemId);
        incorrectMap.set(item.itemId, {
          count: (existing?.count ?? 0) + 1,
          lastSeen: entry.completedAt,
        });
      }
    }
  }

  return Array.from(incorrectMap.entries())
    .sort((a, b) => {
      const countDiff = b[1].count - a[1].count;
      if (countDiff !== 0) return countDiff;
      return a[1].lastSeen.localeCompare(b[1].lastSeen);
    })
    .map(([id]) => id);
}

export function generateStudyPlan(readiness: ReadinessState, spacedItems: number): string[] {
  const plan: string[] = [];

  if (readiness.weakDomains.length > 0) {
    plan.push(`Focus on ${readiness.weakDomains.join(', ')} — your weakest area(s).`);
  }

  if (spacedItems > 0) {
    plan.push(`Review ${spacedItems} previously missed item${spacedItems > 1 ? 's' : ''} using spaced repetition.`);
  }

  if (readiness.recentTrend === 'declining') {
    plan.push('Your recent scores are trending down. Consider shorter, focused study sessions.');
  } else if (readiness.recentTrend === 'improving') {
    plan.push('Great progress! Keep the momentum with regular practice sessions.');
  }

  if (readiness.totalSessions < 5) {
    plan.push('Take more practice sessions to build a reliable readiness picture.');
  }

  return plan;
}
