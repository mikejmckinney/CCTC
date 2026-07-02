import type { HistoryEntry, SessionResultBreakdown } from '../types/exam';

/**
 * Readiness score using Exponential Moving Average (EMA).
 * More recent sessions weigh more heavily, giving a better picture
 * of current readiness than a simple average.
 */

const EMA_ALPHA = 0.3; // smoothing factor — higher = more weight on recent

export interface DomainReadiness {
  categoryId: string;
  categoryLabel: string;
  emaScore: number;       // 0-100
  latestScore: number;    // 0-100
  sessionCount: number;
  trend: 'improving' | 'declining' | 'stable';
  examWeight: number;     // % of exam this domain represents
}

export interface ReadinessResult {
  overallScore: number;   // 0-100
  domains: DomainReadiness[];
  totalSessions: number;
  projectedScore: number;
  daysToExam: number | null;
  isReady: boolean;
  weakestDomain: DomainReadiness | null;
  strongestDomain: DomainReadiness | null;
}

/**
 * Calculate EMA for a sequence of scores.
 */
function calculateEMA(scores: number[], alpha: number = EMA_ALPHA): number {
  if (scores.length === 0) return 0;
  let ema = scores[0];
  for (let i = 1; i < scores.length; i++) {
    ema = alpha * scores[i] + (1 - alpha) * ema;
  }
  return Math.round(ema * 10) / 10;
}

/**
 * Determine trend from recent scores.
 */
