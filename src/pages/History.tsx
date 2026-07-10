import { useMemo, useRef, useEffect, useId, useState } from 'react';
import { cn } from '../lib/cn';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Modal } from '../components/ui';
import { buildHistoryTrend } from '../lib/historyTrend';
import { formatDuration } from '../lib/format';
import { DOMAIN_SHORT_LABELS } from '../lib/domains';
import { exportBackup, importBackup, supportsDirSync, connectSyncFolder, getPersistedDirHandle, syncWithFolder, applyFolderMeta } from '../lib/backup';
import { getDb, META_KEY, KV_STORE } from '../lib/storage';
import type { HistoryEntry, ItemFlag, ActiveSession } from '../types/exam';
import {
  ChevronRight, Trash2, Flag, Download, Upload
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

interface HistoryProps {
  history: HistoryEntry[];
  onViewSession: (entry: HistoryEntry) => void;
  onDeleteSession: (id: string) => void;
  onClearAll: () => void;
  onNavigateToReported?: () => void;
  onSyncComplete?: (history: HistoryEntry[], flags: ItemFlag[], activeSession?: ActiveSession | null) => void;
}

export function History({ history, onViewSession, onDeleteSession, onClearAll, onNavigateToReported, onSyncComplete }: HistoryProps) {
  const trend = useMemo(() => buildHistoryTrend(history), [history]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [sessionFilter, setSessionFilter] = useState<'all' | 'exam' | 'study'>('all');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [syncFolderName, setSyncFolderName] = useState<string | null>(null);
  const [syncConnected, setSyncConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncDir, setSyncDir] = useState<FileSystemDirectoryHandle | null>(null);
  const dirSyncSupported = supportsDirSync();
  const [metaConflict, setMetaConflict] = useState<{ folderMeta: Record<string, unknown>; localMeta: Record<string, unknown> } | null>(null);

  // Restore persisted directory handle on mount
  useEffect(() => {
    if (!dirSyncSupported) return;
    getPersistedDirHandle().then((handle) => {
      if (handle) {
        setSyncDir(handle);
        setSyncConnected(true);
        setSyncFolderName(handle.name);
      }
    }).catch(() => {});
  }, [dirSyncSupported]);

  const doSync = async (dir: FileSystemDirectoryHandle) => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result = await syncWithFolder(dir);
      if (result.metaDiffers) {
        setMetaConflict({ folderMeta: result.folderMeta ?? {}, localMeta: result.localMeta ?? {} });
        setSyncing(false);
      } else {
        setSyncMsg(`Synced · ${result.mergedCount} session(s) in folder.`);
        setSyncing(false);
        onSyncComplete?.(result.mergedHistory, result.mergedFlags, result.activeSession);
      }
    } catch {
      setSyncMsg('Sync failed — check folder permissions and try again.');
      setSyncing(false);
    }
  };

  const handleConnectFolder = async () => {
    const dir = await connectSyncFolder();
    if (dir) {
      setSyncDir(dir);
      setSyncConnected(true);
      setSyncFolderName(dir.name);
      setSyncMsg(null);
      await doSync(dir);
    } else {
      setSyncMsg('Folder sync needs a Chromium desktop browser (Chrome/Edge). Use Export/Import backup instead.');
    }
  };

  const handleSyncNow = async () => {
    if (!syncDir) {
      setSyncMsg('No folder connected. Click "Connect folder" to set up sync.');
      return;
    }
    await doSync(syncDir);
  };

  const handleKeepThisDevice = async () => {
    if (!syncDir || !metaConflict) return;
    await applyFolderMeta(syncDir, metaConflict.localMeta);
    setMetaConflict(null);
    setSyncMsg('Settings kept from this device.');
  };

  const handleKeepFolder = async () => {
    if (!metaConflict) return;
    const db = await getDb();
    await db.put(KV_STORE, metaConflict.folderMeta, META_KEY);
    setMetaConflict(null);
    setSyncMsg('Settings applied from folder.');
    // Refresh state
    const freshHistory = await db.getAll('history');
    const freshFlags = await db.getAll('flags');
    onSyncComplete?.(freshHistory, freshFlags);
  };

  const handleExport = async () => {
    try { await exportBackup(); } catch {}
  };

  const handleImport = async () => {
    if (!importFile) return;
    try {
      const result = await importBackup(importFile);
      setImportModalOpen(false);
      setImportFile(null);
      setSyncMsg(`Restored ${result.historyCount} session(s).`);
      // Refresh state from IndexedDB
      const db = await getDb();
      const freshHistory: HistoryEntry[] = await db.getAll('history');
      const freshFlags: ItemFlag[] = await db.getAll('flags');
      onSyncComplete?.(freshHistory, freshFlags, result.activeSession);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed.');
    }
  };

  // Filtered history based on session type
  const filteredHistory = useMemo(() => {
    if (sessionFilter === 'all') return history;
    return history.filter((e) => e.settings.mode === sessionFilter);
  }, [history, sessionFilter]);

  // Build domain name mapping from history
  const domainNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const entry of history) {
      for (const bd of entry.result.breakdown) {
        names[bd.categoryId] = DOMAIN_SHORT_LABELS[bd.categoryId] || bd.categoryLabel;
      }
    }
    return names;
  }, [history]);

  const chartData = useMemo(() => {
    const chronological = [...filteredHistory].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
    return chronological.map((entry) => {
      const date = new Date(entry.completedAt);
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const domains: Record<string, number> = {};
      const totalItems = entry.result.breakdown.reduce((sum, bd) => sum + bd.total, 0);
      for (const bd of entry.result.breakdown) {
        const domainWeight = totalItems > 0 ? bd.total / totalItems : 0;
        const domainScore = bd.total > 0 ? bd.correct / bd.total : 0;
        domains[bd.categoryId] = Math.round(domainScore * domainWeight * 100);
      }
      return { label, ...domains, total: entry.result.percent };
    });
  }, [filteredHistory]);

  const hasAnimatedChart = useRef(false);
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (chartData.length > 0) hasAnimatedChart.current = true;
    // Reset animation flag when filter changes so chart re-animates
  }, [chartData.length]);

  const chartId = useId();
  const domainIds = Object.keys(domainNames);
  const gradients = domainIds.map((id, i) => ({ id, gradId: `grad-${chartId}-${i}` }));
  const targetThreshold = history[0]?.settings.targetThreshold ?? 70;

  return (
    <div className="space-y-6">
      {/* Stacked Area Chart with stats */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Progress Over Time</CardTitle>
            {/* Session type filter */}
            <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-0.5">
              {(['all', 'exam', 'study'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setSessionFilter(f)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    sessionFilter === f
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  )}
                >
                  {f === 'all' ? 'All' : f === 'exam' ? 'Exam' : 'Study'}
                </button>
              ))}
            </div>
          </div>
          {trend.averagePercent !== null && (
            <div className="flex items-center gap-4 text-sm mt-2">
              <span className="text-[var(--muted-foreground)]">
                Avg <strong className="text-[var(--foreground)]">{trend.averagePercent}%</strong>
              </span>
              <span className="text-[var(--muted-foreground)]">
                Best <strong className="text-[var(--foreground)]">{trend.bestPercent}%</strong>
              </span>
              <span className="text-[var(--muted-foreground)] flex items-center gap-1">
                Trend
                <strong className={cn(
                  trend.recentDelta !== null && trend.recentDelta > 0 ? 'text-[var(--success)]' :
                  trend.recentDelta !== null && trend.recentDelta < 0 ? 'text-[var(--destructive)]' :
                  'text-[var(--muted-foreground)]'
                )}>
                  {trend.recentDelta !== null
                    ? `${trend.recentDelta > 0 ? '+' : ''}${trend.recentDelta}`
                    : '—'}
                </strong>
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  {gradients.map(({ id, gradId }, i) => (
                    <linearGradient key={id} id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={`var(--chart-${i + 1})`} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={`var(--chart-${i + 1})`} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--foreground)',
                  }}
                  formatter={(value: unknown, name: unknown) => [`${value}%`, String(name)]}
                  labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                  itemSorter={(item) => {
                    const idx = domainIds.indexOf(String(item.dataKey));
                    return -idx;
                  }}
                />
                <ReferenceLine
                  y={targetThreshold}
                  stroke="var(--accent)"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  label={{
                    value: `Target ${targetThreshold}%`,
                    fill: 'var(--accent)',
                    fontSize: 12,
                    fontWeight: 600,
                    position: 'insideTopRight',
                    offset: 10,
                  }}
                />
                {gradients.map(({ id, gradId }, i) => (
                  <Area
                    key={id}
                    type="monotone"
                    dataKey={id}
                    name={domainNames[id] || id}
                    stackId="1"
                    stroke={`var(--chart-${i + 1})`}
                    fill={`url(#${gradId})`}
                    isAnimationActive={!hasAnimatedChart.current && !prefersReducedMotion}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-12">Complete sessions to see your progress chart.</p>
          )}
        </CardContent>
      </Card>

      {/* Session list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{sessionFilter === 'all' ? 'All' : sessionFilter === 'exam' ? 'Exam' : 'Study'} Sessions</CardTitle>
            {filteredHistory.length > 0 && (
              <Button variant="ghost" size="sm" onClick={onClearAll} className="gap-1 text-[var(--destructive)]">
                <Trash2 className="h-4 w-4" /> Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredHistory.length > 0 ? (
            <div className="divide-y divide-[var(--border)]">
              {filteredHistory.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-3 -mx-2 px-2 rounded-lg hover:bg-[var(--muted)]/50 transition-colors">
                  <button onClick={() => onViewSession(entry)} className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {new Date(entry.completedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}
                      {new Date(entry.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="outline">{getBlueprintShort(entry.settings.blueprintId)}</Badge>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {entry.settings.mode} · {entry.settings.questionCount}q · {formatDuration(entry.timeUsedSeconds)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {entry.result.breakdown.map((bd) => (
                        <span key={bd.categoryId} className="text-xs text-[var(--muted-foreground)]">
                          {DOMAIN_SHORT_LABELS[bd.categoryId] || bd.categoryLabel}: {bd.correct}/{bd.total}
                        </span>
                      ))}
                    </div>
                  </button>
                  <div className="flex items-center gap-3 ml-4">
                    <Badge variant={entry.result.percent >= 70 ? 'success' : 'warning'}>
                      {entry.result.percent}%
                    </Badge>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleteConfirmId(entry.id)} aria-label="Delete session">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-12">No {sessionFilter === 'all' ? '' : sessionFilter + ' '}sessions yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Move progress between devices */}
      <Card>
        <CardHeader>
          <CardTitle>Move progress between devices</CardTitle>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Your progress is stored on this device only. Sync to a cloud-synced folder to carry it across devices, or export/import a backup file manually.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Folder sync section */}
          {dirSyncSupported && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-4">
              {syncConnected ? (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-[13px] text-[var(--foreground)]">
                    Folder: <strong>{syncFolderName}</strong>
                    {syncMsg && <span className="text-[var(--muted-foreground)]"> · {syncMsg}</span>}
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => void handleSyncNow()} disabled={syncing} className="gap-2">
                    {syncing ? 'Syncing…' : 'Sync now'}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-[13px] text-[var(--muted-foreground)]">
                    Point at your Google Drive / OneDrive / iCloud synced folder — one file per session, merged across devices.
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => void handleConnectFolder()} className="gap-2 whitespace-nowrap">
                    Connect folder
                  </Button>
                </div>
              )}
              {syncMsg && !syncConnected && (
                <p className="text-xs text-[var(--muted-foreground)] mt-2">{syncMsg}</p>
              )}
            </div>
          )}

          {/* Manual backup section */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Manual backup</p>
            <div className="flex flex-wrap gap-3 items-center">
              <Button variant="secondary" onClick={() => void handleExport()} className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <label
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-xs hover:bg-[var(--muted)] h-10 px-4 py-2 cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                Import
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImportFile(file);
                      setImportModalOpen(true);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {syncMsg && syncConnected && (
            <p className="text-xs text-[var(--foreground)]">{syncMsg}</p>
          )}
        </CardContent>
      </Card>

      {/* Import confirmation modal */}
      <Modal
        open={importModalOpen}
        onClose={() => { setImportModalOpen(false); setImportFile(null); setImportError(null); }}
        title="Restore progress?"
        description={importError ? undefined : `This replaces the ${history.length} session${history.length !== 1 ? 's' : ''} on this device with data from the backup. Your current progress will be overwritten.`}
      >
        {importError ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-[var(--destructive)]/5 border border-[var(--destructive)]/20 p-3">
              <p className="text-sm text-[var(--destructive)] font-medium">Import failed</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">{importError}</p>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => { setImportModalOpen(false); setImportFile(null); setImportError(null); }}>Close</Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setImportModalOpen(false); setImportFile(null); }}>Cancel</Button>
            <Button onClick={() => void handleImport()}>Restore</Button>
          </div>
        )}
      </Modal>

      {/* Meta conflict resolution modal */}
      <Modal
        open={metaConflict !== null}
        onClose={() => setMetaConflict(null)}
        title="Settings differ between devices"
        description="Your target/exam-date on this device differ from the folder. Keep which? (Your session history is already merged either way.)"
      >
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => void handleKeepFolder()}>Keep folder</Button>
          <Button onClick={() => void handleKeepThisDevice()}>Keep this device</Button>
        </div>
      </Modal>

      {/* Link to Reported Items */}
      {onNavigateToReported && (
        <button
          onClick={onNavigateToReported}
          className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-left shadow-sm transition-all hover:shadow-md hover:border-[var(--warning)]/30"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--warning)]/10">
              <Flag className="h-5 w-5 text-[var(--warning)]" />
            </div>
            <div>
              <p className="font-semibold text-[var(--foreground)]">Reported Items</p>
              <p className="text-xs text-[var(--muted-foreground)]">View and manage items you've flagged for review</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-[var(--muted-foreground)]" />
        </button>
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Session"
        description="Are you sure you want to delete this session? This action cannot be undone."
      >
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button variant="destructive" onClick={() => { if (deleteConfirmId) { onDeleteSession(deleteConfirmId); setDeleteConfirmId(null); } }}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

function getBlueprintShort(id: string): string {
  return id === 'cctc-from-2026-07' ? '2026-07' : 'Legacy';
}
