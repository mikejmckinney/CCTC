import type { HistoryEntry } from '../types/exam';
import type { AmIReady, ReadinessState, ReadyInsight, StudyPlan, StudyPlanItem } from '../types/dashboard';
import { calculateReadiness } from './readiness';

// ─── Study Plan Generator ───
export function generateStudyPlan(
  history: HistoryEntry[],
  readiness: ReadinessState,
  examDate: string | null,
  targetScore: number
): StudyPlan {
  const items: StudyPlanItem[] = [];
  const examCountdown = examDate ? daysUntil(examDate) : null;

  // High priority: weak domains
  for (const domain of readiness.weakDomains) {
    items.push({
      priority: 'high',
      domainId: domain.domainId,
      domainLabel: domain.domainLabel,
      topic: domain.domainLabel,
      estimatedMinutes: estimateStudyMinutes(domain.emaScore),
      reason: `Score at ${domain.emaScore}% — below ${60}% threshold`
    });
  }

  // Medium priority: domains not yet attempted
  for (const domain of readiness.domains.filter((d) => d.totalAttempted === 0)) {
    items.push({
      priority: 'medium',
      domainId: domain.domainId,
      domainLabel: domain.domainLabel,
      topic: domain.domainLabel,
      estimatedMinutes: 15,
      reason: 'Not yet practiced'
    });
  }

  // Low priority: strong domains for maintenance
  for (const domain of readiness.strongDomains.slice(0, 2)) {
    items.push({
      priority: 'low',
      domainId: domain.domainId,
      domainLabel: domain.domainLabel,
      topic: domain.domainLabel,
      estimatedMinutes: 10,
      reason: `Maintain strength (${domain.emaScore}%)`
    });
  }

  // Determine recommended next action
  let recommendedNextAction = 'Start a practice session';
  if (readiness.weakDomains.length > 0) {
    recommendedNextAction = `Focus on ${readiness.weakDomains[0].domainLabel}`;
  } else if (readiness.totalSessions === 0) {
    recommendedNextAction = 'Take your first practice exam';
  } else if (readiness.composite >= targetScore) {
    recommendedNextAction = 'You\'re on track — keep reviewing';
  }

  // Determine ready level
  const readyLevel = getReadyLevel(readiness.composite, targetScore, examCountdown);

  return {
    items: items.slice(0, 5), // max 5 items
    recommendedNextAction,
    examCountdown,
    readyLevel
  };
}

// ─── Am I Ready Insights ───
export function generateAmIReady(
  readiness: ReadinessState,
  targetScore: number,
  examDate: string | null
): AmIReady {
  const insights: ReadyInsight[] = [];
  const examCountdown = examDate ? daysUntil(examDate) : null;
  const level = getReadyLevel(readiness.composite, targetScore, examCountdown);

  // Positive signals
  if (readiness.composite >= targetScore) {
    insights.push({
      type: 'positive',
      message: `Readiness score of ${readiness.composite}% meets your ${targetScore}% target`
    });
  }
  if (readiness.strongDomains.length >= 2) {
    insights.push({
      type: 'positive',
      message: `Strong performance in ${readiness.strongDomains.map((d) => d.domainLabel).join(' and ')}`
    });
  }
  if (readiness.totalSessions >= 10) {
    insights.push({
      type: 'positive',
      message: `${readiness.totalSessions} sessions completed — solid practice history`
    });
  }

  // Warning signals
  if (readiness.weakDomains.length > 0) {
    insights.push({
      type: 'warning',
      message: `Weak in ${readiness.weakDomains.map((d) => d.domainLabel).join(', ')} — focus study here`
    });
  }
  if (readiness.coverageBreadth < 60) {
    insights.push({
      type: 'warning',
      message: `Only ${readiness.coverageBreadth}% of blueprint domains practiced`
    });
  }
  if (examCountdown !== null && examCountdown < 14 && readiness.composite < targetScore) {
    insights.push({
      type: 'warning',
      message: `${examCountdown} days until exam — readiness is ${readiness.composite}% vs ${targetScore}% target`
    });
  }
  if (readiness.totalSessions < 3) {
    insights.push({
      type: 'info',
      message: 'Complete more sessions for a more accurate readiness assessment'
    });
  }

  // Info
  if (readiness.totalSessions > 0 && readiness.emaScore > readiness.composite) {
    insights.push({
      type: 'info',
      message: 'Practicing more domains will improve your overall readiness'
    });
  }

  const levelLabels = {
    'not-ready': 'Not Ready',
    'getting-there': 'Getting There',
    'almost-there': 'Almost There',
    'ready': 'Ready'
  };

  const levelSummaries = {
    'not-ready': 'Significant gaps remain. Focus on weak areas and build breadth.',
    'getting-there': 'Making progress, but key areas need attention before the exam.',
    'almost-there': 'Close to target. A few more focused sessions will get you there.',
    'ready': 'On track to meet your target. Keep up the momentum.'
  };

  return {
    level,
    label: levelLabels[level],
    summary: levelSummaries[level],
    insights
  };
}

// ─── Helpers ───
function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function estimateStudyMinutes(emaScore: number): number {
  if (emaScore < 40) return 25;
  if (emaScore < 60) return 20;
  if (emaScore < 75) return 15;
  return 10;
}

function getReadyLevel(
  composite: number,
  targetScore: number,
  examCountdown: number | null
): StudyPlan['readyLevel'] {
  if (composite >= targetScore) return 'ready';
  if (composite >= targetScore * 0.85) return 'almost-there';
  if (composite >= targetScore * 0.6) return 'getting-there';
  return 'not-ready';
}
