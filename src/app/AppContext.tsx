import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { getBlueprint } from '../data/blueprints';
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
import { initTheme, toggleTheme } from '../lib/theme';
import type {
  ActiveSession,
  AppMeta,
  BlueprintId,
  ExamMode,
  FlagReason,
  HistoryEntry,
  ItemFlag,
  Question,
  QuestionSet,
  SessionSettings
} from '../types/exam';

const QUESTION_MIN = 10;

function normalizeSettings(settings: SessionSettings): SessionSettings {
  const defaults = buildDefaultSettings(settings.blueprintId);
  return { ...defaults, ...settings, questionSet: settings.questionSet ?? 'standard' };
}

function getAvailableQuestionCount(questions: Question[], blueprintId: BlueprintId, includeDrafts: boolean): number {
  const blueprint = getBlueprint(blueprintId);
  return questions.filter((question) => {
    if (!includeDrafts && question.status !== 'reviewed') return false;
    return isBlueprintApplicable(blueprint, question);
  }).length;
}

interface AppContextValue {
  ready: boolean;
  error: string | null;
  meta: AppMeta;
  settings: SessionSettings;
  activeSession: ActiveSession | null;
  history: HistoryEntry[];
  flags: ItemFlag[];
  bank: { questions: Question[]; notes: string[] };
  allQuestions: Question[];
  availableQuestionCount: number;
  theme: 'light' | 'dark';

  updateSettings: (next: Partial<SessionSettings>) => void;
  handleBlueprintChange: (id: BlueprintId) => void;
  handleModeChange: (mode: ExamMode) => void;
  handleQuestionSetChange: (qs: QuestionSet) => void;

  startSession: () => void;
  beginNewSession: (nextSettings?: SessionSettings, weakAreaIds?: string[]) => void;
  resumeExistingSession: () => void;
  replaceActiveSession: () => void;
  discardActiveSession: () => void;
  finalizeSession: () => Promise<void>;
  isFinalizing: boolean;

  handleAnswer: (optionId: string) => void;
  navigateSession: (direction: -1 | 1) => void;
  toggleBookmark: () => void;
  toggleTimerHidden: () => void;
  mutateSession: (mutator: (current: ActiveSession) => ActiveSession) => void;

  openFlagComposer: (item: Question, sessionId: string, blueprint: BlueprintId, mode: ExamMode) => void;
  flagDraft: { item: Question; sessionId: string; blueprint: BlueprintId; mode: ExamMode; reason: FlagReason; comment: string; existingId?: string } | null;
  setFlagDraft: (draft: AppContextValue['flagDraft'] | null) => void;
  saveFlagDraft: () => Promise<void>;
  clearFlagById: (flagId: string) => Promise<void>;

  removeHistoryEntry: (entryId: string) => Promise<void>;
  handleClearHistory: () => Promise<void>;
  exportFlags: () => void;
  resetFlags: () => Promise<void>;

  acknowledgeDisclaimer: () => Promise<void>;

  sessionReplacePromptOpen: boolean;
  dismissSessionReplacePrompt: () => void;

  pendingSessionSettings: SessionSettings | null;
  setPendingSessionSettings: (s: SessionSettings | null) => void;

  toggleTheme: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const banks = useMemo(() => loadQuestionBanks(), []);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<AppMeta>({ disclaimerSeen: false });
  const [settings, setSettings] = useState<SessionSettings>(() => buildDefaultSettings('cctc-from-2026-07'));
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [flags, setFlags] = useState<ItemFlag[]>([]);
  const [flagDraft, setFlagDraft] = useState<AppContextValue['flagDraft']>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [sessionReplacePromptOpen, setSessionReplacePromptOpen] = useState(false);
  const [pendingSessionSettings, setPendingSessionSettings] = useState<SessionSettings | null>(null);
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const lastPersistFingerprint = useRef('');
  const activeSessionRef = useRef<ActiveSession | null>(null);

  const bank = useMemo(
    () => (settings.questionSet === 'scenario' ? banks.scenario : banks.standard),
    [banks, settings.questionSet]
  );

  const allQuestions = useMemo(
    () => [...banks.standard.questions, ...banks.scenario.questions],
    [banks]
  );

  const availableQuestionCount = getAvailableQuestionCount(bank.questions, settings.blueprintId, settings.includeDrafts);

