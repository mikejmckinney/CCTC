import { useEffect, useMemo, useRef, useState } from 'react';
import { getBlueprint, getBlueprintLabel } from '../data/blueprints';
import { loadQuestionBanks } from '../data/questionBank';
import { buildDefaultSettings, countAnswered, createSession, isBlueprintApplicable } from '../lib/sessionAssembly';
import { buildRecentItemIds } from '../lib/sessionPersistence';
import { buildCategoryHistoryTrend, listHistoryCategories } from '../lib/categoryHistoryTrend';
import { buildHistoryTrend, formatTrendDelta } from '../lib/historyTrend';
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
import { AppShell } from '../components/layout';
import { DashboardView, SetupView, HistoryView, ReportedItemsView } from '../components/views';

type View = 'dashboard' | 'setup' | 'history' | 'reported-items' | 'session' | 'session-review';

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
  const [view, setView] = useState<View>('dashboard');
  const [meta, setMeta] = useState<AppMeta>({ disclaimerSeen: false });
  const [settings, setSettings] = useState<SessionSettings>(() => buildDefaultSettings('cctc-from-2026-07'));
  const bank = useMemo(
    () => (settings.questionSet === 'scenario' ? banks.scenario : banks.standard),
    [banks, settings.questionSet]
  );
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
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
        if (cancelled) return;
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
        if (!cancelled) setReady(true);
      });
    return () => { cancelled = true; };
  }, [allQuestions]);

  useEffect(() => {
    if (!ready) return;
    void saveSettings(settings);
  }, [ready, settings]);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

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
    const flushSession = () => {
      if (activeSession) void saveActiveSession(activeSession);
    };
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
        if (!current || current.id !== timedSessionId || current.submittedAt || current.remainingSeconds === null || current.remainingSeconds <= 0) {
          return current;
        }
        return updateSessionTimestamp({ ...current, remainingSeconds: Math.max(0, current.remainingSeconds - 1) });
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
    mutateSession((current) => ({ ...current, timerHidden: !current.timerHidden }));
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

  function startQuickSession(): void {
    const quickSettings = { ...settings, questionCount: 25, timed: false };
    beginNewSession(quickSettings);
  }

  function startWeakAreasSession(): void {
    const weakSettings = { ...settings, mode: 'study' as ExamMode, questionCount: 30 };
    beginNewSession(weakSettings);
  }

  function handleStartSession(mode: 'full' | 'quick' | 'weak'): void {
    if (mode === 'full') startSession();
    else if (mode === 'quick') startQuickSession();
    else startWeakAreasSession();
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
      setView('session-review');
    } finally {
      setIsFinalizing(false);
    }
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
      setView('history');
    }
  }

  async function acknowledgeDisclaimer(): Promise<void> {
    const nextMeta = { disclaimerSeen: true };
    setMeta(nextMeta);
    await saveMeta(nextMeta);
  }

  // ---- Loading / Error states ----
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading local study data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
      </div>
    );
  }

  // ---- Session view (full-screen, distraction-free) ----
  if (view === 'session' && session && currentItem) {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: 'var(--bg)' }}>
        {/* Disclaimer modal */}
        {!meta.disclaimerSeen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="w-full max-w-md rounded-2xl border p-6 shadow-xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Independent study aid</h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                This practice app is not affiliated with or endorsed by ABTC or PSI, does not reproduce real exam items, and must not be used for
                patient-care decisions. Practice results are unofficial estimates only.
              </p>
              <button
                className="mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
                onClick={() => void acknowledgeDisclaimer()}
              >
                I understand
              </button>
            </div>
          </div>
        )}

        {/* Session replace prompt */}
        {sessionReplacePromptOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="w-full max-w-md rounded-2xl border p-6 shadow-xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Unfinished session</h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                You already have a session in progress. Resume it, or start a new session (this discards in-progress answers).
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  onClick={() => { setSessionReplacePromptOpen(false); setPendingSessionSettings(null); }}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  onClick={() => {
                    const ns = pendingSessionSettings ?? settings;
                    setSessionReplacePromptOpen(false);
                    setPendingSessionSettings(null);
                    beginNewSession(ns);
                  }}
                >
                  New session
                </button>
                <button
                  className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold"
                  style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
                  onClick={() => { setSessionReplacePromptOpen(false); setPendingSessionSettings(null); setView('session'); }}
                >
                  Resume
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Flag composer */}
        {flagDraft && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="w-full max-w-md rounded-2xl border p-6 shadow-xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Report this item</h2>
              <div className="mt-4 flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Reason</span>
                  <select
                    value={flagDraft.reason}
                    onChange={(e) => setFlagDraft({ ...flagDraft, reason: e.target.value as FlagReason })}
                    className="rounded-lg border px-3 py-2.5 text-sm"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    {FLAG_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Comment</span>
                  <textarea
                    rows={3}
                    value={flagDraft.comment}
                    onChange={(e) => setFlagDraft({ ...flagDraft, comment: e.target.value })}
                    className="resize-none rounded-lg border px-3 py-2.5 text-sm"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </label>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  onClick={() => setFlagDraft(null)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold"
                  style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
                  onClick={() => void saveFlagDraft()}
                >
                  Save report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {session.settings.mode === 'exam' ? 'Exam' : 'Study'}
            </span>
            <span className="tabular-nums text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {session.currentIndex + 1} / {session.items.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {session.settings.timed && (
              <button
                type="button"
                onClick={toggleTimerHidden}
                className="rounded-lg px-2.5 py-1 text-xs font-medium tabular-nums"
                style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)' }}
              >
                {session.timerHidden ? 'Show timer' : formatDuration(session.remainingSeconds)}
              </button>
            )}
            <span className="rounded-lg px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--surface-raised)', color: 'var(--text-muted)' }}>
              {answeredCount} answered
            </span>
          </div>
        </header>

        {/* Question content */}
        <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-5 px-4 py-6">
          <div className="flex items-center gap-2">
            <span className="rounded px-2 py-0.5 text-[11px] font-medium" style={{ background: 'var(--brand-muted)', color: 'var(--primary)' }}>
              {currentItem.categoryLabel}
            </span>
            <span className="rounded px-2 py-0.5 text-[11px] font-medium" style={{ background: 'var(--surface-raised)', color: 'var(--text-muted)' }}>
              {currentItem.question.status}
            </span>
          </div>

          <h2 className="text-lg font-medium leading-relaxed" style={{ color: 'var(--text)' }}>
            {currentItem.question.stem}
          </h2>

          {currentItem.question.elements && (
            <ol className="flex flex-col gap-2 pl-4">
              {currentItem.question.elements.map((el) => (
                <li key={el.id} className="text-sm" style={{ color: 'var(--text)' }}>
                  <strong>{el.id}.</strong> {el.text}
                </li>
              ))}
            </ol>
          )}

          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Answer choices">
            {currentItem.optionOrder.map((optionId, optionIndex) => {
              const option = currentItem.question.options.find((o) => o.id === optionId)!;
              const displayLetter = displayLetterForIndex(optionIndex);
              const selected = session.answers[currentItem.itemId] === option.id;
              const revealed = session.settings.mode === 'study' ? session.revealed[currentItem.itemId] : Boolean(session.submittedAt);
              const correct = currentItem.question.correct === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleAnswer(option.id)}
                  className="flex items-start gap-3 rounded-xl border-2 p-4 text-left text-sm transition-all"
                  style={{
                    borderColor: revealed && correct ? 'var(--color-success)' : revealed && selected && !correct ? 'var(--color-danger)' : selected ? 'var(--primary)' : 'var(--border)',
                    background: revealed && correct ? 'var(--color-success-light)' : revealed && selected && !correct ? 'var(--color-danger-light)' : selected ? 'var(--brand-muted)' : 'var(--surface)',
                    color: 'var(--text)',
                  }}
                >
                  <span
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      background: selected ? 'var(--primary)' : 'var(--surface-raised)',
                      color: selected ? 'var(--primary-fg)' : 'var(--text-muted)',
                    }}
                  >
                    {displayLetter}
                  </span>
                  <span className="flex-1">{option.text}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation (study mode) */}
          {((session.settings.mode === 'study' && session.revealed[currentItem.itemId]) || session.submittedAt) && (
            <div
              className="rounded-xl border p-4"
              style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}
            >
              <p className="text-sm" style={{ color: 'var(--text)' }}>
                <strong>Correct answer ({displayLetterForOptionId(currentItem.optionOrder, currentItem.question.correct)}):</strong>{' '}
                {currentItem.question.explanation.rationale_correct}
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {incorrectRationalesForDisplay(currentItem).map(({ displayLetter, rationale }) => (
                  <li key={displayLetter} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <strong>{displayLetter}:</strong> {rationale}
                  </li>
                ))}
              </ul>
              {currentItem.question.references.length > 0 && (
                <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>References</p>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {currentItem.question.references.map((ref) => (
                      <li key={ref.citation} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {ref.url ? (
                          <a href={ref.url} target="_blank" rel="noreferrer" className="underline">{ref.citation}</a>
                        ) : ref.citation}
                        {ref.locator ? ` — ${ref.locator}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Session toolbar */}
          <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigateSession(-1)}
                disabled={session.currentIndex === 0}
                className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => navigateSession(1)}
                disabled={session.currentIndex === session.items.length - 1}
                className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                Next
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleBookmark}
                className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
                style={{
                  borderColor: session.flaggedForReview.includes(currentItem.itemId) ? 'var(--accent)' : 'var(--border)',
                  color: session.flaggedForReview.includes(currentItem.itemId) ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                {session.flaggedForReview.includes(currentItem.itemId) ? 'Bookmarked' : 'Bookmark'}
              </button>
              <button
                type="button"
                onClick={() => openFlagComposer(currentItem.question, session.id, session.settings.blueprintId, session.settings.mode)}
                className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Report
              </button>
              <button
                type="button"
                onClick={() => void finalizeSession()}
                disabled={isFinalizing}
                className="rounded-lg px-4 py-2 text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
              >
                {session.settings.mode === 'exam' ? 'Submit Exam' : 'Complete'}
              </button>
            </div>
          </div>

          {/* Question tracker */}
          <div className="flex flex-wrap gap-1 pt-2">
            {session.items.map((item, index) => {
              const answered = Boolean(session.answers[item.itemId]);
              const bookmarked = session.flaggedForReview.includes(item.itemId);
              return (
                <button
                  key={item.itemId}
                  type="button"
                  onClick={() => mutateSession((current) => ({ ...current, currentIndex: index }))}
                  className="flex h-7 w-7 items-center justify-center rounded text-[10px] font-medium tabular-nums transition-colors"
                  style={{
                    background: index === session.currentIndex ? 'var(--primary)' : answered ? 'var(--color-success-light)' : 'var(--surface-raised)',
                    color: index === session.currentIndex ? 'var(--primary-fg)' : answered ? 'var(--color-success)' : 'var(--text-muted)',
                    borderWidth: bookmarked ? '2px' : '0',
                    borderColor: 'var(--accent)',
                  }}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  // ---- Session review view ----
  if (view === 'session-review' && selectedHistory && selectedHistoryItem) {
    return (
      <AppShell active="history" onNavigate={(v) => { setView(v); }} hasActiveSession={!!activeSession}>
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
                Session Review
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {selectedHistory.result.correct}/{selectedHistory.result.total} correct · {selectedHistory.result.percent}%
              </p>
            </div>
            <button
              type="button"
              onClick={() => setView('history')}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--surface-raised)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Back to history
            </button>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setReviewIndex((i) => Math.max(0, i - 1))}
              disabled={reviewIndex === 0}
              className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-40"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              Previous
            </button>
            <span className="tabular-nums text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              {reviewIndex + 1} / {selectedHistory.items.length}
            </span>
            <button
              type="button"
              onClick={() => setReviewIndex((i) => Math.min(selectedHistory.items.length - 1, i + 1))}
              disabled={reviewIndex === selectedHistory.items.length - 1}
              className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-40"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              Next
            </button>
          </div>

          {/* Review card */}
          <div className="flex flex-col gap-4 rounded-2xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <span className="rounded px-2 py-0.5 text-[11px] font-medium" style={{ background: 'var(--brand-muted)', color: 'var(--primary)' }}>
                {selectedHistoryItem.categoryLabel}
              </span>
              <span
                className="rounded px-2 py-0.5 text-[11px] font-medium"
                style={{
                  background: selectedHistory.answers[selectedHistoryItem.itemId] === selectedHistoryItem.question.correct ? 'var(--color-success-light)' : 'var(--color-warning-light)',
                  color: selectedHistory.answers[selectedHistoryItem.itemId] === selectedHistoryItem.question.correct ? 'var(--color-success)' : 'var(--color-warning)',
                }}
              >
                {selectedHistory.answers[selectedHistoryItem.itemId] === selectedHistoryItem.question.correct ? 'Correct' : 'Review'}
              </span>
            </div>

            <h3 className="text-base font-medium leading-relaxed" style={{ color: 'var(--text)' }}>
              {selectedHistoryItem.question.stem}
            </h3>

            <div className="flex flex-col gap-1.5">
              {selectedHistoryItem.optionOrder.map((optionId, optionIndex) => {
                const option = selectedHistoryItem.question.options.find((o) => o.id === optionId)!;
                const answer = selectedHistory.answers[selectedHistoryItem.itemId];
                const selected = answer === option.id;
                const correct = option.id === selectedHistoryItem.question.correct;
                return (
                  <div
                    key={option.id}
                    className="flex items-start gap-3 rounded-lg border-2 p-3 text-sm"
                    style={{
                      borderColor: correct ? 'var(--color-success)' : selected && !correct ? 'var(--color-danger)' : 'var(--border)',
                      background: correct ? 'var(--color-success-light)' : selected && !correct ? 'var(--color-danger-light)' : 'transparent',
                      color: 'var(--text)',
                    }}
                  >
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: 'var(--surface-raised)', color: 'var(--text-muted)' }}>
                      {displayLetterForIndex(optionIndex)}
                    </span>
                    {option.text}
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg p-4" style={{ background: 'var(--surface-raised)' }}>
              <p className="text-sm" style={{ color: 'var(--text)' }}>
                <strong>Correct ({displayLetterForOptionId(selectedHistoryItem.optionOrder, selectedHistoryItem.question.correct)}):</strong>{' '}
                {selectedHistoryItem.question.explanation.rationale_correct}
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ---- Main app with shell ----
  return (
    <>
      {/* Disclaimer modal */}
      {!meta.disclaimerSeen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl border p-6 shadow-xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Independent study aid</h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              This practice app is not affiliated with or endorsed by ABTC or PSI, does not reproduce real exam items, and must not be used for
              patient-care decisions. Practice results are unofficial estimates only.
            </p>
            <button
              className="mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:brightness-110"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
              onClick={() => void acknowledgeDisclaimer()}
            >
              I understand
            </button>
          </div>
        </div>
      )}

      <AppShell active={view} onNavigate={setView} hasActiveSession={!!activeSession && !activeSession.submittedAt}>
        {view === 'dashboard' && (
          <DashboardView
            history={history}
            settings={settings}
            hasActiveSession={!!activeSession && !activeSession.submittedAt}
            onNavigate={setView}
            onSelectSession={(entry) => {
              setSelectedHistory(entry);
              setReviewIndex(0);
              setView('session-review');
            }}
            onStartSession={handleStartSession}
          />
        )}

        {view === 'setup' && (
          <SetupView
            settings={settings}
            onUpdateSettings={updateSettings}
            onStartSession={startSession}
            hasActiveSession={!!activeSession && !activeSession.submittedAt}
            onResumeSession={() => setView('session')}
            availableQuestionCount={availableQuestionCount}
            onNavigate={setView}
          />
        )}

        {view === 'history' && (
          <HistoryView
            history={history}
            targetThreshold={settings.targetThreshold}
            onSelectSession={(entry) => {
              setSelectedHistory(entry);
              setReviewIndex(0);
              setView('session-review');
            }}
            onNavigate={setView}
          />
        )}

        {view === 'reported-items' && (
          <ReportedItemsView
            flags={flags}
            onDelete={(id) => void clearFlagById(id)}
            onEdit={(flag) => {
              // Save edited flag
              void upsertFlag({ ...flag, updatedAt: new Date().toISOString() });
              setFlags((current) =>
                current.map((f) => f.id === flag.id ? { ...flag, updatedAt: new Date().toISOString() } : f)
              );
            }}
            onNavigate={setView}
          />
        )}
      </AppShell>
    </>
  );
}

export default App;
