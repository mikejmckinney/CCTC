import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { getBlueprint, getBlueprintLabel } from '../data/blueprints';
import { loadQuestionBanks } from '../data/questionBank';
import { buildDefaultSettings, countAnswered, createSession, isBlueprintApplicable } from '../lib/sessionAssembly';
import { buildRecentItemIds } from '../lib/sessionPersistence';
import { scoreSession, toHistoryEntry } from '../lib/scoring';
import {
  bootstrapState,
  clearActiveSession,
  clearHistory,
  deleteFlag,
  deleteHistoryEntry,
  replaceFlags,
  saveActiveSession,
  saveHistoryEntry,
  saveMeta,
  saveSettings,
  upsertFlag
} from '../lib/storage';
import AppShell from './AppShell';

const Dashboard = lazy(() => import('../pages/Dashboard'));
const Setup = lazy(() => import('../pages/Setup'));
const HistoryPage = lazy(() => import('../pages/History'));
const ExamSession = lazy(() => import('../pages/ExamSession'));
const Results = lazy(() => import('../pages/Results'));
const SessionReview = lazy(() => import('../pages/SessionReview'));
const ReportedItems = lazy(() => import('../pages/ReportedItems'));
import type {
  ActiveSession,
  AppMeta,
  BlueprintId,
  ExamMode,
  HistoryEntry,
  ItemFlag,
  Question,
  SessionSettings,
  QuestionSet
} from '../types/exam';

function clampQuestionCount(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(Math.max(value, Math.min(10, max)), max);
}

function getAvailableQuestionCount(questions: Question[], blueprintId: BlueprintId, includeDrafts: boolean): number {
  const blueprint = getBlueprint(blueprintId);
  return questions.filter((q) => {
    if (!includeDrafts && q.status !== 'reviewed') return false;
    return isBlueprintApplicable(blueprint, q);
  }).length;
}

