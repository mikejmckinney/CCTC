import { getBlueprint } from '../data/blueprints';
import type { Blueprint, BlueprintId, HistoryEntry, SessionSettings } from '../types/exam';

const DEFAULT_READINESS_ALPHA = 0.3;
const DEFAULT_WEAK_WINDOW = 6;

export interface ReadinessResult {
  percent: number | null;
  delta: number | null;
}

export interface FocusArea {
  categoryId: string;
  categoryLabel: string;
  pooledPercent: number | null;
  examWeightPct: number;
}

export interface WeakDomain {
  categoryId: string;
  categoryLabel: string;
  pooledPercent: number | null;
}

export interface RecentSession {
  id: string;
  completedAt: string;
  mode: 'study' | 'exam';
  questionCount: number;
  correct: number;
  total: number;
  percent: number;
  resultLabel: 'Pass' | 'Below';
  duration: string;
  timeUsedSeconds: number | null;
}

export type ReadinessStatus = 'not_measured' | 'below_target' | 'nearly_ready' | 'on_track';

export interface ReadinessInsight {
  status: ReadinessStatus;
  verdict: string;
  recommendedAction: string;
  weakestDomain: string | null;
}

function examSessions(entries: HistoryEntry[]): HistoryEntry[] {
  return [...entries]
    .filter((entry) => entry.settings.mode === 'exam')
    .sort((left, right) => left.completedAt.localeCompare(right.completedAt));
}

export function computeReadiness(
  entries: HistoryEntry[],
  alpha: number = DEFAULT_READINESS_ALPHA
): ReadinessResult {
  const exam = examSessions(entries);
  if (exam.length === 0) {
    return { percent: null, delta: null };
  }

  const percents = exam.map((entry) => entry.result.percent);
  const ema = computeEma(percents, alpha);
  const rounded = Math.round(ema);

  let delta: number | null = null;
  if (percents.length >= 2) {
    const emaAll = ema;
    const emaWithoutLast = computeEma(percents.slice(0, -1), alpha);
    delta = Math.round(emaAll - emaWithoutLast);
  }

  return { percent: rounded, delta };
}

function computeEma(values: number[], alpha: number): number {
  if (values.length === 0) return 0;
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = alpha * values[i] + (1 - alpha) * ema;
  }
  return ema;
}

