import { useEffect, useMemo, useRef, useState } from 'react';
import { getBlueprint } from '../data/blueprints';
import { loadQuestionBanks } from '../data/questionBank';
import { buildDefaultSettings, countAnswered, createSession } from '../lib/sessionAssembly';
import { buildRecentItemIds } from '../lib/sessionPersistence';
import { buildCategoryHistoryTrend, listHistoryCategories } from '../lib/categoryHistoryTrend';
import { buildHistoryTrend } from '../lib/historyTrend';
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
import type {
  ActiveSession,
  AppMeta,
  BlueprintId,
  ExamMode,
  FlagReason,
  HistoryEntry,
  ItemFlag,
  Question,
  SessionSettings,
  QuestionSet
} from '../types/exam';
import type { View, FlagDraft } from './lib/types';
import { FLAG_REASONS, QUESTION_MIN } from './lib/types';
import {
  sessionPersistFingerprint,
  clampQuestionCount,
  getAvailableQuestionCount,
  updateSessionTimestamp,
  buildInitialFlagDraft,
  downloadJson
} from './lib/helpers';
import { SessionSetup } from './components/SessionSetup';
import { SessionRunner } from './components/SessionRunner';
import { ProgressHistory } from './components/ProgressHistory';
import { HistoryDetail } from './components/HistoryDetail';
import { ReviewFeedback } from './components/ReviewFeedback';
import { Dashboard } from './components/Dashboard';

function normalizeSettings(settings: SessionSettings): SessionSettings {
  const defaults = buildDefaultSettings(settings.blueprintId);
  return {
    ...defaults,
    ...settings,
    questionSet: settings.questionSet ?? 'standard'
  };
}

