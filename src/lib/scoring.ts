import { getBlueprint } from '../data/blueprints';
import type { ActiveSession, BlueprintId, HistoryEntry, SessionItemSnapshot, SessionResult, SessionResultBreakdown } from '../types/exam';

function createCategoryTotals(items: SessionItemSnapshot[]): Map<string, SessionResultBreakdown> {
  const totals = new Map<string, SessionResultBreakdown>();

  items.forEach((item) => {
    if (!totals.has(item.categoryId)) {
      totals.set(item.categoryId, {
        categoryId: item.categoryId,
        categoryLabel: item.categoryLabel,
        correct: 0,
        total: 0
      });
    }

    const entry = totals.get(item.categoryId)!;
    entry.total += 1;
  });

  return totals;
}

export function scoreSession(
  blueprintId: BlueprintId,
  items: SessionItemSnapshot[],
  answers: Record<string, string | null>,
  threshold: number
): SessionResult {
  const blueprint = getBlueprint(blueprintId);
  const totals = createCategoryTotals(items);
  let correct = 0;

  items.forEach((item) => {
    if (answers[item.itemId] === item.question.correct) {
      correct += 1;
      const bucket = totals.get(item.categoryId);
      if (bucket) {
        bucket.correct += 1;
      }
    }
  });

  const total = items.length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  const breakdown = Array.from(totals.values()).sort((left, right) => left.categoryLabel.localeCompare(right.categoryLabel));

  return {
    correct,
    total,
    percent,
    estimatedPass: percent >= threshold,
    breakdown: breakdown.length > 0
      ? breakdown
      : blueprint.structure === 'domain_task'
        ? blueprint.domains.map((domain) => ({
            categoryId: String(domain.id),
            categoryLabel: domain.name,
            correct: 0,
            total: 0
          }))
        : blueprint.sections.map((section) => ({
            categoryId: section.id,
            categoryLabel: section.name,
            correct: 0,
            total: 0
          }))
  };
}

export function toHistoryEntry(session: ActiveSession): HistoryEntry {
  const now = new Date().toISOString();
  const totalSeconds = session.settings.timed ? session.settings.timeMinutes * 60 : null;
  const timeUsedSeconds = totalSeconds === null || session.remainingSeconds === null ? null : totalSeconds - session.remainingSeconds;

  return {
    id: session.id,
    completedAt: session.submittedAt ?? now,
    settings: session.settings,
    timeUsedSeconds,
    itemIds: session.items.map((item) => item.itemId),
    items: session.items,
    answers: session.answers,
    flaggedForReview: session.flaggedForReview,
    result: session.result ?? scoreSession(session.settings.blueprintId, session.items, session.answers, session.settings.targetThreshold)
  };
}