export function computeScoreTrendPoints(
  entries: HistoryEntry[],
  limit: number = 8
): Array<{
  id: string;
  percent: number;
  label: string;
  completedAt: string;
  mode: 'study' | 'exam';
  belowTarget: boolean;
}> {
  const exam = examSessions(entries);
  const slice = exam.slice(-limit);
  return slice.map((entry) => ({
    id: entry.id,
    percent: entry.result.percent,
    label: new Date(entry.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    completedAt: entry.completedAt,
    mode: entry.settings.mode,
    belowTarget: entry.result.percent < (entry.settings.targetThreshold ?? 70)
  }));
}

export function computeFocusAreas(
  entries: HistoryEntry[],
  blueprintId: BlueprintId
): FocusArea[] {
  const blueprint = getBlueprint(blueprintId);
  const domainStats = new Map<string, { correct: number; total: number }>();

  for (const entry of entries) {
    for (const bd of entry.result.breakdown) {
      const existing = domainStats.get(bd.categoryId) ?? { correct: 0, total: 0 };
      existing.correct += bd.correct;
      existing.total += bd.total;
      domainStats.set(bd.categoryId, existing);
    }
  }

  const bindings = getBlueprintBindings(blueprint);

  return bindings.map((binding) => {
    const stats = domainStats.get(binding.id);
    const pooledPercent = stats && stats.total > 0
      ? Math.round((stats.correct / stats.total) * 100)
      : null;
    return {
      categoryId: binding.id,
      categoryLabel: binding.label,
      pooledPercent,
      examWeightPct: binding.weightPct
    };
  });
}

export function computeWeakDomains(
  entries: HistoryEntry[],
  blueprintId: BlueprintId,
  targetThreshold: number,
  windowSize: number = DEFAULT_WEAK_WINDOW
): WeakDomain[] {
  const blueprint = getBlueprint(blueprintId);
  const recent = [...entries]
    .sort((left, right) => left.completedAt.localeCompare(right.completedAt))
    .slice(-windowSize);

  const domainStats = new Map<string, { correct: number; total: number }>();

  for (const entry of recent) {
    for (const bd of entry.result.breakdown) {
      const existing = domainStats.get(bd.categoryId) ?? { correct: 0, total: 0 };
      existing.correct += bd.correct;
      existing.total += bd.total;
      domainStats.set(bd.categoryId, existing);
    }
  }

  const bindings = getBlueprintBindings(blueprint);
  const weakDomains: WeakDomain[] = [];

  for (const binding of bindings) {
    const stats = domainStats.get(binding.id);
    const pooledPercent = stats && stats.total > 0
      ? Math.round((stats.correct / stats.total) * 100)
      : null;
    if (pooledPercent !== null && pooledPercent < targetThreshold) {
      weakDomains.push({
        categoryId: binding.id,
        categoryLabel: binding.label,
        pooledPercent
      });
    }
  }

  weakDomains.sort((left, right) => {
    const lp = left.pooledPercent ?? 0;
    const rp = right.pooledPercent ?? 0;
    return lp - rp;
  });

  return weakDomains;
}

export function computeRecentSessions(
  entries: HistoryEntry[],
  limit: number = 5
): RecentSession[] {
  const sorted = [...entries].sort((left, right) => right.completedAt.localeCompare(left.completedAt));
  const slice = sorted.slice(0, limit);

  return slice.map((entry) => {
    const totalSeconds = entry.settings.timed ? entry.settings.timeMinutes * 60 : null;
    const timeUsed = entry.timeUsedSeconds;
    const duration = entry.settings.timed && timeUsed !== null
      ? `${Math.floor(timeUsed / 60)} min`
      : 'Untimed';
    return {
      id: entry.id,
      completedAt: entry.completedAt,
      mode: entry.settings.mode,
      questionCount: entry.result.total,
      correct: entry.result.correct,
      total: entry.result.total,
      percent: entry.result.percent,
      resultLabel: entry.result.estimatedPass ? 'Pass' : 'Below',
      duration,
      timeUsedSeconds: entry.timeUsedSeconds
    };
  });
}

export function computeReadinessInsight(
  readiness: ReadinessResult,
  focusAreas: FocusArea[],
  weakDomains: WeakDomain[],
  targetThreshold: number,
  daysToExam: number | null
): ReadinessInsight {
  if (readiness.percent === null) {
    return {
      status: 'not_measured',
      verdict: 'Take a quick exam to gauge your readiness.',
      recommendedAction: 'Take a quick exam',
      weakestDomain: null
    };
  }

  const weakestDomain = weakDomains.length > 0 ? weakDomains[0].categoryLabel : null;

  if (readiness.percent >= targetThreshold && weakDomains.length === 0) {
    let verdict = `At ${readiness.percent}%, you're on track for your ${targetThreshold}% target.`;
    if (daysToExam !== null) {
      if (daysToExam === 0) {
        verdict += ' Exam is today — stay confident.';
      } else if (daysToExam > 0) {
        verdict += ` ${daysToExam} day${daysToExam === 1 ? '' : 's'} to go.`;
      }
    }
    return {
      status: 'on_track',
      verdict,
      recommendedAction: 'Take a full mock exam',
      weakestDomain: null
    };
  }

  if (readiness.percent >= targetThreshold && weakDomains.length > 0) {
    const weakest = weakDomains[0];
    const weakestPct = weakest.pooledPercent ?? 0;
    let verdict = `At ${readiness.percent}%, you're near your ${targetThreshold}% target, but ${weakest.categoryLabel} is at ${weakestPct}%.`;
    if (daysToExam !== null && daysToExam > 0) {
      verdict += ` ${daysToExam} day${daysToExam === 1 ? '' : 's'} to go.`;
    }
    return {
      status: 'nearly_ready',
      verdict,
      recommendedAction: `Practice ${weakest.categoryLabel} · 10 questions`,
      weakestDomain: weakest.categoryId
    };
  }

  const gap = targetThreshold - readiness.percent;
  const weakest = weakDomains.length > 0 ? weakDomains[0] : null;
  let verdict = `At ${readiness.percent}%, you're ${gap} point${gap === 1 ? '' : 's'} below your ${targetThreshold}% target.`;
  if (weakest && weakest.pooledPercent !== null) {
    verdict += ` Start with ${weakest.categoryLabel} (${weakest.pooledPercent}%).`;
  }
  if (daysToExam !== null && daysToExam > 0) {
    verdict += ` ${daysToExam} day${daysToExam === 1 ? '' : 's'} to go.`;
  }

  return {
    status: 'below_target',
    verdict,
    recommendedAction: weakest
      ? `Practice ${weakest.categoryLabel} · 10 questions`
      : 'Take a quick exam',
    weakestDomain: weakest?.categoryId ?? null
  };
}

export function computeDaysToExam(examDate: string | undefined): number | null {
  if (!examDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDate + 'T00:00:00');
  const diffMs = exam.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function getExamDateText(days: number | null): string | null {
  if (days === null) return null;
  if (days < 0) return 'Exam date has passed';
  if (days === 0) return 'Exam is today';
  return `${days} day${days === 1 ? '' : 's'} to your exam`;
}

export function collectMissedItemIds(entries: HistoryEntry[]): Set<string> {
  const missed = new Set<string>();
  for (const entry of entries) {
    for (const item of entry.items) {
      const answer = entry.answers[item.itemId];
      if (answer !== null && answer !== item.question.correct) {
        missed.add(item.itemId);
      }
    }
  }
  return missed;
}

function getBlueprintBindings(blueprint: Blueprint): Array<{ id: string; label: string; weightPct: number }> {
  if (blueprint.structure === 'domain_task') {
    return blueprint.domains.map((d) => ({
      id: String(d.id),
      label: d.name,
      weightPct: d.weight_pct
    }));
  }
  return blueprint.sections.map((s) => ({
    id: s.id,
    label: s.name,
    weightPct: blueprint.scored_items > 0 ? Math.round((s.items / blueprint.scored_items) * 100) : 0
  }));
}
