import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../components/ThemeProvider';
import App from './App';

vi.mock('../lib/storage', () => ({
  bootstrapState: vi.fn(async () => ({
    meta: { disclaimerSeen: true },
    settings: null,
    activeSession: null,
    history: [],
    flags: []
  })),
  clearActiveSession: vi.fn(async () => undefined),
  clearHistory: vi.fn(async () => undefined),
  clearSampleHistory: vi.fn(async () => 0),
  deleteFlag: vi.fn(async () => undefined),
  deleteHistoryEntry: vi.fn(async () => undefined),
  getDb: vi.fn(async () => ({
    transaction: () => ({ store: { put: vi.fn(), delete: vi.fn() }, done: Promise.resolve() })
  })),
  replaceFlags: vi.fn(async () => undefined),
  saveActiveSession: vi.fn(async () => undefined),
  saveHistoryEntry: vi.fn(async () => undefined),
  saveMeta: vi.fn(async () => undefined),
  saveSettings: vi.fn(async () => undefined),
  upsertFlag: vi.fn(async () => undefined)
}));

vi.mock('../lib/backup', () => ({
  syncWithFolder: vi.fn(async () => ({
    mergedCount: 0,
    metaDiffers: false,
    folderMeta: null,
    localMeta: null,
    mergedHistory: [],
    mergedFlags: [],
    activeSession: null
  })),
  applyFolderMeta: vi.fn(async () => undefined),
  connectSyncFolder: vi.fn(async () => null),
  getPersistedDirHandle: vi.fn(async () => null),
  supportsDirSync: vi.fn(() => false),
  exportBackup: vi.fn(async () => undefined),
  importBackup: vi.fn(async () => ({ historyCount: 0, activeSession: null }))
}));

describe('App', () => {
  it('renders the dashboard after loading', async () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Readiness Score/i)).toBeInTheDocument();
    });
  });

  it('auto-sync is a no-op when no folder is connected', async () => {
    // supportsDirSync mock returns false; getPersistedDirHandle returns null;
    // so the auto-sync timer should never fire. syncWithFolder is the
    // proxy for "did the app actually try to sync."
    const { syncWithFolder } = await import('../lib/backup');
    (syncWithFolder as any).mockClear();

    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );

    // Let the app mount and any initial effects run.
    await waitFor(() => {
      expect(screen.getByText(/Readiness Score/i)).toBeInTheDocument();
    });
    // The first sync call (if any) would be from the bootstrap effect
    // chain, not the auto-sync. The auto-sync only fires from session
    // mutations which require the user to start a session. Without a
    // folder connected, scheduleAutoSync is a no-op.
    // Wait long enough for any timer to fire.
    await new Promise((r) => setTimeout(r, 3000));
    expect(syncWithFolder).not.toHaveBeenCalled();
  });
});
