import {
  getDb, META_KEY, SETTINGS_KEY, ACTIVE_SESSION_KEY,
  KV_STORE, HISTORY_STORE, FLAGS_STORE
} from './storage';

interface BackupPayload {
  version: 1;
  exportedAt: string;
  data: {
    meta: unknown;
    settings: unknown;
    activeSession: unknown;
    history: unknown[];
    flags: unknown[];
  };
}

function validateBackup(payload: unknown): BackupPayload | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  if (p.version !== 1) return null;
  if (typeof p.exportedAt !== 'string') return null;
  const data = p.data;
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.history)) return null;
  if (!Array.isArray(d.flags)) return null;
  return payload as BackupPayload;
}

export async function exportBackup(): Promise<void> {
  const db = await getDb();
  const [meta, settings, activeSession, history, flags] = await Promise.all([
    db.get(KV_STORE, META_KEY),
    db.get(KV_STORE, SETTINGS_KEY),
    db.get(KV_STORE, ACTIVE_SESSION_KEY),
    db.getAll(HISTORY_STORE),
    db.getAll(FLAGS_STORE),
  ]);

  const payload: BackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { meta, settings, activeSession, history, flags },
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cctc-progress-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<{ history: number; flags: number }> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('The file is not valid JSON. Please select a CCTC backup file.');
  }

  const backup = validateBackup(parsed);
  if (!backup) {
    throw new Error('The file does not appear to be a CCTC backup. Please select the correct file.');
  }

  const db = await getDb();

  if (backup.data.meta !== undefined) {
    await db.put(KV_STORE, backup.data.meta, META_KEY);
  }
  if (backup.data.settings !== undefined) {
    await db.put(KV_STORE, backup.data.settings, SETTINGS_KEY);
  }
  if (backup.data.activeSession !== undefined) {
    await db.put(KV_STORE, backup.data.activeSession, ACTIVE_SESSION_KEY);
  }

  // Replace history
  const tx = db.transaction(HISTORY_STORE, 'readwrite');
  await tx.store.clear();
  await Promise.all(backup.data.history.map((e: any) => tx.store.put(e)));
  await tx.done;

  // Replace flags
  const flagsTx = db.transaction(FLAGS_STORE, 'readwrite');
  await flagsTx.store.clear();
  await Promise.all(backup.data.flags.map((f: any) => flagsTx.store.put(f)));
  await flagsTx.done;

  return {
    history: backup.data.history.length,
    flags: backup.data.flags.length,
  };
}
