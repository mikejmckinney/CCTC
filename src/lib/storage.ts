import { openDB } from 'idb';
import { buildQuestionVersionMap } from '../data/questionBank';
import { pruneStaleFlags } from './sessionPersistence';
import type { ActiveSession, AppMeta, HistoryEntry, ItemFlag, Question, SessionItemSnapshot, SessionSettings } from '../types/exam';
import sampleFixture from '../fixtures/sample-history.json';

const DB_NAME = 'cctc-app';
const DB_VERSION = 2;
const KV_STORE = 'kv';
const HISTORY_STORE = 'history';
const FLAGS_STORE = 'flags';

const META_KEY = 'app-meta';
const SETTINGS_KEY = 'settings';
const ACTIVE_SESSION_KEY = 'active-session';

const DOMAIN_SHORT_LABELS: Record<number, string> = {
  1: 'Education',
  2: 'Pre-transplant',
  3: 'Post-op'
};

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(KV_STORE)) {
        db.createObjectStore(KV_STORE);
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(FLAGS_STORE)) {
        db.createObjectStore(FLAGS_STORE, { keyPath: 'id' });
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

export async function deleteSampleHistory(): Promise<number> {
  const db = await getDb();
  const all = await db.getAll(HISTORY_STORE) as HistoryEntry[];
  const samples = all.filter((e) => e.sample === true);
  if (samples.length === 0) return 0;
  const tx = db.transaction(HISTORY_STORE, 'readwrite');
  await Promise.all(samples.map((e) => tx.store.delete(e.id)));
  await tx.done;
  return samples.length;
}

interface SampleFixtureSession {
  id: string;
  completedAt: string;
  mode: 'study' | 'exam';
  blueprintId: 'cctc-from-2026-07' | 'cctc-thru-2026-06';
  timeUsedSeconds: number | null;
  domains: Record<string, { itemIds: string[]; correct: number }>;
}

interface SampleFixture {
  version: number;
  baseTimestamp: string;
  targetThreshold: number;
  sessions: SampleFixtureSession[];
}

const fixture = sampleFixture as SampleFixture;

export function loadSampleHistory(questions: Question[]): HistoryEntry[] {
  const byId = new Map<string, Question>();
  questions.forEach((q) => byId.set(q.id, q));

  const missing: string[] = [];
  fixture.sessions.forEach((sess) => {
    Object.values(sess.domains).forEach(({ itemIds }) => {
      itemIds.forEach((id) => { if (!byId.has(id)) missing.push(id); });
    });
  });
  if (missing.length > 0) {
    const unique = [...new Set(missing)];
    throw new Error(`Sample fixture references ${unique.length} item(s) not in the question bank: ${unique.slice(0, 5).join(', ')}${unique.length > 5 ? '...' : ''}`);
  }

  return fixture.sessions.map((sess): HistoryEntry => {
    const snapshots: SessionItemSnapshot[] = [];
    const answers: Record<string, string | null> = {};
    const itemIds: string[] = [];

    let totalCorrect = 0;
    let totalItems = 0;
    const breakdown = Object.keys(sess.domains).sort().map((domainKey) => {
      const domain = Number(domainKey);
      const { itemIds: dItemIds, correct: dCorrect } = sess.domains[domainKey];
      const total = dItemIds.length;
      totalCorrect += dCorrect;
      totalItems += total;
      dItemIds.forEach((id, idx) => {
        const q = byId.get(id);
        if (!q) return;
        const optionOrder = q.options.map((o) => o.id);
        snapshots.push({ itemId: id, question: q, optionOrder, categoryId: String(domain), categoryLabel: DOMAIN_SHORT_LABELS[domain] ?? `Domain ${domain}` });
        itemIds.push(id);
        if (idx < dCorrect) {
          answers[id] = q.correct;
        } else {
          const wrong = q.options.map((o) => o.id).filter((oid) => oid !== q.correct);
          answers[id] = wrong[0] ?? q.correct;
        }
      });
      return { categoryId: String(domain), categoryLabel: DOMAIN_SHORT_LABELS[domain] ?? `Domain ${domain}`, correct: dCorrect, total };
    });

    const percent = totalItems > 0 ? Math.round((totalCorrect / totalItems) * 100) : 0;
    const target = fixture.targetThreshold;
    const settings: SessionSettings = {
      blueprintId: sess.blueprintId,
      questionSet: 'standard',
      questionCount: totalItems,
      timed: sess.timeUsedSeconds !== null,
      timeMinutes: Math.round((sess.timeUsedSeconds ?? 0) / 60) || 30,
      showTimer: true,
      mode: sess.mode,
      includeDrafts: false,
      targetThreshold: target
    };
    return {
      id: sess.id,
      completedAt: sess.completedAt,
      settings,
      timeUsedSeconds: sess.timeUsedSeconds,
      itemIds,
      items: snapshots,
      answers,
      flaggedForReview: [],
      result: { correct: totalCorrect, total: totalItems, percent, estimatedPass: percent >= target, breakdown },
      sample: true
    };
  });
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