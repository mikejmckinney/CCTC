import { useEffect, useMemo, useRef, useState } from 'react';
import { getBlueprint, getBlueprintLabel } from '../data/blueprints';
import { loadQuestionBanks } from '../data/questionBank';
import { buildDefaultSettings, countAnswered, createSession, isBlueprintApplicable } from '../lib/sessionAssembly';
import { buildRecentItemIds } from '../lib/sessionPersistence';
import { buildDashboardInsights } from '../lib/dashboardInsights';
import { buildCategoryHistoryTrend, listHistoryCategories } from '../lib/categoryHistoryTrend';
import { buildHistoryTrend, formatTrendDelta } from '../lib/historyTrend';
import { applyTheme, persistTheme, resolveInitialTheme, type ThemePreference } from '../lib/theme';
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
  SessionItemSnapshot,
  SessionSettings,
  QuestionSet
} from '../types/exam';

type View = 'home' | 'session' | 'history' | 'history-detail' | 'flags';
type HomePanel = 'dashboard' | 'setup';

interface FlagDraft {
  existingId?: string;
  item: Question;
  sessionId: string;
  blueprint: BlueprintId;
  mode: ExamMode;
  reason: FlagReason;
  comment: string;
}

const FLAG_REASONS: FlagReason[] = [
  'factual error',
  'outdated policy/guideline',
  'ambiguous / >1 defensible answer',
  'typo / wording',
  'broken or wrong reference link',
  'other'
];

const QUESTION_MIN = 10;

function displayLetterForIndex(optionIndex: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + optionIndex);
}

function displayLetterForOptionId(optionOrder: string[], optionId: string): string {
  const optionIndex = optionOrder.indexOf(optionId);
  return optionIndex >= 0 ? displayLetterForIndex(optionIndex) : optionId;
}

function incorrectRationalesForDisplay(item: SessionItemSnapshot): Array<{ displayLetter: string; rationale: string }> {
  return item.optionOrder.flatMap((optionId, optionIndex) => {
    if (optionId === item.question.correct) {
      return [];
    }

    const rationale = item.question.explanation.rationale_incorrect?.[optionId];
    if (!rationale) {
      return [];
    }

    return [{ displayLetter: displayLetterForIndex(optionIndex), rationale }];
  });
}

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) {
    return 'Untimed';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sessionPersistFingerprint(session: ActiveSession): string {
  return JSON.stringify({
    id: session.id,
    settings: session.settings,
    items: session.items.map((item) => ({ itemId: item.itemId, optionOrder: item.optionOrder })),
    answers: session.answers,
    revealed: session.revealed,
    flaggedForReview: session.flaggedForReview,
    currentIndex: session.currentIndex,
    timerHidden: session.timerHidden,
    submittedAt: session.submittedAt
  });
}

function clampQuestionCount(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }

  return Math.min(Math.max(value, Math.min(QUESTION_MIN, max)), max);
}

function getAvailableQuestionCount(questions: Question[], blueprintId: BlueprintId, includeDrafts: boolean): number {
  const blueprint = getBlueprint(blueprintId);

  return questions.filter((question) => {
    if (!includeDrafts && question.status !== 'reviewed') {
      return false;
    }

    return isBlueprintApplicable(blueprint, question);
  }).length;
}

function updateSessionTimestamp(session: ActiveSession): ActiveSession {
  return {
    ...session,
    updatedAt: new Date().toISOString()
  };
}

function buildInitialFlagDraft(item: Question, sessionId: string, blueprint: BlueprintId, mode: ExamMode, existing?: ItemFlag): FlagDraft {
  return {
    existingId: existing?.id,
    item,
    sessionId,
    blueprint,
    mode,
    reason: existing?.reason ?? 'factual error',
    comment: existing?.comment ?? ''
  };
}

