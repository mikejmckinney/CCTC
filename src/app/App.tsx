import { useEffect, useMemo, useRef, useState } from 'react';
import { getBlueprint, getBlueprintLabel } from '../data/blueprints';
import { loadQuestionBanks } from '../data/questionBank';
import { buildDefaultSettings, countAnswered, createSession, isBlueprintApplicable } from '../lib/sessionAssembly';
import { buildRecentItemIds } from '../lib/sessionPersistence';
import { buildDashboardInsights, computeImprovementStreak, weakestCategoryLabel } from '../lib/dashboardInsights';
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
import type { CategoryPerformance } from '../lib/dashboardInsights';

type View = 'home' | 'session' | 'score' | 'history' | 'history-detail' | 'flags';
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

function findFirstMissedIndex(entry: HistoryEntry): number {
  return entry.items.findIndex((item) => entry.answers[item.itemId] !== item.question.correct);
}

function formatShortDate(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatRelativeTime(isoTimestamp: string): string {
  const deltaMs = Date.now() - new Date(isoTimestamp).getTime();
  const minutes = Math.floor(deltaMs / 60000);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

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
  const isCorrect = answer === item.question.correct;

  return (
    <article className="stack-gap">
      <p className="item-meta">
        <span className="num">{item.question.id}</span> · {item.categoryLabel}
      </p>
      <p className="question-stem">{item.question.stem}</p>

      {item.question.elements && (
        <div className="combo-panel">
          <ol className="element-list">
            {item.question.elements.map((element) => (
              <li key={element.id}>
                <span className="combo-tag">{element.id}</span>
                {element.text}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="option-list" aria-label="Answer choices">
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

      <div className="explanation-panel" role="region" aria-label="Explanation">
        <h4>
          {isCorrect ? 'Correct' : 'Review'} — {displayLetterForOptionId(item.optionOrder, item.question.correct)}
        </h4>
        <p>{item.question.explanation.rationale_correct}</p>
        {incorrectRationalesForDisplay(item).length > 0 && (
          <ul className="plain-list">
            {incorrectRationalesForDisplay(item).map(({ displayLetter, rationale }) => (
              <li key={displayLetter}>
                <strong>{displayLetter}:</strong> {rationale}
              </li>
            ))}
          </ul>
        )}
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
  const improvementStreak = useMemo(() => computeImprovementStreak(history), [history]);
  const recentHistoryPoints = useMemo(() => historyTrend.points.slice(-8), [historyTrend.points]);
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
  const [sessionNavigatorOpen, setSessionNavigatorOpen] = useState(false);
  const [submitPromptOpen, setSubmitPromptOpen] = useState(false);
  const [setupSuggestion, setSetupSuggestion] = useState<string | null>(null);
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
    setSetupSuggestion(null);
    setHomePanel('setup');
    setView('home');
  }

  function openWeakAreaQuickStart(category: CategoryPerformance): void {
    const max = getAvailableQuestionCount(bank.questions, settings.blueprintId, settings.includeDrafts);
    const nextCount = clampQuestionCount(25, max);
    persistSettings({ ...settings, questionCount: nextCount });
    setSetupSuggestion(`Suggested: ${nextCount}-item run — prioritize ${category.categoryLabel} during review.`);
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
  const sessionUnansweredCount = session ? session.items.length - answeredCount : 0;
  const sessionFlaggedCount = session?.flaggedForReview.length ?? 0;

  useEffect(() => {
    if (view !== 'session') {
      setSessionNavigatorOpen(false);
      setSubmitPromptOpen(false);
    }
  }, [view]);

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

  function requestSubmit(): void {
    if (!activeSession || isFinalizing) {
      return;
    }
    setSubmitPromptOpen(true);
  }

  async function confirmSubmit(): Promise<void> {
    if (!activeSession || isFinalizing) {
      return;
    }

    setSubmitPromptOpen(false);
    setIsFinalizing(true);

    try {
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
      setSessionNavigatorOpen(false);
      setView('score');
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

      {sessionReplacePromptOpen && activeSession && (
        <section className="modal-backdrop" aria-label="Resume saved session">
          <div className="modal-card resume-card" role="dialog" aria-modal="true" aria-labelledby="resume-session-title">
            <h2 id="resume-session-title">Resume saved session?</h2>
            <p className="field-hint">
              Your answers are saved after each question. Pick up where you left off or start fresh with your current setup.
            </p>
            <dl className="detail-list">
              <dt>Progress</dt>
              <dd className="num">
                {countAnswered(activeSession)} / {activeSession.items.length} answered
              </dd>
              <dt>Mode</dt>
              <dd>
                {activeSession.settings.mode === 'exam' ? 'Exam' : 'Study'}
                {activeSession.settings.timed ? ' · Timed' : ' · Untimed'}
              </dd>
              {activeSession.settings.timed && activeSession.remainingSeconds !== null && (
                <>
                  <dt>Time remaining</dt>
                  <dd className="num">{formatDuration(activeSession.remainingSeconds)}</dd>
                </>
              )}
              <dt>Blueprint</dt>
              <dd>{getBlueprintLabel(activeSession.settings.blueprintId)}</dd>
              <dt>Last saved</dt>
              <dd>{formatRelativeTime(activeSession.updatedAt)}</dd>
            </dl>
            <div className="modal-actions">
              <button className="ghost-button" onClick={dismissSessionReplacePrompt}>
                Cancel
              </button>
              <button className="secondary-button" onClick={replaceActiveSession}>
                Discard &amp; start new
              </button>
              <button className="primary-button" onClick={resumeExistingSession}>
                Resume session
              </button>
            </div>
          </div>
        </section>
      )}

      {submitPromptOpen && session && (
        <section className="modal-backdrop" role="presentation">
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-session-title"
          >
            <h2 id="submit-session-title">
              {session.settings.mode === 'exam' ? 'Submit practice exam?' : 'Complete study session?'}
            </h2>
            <p>
              {sessionUnansweredCount > 0 || sessionFlaggedCount > 0 ? (
                <>
                  You have{' '}
                  {sessionUnansweredCount > 0 && (
                    <>
                      <strong className="num">{sessionUnansweredCount}</strong> unanswered item
                      {sessionUnansweredCount === 1 ? '' : 's'}
                    </>
                  )}
                  {sessionUnansweredCount > 0 && sessionFlaggedCount > 0 ? ' and ' : ''}
                  {sessionFlaggedCount > 0 && (
                    <>
                      <strong className="num">{sessionFlaggedCount}</strong> bookmarked for review
                    </>
                  )}
                  . You can return to the navigator or submit now.
                </>
              ) : (
                'All items are answered. Submit to score this unofficial practice run.'
              )}
            </p>
            {(sessionUnansweredCount > 0 || sessionFlaggedCount > 0) && (
              <ul className="submit-summary-list">
                {sessionUnansweredCount > 0 && (
                  <li>
                    Unanswered:{' '}
                    {session.items
                      .map((item, index) => (session.answers[item.itemId] ? -1 : index + 1))
                      .filter((value) => value > 0)
                      .join(', ')}
                  </li>
                )}
                {sessionFlaggedCount > 0 && (
                  <li>
                    Bookmarked:{' '}
                    {session.items
                      .map((item, index) => (session.flaggedForReview.includes(item.itemId) ? index + 1 : -1))
                      .filter((value) => value > 0)
                      .join(', ')}
                  </li>
                )}
              </ul>
            )}
            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => {
                  setSubmitPromptOpen(false);
                  setSessionNavigatorOpen(true);
                }}
              >
                Review navigator
              </button>
              <button className="ghost-button" onClick={() => setSubmitPromptOpen(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={() => void confirmSubmit()} disabled={isFinalizing}>
                {session.settings.mode === 'exam' ? 'Submit answers' : 'Complete session'}
              </button>
            </div>
          </div>
        </section>
      )}

      {flagDraft && (
        <section className="modal-backdrop" aria-label="Flag this item">
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="flag-item-title">
            <h2 id="flag-item-title">
              Flag item <span className="num">{flagDraft.item.id}</span>
            </h2>
            <p className="field-hint">Help improve the question bank. Flags can be exported for SME review.</p>
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                void saveFlagDraft();
              }}
            >
              <fieldset className="field">
                <legend>Reason</legend>
                <div className="radio-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  {FLAG_REASONS.map((reason) => (
                    <label key={reason} className="pill-opt pill-opt--stack">
                      <input
                        type="radio"
                        name="flag-reason"
                        value={reason}
                        checked={flagDraft.reason === reason}
                        onChange={() => setFlagDraft({ ...flagDraft, reason })}
                      />
                      {reason}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="field">
                Optional note
                <textarea
                  rows={4}
                  placeholder="Describe the issue for reviewers…"
                  value={flagDraft.comment}
                  onChange={(event) => setFlagDraft({ ...flagDraft, comment: event.target.value })}
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setFlagDraft(null)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Save flag
                </button>
              </div>
            </form>
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

      <main id="main-content" className="main-grid main-grid--single">
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
                                  onClick={() => openWeakAreaQuickStart(category)}
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
                                  <span className="label">{category.categoryLabel}</span>
                                  <div className="cat-bar-track">
                                    <div
                                      className={['cat-bar-fill', category.percent < settings.targetThreshold ? 'is-weak' : ''].filter(Boolean).join(' ')}
                                      style={{ width: `${category.percent}%` }}
                                    />
                                  </div>
                                  <span className="score num">{category.percent}%</span>
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
                      <strong className="num">{dashboardInsights.sessionCount}</strong>
                      <span>Sessions</span>
                    </div>
                    <div className="metric-tile">
                      <strong className="num">{dashboardInsights.latestPercent ?? '—'}{dashboardInsights.latestPercent !== null ? '%' : ''}</strong>
                      <span>Latest score</span>
                    </div>
                  </div>

                  {activeSession && !activeSession.submittedAt && (
                    <div className="resume-strip stack-gap">
                      <h3>Saved session in progress</h3>
                      <p className="field-hint">
                        Saved {formatRelativeTime(activeSession.updatedAt)} · item{' '}
                        <span className="num">{activeSession.currentIndex + 1}</span> of{' '}
                        <span className="num">{activeSession.items.length}</span> · {activeSession.settings.mode} mode
                      </p>
                      <button type="button" className="secondary-button" onClick={() => setView('session')}>
                        Resume session
                      </button>
                    </div>
                  )}

                  <div className="summary-card stack-gap">
                    <h3>Quick start</h3>
                    <p className="field-hint">
                      {dashboardInsights.weakCategories.length > 0
                        ? 'Target a weak domain with a shorter run.'
                        : 'Configure blueprint, mode, timer, and question count before you begin.'}
                    </p>
                    {dashboardInsights.weakCategories.length > 0 ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => openWeakAreaQuickStart(dashboardInsights.weakCategories[0])}
                      >
                        25 items · {dashboardInsights.weakCategories[0].categoryLabel}
                      </button>
                    ) : (
                      <button type="button" className="secondary-button" onClick={openSetupPanel}>
                        Configure practice session
                      </button>
                    )}
                    <button type="button" className="ghost-button" onClick={() => setView('history')}>
                      View full history →
                    </button>
                  </div>

                  <p className="disclaimer-inline">Unofficial practice scores are estimates only — not ABTC or PSI results.</p>
                </aside>
              </div>
            </section>
          </>
        )}

        {view === 'home' && homePanel === 'setup' && (
          <section className="panel panel--span-2">
            <div className="session-shell">
              <header className="session-bar session-bar--minimal">
                <button type="button" className="ghost-button" onClick={openDashboardPanel}>
                  ← Back
                </button>
                <span className="item-meta">New session</span>
              </header>

              <div className="session-body">
                <h2>Configure practice</h2>
                {setupSuggestion ? (
                  <p className="setup-hint">{setupSuggestion}</p>
                ) : (
                  <p className="setup-hint">
                    {dashboardInsights.weakCategories.length > 0
                      ? `Suggested: shorter run in ${dashboardInsights.weakCategories[0].categoryLabel} based on your dashboard weak areas.`
                      : 'Choose blueprint, mode, timer, and question count before you begin.'}
                  </p>
                )}

                {bank.notes.length > 0 && (
                  <div className="notice-block">
                    {bank.notes.map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </div>
                )}

                <form
                  className="setup-card form-grid"
                  aria-label="Session setup"
                  onSubmit={(event) => {
                    event.preventDefault();
                    startSession();
                  }}
                >
                  <fieldset className="field">
                    <legend>Blueprint version</legend>
                    <div className="radio-row">
                      <label className="pill-opt">
                        <input
                          type="radio"
                          name="blueprint"
                          checked={settings.blueprintId === 'cctc-from-2026-07'}
                          onChange={() => handleBlueprintChange('cctc-from-2026-07')}
                        />
                        Current (effective 2026-07-01)
                      </label>
                      <label className="pill-opt">
                        <input
                          type="radio"
                          name="blueprint"
                          checked={settings.blueprintId === 'cctc-thru-2026-06'}
                          onChange={() => handleBlueprintChange('cctc-thru-2026-06')}
                        />
                        Legacy (until 2026-06-30)
                      </label>
                    </div>
                  </fieldset>

                  <label className="field">
                    Question set
                    <select value={settings.questionSet} onChange={(event) => handleQuestionSetChange(event.target.value as QuestionSet)}>
                      <option value="standard">Standard bank</option>
                      <option value="scenario">Scenario companions</option>
                    </select>
                    <span className="field-hint">
                      {settings.questionSet === 'scenario' ? 'Scenario' : 'Standard'} bank: {bank.questions.length} item(s). Scenario
                      companions are clinical vignettes paired 1:1 with the standard bank.
                    </span>
                  </label>

                  <fieldset className="field">
                    <legend>Mode</legend>
                    <div className="radio-row">
                      <label className="pill-opt">
                        <input
                          type="radio"
                          name="mode"
                          checked={settings.mode === 'study'}
                          onChange={() => handleModeChange('study')}
                        />
                        Study — explanations after each answer
                      </label>
                      <label className="pill-opt">
                        <input
                          type="radio"
                          name="mode"
                          checked={settings.mode === 'exam'}
                          onChange={() => handleModeChange('exam')}
                        />
                        Exam — results after submit
                      </label>
                    </div>
                  </fieldset>

                  <label className="field">
                    Question count
                    <input
                      type="number"
                      min={Math.min(QUESTION_MIN, Math.max(1, availableQuestionCount))}
                      max={Math.max(availableQuestionCount, 1)}
                      value={settings.questionCount}
                      onChange={(event) => updateSettings({ questionCount: Number(event.target.value) || 0 })}
                    />
                    <span className="field-hint">
                      Real exam uses 175 items; shorter runs for focused review. Available for this configuration:{' '}
                      {availableQuestionCount}
                    </span>
                  </label>

                  <fieldset className="field">
                    <legend>Timer</legend>
                    <div className="radio-row">
                      <label className="pill-opt">
                        <input
                          type="radio"
                          name="timer"
                          checked={settings.timed}
                          onChange={() => updateSettings({ timed: true })}
                        />
                        Timed — {settings.timeMinutes} min default
                      </label>
                      <label className="pill-opt">
                        <input type="radio" name="timer" checked={!settings.timed} onChange={() => updateSettings({ timed: false })} />
                        Untimed
                      </label>
                    </div>
                  </fieldset>

                  {settings.timed && (
                    <label className="field">
                      Minutes
                      <input
                        type="number"
                        min={1}
                        value={settings.timeMinutes}
                        onChange={(event) => updateSettings({ timeMinutes: Math.max(1, Number(event.target.value) || 1) })}
                      />
                    </label>
                  )}

                  <label className="field">
                    <span>On-screen timer</span>
                    <div className="check-row">
                      <label className="pill-opt">
                        <input
                          type="checkbox"
                          checked={settings.showTimer}
                          onChange={(event) => updateSettings({ showTimer: event.target.checked })}
                        />
                        {settings.showTimer ? 'Visible during session' : 'Hidden during session'}
                      </label>
                    </div>
                  </label>

                  <label className="field">
                    <span>Include draft items</span>
                    <div className="check-row">
                      <label className="pill-opt">
                        <input
                          type="checkbox"
                          checked={settings.includeDrafts}
                          onChange={(event) => updateSettings({ includeDrafts: event.target.checked })}
                          disabled={settings.mode === 'exam'}
                        />
                        {settings.mode === 'exam' ? 'Exam mode defaults to reviewed-only' : 'Drafts remain visibly labeled'}
                      </label>
                    </div>
                  </label>

                  <label className="field">
                    Target threshold (%)
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={settings.targetThreshold}
                      onChange={(event) =>
                        updateSettings({ targetThreshold: Math.min(100, Math.max(1, Number(event.target.value) || 1)) })
                      }
                    />
                    <span className="field-hint">Used for unofficial practice estimates and weak-area highlighting.</span>
                  </label>

                  <div className="summary-card stack-gap">
                    <h3>Selected setup</h3>
                    <p>
                      <strong>Blueprint:</strong> {getBlueprintLabel(settings.blueprintId)}
                    </p>
                    <p>
                      <strong>Question set:</strong> {settings.questionSet === 'scenario' ? 'Scenario companions' : 'Standard bank'}
                    </p>
                    <p>
                      <strong>Mode:</strong> {settings.mode === 'exam' ? 'Exam mode' : 'Study mode'}
                    </p>
                    <p>
                      <strong>Timer:</strong> {settings.timed ? `${settings.timeMinutes} minutes` : 'Untimed'}
                    </p>
                    <p>
                      <strong>Draft handling:</strong> {settings.includeDrafts ? 'Drafts included and labeled' : 'Reviewed items only'}
                    </p>
                    <p>
                      <strong>Weighting:</strong>{' '}
                      {currentBlueprint.structure === 'domain_task' ? 'Current blueprint domains' : 'Legacy blueprint sections via crosswalk'}
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
                    <button type="submit" className="primary-button">
                      {activeSession ? 'Replace or begin session' : 'Begin session'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>
        )}

        {view === 'session' && session && (
          <section className="panel panel--span-2">
            <div className="session-shell">
              <header className="session-bar session-bar--minimal">
                {sessionNavigatorOpen ? (
                  <>
                    <button type="button" className="ghost-button" onClick={() => setSessionNavigatorOpen(false)}>
                      ← Return to question
                    </button>
                    <span className="item-meta">Navigator</span>
                  </>
                ) : (
                  <>
                    <div className="session-chips">
                      <span className="chip">{session.settings.mode === 'exam' ? 'Exam' : 'Study'}</span>
                      <span className="chip chip--muted">
                        Item <span className="num">{session.currentIndex + 1}</span> of{' '}
                        <span className="num">{session.items.length}</span>
                      </span>
                      {sessionFlaggedCount > 0 && (
                        <span className="chip chip--muted">
                          <span className="num">{sessionFlaggedCount}</span> bookmarked
                        </span>
                      )}
                    </div>
                    {session.settings.timed && (
                      <button type="button" className="ghost-button num" onClick={toggleTimerHidden}>
                        {session.timerHidden ? 'Show timer' : formatDuration(session.remainingSeconds)}
                      </button>
                    )}
                  </>
                )}
              </header>

              {(session.bankSummary.length > 0 || session.shortageNotes.length > 0) && !sessionNavigatorOpen && (
                <div className="notice-block">
                  {[...session.bankSummary, ...session.shortageNotes].map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </div>
              )}

              {sessionNavigatorOpen ? (
                <div className="session-body">
                  <h2>Jump to item</h2>
                  <p className="field-hint">
                    <span className="num">{sessionUnansweredCount}</span> unanswered ·{' '}
                    <span className="num">{sessionFlaggedCount}</span> bookmarked
                  </p>
                  <div className="nav-grid" role="group" aria-label="Question grid">
                    {session.items.map((item, index) => {
                      const answered = Boolean(session.answers[item.itemId]);
                      const bookmarked = session.flaggedForReview.includes(item.itemId);
                      return (
                        <button
                          key={item.itemId}
                          type="button"
                          className={[
                            'nav-cell',
                            index === session.currentIndex ? 'is-current' : '',
                            bookmarked ? 'is-flagged' : '',
                            !answered ? 'is-unanswered' : ''
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          aria-current={index === session.currentIndex ? 'true' : undefined}
                          aria-label={`Item ${index + 1}${bookmarked ? ', bookmarked' : ''}${!answered ? ', unanswered' : ''}`}
                          onClick={() => {
                            mutateSession((current) => ({ ...current, currentIndex: index }));
                            setSessionNavigatorOpen(false);
                          }}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>
                  <div className="nav-legend">
                    <span>
                      <span className="legend-dot" style={{ background: 'var(--brand)' }} />
                      Current
                    </span>
                    <span>
                      <span
                        className="legend-dot"
                        style={{ border: '2px dashed var(--accent)', background: 'transparent' }}
                      />
                      Unanswered
                    </span>
                    <span>
                      <span className="legend-dot" style={{ background: 'var(--warning)' }} />
                      Bookmarked
                    </span>
                  </div>
                  <div className="action-row" style={{ marginTop: '1.5rem' }}>
                    <button type="button" className="primary-button" onClick={requestSubmit} disabled={isFinalizing}>
                      {session.settings.mode === 'exam' ? 'Submit exam' : 'Complete session'}
                    </button>
                  </div>
                </div>
              ) : (
                currentItem && (
                  <div className="session-body session-body--focus">
                    <p className="item-meta">
                      <span className="num">{currentItem.question.id}</span> · {currentItem.categoryLabel}
                      {currentItem.question.status === 'draft' ? ' · draft' : ''}
                    </p>

                    <p className="question-stem">{currentItem.question.stem}</p>

                    {currentItem.question.elements && (
                      <div className="combo-panel">
                        <ol className="element-list">
                          {currentItem.question.elements.map((element) => (
                            <li key={element.id}>
                              <span className="combo-tag">{element.id}</span>
                              {element.text}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {currentItem.question.type !== 'one_best' && (
                      <p className="select-all-note">Select the one answer that identifies all correct statements.</p>
                    )}

                    <div className="option-list" role="radiogroup" aria-label="Answer choices">
                      {currentItem.optionOrder.map((optionId, optionIndex) => {
                        const option = currentItem.question.options.find((entry) => entry.id === optionId)!;
                        const displayLetter = displayLetterForIndex(optionIndex);
                        const selected = session.answers[currentItem.itemId] === option.id;
                        const revealed =
                          session.settings.mode === 'study' ? session.revealed[currentItem.itemId] : Boolean(session.submittedAt);
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
                      <div className="explanation-panel" role="region" aria-label="Explanation">
                        <h4>
                          Correct — {displayLetterForOptionId(currentItem.optionOrder, currentItem.question.correct)}
                        </h4>
                        <p>{currentItem.question.explanation.rationale_correct}</p>
                        {incorrectRationalesForDisplay(currentItem).length > 0 && (
                          <ul className="plain-list">
                            {incorrectRationalesForDisplay(currentItem).map(({ displayLetter, rationale }) => (
                              <li key={displayLetter}>
                                <strong>{displayLetter}:</strong> {rationale}
                              </li>
                            ))}
                          </ul>
                        )}
                        <References question={currentItem.question} />
                      </div>
                    )}

                    <div className="session-toolbar">
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() =>
                          openFlagComposer(currentItem.question, session.id, session.settings.blueprintId, session.settings.mode)
                        }
                      >
                        Flag item
                      </button>
                      <div className="session-toolbar__group">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => navigateSession(-1)}
                          disabled={session.currentIndex === 0}
                        >
                          Back
                        </button>
                        {session.settings.mode === 'exam' && (
                          <button type="button" className="ghost-button" onClick={() => setSessionNavigatorOpen(true)}>
                            Navigator
                          </button>
                        )}
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={toggleBookmark}
                        >
                          {session.flaggedForReview.includes(currentItem.itemId) ? 'Remove bookmark' : 'Bookmark'}
                        </button>
                        {session.currentIndex === session.items.length - 1 ? (
                          <button type="button" className="primary-button" onClick={requestSubmit} disabled={isFinalizing}>
                            {session.settings.mode === 'exam' ? 'Submit exam' : 'Complete session'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => navigateSession(1)}
                          >
                            Next
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {view === 'score' && selectedHistory && (
          <section className="panel panel--span-2">
            <div className="session-shell">
              <header className="session-bar">
                <span className="app-logo">Session complete</span>
                <button type="button" className="secondary-button" onClick={() => setView('history')}>
                  View history
                </button>
              </header>
              <div className="session-body stack-gap">
                <div className="score-hero">
                  <p className="item-meta">Practice estimate</p>
                  <div className="score-hero__value num">{selectedHistory.result.percent}%</div>
                  <p className="score-hero__disclaimer">
                    This score is an unofficial practice estimate — not an ABTC or PSI exam result.
                  </p>
                  <p className="field-hint">
                    {selectedHistory.result.correct}/{selectedHistory.result.total} correct ·{' '}
                    {selectedHistory.result.estimatedPass ? 'at or above' : 'below'} your {selectedHistory.settings.targetThreshold}%
                    target
                  </p>
                </div>

                <h3>Category breakdown</h3>
                <table className="cat-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th className="cat-table__bar">Performance</th>
                      <th className="num">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedHistory.result.breakdown.map((entry) => {
                      const percent = entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0;
                      const isWeak = percent < selectedHistory.settings.targetThreshold;
                      return (
                        <tr key={entry.categoryId}>
                          <td>{entry.categoryLabel}</td>
                          <td className="cat-table__bar">
                            <div className="performance-bar" aria-hidden="true">
                              <span className={isWeak ? 'is-weak' : ''} style={{ width: `${percent}%` }} />
                            </div>
                          </td>
                          <td className="num">{percent}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="action-row">
                  <button type="button" className="primary-button" onClick={openSetupPanel}>
                    Start new session
                  </button>
                  {findFirstMissedIndex(selectedHistory) >= 0 && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setReviewIndex(findFirstMissedIndex(selectedHistory));
                        setView('history-detail');
                      }}
                    >
                      Review missed items
                    </button>
                  )}
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      setReviewIndex(0);
                      setView('history-detail');
                    }}
                  >
                    Review all items
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {view === 'history' && (
          <section className="panel panel--span-2 stack-gap">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Score history</p>
                <h2>Last {recentHistoryPoints.length || 0} sessions</h2>
              </div>
              <div className="action-row">
                <button type="button" className="ghost-button" onClick={openDashboardPanel}>
                  ← Home
                </button>
                <button className="ghost-button" onClick={() => void handleClearHistory()} disabled={history.length === 0}>
                  Clear history
                </button>
              </div>
            </div>

            {history.length === 0 ? (
              <p className="status-card">No completed sessions yet.</p>
            ) : (
              <div className="history-layout">
                <div className="stack-gap">
                  <p className="field-hint">Tap a session bar for review, or use the table below.</p>

                  {recentHistoryPoints.length > 0 && (
                    <div
                      className="history-chart"
                      role="img"
                      aria-label={`Score trend across the last ${recentHistoryPoints.length} sessions`}
                    >
                      {recentHistoryPoints.map((point) => (
                        <button
                          key={point.id}
                          type="button"
                          className={['history-bar', selectedHistory?.id === point.id ? 'is-active' : ''].filter(Boolean).join(' ')}
                          style={{ height: `${Math.max(point.percent, 8)}%` }}
                          title={`${point.label}: ${point.percent}% (${point.mode})`}
                          onClick={() => {
                            const entry = history.find((candidate) => candidate.id === point.id);
                            if (entry) {
                              setSelectedHistory(entry);
                              setReviewIndex(0);
                              setView('history-detail');
                            }
                          }}
                        >
                          <span>{point.percent}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {improvementStreak > 0 && (
                    <p className="motivation-note">
                      You&apos;re on a <span className="num">{improvementStreak}</span>-session improvement streak. Keep momentum
                      with a targeted weak-area run.
                    </p>
                  )}

                  <table className="cat-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Mode</th>
                        <th className="num">Items</th>
                        <th className="num">Score</th>
                        <th>Weakest</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((entry) => (
                        <tr key={entry.id}>
                          <td>{formatShortDate(entry.completedAt)}</td>
                          <td>{entry.settings.mode === 'exam' ? 'Exam' : 'Study'}</td>
                          <td className="num">{entry.result.total}</td>
                          <td className="num">{entry.result.percent}%</td>
                          <td>{weakestCategoryLabel(entry)}</td>
                          <td>
                            <div className="action-row">
                              <button
                                type="button"
                                className="ghost-button"
                                onClick={() => {
                                  setSelectedHistory(entry);
                                  setReviewIndex(0);
                                  setView('history-detail');
                                }}
                              >
                                Review
                              </button>
                              <button type="button" className="ghost-button" onClick={() => void removeHistoryEntry(entry.id)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <aside className="stack-gap">
                  <div className="streak-card">
                    <strong className="num">{improvementStreak}</strong>
                    <p>
                      {improvementStreak > 0
                        ? 'Sessions trending up — keep the momentum with a targeted weak-area run.'
                        : 'Complete more sessions to track improvement streaks.'}
                    </p>
                  </div>

                  {dashboardInsights.categories.length > 0 && (
                    <div className="summary-card stack-gap">
                      <h3>Domain drill-down</h3>
                      <div className="cat-bars">
                        {dashboardInsights.categories.map((category) => {
                          const isWeak = category.percent < settings.targetThreshold;
                          return (
                            <div key={category.categoryId} className="cat-bar-row">
                              <span className="label">{category.categoryLabel}</span>
                              <div className="cat-bar-track">
                                <div
                                  className={['cat-bar-fill', isWeak ? 'is-weak' : ''].filter(Boolean).join(' ')}
                                  style={{ width: `${category.percent}%` }}
                                />
                              </div>
                              <span className="score num">{category.percent}%</span>
                            </div>
                          );
                        })}
                      </div>
                      {dashboardInsights.weakCategories.length > 0 && (
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ width: '100%' }}
                          onClick={() => setSelectedCategoryId(dashboardInsights.weakCategories[0].categoryId)}
                        >
                          Focus {dashboardInsights.weakCategories[0].categoryLabel}
                        </button>
                      )}
                    </div>
                  )}

                  {selectedCategoryId && categoryTrend && (
                    <div className="summary-card stack-gap">
                      <h3>{categoryTrend.categoryLabel} trend</h3>
                      <div className="trend-summary" aria-label={`${categoryTrend.categoryLabel} trend summary`}>
                        <div>
                          <p className="eyebrow">Average</p>
                          <strong className="num">{categoryTrend.averagePercent}%</strong>
                        </div>
                        <div>
                          <p className="eyebrow">Best</p>
                          <strong className="num">{categoryTrend.bestPercent}%</strong>
                        </div>
                      </div>
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
                    </div>
                  )}

                  {historyCategories.length > 0 && !selectedCategoryId && (
                    <div className="summary-card stack-gap">
                      <h3>Category trend</h3>
                      <p className="field-hint">Select a category to plot performance across sessions.</p>
                      <div className="category-pills" role="group" aria-label="Content categories">
                        {historyCategories.map((category) => (
                          <button
                            key={category.categoryId}
                            type="button"
                            className="pill"
                            onClick={() => setSelectedCategoryId(category.categoryId)}
                          >
                            {category.categoryLabel}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </aside>
              </div>
            )}
          </section>
        )}

        {view === 'history-detail' && selectedHistory && selectedHistoryItem && (
          <section className="panel panel--span-2">
            <div className="session-shell">
              <header className="session-bar session-bar--minimal">
                <button type="button" className="ghost-button" onClick={() => setView('history')}>
                  ← Back to history
                </button>
                <div className="session-chips">
                  <span className="chip chip--muted">
                    Item <span className="num">{reviewIndex + 1}</span> of <span className="num">{selectedHistory.items.length}</span>
                  </span>
                  <span className="chip">
                    <span className="num">{selectedHistory.result.percent}%</span>
                  </span>
                </div>
              </header>

              <div className="review-layout">
                <div className="session-body session-body--focus">
                  <p className="field-hint">
                    Keyboard: use Left/Right arrow keys to move between items. Time used:{' '}
                    {formatDuration(selectedHistory.timeUsedSeconds)}.
                  </p>

                  <QuestionReview item={selectedHistoryItem} answer={selectedHistory.answers[selectedHistoryItem.itemId]} />

                  <div className="review-toolbar">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setReviewIndex((current) => Math.max(current - 1, 0))}
                      disabled={reviewIndex === 0}
                    >
                      Previous item
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() =>
                        openFlagComposer(
                          selectedHistoryItem.question,
                          selectedHistory.id,
                          selectedHistory.settings.blueprintId,
                          selectedHistory.settings.mode
                        )
                      }
                    >
                      Flag item
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setReviewIndex((current) => Math.min(current + 1, selectedHistory.items.length - 1))}
                      disabled={reviewIndex === selectedHistory.items.length - 1}
                    >
                      Next item
                    </button>
                  </div>
                </div>

                <aside className="review-sidebar stack-gap">
                  <div>
                    <h3>Category breakdown</h3>
                    <div className="cat-bars">
                      {selectedHistory.result.breakdown.map((entry) => {
                        const percent = entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0;
                        const isWeak = percent < selectedHistory.settings.targetThreshold;
                        return (
                          <button
                            key={entry.categoryId}
                            type="button"
                            className="cat-bar-row cat-bar-button"
                            onClick={() => openCategoryTrend(entry.categoryId)}
                          >
                            <span className="label">{entry.categoryLabel}</span>
                            <div className="cat-bar-track">
                              <div
                                className={['cat-bar-fill', isWeak ? 'is-weak' : ''].filter(Boolean).join(' ')}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="score num">{percent}%</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3>Jump to item</h3>
                    <div className="nav-grid" role="group" aria-label="Session items">
                      {selectedHistory.items.map((item, index) => {
                        const answer = selectedHistory.answers[item.itemId];
                        const isCorrect = answer === item.question.correct;
                        return (
                          <button
                            key={item.itemId}
                            type="button"
                            className={[
                              'nav-cell',
                              index === reviewIndex ? 'is-current' : '',
                              !isCorrect ? 'is-unanswered' : ''
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            aria-current={index === reviewIndex ? 'true' : undefined}
                            aria-label={`Item ${index + 1}${!isCorrect ? ', review' : ''}`}
                            onClick={() => setReviewIndex(index)}
                          >
                            {index + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </section>
        )}

        {view === 'flags' && (
          <section className="panel panel--span-2 stack-gap">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Item feedback</p>
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
              <div className="flag-stack">
                {Object.entries(
                  flags.reduce<Record<string, ItemFlag[]>>((groups, flag) => {
                    groups[flag.item_id] = [...(groups[flag.item_id] ?? []), flag];
                    return groups;
                  }, {})
                ).map(([itemId, itemFlags]) => (
                  <article key={itemId} className="flag-card">
                    <div className="flag-card__meta">
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
                    <div className="flag-card__actions">
                      <button
                        className="secondary-button"
                        onClick={() => {
                          const matchedQuestion = bank.questions.find((question) => question.id === itemId);
                          if (matchedQuestion) {
                            setFlagDraft(
                              buildInitialFlagDraft(
                                matchedQuestion,
                                itemFlags[0].session_id,
                                itemFlags[0].blueprint,
                                itemFlags[0].mode,
                                itemFlags[0]
                              )
                            );
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
                ))}
              </div>
            )}

            <details className="summary-card">
              <summary>Export JSON shape</summary>
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
            </details>
          </section>
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
