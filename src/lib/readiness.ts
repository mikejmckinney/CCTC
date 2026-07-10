import type { HistoryEntry, SessionResultBreakdown } from '../types/exam';

export const READINESS_ALPHA = 0.3;

export type DomainStatus = 'strong' | 'developing' | 'weak' | 'none';

export interface DomainBar {
  id: number;
  name: string;
  weightPct: number | null;
  ema: number | null;
  status: DomainStatus;
  statusLabel: string;
  pctLabel: string;
  color: string;
  textColor: string;
}

export interface ReadinessInsight {
  badge: string;
  badgeKind: 'success' | 'gold' | 'danger' | 'muted';
  text: string;
  action: 'quick' | 'full' | 'weakDomain';
  actionDomain: number | null;
  label: string;
}

export function ema(series: number[], alpha: number = READINESS_ALPHA): number | null {
  if (series.length === 0) return null;
  let v = series[0];
  for (let i = 1; i < series.length; i++) {
    v = alpha * series[i] + (1 - alpha) * v;
  }
  return Math.round(v);
}

export function examSessions(history: HistoryEntry[]): HistoryEntry[] {
  return history
    .filter((e) => e.settings.mode === 'exam')
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

export function examPercents(history: HistoryEntry[]): number[] {
  return examSessions(history).map((e) => e.result.percent);
}

export function computeReadinessEMA(history: HistoryEntry[], alpha: number = READINESS_ALPHA): number | null {
  return ema(examPercents(history), alpha);
}

export function computeReadinessDelta(history: HistoryEntry[], alpha: number = READINESS_ALPHA): number | null {
  const pcts = examPercents(history);
  if (pcts.length < 2) return null;
  const current = ema(pcts, alpha);
  const previous = ema(pcts.slice(0, -1), alpha);
  if (current === null || previous === null) return null;
  return current - previous;
}

export function computeBestExam(history: HistoryEntry[]): number | null {
  const pcts = examPercents(history);
  return pcts.length > 0 ? Math.max(...pcts) : null;
}

export function domainEMA(
  history: HistoryEntry[],
  domainId: number,
  alpha: number = READINESS_ALPHA
): number | null {
  const sessions = examSessions(history);
  const series = sessions
    .map((e) => {
      const b = e.result.breakdown.find((x) => x.categoryId === String(domainId));
      return b && b.total > 0 ? Math.round((b.correct / b.total) * 100) : null;
    })
    .filter((p): p is number => p !== null);
  return ema(series, alpha);
}

export function domainStatus(emaValue: number | null, target: number): DomainStatus {
  if (emaValue === null) return 'none';
  if (emaValue >= target) return 'strong';
  if (emaValue >= target - 15) return 'developing';
  return 'weak';
}

export function statusLabel(status: DomainStatus): string {
  switch (status) {
    case 'strong': return 'Strong';
    case 'developing': return 'Developing';
    case 'weak': return 'Weak';
    case 'none': return 'No data';
  }
}

export function statusColor(status: DomainStatus): string {
  switch (status) {
    case 'strong': return 'var(--success)';
    case 'developing': return 'var(--gold)';
    case 'weak': return 'var(--danger)';
    case 'none': return 'var(--line2)';
  }
}

export function statusTextColor(status: DomainStatus): string {
  switch (status) {
    case 'strong': return 'var(--successtext)';
    case 'developing': return 'var(--goldtext)';
    case 'weak': return 'var(--dangertext)';
    case 'none': return 'var(--muted)';
  }
}

export function weakDomains(
  history: HistoryEntry[],
  domains: Array<{ id: number; name: string }>,
  target: number,
  alpha: number = READINESS_ALPHA
): Array<{ id: number; name: string; pct: number | null }> {
  return domains
    .map((d) => ({ id: d.id, name: d.name, pct: domainEMA(history, d.id, alpha) }))
    .filter((x) => x.pct !== null && x.pct < target)
    .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0));
}

export function incorrectItemIds(history: HistoryEntry[]): string[] {
  const seen: Record<string, boolean> = {};
  const order: string[] = [];
  const sorted = history.slice().sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  for (const entry of sorted) {
    if (!entry.items || !entry.answers) continue;
    for (const item of entry.items) {
      const id = item.itemId;
      if (entry.answers[id] !== item.question.correct && !seen[id]) {
        seen[id] = true;
        order.push(id);
      }
    }
  }
  return order;
}

export function daysToExam(examDate: string | null): number | null {
  if (!examDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ex = new Date(examDate + 'T00:00:00');
  if (isNaN(ex.getTime())) return null;
  return Math.round((ex.getTime() - today.getTime()) / 86400000);
}

export function readinessInsight(
  history: HistoryEntry[],
  readinessPct: number | null,
  target: number,
  domains: Array<{ id: number; name: string }>,
  examDate: string | null,
  alpha: number = READINESS_ALPHA
): ReadinessInsight {
  const days = daysToExam(examDate);
  const daysPhrase = days === null ? '' : days < 0 ? '' : days === 0 ? ' Your exam is today.' : ` ${days} day${days === 1 ? '' : 's'} to go.`;
  const weak = weakDomains(history, domains, target, alpha);
  const weakest = weak[0];
  const examHistLen = examSessions(history).length;

  if (readinessPct === null || examHistLen === 0) {
    return {
      badge: 'Not measured',
      badgeKind: 'muted',
      text: `Take a practice exam to measure where you stand against your ${target}% target.${daysPhrase}`,
      action: 'quick',
      actionDomain: null,
      label: 'Take a quick exam →'
    };
  }

  if (readinessPct >= target && !weakest) {
    return {
      badge: 'Exam-ready',
      badgeKind: 'success',
      text: `You\u2019re at ${readinessPct}% \u2014 at or above your ${target}% target across every domain. On your practice data you\u2019re exam-ready; keep sharp with a full mock.${daysPhrase}`,
      action: 'full',
      actionDomain: null,
      label: 'Take a full mock exam →'
    };
  }

  if (readinessPct >= target && weakest) {
    return {
      badge: 'On track',
      badgeKind: 'gold',
      text: `Overall you\u2019re at ${readinessPct}% \u2014 at your ${target}% target \u2014 but ${weakest.name} (${Math.round(weakest.pct ?? 0)}%) still lags. One focused set will shore it up.${daysPhrase}`,
      action: 'weakDomain',
      actionDomain: weakest.id,
      label: `Practice ${weakest.name} \u00b7 10 questions →`
    };
  }

  const gap = target - readinessPct;
  const focus = weakest ? ` Start with ${weakest.name} (${Math.round(weakest.pct ?? 0)}%), your weakest area.` : '';
  return {
    badge: 'Below target',
    badgeKind: 'danger',
    text: `At ${readinessPct}%, you\u2019re ${gap} point${gap === 1 ? '' : 's'} below your ${target}% target.${focus}${daysPhrase}`,
    action: weakest ? 'weakDomain' : 'quick',
    actionDomain: weakest ? weakest.id : null,
    label: weakest ? `Practice ${weakest.name} \u00b7 10 questions →` : 'Take a quick exam →'
  };
}