function References({ question }: { question: Question }) {
  return (
    <div className="reference-list">
      <h5>References</h5>
      <ul className="plain-list">
        {question.references.map((reference) => (
          <li key={`${reference.citation}-${reference.locator ?? ''}`} className="reference-item">
            {reference.url ? (
              <a className="reference-citation" href={reference.url} target="_blank" rel="noreferrer">
                {reference.citation}
              </a>
            ) : (
              <span className="reference-citation">{reference.citation}</span>
            )}
            {reference.locator ? <div className="reference-locator">{reference.locator}</div> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuestionReview({ item, answer }: { item: SessionItemSnapshot; answer: string | null }) {
  return (
    <article className="question-card">
      <div className="question-meta">
        <span className="badge badge--soft">{item.categoryLabel}</span>
        <span className={answer === item.question.correct ? 'badge badge--success' : 'badge badge--warning'}>
          {answer === item.question.correct ? 'Correct' : 'Review'}
        </span>
      </div>
      <h3>{item.question.stem}</h3>
      {item.question.elements && (
        <ol className="element-list">
          {item.question.elements.map((element) => (
            <li key={element.id}>
              <strong>{element.id}.</strong> {element.text}
            </li>
          ))}
        </ol>
      )}
      <div className="option-list">
        {item.optionOrder.map((optionId, optionIndex) => {
          const option = item.question.options.find((entry) => entry.id === optionId)!;
          const selected = answer === option.id;
          const correct = option.id === item.question.correct;
          return (
            <div
              key={option.id}
              className={[
                'option-button',
                correct ? 'is-correct' : '',
                selected && !correct ? 'is-incorrect' : '',
                selected ? 'is-selected' : ''
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="option-letter">{displayLetterForIndex(optionIndex)}</span>
              <span>
                {option.text}
                {option.selects && <small className="option-helper">Selects: {option.selects.join(', ')}</small>}
              </span>
            </div>
          );
        })}
      </div>
      <div className="explanation-card">
        <p>
          <strong>Correct answer ({displayLetterForOptionId(item.optionOrder, item.question.correct)}):</strong>{' '}
          {item.question.explanation.rationale_correct}
        </p>
        <ul className="plain-list">
          {incorrectRationalesForDisplay(item).map(({ displayLetter, rationale }) => (
            <li key={displayLetter}>
              <strong>{displayLetter}:</strong> {rationale}
            </li>
          ))}
        </ul>
        <References question={item.question} />
      </div>
    </article>
  );
}

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
  const [homePanel, setHomePanel] = useState<HomePanel>('dashboard');
  const [theme, setTheme] = useState<ThemePreference>(() => resolveInitialTheme());
  const [meta, setMeta] = useState<AppMeta>({ disclaimerSeen: false });
  const [settings, setSettings] = useState<SessionSettings>(() => buildDefaultSettings('cctc-from-2026-07'));
  const bank = useMemo(
    () => (settings.questionSet === 'scenario' ? banks.scenario : banks.standard),
    [banks, settings.questionSet]
  );
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const historyTrend = useMemo(() => buildHistoryTrend(history), [history]);
  const dashboardInsights = useMemo(
    () => buildDashboardInsights(history, settings.targetThreshold),
    [history, settings.targetThreshold]
  );
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
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  function toggleTheme(): void {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  function openSetupPanel(): void {
    setHomePanel('setup');
    setView('home');
  }

  function openDashboardPanel(): void {
    setHomePanel('dashboard');
    setView('home');
  }

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
    merged.questionCount = clampQuestionCount(merged.questionCount, max);
    persistSettings(merged);
  }

  function handleBlueprintChange(nextBlueprintId: BlueprintId): void {
    const blueprint = getBlueprint(nextBlueprintId);
    const includeDrafts = settings.mode === 'study' ? settings.includeDrafts : false;
    const max = getAvailableQuestionCount(bank.questions, nextBlueprintId, includeDrafts);
    persistSettings({
      ...settings,
      blueprintId: nextBlueprintId,
      questionCount: clampQuestionCount(blueprint.default_exam_items, max),
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
      questionCount: clampQuestionCount(settings.questionCount, max)
    });
  }

  function handleQuestionSetChange(nextQuestionSet: QuestionSet): void {
    const nextBank = nextQuestionSet === 'scenario' ? banks.scenario : banks.standard;
    const includeDrafts = settings.mode === 'study' ? settings.includeDrafts : false;
    const max = getAvailableQuestionCount(nextBank.questions, settings.blueprintId, includeDrafts);
    persistSettings({
      ...settings,
      questionSet: nextQuestionSet,
      questionCount: clampQuestionCount(settings.questionCount, max)
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

      <header className="app-bar" role="banner">
        <span className="app-logo">CCTC Practice Exam</span>
        <div className="app-bar__actions">
          <nav className="nav-pills" aria-label="Primary">
            <button
              className={view === 'home' && homePanel === 'dashboard' ? 'pill active' : 'pill'}
              onClick={openDashboardPanel}
            >
              Home
            </button>
            <button className={view === 'history' ? 'pill active' : 'pill'} onClick={() => setView('history')}>
              History
            </button>
            <button className={view === 'flags' ? 'pill active' : 'pill'} onClick={() => setView('flags')}>
              Flags
            </button>
            {activeSession && (
              <button className={view === 'session' ? 'pill active' : 'pill'} onClick={() => setView('session')}>
                Resume
              </button>
            )}
          </nav>
          <button
            type="button"
            className="secondary-button theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </header>

      <main id="main-content" className="main-grid">
        {view === 'home' && homePanel === 'dashboard' && (
          <>
            <section className="panel panel--span-2 stack-gap">
              <div className="dash-top">
                <div>
                  <p className="eyebrow">Study dashboard</p>
                  <h2>Your study dashboard</h2>
                  <p className="field-hint">
                    {dashboardInsights.sessionCount > 0 ? (
                      <>
                        {dashboardInsights.sessionCount} session{dashboardInsights.sessionCount === 1 ? '' : 's'} logged
                        {dashboardInsights.latestPercent !== null && (
                          <>
                            {' '}
                            · last practice <strong>{dashboardInsights.latestPercent}%</strong>
                          </>
                        )}
                        {dashboardInsights.recentDelta !== null && (
                          <> · {formatTrendDelta(dashboardInsights.recentDelta)} since prior session</>
                        )}
                      </>
                    ) : (
                      'Complete a practice session to unlock score trends and weak-area targeting.'
                    )}
                  </p>
                </div>
                <button type="button" className="primary-button" onClick={openSetupPanel}>
                  Start new session
                </button>
              </div>

              <div className="dash-grid">
                <div className="stack-gap">
                  <div className="trend-panel">
                    <div className="trend-panel__header">
                      <div>
                        <h3>Recent score trend</h3>
                        <p className="field-hint">Last {Math.min(historyTrend.points.length, 8) || 0} practice sessions</p>
                      </div>
                      {historyTrend.recentDelta !== null && historyTrend.recentDelta > 0 && (
                        <span className="trend-delta">{formatTrendDelta(historyTrend.recentDelta)}</span>
                      )}
                    </div>

                    {historyTrend.points.length === 0 ? (
                      <p className="status-card">No completed sessions yet. Your trend chart appears after your first scored run.</p>
                    ) : (
                      <>
                        <div className="trend-chart" role="img" aria-label="Recent unofficial practice score trend">
                          <div className="trend-chart__plot">
                            {historyTrend.targetThreshold !== null && (
                              <div className="trend-chart__target" style={{ bottom: `${historyTrend.targetThreshold}%` }}>
                                <span className="trend-chart__target-label">Target {historyTrend.targetThreshold}%</span>
                              </div>
                            )}
                            {historyTrend.points.slice(-8).map((point) => (
                              <div key={point.id} className="trend-chart__bar-wrap">
                                <div
                                  className={['trend-chart__bar', point.belowTarget ? 'is-below-target' : ''].filter(Boolean).join(' ')}
                                  style={{ height: `${point.percent}%` }}
                                  title={`${point.label}: ${point.percent}% (${point.mode})`}
                                />
                              </div>
                            ))}
                          </div>
                          <div className="trend-chart__labels">
                            {historyTrend.points.slice(-8).map((point) => (
                              <span key={point.id} className="trend-chart__label">
                                {point.label}
                              </span>
                            ))}
                          </div>
                        </div>

                        {dashboardInsights.weakCategories.length > 0 && (
                          <div className="stack-gap" style={{ marginTop: '1rem' }}>
                            <h3>Focus areas — below {settings.targetThreshold}%</h3>
                            <div className="weak-chips" role="list">
                              {dashboardInsights.weakCategories.map((category) => (
                                <button
                                  key={category.categoryId}
                                  type="button"
                                  className="weak-chip"
                                  role="listitem"
                                  onClick={openSetupPanel}
                                >
                                  <span>{category.categoryLabel}</span>
                                  <span className="weak-chip__pct">{category.percent}%</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {dashboardInsights.categories.length > 0 && (
                          <div className="stack-gap" style={{ marginTop: '1rem' }}>
                            <h3>Category breakdown</h3>
                            <div className="cat-bars">
                              {dashboardInsights.categories.map((category) => (
                                <div key={category.categoryId} className="cat-bar-row">
                                  <span className="field-hint">{category.categoryLabel}</span>
                                  <div className="cat-bar-track">
                                    <div
                                      className={['cat-bar-fill', category.percent < settings.targetThreshold ? 'is-weak' : ''].filter(Boolean).join(' ')}
                                      style={{ width: `${category.percent}%` }}
                                    />
                                  </div>
                                  <strong>{category.percent}%</strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {dashboardInsights.recentDelta !== null && dashboardInsights.recentDelta > 0 && (
                    <p className="motivation-note">
                      Your latest session improved by {formatTrendDelta(dashboardInsights.recentDelta)}. A shorter focused run can
                      help close weak-area gaps before your next full exam.
                    </p>
                  )}
                </div>

                <aside className="side-stack">
                  <div className="metric-row">
                    <div className="metric-tile">
                      <strong>{dashboardInsights.sessionCount}</strong>
                      <span>Sessions</span>
                    </div>
                    <div className="metric-tile">
                      <strong>{dashboardInsights.latestPercent ?? '—'}</strong>
                      <span>Latest score</span>
                    </div>
                  </div>

                  {activeSession && !activeSession.submittedAt && (
                    <div className="resume-strip stack-gap">
                      <h3>Saved session in progress</h3>
                      <p className="field-hint">
                        Item {activeSession.currentIndex + 1} of {activeSession.items.length} · {activeSession.settings.mode} mode
                      </p>
                      <button type="button" className="secondary-button" onClick={() => setView('session')}>
                        Resume session
                      </button>
                    </div>
                  )}

                  <div className="summary-card stack-gap">
                    <h3>Quick start</h3>
                    <p className="field-hint">Configure blueprint, mode, timer, and question count before you begin.</p>
                    <button type="button" className="secondary-button" onClick={openSetupPanel}>
                      Configure practice session
                    </button>
                    <button type="button" className="ghost-button" onClick={() => setView('history')}>
                      View full history
                    </button>
                  </div>

                  <p className="field-hint">Unofficial practice scores are estimates only — not ABTC or PSI results.</p>
                </aside>
              </div>
            </section>
          </>
        )}

        {view === 'home' && homePanel === 'setup' && (
          <>
            <section className="panel panel--span-2 stack-gap">
              <div className="setup-back-row">
                <button type="button" className="ghost-button" onClick={openDashboardPanel}>
                  ← Back to dashboard
                </button>
              </div>

              <div className="section-heading">
                <div>
                  <p className="eyebrow">Session setup</p>
                  <h2>Configure practice</h2>
                </div>
                <span className="badge badge--soft">
                  {settings.questionSet === 'scenario' ? 'Scenario' : 'Standard'} bank: {bank.questions.length} item(s)
                </span>
              </div>

              {bank.notes.length > 0 && (
                <div className="notice-block">
                  {bank.notes.map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </div>
              )}

              <div className="settings-grid">
                <label>
                  Blueprint version
                  <select value={settings.blueprintId} onChange={(event) => handleBlueprintChange(event.target.value as BlueprintId)}>
                    <option value="cctc-from-2026-07">2026-07 (default)</option>
                    <option value="cctc-thru-2026-06">Until 2026-06</option>
                  </select>
                </label>

                <label>
                  Question set
                  <select value={settings.questionSet} onChange={(event) => handleQuestionSetChange(event.target.value as QuestionSet)}>
                    <option value="standard">Standard bank</option>
                    <option value="scenario">Scenario companions</option>
                  </select>
                  <span className="field-hint">
                    Scenario companions are clinical vignettes paired 1:1 with the standard bank (506 target).
                  </span>
                </label>

                <label>
                  Question count
                  <input
                    type="number"
                    min={Math.min(QUESTION_MIN, Math.max(1, availableQuestionCount))}
                    max={Math.max(availableQuestionCount, 1)}
                    value={settings.questionCount}
                    onChange={(event) => updateSettings({ questionCount: Number(event.target.value) || 0 })}
                  />
                  <span className="field-hint">Available for this configuration: {availableQuestionCount}</span>
                </label>

                <label>
                  Timed session
                  <div className="toggle-row">
                    <input type="checkbox" checked={settings.timed} onChange={(event) => updateSettings({ timed: event.target.checked })} />
                    <span>{settings.timed ? 'Timer enabled' : 'Untimed session'}</span>
                  </div>
                </label>

                <label>
                  Minutes
                  <input
                    type="number"
                    min={1}
                    value={settings.timeMinutes}
                    onChange={(event) => updateSettings({ timeMinutes: Math.max(1, Number(event.target.value) || 1) })}
                    disabled={!settings.timed}
                  />
                </label>

                <label>
                  On-screen timer
                  <div className="toggle-row">
                    <input type="checkbox" checked={settings.showTimer} onChange={(event) => updateSettings({ showTimer: event.target.checked })} />
                    <span>{settings.showTimer ? 'Visible during session' : 'Hidden during session'}</span>
                  </div>
                </label>

                <label>
                  Mode
                  <select value={settings.mode} onChange={(event) => handleModeChange(event.target.value as ExamMode)}>
                    <option value="exam">Exam</option>
                    <option value="study">Study</option>
                  </select>
                </label>

                <label>
                  Include draft items
                  <div className="toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.includeDrafts}
                      onChange={(event) => updateSettings({ includeDrafts: event.target.checked })}
                      disabled={settings.mode === 'exam'}
                    />
                    <span>{settings.mode === 'exam' ? 'Exam mode defaults to reviewed-only' : 'Drafts remain visibly labeled'}</span>
                  </div>
                </label>

                <label>
                  Target threshold (%)
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={settings.targetThreshold}
                    onChange={(event) => updateSettings({ targetThreshold: Math.min(100, Math.max(1, Number(event.target.value) || 1)) })}
                  />
                  <span className="field-hint">Used for unofficial practice estimates and weak-area highlighting.</span>
                </label>
              </div>

              <div className="summary-card">
                <h3>Selected setup</h3>
                <p><strong>Blueprint:</strong> {getBlueprintLabel(settings.blueprintId)}</p>
                <p><strong>Question set:</strong> {settings.questionSet === 'scenario' ? 'Scenario companions' : 'Standard bank'}</p>
                <p><strong>Mode:</strong> {settings.mode === 'exam' ? 'Exam mode' : 'Study mode'}</p>
                <p><strong>Timer:</strong> {settings.timed ? `${settings.timeMinutes} minutes` : 'Untimed'}</p>
                <p><strong>Draft handling:</strong> {settings.includeDrafts ? 'Drafts included and labeled' : 'Reviewed items only'}</p>
                <p>
                  <strong>Weighting:</strong> {currentBlueprint.structure === 'domain_task' ? 'Current blueprint domains' : 'Legacy blueprint sections via crosswalk'}
                </p>
              </div>

              <div className="action-row">
                {activeSession && (
                  <button type="button" className="secondary-button" onClick={() => setView('session')}>
                    Resume current session
                  </button>
                )}
                {activeSession && (
                  <button type="button" className="ghost-button" onClick={discardActiveSession}>
                    Discard unfinished session
                  </button>
                )}
                <button type="button" className="primary-button" onClick={startSession}>
                  {activeSession ? 'Replace or resume session' : 'Begin session'}
                </button>
              </div>
            </section>
          </>
        )}

        {view === 'session' && session && currentItem && (
          <>
            <section className="panel panel--span-2 stack-gap">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{session.settings.mode === 'exam' ? 'Exam session' : 'Study session'}</p>
                  <h2>
                    Item {session.currentIndex + 1} of {session.items.length}
                  </h2>
                </div>
                <div className="session-stats">
                  <span className="badge">Answered {answeredCount}</span>
                  <span className="badge">Remaining {session.items.length - answeredCount}</span>
                  <span className="badge">Bookmarks {session.flaggedForReview.length}</span>
                  {session.settings.timed && (
                    <button className="pill" onClick={toggleTimerHidden}>
                      {session.timerHidden ? 'Show timer' : formatDuration(session.remainingSeconds)}
                    </button>
                  )}
                </div>
              </div>

              {(session.bankSummary.length > 0 || session.shortageNotes.length > 0) && (
                <div className="notice-block">
                  {[...session.bankSummary, ...session.shortageNotes].map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </div>
              )}

              <article className="question-card">
                <div className="question-meta">
                  <span className="badge badge--soft">{currentItem.categoryLabel}</span>
                  <span className={currentItem.question.status === 'draft' ? 'badge badge--warning' : 'badge badge--success'}>
                    {currentItem.question.status}
                  </span>
                  <span className="badge badge--soft">{currentItem.question.type === 'one_best' ? 'Single best answer' : 'Complex combo'}</span>
                </div>

                <h3>{currentItem.question.stem}</h3>

                {currentItem.question.elements && (
                  <ol className="element-list">
                    {currentItem.question.elements.map((element) => (
                      <li key={element.id}>
                        <strong>{element.id}.</strong> {element.text}
                      </li>
                    ))}
                  </ol>
                )}

                <div className="option-list" role="radiogroup" aria-label="Answer choices">
                  {currentItem.optionOrder.map((optionId, optionIndex) => {
                    const option = currentItem.question.options.find((entry) => entry.id === optionId)!;
                    const displayLetter = displayLetterForIndex(optionIndex);
                    const selected = session.answers[currentItem.itemId] === option.id;
                    const revealed = session.settings.mode === 'study' ? session.revealed[currentItem.itemId] : Boolean(session.submittedAt);
                    const correct = currentItem.question.correct === option.id;

                    return (
                      <button
                        key={option.id}
                        className={[
                          'option-button',
                          selected ? 'is-selected' : '',
                          revealed && correct ? 'is-correct' : '',
                          revealed && selected && !correct ? 'is-incorrect' : ''
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        role="radio"
                        aria-checked={selected}
                        aria-label={`${displayLetter}. ${option.text}`}
                        onClick={() => handleAnswer(option.id)}
                      >
                        <span className="option-letter">{displayLetter}</span>
                        <span>
                          {option.text}
                          {option.selects && <small className="option-helper">Selects: {option.selects.join(', ')}</small>}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {((session.settings.mode === 'study' && session.revealed[currentItem.itemId]) || session.submittedAt) && (
                  <div className="explanation-card">
                    <p>
                      <strong>Correct answer ({displayLetterForOptionId(currentItem.optionOrder, currentItem.question.correct)}):</strong>{' '}
                      {currentItem.question.explanation.rationale_correct}
                    </p>
                    <ul className="plain-list">
                      {incorrectRationalesForDisplay(currentItem).map(({ displayLetter, rationale }) => (
                        <li key={displayLetter}>
                          <strong>{displayLetter}:</strong> {rationale}
                        </li>
                      ))}
                    </ul>
                    <References question={currentItem.question} />
                  </div>
                )}
              </article>

              <div className="action-row action-row--spread session-toolbar">
                <div className="action-row">
                  <button className="secondary-button" onClick={() => navigateSession(-1)} disabled={session.currentIndex === 0}>
                    Previous
                  </button>
                  <button className="secondary-button" onClick={() => navigateSession(1)} disabled={session.currentIndex === session.items.length - 1}>
                    Next
                  </button>
                </div>
                <div className="action-row">
                  <button className="ghost-button" onClick={toggleBookmark}>
                    {session.flaggedForReview.includes(currentItem.itemId) ? 'Remove bookmark' : 'Bookmark item'}
                  </button>
                  <button className="ghost-button" onClick={() => openFlagComposer(currentItem.question, session.id, session.settings.blueprintId, session.settings.mode)}>
                    Flag this item
                  </button>
                  <button className="primary-button" onClick={() => void finalizeSession()} disabled={isFinalizing}>
                    {session.settings.mode === 'exam' ? 'Submit exam' : 'Complete session'}
                  </button>
                </div>
              </div>
            </section>

            <section className="panel stack-gap">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Session overview</p>
                  <h2>Tracking</h2>
                </div>
              </div>
              <div className="tracker-grid">
                {session.items.map((item, index) => {
                  const answered = Boolean(session.answers[item.itemId]);
                  const bookmarked = session.flaggedForReview.includes(item.itemId);
                  return (
                    <button
                      key={item.itemId}
                      className={[
                        'tracker-chip',
                        index === session.currentIndex ? 'is-current' : '',
                        answered ? 'is-answered' : '',
                        bookmarked ? 'is-bookmarked' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => mutateSession((current) => ({ ...current, currentIndex: index }))}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {view === 'history' && (
          <>
            <section className="panel panel--span-2 stack-gap">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Stored results</p>
                  <h2>History</h2>
                </div>
                <div className="action-row">
                  <button className="ghost-button" onClick={() => void handleClearHistory()} disabled={history.length === 0}>
                    Clear history
                  </button>
                </div>
              </div>

              {history.length === 0 ? (
                <p className="status-card">No completed sessions yet.</p>
              ) : (
                history.map((entry) => (
                  <article key={entry.id} className="history-card">
                    <div>
                      <h3>{getBlueprintLabel(entry.settings.blueprintId)}</h3>
                      <p>
                        {new Date(entry.completedAt).toLocaleString()} · {entry.settings.mode} · {entry.result.correct}/{entry.result.total} correct · {entry.result.percent}%
                      </p>
                      <p>
                        Unofficial practice estimate: {entry.result.estimatedPass ? 'at or above' : 'below'} your {entry.settings.targetThreshold}% target.
                      </p>
                    </div>
                    <div className="action-row action-row--column">
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setSelectedHistory(entry);
                          setReviewIndex(0);
                          setView('history-detail');
                        }}
                      >
                        Review session
                      </button>
                      <button className="ghost-button" onClick={() => void removeHistoryEntry(entry.id)}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              )}
            </section>

            <section className="panel stack-gap">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Trend snapshot</p>
                  <h2>Score trend</h2>
                </div>
              </div>

              {historyTrend.points.length === 0 ? (
                <p className="status-card">Complete a session to see your unofficial practice score trend.</p>
              ) : (
                <>
                  <div className="trend-summary" aria-label="Score trend summary">
                    <div>
                      <p className="eyebrow">Average</p>
                      <strong>{historyTrend.averagePercent}%</strong>
                    </div>
                    <div>
                      <p className="eyebrow">Best</p>
                      <strong>{historyTrend.bestPercent}%</strong>
                    </div>
                    {historyTrend.recentDelta !== null && (
                      <div>
                        <p className="eyebrow">Latest change</p>
                        <strong>{formatTrendDelta(historyTrend.recentDelta)}</strong>
                      </div>
                    )}
                  </div>

                  <div
                    className="trend-chart"
                    role="img"
                    aria-label={`Score trend across the last ${historyTrend.points.length} sessions`}
                  >
                    <div className="trend-chart__plot">
                      {historyTrend.targetThreshold !== null && (
                        <div className="trend-chart__target" style={{ bottom: `${historyTrend.targetThreshold}%` }}>
                          <span className="trend-chart__target-label">Target {historyTrend.targetThreshold}%</span>
                        </div>
                      )}
                      {historyTrend.points.map((point) => (
                        <div key={point.id} className="trend-chart__bar-wrap">
                          <div
                            className={['trend-chart__bar', point.belowTarget ? 'is-below-target' : ''].filter(Boolean).join(' ')}
                            style={{ height: `${point.percent}%` }}
                            title={`${point.label}: ${point.percent}% (${point.mode})`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="trend-chart__labels">
                      {historyTrend.points.map((point) => (
                        <span key={point.id} className="trend-chart__label">
                          {point.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <ul className="plain-list">
                    {[...historyTrend.points].reverse().slice(0, 5).map((point) => (
                      <li key={point.id} className="trend-row">
                        <span>
                          {point.label} · {point.mode}
                        </span>
                        <strong>{point.percent}%</strong>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {historyCategories.length > 0 && (
                <>
                  <div className="section-heading section-heading--compact">
                    <div>
                      <p className="eyebrow">Per-category drill-down</p>
                      <h2>Category trend</h2>
                    </div>
                  </div>
                  <p className="field-hint">Select a content category to plot your unofficial score in that area across completed sessions.</p>
                  <div className="category-pills" role="group" aria-label="Content categories">
                    {historyCategories.map((category) => (
                      <button
                        key={category.categoryId}
                        type="button"
                        className={['pill', selectedCategoryId === category.categoryId ? 'active' : ''].filter(Boolean).join(' ')}
                        aria-pressed={selectedCategoryId === category.categoryId}
                        onClick={() => setSelectedCategoryId(category.categoryId)}
                      >
                        {category.categoryLabel}
                      </button>
                    ))}
                  </div>

                  {categoryTrend ? (
                    <>
                      <div className="trend-summary" aria-label={`${categoryTrend.categoryLabel} trend summary`}>
                        <div>
                          <p className="eyebrow">Category</p>
                          <strong>{categoryTrend.categoryLabel}</strong>
                        </div>
                        <div>
                          <p className="eyebrow">Average</p>
                          <strong>{categoryTrend.averagePercent}%</strong>
                        </div>
                        <div>
                          <p className="eyebrow">Best</p>
                          <strong>{categoryTrend.bestPercent}%</strong>
                        </div>
                        {categoryTrend.recentDelta !== null && (
                          <div>
                            <p className="eyebrow">Latest change</p>
                            <strong>{formatTrendDelta(categoryTrend.recentDelta)}</strong>
                          </div>
                        )}
                      </div>

                      <div
                        className="trend-chart"
                        role="img"
                        aria-label={`${categoryTrend.categoryLabel} score trend across the last ${categoryTrend.points.length} sessions`}
                      >
                        <div className="trend-chart__plot">
                          {categoryTrend.points.map((point) => (
                            <div key={point.sessionId} className="trend-chart__bar-wrap">
                              <div
                                className={['trend-chart__bar', point.belowTarget ? 'is-below-target' : ''].filter(Boolean).join(' ')}
                                style={{ height: `${point.percent}%` }}
                                title={`${point.label}: ${point.correct}/${point.total} (${point.percent}%) · ${point.mode}`}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="trend-chart__labels">
                          {categoryTrend.points.map((point) => (
                            <span key={point.sessionId} className="trend-chart__label">
                              {point.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <ul className="plain-list">
                        {[...categoryTrend.points].reverse().slice(0, 5).map((point) => (
                          <li key={point.sessionId} className="trend-row">
                            <span>
                              {point.label} · {point.correct}/{point.total} · {point.mode}
                            </span>
                            <strong>{point.percent}%</strong>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    selectedCategoryId && <p className="status-card">No scored items in this category yet.</p>
                  )}
                </>
              )}
            </section>
          </>
        )}

        {view === 'history-detail' && selectedHistory && selectedHistoryItem && (
          <>
            <section className="panel panel--span-2 stack-gap">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Session review</p>
                  <h2>
                    {selectedHistory.result.correct}/{selectedHistory.result.total} correct · {selectedHistory.result.percent}%
                  </h2>
                </div>
                <button className="secondary-button" onClick={() => setView('history')}>
                  Back to history
                </button>
              </div>
              <p className="field-hint">Keyboard: use Left/Right arrow keys to move between items. Click a category card to open its trend chart.</p>

              <div className="notice-block">
                <p>
                  Unofficial practice estimate: {selectedHistory.result.estimatedPass ? 'at or above' : 'below'} your {selectedHistory.settings.targetThreshold}% target.
                </p>
                <p>Time used: {formatDuration(selectedHistory.timeUsedSeconds)}</p>
              </div>

              <div className="breakdown-grid">
                {selectedHistory.result.breakdown.map((entry) => (
                  <button
                    key={entry.categoryId}
                    type="button"
                    className="summary-card summary-card--interactive"
                    onClick={() => openCategoryTrend(entry.categoryId)}
                  >
                    <h3>{entry.categoryLabel}</h3>
                    <p>
                      {entry.correct} / {entry.total} correct
                    </p>
                    <span className="field-hint">View category trend</span>
                  </button>
                ))}
              </div>

              <div className="action-row action-row--spread">
                <button className="secondary-button" onClick={() => setReviewIndex((current) => Math.max(current - 1, 0))} disabled={reviewIndex === 0}>
                  Previous item
                </button>
                <button
                  className="ghost-button"
                  onClick={() => openFlagComposer(selectedHistoryItem.question, selectedHistory.id, selectedHistory.settings.blueprintId, selectedHistory.settings.mode)}
                >
                  Flag this item
                </button>
                <button
                  className="secondary-button"
                  onClick={() => setReviewIndex((current) => Math.min(current + 1, selectedHistory.items.length - 1))}
                  disabled={reviewIndex === selectedHistory.items.length - 1}
                >
                  Next item
                </button>
              </div>

              <QuestionReview item={selectedHistoryItem} answer={selectedHistory.answers[selectedHistoryItem.itemId]} />
            </section>

            <section className="panel stack-gap">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Category totals</p>
                  <h2>Breakdown</h2>
                </div>
              </div>
              <ul className="plain-list">
                {selectedHistory.result.breakdown.map((entry) => (
                  <li key={entry.categoryId}>
                    <button type="button" className="text-link-button" onClick={() => openCategoryTrend(entry.categoryId)}>
                      {entry.categoryLabel}: {entry.correct}/{entry.total}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {view === 'flags' && (
          <>
            <section className="panel panel--span-2 stack-gap">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Structured review feedback</p>
                  <h2>Flags</h2>
                </div>
                <div className="action-row">
                  <button className="secondary-button" onClick={() => void exportFlags()} disabled={flags.length === 0}>
                    Export flags
                  </button>
                  <button className="ghost-button" onClick={() => void resetFlags()} disabled={flags.length === 0}>
                    Clear all
                  </button>
                </div>
              </div>

              <p className="field-hint">
                Use <strong>Export flags</strong> to download <code>cctc-flags.json</code>, then email that file to your SME reviewer.
                Flags stay on this device only — the app never edits question files in the repository.
              </p>

              {flags.length === 0 ? (
                <p className="status-card">No open flags yet.</p>
              ) : (
                Object.entries(
                  flags.reduce<Record<string, ItemFlag[]>>((groups, flag) => {
                    groups[flag.item_id] = [...(groups[flag.item_id] ?? []), flag];
                    return groups;
                  }, {})
                ).map(([itemId, itemFlags]) => (
                  <article key={itemId} className="history-card">
                    <div>
                      <h3>{itemId}</h3>
                      {itemFlags.map((flag) => (
                        <div key={flag.id} className="flag-row">
                          <p>
                            <strong>{flag.reason}</strong> · {flag.mode} · {getBlueprintLabel(flag.blueprint)}
                          </p>
                          <p>{flag.comment || 'No comment provided.'}</p>
                        </div>
                      ))}
                    </div>
                    <div className="action-row action-row--column">
                      <button
                        className="secondary-button"
                        onClick={() => {
                          const matchedQuestion = bank.questions.find((question) => question.id === itemId);
                          if (matchedQuestion) {
                            setFlagDraft(buildInitialFlagDraft(matchedQuestion, itemFlags[0].session_id, itemFlags[0].blueprint, itemFlags[0].mode, itemFlags[0]));
                          }
                        }}
                      >
                        Edit latest
                      </button>
                      <button className="ghost-button" onClick={() => void clearFlagById(itemFlags[0].id)}>
                        Clear latest
                      </button>
                    </div>
                  </article>
                ))
              )}
            </section>

            <section className="panel stack-gap">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Export contract</p>
                  <h2>Shape</h2>
                </div>
              </div>
              <pre className="code-block">{`{
  "exportedAt": "ISO-8601",
  "flags": [{
    "item_id": "cctc-0001",
    "version": 1,
    "status": "draft",
    "reason": "typo / wording",
    "comment": "optional note",
    "session_id": "...",
    "blueprint": "cctc-from-2026-07",
    "mode": "study"
  }]
}`}</pre>
            </section>
          </>
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
