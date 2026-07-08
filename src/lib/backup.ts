import {
  getDb, META_KEY, SETTINGS_KEY, ACTIVE_SESSION_KEY,
  KV_STORE, HISTORY_STORE, FLAGS_STORE
} from './storage';
import type { ActiveSession, HistoryEntry, ItemFlag, SessionSettings, AppMeta } from '../types/exam';

// ─── Backup Schema ──────────────────────────────────────

interface BackupPayload {
  schema: 'cctc-backup';
  version: 1;
  exportedAt: string;
  settings: SessionSettings | null;
  flags: ItemFlag[];
  history: HistoryEntry[];
  meta: AppMeta;
  activeSession: ActiveSession | null;
}

function validateBackup(raw: unknown): BackupPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (p.schema !== 'cctc-backup' || p.version !== 1) return null;
  if (typeof p.exportedAt !== 'string') return null;
  if (!Array.isArray(p.history)) return null;
  return raw as BackupPayload;
}

// ─── Manual Export/Import ────────────────────────────────

export async function exportBackup(): Promise<void> {
  const db = await getDb();
  const [meta, settings, history, flags, activeSession] = await Promise.all([
    db.get(KV_STORE, META_KEY),
    db.get(KV_STORE, SETTINGS_KEY),
    db.getAll(HISTORY_STORE),
    db.getAll(FLAGS_STORE),
    db.get(KV_STORE, ACTIVE_SESSION_KEY),
  ]);

  const payload: BackupPayload = {
    schema: 'cctc-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: settings ?? null,
    flags: flags ?? [],
    history: history ?? [],
    meta: meta ?? { disclaimerSeen: false },
    activeSession: activeSession ?? null,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cctc-progress-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importBackup(file: File): Promise<{ historyCount: number; activeSession: ActiveSession | null }> {
  const text = await file.text();
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch {
    throw new Error("Couldn't read that file — it may be corrupted.");
  }
  const backup = validateBackup(parsed);
  if (!backup) {
    throw new Error("That file isn't a CCTC progress backup.");
  }

  const db = await getDb();
  if (backup.settings) await db.put(KV_STORE, backup.settings, SETTINGS_KEY);
  if (backup.meta) await db.put(KV_STORE, backup.meta, META_KEY);
  if (backup.activeSession) {
    await db.put(KV_STORE, backup.activeSession, ACTIVE_SESSION_KEY);
  }

  const htx = db.transaction(HISTORY_STORE, 'readwrite');
  await htx.store.clear();
  await Promise.all(backup.history.map((e) => htx.store.put(e)));
  await htx.done;

  const ftx = db.transaction(FLAGS_STORE, 'readwrite');
  await ftx.store.clear();
  await Promise.all(backup.flags.map((f) => ftx.store.put(f)));
  await ftx.done;

  return { historyCount: backup.history.length, activeSession: backup.activeSession ?? null };
}

// ─── Directory Sync (File System Access API) ─────────────
// The user picks ONE folder — on desktop this can be their Google Drive / OneDrive / iCloud
// synced folder, so the folder IS their cloud (no OAuth, no backend, no data custody).
// Sessions stored one-file-per-session (session-<id>.json) so merge is a conflict-free UNION.
// meta.json holds settings/target/exam-date; that's the only thing that can truly conflict.

const SYNC_HANDLE_KEY = 'cctc-sync-dir-handle';

export function supportsDirSync(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';
}

export async function connectSyncFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (!supportsDirSync()) return null;
  try {
    const dir = await (window as any).showDirectoryPicker({ id: 'cctc-sync', mode: 'readwrite' });
    // Persist handle in IndexedDB for reload survival
    try {
      const db = await getDb();
      await db.put(KV_STORE, dir, SYNC_HANDLE_KEY);
    } catch {}
    return dir as FileSystemDirectoryHandle;
  } catch {
    return null; // user cancelled
  }
}

export async function getPersistedDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await getDb();
    const handle = await db.get(KV_STORE, SYNC_HANDLE_KEY);
    if (!handle) return null;
    // Verify permission
    const status = await (handle as any).requestPermission({ mode: 'readwrite' });
    if (status !== 'granted') return null;
    return handle as FileSystemDirectoryHandle;
  } catch {
    return null;
  }
}

async function readJsonFromDir(dir: FileSystemDirectoryHandle, name: string): Promise<any | null> {
  try {
    const fh = await dir.getFileHandle(name);
    const file = await fh.getFile();
    return JSON.parse(await file.text());
  } catch { return null; }
}

