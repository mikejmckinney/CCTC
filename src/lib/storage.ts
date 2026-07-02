import { openDB } from 'idb';
import { buildQuestionVersionMap } from '../data/questionBank';
import { pruneStaleFlags } from './sessionPersistence';
import type { ActiveSession, AppMeta, HistoryEntry, ItemFlag, Question, SessionSettings } from '../types/exam';
import type { UserPreferences } from '../types/dashboard';

const DB_NAME = 'cctc-app';
const DB_VERSION = 2;
const KV_STORE = 'kv';
const HISTORY_STORE = 'history';
const FLAGS_STORE = 'flags';

const META_KEY = 'app-meta';
const SETTINGS_KEY = 'settings';
const ACTIVE_SESSION_KEY = 'active-session';
const USER_PREFS_KEY = 'user-prefs';

const DEFAULT_USER_PREFS: UserPreferences = {
  examDate: null,
  targetScore: 65,
  lastQuickStart: null,
  lastSettings: null
};

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(KV_STORE)) {
        db.createObjectStore(KV_STORE);
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(FLAGS_STORE)) {
        db.createObjectStore(FLAGS_STORE, { keyPath: 'id' });
      }
      // v2: no new stores needed, just new keys in kv
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

export async function loadUserPrefs(): Promise<UserPreferences> {
  const db = await getDb();
  const stored = await db.get(KV_STORE, USER_PREFS_KEY);
  return stored ? { ...DEFAULT_USER_PREFS, ...stored } : { ...DEFAULT_USER_PREFS };
}

export async function saveUserPrefs(prefs: UserPreferences): Promise<void> {
  const db = await getDb();
  await db.put(KV_STORE, prefs, USER_PREFS_KEY);
}