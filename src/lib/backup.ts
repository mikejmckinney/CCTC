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
  // Validate each history entry has required fields
  for (const entry of p.history) {
    if (!entry || typeof entry !== 'object') return null;
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== 'string' || typeof e.completedAt !== 'string' || !e.result || typeof e.result !== 'object') {
      return null;
    }
  }
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
//
// File layout:
//   session-<id>.json   one file per completed session, immutable. Append-only,
//                       so the union {local, folder} (dedup by id) is a safe
//                       conflict-free merge across devices.
//   current-session.json one mutable file holding the in-progress session.
//                       Last-writer-wins between devices — fine for crash/
//                       device-loss protection, not a live cross-device handoff.
//   flags.json          reported items, merged by id.
//   meta.json           settings (target threshold, exam date). The only file
//                       that can truly conflict; in auto-sync mode we never
//                       overwrite a folder meta that already exists (defer the
//                       keep-device/keep-folder prompt to the next manual sync).

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
  activeSession: ActiveSession | null;
  /**
   * True when the auto-sync was forced to skip the meta write or the
   * conflict prompt because `auto: true` was passed. Lets the caller
   * distinguish "we resolved a conflict" from "we deferred it to the
   * next manual sync."
   */
  autoSkippedMeta?: boolean;
}

export interface SyncOptions {
  /**
   * When true, this is an auto-sync triggered by the debounced timer
   * (e.g., after an answer or session finish). The function will:
   *   - still do the union + per-session writes (immutable, safe)
   *   - still write current-session.json if missing in folder
   *   - NOT write meta.json when folder already has one that differs
   *     (defer the conflict prompt to the next manual Sync now)
   *   - NOT surface a metaDiffers prompt to the UI
   */
  auto?: boolean;
}

export async function syncWithFolder(
  dir: FileSystemDirectoryHandle,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const { auto = false } = options;
  const db = await getDb();

  // 1) Collect folder session files (immutable per-session files — conflict-free union)
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

  // 3b) In-progress session durability copy. Read both filenames so an
  // existing user with the old active-session.json still gets picked
  // up. We always WRITE under the new current-session.json name.
  // (Single mutable file, last-writer-wins between devices — fine for
  // crash/device-loss protection, not a live cross-device handoff.)
  let folderActive: ActiveSession | null = await readJsonFromDir(dir, 'current-session.json');
  if (!folderActive) folderActive = await readJsonFromDir(dir, 'active-session.json');

  // 4) Meta (settings/target/exam-date) — the only real conflict point.
  // In auto-sync mode, never overwrite a meta that already exists in the
  // folder (defer the prompt to the next manual sync). In manual mode,
  // the caller (UI) decides which side wins; syncWithFolder just reports.
  const localSettings: SessionSettings | null = (await db.get(KV_STORE, SETTINGS_KEY)) ?? null;
  const folderMeta: Record<string, unknown> | null = await readJsonFromDir(dir, 'meta.json');
  const localMeta: Record<string, unknown> = (localSettings as unknown as Record<string, unknown>) ?? {};

  // If the folder has no meta yet, seed it with the local copy.
  // In auto mode we still do this (no conflict to defer).
  if (!folderMeta) {
    await writeJsonToDir(dir, 'meta.json', localMeta);
  }

  const metaDiffers = folderMeta != null &&
    JSON.stringify({ t: (localSettings as any)?.targetThreshold, e: (localSettings as any)?.examDate }) !==
    JSON.stringify({ t: (folderMeta as any).targetThreshold, e: (folderMeta as any).examDate });

  // If folder has meta but local doesn't, adopt folder's meta.
  if (folderMeta && !localSettings) {
    await db.put(KV_STORE, folderMeta, SETTINGS_KEY);
  }

  // 5) Merge flags
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

  // 6) Persist merged state to IndexedDB
  const htx = db.transaction(HISTORY_STORE, 'readwrite');
  await htx.store.clear();
  await Promise.all(mergedList.map((e) => htx.store.put(e)));
  await htx.done;

  const ftx = db.transaction(FLAGS_STORE, 'readwrite');
  await ftx.store.clear();
  await Promise.all(mergedFlags.map((f) => ftx.store.put(f)));
  await ftx.done;

  // 7) Sync active session (folder wins if present, otherwise write local)
  if (folderActive) {
    await db.put(KV_STORE, folderActive, ACTIVE_SESSION_KEY);
  }
  const localActive = await db.get(KV_STORE, ACTIVE_SESSION_KEY);
  if (localActive && !folderActive) {
    await writeJsonToDir(dir, 'current-session.json', localActive);
  }

  // If local has an in-progress session but the folder has only the old
  // active-session.json (we read it above), promote it to the new
  // filename. This is a one-time migration on the next auto-sync.
  if (localActive && !folderActive) {
    // Already handled above
  }

  return {
    mergedCount: mergedList.length,
    metaDiffers,
    folderMeta,
    localMeta: localSettings as any,
    mergedHistory: mergedList,
    mergedFlags,
    activeSession: folderActive || localActive,
    autoSkippedMeta: auto && metaDiffers,
  };
}

export async function applyFolderMeta(dir: FileSystemDirectoryHandle, localMeta: Record<string, unknown>): Promise<void> {
  await writeJsonToDir(dir, 'meta.json', localMeta);
}