async function writeJsonToDir(dir: FileSystemDirectoryHandle, name: string, data: unknown): Promise<void> {
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(JSON.stringify(data, null, 2));
  await w.close();
}

export interface SyncResult {
  mergedCount: number;
  metaDiffers: boolean;
  folderMeta: Record<string, unknown> | null;
  localMeta: Record<string, unknown> | null;
  mergedHistory: HistoryEntry[];
  mergedFlags: ItemFlag[];
}

export async function syncWithFolder(dir: FileSystemDirectoryHandle): Promise<SyncResult> {
  const db = await getDb();

  // 1) Collect folder session files
  const folderSessions = new Map<string, HistoryEntry>();
  for await (const [name, handle] of (dir as any).entries()) {
    if (handle.kind === 'file' && /^session-.*\.json$/.test(name)) {
      const obj = await readJsonFromDir(dir, name);
      if (obj && obj.id) folderSessions.set(obj.id, obj as HistoryEntry);
    }
  }

  // 2) Union with local (dedup by id — append-only, conflict-free)
  const localHistory: HistoryEntry[] = await db.getAll(HISTORY_STORE);
  const localById = new Map<string, HistoryEntry>();
  localHistory.forEach((e) => localById.set(e.id, e));

  const merged = new Map<string, HistoryEntry>([...folderSessions, ...localById]);
  const mergedList = Array.from(merged.values()).sort((a, b) => a.completedAt.localeCompare(b.completedAt));

  // 3) Write any local sessions the folder is missing
  for (const entry of mergedList) {
    if (!folderSessions.has(entry.id)) {
      await writeJsonToDir(dir, `session-${entry.id}.json`, entry);
    }
  }

  // 4) Meta (settings/target/exam-date) — the only real conflict point
  const localMeta: Record<string, unknown> = (await db.get(KV_STORE, META_KEY)) ?? {};
  const folderMeta: Record<string, unknown> | null = await readJsonFromDir(dir, 'meta.json');

  // 5) Write meta to folder if missing
  if (!folderMeta) {
    await writeJsonToDir(dir, 'meta.json', localMeta);
  }

  // 6) Merge flags
  const localFlags: ItemFlag[] = await db.getAll(FLAGS_STORE);
  const folderFlags: ItemFlag[] = [];
  for await (const [name, handle] of (dir as any).entries()) {
    if (handle.kind === 'file' && name === 'flags.json') {
      const obj = await readJsonFromDir(dir, name);
      if (Array.isArray(obj)) folderFlags.push(...obj);
    }
  }
  const flagMap = new Map<string, ItemFlag>();
  [...folderFlags, ...localFlags].forEach((f) => flagMap.set(f.id, f));
  const mergedFlags = Array.from(flagMap.values());
  await writeJsonToDir(dir, 'flags.json', mergedFlags);

  // 7) Persist merged state to IndexedDB
  const htx = db.transaction(HISTORY_STORE, 'readwrite');
  await htx.store.clear();
  await Promise.all(mergedList.map((e) => htx.store.put(e)));
  await htx.done;

  const ftx = db.transaction(FLAGS_STORE, 'readwrite');
  await ftx.store.clear();
  await Promise.all(mergedFlags.map((f) => ftx.store.put(f)));
  await ftx.done;

  // 8) Sync active session (folder wins if present)
  const folderSession = await readJsonFromDir(dir, 'active-session.json');
  if (folderSession) {
    await db.put(KV_STORE, folderSession, ACTIVE_SESSION_KEY);
  }

  // Check if meta differs
  const metaDiffers = folderMeta != null &&
    JSON.stringify({ t: (localMeta as any).settings?.targetThreshold, e: (localMeta as any).examDate }) !==
    JSON.stringify({ t: (folderMeta as any).settings?.targetThreshold, e: (folderMeta as any).examDate });

  // Apply folder meta if local has none
  if (folderMeta && !localMeta.settings) {
    await db.put(KV_STORE, folderMeta, META_KEY);
  }

  return { mergedCount: mergedList.length, metaDiffers, folderMeta, localMeta, mergedHistory: mergedList, mergedFlags };
}

export async function applyFolderMeta(dir: FileSystemDirectoryHandle, localMeta: Record<string, unknown>): Promise<void> {
  await writeJsonToDir(dir, 'meta.json', localMeta);
}