function normalizeSettings(settings: SessionSettings): SessionSettings {
  const defaults = buildDefaultSettings(settings.blueprintId);
  return { ...defaults, ...settings, questionSet: settings.questionSet ?? 'standard' };
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const banks = useMemo(() => loadQuestionBanks(), []);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<AppMeta>({ disclaimerSeen: false });
  const [settings, setSettings] = useState<SessionSettings>(() => buildDefaultSettings('cctc-from-2026-07'));
  const bank = useMemo(
    () => (settings.questionSet === 'scenario' ? banks.scenario : banks.standard),
    [banks, settings.questionSet]
  );
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [flags, setFlags] = useState<ItemFlag[]>([]);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const lastPersistFingerprint = useRef('');
  const activeSessionRef = useRef<ActiveSession | null>(null);

  const allQuestions = useMemo(
    () => [...banks.standard.questions, ...banks.scenario.questions],
    [banks]
  );

  // Bootstrap from IndexedDB
  useEffect(() => {
    let cancelled = false;
    bootstrapState(allQuestions)
      .then((state) => {
        if (cancelled) return;
        setMeta(state.meta);
        setSettings(normalizeSettings(state.settings ?? buildDefaultSettings('cctc-from-2026-07')));
        setActiveSession(state.activeSession);
        setHistory(state.history);
        setFlags(state.flags);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load local app data.');
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => { cancelled = true; };
  }, [allQuestions]);

  // Persist settings
  useEffect(() => {
    if (ready) void saveSettings(settings);
  }, [ready, settings]);

  // Keep ref in sync
  useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);

  // Persist active session
  useEffect(() => {
    if (!ready) return;
    if (!activeSession) {
      lastPersistFingerprint.current = '';
      void clearActiveSession();
      return;
    }
    const fp = JSON.stringify({
      id: activeSession.id,
      settings: activeSession.settings,
      items: activeSession.items.map((i) => ({ itemId: i.itemId, optionOrder: i.optionOrder })),
      answers: activeSession.answers,
      revealed: activeSession.revealed,
      flaggedForReview: activeSession.flaggedForReview,
      currentIndex: activeSession.currentIndex,
      timerHidden: activeSession.timerHidden,
      submittedAt: activeSession.submittedAt,
    });
    if (fp !== lastPersistFingerprint.current) {
      lastPersistFingerprint.current = fp;
      void saveActiveSession(activeSession);
    }
  }, [activeSession, ready]);

  // Flush on unload
  useEffect(() => {
    const flush = () => { if (activeSessionRef.current) void saveActiveSession(activeSessionRef.current); };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  // Timer countdown
  const timedSessionId = ready && activeSession && !activeSession.submittedAt && activeSession.remainingSeconds !== null ? activeSession.id : null;

  useEffect(() => {
    if (!timedSessionId) return;
    const id = setInterval(() => {
      setActiveSession((cur) => {
        if (!cur || cur.id !== timedSessionId || cur.submittedAt || cur.remainingSeconds === null || cur.remainingSeconds <= 0) return cur;
        return { ...cur, remainingSeconds: Math.max(0, cur.remainingSeconds - 1), updatedAt: new Date().toISOString() };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timedSessionId]);

  // Settings helpers
  function persistSettings(next: SessionSettings) {
    setSettings(next);
    void saveSettings(next);
  }

  function updateSettings(partial: Partial<SessionSettings>) {
    const merged = { ...settings, ...partial };
    const max = getAvailableQuestionCount(bank.questions, merged.blueprintId, merged.includeDrafts);
    merged.questionCount = clampQuestionCount(merged.questionCount, max);
    persistSettings(merged);
  }

  // Session helpers
  function mutateSession(mutator: (cur: ActiveSession) => ActiveSession) {
    setActiveSession((cur) => {
      if (!cur) return cur;
      return { ...mutator(cur), updatedAt: new Date().toISOString() };
    });
  }

  function handleAnswer(optionId: string) {
    mutateSession((cur) => ({
      ...cur,
      answers: { ...cur.answers, [cur.items[cur.currentIndex].itemId]: optionId },
      revealed: cur.settings.mode === 'study'
        ? { ...cur.revealed, [cur.items[cur.currentIndex].itemId]: true }
        : cur.revealed,
    }));
  }

  function navigateSession(direction: -1 | 1) {
    mutateSession((cur) => ({
      ...cur,
      currentIndex: Math.min(Math.max(cur.currentIndex + direction, 0), cur.items.length - 1),
    }));
  }

  function goToQuestion(index: number) {
    mutateSession((cur) => ({ ...cur, currentIndex: index }));
  }

  function toggleBookmark() {
    mutateSession((cur) => {
      const itemId = cur.items[cur.currentIndex].itemId;
      return {
        ...cur,
        flaggedForReview: cur.flaggedForReview.includes(itemId)
          ? cur.flaggedForReview.filter((v) => v !== itemId)
          : [...cur.flaggedForReview, itemId],
      };
    });
  }

  function beginNewSession(nextSettings: SessionSettings = settings) {
    const recentIds = buildRecentItemIds(history.map((e) => ({ itemIds: e.itemIds })));
    const nextSession = createSession(bank.questions, nextSettings, recentIds);
    setActiveSession(nextSession);
    navigate('/session');
  }

  function startSession(mode?: 'full' | 'quick' | 'weak' | 'resume') {
    if (mode === 'resume' && activeSession && !activeSession.submittedAt) {
      navigate('/session');
      return;
    }

    let nextSettings = settings;
    if (mode === 'full') {
      nextSettings = { ...settings, questionCount: 175, timed: true, timeMinutes: 210, mode: 'exam', includeDrafts: false };
    } else if (mode === 'quick') {
      nextSettings = { ...settings, questionCount: 25, timed: false, mode: 'study', includeDrafts: true };
    } else if (mode === 'weak') {
      nextSettings = { ...settings, questionCount: 30, timed: false, mode: 'study', includeDrafts: true };
    }

    const max = getAvailableQuestionCount(bank.questions, nextSettings.blueprintId, nextSettings.includeDrafts);
    nextSettings.questionCount = clampQuestionCount(nextSettings.questionCount, max);

    if (activeSession && !activeSession.submittedAt) {
      if (window.confirm('You have a session in progress. Start a new session and discard the current one?')) {
        beginNewSession(nextSettings);
      } else {
        navigate('/session');
      }
      return;
    }

    beginNewSession(nextSettings);
  }

  async function finalizeSession() {
    if (!activeSession || isFinalizing) return;
    setIsFinalizing(true);
    try {
      const unanswered = activeSession.items.length - countAnswered(activeSession);
      if (activeSession.settings.mode === 'exam') {
        const msg = unanswered > 0
          ? `Submit exam with ${unanswered} unanswered item(s)?`
          : 'Submit exam and score the results?';
        if (!window.confirm(msg)) return;
      }

      const result = scoreSession(activeSession.settings.blueprintId, activeSession.items, activeSession.answers, activeSession.settings.targetThreshold);
      const completed = { ...activeSession, submittedAt: new Date().toISOString(), result, updatedAt: new Date().toISOString() };
      const entry = toHistoryEntry(completed);

      await saveHistoryEntry(entry);
      await clearActiveSession();
      setHistory((cur) => [entry, ...cur]);
      setActiveSession(null);
      navigate(`/results/${entry.id}`);
    } finally {
      setIsFinalizing(false);
    }
  }

  async function handleClearHistory() {
    if (!window.confirm('Delete all stored session history?')) return;
    await clearHistory();
    setHistory([]);
  }

  function handleSaveFlag(flag: ItemFlag) {
    void upsertFlag(flag);
    setFlags((cur) => [flag, ...cur.filter((f) => f.item_id !== flag.item_id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }

  function handleUpdateFlag(flag: ItemFlag) {
    void upsertFlag(flag);
    setFlags((cur) => cur.map((f) => (f.id === flag.id ? flag : f)));
  }

  async function handleDeleteFlag(flagId: string) {
    await deleteFlag(flagId);
    setFlags((cur) => cur.filter((f) => f.id !== flagId));
  }

  const availableCount = getAvailableQuestionCount(bank.questions, settings.blueprintId, settings.includeDrafts);

  if (!ready) {
    return <div style={{ padding: 48, textAlign: 'center', color: 'var(--fg-muted)' }}>Loading local study data...</div>;
  }

  if (error) {
    return <div style={{ padding: 48, textAlign: 'center', color: 'var(--danger)' }}>{error}</div>;
  }

  // Disclaimer modal
  const showDisclaimer = !meta.disclaimerSeen;

  return (
    <>
      {showDisclaimer && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ textAlign: 'center' }}>
            <h2 className="modal-title">Independent study aid</h2>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--fg-muted)' }}>
              This practice app is not affiliated with or endorsed by ABTC or PSI, does not reproduce real exam items, and must not be used for
              patient-care decisions. Practice results are unofficial estimates only.
            </p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const next = { disclaimerSeen: true };
                  setMeta(next);
                  void saveMeta(next);
                }}
              >
                I understand
              </button>
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={<div style={{ padding: 48, textAlign: 'center', color: 'var(--fg-muted)' }}>Loading...</div>}>
      <Routes>
        <Route element={<AppShell />}>
          <Route
            index
            element={
              <Dashboard
                history={history}
                activeSession={activeSession}
                onStartSession={startSession}
              />
            }
          />
          <Route
            path="setup"
            element={
              <Setup
                settings={settings}
                onUpdate={updateSettings}
                onStart={() => startSession()}
                availableCount={availableCount}
              />
            }
          />
          <Route
            path="history"
            element={
              <HistoryPage
                history={history}
                flags={flags}
                onClearHistory={handleClearHistory}
              />
            }
          />
          <Route
            path="session"
            element={
              activeSession && !activeSession.submittedAt ? (
                <ExamSession
                  session={activeSession}
                  onAnswer={handleAnswer}
                  onNavigate={navigateSession}
                  onGoTo={goToQuestion}
                  onToggleBookmark={toggleBookmark}
                  onSubmit={finalizeSession}
                  isFinalizing={isFinalizing}
                />
              ) : (
                <div className="empty-state">
                  <div className="empty-state__title">No active session</div>
                  <p style={{ fontSize: 13 }}>Start a new session from the Dashboard or Setup.</p>
                </div>
              )
            }
          />
          <Route
            path="results/:id"
            element={
              <ResultsLoader history={history} />
            }
          />
          <Route
            path="review/:id"
            element={
              <SessionReview
                history={history}
                flags={flags}
                onSaveFlag={handleSaveFlag}
              />
            }
          />
          <Route
            path="reported"
            element={
              <ReportedItems
                flags={flags}
                allQuestions={allQuestions}
                onUpdateFlag={handleUpdateFlag}
                onDeleteFlag={handleDeleteFlag}
              />
            }
          />
        </Route>
      </Routes>
      </Suspense>
    </>
  );
}

function ResultsLoader({ history }: { history: HistoryEntry[] }) {
  const { id } = useParams<{ id: string }>();
  const entry = history.find((h) => h.id === id);
  if (!entry) return <div className="empty-state"><div className="empty-state__title">Result not found</div></div>;
  return <Results entry={entry} />;
}
