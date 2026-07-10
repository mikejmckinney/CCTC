import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Navigation } from '../components/Navigation';
import { Dashboard } from '../pages/Dashboard';
import { History } from '../pages/History';
import { ReportedItems } from '../pages/ReportedItems';
import { SessionView } from '../pages/Session';
import { Review } from '../pages/Review';
import { Modal, Button } from '../components/ui';
import { loadQuestionBanks } from '../data/questionBank';
import { buildDefaultSettings, createSession, countAnswered } from '../lib/sessionAssembly';
import { buildRecentItemIds } from '../lib/sessionPersistence';
import { scoreSession, toHistoryEntry } from '../lib/scoring';
import { computeSpacedRepetition } from '../lib/readiness';
import { generateDemoHistory, generateDemoFlags } from '../lib/demoData';
import { buildQuestionIndex, lookupQuestion } from '../lib/bankLookup';
import { useConfirm } from '../lib/useConfirm';
import {
  bootstrapState, clearActiveSession, clearHistory, clearSampleHistory, deleteFlag,
  deleteHistoryEntry, replaceFlags, saveActiveSession, saveHistoryEntry,
  saveMeta, saveSettings, upsertFlag, getDb
} from '../lib/storage';
import {
  syncWithFolder, applyFolderMeta, connectSyncFolder, getPersistedDirHandle,
  supportsDirSync
} from '../lib/backup';
import type {
  ActiveSession, AppMeta, FlagReason,
  HistoryEntry, ItemFlag, Question, SessionSettings
} from '../types/exam';

type Page = 'dashboard' | 'history' | 'reported' | 'session' | 'review';

// Debounce window for auto-sync: fires a few seconds after the last write
// (answer, nav, finish) so the folder copy stays current without a
// chatty write per interaction. Matches the user's spec.
const AUTO_SYNC_DEBOUNCE_MS = 2500;

const FLAG_REASONS: FlagReason[] = [
  'factual error',
  'outdated policy/guideline',
  'ambiguous / >1 defensible answer',
  'typo / wording',
  'broken or wrong reference link',
  'other'
];

