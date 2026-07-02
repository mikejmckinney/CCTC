import type { HistoryEntry, ItemPerformanceRecord } from '../types/exam';
import type { ItemPerformanceRecord as ItemPerf } from '../types/dashboard';

// ─── Item-level Performance Tracking ───
// Used for weak-areas session (spaced repetition of previously-incorrect items)

export function buildItemPerformanceMap(history: HistoryEntry[]): Map<string, ItemPerf> {
  const map = new Map<string, ItemPerf>();
  const chronological = [...history].sort((a, b) => a.completedAt.localeCompare(b.completedAt));

  for (const entry of chronological) {
    for (const item of entry.items) {
      const answer = entry.answers[item.itemId];
      const isCorrect = answer === item.question.correct;

      let record = map.get(item.itemId);
      if (!record) {
        record = {
          itemId: item.itemId,
          attempts: 0,
          correct: 0,
          incorrect: 0,
          lastAttemptAt: entry.completedAt,
          lastCorrect: false,
          weaknessScore: 0
        };
        map.set(item.itemId, record);
      }

      record.attempts += 1;
      if (isCorrect) {
        record.correct += 1;
      } else {
        record.incorrect += 1;
      }
      record.lastAttemptAt = entry.completedAt;
      record.lastCorrect = isCorrect;
    }
  }

  // Calculate weakness score for each item
  // Higher = needs more review
  // Factors: error frequency, recency of errors, total attempts
  for (const record of map.values()) {
    const errorRate = record.attempts > 0 ? record.incorrect / record.attempts : 0;
    const recentlyWrong = !record.lastCorrect ? 1.5 : 0.5;
    const recencyWeight = record.attempts > 0 ? 1 : 0;
    record.weaknessScore = Math.round(errorRate * recentlyWrong * recencyWeight * 100);
  }

  return map;
}

// Get the weakest items sorted by weakness score (highest first)
export function getWeakestItems(
  performanceMap: Map<string, ItemPerf>,
  limit = 20
): ItemPerf[] {
  return [...performanceMap.values()]
    .filter((r) => r.incorrect > 0)
    .sort((a, b) => b.weaknessScore - a.weaknessScore)
    .slice(0, limit);
}

// Get items that were recently answered incorrectly (for weak-areas session)
export function getRecentlyIncorrectItems(
  performanceMap: Map<string, ItemPerf>,
  limit = 20
): string[] {
  return [...performanceMap.values()]
    .filter((r) => !r.lastCorrect && r.incorrect > 0)
    .sort((a, b) => b.lastAttemptAt.localeCompare(a.lastAttemptAt))
    .map((r) => r.itemId)
    .slice(0, limit);
}