  // Bootstrap
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
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load local app data.');
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => { cancelled = true; };
  }, [allQuestions]);

  // Init theme
  useEffect(() => {
    setThemeState(initTheme());
  }, []);

  // Persist settings
  useEffect(() => {
    if (ready) void saveSettings(settings);
  }, [ready, settings]);

  // Persist active session
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

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
      submittedAt: activeSession.submittedAt
    });
    if (fp !== lastPersistFingerprint.current) {
      lastPersistFingerprint.current = fp;
      void saveActiveSession(activeSession);
    }
  }, [activeSession, ready]);

  // Flush session on unload
  useEffect(() => {
    const flushSession = () => {
      const current = activeSessionRef.current;
      if (current && !current.submittedAt) {
        const blob = new Blob([JSON.stringify(current)], { type: 'application/json' });
        navigator.sendBeacon?.('__cctc-session-keepalive', blob);
      }
    };
    window.addEventListener('pagehide', flushSession);
    return () => window.removeEventListener('pagehide', flushSession);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!activeSession || activeSession.submittedAt || activeSession.remainingSeconds === null) return;
    const id = window.setInterval(() => {
      setActiveSession((prev) => {
        if (!prev || prev.submittedAt || prev.remainingSeconds === null || prev.remainingSeconds <= 0) return prev;
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1, updatedAt: new Date().toISOString() };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeSession]);

  // Auto-save every 60s
  useEffect(() => {
    if (!activeSession || activeSession.submittedAt) return;
    const id = window.setInterval(() => {
      setActiveSession((prev) => (prev ? { ...prev, updatedAt: new Date().toISOString() } : prev));
    }, 60000);
    return () => window.clearInterval(id);
  }, [activeSession]);

  function persistSettings(nextSettings: SessionSettings): void {
    setSettings(nextSettings);
  }

  function updateSettings(next: Partial<SessionSettings>): void {
    const merged = { ...settings, ...next };
    const max = getAvailableQuestionCount(bank.questions, merged.blueprintId, merged.includeDrafts);
    merged.questionCount = Math.min(Math.max(merged.questionCount, Math.min(QUESTION_MIN, max)), max);
    persistSettings(merged);
  }

  function handleBlueprintChange(nextBlueprintId: BlueprintId): void {
    const blueprint = getBlueprint(nextBlueprintId);
    const max = getAvailableQuestionCount(bank.questions, nextBlueprintId, settings.includeDrafts);
    persistSettings({
      ...settings,
      blueprintId: nextBlueprintId,
      questionCount: Math.min(settings.questionCount, max),
      timeMinutes: blueprint.default_time_minutes
    });
  }

  function handleModeChange(nextMode: ExamMode): void {
    const includeDrafts = nextMode === 'exam' ? false : settings.includeDrafts;
    const max = getAvailableQuestionCount(bank.questions, settings.blueprintId, includeDrafts);
    persistSettings({
      ...settings,
      mode: nextMode,
      includeDrafts,
      questionCount: Math.min(settings.questionCount, max)
    });
  }

  function handleQuestionSetChange(nextQuestionSet: QuestionSet): void {
    const nextBank = nextQuestionSet === 'scenario' ? banks.scenario : banks.standard;
    const max = getAvailableQuestionCount(nextBank.questions, settings.blueprintId, settings.includeDrafts);
    persistSettings({
      ...settings,
      questionSet: nextQuestionSet,
      questionCount: Math.min(Math.max(settings.questionCount, QUESTION_MIN), Math.max(max, 1))
    });
  }

  function mutateSession(mutator: (current: ActiveSession) => ActiveSession): void {
    setActiveSession((prev) => {
      if (!prev) return prev;
      const next = mutator(prev);
      return { ...next, updatedAt: new Date().toISOString() };
    });
  }

  function handleAnswer(optionId: string): void {
    mutateSession((current) => {
      if (current.submittedAt) return current;
      const item = current.items[current.currentIndex];
      if (!item) return current;
      const isStudyReveal = current.settings.mode === 'study';
      return {
        ...current,
        answers: { ...current.answers, [item.itemId]: optionId },
        revealed: isStudyReveal ? { ...current.revealed, [item.itemId]: true } : current.revealed
      };
    });
  }

  function navigateSession(direction: -1 | 1): void {
    mutateSession((current) => ({
      ...current,
      currentIndex: Math.max(0, Math.min(current.items.length - 1, current.currentIndex + direction))
    }));
  }

  function toggleBookmark(): void {
    mutateSession((current) => {
      const itemId = current.items[current.currentIndex]?.itemId;
      if (!itemId) return current;
      const bookmarked = current.flaggedForReview.includes(itemId);
      return {
        ...current,
        flaggedForReview: bookmarked
          ? current.flaggedForReview.filter((id) => id !== itemId)
          : [...current.flaggedForReview, itemId]
      };
    });
  }

  function toggleTimerHidden(): void {
    mutateSession((current) => ({ ...current, timerHidden: !current.timerHidden }));
  }

  function beginNewSession(nextSettings: SessionSettings = settings, weakAreaIds?: string[]): void {
    const recentIds = buildRecentItemIds(history.map((entry) => ({ itemIds: entry.itemIds })));
    const nextSession = createSession(bank.questions, nextSettings, recentIds, weakAreaIds);
    setActiveSession(nextSession);
    setSettings(nextSettings);
  }

  function startSession(): void {
    let nextSettings = settings;
    if (availableQuestionCount === 0 && !settings.includeDrafts) {
      const useDrafts = window.confirm(
        'No reviewed items are available for this configuration yet. Click OK to include draft items for a bootstrap practice session.'
      );
      if (!useDrafts) return;
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
  }

  function replaceActiveSession(): void {
    const next = pendingSessionSettings ?? settings;
    dismissSessionReplacePrompt();
    beginNewSession(next);
  }

  function discardActiveSession(): void {
    setActiveSession(null);
    void clearActiveSession();
  }

  async function finalizeSession(): Promise<void> {
    if (!activeSession || isFinalizing) return;
    setIsFinalizing(true);
    try {
      const unanswered = activeSession.items.length - countAnswered(activeSession);
      if (activeSession.settings.mode === 'exam') {
        const shouldSubmit = window.confirm(
          unanswered > 0
            ? `Submit exam with ${unanswered} unanswered item(s)? There is no guessing penalty in this practice result.`
            : 'Submit exam and score the results?'
        );
        if (!shouldSubmit) return;
      }
      const result = scoreSession(
        activeSession.settings.blueprintId,
        activeSession.items,
        activeSession.answers,
        activeSession.settings.targetThreshold
      );
      const completedSession = {
        ...activeSession,
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        result
      };
      const historyEntry = toHistoryEntry(completedSession);
      await saveHistoryEntry(historyEntry);
      await clearActiveSession();
      setHistory((current) => [historyEntry, ...current]);
      setActiveSession(null);
    } finally {
      setIsFinalizing(false);
    }
  }

  function openFlagComposer(item: Question, sessionId: string, blueprint: BlueprintId, mode: ExamMode): void {
    const existing = flags.find((flag) => flag.item_id === item.id);
    setFlagDraft({
      existingId: existing?.id,
      item,
      sessionId,
      blueprint,
      mode,
      reason: existing?.reason ?? 'factual error',
      comment: existing?.comment ?? ''
    });
  }

  async function saveFlagDraftAction(): Promise<void> {
    if (!flagDraft) return;
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
    setFlags((current) => [nextFlag, ...current.filter((f) => f.item_id !== nextFlag.item_id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    setFlagDraft(null);
  }

  async function clearFlagById(flagId: string): Promise<void> {
    await deleteFlag(flagId);
    setFlags((current) => current.filter((f) => f.id !== flagId));
  }

  async function removeHistoryEntry(entryId: string): Promise<void> {
    await deleteHistoryEntry(entryId);
    setHistory((current) => current.filter((e) => e.id !== entryId));
  }

  async function handleClearHistory(): Promise<void> {
    if (!window.confirm('Delete all stored session history?')) return;
    await clearHistory();
    setHistory([]);
  }

  async function acknowledgeDisclaimer(): Promise<void> {
    const nextMeta = { disclaimerSeen: true };
    setMeta(nextMeta);
    await saveMeta(nextMeta);
  }

  function exportFlagsAction(): void {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), flags }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cctc-flags.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function resetFlags(): Promise<void> {
    if (!window.confirm('Clear every stored item flag?')) return;
    await replaceFlags([]);
    setFlags([]);
  }

  function handleToggleTheme(): void {
    const next = toggleTheme();
    setThemeState(next);
  }

  const value: AppContextValue = {
    ready,
    error,
    meta,
    settings,
    activeSession,
    history,
    flags,
    bank,
    allQuestions,
    availableQuestionCount,
    theme,
    updateSettings,
    handleBlueprintChange,
    handleModeChange,
    handleQuestionSetChange,
    startSession,
    beginNewSession,
    resumeExistingSession,
    replaceActiveSession,
    discardActiveSession,
    finalizeSession,
    isFinalizing,
    handleAnswer,
    navigateSession,
    toggleBookmark,
    toggleTimerHidden,
    mutateSession,
    openFlagComposer,
    flagDraft,
    setFlagDraft,
    saveFlagDraft: saveFlagDraftAction,
    clearFlagById,
    removeHistoryEntry,
    handleClearHistory,
    exportFlags: exportFlagsAction,
    resetFlags,
    acknowledgeDisclaimer,
    sessionReplacePromptOpen,
    dismissSessionReplacePrompt,
    pendingSessionSettings,
    setPendingSessionSettings,
    toggleTheme: handleToggleTheme
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