export default function App() {
  const banks = useMemo(() => loadQuestionBanks(), []);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [meta, setMeta] = useState<AppMeta>({ disclaimerSeen: false });
  const [settings, setSettings] = useState<SessionSettings>(() => buildDefaultSettings('cctc-from-2026-07'));
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [flags, setFlags] = useState<ItemFlag[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<HistoryEntry | null>(null);
  const [flagDraft, setFlagDraft] = useState<{ item: Question; sessionId: string; reason: FlagReason; comment: string } | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [pendingSettingNav, setPendingSettingNav] = useState<'examDate' | 'targetScore' | null>(null);
  const [examDays, setExamDays] = useState<number | null>(() => {
    // Read from meta after bootstrap; this lazy init only runs on first render
    // and meta is set shortly after in the bootstrap effect, so we use a
    // separate state that's kept in sync via onExamDateChanged.
    return null;
  });

  // Folder sync state (lifted from History.tsx so App can fire the
  // debounced auto-sync from any data-mutation site: answer, nav,
  // session end, settings change). The auto-sync timer is owned here.
  //
  // syncDir lives in a ref (single source of truth) so the auto-sync
  // timer callback can read the latest handle without re-creating the
  // timer on every change. The version counter is a useState that
  // forces a re-render when the ref changes. setSyncDir is the only
  // path to mutate the ref — there is no parallel state to forget.
  const [syncFolderName, setSyncFolderName] = useState<string | null>(null);
  const [syncConnected, setSyncConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [metaConflict, setMetaConflict] = useState<{ folderMeta: Record<string, unknown>; localMeta: Record<string, unknown> } | null>(null);
  const syncDirRef = useRef<FileSystemDirectoryHandle | null>(null);
  const [syncDirVersion, setSyncDirVersion] = useState(0);
  const syncDir = syncDirRef.current;
  const syncingRef = useRef(false);
  const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirSyncSupported = useMemo(() => supportsDirSync(), []);

  // Mutator: the only path to change the folder handle. Updates the
  // ref synchronously and bumps the version counter to force a
  // re-render. No-op when the new handle is referentially equal
  // (e.g. the user clicks Connect, the same handle is returned).
  const setSyncDir = useCallback((handle: FileSystemDirectoryHandle | null) => {
    if (syncDirRef.current === handle) return;
    syncDirRef.current = handle;
    setSyncDirVersion((v) => v + 1);
  }, []);

  // Keep the syncing flag mirrored in a ref so the auto-sync timer
  // callback can de-dupe concurrent sync attempts without re-rendering.
  useEffect(() => { syncingRef.current = syncing; }, [syncing]);

  // Build an O(1) id -> Question index from the live bank. This is the
  // single source of truth for question lookups at render time, used by
  // Session, Review, scoring, and spaced-repetition.
  const lastFingerprint = useRef('');
  const activeSessionRef = useRef<ActiveSession | null>(null);

  const bank = useMemo(
    () => (settings.questionSet === 'scenario' ? banks.scenario : banks.standard),
    [banks, settings.questionSet]
  );

  const allQuestions = useMemo(
    () => [...banks.standard.questions, ...banks.scenario.questions],
    [banks]
  );

  const questionIndex = useMemo(() => buildQuestionIndex(allQuestions), [allQuestions]);

  // Bootstrap from IndexedDB — seed sample data on first load
  useEffect(() => {
    let cancelled = false;
    bootstrapState(allQuestions)
      .then(async (state) => {
        if (cancelled) return;
        setMeta(state.meta);
        if (state.settings) setSettings(state.settings);
        setActiveSession(state.activeSession);

        // Recompute exam-days pill from meta.examDate (IndexedDB).
        if (state.meta?.examDate) {
          const days = Math.ceil((new Date(state.meta.examDate).getTime() - Date.now()) / 86400000);
          setExamDays(Number.isFinite(days) ? days : null);
        }

        // Seed sample data if IndexedDB is empty AND not previously seeded.
        // The sample is deterministic (mulberry32 seeded by session index) so
        // the dashboard renders the same data on every machine.
        if (state.history.length === 0) {
          if (!state.meta?.demoSeeded) {
            const demoHistory = generateDemoHistory(allQuestions);
            const demoFlags = generateDemoFlags(allQuestions);
            // Batch the writes into a single transaction.
            const db = await getDb();
            const historyTx = db.transaction('history', 'readwrite');
            await Promise.all(demoHistory.map((entry) => historyTx.store.put(entry)));
            await historyTx.done;
            if (demoFlags.length > 0) {
              const flagsTx = db.transaction('flags', 'readwrite');
              await Promise.all(demoFlags.map((flag) => flagsTx.store.put(flag)));
              await flagsTx.done;
            }
            setHistory(demoHistory);
            setFlags(demoFlags);
            // Mark seeded; sampleNoteDismissed stays false so the banner shows.
            // Persist via updateMeta so React state and IndexedDB stay
            // in sync — subsequent in-memory reads (e.g., the disclaimer
            // "I understand" handler) see demoSeeded=true.
            await updateMeta({ demoSeeded: true });
          }
        } else {
          setHistory(state.history);
          setFlags(state.flags);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load local data.');
      })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [allQuestions]);

  // Persist settings
  useEffect(() => {
    if (ready) void saveSettings(settings);
  }, [ready, settings]);

  // Track active session ref
  useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);

  // ─── Folder sync (manual + auto) ────────────────────────────
  // State lives in App because the auto-sync timer fires from
  // any data-mutation site (answer, nav, finish). History receives
  // everything as props and renders the connected/disconnected card.

  // runSync: shared core. auto=true is non-blocking; never prompts
  // on meta conflict. auto=false is manual; prompts via metaConflict
  // state which the History UI surfaces in a confirm modal.
  const runSync = useCallback(async (auto: boolean): Promise<void> => {
    const dir = syncDirRef.current;
    if (!dir) return; // no-op when not connected
    if (syncingRef.current) return; // de-dupe concurrent syncs
    syncingRef.current = true;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result = await syncWithFolder(dir, { auto });
      syncingRef.current = false;
      setSyncing(false);
      // Always apply the merged history + flags + active session.
      setHistory(result.mergedHistory);
      setFlags(result.mergedFlags);
      if (result.activeSession) setActiveSession(result.activeSession);
      if (!auto && result.metaDiffers) {
        // Manual sync: surface the conflict to the History UI modal.
        setMetaConflict({ folderMeta: result.folderMeta ?? {}, localMeta: result.localMeta ?? {} });
      } else if (auto && result.autoSkippedMeta) {
        // Auto sync: silently merge history; defer the conflict to
        // the next manual sync. Set a quiet indicator so the user
        // knows something happened but isn't interrupted.
        setSyncMsg(`Synced · ${result.mergedCount} session(s). Settings differ — run Sync now to choose.`);
      } else {
        setSyncMsg(`Synced · ${result.mergedCount} session(s) in folder.`);
      }
    } catch {
      syncingRef.current = false;
      setSyncing(false);
      setSyncMsg('Sync failed — check folder permissions and try again.');
    }
  }, []);

  // scheduleAutoSync: debounced ~2.5s after the last write (answer,
  // nav, finish). Resets on every call so rapid interactions coalesce
  // into a single sync. No-op unless a folder is connected.
  const scheduleAutoSync = useCallback(() => {
    if (!syncDirRef.current) return;
    if (autoSyncTimerRef.current !== null) {
      clearTimeout(autoSyncTimerRef.current);
    }
    autoSyncTimerRef.current = setTimeout(() => {
      autoSyncTimerRef.current = null;
      void runSync(true);
    }, AUTO_SYNC_DEBOUNCE_MS);
  }, [runSync]);

  // Restore persisted folder handle on first load so auto-sync
  // works across reloads without re-prompting the user.
  useEffect(() => {
    if (!dirSyncSupported) return;
    void getPersistedDirHandle().then((handle) => {
      if (handle) {
        setSyncDir(handle);
        setSyncConnected(true);
        setSyncFolderName(handle.name);
        // The handle is now in the ref too; subsequent scheduleAutoSync()
        // calls will fire. Don't trigger an immediate sync — let the
        // user's next action schedule it naturally.
      }
    }).catch(() => {});
  }, [dirSyncSupported]);

  const handleConnectFolder = useCallback(async () => {
    const dir = await connectSyncFolder();
    if (dir) {
      setSyncDir(dir);
      setSyncConnected(true);
      setSyncFolderName(dir.name);
      setSyncMsg(null);
      // Do an initial manual sync so the folder gets the user's
      // existing history. Subsequent updates are debounced.
      await runSync(false);
    } else {
      setSyncMsg('Folder sync needs a Chromium desktop browser (Chrome/Edge). Use Export/Import backup instead.');
    }
  }, [runSync]);

  const handleSyncNow = useCallback(async () => {
    if (!syncDir) {
      setSyncMsg('No folder connected. Click "Connect folder" to set up sync.');
      return;
    }
    await runSync(false);
  }, [syncDir, runSync, syncDirVersion]);

  const handleKeepThisDevice = useCallback(async () => {
    if (!syncDir || !metaConflict) return;
    await applyFolderMeta(syncDir, metaConflict.localMeta as any);
    setMetaConflict(null);
    setSyncMsg('Settings kept from this device.');
  }, [syncDir, metaConflict, syncDirVersion]);

  const handleKeepFolder = useCallback(async () => {
    if (!metaConflict || !syncDir) return;
    const db = await getDb();
    await db.put('kv', metaConflict.folderMeta, 'settings');
    setMetaConflict(null);
    setSyncMsg('Settings applied from folder.');
    // Refresh settings from IndexedDB so the UI reflects the
    // adopted values.
    const fresh = await db.get('kv', 'settings');
    if (fresh) setSettings(fresh as any);
  }, [metaConflict, syncDir, syncDirVersion]);

  // Cleanup the auto-sync timer on unmount.
  useEffect(() => () => {
    if (autoSyncTimerRef.current !== null) {
      clearTimeout(autoSyncTimerRef.current);
    }
  }, []);

  // Persist active session — only when user actions change (not timer ticks)
  useEffect(() => {
    if (!ready || !activeSession) {
      lastFingerprint.current = '';
      if (ready && !activeSession) void clearActiveSession();
      return;
    }
    // Compare only mutable fields (exclude updatedAt and remainingSeconds)
    const fp = JSON.stringify({
      id: activeSession.id,
      settings: activeSession.settings,
      items: activeSession.items.map((i) => ({ itemId: i.itemId, optionOrder: i.optionOrder })),
      answers: activeSession.answers,
      revealed: activeSession.revealed,
      flaggedForReview: activeSession.flaggedForReview,
      currentIndex: activeSession.currentIndex,
      submittedAt: activeSession.submittedAt,
    });
    if (fp !== lastFingerprint.current) {
      lastFingerprint.current = fp;
      void saveActiveSession(activeSession);
      // Schedule an auto-sync so the durability copy of the
      // in-progress session stays current. Fires ~2.5s after the
      // last write so rapid answer/nav clicks coalesce.
      scheduleAutoSync();
    }
  }, [activeSession, ready, scheduleAutoSync]);

  // Flush on unload
  useEffect(() => {
    const flush = () => { if (activeSessionRef.current) void saveActiveSession(activeSessionRef.current); };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  // Timer — uses performance.now() delta to avoid drift when tab is throttled
  const timedSessionId = ready && activeSession && !activeSession.submittedAt && activeSession.remainingSeconds !== null ? activeSession.id : null;
  const timerRef = useRef<number>(0);

  useEffect(() => {
    if (!timedSessionId) return;
    timerRef.current = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const elapsed = now - timerRef.current;
      timerRef.current = now;
      const ticks = Math.round(elapsed / 1000);
      if (ticks <= 0) return;
      setActiveSession((prev) => {
        if (!prev || prev.id !== timedSessionId || prev.submittedAt || prev.remainingSeconds === null || prev.remainingSeconds <= 0) return prev;
        return { ...prev, remainingSeconds: Math.max(0, prev.remainingSeconds - ticks), updatedAt: new Date().toISOString() };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timedSessionId]);

  // Auto-submit when timer expires — uses ref to avoid stale closure
  useEffect(() => {
    const session = activeSessionRef.current;
    if (!session || session.submittedAt || session.remainingSeconds === null || session.remainingSeconds > 0) return;
    if (session.remainingSeconds === 0 && activeSessionRef.current?.remainingSeconds === 0) return; // already fired

    // Mark session so this effect doesn't fire again
    const completed = { ...session, submittedAt: new Date().toISOString(), result: scoreSession(session.settings.blueprintId, session.items, session.answers, session.settings.targetThreshold, questionIndex), updatedAt: new Date().toISOString() };
    const entry = toHistoryEntry(completed, questionIndex);
    void saveHistoryEntry(entry).then(() => clearActiveSession()).then(() => {
      setHistory((prev) => [entry, ...prev]);
      setSelectedHistory(entry);
      setActiveSession(null);
      setPage('review');
      // Auto-sync: the in-progress session is now complete, the new
      // immutable session file should be written to the folder.
      scheduleAutoSync();
    });
  }, [activeSession?.remainingSeconds, activeSession?.submittedAt, scheduleAutoSync]);

  // Mutate session helper
  const mutateSession = useCallback((fn: (s: ActiveSession) => ActiveSession) => {
    setActiveSession((prev) => prev ? { ...fn(prev), updatedAt: new Date().toISOString() } : prev);
  }, []);

  // Answer
  const handleAnswer = useCallback((optionId: string) => {
    mutateSession((s) => ({
      ...s,
      answers: { ...s.answers, [s.items[s.currentIndex].itemId]: optionId },
      revealed: s.settings.mode === 'study' ? { ...s.revealed, [s.items[s.currentIndex].itemId]: true } : s.revealed,
    }));
  }, [mutateSession]);

  // Navigate
  const handleNavigateSession = useCallback((dir: -1 | 1) => {
    mutateSession((s) => ({ ...s, currentIndex: Math.min(Math.max(s.currentIndex + dir, 0), s.items.length - 1) }));
  }, [mutateSession]);

  // Bookmark
  const handleToggleBookmark = useCallback(() => {
    mutateSession((s) => {
      const id = s.items[s.currentIndex].itemId;
      const bookmarked = s.flaggedForReview.includes(id);
      return { ...s, flaggedForReview: bookmarked ? s.flaggedForReview.filter((v) => v !== id) : [...s.flaggedForReview, id] };
    });
  }, [mutateSession]);

  // Go to question
  const handleGoToQuestion = useCallback((idx: number) => {
    mutateSession((s) => ({ ...s, currentIndex: idx }));
  }, [mutateSession]);

  // Start session — prompt if one already exists
  const [replaceConfirm, setReplaceConfirm] = useState<Partial<SessionSettings> | null>(null);
  const { confirm, handleConfirm, handleCancel, open, title, description, confirmLabel, variant } = useConfirm();

  const doStartSession = useCallback((overrides?: Partial<SessionSettings>) => {
    const merged = { ...settings, ...overrides };
    const recentIds = buildRecentItemIds(history.map((e) => ({ itemIds: e.itemIds })));
    const session = createSession(bank.questions, merged, recentIds);
    setActiveSession(session);
    setSettings(merged);
    setSelectedHistory(null);
    setReplaceConfirm(null);
    setPage('session');
  }, [settings, history, bank]);

  // Not wrapped in useCallback — always reads current activeSession
  function handleStartSession(overrides?: Partial<SessionSettings>) {
    if (activeSession && !activeSession.submittedAt) {
      setReplaceConfirm(overrides ?? {});
      return;
    }
    doStartSession(overrides);
  }

  // Submit session — always confirm before submitting
  const handleSubmitSession = useCallback(async () => {
    if (!activeSession || isFinalizing) return;
    const unanswered = activeSession.items.length - countAnswered(activeSession);
    const isExam = activeSession.settings.mode === 'exam';
    const title = isExam ? 'Submit Exam' : 'Complete Session';
    const description = unanswered > 0
      ? `${isExam ? 'Submit exam' : 'Complete session'} with ${unanswered} unanswered item${unanswered > 1 ? 's' : ''}?${isExam ? ' There is no guessing penalty.' : ''}`
      : `${isExam ? 'Submit exam and score the results?' : 'Complete session and save your results?'}`;
    confirm({
      title,
      description,
      confirmLabel: isExam ? 'Submit' : 'Complete',
      onConfirm: () => {
        const current = activeSessionRef.current;
        if (!current) return;
        setIsFinalizing(true);
        const result = scoreSession(current.settings.blueprintId, current.items, current.answers, current.settings.targetThreshold, questionIndex);
        const completed = { ...current, submittedAt: new Date().toISOString(), result, updatedAt: new Date().toISOString() };
        const entry = toHistoryEntry(completed, questionIndex);
        void saveHistoryEntry(entry).then(() => clearActiveSession()).then(() => {
          setHistory((prev) => [entry, ...prev]);
          setSelectedHistory(entry);
          setActiveSession(null);
          setPage('review');
          // Auto-sync: new immutable session file should land in
          // the folder a moment after the user finishes.
          scheduleAutoSync();
        }).finally(() => setIsFinalizing(false));
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession, isFinalizing]);

  // Report item
  const handleReport = useCallback((item?: Question, sessionId?: string) => {
    const currentItem = activeSession?.items[activeSession.currentIndex];
    const q = item ?? (currentItem ? lookupQuestion(questionIndex, currentItem.itemId) : undefined);
    const sid = sessionId ?? activeSession?.id ?? '';
    if (q) setFlagDraft({ item: q, sessionId: sid, reason: 'factual error', comment: '' });
  }, [activeSession, questionIndex]);

  const handleSaveReport = useCallback(async () => {
    if (!flagDraft) return;
    const existing = flags.find((f) => f.item_id === flagDraft.item.id);
    const now = new Date().toISOString();
    const flag: ItemFlag = {
      id: existing?.id ?? crypto.randomUUID?.() ?? `flag-${Date.now()}`,
      item_id: flagDraft.item.id,
      version: flagDraft.item.version ?? 1,
      status: flagDraft.item.status,
      reason: flagDraft.reason,
      comment: flagDraft.comment,
      session_id: flagDraft.sessionId,
      blueprint: settings.blueprintId,
      mode: settings.mode,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await upsertFlag(flag);
    setFlags((prev) => [flag, ...prev.filter((f) => f.item_id !== flag.item_id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    setFlagDraft(null);
  }, [flagDraft, flags, settings]);

  const handleDeleteFlag = useCallback(async (id: string) => {
    await deleteFlag(id);
    setFlags((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleClearFlags = useCallback(async () => {
    confirm({
      title: 'Clear All Reports',
      description: 'Are you sure you want to clear all reported items? This action cannot be undone.',
      confirmLabel: 'Clear All',
      variant: 'destructive',
      onConfirm: () => { void replaceFlags([]).then(() => { setFlags([]); }); },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportFlags = useCallback(() => {
    // Include question context in flag export
    const enriched = flags.map((flag) => {
      const q = allQuestions.find((qq) => qq.id === flag.item_id);
      return {
        ...flag,
        questionStem: q?.stem ?? '',
        questionCorrect: q?.correct ?? '',
      };
    });
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), flags: enriched }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'cctc-flags.json'; a.click();
    URL.revokeObjectURL(url);
  }, [flags]);

  const handleDeleteHistory = useCallback(async (id: string) => {
    await deleteHistoryEntry(id);
    setHistory((prev) => prev.filter((e) => e.id !== id));
    if (selectedHistory?.id === id) { setSelectedHistory(null); setPage('history'); }
  }, [selectedHistory]);

  const handleClearHistory = useCallback(async () => {
    confirm({
      title: 'Delete All History',
      description: 'Are you sure you want to delete all session history? This action cannot be undone.',
      confirmLabel: 'Delete All',
      variant: 'destructive',
      onConfirm: () => {
        void clearHistory().then(() => {
          setHistory([]);
          setSelectedHistory(null);
        });
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHistory]);

  const sampleHistoryCount = useMemo(
    () => history.filter((e) => e.sample === true).length,
    [history]
  );

  const handleRemoveSampleData = useCallback(async () => {
    confirm({
      title: 'Remove Sample Data',
      description: `This deletes the ${sampleHistoryCount} sample session${sampleHistoryCount === 1 ? '' : 's'} seeded on first run. Your own sessions and reported items are not affected.`,
      confirmLabel: 'Remove sample data',
      variant: 'destructive',
      onConfirm: () => {
        void clearSampleHistory().then(() => {
          setHistory((prev) => prev.filter((e) => e.sample !== true));
          if (selectedHistory?.sample === true) {
            setSelectedHistory(null);
            setPage('history');
          }
        });
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleHistoryCount, selectedHistory]);

  // updateMeta: single entry point for every meta mutation. Patches the
  // current React state and writes to IndexedDB in one call, so the
  // two stores can never drift apart. Replaces a footgun where the
  // disclaimer "I understand" handler was overwriting meta with
  // { disclaimerSeen: true } and dropping demoSeeded.
  //
  // Uses the functional setMeta form so the patch is applied to the
  // latest React state, not a closure-captured snapshot. The same
  // patched object is then persisted, keeping React and IndexedDB
  // consistent within the same call.
  const updateMeta = useCallback(async (patch: Partial<AppMeta>) => {
    let next: AppMeta = { disclaimerSeen: false };
    setMeta((prev) => {
      next = { ...prev, ...patch };
      return next;
    });
    await saveMeta(next);
  }, []);

  const handleDismissSampleNote = useCallback(async () => {
    await updateMeta({ sampleNoteDismissed: true });
  }, [updateMeta]);

  // Persist exam date in IndexedDB (AppMeta.examDate). Replaces the
  // old localStorage key so the value survives cookie/storage clears
  // alongside the rest of the app's metadata.
  const handleSetExamDate = useCallback(async (iso: string) => {
    await updateMeta({ examDate: iso });
    if (iso) {
      const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
      setExamDays(Number.isFinite(days) ? days : null);
    } else {
      setExamDays(null);
    }
  }, [updateMeta]);

  const handleViewSession = useCallback((entry: HistoryEntry) => {
    setSelectedHistory(entry);
    setPage('review');
  }, []);

  if (!ready) return <div className="flex min-h-screen items-center justify-center bg-[var(--background)]"><p className="text-[var(--muted-foreground)]">Loading...</p></div>;
  if (error) return <div className="flex min-h-screen items-center justify-center bg-[var(--background)]"><p className="text-[var(--destructive)]">{error}</p></div>;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-16 sm:pb-0">
      {/* Disclaimer — not dismissible, must acknowledge */}
      <Modal open={!meta.disclaimerSeen} onClose={() => {}} title="Independent Study Aid" dismissible={false}>
        <p className="text-sm text-[var(--muted-foreground)]">
          This practice app is not affiliated with or endorsed by ABTC or PSI, does not reproduce real exam items,
          and must not be used for patient-care decisions. Practice results are unofficial estimates only.
        </p>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => void updateMeta({ disclaimerSeen: true })}>I understand</Button>
        </div>
      </Modal>

      {/* Replace session confirmation */}
      <Modal
        open={replaceConfirm !== null}
        onClose={() => setReplaceConfirm(null)}
        title="Unfinished session"
        description="You already have a session in progress. Start a new session and discard the current one, or resume it?"
      >
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => { setReplaceConfirm(null); setPage('session'); }}>
            Resume current
          </Button>
          <Button variant="secondary" onClick={() => { setReplaceConfirm(null); setActiveSession(null); void clearActiveSession(); }}>
            Discard
          </Button>
          <Button onClick={() => doStartSession(replaceConfirm ?? undefined)}>
            Start new
          </Button>
        </div>
      </Modal>

      {/* Report modal */}
      <Modal open={flagDraft !== null} onClose={() => setFlagDraft(null)} title="Report This Item">
        {flagDraft && (
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Reason</label>
              <select value={flagDraft.reason} onChange={(e) => setFlagDraft({ ...flagDraft, reason: e.target.value as FlagReason })} className="flex h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 text-sm">
                {FLAG_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Comment</label>
              <textarea value={flagDraft.comment} onChange={(e) => setFlagDraft({ ...flagDraft, comment: e.target.value })} rows={3} className="w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setFlagDraft(null)}>Cancel</Button>
              <Button onClick={() => void handleSaveReport()}>Save Report</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Shared confirm modal — driven by useConfirm hook */}
      <Modal open={open} onClose={handleCancel} title={title} description={description}>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
          <Button variant={variant === 'destructive' ? 'destructive' : 'primary'} onClick={handleConfirm}>{confirmLabel}</Button>
        </div>
      </Modal>

      <Navigation
        currentPage={page}
        onNavigate={setPage}
        hasActiveSession={activeSession !== null && !activeSession.submittedAt}
        daysUntilExam={examDays}
        targetScore={settings.targetThreshold}
        onNavigateToExamDate={() => { setPage('dashboard'); setPendingSettingNav('examDate'); }}
        onNavigateToTargetScore={() => { setPage('dashboard'); setPendingSettingNav('targetScore'); }}
      />

      <main className="mx-auto max-w-5xl px-4 py-6 pb-20 sm:pb-6">
        {page === 'dashboard' && (
          <Dashboard
            history={history}
            settings={settings}
            examDate={meta.examDate ?? ''}
            questionIndex={questionIndex}
            sampleNoteVisible={history.some((e) => e.sample === true) && !meta.sampleNoteDismissed}
            onDismissSampleNote={() => void handleDismissSampleNote()}
            onRemoveSampleData={() => void handleRemoveSampleData()}
            onSetExamDate={handleSetExamDate}
            onStartExam={() => handleStartSession({ mode: 'exam', questionCount: 175, timed: true, timeMinutes: 180 })}
            onStartQuick={() => handleStartSession({ mode: 'study', questionCount: 25, timed: true, timeMinutes: 30 })}
            onStartWeakAreas={(domains) => {
              const allMissed = computeSpacedRepetition(history, questionIndex);
              const filtered = domains.length > 0
                ? allMissed.filter((id) => {
                    const q = bank.questions.find((qq) => qq.id === id);
                    return q && domains.includes(String(q.domain));
                  })
                : allMissed;
              handleStartSession({ mode: 'study', questionCount: Math.min(30, filtered.length || 30), timed: false });
            }}
            onStartCustom={(overrides) => handleStartSession(overrides)}
            onUpdateSettings={(partial) => setSettings((prev) => ({ ...prev, ...partial }))}
            onGoToHistory={() => setPage('history')}
            onViewSession={handleViewSession}
            pendingSettingNav={pendingSettingNav}
            onClearPendingNav={() => setPendingSettingNav(null)}
            onExamDateChanged={() => {
              // Re-read from meta (already updated synchronously by handleSetExamDate).
              if (meta.examDate) {
                const days = Math.ceil((new Date(meta.examDate).getTime() - Date.now()) / 86400000);
                setExamDays(Number.isFinite(days) ? days : null);
              } else {
                setExamDays(null);
              }
            }}
          />
        )}

        {page === 'history' && (
          <History
            history={history}
            sampleHistoryCount={sampleHistoryCount}
            onViewSession={handleViewSession}
            onDeleteSession={(id) => void handleDeleteHistory(id)}
            onClearAll={() => void handleClearHistory()}
            onRemoveSampleData={() => void handleRemoveSampleData()}
            onNavigateToReported={() => setPage('reported')}
            // Sync state (lifted from History so the auto-sync timer
            // can fire from any data-mutation site in App).
            dirSyncSupported={dirSyncSupported}
            syncFolderName={syncFolderName}
            syncConnected={syncConnected}
            syncing={syncing}
            syncMsg={syncMsg}
            metaConflict={metaConflict}
            onConnectFolder={() => void handleConnectFolder()}
            onSyncNow={() => void handleSyncNow()}
            onKeepThisDevice={() => void handleKeepThisDevice()}
            onKeepFolder={() => void handleKeepFolder()}
            onDismissMetaConflict={() => setMetaConflict(null)}
            onImportRefresh={(newHistory, newFlags, newActiveSession) => {
              setHistory(newHistory);
              setFlags(newFlags);
              if (newActiveSession) setActiveSession(newActiveSession);
            }}
          />
        )}

        {page === 'reported' && (
          <ReportedItems
            flags={flags}
            onEdit={(flag) => {
              const q = allQuestions.find((qq) => qq.id === flag.item_id);
              if (q) setFlagDraft({ item: q, sessionId: flag.session_id, reason: flag.reason, comment: flag.comment });
            }}
            onDelete={(id) => void handleDeleteFlag(id)}
            onExport={handleExportFlags}
            onClearAll={() => void handleClearFlags()}
          />
        )}

        {page === 'session' && activeSession && (
          <SessionView
            session={activeSession}
            questionIndex={questionIndex}
            onAnswer={handleAnswer}
            onNavigate={handleNavigateSession}
            onToggleBookmark={handleToggleBookmark}
            onReport={() => handleReport()}
            onSubmit={() => void handleSubmitSession()}
            onGoToQuestion={handleGoToQuestion}
          />
        )}

        {page === 'session' && !activeSession && (
          <div className="text-center py-12">
            <p className="text-[var(--muted-foreground)]">No active session. Start one from the Dashboard or Setup.</p>
            <Button variant="secondary" className="mt-4" onClick={() => setPage('dashboard')}>Back to Dashboard</Button>
          </div>
        )}

        {page === 'review' && selectedHistory && (
          <Review
            entry={selectedHistory}
            questionIndex={questionIndex}
            onBack={() => setPage('history')}
            onReport={(itemId) => {
              const q = allQuestions.find((qq) => qq.id === itemId);
              if (q) handleReport(q, selectedHistory.id);
            }}
          />
        )}
      </main>

      <footer className="border-t border-[var(--border)] bg-[var(--card)] mt-8">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <p className="text-xs text-[var(--muted-foreground)] text-center">
            This practice app is an independent study aid, not affiliated with or endorsed by ABTC or PSI.
          </p>
        </div>
      </footer>
    </div>
  );
}