function determineTrend(scores: number[]): 'improving' | 'declining' | 'stable' {
  if (scores.length < 3) return 'stable';
  const recent = scores.slice(-3);
  const earlier = scores.slice(0, Math.max(1, scores.length - 3));
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  const diff = recentAvg - earlierAvg;
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

/**
 * Domain exam weights from the CCTC blueprint (2026-07).
 * These represent the percentage of scored items per domain.
 */
const DOMAIN_WEIGHTS: Record<string, number> = {
  'domain-1': 37,  // Education & Management
  'domain-2': 33,  // Pre-Transplant
  'domain-3': 30,  // Post-Transplant
};

/**
 * Calculate overall readiness from session history.
 */
export function calculateReadiness(
  history: HistoryEntry[],
  targetThreshold: number = 75,
  examDate?: string | null
): ReadinessResult {
  if (history.length === 0) {
    return {
      overallScore: 0,
      domains: [],
      totalSessions: 0,
      projectedScore: 0,
      daysToExam: null,
      isReady: false,
      weakestDomain: null,
      strongestDomain: null,
    };
  }

  // Collect per-domain scores across sessions
  const domainScores: Record<string, { scores: number[]; label: string; total: number; correct: number }> = {};

  for (const entry of history) {
    if (!entry.result?.breakdown) continue;
    for (const bd of entry.result.breakdown) {
      if (!domainScores[bd.categoryId]) {
        domainScores[bd.categoryId] = { scores: [], label: bd.categoryLabel, total: 0, correct: 0 };
      }
      const pct = bd.total > 0 ? (bd.correct / bd.total) * 100 : 0;
      domainScores[bd.categoryId].scores.push(pct);
      domainScores[bd.categoryId].total += bd.total;
      domainScores[bd.categoryId].correct += bd.correct;
    }
  }

  // Build domain readiness objects
  const domains: DomainReadiness[] = Object.entries(domainScores).map(([catId, data]) => {
    const emaScore = calculateEMA(data.scores);
    const latestScore = data.scores[data.scores.length - 1] ?? 0;
    const trend = determineTrend(data.scores);
    const examWeight = DOMAIN_WEIGHTS[catId] ?? 0;

    return {
      categoryId: catId,
      categoryLabel: data.label,
      emaScore,
      latestScore: Math.round(latestScore * 10) / 10,
      sessionCount: data.scores.length,
      trend,
      examWeight,
    };
  });

  // Weighted overall score using domain EMA + exam weights
  const totalWeight = domains.reduce((sum, d) => sum + d.examWeight, 0);
  const overallScore = totalWeight > 0
    ? Math.round(domains.reduce((sum, d) => sum + d.emaScore * d.examWeight, 0) / totalWeight * 10) / 10
    : 0;

  // Projected score: weighted average of last 3 sessions
  const recentScores = history.slice(0, 3).map((e) => e.result?.percent ?? 0);
  const projectedScore = recentScores.length > 0
    ? Math.round(recentScores.reduce((a, b) => a + b, 0) / recentScores.length * 10) / 10
    : 0;

  // Days to exam
  let daysToExam: number | null = null;
  if (examDate) {
    const exam = new Date(examDate);
    const now = new Date();
    daysToExam = Math.ceil((exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysToExam < 0) daysToExam = 0;
  }

  // Find weakest and strongest
  const sorted = [...domains].sort((a, b) => a.emaScore - b.emaScore);
  const weakestDomain = sorted[0] ?? null;
  const strongestDomain = sorted[sorted.length - 1] ?? null;

  return {
    overallScore,
    domains,
    totalSessions: history.length,
    projectedScore,
    daysToExam,
    isReady: overallScore >= targetThreshold,
    weakestDomain,
    strongestDomain,
  };
}

/**
 * Generate plain-language "Am I Ready?" insight text.
 */
export function generateInsight(readiness: ReadinessResult, targetThreshold: number): string {
  if (readiness.totalSessions === 0) {
    return 'Take your first practice session to see where you stand.';
  }

  if (readiness.overallScore >= targetThreshold + 10) {
    return `You're well above your ${targetThreshold}% target. Focus on maintaining strength in ${readiness.strongestDomain?.categoryLabel ?? 'your best domain'}.`;
  }

  if (readiness.overallScore >= targetThreshold) {
    return `You're meeting your ${targetThreshold}% target. Keep practicing to build confidence — especially in ${readiness.weakestDomain?.categoryLabel ?? 'your weakest area'}.`;
  }

  if (readiness.weakestDomain && readiness.weakestDomain.emaScore < targetThreshold - 10) {
    return `Your weakest area is ${readiness.weakestDomain.categoryLabel} at ${readiness.weakestDomain.emaScore}%. Focus study sessions there to raise your overall score.`;
  }

  return `You're at ${readiness.overallScore}%, below your ${targetThreshold}% target. ${readiness.daysToExam ? `${readiness.daysToExam} days until exam — ` : ''}Consider focused study sessions on weak domains.`;
}

/**
 * Derive study plan recommendations from readiness data.
 */
export interface StudyPlanItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  domain?: string;
}

export function generateStudyPlan(readiness: ReadinessResult, targetThreshold: number): StudyPlanItem[] {
  const items: StudyPlanItem[] = [];

  if (readiness.totalSessions === 0) {
    items.push({
      id: 'first-session',
      title: 'Take a diagnostic session',
      description: 'Start with a 25-question session to establish your baseline.',
      priority: 'high',
    });
    return items;
  }

  // Weakest domain gets highest priority
  if (readiness.weakestDomain && readiness.weakestDomain.emaScore < targetThreshold) {
    items.push({
      id: `focus-${readiness.weakestDomain.categoryId}`,
      title: `Focus on ${readiness.weakestDomain.categoryLabel}`,
      description: `Your EMA score is ${readiness.weakestDomain.emaScore}%. Targeted practice here will have the biggest impact.`,
      priority: 'high',
      domain: readiness.weakestDomain.categoryId,
    });
  }

  // Declining domains
  for (const domain of readiness.domains) {
    if (domain.trend === 'declining') {
      items.push({
        id: `declining-${domain.categoryId}`,
        title: `Review ${domain.categoryLabel}`,
        description: `Your recent scores in this area are trending down. A review session can help reinforce key concepts.`,
        priority: 'medium',
        domain: domain.categoryId,
      });
    }
  }

  // If close to exam date
  if (readiness.daysToExam !== null && readiness.daysToExam <= 14) {
    items.push({
      id: 'exam-prep',
      title: 'Final exam preparation',
      description: `${readiness.daysToExam} days until exam. Take a full-length practice exam to simulate test conditions.`,
      priority: 'high',
    });
  }

  // Spaced repetition for previously incorrect items
  if (readiness.overallScore < targetThreshold) {
    items.push({
      id: 'weak-areas',
      title: 'Spaced repetition session',
      description: 'Review previously incorrect items using spaced repetition to strengthen retention.',
      priority: 'medium',
    });
  }

  return items.slice(0, 4); // max 4 items
}
