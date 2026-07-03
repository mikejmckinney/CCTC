import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Navigation } from '../components/Navigation';
import { Dashboard } from '../pages/Dashboard';
import { Setup } from '../pages/Setup';
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
import {
  bootstrapState, clearActiveSession, clearHistory, deleteFlag,
  deleteHistoryEntry, replaceFlags, saveActiveSession, saveHistoryEntry,
  saveMeta, saveSettings, upsertFlag
} from '../lib/storage';
import type {
  ActiveSession, AppMeta, FlagReason,
  HistoryEntry, ItemFlag, Question, SessionSettings
} from '../types/exam';

type Page = 'dashboard' | 'setup' | 'history' | 'reported' | 'session' | 'review';

const FLAG_REASONS: FlagReason[] = [
  'factual error',
  'outdated policy/guideline',
  'ambiguous / >1 defensible answer',
  'typo / wording',
  'broken or wrong reference link',
  'other'
];

function sessionFingerprint(session: ActiveSession): string {
  return JSON.stringify({
    id: session.id,
    settings: session.settings,
    items: session.items.map((i) => ({ itemId: i.itemId, optionOrder: i.optionOrder })),
    answers: session.answers,
    revealed: session.revealed,
    flaggedForReview: session.flaggedForReview,
    currentIndex: session.currentIndex,
    timerHidden: session.timerHidden,
    submittedAt: session.submittedAt,
  });
}

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
  const [submitConfirm, setSubmitConfirm] = useState<{ unanswered: number } | null>(null);
  const [clearHistoryConfirm, setClearHistoryConfirm] = useState(false);
  const [clearFlagsConfirm, setClearFlagsConfirm] = useState(false);
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

  // Bootstrap from IndexedDB — seed demo data on first load
  useEffect(() => {
    let cancelled = false;
    bootstrapState(allQuestions)
      .then(async (state) => {
        if (cancelled) return;
        setMeta(state.meta);
        if (state.settings) setSettings(state.settings);
        setActiveSession(state.activeSession);

        // Seed demo data if IndexedDB is empty
        if (state.history.length === 0) {
          const demoHistory = generateDemoHistory();
          const demoFlags = generateDemoFlags();
          for (const entry of demoHistory) {
            await saveHistoryEntry(entry);
          }
          for (const flag of demoFlags) {
            await upsertFlag(flag as ItemFlag);
          }
          setHistory(demoHistory);
          setFlags(demoFlags as ItemFlag[]);
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

  // Persist active session
  useEffect(() => {
    if (!ready || !activeSession) {
      lastFingerprint.current = '';
      if (ready && !activeSession) void clearActiveSession();
      return;
    }
    const fp = sessionFingerprint(activeSession);
    if (fp !== lastFingerprint.current) {
      lastFingerprint.current = fp;
      void saveActiveSession(activeSession);
    }
  }, [activeSession, ready]);

  // Flush on unload
  useEffect(() => {
    const flush = () => { if (activeSessionRef.current) void saveActiveSession(activeSessionRef.current); };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  // Timer
  const timedSessionId = ready && activeSession && !activeSession.submittedAt && activeSession.remainingSeconds !== null ? activeSession.id : null;

  useEffect(() => {
    if (!timedSessionId) return;
    const interval = setInterval(() => {
      setActiveSession((prev) => {
        if (!prev || prev.id !== timedSessionId || prev.submittedAt || prev.remainingSeconds === null || prev.remainingSeconds <= 0) return prev;
        return { ...prev, remainingSeconds: Math.max(0, prev.remainingSeconds - 1), updatedAt: new Date().toISOString() };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timedSessionId]);

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

  // Start session
  const handleStartSession = useCallback((overrides?: Partial<SessionSettings>) => {
    const merged = { ...settings, ...overrides };
    const recentIds = buildRecentItemIds(history.map((e) => ({ itemIds: e.itemIds })));
    const session = createSession(bank.questions, merged, recentIds);
    setActiveSession(session);
    setSettings(merged);
    setSelectedHistory(null);
    setPage('session');
  }, [settings, history, bank]);

  // Submit session
  const handleSubmitSession = useCallback(async () => {
    if (!activeSession || isFinalizing) return;
    const unanswered = activeSession.items.length - countAnswered(activeSession);
    if (activeSession.settings.mode === 'exam') {
      setSubmitConfirm({ unanswered });
      return;
    }
    setIsFinalizing(true);
    try {
      const result = scoreSession(activeSession.settings.blueprintId, activeSession.items, activeSession.answers, activeSession.settings.targetThreshold);
      const completed = { ...activeSession, submittedAt: new Date().toISOString(), result, updatedAt: new Date().toISOString() };
      const entry = toHistoryEntry(completed);
      await saveHistoryEntry(entry);
      await clearActiveSession();
      setHistory((prev) => [entry, ...prev]);
      setSelectedHistory(entry);
      setActiveSession(null);
      setPage('review');
    } finally {
      setIsFinalizing(false);
    }
  }, [activeSession, isFinalizing]);

  // Report item
  const handleReport = useCallback((item?: Question, sessionId?: string) => {
    const q = item ?? activeSession?.items[activeSession.currentIndex]?.question;
    const sid = sessionId ?? activeSession?.id ?? '';
    if (q) setFlagDraft({ item: q, sessionId: sid, reason: 'factual error', comment: '' });
  }, [activeSession]);

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
    setClearFlagsConfirm(true);
  }, []);

  const handleExportFlags = useCallback(() => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), flags }, null, 2)], { type: 'application/json' });
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
    setClearHistoryConfirm(true);
  }, []);

  const handleViewSession = useCallback((entry: HistoryEntry) => {
    setSelectedHistory(entry);
    setPage('review');
  }, []);

  if (!ready) return <div className="flex min-h-screen items-center justify-center bg-[var(--background)]"><p className="text-[var(--muted-foreground)]">Loading...</p></div>;
  if (error) return <div className="flex min-h-screen items-center justify-center bg-[var(--background)]"><p className="text-[var(--destructive)]">{error}</p></div>;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-16 sm:pb-0">
      {/* Disclaimer */}
      <Modal open={!meta.disclaimerSeen} onClose={() => {}} title="Independent Study Aid">
        <p className="text-sm text-[var(--muted-foreground)]">
          This practice app is not affiliated with or endorsed by ABTC or PSI, does not reproduce real exam items,
          and must not be used for patient-care decisions. Practice results are unofficial estimates only.
        </p>
        <div className="mt-4 flex justify-end">
          <Button onClick={async () => { const m = { disclaimerSeen: true }; setMeta(m); await saveMeta(m); }}>I understand</Button>
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

      {/* Submit confirmation modal */}
      <Modal
        open={submitConfirm !== null}
        onClose={() => { setSubmitConfirm(null); setIsFinalizing(false); }}
        title="Submit Exam"
        description={submitConfirm && submitConfirm.unanswered > 0
          ? `Submit with ${submitConfirm.unanswered} unanswered item${submitConfirm.unanswered > 1 ? 's' : ''}? There is no guessing penalty.`
          : 'Submit exam and score the results?'}
      >
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" onClick={() => { setSubmitConfirm(null); setIsFinalizing(false); }}>Cancel</Button>
          <Button onClick={() => {
            setSubmitConfirm(null);
            // Trigger actual submit
            if (activeSession) {
              setIsFinalizing(true);
              const result = scoreSession(activeSession.settings.blueprintId, activeSession.items, activeSession.answers, activeSession.settings.targetThreshold);
              const completed = { ...activeSession, submittedAt: new Date().toISOString(), result, updatedAt: new Date().toISOString() };
              const entry = toHistoryEntry(completed);
              void saveHistoryEntry(entry).then(() => clearActiveSession()).then(() => {
                setHistory((prev) => [entry, ...prev]);
                setSelectedHistory(entry);
                setActiveSession(null);
                setPage('review');
              }).finally(() => setIsFinalizing(false));
            }
          }}>Submit</Button>
        </div>
      </Modal>

      {/* Clear history confirmation modal */}
      <Modal
        open={clearHistoryConfirm}
        onClose={() => setClearHistoryConfirm(false)}
        title="Delete All History"
        description="Are you sure you want to delete all session history? This action cannot be undone."
      >
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" onClick={() => setClearHistoryConfirm(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => {
            void clearHistory().then(() => {
              setHistory([]);
              setSelectedHistory(null);
              setClearHistoryConfirm(false);
            });
          }}>Delete All</Button>
        </div>
      </Modal>

      {/* Clear flags confirmation modal */}
      <Modal
        open={clearFlagsConfirm}
        onClose={() => setClearFlagsConfirm(false)}
        title="Clear All Reports"
        description="Are you sure you want to clear all reported items? This action cannot be undone."
      >
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" onClick={() => setClearFlagsConfirm(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => {
            void replaceFlags([]).then(() => {
              setFlags([]);
              setClearFlagsConfirm(false);
            });
          }}>Clear All</Button>
        </div>
      </Modal>

      <Navigation currentPage={page} onNavigate={setPage} hasActiveSession={activeSession !== null && !activeSession.submittedAt} />

      <main className="mx-auto max-w-5xl px-4 py-6">
        {page === 'dashboard' && (
          <Dashboard
            history={history}
            onStartExam={() => handleStartSession({ mode: 'exam', questionCount: 175, timed: true, timeMinutes: 180 })}
            onStartQuick={() => handleStartSession({ mode: 'study', questionCount: 25, timed: true, timeMinutes: 30 })}
            onStartWeakAreas={() => {
              const weakIds = computeSpacedRepetition(history);
              handleStartSession({ mode: 'study', questionCount: Math.min(30, weakIds.length || 30), timed: false });
            }}
            onStartLastSettings={() => handleStartSession()}
            onGoToSetup={() => setPage('setup')}
            onGoToHistory={() => setPage('history')}
            onViewSession={handleViewSession}
          />
        )}

        {page === 'setup' && (
          <Setup
            settings={settings}
            onUpdate={(p) => setSettings((prev) => ({ ...prev, ...p }))}
            onStart={() => handleStartSession()}
            availableCount={bank.questions.filter((q: Question) => settings.includeDrafts || q.status === 'reviewed').length}
          />
        )}

        {page === 'history' && (
          <History history={history} onViewSession={handleViewSession} onDeleteSession={(id) => void handleDeleteHistory(id)} onClearAll={() => void handleClearHistory()} onNavigateToReported={() => setPage('reported')} />
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