function App() {
  const banks = useMemo(() => loadQuestionBanks(), []);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('home');
  const [meta, setMeta] = useState<AppMeta>({ disclaimerSeen: false });
  const [settings, setSettings] = useState<SessionSettings>(() => buildDefaultSettings('cctc-from-2026-07'));
  const bank = useMemo(
    () => (settings.questionSet === 'scenario' ? banks.scenario : banks.standard),
    [banks, settings.questionSet]
  );
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const historyTrend = useMemo(() => buildHistoryTrend(history), [history]);
  const historyCategories = useMemo(() => listHistoryCategories(history), [history]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const categoryTrend = useMemo(
    () => (selectedCategoryId ? buildCategoryHistoryTrend(history, selectedCategoryId) : null),
    [history, selectedCategoryId]
  );
  const [selectedHistory, setSelectedHistory] = useState<HistoryEntry | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [flags, setFlags] = useState<ItemFlag[]>([]);
  const [flagDraft, setFlagDraft] = useState<FlagDraft | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [sessionReplacePromptOpen, setSessionReplacePromptOpen] = useState(false);
  const [pendingSessionSettings, setPendingSessionSettings] = useState<SessionSettings | null>(null);
  const lastPersistFingerprint = useRef('');
  const activeSessionRef = useRef<ActiveSession | null>(null);

  const allQuestions = useMemo(
    () => [...banks.standard.questions, ...banks.scenario.questions],
    [banks]
  );

  useEffect(() => {
    let cancelled = false;

    bootstrapState(allQuestions)
      .then((state) => {
        if (cancelled) {
          return;
        }
        setMeta(state.meta);
        setSettings(normalizeSettings(state.settings ?? buildDefaultSettings('cctc-from-2026-07')));
        setActiveSession(state.activeSession);
        setHistory(state.history);
        setFlags(state.flags);
      })
      .catch((caughtError) => {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : 'Failed to load local app data.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [allQuestions]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    void saveSettings(settings);
  }, [ready, settings]);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    if (!ready) {
      return undefined;
    }

    if (!activeSession) {
      lastPersistFingerprint.current = '';
      void clearActiveSession();
      return undefined;
    }

    const fingerprint = sessionPersistFingerprint(activeSession);
    if (fingerprint !== lastPersistFingerprint.current) {
      lastPersistFingerprint.current = fingerprint;
      void saveActiveSession(activeSession);
    }

    return undefined;
  }, [activeSession, ready]);

  useEffect(() => {
    const flushSession = () => {
      if (activeSession) {
        void saveActiveSession(activeSession);
      }
    };

    window.addEventListener('beforeunload', flushSession);
    return () => window.removeEventListener('beforeunload', flushSession);
  }, [activeSession]);

  const timedSessionId =
    ready && activeSession && !activeSession.submittedAt && activeSession.remainingSeconds !== null
      ? activeSession.id
      : null;

  useEffect(() => {
    if (!ready || !timedSessionId) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      if (activeSessionRef.current) {
        void saveActiveSession(activeSessionRef.current);
      }
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [ready, timedSessionId]);

  useEffect(() => {
    if (!timedSessionId) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveSession((current) => {
        if (
          !current ||
          current.id !== timedSessionId ||
          current.submittedAt ||
          current.remainingSeconds === null ||
          current.remainingSeconds <= 0
        ) {
          return current;
        }

        return updateSessionTimestamp({
          ...current,
          remainingSeconds: Math.max(0, current.remainingSeconds - 1)
        });
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [timedSessionId]);

  const session = activeSession;
  const currentItem = session ? session.items[session.currentIndex] : null;
  const currentBlueprint = getBlueprint(settings.blueprintId);
  const availableQuestionCount = getAvailableQuestionCount(bank.questions, settings.blueprintId, settings.includeDrafts);
  const answeredCount = session ? countAnswered(session) : 0;
  const selectedHistoryItem = selectedHistory?.items[reviewIndex] ?? null;

  useEffect(() => {
    if (selectedCategoryId && !historyCategories.some((category) => category.categoryId === selectedCategoryId)) {
      setSelectedCategoryId(null);
    }
  }, [historyCategories, selectedCategoryId]);

  function openCategoryTrend(categoryId: string): void {
    setSelectedCategoryId(categoryId);
    setView('history');
  }

  useEffect(() => {
    if (!selectedHistory || view !== 'history-detail') {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setReviewIndex((current) => Math.max(current - 1, 0));
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault();
        setReviewIndex((current) => Math.min(current + 1, selectedHistory.items.length - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedHistory, view]);

  useEffect(() => {
    if (!session || view !== 'session') {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if (!currentItem) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateSession(-1);
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault();
        navigateSession(1);
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      const letterIndex = event.key.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
      if (letterIndex >= 0 && letterIndex < currentItem.optionOrder.length) {
        event.preventDefault();
        handleAnswer(currentItem.optionOrder[letterIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentItem, session, view]);

  function persistSettings(nextSettings: SessionSettings): void {
    setSettings(nextSettings);
    void saveSettings(nextSettings);
  }

  function updateSettings(next: Partial<SessionSettings>): void {
    const merged = { ...settings, ...next };
    const max = getAvailableQuestionCount(bank.questions, merged.blueprintId, merged.includeDrafts);
    merged.questionCount = clampQuestionCount(merged.questionCount, max, QUESTION_MIN);
    persistSettings(merged);
  }

  function handleBlueprintChange(nextBlueprintId: BlueprintId): void {
    const blueprint = getBlueprint(nextBlueprintId);
    const includeDrafts = settings.mode === 'study' ? settings.includeDrafts : false;
    const max = getAvailableQuestionCount(bank.questions, nextBlueprintId, includeDrafts);
    persistSettings({
      ...settings,
      blueprintId: nextBlueprintId,
      questionCount: clampQuestionCount(blueprint.default_exam_items, max, QUESTION_MIN),
      timeMinutes: blueprint.default_time_minutes,
      includeDrafts
    });
  }

  function handleModeChange(nextMode: ExamMode): void {
    const includeDrafts = nextMode === 'exam' ? false : true;
    const max = getAvailableQuestionCount(bank.questions, settings.blueprintId, includeDrafts);
    persistSettings({
      ...settings,
      mode: nextMode,
      includeDrafts,
      questionCount: clampQuestionCount(settings.questionCount, max, QUESTION_MIN)
    });
  }

  function handleQuestionSetChange(nextQuestionSet: QuestionSet): void {
    const nextBank = nextQuestionSet === 'scenario' ? banks.scenario : banks.standard;
    const includeDrafts = settings.mode === 'study' ? settings.includeDrafts : false;
    const max = getAvailableQuestionCount(nextBank.questions, settings.blueprintId, includeDrafts);
    persistSettings({
      ...settings,
      questionSet: nextQuestionSet,
      questionCount: clampQuestionCount(settings.questionCount, max, QUESTION_MIN)
    });
  }

  function mutateSession(mutator: (current: ActiveSession) => ActiveSession): void {
    setActiveSession((current) => {
      if (!current) {
        return current;
      }
      return updateSessionTimestamp(mutator(current));
    });
  }

  function handleAnswer(optionId: string): void {
    mutateSession((current) => ({
      ...current,
      answers: {
        ...current.answers,
        [current.items[current.currentIndex].itemId]: optionId
      },
      revealed:
        current.settings.mode === 'study'
          ? {
              ...current.revealed,
              [current.items[current.currentIndex].itemId]: true
            }
          : current.revealed
    }));
  }

  function navigateSession(direction: -1 | 1): void {
    mutateSession((current) => ({
      ...current,
      currentIndex: Math.min(Math.max(current.currentIndex + direction, 0), current.items.length - 1)
    }));
  }

  function toggleBookmark(): void {
    mutateSession((current) => {
      const itemId = current.items[current.currentIndex].itemId;
      const bookmarked = current.flaggedForReview.includes(itemId);
      return {
        ...current,
        flaggedForReview: bookmarked
          ? current.flaggedForReview.filter((value) => value !== itemId)
          : [...current.flaggedForReview, itemId]
      };
    });
  }

  function toggleTimerHidden(): void {
    mutateSession((current) => ({
      ...current,
      timerHidden: !current.timerHidden
    }));
  }

  function beginNewSession(nextSettings: SessionSettings = settings): void {
    const recentIds = buildRecentItemIds(history.map((entry) => ({ itemIds: entry.itemIds })));
    const nextSession = createSession(bank.questions, nextSettings, recentIds);
    setActiveSession(nextSession);
    setView('session');
  }

  function startSession(): void {
    let nextSettings = settings;

    if (availableQuestionCount === 0 && !settings.includeDrafts) {
      const useDrafts = window.confirm(
        'No reviewed items are available for this configuration yet. Click OK to include draft items for a bootstrap practice session.'
      );
      if (!useDrafts) {
        return;
      }
      nextSettings = { ...settings, includeDrafts: true };
      persistSettings(nextSettings);
    }

    if (activeSession && !activeSession.submittedAt) {
      setPendingSessionSettings(nextSettings);
      setSessionReplacePromptOpen(true);
      return;
    }

    beginNewSession(nextSettings);
  }

  function dismissSessionReplacePrompt(): void {
    setSessionReplacePromptOpen(false);
    setPendingSessionSettings(null);
  }

  function resumeExistingSession(): void {
    dismissSessionReplacePrompt();
    setView('session');
  }

  function replaceActiveSession(): void {
    const nextSettings = pendingSessionSettings ?? settings;
    dismissSessionReplacePrompt();
    beginNewSession(nextSettings);
  }

  function discardActiveSession(): void {
    setActiveSession(null);
    void clearActiveSession();
  }

  async function finalizeSession(): Promise<void> {
    if (!activeSession || isFinalizing) {
      return;
    }

    setIsFinalizing(true);

    try {
      const unanswered = activeSession.items.length - countAnswered(activeSession);
      if (activeSession.settings.mode === 'exam') {
        const shouldSubmit = window.confirm(
          unanswered > 0
            ? `Submit exam with ${unanswered} unanswered item(s)? There is no guessing penalty in this practice result.`
            : 'Submit exam and score the results?'
        );
        if (!shouldSubmit) {
          return;
        }
      }

      const result = scoreSession(
        activeSession.settings.blueprintId,
        activeSession.items,
        activeSession.answers,
        activeSession.settings.targetThreshold
      );
      const completedSession = updateSessionTimestamp({
        ...activeSession,
        submittedAt: new Date().toISOString(),
        result
      });
      const historyEntry = toHistoryEntry(completedSession);

      await saveHistoryEntry(historyEntry);
      await clearActiveSession();

      setHistory((current) => [historyEntry, ...current]);
      setSelectedHistory(historyEntry);
      setReviewIndex(0);
      setActiveSession(null);
      setView('history-detail');
    } finally {
      setIsFinalizing(false);
    }
  }

  function openFlagComposer(item: Question, sessionId: string, blueprint: BlueprintId, mode: ExamMode): void {
    const existing = flags.find((flag) => flag.item_id === item.id);
    setFlagDraft(buildInitialFlagDraft(item, sessionId, blueprint, mode, existing));
  }

  async function saveFlagDraft(): Promise<void> {
    if (!flagDraft) {
      return;
    }

    const existing = flags.find((flag) => flag.item_id === flagDraft.item.id);
    const timestamp = new Date().toISOString();
    const nextFlag: ItemFlag = {
      id: flagDraft.existingId ?? globalThis.crypto?.randomUUID?.() ?? `flag-${Date.now()}`,
      item_id: flagDraft.item.id,
      version: flagDraft.item.version ?? 1,
      status: flagDraft.item.status,
      reason: flagDraft.reason,
      comment: flagDraft.comment,
      session_id: flagDraft.sessionId,
      blueprint: flagDraft.blueprint,
      mode: flagDraft.mode,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    };

    await upsertFlag(nextFlag);
    setFlags((current) => [nextFlag, ...current.filter((flag) => flag.item_id !== nextFlag.item_id)].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
    setFlagDraft(null);
  }

  async function clearFlagById(flagId: string): Promise<void> {
    await deleteFlag(flagId);
    setFlags((current) => current.filter((flag) => flag.id !== flagId));
  }

  async function removeHistoryEntry(entryId: string): Promise<void> {
    await deleteHistoryEntry(entryId);
    setHistory((current) => current.filter((entry) => entry.id !== entryId));
    if (selectedHistory?.id === entryId) {
      setSelectedHistory(null);
      setView('history');
    }
  }

  async function handleClearHistory(): Promise<void> {
    if (!window.confirm('Delete all stored session history?')) {
      return;
    }
    await clearHistory();
    setHistory([]);
    setSelectedHistory(null);
    setReviewIndex(0);
  }

  async function acknowledgeDisclaimer(): Promise<void> {
    const nextMeta = { disclaimerSeen: true };
    setMeta(nextMeta);
    await saveMeta(nextMeta);
  }

  async function exportFlags(): Promise<void> {
    downloadJson('cctc-flags.json', {
      exportedAt: new Date().toISOString(),
      flags
    });
  }

  async function resetFlags(): Promise<void> {
    if (!window.confirm('Clear every stored item flag?')) {
      return;
    }
    await replaceFlags([]);
    setFlags([]);
  }

  if (!ready) {
    return (
      <div className="shell">
        <p className="status-card">Loading local study data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shell">
        <p className="status-card status-card--danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      {!meta.disclaimerSeen && (
        <section className="modal-backdrop" aria-label="Study aid disclaimer">
          <div className="modal-card">
            <h2>Independent study aid</h2>
            <p>
              This practice app is not affiliated with or endorsed by ABTC or PSI, does not reproduce real exam items, and must not be used for
              patient-care decisions. Practice results are unofficial estimates only.
            </p>
            <button className="primary-button" onClick={() => void acknowledgeDisclaimer()}>
              I understand
            </button>
          </div>
        </section>
      )}

      {sessionReplacePromptOpen && (
        <section className="modal-backdrop" aria-label="Unfinished session">
          <div className="modal-card">
            <h2>Unfinished session</h2>
            <p>
              You already have a session in progress. Resume it, or start a new session with your current setup (this discards
              in-progress answers and bookmarks).
            </p>
            <p>
              <strong>Resume your in-progress session?</strong>
            </p>
            <div className="modal-actions">
              <button className="ghost-button" onClick={dismissSessionReplacePrompt}>
                Cancel
              </button>
              <button className="secondary-button" onClick={replaceActiveSession}>
                No, start new
              </button>
              <button className="primary-button" onClick={resumeExistingSession}>
                Yes, resume
              </button>
            </div>
          </div>
        </section>
      )}

      {flagDraft && (
        <section className="modal-backdrop" aria-label="Flag this item">
          <div className="modal-card">
            <h2>Flag this item</h2>
            <label>
              Reason
              <select value={flagDraft.reason} onChange={(event) => setFlagDraft({ ...flagDraft, reason: event.target.value as FlagReason })}>
                {FLAG_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Comment
              <textarea rows={4} value={flagDraft.comment} onChange={(event) => setFlagDraft({ ...flagDraft, comment: event.target.value })} />
            </label>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setFlagDraft(null)}>
                Cancel
              </button>
              <button className="primary-button" onClick={() => void saveFlagDraft()}>
                Save flag
              </button>
            </div>
          </div>
        </section>
      )}

      <header className="hero-panel" role="banner">
        <div>
          <p className="eyebrow">CCTC practice exam</p>
          <h1>CCTC Practice Exam</h1>
        </div>
        <nav className="nav-pills" aria-label="Primary">
          <button className={view === 'home' ? 'pill active' : 'pill'} onClick={() => setView('home')}>
            Home
          </button>
          <button className={view === 'history' ? 'pill active' : 'pill'} onClick={() => setView('history')}>
            Progress
          </button>
          <button className={view === 'flags' ? 'pill active' : 'pill'} onClick={() => setView('flags')}>
            Review feedback
          </button>
          {activeSession && (
            <button className={view === 'session' ? 'pill active' : 'pill'} onClick={() => setView('session')}>
              Resume
            </button>
          )}
        </nav>
      </header>

      <main id="main-content" className="main-grid">
        {view === 'home' && (
          <>
            <Dashboard
              history={history}
              historyTrend={historyTrend}
              activeSession={activeSession}
              onStartPractice={startSession}
              onResumeSession={() => setView('session')}
              onViewHistory={() => setView('history')}
            />
            <SessionSetup
              settings={settings}
              bank={bank}
              availableQuestionCount={availableQuestionCount}
              currentBlueprint={currentBlueprint}
              handleBlueprintChange={handleBlueprintChange}
              handleQuestionSetChange={handleQuestionSetChange}
              updateSettings={updateSettings}
              handleModeChange={handleModeChange}
              startSession={startSession}
              activeSession={activeSession}
              discardActiveSession={discardActiveSession}
              setView={setView}
              questionMin={QUESTION_MIN}
            />
          </>
        )}

        {view === 'session' && session && currentItem && (
          <SessionRunner
            session={session}
            currentItem={currentItem}
            answeredCount={answeredCount}
            handleAnswer={handleAnswer}
            navigateSession={navigateSession}
            toggleBookmark={toggleBookmark}
            toggleTimerHidden={toggleTimerHidden}
            openFlagComposer={() => openFlagComposer(currentItem.question, session.id, session.settings.blueprintId, session.settings.mode)}
            finalizeSession={finalizeSession}
            isFinalizing={isFinalizing}
            mutateSession={mutateSession}
          />
        )}

        {view === 'history' && (
          <ProgressHistory
            history={history}
            historyTrend={historyTrend}
            historyCategories={historyCategories}
            selectedCategoryId={selectedCategoryId}
            setSelectedCategoryId={setSelectedCategoryId}
            categoryTrend={categoryTrend}
            setSelectedHistory={setSelectedHistory}
            setReviewIndex={setReviewIndex}
            setView={setView}
            handleClearHistory={handleClearHistory}
            removeHistoryEntry={removeHistoryEntry}
          />
        )}

        {view === 'history-detail' && selectedHistory && (
          <HistoryDetail
            selectedHistory={selectedHistory}
            reviewIndex={reviewIndex}
            setReviewIndex={setReviewIndex}
            setView={setView}
            openCategoryTrend={openCategoryTrend}
            openFlagComposer={openFlagComposer}
          />
        )}

        {view === 'flags' && (
          <ReviewFeedback
            flags={flags}
            exportFlags={exportFlags}
            resetFlags={resetFlags}
            setFlagDraft={setFlagDraft}
            clearFlagById={clearFlagById}
            bankQuestions={bank.questions}
          />
        )}
      </main>

      <footer className="footer-bar">
        <p>
          This practice app is an independent study aid, not affiliated with or endorsed by ABTC or PSI, does not reproduce real exam questions, and is
          not a source of patient-care decisions.
        </p>
      </footer>
    </div>
  );
}

export default App;
