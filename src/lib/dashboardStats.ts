import { getBlueprint } from '../data/blueprints';
import type { BlueprintId, ExamMode, HistoryEntry } from '../types/exam';

export interface ReadinessScore {
  avg: number;
  delta: number | null;
  examCount: number;
}

export interface FocusArea {
  categoryId: string;
  categoryLabel: string;
  correct: number;
  total: number;
  pct: number;
}

export interface RecentSession {
  id: string;
  date: string;
  mode: ExamMode;
  correct: number;
  total: number;
  percent: number;
  durationSeconds: number | null;
  completedAt: string;
}

const READINESS_WINDOW = 8;

export function buildReadinessScore(history: HistoryEntry[]): ReadinessScore {
  const examSessions = history
    .filter((entry) => entry.settings.mode === 'exam')
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));

  if (examSessions.length === 0) {
    return { avg: 0, delta: null, examCount: 0 };
  }

  const lastN = examSessions.slice(-READINESS_WINDOW);
  const avg = Math.round(lastN.reduce((sum, entry) => sum + entry.result.percent, 0) / lastN.length);
  const delta =
    lastN.length >= 2
      ? lastN[lastN.length - 1].result.percent - lastN[lastN.length - 2].result.percent
      : null;

  return { avg, delta, examCount: examSessions.length };
}

export function buildFocusAreas(history: HistoryEntry[]): FocusArea[] {
  const totals = new Map<string, { label: string; correct: number; total: number }>();

  for (const entry of history) {
    for (const bd of entry.result.breakdown) {
      const existing = totals.get(bd.categoryId);
      if (existing) {
        existing.correct += bd.correct;
        existing.total += bd.total;
      } else {
        totals.set(bd.categoryId, {
          label: bd.categoryLabel,
          correct: bd.correct,
          total: bd.total,
        });
      }
    }
  }

  return Array.from(totals.entries())
    .map(([id, data]) => ({
      categoryId: id,
      categoryLabel: data.label,
      correct: data.correct,
      total: data.total,
      pct: data.total === 0 ? 0 : Math.round((data.correct / data.total) * 100),
    }))
    .sort((a, b) => a.pct - b.pct);
}

export function buildRecentSessions(history: HistoryEntry[], limit = 5): RecentSession[] {
  return [...history]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, limit)
    .map((entry) => ({
      id: entry.id,
      date: new Date(entry.completedAt).toLocaleString(),
      mode: entry.settings.mode,
      correct: entry.result.correct,
      total: entry.result.total,
      percent: entry.result.percent,
      durationSeconds: entry.timeUsedSeconds,
      completedAt: entry.completedAt,
    }));
}

export function collectIncorrectIds(history: HistoryEntry[]): Set<string> {
  const incorrect = new Set<string>();

  for (const entry of history) {
    for (const item of entry.items) {
      const answer = entry.answers[item.itemId];
      if (answer !== null && answer !== item.question.correct) {
        incorrect.add(item.itemId);
      }
    }
  }

  return incorrect;
}

export function getBlueprintVersionLabel(blueprintId: BlueprintId): string {
  const blueprint = getBlueprint(blueprintId);
  if (blueprint.structure === 'domain_task') {
    const fromMatch = blueprint.id.match(/from-(\d{4}-\d{2})/);
    return fromMatch ? `BP: ${fromMatch[1]}` : blueprint.id;
  }
  const thruMatch = blueprint.id.match(/thru-(\d{4}-\d{2})/);
  return thruMatch ? `BP: ≤${thruMatch[1]}` : blueprint.id;
}
