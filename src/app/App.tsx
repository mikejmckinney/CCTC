import { useEffect, useMemo, useRef, useState } from 'react';
import { getBlueprint, getBlueprintLabel } from '../data/blueprints';
import { loadQuestionBanks } from '../data/questionBank';
import { buildDefaultSettings, countAnswered, createSession, isBlueprintApplicable } from '../lib/sessionAssembly';
import { buildRecentItemIds } from '../lib/sessionPersistence';
import { buildCategoryHistoryTrend, listHistoryCategories } from '../lib/categoryHistoryTrend';
import { buildHistoryTrend, formatTrendDelta } from '../lib/historyTrend';
import { scoreSession, toHistoryEntry } from '../lib/scoring';
import {
  computeDomainEmas,
  computeDonutColor,
  computeDonutStrokeDash,
  computeInsight,
  computeReadiness,
  computeReadinessDelta,
  getWeakDomains,
  getPriorMissedItemIds
} from '../lib/readinessAnalytics';
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
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
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

type View = 'home' | 'session' | 'progress' | 'flags';

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
    if (optionId === item.question.correct) return [];
    const rationale = item.question.explanation.rationale_incorrect?.[optionId];
    if (!rationale) return [];
    return [{ displayLetter: displayLetterForIndex(optionIndex), rationale }];
  });
}

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) return 'Untimed';
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

function clampQuestionCount(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(Math.max(value, Math.min(QUESTION_MIN, max)), max);
}

function clampToMax(value: number, max: number): number {
  return Math.min(Math.max(value, 1), max);
}

