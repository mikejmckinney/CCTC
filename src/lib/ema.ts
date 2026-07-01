import type { HistoryEntry } from '../types/exam';

export interface EMADataPoint {
  date: string;
  value: number;
  sessionPercent: number;
}

export interface DomainStrength {
  categoryId: string;
  categoryLabel: string;
  ema: number;
  examPercent: number;
  level: 'weak' | 'moderate' | 'strong';
  totalAttempted: number;
}

const EMA_ALPHA = 0.3;
const WEAK_THRESHOLD = 60;
const STRONG_THRESHOLD = 80;

export function calcEMA(history: HistoryEntry[], alpha = EMA_ALPHA): EMADataPoint[] {
  if (history.length === 0) return [];

  const sorted = [...history].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const points: EMADataPoint[] = [];
  let ema = sorted[0].result.percent;

  points.push({
    date: sorted[0].completedAt,
    value: Math.round(ema),
    sessionPercent: sorted[0].result.percent,
  });

  for (let i = 1; i < sorted.length; i++) {
    const sessionPercent = sorted[i].result.percent;
    ema = alpha * sessionPercent + (1 - alpha) * ema;
    points.push({
      date: sorted[i].completedAt,
      value: Math.round(ema),
      sessionPercent,
    });
  }

  return points;
}

export function getCurrentEMA(history: HistoryEntry[], alpha = EMA_ALPHA): number {
  if (history.length === 0) return 0;
  const points = calcEMA(history, alpha);
  return points[points.length - 1].value;
}

export function calcDomainStrengths(history: HistoryEntry[]): DomainStrength[] {
  if (history.length === 0) return [];

  const sorted = [...history].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const domainMap = new Map<string, { ema: number; label: string; totalAttempted: number; totalCorrect: number }>();

  for (const entry of sorted) {
    for (const row of entry.result.breakdown) {
      const existing = domainMap.get(row.categoryId);
      const percent = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0;

      if (existing) {
        existing.ema = EMA_ALPHA * percent + (1 - EMA_ALPHA) * existing.ema;
        existing.totalAttempted += row.total;
        existing.totalCorrect += row.correct;
      } else {
        domainMap.set(row.categoryId, {
          ema: percent,
          label: row.categoryLabel,
          totalAttempted: row.total,
          totalCorrect: row.correct,
        });
      }
    }
  }

  const strengths: DomainStrength[] = [];
  domainMap.forEach((data, categoryId) => {
    const ema = Math.round(data.ema);
    let level: DomainStrength['level'] = 'moderate';
    if (ema < WEAK_THRESHOLD) level = 'weak';
    else if (ema >= STRONG_THRESHOLD) level = 'strong';

    strengths.push({
      categoryId,
      categoryLabel: data.label,
      ema,
      examPercent: data.totalAttempted > 0 ? Math.round((data.totalCorrect / data.totalAttempted) * 100) : 0,
      level,
      totalAttempted: data.totalAttempted,
    });
  });

  return strengths.sort((a, b) => a.ema - b.ema);
}

export function getReadinessAdvice(ema: number, domainStrengths: DomainStrength[]): string[] {
  const advice: string[] = [];

  if (ema < 50) {
    advice.push('Focus on fundamentals — your readiness score suggests reviewing core concepts before taking a full exam.');
  } else if (ema < 70) {
    advice.push('You are building momentum. Target weak domains to push your readiness above 70%.');
  } else if (ema < 85) {
    advice.push('Good progress. Review flagged items and edge cases to solidify your knowledge.');
  } else {
    advice.push('Strong readiness. Focus on maintaining consistency and reviewing any remaining weak spots.');
  }

  const weakDomains = domainStrengths.filter((d) => d.level === 'weak');
  if (weakDomains.length > 0) {
    advice.push(`Weak areas: ${weakDomains.map((d) => d.categoryLabel).join(', ')}. Prioritize these in your next session.`);
  }

  if (domainStrengths.length > 0 && domainStrengths.every((d) => d.level !== 'weak')) {
    advice.push('No weak domains — you are well-rounded. Consider a full-length timed exam to simulate test conditions.');
  }

  return advice;
}
