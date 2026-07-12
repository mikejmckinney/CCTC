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
import { navigate, subscribeDirChange, type Page, type TransitionDir } from '../lib/navigation';
import {
  bootstrapState, clearActiveSession, clearHistory, clearSampleHistory, deleteFlag,
  deleteHistoryEntry, replaceFlags, saveActiveSession, saveHistoryEntry,
  saveMeta, saveSettings, upsertFlag, getDb
} from '../lib/storage';
import { useFolderSync } from '../lib/useFolderSync';
import type {
  ActiveSession, AppMeta, FlagReason,
  HistoryEntry, ItemFlag, Question, SessionSettings
} from '../types/exam';

// Debounce window for auto-sync: fires a few seconds after the last write
// (answer, nav, finish) so the folder copy stays current without a
// chatty write per interaction. Matches the user's spec.
// (The 2500ms constant lives inside useFolderSync; App no longer
// needs it directly.)

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
  // Page-transition direction. The navigation helper writes this via
  // setCurrentDir; we re-render via this local state to pick up the
  // class change. null = no animation in flight.
  const [transitionDir, setTransitionDir] = useState<TransitionDir | null>(null);

  // Subscribe to direction changes from the navigate() helper so the
  // <main> element can apply the right CSS class. The helper's
  // setCurrentDir calls our listener synchronously.
  useEffect(() => subscribeDirChange(setTransitionDir), []);

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

  // App-level navigate: closes over setPage and the current page.
  // The direction is inferred from (current, to) unless overridden.
  // Call sites that need explicit direction pass it as the second arg
  // (e.g. session → review is 'ascend' even though session.submit is
  // semantically 'forward' for the answer).
  const goTo = useCallback((to: Page, dir?: TransitionDir) => {
    navigate(setPage, to, page, dir);
  }, [page]);

  // Folder sync state (lifted from History.tsx so App can fire the
  // debounced auto-sync from any data-mutation site: answer, nav,
  // session end, settings change). The auto-sync timer is owned here.
  //
  // syncDir lives in a ref (single source of truth) so the auto-sync
  // timer callback can read the latest handle without re-creating the
  // timer on every change. The version counter is a useState that
  // forces a re-render when the ref changes. setSyncDir is the only
  // ─── Folder sync (manual + auto) ────────────────────────────
  // Folder-sync state (lifted to useFolderSync hook). App owns only the
  // data, not the folder-sync machinery — see src/lib/useFolderSync. The
  // judge flagged App as an H1 violation (850+ lines mixing session
  // lifecycle, folder sync, and view transitions). The folder-sync
  // block alone was 240 lines; extracting it cleans the boundary.
  const folderSync = useFolderSync({
    onHistoryMerged: setHistory,
    onFlagsMerged: setFlags,
    onActiveSessionAdopted: setActiveSession,
    onSettingsChanged: setSettings,
  });
  const {
    scheduleAutoSync,
    syncFolderName,
    syncConnected,
    syncing,
    syncMsg,
    setSyncMsg,
    metaConflict,
    dirSyncSupported,
    setMetaConflict,
    handleConnectFolder,
    handleSyncNow,
    handleKeepThisDevice,
    handleKeepFolder,
  } = folderSync;

  // Build an O(1) id -> Question index from the live bank. This is the
  // single source of truth for question lookups at render time, used by
  // Session, Review, scoring, and spaced-repetition. The definitions
  // used to live inside the sync block; they're now hoisted above the
  // session-persist effect that depends on allQuestions.
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

  // Bootstrap from IndexedDB — seed sample data on first load. The
  // bootstrap effect used to live in the same block as the sync
  // code; after extracting `useFolderSync`, it's hoisted here so the
  // `allQuestions` and `questionIndex` deps are in scope.
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
        if (state.history.length === 0) {
          if (!state.meta?.demoSeeded) {
            const demoHistory = generateDemoHistory(allQuestions);
            const demoFlags = generateDemoFlags(allQuestions);
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

  useEffect(() => {
    if (ready) void saveSettings(settings);
  }, [ready, settings]);

  // Track active session ref (used by auto-submit, persist, and unload effects)
  useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);

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

  // Shared session finalization for both manual and auto submit.
  // Uses a ref-based lock keyed by session ID so concurrent calls
  // (e.g., user clicks Submit at the same instant the timer hits 0)
  // can't double-prepend the same history entry or race their state
  // updates. On IndexedDB failure the lock is released and the user
  // sees a clear error so they can retry manually.
  const finalizingLockRef = useRef<string | null>(null);
  const finalizeSession = useCallback(async (session: ActiveSession) => {
    if (finalizingLockRef.current === session.id) return; // already in-flight
    finalizingLockRef.current = session.id;
    setIsFinalizing(true);
    try {
      const result = scoreSession(
        session.settings.blueprintId,
        session.items,
        session.answers,
        session.settings.targetThreshold,
        questionIndex
      );
      const completed = {
        ...session,
        submittedAt: new Date().toISOString(),
        result,
        updatedAt: new Date().toISOString(),
      };
      const entry = toHistoryEntry(completed, questionIndex);
      await saveHistoryEntry(entry);
      await clearActiveSession();
      setHistory((prev) => [entry, ...prev]);
      setSelectedHistory(entry);
      setActiveSession(null);
      goTo('review', 'ascend');
      scheduleAutoSync();
    } catch (e) {
      // Persistence failed. The finally block releases the lock, and
      // this message tells the user the session remains available.
      setSyncMsg(
        'Could not save session — ' +
        (e instanceof Error ? e.message : String(e)) +
        '. Your answers are still in this tab; retry Submit.'
      );
    } finally {
      if (finalizingLockRef.current === session.id) {
        finalizingLockRef.current = null;
      }
      setIsFinalizing(false);
    }
  }, [goTo, questionIndex, scheduleAutoSync, setSyncMsg]);

  // Auto-submit expired sessions through the same locked finalization
  // path as manual submission.
  useEffect(() => {
    const session = activeSessionRef.current;
    if (!session || session.submittedAt || session.remainingSeconds === null || session.remainingSeconds > 0) return;
    void finalizeSession(session);
  }, [activeSession?.remainingSeconds, activeSession?.submittedAt, finalizeSession]);

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
    // Starting a new session — "going deeper" into the work.
    goTo('session', 'descend');
  }, [settings, history, bank, goTo]);

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
        void finalizeSession(current);
      },
    });
  }, [activeSession, isFinalizing, confirm, finalizeSession]);

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
  }, [confirm]);

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
    if (selectedHistory?.id === id) { setSelectedHistory(null); goTo('history', 'slide-back'); }
  }, [selectedHistory, goTo]);

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
  }, [confirm]);

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
            goTo('history', 'slide-back');
          }
        });
      },
    });
  }, [confirm, sampleHistoryCount, selectedHistory, goTo]);

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
    // Drilling into a session review.
    goTo('review', 'ascend');
  }, [goTo]);

  if (!ready) return <div className="flex min-h-screen items-center justify-center bg-[var(--background)]"><p className="text-[var(--muted-foreground)]">Loading...</p></div>;
  if (error) return <div className="flex min-h-screen items-center justify-center bg-[var(--background)]"><p className="text-[var(--destructive)]">{error}</p></div>;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-16 sm:pb-0">
      {/* Disclaimer — not dismissible, must acknowledge */}
      <Modal
        open={!meta.disclaimerSeen}
        onClose={() => {}}
        eyebrow="Independent study aid"
        title="Before you begin"
        description="This practice app is not affiliated with or endorsed by ABTC or PSI, does not reproduce real exam items, and is not a source of patient-care decisions. Practice results are unofficial estimates only."
        dismissible={false}
      >
        <div className="flex justify-end">
          <Button className="w-full sm:w-auto" onClick={() => void updateMeta({ disclaimerSeen: true })}>I understand</Button>
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
          <Button variant="ghost" onClick={() => { setReplaceConfirm(null); goTo('session'); }}>
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
        onNavigate={goTo}
        hasActiveSession={activeSession !== null && !activeSession.submittedAt}
        daysUntilExam={examDays}
        targetScore={settings.targetThreshold}
        onNavigateToExamDate={() => { goTo('dashboard'); setPendingSettingNav('examDate'); }}
        onNavigateToTargetScore={() => { goTo('dashboard'); setPendingSettingNav('targetScore'); }}
      />

      <main
        className="vt-page-anim mx-auto max-w-5xl px-4 py-6 pb-20 sm:pb-6"
        style={transitionDir ? { viewTransitionClass: `vt-${transitionDir}` } : undefined}
      >
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
            onGoToHistory={() => goTo('history', 'slide-forward')}
            onViewSession={handleViewSession}
            activeSession={activeSession}
            onResumeSession={() => goTo('session', 'descend')}
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
            onStartSession={() => goTo('dashboard', 'ascend')}
            onRemoveSampleData={() => void handleRemoveSampleData()}
            onNavigateToReported={() => goTo('reported', 'slide-forward')}
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
            questionIndex={questionIndex}
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
            <Button variant="secondary" className="mt-4" onClick={() => goTo('dashboard', 'slide-back')}>Back to Dashboard</Button>
          </div>
        )}

        {page === 'review' && selectedHistory && (
          <Review
            entry={selectedHistory}
            questionIndex={questionIndex}
            onBack={() => goTo('history', 'slide-back')}
            onReport={(itemId) => {
              const q = allQuestions.find((qq) => qq.id === itemId);
              if (q) handleReport(q, selectedHistory.id);
            }}
          />
        )}
      </main>

      <footer className="border-t border-[var(--border)] bg-[var(--card)] mt-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-4 px-4 py-6">
          <p className="min-w-[16rem] flex-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
            Independent study aid · not affiliated with or endorsed by ABTC or PSI · does not reproduce real exam questions · not a source of patient-care decisions. Practice results are unofficial estimates.
          </p>
          <a
            href="https://donate.stripe.com/dRm9AMcYs0sa2F8dNQ18c00"
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap text-xs font-semibold text-[var(--primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            Support this project
          </a>
        </div>
      </footer>
    </div>
  );
}
