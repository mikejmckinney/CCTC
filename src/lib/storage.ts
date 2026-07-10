import { openDB } from 'idb';
import { buildQuestionVersionMap } from '../data/questionBank';
import { pruneStaleFlags } from './sessionPersistence';
import type { ActiveSession, AppMeta, HistoryEntry, ItemFlag, Question, SessionSettings } from '../types/exam';

export const DB_NAME = 'cctc-app';
export const DB_VERSION = 2;
export const KV_STORE = 'kv';
export const HISTORY_STORE = 'history';
export const FLAGS_STORE = 'flags';

export const META_KEY = 'app-meta';
export const SETTINGS_KEY = 'settings';
export const ACTIVE_SESSION_KEY = 'active-session';

interface LegacySessionItemSnapshot {
  itemId: string;
  question?: Question;
  optionOrder: string[];
  categoryId: string;
  categoryLabel: string;
}

function migrateSessionItem(item: LegacySessionItemSnapshot): { itemId: string; optionOrder: string[]; categoryId: string; categoryLabel: string } {
  // v1 had a full Question embedded; v2 drops it and resolves at render time.
  // The other fields (itemId, optionOrder, categoryId, categoryLabel) are
  // already in the v2 shape, so we just strip `question` if present.
  return {
    itemId: item.itemId,
    optionOrder: item.optionOrder,
    categoryId: item.categoryId,
    categoryLabel: item.categoryLabel,
  };
}

// idb's upgrade callback signature: (db, oldVersion, newVersion, transaction, event).
// We only need the transaction. Importing the type directly avoids reaching
// into the openDB parameter list, which is awkward to type-narrow.
type UpgradeTransaction = {
  objectStore: (name: string) => {
    getAll: () => Promise<unknown>;
    get: (key: IDBValidKey) => Promise<unknown>;
    put: (value: unknown, key?: IDBValidKey) => Promise<unknown>;
  };
};

async function migrateV1ToV2(
  tx: UpgradeTransaction,
  historyEntries: Array<{ id?: string; items?: LegacySessionItemSnapshot[] }>,
  activeSession: { items?: LegacySessionItemSnapshot[] } | undefined
): Promise<void> {
  // v1 stored a full Question in each SessionItemSnapshot. v2 stores
  // only the lightweight metadata (itemId, optionOrder, categoryId,
  // categoryLabel). Strip `question` from every history entry and the
  // active session in a single upgrade transaction.
  for (const entry of historyEntries) {
    if (Array.isArray(entry.items)) {
      entry.items = entry.items.map(migrateSessionItem);
      if (entry.id !== undefined) {
        await tx.objectStore('history').put(entry);
      }
    }
  }
  if (activeSession && Array.isArray(activeSession.items)) {
    activeSession.items = activeSession.items.map(migrateSessionItem);
    await tx.objectStore('kv').put(activeSession, ACTIVE_SESSION_KEY);
  }
}

export async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    async upgrade(db, oldVersion, _newVersion, tx) {
      if (!db.objectStoreNames.contains(KV_STORE)) {
        db.createObjectStore(KV_STORE);
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(FLAGS_STORE)) {
        db.createObjectStore(FLAGS_STORE, { keyPath: 'id' });
      }
      // v1 -> v2: drop embedded Question from session item snapshots
      // inside the upgrade transaction so the migration is atomic
      // with the schema change.
      if (oldVersion < 2) {
        const historyEntries = (await tx.objectStore('history').getAll()) as Array<{ id?: string; items?: LegacySessionItemSnapshot[] }>;
        const activeSession = (await tx.objectStore('kv').get(ACTIVE_SESSION_KEY)) as { items?: LegacySessionItemSnapshot[] } | undefined;
        await migrateV1ToV2(tx, historyEntries, activeSession);
      }
    }
  });
}

export interface BootstrapState {
  meta: AppMeta;
  settings: SessionSettings | null;
  activeSession: ActiveSession | null;
  history: HistoryEntry[];
  flags: ItemFlag[];
}

export async function bootstrapState(questions: Question[]): Promise<BootstrapState> {
  const db = await getDb();
  const [meta, settings, activeSession, history, flags] = await Promise.all([
    db.get(KV_STORE, META_KEY),
    db.get(KV_STORE, SETTINGS_KEY),
    db.get(KV_STORE, ACTIVE_SESSION_KEY),
    db.getAll(HISTORY_STORE),
    db.getAll(FLAGS_STORE)
  ]);

  const filteredFlags = pruneStaleFlags(flags ?? [], buildQuestionVersionMap(questions));
  if (filteredFlags.length !== (flags ?? []).length) {
    const tx = db.transaction(FLAGS_STORE, 'readwrite');
    await tx.store.clear();
    await Promise.all(filteredFlags.map((flag) => tx.store.put(flag)));
    await tx.done;
  }

  return {
    meta: meta ?? { disclaimerSeen: false },
    settings: settings ?? null,
    activeSession: activeSession ?? null,
    history: (history ?? []).sort((left, right) => right.completedAt.localeCompare(left.completedAt)),
    flags: filteredFlags.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  };
}

export async function saveMeta(meta: AppMeta): Promise<void> {
  const db = await getDb();
  await db.put(KV_STORE, meta, META_KEY);
}

export async function saveSettings(settings: SessionSettings): Promise<void> {
  const db = await getDb();
  await db.put(KV_STORE, settings, SETTINGS_KEY);
}

export async function saveActiveSession(session: ActiveSession): Promise<void> {
  const db = await getDb();
  await db.put(KV_STORE, session, ACTIVE_SESSION_KEY);
}

export async function clearActiveSession(): Promise<void> {
  const db = await getDb();
  await db.delete(KV_STORE, ACTIVE_SESSION_KEY);
}

export async function saveHistoryEntry(entry: HistoryEntry): Promise<void> {
  const db = await getDb();
  await db.put(HISTORY_STORE, entry);
}

export async function deleteHistoryEntry(entryId: string): Promise<void> {
  const db = await getDb();
  await db.delete(HISTORY_STORE, entryId);
}

export async function clearHistory(): Promise<void> {
  const db = await getDb();
  await db.clear(HISTORY_STORE);
}

export async function clearSampleHistory(): Promise<number> {
  const db = await getDb();
  const all = (await db.getAll(HISTORY_STORE)) as HistoryEntry[];
  const sampleIds = all.filter((e) => e.sample === true).map((e) => e.id);
  if (sampleIds.length === 0) return 0;
  const tx = db.transaction(HISTORY_STORE, 'readwrite');
  await Promise.all(sampleIds.map((id) => tx.store.delete(id)));
  await tx.done;
  return sampleIds.length;
}

export async function upsertFlag(flag: ItemFlag): Promise<void> {
  const db = await getDb();
  await db.put(FLAGS_STORE, flag);
}

export async function deleteFlag(flagId: string): Promise<void> {
  const db = await getDb();
  await db.delete(FLAGS_STORE, flagId);
}

export async function replaceFlags(flags: ItemFlag[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(FLAGS_STORE, 'readwrite');
  await tx.store.clear();
  await Promise.all(flags.map((flag) => tx.store.put(flag)));
  await tx.done;
}