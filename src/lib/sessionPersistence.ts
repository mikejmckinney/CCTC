import type { ActiveSession, ItemFlag } from '../types/exam';

export function pruneStaleFlags(flags: ItemFlag[], questionVersions: Map<string, number>): ItemFlag[] {
  return flags.filter((flag) => questionVersions.get(flag.item_id) === flag.version);
}

export function buildRecentItemIds(sessions: Array<Pick<ActiveSession, 'items'>> | Array<{ itemIds: string[] }>, limit = 3): Set<string> {
  const recentSlice = sessions.slice(0, limit);
  const itemIds = recentSlice.flatMap((session) => ('items' in session ? session.items.map((item) => item.itemId) : session.itemIds));
  return new Set(itemIds);
}