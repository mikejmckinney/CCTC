import type { HistoryEntry, SessionResultBreakdown } from '../types/exam';

const EMA_ALPHA = 0.3;

export interface DomainEMA {
  domainId: string;
  domainLabel: string;
  ema: number;
  sessions: number;
  trend: 'improving' | 'steady' | 'declining';
  domainWeight: number;
}

export interface ReadinessSnapshot {
  score: number;
  coverage: number;
  mastery: number;
  mockPerf: number;
  tier: 'Building Foundation' | 'Approaching' | 'Ready to Test' | 'Exam-Ready';
  trend: 'improving' | 'steady' | 'declining';
  domainBreakdown: DomainEMA[];
  suggestedFocus: string | null;
  predictedReadyDate: string | null;
}

function ema(values: number[], alpha: number = EMA_ALPHA): number {
  if (values.length === 0) return 0;
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    result = alpha * values[i] + (1 - alpha) * result;
  }
  return result;
}

function classifyTier(score: number): ReadinessSnapshot['tier'] {
  if (score >= 85) return 'Exam-Ready';
  if (score >= 70) return 'Ready to Test';
  if (score >= 50) return 'Approaching';
  return 'Building Foundation';
}

function detectTrend(values: number[]): 'improving' | 'steady' | 'declining' {
  if (values.length < 3) return 'steady';
  const recent = values.slice(-3);
  const earlier = values.slice(0, Math.max(1, values.length - 3));
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  const delta = recentAvg - earlierAvg;
  if (delta > 3) return 'improving';
  if (delta < -3) return 'declining';
  return 'steady';
}

interface DomainRecord {
  domainId: string;
  domainLabel: string;
  percent: number;
}

function collectDomainScores(history: HistoryEntry[]): Map<string, { label: string; scores: number[] }> {
  const map = new Map<string, { label: string; scores: number[] }>();
  for (const entry of history) {
    for (const bd of entry.result.breakdown) {
      if (bd.total === 0) continue;
      const key = bd.categoryId;
      if (!map.has(key)) {
        map.set(key, { label: bd.categoryLabel, scores: [] });
      }
      map.get(key)!.scores.push((bd.correct / bd.total) * 100);
    }
  }
  return map;
}

export function computeReadiness(history: HistoryEntry[], domainWeights?: Record<string, number>): ReadinessSnapshot {
  if (history.length === 0) {
    return {
      score: 0,
      coverage: 0,
      mastery: 0,
      mockPerf: 0,
      tier: 'Building Foundation',
      trend: 'steady',
      domainBreakdown: [],
      suggestedFocus: null,
      predictedReadyDate: null
    };
  }

  const sorted = [...history].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const percents = sorted.map((e) => e.result.percent);

  // Coverage: fraction of unique domains attempted with at least 1 correct
  const domainMap = collectDomainScores(sorted);
  const totalDomains = 5; // CCTC blueprint has 5 domains
  const domainsWithScores = domainMap.size;
  const coverage = Math.min(100, Math.round((domainsWithScores / totalDomains) * 100));

  // Mastery: EMA of domain-level accuracy, averaged across domains
  const domainEMAs: DomainEMA[] = [];
  let weightedMastery = 0;
  let totalWeight = 0;

  for (const [domainId, { label, scores }] of domainMap) {
    const domainEma = Math.round(ema(scores));
    const domainTrend = detectTrend(scores);
    const weight = domainWeights?.[domainId] ?? 1;
    domainEMAs.push({
      domainId,
      domainLabel: label,
      ema: domainEma,
      sessions: scores.length,
      trend: domainTrend,
      domainWeight: weight
    });
    weightedMastery += domainEma * weight;
    totalWeight += weight;
  }

  const mastery = totalWeight > 0 ? Math.round(weightedMastery / totalWeight) : 0;

  // Mock performance: EMA of recent session scores
  const mockPerf = Math.round(ema(percents));

  // Overall readiness: weighted combination
  const score = Math.round(0.3 * coverage + 0.35 * mastery + 0.35 * mockPerf);
  const trend = detectTrend(percents);

  // Suggested focus: weakest domain
  const weakest = domainEMAs.reduce(
    (min, d) => (d.ema < min.ema ? d : min),
    domainEMAs[0]
  );

  const suggestedFocus = weakest && weakest.ema < 70
    ? `${weakest.domainLabel} — ${weakest.ema}% mastery across ${weakest.sessions} session(s)`
    : null;

  return {
    score: Math.min(100, score),
    coverage,
    mastery,
    mockPerf,
    tier: classifyTier(score),
    trend,
    domainBreakdown: domainEMAs,
    suggestedFocus,
    predictedReadyDate: null
  };
}

export interface StackedAreaPoint {
  date: string;
  dateLabel: string;
  [domainKey: string]: string | number;
}

export function buildStackedAreaData(history: HistoryEntry[]): StackedAreaPoint[] {
  const sorted = [...history].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const domainMap = new Map<string, string>();
  const runningEMA = new Map<string, number>();
  const points: StackedAreaPoint[] = [];

  for (const entry of sorted) {
    const dateObj = new Date(entry.completedAt);
    const dateLabel = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
    const point: StackedAreaPoint = { date: entry.completedAt, dateLabel };

    for (const bd of entry.result.breakdown) {
      if (bd.total === 0) continue;
      const key = bd.categoryLabel;
      domainMap.set(bd.categoryId, key);
      const pct = (bd.correct / bd.total) * 100;
      const prev = runningEMA.get(bd.categoryId) ?? pct;
      const newEma = EMA_ALPHA * pct + (1 - EMA_ALPHA) * prev;
      runningEMA.set(bd.categoryId, newEma);
      point[key] = Math.round(newEma);
    }

    points.push(point);
  }

  return points;
}

export function getWeakAreaItemIds(history: HistoryEntry[], limit: number = 30): string[] {
  if (history.length === 0) return [];
  const sorted = [...history].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const missed = new Map<string, { count: number; lastSeen: string }>();

  for (const entry of sorted) {
    for (const item of entry.items) {
      const answer = entry.answers[item.itemId];
      if (answer && answer !== item.question.correct) {
        const existing = missed.get(item.itemId);
        missed.set(item.itemId, {
          count: (existing?.count ?? 0) + 1,
          lastSeen: entry.completedAt
        });
      }
    }
  }

  return Array.from(missed.entries())
    .sort((a, b) => {
      if (b[1].count !== a[1].count) return b[1].count - a[1].count;
      return b[1].lastSeen.localeCompare(a[1].lastSeen);
    })
    .slice(0, limit)
    .map(([id]) => id);
}

export function getDomainKeys(history: HistoryEntry[]): string[] {
  const seen = new Set<string>();
  for (const entry of history) {
    for (const bd of entry.result.breakdown) {
      if (bd.total > 0) seen.add(bd.categoryLabel);
    }
  }
  return Array.from(seen);
}
