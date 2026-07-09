import type { HistoryEntry } from '../types/exam';

export interface DomainEma {
  domainId: number;
  domainName: string;
  domainShort: string;
  domainWeightPct: number;
  ema: number | null;
  status: 'strong' | 'developing' | 'weak' | 'unmeasured';
  statusLabel: string;
}

export interface ReadinessInsight {
  badge: string;
  badgeClass: string;
  verdict: string;
  actionLabel: string;
  actionType: 'quick-exam' | 'full-mock' | 'focused-domain';
  actionDomain?: number;
}

const ALPHA = 0.3;

function ema(values: number[]): number | null {
  if (values.length === 0) return null;
  let prev = values[0];
  for (let i = 1; i < values.length; i++) {
    prev = ALPHA * values[i] + (1 - ALPHA) * prev;
  }
  return prev;
}

function emaAllButLast(values: number[]): number | null {
  if (values.length < 2) return null;
  return ema(values.slice(0, -1));
}

function getExamSessions(history: HistoryEntry[]): HistoryEntry[] {
  return [...history]
    .filter((entry) => entry.settings.mode === 'exam')
    .sort((left, right) => left.completedAt.localeCompare(right.completedAt));
}

export function computeDomainEmas(
  history: HistoryEntry[],
  targetThreshold: number
): DomainEma[] {
  const examSessions = getExamSessions(history);
  const domainPcts = new Map<number, number[]>();

  examSessions.forEach((entry) => {
    entry.result.breakdown.forEach((b) => {
      const domainId = Number(b.categoryId);
      if (!Number.isNaN(domainId)) {
        if (!domainPcts.has(domainId)) {
          domainPcts.set(domainId, []);
        }
        domainPcts.get(domainId)!.push(b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0);
      }
    });
  });

  const DOMAIN_DEFS = [
    { domainId: 1, domainName: 'Transplant Education', domainShort: 'Education', domainWeightPct: 31 },
    { domainId: 2, domainName: 'Pre-Transplant Evaluation & Management', domainShort: 'Pre-transplant', domainWeightPct: 30 },
    { domainId: 3, domainName: 'Post-operative Monitoring & Reporting', domainShort: 'Post-op', domainWeightPct: 39 }
  ];

  return DOMAIN_DEFS.map((def) => {
    const values = domainPcts.get(def.domainId) ?? [];
    const domainEma = ema(values);
    let status: DomainEma['status'];
    let statusLabel: string;

    if (domainEma === null) {
      status = 'unmeasured';
      statusLabel = '\u2014';
    } else if (domainEma >= targetThreshold) {
      status = 'strong';
      statusLabel = 'Strong';
    } else if (domainEma >= targetThreshold - 15) {
      status = 'developing';
      statusLabel = 'Developing';
    } else {
      status = 'weak';
      statusLabel = 'Weak';
    }

    return {
      ...def,
      ema: domainEma,
      status,
      statusLabel
    };
  });
}

export function computeReadiness(history: HistoryEntry[]): number | null {
  const examPcts = getExamSessions(history).map((entry) => entry.result.percent);
  return ema(examPcts);
}

export function computeReadinessDelta(history: HistoryEntry[]): number | null {
  const examPcts = getExamSessions(history).map((entry) => entry.result.percent);
  const all = ema(examPcts);
  const allButLast = emaAllButLast(examPcts);
  if (all === null || allButLast === null) return null;
  return Math.round(all - allButLast);
}

export function computeDonutColor(percent: number | null): string {
  if (percent === null) return 'var(--ring)';
  if (percent >= 75) return 'var(--teal)';
  if (percent >= 65) return 'var(--gold)';
  return 'var(--danger)';
}

export function computeDonutStrokeDash(percent: number | null): number {
  if (percent === null) return 0;
  return Math.round((percent / 100) * 263.89);
}

export function getWeakestDomain(
  domainEmas: DomainEma[]
): DomainEma | undefined {
  return domainEmas
    .filter((d) => d.ema !== null)
    .sort((a, b) => (a.ema ?? 0) - (b.ema ?? 0))[0];
}

export function getWeakDomains(
  domainEmas: DomainEma[],
  targetThreshold: number
): DomainEma[] {
  return domainEmas
    .filter((d) => d.ema !== null && d.ema < targetThreshold)
    .sort((a, b) => (a.ema ?? 0) - (b.ema ?? 0));
}

