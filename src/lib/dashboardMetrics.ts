import { buildHistoryTrend } from './historyTrend';
import type { HistoryEntry } from '../types/exam';

export type PerformanceBand = 'teal' | 'gold' | 'danger';

export function performanceBand(percent: number): PerformanceBand {
  if (percent >= 75) {
    return 'teal';
  }
  if (percent >= 65) {
    return 'gold';
  }
  return 'danger';
}

export type FocusArea = {
  categoryId: string;
  categoryLabel: string;
  percent: number;
  band: PerformanceBand;
};

export type ReadinessSummary = {
  averagePercent: number | null;
  deltaPercent: number | null;
  sessionCount: number;
};

const READINESS_WINDOW = 8;

/** Days from `today` until `examDate` (midnight local). Invalid or missing dates return null. */
export function daysUntilExam(examDate: string | undefined, today: Date = new Date()): number | null {
  if (!examDate || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
    return null;
  }

  const exam = new Date(`${examDate}T00:00:00`);
  if (Number.isNaN(exam.getTime())) {
    return null;
  }

  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  const diffMs = exam.getTime() - startOfToday.getTime();
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

export function formatDashboardSubtitle(
  examDate: string | undefined,
  bankCount: number,
  questionSet: 'standard' | 'scenario',
  today: Date = new Date()
): string {
  const bankLabel = questionSet === 'scenario' ? 'scenario' : 'standard';
  const bankPart = `${bankCount} items in the ${bankLabel} bank · unofficial estimates only`;
  const days = daysUntilExam(examDate, today);

  if (days === null) {
    return bankPart;
  }
  if (days < 0) {
    return `Exam date passed · ${bankPart}`;
  }
  if (days === 0) {
    return `Exam is today · ${bankPart}`;
  }
  if (days === 1) {
    return `1 day to your exam · ${bankPart}`;
  }
  return `${days} days to your exam · ${bankPart}`;
}

/** Shorter home-line copy matching the prototype screenshots. */
export function formatHomeSubtitle(
  examDate: string | undefined,
  bankCount: number,
  today: Date = new Date()
): string {
  const bankPart = `${bankCount} practice items`;
  const days = daysUntilExam(examDate, today);

  if (days === null) {
    return bankPart;
  }
  if (days < 0) {
    return `Exam date passed · ${bankPart}`;
  }
  if (days === 0) {
    return `Exam is today · ${bankPart}`;
  }
  if (days === 1) {
    return `1 day to your exam · ${bankPart}`;
  }
  return `${days} days to your exam · ${bankPart}`;
}

export function formatReadinessDelta(deltaPercent: number | null): string {
  if (deltaPercent === null) {
    return 'No sessions yet';
  }
  if (deltaPercent > 0) {
    return `▲ ${deltaPercent} pts`;
  }
  if (deltaPercent < 0) {
    return `▼ ${Math.abs(deltaPercent)} pts`;
  }
  return 'No change';
}

export function readinessDeltaTone(deltaPercent: number | null): 'muted' | 'success' | 'danger' {
  if (deltaPercent === null || deltaPercent === 0) {
    return 'muted';
  }
  return deltaPercent > 0 ? 'success' : 'danger';
}

export function buildReadinessSummary(history: HistoryEntry[]): ReadinessSummary {
  const chronological = [...history].sort((left, right) => left.completedAt.localeCompare(right.completedAt));
  const recent = chronological.slice(-READINESS_WINDOW);
  const previous = chronological.slice(-READINESS_WINDOW * 2, -READINESS_WINDOW);

  if (recent.length === 0) {
    return { averagePercent: null, deltaPercent: null, sessionCount: 0 };
  }

  const recentAverage = Math.round(recent.reduce((sum, entry) => sum + entry.result.percent, 0) / recent.length);
  const previousAverage =
    previous.length > 0
      ? Math.round(previous.reduce((sum, entry) => sum + entry.result.percent, 0) / previous.length)
      : null;

  return {
    averagePercent: recentAverage,
    deltaPercent: previousAverage === null ? null : recentAverage - previousAverage,
    sessionCount: recent.length
  };
}

export function formatDomainBarName(categoryId: string, categoryLabel: string): string {
  const shortNames: Record<string, string> = {
    '1': 'Education',
    '2': 'Pre-transplant',
    '3': 'Post-op'
  };
  const short = shortNames[categoryId] ?? categoryLabel;
  return `Domain ${categoryId} · ${short}`;
}

export function buildFocusAreas(history: HistoryEntry[]): FocusArea[] {
  const totals = new Map<string, { label: string; correct: number; total: number }>();

  for (const entry of history) {
    for (const row of entry.result.breakdown) {
      if (row.total <= 0) {
        continue;
      }
      const current = totals.get(row.categoryId) ?? { label: row.categoryLabel, correct: 0, total: 0 };
      current.correct += row.correct;
      current.total += row.total;
      totals.set(row.categoryId, current);
    }
  }

  return [...totals.entries()]
    .map(([categoryId, value]) => {
      const percent = Math.round((value.correct / value.total) * 100);
      return {
        categoryId,
        categoryLabel: value.label,
        percent,
        band: performanceBand(percent)
      };
    })
    .sort((left, right) => left.percent - right.percent);
}

export function buildWeakAreaCategoryIds(history: HistoryEntry[], limit = 2): string[] {
  return buildFocusAreas(history)
    .slice(0, limit)
    .map((area) => area.categoryId);
}

export function buildRecentTrend(history: HistoryEntry[], limit = 8) {
  return buildHistoryTrend(history, limit);
}
