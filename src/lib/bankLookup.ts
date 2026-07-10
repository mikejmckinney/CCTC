import type { Question } from '../types/exam';

/**
 * Build an O(1) id -> Question lookup from a question array.
 *
 * The app loads all 506 reviewed items into a single bank once at start.
 * Sessions reference items by id and resolve the live Question via this
 * helper at render time, so the per-session storage in IndexedDB stays
 * small (O(items × 32 bytes) instead of O(items × full Question)).
 */
export function buildQuestionIndex(bank: Question[]): Map<string, Question> {
  const index = new Map<string, Question>();
  for (const q of bank) {
    index.set(q.id, q);
  }
  return index;
}

/**
 * Lookup a question by id. Returns undefined if the id is missing from
 * the bank (e.g. a flagged item whose source question was removed).
 * Callers should treat undefined as a render-skip / "stale" item.
 */
export function lookupQuestion(
  index: Map<string, Question>,
  itemId: string
): Question | undefined {
  return index.get(itemId);
}