export function computeInsight(
  history: HistoryEntry[],
  readiness: number | null,
  domainEmas: DomainEma[],
  targetThreshold: number,
  examDate?: string
): ReadinessInsight {
  const weakDomains = getWeakDomains(domainEmas, targetThreshold);
  const weakest = getWeakestDomain(domainEmas);
  const examSessions = getExamSessions(history);

  const daysPhrase = buildDaysPhrase(examDate);

  if (readiness === null || examSessions.length === 0) {
    return {
      badge: 'Not measured',
      badgeClass: 'badge--muted',
      verdict: 'No exam sessions yet. Take a quick exam to gauge your readiness.',
      actionLabel: 'Take a quick exam',
      actionType: 'quick-exam'
    };
  }

  let badge: string;
  let badgeClass: string;
  let actionLabel: string;
  let actionType: ReadinessInsight['actionType'];
  let actionDomain: number | undefined;

  const allDomainsStrong = weakDomains.length === 0;

  if (readiness >= targetThreshold && allDomainsStrong) {
    badge = 'Exam-ready';
    badgeClass = 'badge--success';
    actionLabel = 'Take a full mock exam';
    actionType = 'full-mock';
  } else if (readiness >= targetThreshold && weakest) {
    badge = 'On track';
    badgeClass = 'badge--gold';
    actionLabel = `Practice ${weakest.domainShort} \u00b7 10 questions`;
    actionType = 'focused-domain';
    actionDomain = weakest.domainId;
  } else {
    badge = 'Below target';
    badgeClass = 'badge--danger';
    const gap = targetThreshold - Math.round(readiness);
    actionLabel = weakest ? `Practice ${weakest.domainShort} \u00b7 10 questions` : 'Take a quick exam';
    actionType = weakest ? 'focused-domain' : 'quick-exam';
    actionDomain = weakest?.domainId;
  }

  return {
    badge,
    badgeClass,
    verdict: buildVerdict(readiness, targetThreshold, weakest, daysPhrase),
    actionLabel,
    actionType,
    actionDomain
  };
}

function buildDaysPhrase(examDate?: string): string {
  if (!examDate) return '';
  const now = new Date();
  const exam = new Date(examDate + 'T00:00:00');
  const diffMs = exam.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days < 0) return 'Your exam date has passed.';
  if (days === 0) return 'Your exam is today.';
  if (days === 1) return '1 day to your exam.';
  return `${days} days to your exam.`;
}

function buildVerdict(
  readiness: number | null,
  targetThreshold: number,
  weakest: DomainEma | undefined,
  daysPhrase: string
): string {
  const pct = Math.round(readiness ?? 0);
  let verdict = '';

  if ((readiness ?? 0) < targetThreshold) {
    verdict = `At ${pct}%, you're ${targetThreshold - pct} points below your ${targetThreshold}% target.`;
    if (weakest) {
      verdict += ` Start with ${weakest.domainShort} (${weakest.ema ?? 0}%), your weakest area.`;
    }
  } else if (weakest) {
    verdict = `You're on track at ${pct}%. ${weakest.domainShort} is your weakest domain at ${weakest.ema ?? 0}%.`;
  } else {
    verdict = `You're exam-ready at ${pct}% across all domains.`;
  }

  if (daysPhrase) {
    verdict += ` ${daysPhrase}`;
  }

  return verdict;
}

export function getLastNExamSessionPcts(history: HistoryEntry[], n: number): Array<{ id: string; label: string; percent: number; completedAt: string; mode: string; date: Date }> {
  return getExamSessions(history).slice(-n).map((entry) => ({
    id: entry.id,
    label: new Date(entry.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    percent: entry.result.percent,
    completedAt: entry.completedAt,
    mode: entry.settings.mode,
    date: new Date(entry.completedAt)
  }));
}

export function getPriorMissedItemIds(history: HistoryEntry[]): Set<string> {
  const missed = new Set<string>();
  history.forEach((entry) => {
    entry.items.forEach((item) => {
      const answer = entry.answers[item.itemId];
      if (answer && answer !== item.question.correct) {
        missed.add(item.itemId);
      }
    });
  });
  return missed;
}