function getAvailableQuestionCount(questions: Question[], blueprintId: BlueprintId, includeDrafts: boolean, focusDomains?: number[]): number {
  const blueprint = getBlueprint(blueprintId);
  let filtered = questions.filter((question) => {
    if (!includeDrafts && question.status !== 'reviewed') return false;
    return isBlueprintApplicable(blueprint, question);
  });
  if (focusDomains && focusDomains.length > 0) {
    filtered = filtered.filter((q) => focusDomains.includes(q.domain));
  }
  return filtered.length;
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

function updateSessionTimestamp(session: ActiveSession): ActiveSession {
  return { ...session, updatedAt: new Date().toISOString() };
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

function formatElapsedMinutes(totalSeconds: number | null): string {
  if (totalSeconds === null) return 'Untimed';
  const mins = Math.round(totalSeconds / 60);
  return `${mins} min`;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function fullDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function References({ question }: { question: Question }) {
  return (
    <div className="ref-list">
      <h5>References</h5>
      {question.references.map((ref) => (
        <div key={`${ref.citation}-${ref.locator ?? ''}`} className="ref-item">
          {ref.url ? (
            <a className="ref-citation" href={ref.url} target="_blank" rel="noreferrer">{ref.citation}</a>
          ) : (
            <span className="ref-citation">{ref.citation}</span>
          )}
          {ref.locator && <div className="ref-locator">{ref.locator}</div>}
        </div>
      ))}
    </div>
  );
}

function normalizeSettings(settings: SessionSettings): SessionSettings {
  const defaults = buildDefaultSettings(settings.blueprintId);
  return { ...defaults, ...settings, questionSet: settings.questionSet ?? 'standard' };
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
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [readyInfoOpen, setReadyInfoOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [destructiveConfirm, setDestructiveConfirm] = useState<{ title: string; body: string; cta: string; run: () => void } | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'incorrect' | 'correct'>('all');
  const [reviewDomain, setReviewDomain] = useState<'all' | number>('all');
  const [expandedReview, setExpandedReview] = useState<Set<number>>(new Set());
  const [questionSetLocal, setQuestionSetLocal] = useState<QuestionSet>('standard');
  const [focusDomainsLocal, setFocusDomainsLocal] = useState<number[]>([]);
  const [progressFilter, setProgressFilter] = useState<'exam' | 'study' | 'both'>('exam');
  const lastPersistFingerprint = useRef('');
  const activeSessionRef = useRef<ActiveSession | null>(null);

  const allQuestions = useMemo(() => [...banks.standard.questions, ...banks.scenario.questions], [banks]);

  const targetThreshold = meta.targetThreshold ?? settings.targetThreshold ?? 70;

  const activeBank = questionSetLocal === 'scenario' ? banks.scenario : banks.standard;
  const availableForCustomize = getAvailableQuestionCount(activeBank.questions, settings.blueprintId, settings.mode === 'study' ? settings.includeDrafts : false, focusDomainsLocal.length > 0 ? focusDomainsLocal : undefined);

  const readiness = useMemo(() => computeReadiness(history), [history]);
  const readinessDelta = useMemo(() => computeReadinessDelta(history), [history]);
  const domainEmas = useMemo(() => computeDomainEmas(history, targetThreshold), [history, targetThreshold]);
  const insight = useMemo(() => computeInsight(history, readiness, domainEmas, targetThreshold, meta.examDate), [history, readiness, domainEmas, targetThreshold, meta.examDate]);
  const priorMissedIds = useMemo(() => getPriorMissedItemIds(history), [history]);

  const weakDomains = useMemo(() => getWeakDomains(domainEmas, targetThreshold).map((d) => d.domainId), [domainEmas, targetThreshold]);

  const examDateDays = useMemo(() => {
    if (!meta.examDate) return null;
    const now = new Date();
    const exam = new Date(meta.examDate + 'T00:00:00');
    return Math.ceil((exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [meta.examDate]);

  const session = activeSession;
  const currentItem = session ? session.items[session.currentIndex] : null;
  const answeredCount = session ? countAnswered(session) : 0;
  const selectedHistoryItem = selectedHistory?.items[reviewIndex] ?? null;

  const progressHistoryForScope = useMemo(() => {
    if (progressFilter === 'both') return history;
    return history.filter((entry) => entry.settings.mode === progressFilter);
  }, [history, progressFilter]);

  const scoreTrendPointsForScope = useMemo(() => {
    const filtered = [...progressHistoryForScope]
      .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
      .slice(-8);
    return filtered.map((entry) => ({
      id: entry.id,
      label: shortDate(entry.completedAt),
      percent: entry.result.percent,
      completedAt: entry.completedAt,
      mode: entry.settings.mode,
      belowTarget: entry.result.percent < targetThreshold
    }));
  }, [progressHistoryForScope, targetThreshold]);

  const scopeStats = useMemo(() => {
    const pcts = scoreTrendPointsForScope.map((p) => p.percent);
    if (pcts.length === 0) return { average: null, best: null, latest: null };
    return {
      average: Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length),
      best: Math.max(...pcts),
      latest: pcts[pcts.length - 1]
    };
  }, [scoreTrendPointsForScope]);

  const stackedAreaData = useMemo(() => {
    const examSessions = progressHistoryForScope
      .filter((e) => e.settings.mode === 'exam')
      .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
      .slice(-8);

    return examSessions.map((entry) => {
      const record: Record<string, string | number> = {
        label: shortDate(entry.completedAt),
        overall: entry.result.percent
      };
      entry.result.breakdown.forEach((b) => {
        const dId = Number(b.categoryId);
        if (!Number.isNaN(dId)) {
          record[`d${dId}`] = b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0;
        }
      });
      return record;
    });
  }, [progressHistoryForScope]);

  useEffect(() => {
    let cancelled = false;
    bootstrapState(allQuestions)
      .then((state) => {
        if (cancelled) return;
        setMeta(state.meta);
        const savedSettings = state.settings ? normalizeSettings(state.settings) : buildDefaultSettings('cctc-from-2026-07');
        if (state.meta.targetThreshold) {
          savedSettings.targetThreshold = state.meta.targetThreshold;
        }
        setSettings(savedSettings);
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
        if (!cancelled) setReady(true);
      });
    return () => { cancelled = true; };
  }, [allQuestions]);

  useEffect(() => {
    if (!ready) return;
    void saveSettings(settings);
  }, [ready, settings]);

  useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);

  useEffect(() => {
    if (!ready) return undefined;
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
    const flushSession = () => { if (activeSession) void saveActiveSession(activeSession); };
    window.addEventListener('beforeunload', flushSession);
    return () => window.removeEventListener('beforeunload', flushSession);
  }, [activeSession]);

  const timedSessionId =
    ready && activeSession && !activeSession.submittedAt && activeSession.remainingSeconds !== null
      ? activeSession.id
      : null;

  useEffect(() => {
    if (!ready || !timedSessionId) return undefined;
    const intervalId = window.setInterval(() => {
      if (activeSessionRef.current) void saveActiveSession(activeSessionRef.current);
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [ready, timedSessionId]);

  useEffect(() => {
    if (!timedSessionId) return undefined;
    const intervalId = window.setInterval(() => {
      setActiveSession((current) => {
        if (!current || current.id !== timedSessionId || current.submittedAt || current.remainingSeconds === null || current.remainingSeconds <= 0)
          return current;
        return updateSessionTimestamp({ ...current, remainingSeconds: Math.max(0, current.remainingSeconds - 1) });
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [timedSessionId]);

  useEffect(() => {
    if (selectedCategoryId && !historyCategories.some((c) => c.categoryId === selectedCategoryId)) {
      setSelectedCategoryId(null);
    }
  }, [historyCategories, selectedCategoryId]);

  useEffect(() => {
    if (!selectedHistory || view !== 'progress') return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); setReviewIndex((c) => Math.max(c - 1, 0)); }
      if (event.key === 'ArrowRight' || event.key === 'Enter') { event.preventDefault(); setReviewIndex((c) => Math.min(c + 1, selectedHistory.items.length - 1)); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedHistory, view]);

  useEffect(() => {
    if (!session || view !== 'session') return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (!currentItem) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); navigateSession(-1); return; }
      if (event.key === 'ArrowRight' || event.key === 'Enter') { event.preventDefault(); navigateSession(1); return; }
      if (event.key.length !== 1) return;
      const letterIndex = event.key.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
      if (letterIndex >= 0 && letterIndex < currentItem.optionOrder.length) {
        event.preventDefault();
        handleAnswer(currentItem.optionOrder[letterIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentItem, session, view]);

  function applyTheme(theme: 'day' | 'night'): void {
    document.documentElement.setAttribute('data-theme', theme === 'night' ? 'night' : '');
  }

  function persistMeta(nextMeta: Partial<AppMeta>): void {
    const merged = { ...meta, ...nextMeta };
    setMeta(merged);
    void saveMeta(merged);
  }

  function persistSettings(nextSettings: SessionSettings): void {
    setSettings(nextSettings);
    void saveSettings(nextSettings);
  }

  function handleModeChange(nextMode: ExamMode): void {
    const includeDrafts = nextMode === 'exam' ? false : true;
    const max = getAvailableQuestionCount(activeBank.questions, settings.blueprintId, includeDrafts, focusDomainsLocal.length > 0 ? focusDomainsLocal : undefined);
    const next: SessionSettings = { ...settings, mode: nextMode, includeDrafts, questionCount: clampQuestionCount(settings.questionCount, max) };
    persistSettings(next);
    if (!includeDrafts && settings.includeDrafts && next.questionCount !== settings.questionCount) {
      setQuestionSetLocal(next.questionSet);
    }
  }

  function mutateSession(mutator: (current: ActiveSession) => ActiveSession): void {
    setActiveSession((current) => {
      if (!current) return current;
      return updateSessionTimestamp(mutator(current));
    });
  }

  function handleAnswer(optionId: string): void {
    mutateSession((current) => ({
      ...current,
      answers: { ...current.answers, [current.items[current.currentIndex].itemId]: optionId },
      revealed: current.settings.mode === 'study'
        ? { ...current.revealed, [current.items[current.currentIndex].itemId]: true }
        : current.revealed
    }));
  }

  function navigateSession(direction: -1 | 1): void {
    mutateSession((current) => ({ ...current, currentIndex: Math.min(Math.max(current.currentIndex + direction, 0), current.items.length - 1) }));
  }

  function toggleBookmark(): void {
    mutateSession((current) => {
      const itemId = current.items[current.currentIndex].itemId;
      const bookmarked = current.flaggedForReview.includes(itemId);
      return { ...current, flaggedForReview: bookmarked ? current.flaggedForReview.filter((v) => v !== itemId) : [...current.flaggedForReview, itemId] };
    });
  }

  function toggleTimerHidden(): void {
    mutateSession((current) => ({ ...current, timerHidden: !current.timerHidden }));
  }

  function beginNewSession(nextSettings: SessionSettings): void {
    let recentIds = buildRecentItemIds(history.map((entry) => ({ itemIds: entry.itemIds })));
    if (nextSettings.prioritizeIncorrect) {
      recentIds = new Set([...recentIds, ...priorMissedIds]);
    }
    const nextSession = createSession(bank.questions, nextSettings, recentIds);
    setActiveSession(nextSession);
    setView('session');
    setCustomizeOpen(false);
  }

  function launchSession(nextSettings: SessionSettings, fromCustomize: boolean): void {
    if (fromCustomize) {
      persistMeta({ lastCustomSettings: nextSettings });
    }

    if (activeSession && !activeSession.submittedAt) {
      setPendingSessionSettings(nextSettings);
      setSessionReplacePromptOpen(true);
      return;
    }

    if (availableForCustomize === 0 && !settings.includeDrafts) {
      const withDrafts = { ...nextSettings, includeDrafts: true };
      persistSettings(withDrafts);
      beginNewSession(withDrafts);
      return;
    }

    beginNewSession(nextSettings);
  }

  function presetFull(): void {
    const bp = getBlueprint(settings.blueprintId);
    launchSession({
      ...settings,
      mode: 'exam',
      questionSet: 'standard',
      questionCount: clampQuestionCount(bp.default_exam_items, getAvailableQuestionCount(banks.standard.questions, settings.blueprintId, false)),
      timed: true,
      timeMinutes: bp.default_time_minutes,
      showTimer: true,
      includeDrafts: false,
      focusDomains: undefined,
      prioritizeIncorrect: false
    }, false);
  }

  function presetQuick(): void {
    const bankForQuick = banks.standard;
    const max = getAvailableQuestionCount(bankForQuick.questions, settings.blueprintId, false);
    launchSession({
      ...settings,
      mode: 'exam',
      questionSet: 'standard',
      questionCount: clampQuestionCount(25, max),
      timed: true,
      timeMinutes: 30,
      showTimer: true,
      includeDrafts: false,
      focusDomains: undefined,
      prioritizeIncorrect: false
    }, false);
  }

  function presetWeak(): void {
    if (weakDomains.length === 0) {
      launchSession({
        ...settings,
        mode: 'study',
        questionSet: 'standard',
        timed: false,
        showTimer: true,
        includeDrafts: true,
        focusDomains: undefined,
        prioritizeIncorrect: false
      }, false);
      return;
    }
    const max = getAvailableQuestionCount(banks.standard.questions, settings.blueprintId, true, weakDomains);
    launchSession({
      ...settings,
      mode: 'study',
      questionSet: 'standard',
      questionCount: clampQuestionCount(settings.questionCount, max),
      timed: false,
      showTimer: true,
      includeDrafts: true,
      focusDomains: weakDomains,
      prioritizeIncorrect: true
    }, false);
  }

  function launchCustomize(): void {
    const max = getAvailableQuestionCount(activeBank.questions, settings.blueprintId, settings.mode === 'study' ? settings.includeDrafts : false, focusDomainsLocal.length > 0 ? focusDomainsLocal : undefined);
    launchSession({
      ...settings,
      questionSet: questionSetLocal,
      questionCount: clampQuestionCount(settings.questionCount, max),
      focusDomains: focusDomainsLocal.length > 0 ? focusDomainsLocal : undefined,
      prioritizeIncorrect: false
    }, true);
  }

  function launchRecentCustom(): void {
    if (!meta.lastCustomSettings) return;
    launchSession(meta.lastCustomSettings, false);
  }

  function launchInsightAction(): void {
    if (insight.actionType === 'quick-exam') {
      presetQuick();
    } else if (insight.actionType === 'full-mock') {
      presetFull();
    } else if (insight.actionType === 'focused-domain' && insight.actionDomain) {
      const max = getAvailableQuestionCount(banks.standard.questions, settings.blueprintId, true, [insight.actionDomain]);
      launchSession({
        ...settings,
        mode: 'study',
        questionSet: 'standard',
        questionCount: clampQuestionCount(10, max),
        timed: false,
        showTimer: true,
        includeDrafts: true,
        focusDomains: [insight.actionDomain],
        prioritizeIncorrect: true
      }, false);
    }
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

  async function submitSession(): Promise<void> {
    if (!activeSession || isFinalizing) return;
    setIsFinalizing(true);
    try {
      const result = scoreSession(activeSession.settings.blueprintId, activeSession.items, activeSession.answers, activeSession.settings.targetThreshold);
      const completedSession = updateSessionTimestamp({ ...activeSession, submittedAt: new Date().toISOString(), result });
      const historyEntry = toHistoryEntry(completedSession);
      await saveHistoryEntry(historyEntry);
      await clearActiveSession();
      setHistory((current) => [historyEntry, ...current]);
      setSelectedHistory(historyEntry);
      setReviewIndex(0);
      setActiveSession(null);
      setView('home');
    } finally {
      setIsFinalizing(false);
    }
    setConfirmSubmitOpen(false);
  }

  function openSubmitConfirm(): void {
    setConfirmSubmitOpen(true);
  }

  function openFlagComposer(item: Question, sessionId: string, blueprint: BlueprintId, mode: ExamMode): void {
    const existing = flags.find((flag) => flag.item_id === item.id);
    setFlagDraft(buildInitialFlagDraft(item, sessionId, blueprint, mode, existing));
  }

  async function saveFlagDraft(): Promise<void> {
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
      setReviewIndex(0);
    }
  }

  function openClearHistoryConfirm(): void {
    setDestructiveConfirm({
      title: 'Clear all history?',
      body: `Delete all ${history.length} stored session(s)? This cannot be undone.`,
      cta: 'Clear all history',
      run: async () => {
        await clearHistory();
        setHistory([]);
        setSelectedHistory(null);
        setReviewIndex(0);
        setDestructiveConfirm(null);
        setView('home');
      }
    });
  }

  async function acknowledgeDisclaimer(): Promise<void> {
    const storedTheme: 'day' | 'night' = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
    await saveMeta({ disclaimerSeen: true });
    setMeta((current) => ({ ...current, disclaimerSeen: true, theme: current.theme ?? storedTheme }));
    applyTheme(meta.theme ?? storedTheme);
  }

  async function exportFlags(): Promise<void> {
    downloadJson('cctc-flags.json', { schema: 'cctc-flags', version: 1, exportedAt: new Date().toISOString(), flags });
  }

  function openClearFlagsConfirm(): void {
    setDestructiveConfirm({
      title: 'Clear all flags?',
      body: `Delete all ${flags.length} stored flag(s)? This cannot be undone.`,
      cta: 'Clear all flags',
      run: async () => {
        await replaceFlags([]);
        setFlags([]);
        setDestructiveConfirm(null);
      }
    });
  }

  function openDeleteHistoryConfirm(entryId: string): void {
    const entry = history.find((h) => h.id === entryId);
    setDestructiveConfirm({
      title: 'Delete session?',
      body: `Delete the ${entry ? shortDate(entry.completedAt) : ''} ${entry?.settings.mode ?? ''} session? This cannot be undone.`,
      cta: 'Delete',
      run: async () => {
        await removeHistoryEntry(entryId);
        setDestructiveConfirm(null);
      }
    });
  }

  function openDeleteFlagConfirm(flagId: string): void {
    setDestructiveConfirm({
      title: 'Delete flag?',
      body: 'Delete this flag? This cannot be undone.',
      cta: 'Delete',
      run: async () => {
        await clearFlagById(flagId);
        setDestructiveConfirm(null);
      }
    });
  }

  function syncCustomizeFromSettings(): void {
    setQuestionSetLocal(settings.questionSet);
    setFocusDomainsLocal(settings.focusDomains ?? []);
  }

  function toggleDomainFocus(domainId: number): void {
    setFocusDomainsLocal((prev) => {
      if (prev.includes(domainId)) {
        const next = prev.filter((d) => d !== domainId);
        const max = getAvailableQuestionCount(activeBank.questions, settings.blueprintId, settings.mode === 'study' ? settings.includeDrafts : false, next.length > 0 ? next : undefined);
        if (settings.questionCount > max) {
          persistSettings({ ...settings, questionCount: max });
        }
        return next;
      }
      return [...prev, domainId];
    });
  }

  function startView(): void {
    setView('home');
    setSelectedHistory(null);
    setReviewIndex(0);
  }

  function openProgressFromHome(): void {
    setView('progress');
  }

  function openReviewFromHistory(entry: HistoryEntry): void {
    setSelectedHistory(entry);
    setReviewIndex(0);
    setReviewFilter('all');
    setReviewDomain('all');
    setExpandedReview(new Set());
  }

  function toggleReviewExpand(index: number): void {
    setExpandedReview((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function applyThemeToggle(): void {
    const next = meta.theme === 'night' ? 'day' : 'night';
    persistMeta({ theme: next });
    applyTheme(next);
  }

  useEffect(() => {
    if (meta.theme) applyTheme(meta.theme);
  }, [meta.theme]);

  if (!ready) {
    return (
      <div className="shell"><div className="status-card">Loading local study data...</div></div>
    );
  }

  if (error) {
    return (
      <div className="shell"><div className="status-card status-card--danger">{error}</div></div>
    );
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>

      {!meta.disclaimerSeen && (
        <section className="modal-backdrop" aria-label="Study aid disclaimer">
          <div className="modal-card">
            <div className="eyebrow" style={{ color: 'var(--goldtext)' }}>Independent study aid</div>
            <h2 className="modal-title">Before you begin</h2>
            <p className="modal-body">
              This practice app is not affiliated with or endorsed by ABTC or PSI, does not reproduce real exam items, and must not be used for patient-care decisions. Practice results are unofficial estimates only.
            </p>
            <button className="btn btn--primary btn--large" onClick={() => void acknowledgeDisclaimer()}>I understand</button>
          </div>
        </section>
      )}

      {sessionReplacePromptOpen && (
        <section className="modal-backdrop" aria-label="Unfinished session">
          <div className="modal-card modal-card-sm">
            <h2 className="modal-title-sm">Session in progress</h2>
            <p className="modal-body">You already have a session in progress. Continue it or start a new session with your current setup.</p>
            {pendingSessionSettings && (
              <p className="modal-hint">New session: {pendingSessionSettings.mode === 'exam' ? 'Exam' : 'Study'} · {pendingSessionSettings.questionCount} items</p>
            )}
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={dismissSessionReplacePrompt}>Cancel</button>
              <button className="btn btn--secondary" onClick={replaceActiveSession}>Start new</button>
              <button className="btn btn--primary" onClick={resumeExistingSession}>Resume current</button>
            </div>
          </div>
        </section>
      )}

      {confirmSubmitOpen && session && (
        <section className="modal-backdrop" aria-label="Submit session">
          <div className="modal-card modal-card-sm">
            <h2 className="modal-title-sm">{session.settings.mode === 'exam' ? 'Submit exam?' : 'Finish session?'}</h2>
            <p className="modal-body">
              {session.items.length - answeredCount > 0
                ? `You have ${session.items.length - answeredCount} unanswered item(s). ${session.settings.mode === 'exam' ? 'There is no guessing penalty in this practice result.' : ''}`
                : `You've answered all items. ${session.settings.mode === 'exam' ? 'Submit to score the results?' : 'Finish to save your progress?'}`
              }
            </p>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={() => setConfirmSubmitOpen(false)}>Keep going</button>
              <button className="btn btn--primary" onClick={() => void submitSession()} disabled={isFinalizing}>
                {session.settings.mode === 'exam' ? 'Submit' : 'Finish'}
              </button>
            </div>
          </div>
        </section>
      )}

      {flagDraft && (
        <section className="modal-backdrop" aria-label="Flag this item">
          <div className="modal-card modal-card-sm">
            <h2 className="modal-title-sm">{flagDraft.existingId ? 'Edit flag' : 'Report an issue'}</h2>
            <div className="form-field">
              <label className="form-label">Reason</label>
              <select value={flagDraft.reason} onChange={(e) => setFlagDraft({ ...flagDraft, reason: e.target.value as FlagReason })}>
                {FLAG_REASONS.map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Comment</label>
              <textarea rows={4} value={flagDraft.comment} onChange={(e) => setFlagDraft({ ...flagDraft, comment: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={() => setFlagDraft(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={() => void saveFlagDraft()}>
                {flagDraft.existingId ? 'Save changes' : 'Save flag'}
              </button>
            </div>
          </div>
        </section>
      )}

      {destructiveConfirm && (
        <section className="modal-backdrop" aria-label="Confirm action">
          <div className="modal-card modal-card-sm">
            <h2 className="modal-title-sm">{destructiveConfirm.title}</h2>
            <p className="modal-body">{destructiveConfirm.body}</p>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={() => setDestructiveConfirm(null)}>Cancel</button>
              <button className="btn btn--destructive" onClick={() => destructiveConfirm.run()}>{destructiveConfirm.cta}</button>
            </div>
          </div>
        </section>
      )}

      <header className="header-bar" role="banner">
        <div className="header-brand">
          <span className="header-brand-tile">C</span>
          <span className="header-brand-word">CCTC Practice</span>
        </div>
        <div className="header-nav">
          <button
            className={`header-btn${view === 'home' ? ' active' : ''}`}
            onClick={startView}
            title="Home"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span className="header-btn-label">Home</span>
          </button>
          <button
            className={`header-btn${view === 'progress' ? ' active' : ''}`}
            onClick={() => setView('progress')}
            title="Progress"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4zm2 2H5V5h14v14zm0-16H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>
            <span className="header-btn-label">Progress</span>
          </button>
          {meta.examDate && (
            <button className="header-days-btn" onClick={() => { setView('home'); setCustomizeOpen(true); setTimeout(() => document.getElementById('customize-anchor')?.scrollIntoView({ behavior: 'instant' }), 50); }} title="Set exam date">
              <span className="hd-num">{examDateDays !== null ? (examDateDays < 0 ? 'Past' : examDateDays) : '—'}</span>
              <span className="hd-label">To exam</span>
            </button>
          )}
          {activeSession && !activeSession.submittedAt && (
            <button className="header-btn header-btn-primary" onClick={resumeExistingSession} title="Resume session">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              <span className="header-btn-label" style={{ color: 'var(--tealtext)' }}>Resume</span>
            </button>
          )}
          <button className="header-btn" onClick={applyThemeToggle} title={meta.theme === 'night' ? 'Switch to day mode' : 'Switch to night mode'}>
            <span style={{ fontSize: '16px', lineHeight: '18px' }}>{meta.theme === 'night' ? '\u2600' : '\u263E'}</span>
            <span className="header-btn-label">{meta.theme === 'night' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </header>

      <main id="main-content" className={view === 'session' || view === 'progress' ? 'page page-wide' : 'page'}>
        {view === 'home' && (
          <>
            {activeSession && !activeSession.submittedAt && (
              <div className="resume-banner">
                <div>
                  <div className="resume-banner-text">Resume your session</div>
                  <div className="resume-banner-meta">Item {activeSession.currentIndex + 1} of {activeSession.items.length} · {activeSession.settings.mode === 'exam' ? 'Exam' : 'Study'} mode</div>
                </div>
                <button className="btn" style={{ background: '#fff', color: 'var(--teal)', fontWeight: 600 }} onClick={resumeExistingSession}>Resume</button>
              </div>
            )}

            <p className="eyebrow">{banks.standard.questions.length} items · {getBlueprintLabel('cctc-from-2026-07') === 'CCTC Detailed Content Outline (effective 2026-07-01)' ? '175' : getBlueprint(settings.blueprintId).default_exam_items}-item exam, {getBlueprint(settings.blueprintId).default_time_minutes} min</p>
            <h1 className="page-h1">Welcome back</h1>
            <p className="page-subhead">
              {meta.examDate ? (examDateDays !== null && examDateDays >= 0 ? `${examDateDays} days to your exam` : 'Your exam date has passed') : (
                <button className="btn--link-style" style={{ background: 'none', border: 'none', color: 'var(--tealtext)', cursor: 'pointer', font: 'inherit', textDecoration: 'underline', padding: 0 }} onClick={() => { setCustomizeOpen(true); setTimeout(() => document.getElementById('customize-anchor')?.scrollIntoView({ behavior: 'instant' }), 50); }}>Set your exam date</button>
              )}
            </p>

            <div className="row-2col" style={{ marginTop: '20px' }}>
              <div className="ready-card">
                <div className="ready-donut-row">
                  <div className="ready-donut">
                    <svg viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="42" fill="none" stroke="var(--ring)" strokeWidth="10" />
                      {readiness !== null && (
                        <circle cx="48" cy="48" r="42" fill="none" stroke={computeDonutColor(readiness)} strokeWidth="10"
                          strokeDasharray={`${computeDonutStrokeDash(readiness)} 263.89`} strokeLinecap="round" />
                      )}
                    </svg>
                    <div className="ready-donut-center">{readiness !== null ? `${Math.round(readiness)}` : '\u2014'}</div>
                  </div>
                  <div className="ready-info">
                    <div className="ready-label-row">
                      <span className="ready-label">Practice readiness</span>
                      <span className={`badge ${insight.badgeClass}`}>{insight.badge}</span>
                    </div>
                    <div className="ready-hint">
                      Weighted recent exam average
                      <button className="ready-hint-btn" onClick={() => setReadyInfoOpen(!readyInfoOpen)}>i</button>
                      {readyInfoOpen && (
                        <span className="ready-tooltip">Exponential moving average of your exam-mode session scores, weighing recent sessions more heavily. Study mode sessions are excluded.</span>
                      )}
                    </div>
                    {readinessDelta !== null && (
                      <div className="delta-badge" style={{ color: readinessDelta >= 0 ? 'var(--successtext)' : 'var(--dangertext)' }}>
                        {readinessDelta >= 0 ? '+' : ''}{readinessDelta} pts from prior
                      </div>
                    )}
                  </div>
                </div>

                <div className="insight-card">
                  <p className="insight-text">{insight.verdict}</p>
                  <button className="insight-action" onClick={launchInsightAction}>{insight.actionLabel}</button>
                </div>

                <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span className="section-label">Domains</span>
                  </div>
                  {domainEmas.map((d) => (
                    <div key={d.domainId} className="domain-row">
                      <span className="domain-label">
                        {d.domainName}
                        <span className="chipper chipper--teal">{d.domainWeightPct}%</span>
                      </span>
                      <span className="domain-right">
                        <span className={`badge ${d.status === 'strong' ? 'badge--success' : d.status === 'developing' ? 'badge--gold' : d.status === 'weak' ? 'badge--danger' : 'badge--muted'}`}>{d.statusLabel}</span>
                        <span style={{ font: '600 12px var(--sans)', color: 'var(--muted)', minWidth: '32px', textAlign: 'right' }}>{d.ema !== null ? `${Math.round(d.ema)}%` : '\u2014'}</span>
                      </span>
                    </div>
                  ))}
                  {domainEmas.map((d) => (
                    <div key={`bar-${d.domainId}`} className="domain-bar-bg" style={{ marginBottom: d.domainId < 3 ? '10px' : 0 }}>
                      <div
                        className={`domain-bar-fill ${d.status === 'strong' ? 'domain-bar-fill--strong' : d.status === 'developing' ? 'domain-bar-fill--developing' : d.status === 'weak' ? 'domain-bar-fill--weak' : ''}`}
                        style={{ width: `${d.ema !== null ? Math.min(100, Math.round(d.ema)) : 0}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="section-label" style={{ marginBottom: '12px' }}>Quick start</div>
                <div className="quick-card-list">
                  <button className="quick-card" onClick={presetFull}>
                    <div className="quick-card-title">Full mock exam</div>
                    <div className="quick-card-sub">{getBlueprint(settings.blueprintId).default_exam_items} items · {getBlueprint(settings.blueprintId).default_time_minutes} min · {getBlueprintLabel(settings.blueprintId)}</div>
                  </button>
                  <button className="quick-card" onClick={presetQuick}>
                    <div className="quick-card-title">Quick exam</div>
                    <div className="quick-card-sub">25 questions · 30 min · Exam mode</div>
                  </button>
                  <button className="quick-card" onClick={presetWeak}>
                    <div className="quick-card-title">Weak areas</div>
                    <div className="quick-card-sub">
                      {weakDomains.length > 0
                        ? `${weakDomains.length} domain(s) below ${targetThreshold}% · Study mode`
                        : 'All domains on target · Study mode'}
                    </div>
                  </button>
                </div>

                {meta.lastCustomSettings && (
                  <button className="recent-custom-tile" onClick={launchRecentCustom}>
                    <div>
                      <span className="recent-custom-label">Your last custom setup</span>
                      <span className="recent-custom-summary">
                        {meta.lastCustomSettings.mode === 'exam' ? 'Exam' : 'Study'} · {meta.lastCustomSettings.questionCount} items
                        {meta.lastCustomSettings.timed ? ` · ${meta.lastCustomSettings.timeMinutes} min` : ' · Untimed'}
                      </span>
                    </div>
                    <span style={{ color: 'var(--tealtext)', fontSize: '13px', fontWeight: 600 }}>Start \u2192</span>
                  </button>
                )}

                <button className="expand-toggle" onClick={() => { if (!customizeOpen) syncCustomizeFromSettings(); setCustomizeOpen(!customizeOpen); }}>
                  <span className="expand-toggle-label">Customize a session</span>
                  <span style={{ fontSize: '18px', color: 'var(--muted)' }}>{customizeOpen ? '\u2212' : '+'}</span>
                </button>

                {customizeOpen && (
                  <div className="customize-form" id="customize-anchor">
                    <div className="form-field">
                      <label className="form-label">Mode</label>
                      <div className="seg-control">
                        <button className={`seg-btn${settings.mode === 'exam' ? ' active' : ''}`} onClick={() => handleModeChange('exam')}>Exam</button>
                        <button className={`seg-btn${settings.mode === 'study' ? ' active' : ''}`} onClick={() => handleModeChange('study')}>Study</button>
                      </div>
                    </div>

                    <div className="form-field">
                      <label className="form-label">Question set</label>
                      <div className="seg-control">
                        <button className={`seg-btn${questionSetLocal === 'standard' ? ' active' : ''}`} onClick={() => { setQuestionSetLocal('standard'); persistSettings({ ...settings, questionSet: 'standard' }); }}>Standard bank</button>
                        <button className={`seg-btn${questionSetLocal === 'scenario' ? ' active' : ''}`} onClick={() => { setQuestionSetLocal('scenario'); persistSettings({ ...settings, questionSet: 'scenario' }); }}>Scenarios</button>
                      </div>
                    </div>

                    <div className="form-field">
                      <label className="form-label">Focus</label>
                      <div className="domain-chips">
                        {domainEmas.map((d) => (
                          <button
                            key={d.domainId}
                            className={`domain-chip${focusDomainsLocal.includes(d.domainId) ? ' active' : ''}`}
                            onClick={() => toggleDomainFocus(d.domainId)}
                          >
                            {d.domainShort}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-field">
                      <label className="form-label">Question count</label>
                      <input
                        type="number"
                        min={Math.min(QUESTION_MIN, Math.max(1, availableForCustomize))}
                        max={Math.max(availableForCustomize, 1)}
                        value={settings.questionCount}
                        onChange={(e) => persistSettings({ ...settings, questionCount: clampQuestionCount(Number(e.target.value) || 0, availableForCustomize) })}
                      />
                      <div className="form-hint">Available: {availableForCustomize}</div>
                    </div>

                    <div className="form-field">
                      <label className="form-label">Time limit</label>
                      <input
                        type="number" min={1}
                        value={settings.timeMinutes}
                        onChange={(e) => persistSettings({ ...settings, timeMinutes: Math.max(1, Number(e.target.value) || 1) })}
                        disabled={!settings.timed}
                      />
                    </div>

                    <div className="form-field">
                      <label className="form-label">Timed</label>
                      <div className="toggle-row">
                        <button className={`toggle${settings.timed ? ' on' : ''}`} onClick={() => persistSettings({ ...settings, timed: !settings.timed })}>
                          <span className="toggle-knob" />
                        </button>
                        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{settings.timed ? 'Timer enabled' : 'Untimed session'}</span>
                      </div>
                    </div>

                    {settings.timed && (
                      <div className="form-field">
                        <label className="form-label">Show timer</label>
                        <div className="toggle-row">
                          <button className={`toggle${settings.showTimer ? ' on' : ''}`} onClick={() => persistSettings({ ...settings, showTimer: !settings.showTimer })}>
                            <span className="toggle-knob" />
                          </button>
                          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{settings.showTimer ? 'Visible during session' : 'Hidden during session'}</span>
                        </div>
                      </div>
                    )}

                    <details className="form-field">
                      <summary style={{ font: '600 12px var(--sans)', color: 'var(--muted)', cursor: 'pointer', padding: '8px 0' }}>Exam preferences &amp; advanced</summary>
                      <div style={{ paddingTop: '8px' }}>
                        <div className="form-field">
                          <label className="form-label">Exam date</label>
                          <input
                            type="date"
                            value={meta.examDate ?? ''}
                            onChange={(e) => persistMeta({ examDate: e.target.value || undefined })}
                          />
                        </div>
                        <div className="form-field">
                          <label className="form-label">Target score: {targetThreshold}%</label>
                          <input
                            type="range" min={50} max={90} value={targetThreshold}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              persistMeta({ targetThreshold: v });
                              persistSettings({ ...settings, targetThreshold: v });
                            }}
                          />
                          <div className="form-hint">Sets the pass/below line for readiness and results.</div>
                        </div>
                        <div className="form-field">
                          <label className="form-label">Blueprint version</label>
                          <select value={settings.blueprintId} onChange={(e) => {
                            const bp = getBlueprint(e.target.value as BlueprintId);
                            persistSettings({ ...settings, blueprintId: e.target.value as BlueprintId, questionCount: clampQuestionCount(settings.questionCount, availableForCustomize), timeMinutes: bp.default_time_minutes });
                          }}>
                            <option value="cctc-from-2026-07">2026-07 (default)</option>
                            <option value="cctc-thru-2026-06">Until 2026-06</option>
                          </select>
                        </div>
                        <div className="form-field">
                          <label className="form-label">Include draft items</label>
                          <div className="toggle-row">
                            <button
                              className={`toggle${settings.includeDrafts ? ' on' : ''}`}
                              onClick={() => {
                                if (settings.mode === 'exam') return;
                                persistSettings({ ...settings, includeDrafts: !settings.includeDrafts });
                              }}
                              disabled={settings.mode === 'exam'}
                            >
                              <span className="toggle-knob" />
                            </button>
                            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                              {settings.mode === 'exam' ? 'Exam mode defaults to reviewed-only' : settings.includeDrafts ? 'Drafts included' : 'Reviewed only'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </details>

                    <button className="btn btn--primary btn--large" style={{ width: '100%', marginTop: '8px' }} onClick={launchCustomize}>
                      {settings.mode === 'exam' ? 'Start exam' : 'Start study'} · {settings.questionCount} items
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="card" style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span className="section-label">Recent sessions</span>
                {history.length > 0 && (
                  <button className="btn--link-style" style={{ background: 'none', border: 'none', color: 'var(--tealtext)', font: '600 12px var(--sans)', cursor: 'pointer' }} onClick={openProgressFromHome}>View all history \u2192</button>
                )}
              </div>
              {history.length === 0 ? (
                <div className="status-card">No sessions yet. Take a quick exam to get started.</div>
              ) : (
                <table className="recent-table">
                  <thead>
                    <tr>
                      <th>Date</th><th>Mode</th><th>Questions</th><th>Score</th><th>Result</th><th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 5).map((entry) => (
                      <tr key={entry.id} onClick={() => { openReviewFromHistory(entry); }}>
                        <td>{shortDate(entry.completedAt)}</td>
                        <td><span className={`badge ${entry.settings.mode === 'exam' ? 'badge--teal' : 'badge--gold'}`}>{entry.settings.mode === 'exam' ? 'Exam' : 'Study'}</span></td>
                        <td>{entry.result.total}</td>
                        <td style={{ color: entry.result.estimatedPass ? 'var(--successtext)' : 'var(--dangertext)', fontWeight: 600 }}>{entry.result.percent}%</td>
                        <td><span className={`badge ${entry.result.estimatedPass ? 'badge--success' : 'badge--danger'}`}>{entry.result.estimatedPass ? 'Pass' : 'Below'}</span></td>
                        <td>{formatElapsedMinutes(entry.timeUsedSeconds)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {view === 'session' && session && currentItem && (
          <>
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="session-header">
                <div className="session-header-left">
                  <button className="btn btn--ghost" onClick={() => { if (session.submittedAt) { startView(); } else if (answeredCount > 0) { openSubmitConfirm(); } else { startView(); } }}>
                    Exit
                  </button>
                  <span className="session-header-title">Item {session.currentIndex + 1} of {session.items.length}</span>
                </div>
                <div className="session-header-right">
                  <button className="btn btn--ghost" onClick={toggleBookmark}>
                    {session.flaggedForReview.includes(currentItem.itemId) ? '\u2605' : '\u2606'}
                  </button>
                  <button className="btn btn--ghost" onClick={() => openFlagComposer(currentItem.question, session.id, session.settings.blueprintId, session.settings.mode)}>
                    \u22EF
                  </button>
                </div>
              </div>
              <div className="progress-bar" style={{ margin: '12px 0' }}>
                <div className="progress-bar-fill" style={{ width: `${((session.currentIndex + 1) / session.items.length) * 100}%` }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <span className="badge badge--teal">{currentItem.categoryLabel}</span>
                <span className="badge badge--muted">{currentItem.question.type === 'one_best' ? 'Single best answer' : 'Complex combo'}</span>
                {session.settings.timed && session.remainingSeconds !== null && !session.timerHidden && (
                  <span className="timer-pill">{formatDuration(session.remainingSeconds)}</span>
                )}
              </div>

              <div className="question-stem">{currentItem.question.stem}</div>

              {currentItem.question.elements && (
                <ol className="element-list">
                  {currentItem.question.elements.map((el) => (
                    <li key={el.id}><strong>{el.id}.</strong> {el.text}</li>
                  ))}
                </ol>
              )}

              <div className="option-list" role="radiogroup" aria-label="Answer choices">
                {currentItem.optionOrder.map((optionId, optionIndex) => {
                  const option = currentItem.question.options.find((o) => o.id === optionId)!;
                  const displayLetter = displayLetterForIndex(optionIndex);
                  const selected = session.answers[currentItem.itemId] === option.id;
                  const revealed = session.settings.mode === 'study' ? session.revealed[currentItem.itemId] : Boolean(session.submittedAt);
                  const correct = currentItem.question.correct === option.id;

                  return (
                    <button
                      key={option.id}
                      className={[
                        'option-btn',
                        selected ? 'is-selected' : '',
                        revealed && correct ? 'is-correct' : '',
                        revealed && selected && !correct ? 'is-incorrect' : ''
                      ].filter(Boolean).join(' ')}
                      role="radio"
                      aria-checked={selected}
                      aria-label={`${displayLetter}. ${option.text}`}
                      onClick={() => { if (!session.submittedAt) handleAnswer(option.id); }}
                    >
                      <span className="option-letter">{displayLetter}</span>
                      <span>
                        {option.text}
                        {option.selects && <small style={{ display: 'block', marginTop: '4px', color: 'var(--muted)', fontSize: '12px' }}>Selects: {option.selects.join(', ')}</small>}
                      </span>
                    </button>
                  );
                })}
              </div>

              {((session.settings.mode === 'study' && session.revealed[currentItem.itemId]) || session.submittedAt) && (
                <div className="explanation-block">
                  <p>
                    <strong>Correct answer ({displayLetterForOptionId(currentItem.optionOrder, currentItem.question.correct)}):</strong>{' '}
                    {currentItem.question.explanation.rationale_correct}
                  </p>
                  <ul>
                    {incorrectRationalesForDisplay(currentItem).map(({ displayLetter, rationale }) => (
                      <li key={displayLetter}><strong>{displayLetter}:</strong> {rationale}</li>
                    ))}
                  </ul>
                  <References question={currentItem.question} />
                </div>
              )}

              <div className="question-nav" style={{ marginTop: '16px' }}>
                <div className="action-row">
                  <button className="btn btn--secondary" onClick={() => navigateSession(-1)} disabled={session.currentIndex === 0}>Previous</button>
                  <button className="btn btn--secondary" onClick={() => navigateSession(1)} disabled={session.currentIndex === session.items.length - 1}>Next</button>
                </div>
                <div className="action-row">
                  {!session.submittedAt ? (
                    <button className="btn btn--primary" onClick={openSubmitConfirm} disabled={isFinalizing}>
                      {session.settings.mode === 'exam' ? 'Submit' : 'Finish'}
                    </button>
                  ) : (
                    <button className="btn btn--primary" onClick={startView}>Back to home</button>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="section-label" style={{ marginBottom: '10px' }}>Question map</div>
              <div className="question-map">
                {session.items.map((item, index) => {
                  const itemAnswer = session.answers[item.itemId];
                  const isCorrect = itemAnswer === item.question.correct;
                  const isWrong = itemAnswer && itemAnswer !== item.question.correct;
                  const bookmarked = session.flaggedForReview.includes(item.itemId);

                  let chipClass = 'question-map-chip';
                  if (index === session.currentIndex) chipClass += ' current';
                  if (isCorrect) chipClass += ' answered';
                  if (isWrong) chipClass += ' answered-wrong';
                  if (bookmarked) chipClass += ' bookmarked';

                  return (
                    <button key={item.itemId} className={chipClass} onClick={() => mutateSession((c) => ({ ...c, currentIndex: index }))}>
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {view === 'progress' && !selectedHistory && (
          <>
            <div className="section-label">Performance</div>
            <h1 className="page-h1">Progress</h1>

            <div className="card" style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                <span className="card-title-sm">Score trend</span>
                <div className="seg-control">
                  <button className={`seg-btn${progressFilter === 'exam' ? ' active' : ''}`} onClick={() => setProgressFilter('exam')}>Exam</button>
                  <button className={`seg-btn${progressFilter === 'study' ? ' active' : ''}`} onClick={() => setProgressFilter('study')}>Study</button>
                  <button className={`seg-btn${progressFilter === 'both' ? ' active' : ''}`} onClick={() => setProgressFilter('both')}>Both</button>
                </div>
              </div>

              {scoreTrendPointsForScope.length === 0 ? (
                <div className="status-card">No {progressFilter === 'both' ? '' : progressFilter} sessions yet.</div>
              ) : (
                <>
                  <div className="trend-summary">
                    {scopeStats.average !== null && (
                      <div className="trend-summary-item">
                        <p className="eyebrow">Average</p>
                        <strong>{scopeStats.average}%</strong>
                      </div>
                    )}
                    {scopeStats.best !== null && (
                      <div className="trend-summary-item">
                        <p className="eyebrow">Best</p>
                        <strong>{scopeStats.best}%</strong>
                      </div>
                    )}
                    {scopeStats.latest !== null && (
                      <div className="trend-summary-item">
                        <p className="eyebrow">Latest</p>
                        <strong>{scopeStats.latest}%</strong>
                      </div>
                    )}
                  </div>

                  {stackedAreaData.length >= 2 && progressFilter === 'exam' ? (
                    <div className="trend-chart-area" style={{ marginTop: '12px' }}>
                      <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={stackedAreaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--line2)" />
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={{ stroke: 'var(--line)' }} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={{ stroke: 'var(--line)' }} tickLine={false} />
                          <Tooltip
                            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '10px', fontSize: '12px' }}
                            labelStyle={{ color: 'var(--ink)', fontWeight: 600 }}
                          />
                          <ReferenceLine y={targetThreshold} stroke="var(--goldtext)" strokeDasharray="6 4" />
                          {stackedAreaData[0]?.d1 !== undefined && (
                            <Area type="monotone" dataKey="d1" stackId="1" stroke="#006652" fill="#006652" fillOpacity={0.35} />
                          )}
                          {stackedAreaData[0]?.d2 !== undefined && (
                            <Area type="monotone" dataKey="d2" stackId="1" stroke="#a75c00" fill="#a75c00" fillOpacity={0.35} />
                          )}
                          {stackedAreaData[0]?.d3 !== undefined && (
                            <Area type="monotone" dataKey="d3" stackId="1" stroke="#6364c0" fill="#6364c0" fillOpacity={0.35} />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="trend-chart-bar" style={{ marginTop: '12px' }}>
                      <div className="trend-chart-bar__plot">
                        {targetThreshold > 0 && (
                          <div className="trend-chart-bar__target" style={{ bottom: `${targetThreshold}%` }}>
                            <span className="trend-chart-bar__target-label">Target {targetThreshold}%</span>
                          </div>
                        )}
                        {scoreTrendPointsForScope.map((point) => (
                          <div key={point.id} className="trend-chart-bar__bar-wrap">
                            <div className={`trend-chart-bar__bar${point.belowTarget ? ' below-target' : ''}`}
                              style={{ height: `${point.percent}%` }} title={`${point.label}: ${point.percent}%`} />
                          </div>
                        ))}
                      </div>
                      <div className="trend-chart-bar__labels">
                        {scoreTrendPointsForScope.map((point) => (
                          <span key={point.id} className="trend-chart-bar__label">{point.label}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {historyCategories.length > 0 && (
              <div className="card" style={{ marginTop: '20px' }}>
                <span className="card-title-sm" style={{ display: 'block', marginBottom: '10px' }}>Category drill-down</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {historyCategories.map((cat) => (
                    <button
                      key={cat.categoryId}
                      className={`pill${selectedCategoryId === cat.categoryId ? ' badge--teal' : ''}`}
                      onClick={() => setSelectedCategoryId(cat.categoryId)}
                    >
                      {cat.categoryLabel}
                    </button>
                  ))}
                </div>
                {categoryTrend && (
                  <div className="trend-chart-bar" style={{ marginTop: '8px' }}>
                    <div className="trend-chart-bar__plot">
                      {categoryTrend.points.map((point) => (
                        <div key={point.sessionId} className="trend-chart-bar__bar-wrap">
                          <div className={`trend-chart-bar__bar${point.belowTarget ? ' below-target' : ''}`}
                            style={{ height: `${point.percent}%` }} title={`${point.label}: ${point.percent}%`} />
                        </div>
                      ))}
                    </div>
                    <div className="trend-chart-bar__labels">
                      {categoryTrend.points.map((point) => (
                        <span key={point.sessionId} className="trend-chart-bar__label">{point.label}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', marginBottom: '12px' }}>
              <span className="section-label">All sessions</span>
              <div className="action-row">
                {flags.length > 0 && (
                  <button className="btn btn--ghost" onClick={() => setView('flags')}>Manage flags ({flags.length}) \u2192</button>
                )}
                {history.length > 0 && (
                  <button className="btn btn--ghost" onClick={openClearHistoryConfirm}>Clear history</button>
                )}
              </div>
            </div>

            {history.length === 0 ? (
              <div className="status-card">No sessions yet.</div>
            ) : (
              history.map((entry) => (
                <div key={entry.id} className="history-row" onClick={() => openReviewFromHistory(entry)} style={{ marginBottom: '10px' }}>
                  <button className="history-row-delete" onClick={(e) => { e.stopPropagation(); openDeleteHistoryConfirm(entry.id); }} title="Delete session">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  </button>
                  <div className="history-row-top">
                    <div>
                      <div style={{ font: '600 14px var(--sans)', color: 'var(--ink)', marginBottom: '4px' }}>
                        {fullDateTime(entry.completedAt)}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', fontSize: '12.5px', color: 'var(--muted)' }}>
                        <span className={`badge ${entry.settings.mode === 'exam' ? 'badge--teal' : 'badge--gold'}`}>{entry.settings.mode === 'exam' ? 'Exam' : 'Study'}</span>
                        <span>{entry.result.total} items</span>
                        <span>{formatElapsedMinutes(entry.timeUsedSeconds)}</span>
                        <span>{getBlueprintLabel(entry.settings.blueprintId).includes('2026-07') ? '2026-07' : '2026-06'}</span>
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '14px', fontWeight: 600, color: entry.result.estimatedPass ? 'var(--successtext)' : 'var(--dangertext)' }}>
                        {entry.result.percent}% · {entry.result.correct}/{entry.result.total} correct
                      </div>
                    </div>
                  </div>
                  <div className="history-domain-grid">
                    {entry.result.breakdown.map((b) => {
                      const dId = Number(b.categoryId);
                      const domainDef = domainEmas.find((d) => d.domainId === dId);
                      const pct = b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0;
                      const dStatus = pct >= targetThreshold ? 'strong' : pct >= targetThreshold - 15 ? 'developing' : 'weak';
                      return (
                        <div key={b.categoryId} className="history-domain-mini">
                          <h4>D{dId} · {domainDef?.domainShort ?? b.categoryLabel}</h4>
                          <p>{b.correct}/{b.total}</p>
                          <div className="history-domain-minibar">
                            <div
                              className="history-domain-minibar-fill"
                              style={{
                                width: `${pct}%`,
                                background: dStatus === 'strong' ? 'var(--success)' : dStatus === 'developing' ? 'var(--gold)' : 'var(--danger)'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {view === 'progress' && selectedHistory && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <button className="btn btn--ghost" onClick={() => { setSelectedHistory(null); setReviewIndex(0); }}>\u2190 Back to Progress</button>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="review-filter-bar">
                  {(['all', 'incorrect', 'correct'] as const).map((f) => {
                    const counts = {
                      all: selectedHistory.items.length,
                      incorrect: selectedHistory.items.filter((item) => {
                        const ans = selectedHistory.answers[item.itemId];
                        return ans && ans !== item.question.correct;
                      }).length,
                      correct: selectedHistory.items.filter((item) => {
                        const ans = selectedHistory.answers[item.itemId];
                        return ans && ans === item.question.correct;
                      }).length
                    };
                    return (
                      <button
                        key={f}
                        className={`seg-btn${reviewFilter === f ? ' active' : ''}`}
                        onClick={() => setReviewFilter(f)}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="card" style={{
              background: 'var(--teal)', border: 'none', borderRadius: '18px', padding: '32px 28px',
              color: '#fff', marginBottom: '16px'
            }}>
              <div style={{ font: '600 13px var(--sans)', opacity: .8, marginBottom: '8px' }}>{selectedHistory.settings.mode === 'exam' ? 'Exam' : 'Study'} session</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: '60px', fontWeight: 600, lineHeight: 1.05, color: '#fff', margin: '8px 0 6px' }}>
                {selectedHistory.result.percent}%
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,.85)' }}>
                {selectedHistory.result.correct}/{selectedHistory.result.total} correct · {formatElapsedMinutes(selectedHistory.timeUsedSeconds)}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <span className={`badge ${selectedHistory.result.estimatedPass ? 'badge--success' : 'badge--danger'}`}>
                  {selectedHistory.result.estimatedPass ? 'At or above target' : 'Below target'}
                </span>
              </div>
              <div className="breakdown-list">
                {selectedHistory.result.breakdown.map((b) => {
                  const pct = b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0;
                  return (
                    <div key={b.categoryId} className="breakdown-row">
                      <span>{b.categoryLabel}</span>
                      <span style={{ fontWeight: 600 }}>{b.correct}/{b.total} · {pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <div className="section-label" style={{ marginBottom: '14px' }}>Review answers</div>
              <div className="review-filter-bar" style={{ marginBottom: '14px' }}>
                {(['all', 'incorrect', 'correct'] as const).map((f) => {
                  const counts = {
                    all: selectedHistory.items.length,
                    incorrect: selectedHistory.items.filter((item) => {
                      const ans = selectedHistory.answers[item.itemId];
                      return ans && ans !== item.question.correct;
                    }).length,
                    correct: selectedHistory.items.filter((item) => {
                      const ans = selectedHistory.answers[item.itemId];
                      return ans && ans === item.question.correct;
                    }).length
                  };
                  return (
                    <button key={f} className={`seg-btn${reviewFilter === f ? ' active' : ''}`} onClick={() => setReviewFilter(f)}>
                      {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
                    </button>
                  );
                })}
                <div style={{ width: '1px', height: '20px', background: 'var(--line2)', margin: '0 4px' }} />
                <button className={`seg-btn${reviewDomain === 'all' ? ' active' : ''}`} onClick={() => setReviewDomain('all')}>All</button>
                {domainEmas.map((d) => (
                  <button key={d.domainId} className={`seg-btn${reviewDomain === d.domainId ? ' active' : ''}`} onClick={() => setReviewDomain(d.domainId as number)}>
                    {d.domainShort}
                  </button>
                ))}
              </div>

              <div className="question-map" style={{ marginBottom: '14px' }}>
                {selectedHistory.items.map((item, index) => {
                  const ans = selectedHistory.answers[item.itemId];
                  const isCorrect = ans === item.question.correct;
                  const isWrong = ans && ans !== item.question.correct;
                  let chipClass = 'question-map-chip';
                  if (index === reviewIndex) chipClass += ' current';
                  if (isCorrect) chipClass += ' answered';
                  if (isWrong) chipClass += ' answered-wrong';
                  return (
                    <button key={item.itemId} className={chipClass} onClick={() => setReviewIndex(index)}>
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              <div className="review-list">
                {selectedHistory.items.map((item, index) => {
                  const ans = selectedHistory.answers[item.itemId];
                  const isCorrect = ans === item.question.correct;
                  const isAnswered = Boolean(ans);
                  const matchesDomain = reviewDomain === 'all' || Number(item.categoryId) === reviewDomain;
                  const matchesFilter = reviewFilter === 'all' || (reviewFilter === 'correct' && isCorrect) || (reviewFilter === 'incorrect' && isAnswered && !isCorrect);
                  if (!matchesDomain || !matchesFilter) return null;

                  return (
                    <div key={item.itemId}>
                      <button className="review-collapsed" onClick={() => toggleReviewExpand(index)}>
                        <span className={`review-chip ${isCorrect ? 'review-chip--correct' : 'review-chip--incorrect'}`} style={!isAnswered ? { background: 'var(--letterbg)', color: 'var(--muted)' } : {}}>
                          {index + 1}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span className={`badge ${isCorrect ? 'badge--success' : 'badge--danger'}`} style={!isAnswered ? { background: 'var(--surface2)', color: 'var(--muted)' } : {}}>
                            {isAnswered ? (isCorrect ? 'Correct' : 'Incorrect') : 'Unanswered'}
                          </span>
                          <span className="badge badge--muted" style={{ marginLeft: '6px' }}>{item.categoryLabel}</span>
                          <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.question.stem}
                          </div>
                        </div>
                        <span style={{ color: 'var(--muted)', fontSize: '14px' }}>{expandedReview.has(index) ? '\u25B2' : '\u25BC'}</span>
                      </button>
                      {expandedReview.has(index) && (
                        <div className="review-expanded">
                          <div className="question-stem" style={{ marginBottom: '12px' }}>{item.question.stem}</div>
                          {item.question.elements && (
                            <ol className="element-list">
                              {item.question.elements.map((el) => (
                                <li key={el.id}><strong>{el.id}.</strong> {el.text}</li>
                              ))}
                            </ol>
                          )}
                          <div className="option-list" style={{ marginBottom: '16px' }}>
                            {item.optionOrder.map((optionId, oi) => {
                              const option = item.question.options.find((o) => o.id === optionId)!;
                              const selected = ans === option.id;
                              const correct = option.id === item.question.correct;
                              const letter = displayLetterForIndex(oi);
                              return (
                                <div
                                  key={option.id}
                                  className={[
                                    'option-btn',
                                    correct ? 'is-correct' : '',
                                    selected && !correct ? 'is-incorrect' : ''
                                  ].filter(Boolean).join(' ')}
                                  style={{ cursor: 'default' }}
                                >
                                  <span className="option-letter">{letter}</span>
                                  <span>
                                    {option.text}
                                    {correct && <span style={{ marginLeft: '8px', fontWeight: 600, color: 'var(--successtext)', fontSize: '12px' }}>Correct answer</span>}
                                    {selected && !correct && <span style={{ marginLeft: '8px', fontWeight: 600, color: 'var(--dangertext)', fontSize: '12px' }}>Your answer</span>}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="explanation-block">
                            <p><strong>Correct answer ({displayLetterForOptionId(item.optionOrder, item.question.correct)}):</strong> {item.question.explanation.rationale_correct}</p>
                            <ul>
                              {incorrectRationalesForDisplay(item).map(({ displayLetter, rationale }) => (
                                <li key={displayLetter}><strong>{displayLetter}:</strong> {rationale}</li>
                              ))}
                            </ul>
                            <References question={item.question} />
                          </div>
                          <div className="action-row" style={{ marginTop: '12px' }}>
                            <button className="btn btn--ghost" onClick={() => openFlagComposer(item.question, selectedHistory.id, selectedHistory.settings.blueprintId, selectedHistory.settings.mode)}>
                              Report an issue
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {view === 'flags' && (
          <>
            <div className="section-label">Review feedback</div>
            <h1 className="page-h1">Flags</h1>

            <div className="card" style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                <span className="card-title-sm">Reported items</span>
                <div className="action-row">
                  <button className="btn btn--secondary" onClick={() => void exportFlags()} disabled={flags.length === 0}>Export JSON</button>
                  <button className="btn btn--ghost" onClick={openClearFlagsConfirm} disabled={flags.length === 0}>Clear all</button>
                </div>
              </div>

              {flags.length === 0 ? (
                <div className="status-card">No reported items yet.</div>
              ) : (
                Object.entries(
                  flags.reduce<Record<string, ItemFlag[]>>((groups, flag) => {
                    groups[flag.item_id] = [...(groups[flag.item_id] ?? []), flag];
                    return groups;
                  }, {})
                ).map(([itemId, itemFlags]) => (
                  <div key={itemId} style={{ background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
                    <div style={{ font: '600 13px var(--sans)', color: 'var(--ink)', marginBottom: '8px' }}>{itemId}</div>
                    {itemFlags.map((flag) => (
                      <div key={flag.id} style={{ fontSize: '12.5px', color: 'var(--ink)', lineHeight: 1.5, padding: '8px 0', borderTop: '1px solid var(--line)' }}>
                        <div><strong>{flag.reason}</strong> · {flag.mode} · {getBlueprintLabel(flag.blueprint).includes('2026-07') ? '2026-07' : '2026-06'}</div>
                        <div style={{ color: 'var(--muted)', marginTop: '2px' }}>{flag.comment || 'No comment provided.'}</div>
                      </div>
                    ))}
                    <div className="action-row" style={{ marginTop: '10px' }}>
                      <button className="btn btn--secondary" onClick={() => {
                        const matchedQ = allQuestions.find((q) => q.id === itemId);
                        if (matchedQ) setFlagDraft(buildInitialFlagDraft(matchedQ, itemFlags[0].session_id, itemFlags[0].blueprint, itemFlags[0].mode, itemFlags[0]));
                      }}>Edit</button>
                      <button className="btn btn--ghost" onClick={() => openDeleteFlagConfirm(itemFlags[0].id)}>Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>

      <footer className="footer-bar">
        <p>
          This practice app is an independent study aid, not affiliated with or endorsed by ABTC or PSI, does not reproduce real exam questions, and is not a source of patient-care decisions.
        </p>
      </footer>
    </div>
  );
}

export default App;