import { useEffect, useMemo, useRef, useState } from 'react';
import { getBlueprint, getBlueprintLabel } from '../data/blueprints';
import { loadQuestionBanks } from '../data/questionBank';
import { buildDefaultSettings, countAnswered, createSession, isBlueprintApplicable } from '../lib/sessionAssembly';
import { buildRecentItemIds } from '../lib/sessionPersistence';
import { buildCategoryHistoryTrend, listHistoryCategories } from '../lib/categoryHistoryTrend';
import { buildHistoryTrend, formatTrendDelta } from '../lib/historyTrend';
import {
  computeReadiness,
  computeScoreTrendPoints,
  computeFocusAreas,
  computeWeakDomains,
  computeRecentSessions,
  computeReadinessInsight,
  computeDaysToExam,
  getExamDateText,
  collectMissedItemIds
} from '../lib/readiness';
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
  QuestionSet,
  Theme
} from '../types/exam';
import { Header } from './components/Header';
import { ConfirmModal } from './components/ConfirmModal';
import { DashboardView } from './views/DashboardView';
import { SetupView } from './views/SetupView';
import { SessionView } from './views/SessionView';
import { ResultsView } from './views/ResultsView';
import { ReviewView } from './views/ReviewView';
import { HistoryView } from './views/HistoryView';
import { FlagsView } from './views/FlagsView';

export type View = 'dashboard' | 'setup' | 'session' | 'results' | 'review' | 'history' | 'flags';

function resolveInitialTheme(stored: Theme | undefined): Theme {
  if (stored) return stored;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'night';
  }
  return 'day';
}

function applyTheme(theme: Theme): void {
  if (theme === 'night') {
    document.documentElement.setAttribute('data-theme', 'night');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

const QUESTION_MIN = 10;

function clampQuestionCount(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(Math.max(value, Math.min(QUESTION_MIN, max)), max);
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
  const [flags, setFlags] = useState<ItemFlag[]>([]);
  const [flagDraft, setFlagDraft] = useState<FlagDraft | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [sessionReplacePromptOpen, setSessionReplacePromptOpen] = useState(false);
  const [pendingSessionSettings, setPendingSessionSettings] = useState<SessionSettings | null>(null);
  const [pendingPrioritizeIncorrect, setPendingPrioritizeIncorrect] = useState(false);
  const [draftConfirmOpen, setDraftConfirmOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [destructiveConfirm, setDestructiveConfirm] = useState<{ title: string; body: string; onConfirm: () => void } | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<HistoryEntry | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const lastPersistFingerprint = useRef('');
  const activeSessionRef = useRef<ActiveSession | null>(null);

  const allQuestions = useMemo(
    () => [...banks.standard.questions, ...banks.scenario.questions],
    [banks]
  );

  // Analytics
  const historyTrend = useMemo(() => buildHistoryTrend(history), [history]);
  const historyCategories = useMemo(() => listHistoryCategories(history), [history]);
  const categoryTrend = useMemo(
    () => (selectedCategoryId ? buildCategoryHistoryTrend(history, selectedCategoryId) : null),
    [history, selectedCategoryId]
  );
  const readiness = useMemo(() => computeReadiness(history), [history]);
  const scoreTrendPoints = useMemo(() => computeScoreTrendPoints(history), [history]);
  const focusAreas = useMemo(() => computeFocusAreas(history, settings.blueprintId), [history, settings.blueprintId]);
  const weakDomains = useMemo(() => computeWeakDomains(history, settings.blueprintId, settings.targetThreshold), [history, settings.blueprintId, settings.targetThreshold]);
  const recentSessions = useMemo(() => computeRecentSessions(history), [history]);
  const daysToExam = useMemo(() => computeDaysToExam(meta.examDate), [meta.examDate]);
  const examDateText = useMemo(() => getExamDateText(daysToExam), [daysToExam]);
  const readinessInsight = useMemo(
    () => computeReadinessInsight(readiness, focusAreas, weakDomains, settings.targetThreshold, daysToExam),
    [readiness, focusAreas, weakDomains, settings.targetThreshold, daysToExam]
  );
  const missedItemIds = useMemo(() => collectMissedItemIds(history), [history]);

  const currentBlueprint = getBlueprint(settings.blueprintId);
  const availableQuestionCount = getAvailableQuestionCount(bank.questions, settings.blueprintId, settings.includeDrafts);
  const session = activeSession;
  const currentItem = session ? session.items[session.currentIndex] : null;
  const answeredCount = session ? countAnswered(session) : 0;
  const selectedHistoryItem = selectedHistory?.items[reviewIndex] ?? null;

  // Theme
  useEffect(() => {
    const resolved = resolveInitialTheme(meta.theme);
    applyTheme(resolved);
  }, [meta.theme]);

  function handleThemeToggle(): void {
    const next: Theme = meta.theme === 'night' ? 'day' : 'night';
    const nextMeta = { ...meta, theme: next };
    setMeta(nextMeta);
    applyTheme(next);
    void saveMeta(nextMeta);
  }

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
        applyTheme(resolveInitialTheme(state.meta.theme));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load local app data.');
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

  // Persist active session
  useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);

  function sessionPersistFingerprint(s: ActiveSession): string {
    return JSON.stringify({
      id: s.id, settings: s.settings,
      items: s.items.map((i) => ({ itemId: i.itemId, optionOrder: i.optionOrder })),
      answers: s.answers, revealed: s.revealed,
      flaggedForReview: s.flaggedForReview, currentIndex: s.currentIndex,
      timerHidden: s.timerHidden, submittedAt: s.submittedAt
    });
  }

  useEffect(() => {
    if (!ready || !activeSession) {
      lastPersistFingerprint.current = '';
      if (ready) void clearActiveSession();
      return;
    }
    const fp = sessionPersistFingerprint(activeSession);
    if (fp !== lastPersistFingerprint.current) {
      lastPersistFingerprint.current = fp;
      void saveActiveSession(activeSession);
    }
  }, [activeSession, ready]);

  useEffect(() => {
    const flush = () => { if (activeSession) void saveActiveSession(activeSession); };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [activeSession]);

  // Timer countdown
  const timedSessionId = ready && activeSession && !activeSession.submittedAt && activeSession.remainingSeconds !== null ? activeSession.id : null;

  useEffect(() => {
    if (!ready || !timedSessionId) return;
    const id = window.setInterval(() => {
      if (activeSessionRef.current) void saveActiveSession(activeSessionRef.current);
    }, 15000);
    return () => window.clearInterval(id);
  }, [ready, timedSessionId]);

  useEffect(() => {
    if (!timedSessionId) return;
    const id = window.setInterval(() => {
      setActiveSession((cur) => {
        if (!cur || cur.id !== timedSessionId || cur.submittedAt || cur.remainingSeconds === null || cur.remainingSeconds <= 0) return cur;
        return { ...cur, updatedAt: new Date().toISOString(), remainingSeconds: Math.max(0, cur.remainingSeconds - 1) };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timedSessionId]);

  // Keyboard nav
  useEffect(() => {
    if (!session || view !== 'session' || !currentItem) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); navigateSession(-1); return; }
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); navigateSession(1); return; }
      if (e.key.length !== 1) return;
      const idx = e.key.toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < currentItem.optionOrder.length) { e.preventDefault(); handleAnswer(currentItem.optionOrder[idx]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentItem, session, view]);

  useEffect(() => {
    if (!selectedHistory || view !== 'review') return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); setReviewIndex((c) => Math.max(c - 1, 0)); return; }
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); setReviewIndex((c) => Math.min(c + 1, selectedHistory.items.length - 1)); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedHistory, view]);

  useEffect(() => {
    if (selectedCategoryId && !historyCategories.some((c) => c.categoryId === selectedCategoryId)) setSelectedCategoryId(null);
  }, [historyCategories, selectedCategoryId]);

  // Settings helpers
  function persistSettings(next: SessionSettings): void { setSettings(next); void saveSettings(next); }
  function updateSettings(partial: Partial<SessionSettings>): void {
    const merged = { ...settings, ...partial };
    const max = getAvailableQuestionCount(bank.questions, merged.blueprintId, merged.includeDrafts);
    merged.questionCount = clampQuestionCount(merged.questionCount, max);
    persistSettings(merged);
  }

  // Session helpers
  function mutateSession(mutator: (cur: ActiveSession) => ActiveSession): void {
    setActiveSession((cur) => cur ? { ...mutator(cur), updatedAt: new Date().toISOString() } : cur);
  }

  function handleAnswer(optionId: string): void {
    mutateSession((cur) => ({
      ...cur,
      answers: { ...cur.answers, [cur.items[cur.currentIndex].itemId]: optionId },
      revealed: cur.settings.mode === 'study' ? { ...cur.revealed, [cur.items[cur.currentIndex].itemId]: true } : cur.revealed
    }));
  }

  function navigateSession(dir: -1 | 1): void {
    mutateSession((cur) => ({ ...cur, currentIndex: Math.min(Math.max(cur.currentIndex + dir, 0), cur.items.length - 1) }));
  }

  function toggleBookmark(): void {
    mutateSession((cur) => {
      const itemId = cur.items[cur.currentIndex].itemId;
      const bookmarked = cur.flaggedForReview.includes(itemId);
      return { ...cur, flaggedForReview: bookmarked ? cur.flaggedForReview.filter((v) => v !== itemId) : [...cur.flaggedForReview, itemId] };
    });
  }

  function toggleTimerHidden(): void {
    mutateSession((cur) => ({ ...cur, timerHidden: !cur.timerHidden }));
  }

  function beginNewSession(nextSettings: SessionSettings = settings, prioritizeIncorrect = false): void {
    const recentIds = buildRecentItemIds(history.map((e) => ({ itemIds: e.itemIds })));
    setActiveSession(createSession(bank.questions, nextSettings, recentIds, {
      prioritizeIncorrect,
      missedItemIds: prioritizeIncorrect ? missedItemIds : undefined
    }));
    setView('session');
  }

  function handleLaunchWeakAreas(): void {
    const next: SessionSettings = { ...settings, mode: 'study', questionCount: 10 };
    if (activeSession && !activeSession.submittedAt) {
      setPendingSessionSettings(next);
      setPendingPrioritizeIncorrect(true);
      setSessionReplacePromptOpen(true);
      return;
    }
    beginNewSession(next, true);
  }

  function startSession(): void {
    if (availableQuestionCount === 0 && !settings.includeDrafts) {
      setDraftConfirmOpen(true);
      return;
    }
    if (activeSession && !activeSession.submittedAt) {
      setPendingSessionSettings(settings);
      setSessionReplacePromptOpen(true);
      return;
    }
    beginNewSession(settings);
  }

  function handleDraftConfirm(): void {
    setDraftConfirmOpen(false);
    const next = { ...settings, includeDrafts: true };
    persistSettings(next);
    if (activeSession && !activeSession.submittedAt) {
      setPendingSessionSettings(next);
      setSessionReplacePromptOpen(true);
      return;
    }
    beginNewSession(next);
  }

  function dismissSessionReplacePrompt(): void { setSessionReplacePromptOpen(false); setPendingSessionSettings(null); setPendingPrioritizeIncorrect(false); }
  function resumeExistingSession(): void { dismissSessionReplacePrompt(); setView('session'); }
  function replaceActiveSession(): void { const next = pendingSessionSettings ?? settings; const pi = pendingPrioritizeIncorrect; dismissSessionReplacePrompt(); beginNewSession(next, pi); }
  function discardActiveSession(): void { setActiveSession(null); void clearActiveSession(); }

  function handleFinalizeSession(): void {
    setConfirmOpen(true);
  }

  async function finalizeSession(): Promise<void> {
    if (!activeSession || isFinalizing) return;
    setIsFinalizing(true);
    try {
      const result = scoreSession(activeSession.settings.blueprintId, activeSession.items, activeSession.answers, activeSession.settings.targetThreshold);
      const completed = { ...activeSession, submittedAt: new Date().toISOString(), result, updatedAt: new Date().toISOString() };
      const entry = toHistoryEntry(completed);
      await saveHistoryEntry(entry);
      await clearActiveSession();
      setHistory((cur) => [entry, ...cur]);
      setSelectedHistory(entry);
      setReviewIndex(0);
      setActiveSession(null);
      setView('results');
    } finally {
      setIsFinalizing(false);
    }
  }

  // Flags
  function openFlagComposer(item: Question, sessionId: string, blueprint: BlueprintId, mode: ExamMode): void {
    const existing = flags.find((f) => f.item_id === item.id);
    setFlagDraft(buildInitialFlagDraft(item, sessionId, blueprint, mode, existing));
  }

  async function saveFlagDraft(): Promise<void> {
    if (!flagDraft) return;
    const existing = flags.find((f) => f.item_id === flagDraft.item.id);
    const ts = new Date().toISOString();
    const flag: ItemFlag = {
      id: flagDraft.existingId ?? globalThis.crypto?.randomUUID?.() ?? `flag-${Date.now()}`,
      item_id: flagDraft.item.id,
      version: flagDraft.item.version ?? 1,
      status: flagDraft.item.status,
      reason: flagDraft.reason,
      comment: flagDraft.comment,
      session_id: flagDraft.sessionId,
      blueprint: flagDraft.blueprint,
      mode: flagDraft.mode,
      createdAt: existing?.createdAt ?? ts,
      updatedAt: ts
    };
    await upsertFlag(flag);
    setFlags((cur) => [flag, ...cur.filter((f) => f.item_id !== flag.item_id)].sort((l, r) => r.updatedAt.localeCompare(l.updatedAt)));
    setFlagDraft(null);
  }

  async function clearFlagById(id: string): Promise<void> {
    await deleteFlag(id);
    setFlags((cur) => cur.filter((f) => f.id !== id));
  }

  async function removeHistoryEntry(id: string): Promise<void> {
    await deleteHistoryEntry(id);
    setHistory((cur) => cur.filter((e) => e.id !== id));
    if (selectedHistory?.id === id) { setSelectedHistory(null); setView('history'); }
  }

  function openCategoryTrend(categoryId: string): void {
    setSelectedCategoryId(categoryId);
    setView('history');
  }

  function navigateTo(view: View): void { setView(view); }
  function handleResume(): void { setView('session'); }

  async function acknowledgeDisclaimer(): Promise<void> {
    const next = { ...meta, disclaimerSeen: true };
    setMeta(next);
    await saveMeta(next);
  }

  async function exportFlags(): Promise<void> {
    const blob = new Blob([JSON.stringify({ schema: 'cctc-flags', version: 1, exportedAt: new Date().toISOString(), blueprint: settings.blueprintId, flags }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'cctc-flags.json';
    document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
  }

  async function resetFlags(): Promise<void> {
    await replaceFlags([]);
    setFlags([]);
  }

  function saveLastCustomSettings(s: SessionSettings): void {
    const next = { ...meta, lastCustomSettings: s };
    setMeta(next);
    void saveMeta(next);
  }

  function updateExamDate(date: string): void {
    const next = { ...meta, examDate: date || undefined };
    setMeta(next);
    void saveMeta(next);
  }

  // Loading / error
  if (!ready) return <div className="shell"><p className="status-card">Loading local study data...</p></div>;
  if (error) return <div className="shell"><p className="status-card status-card--danger">{error}</p></div>;

  const theme: Theme = meta.theme ?? 'day';

  return (
    <>
      <Header
        view={view}
        activeSession={Boolean(activeSession && !activeSession.submittedAt)}
        theme={theme}
        onNavigate={navigateTo}
        onThemeToggle={handleThemeToggle}
        onResume={handleResume}
      />

      {!meta.disclaimerSeen && (
        <section className="modal-backdrop" aria-label="Study aid disclaimer">
          <div className="modal-card">
            <p className="eyebrow-text">Independent study aid</p>
            <h2>Before you begin</h2>
            <p>This practice app is not affiliated with or endorsed by ABTC or PSI, does not reproduce real exam items, and is not a source of patient-care decisions. Practice results are unofficial estimates only.</p>
            <button className="btn-primary" onClick={() => void acknowledgeDisclaimer()}>I understand</button>
          </div>
        </section>
      )}

      {sessionReplacePromptOpen && (
        <section className="modal-backdrop" aria-label="Unfinished session">
          <div className="modal-card">
            <h2>Session in progress</h2>
            <p>You have an unfinished session. Resume it, or start a new one — starting new discards your in-progress answers and bookmarks.</p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={dismissSessionReplacePrompt}>Cancel</button>
              <button className="btn-secondary" onClick={replaceActiveSession}>Start new</button>
              <button className="btn-primary" onClick={resumeExistingSession}>Resume current</button>
            </div>
          </div>
        </section>
      )}

      {flagDraft && (
        <section className="modal-backdrop" aria-label="Flag this item">
          <div className="modal-card">
            <h2>{flagDraft.existingId ? 'Edit flag' : 'Flag this item'}</h2>
            <label>
              Reason
              <select value={flagDraft.reason} onChange={(e) => setFlagDraft({ ...flagDraft, reason: e.target.value as FlagReason })}>
                {FLAG_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label>
              Comment
              <textarea rows={4} value={flagDraft.comment} onChange={(e) => setFlagDraft({ ...flagDraft, comment: e.target.value })} />
            </label>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setFlagDraft(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => void saveFlagDraft()}>Save flag</button>
            </div>
          </div>
        </section>
      )}

      <ConfirmModal
        open={confirmOpen}
        title={activeSession?.settings.mode === 'exam' ? 'Submit exam?' : 'Finish session?'}
        body={
          activeSession
            ? `${activeSession.items.length - countAnswered(activeSession)} unanswered item(s). Score and finish?`
            : 'Score and finish?'
        }
        confirmLabel={activeSession?.settings.mode === 'exam' ? 'Submit' : 'Finish'}
        onConfirm={() => { setConfirmOpen(false); void finalizeSession(); }}
        onCancel={() => setConfirmOpen(false)}
      />

      {destructiveConfirm && (
        <ConfirmModal
          open
          title={destructiveConfirm.title}
          body={destructiveConfirm.body}
          confirmLabel="Delete"
          confirmVariant="danger"
          onConfirm={() => { destructiveConfirm.onConfirm(); setDestructiveConfirm(null); }}
          onCancel={() => setDestructiveConfirm(null)}
        />
      )}

      <ConfirmModal
        open={draftConfirmOpen}
        title="Include draft items?"
        body="No reviewed items are available for this configuration. Include draft items for a bootstrap practice session?"
        confirmLabel="Include drafts"
        onConfirm={handleDraftConfirm}
        onCancel={() => setDraftConfirmOpen(false)}
      />

      <main className="shell">
        {view === 'dashboard' && (
          <DashboardView
            activeSession={activeSession}
            settings={settings}
            readiness={readiness}
            scoreTrendPoints={scoreTrendPoints}
            focusAreas={focusAreas}
            weakDomains={weakDomains}
            recentSessions={recentSessions}
            readinessInsight={readinessInsight}
            daysToExam={daysToExam}
            examDateText={examDateText}
            lastCustomSettings={meta.lastCustomSettings}
            onStartSession={startSession}
            onResumeSession={handleResume}
            onNavigate={navigateTo}
            onLaunchPreset={(preset) => {
              const next = { ...settings, ...preset };
              if (activeSession && !activeSession.submittedAt) {
                setPendingSessionSettings(next);
                setSessionReplacePromptOpen(true);
                return;
              }
              beginNewSession(next);
            }}
            onLaunchLastCustom={() => {
              if (!meta.lastCustomSettings) return;
              if (activeSession && !activeSession.submittedAt) {
                setPendingSessionSettings(meta.lastCustomSettings);
                setSessionReplacePromptOpen(true);
                return;
              }
              beginNewSession(meta.lastCustomSettings);
            }}
            onLaunchWeakAreas={handleLaunchWeakAreas}
            onSelectSession={(sessionId) => {
              const entry = history.find((e) => e.id === sessionId);
              if (entry) {
                setSelectedHistory(entry);
                setReviewIndex(0);
                setView('review');
              }
            }}
          />
        )}

        {view === 'setup' && (
          <SetupView
            settings={settings}
            bank={bank}
            availableQuestionCount={availableQuestionCount}
            activeSession={activeSession}
            lastCustomSettings={meta.lastCustomSettings}
            examDate={meta.examDate}
            onUpdateSettings={updateSettings}
            onStartSession={startSession}
            onResumeSession={handleResume}
            onLaunchLastCustom={() => {
              if (!meta.lastCustomSettings) return;
              if (activeSession && !activeSession.submittedAt) {
                setPendingSessionSettings(meta.lastCustomSettings);
                setSessionReplacePromptOpen(true);
                return;
              }
              beginNewSession(meta.lastCustomSettings);
            }}
            onLaunchWeakAreas={handleLaunchWeakAreas}
            onSaveLastCustom={saveLastCustomSettings}
            onUpdateExamDate={updateExamDate}
          />
        )}

        {view === 'session' && session && currentItem && (
          <SessionView
            session={session}
            currentItem={currentItem}
            answeredCount={answeredCount}
            onAnswer={handleAnswer}
            onNavigate={navigateSession}
            onToggleBookmark={toggleBookmark}
            onToggleTimerHidden={toggleTimerHidden}
            onSubmit={handleFinalizeSession}
            onExit={() => setView('dashboard')}
            onOpenFlagComposer={openFlagComposer}
            onSelectItem={(idx) => mutateSession((cur) => ({ ...cur, currentIndex: idx }))}
          />
        )}

        {view === 'results' && selectedHistory && (
          <ResultsView
            entry={selectedHistory}
            onReview={() => { setReviewIndex(0); setView('review'); }}
            onRetake={() => {
              beginNewSession(selectedHistory.settings);
            }}
            onHome={() => setView('dashboard')}
          />
        )}

        {view === 'review' && selectedHistory && selectedHistoryItem && (
          <ReviewView
            entry={selectedHistory}
            currentIndex={reviewIndex}
            onNavigate={setReviewIndex}
            onOpenFlagComposer={openFlagComposer}
            onSelectItem={setReviewIndex}
            onBack={() => setView('history')}
          />
        )}

        {view === 'history' && (
          <HistoryView
            history={history}
            historyTrend={historyTrend}
            historyCategories={historyCategories}
            selectedCategoryId={selectedCategoryId}
            categoryTrend={categoryTrend}
            focusAreas={focusAreas}
            onSelectCategory={setSelectedCategoryId}
            onSelectHistory={(entry) => { setSelectedHistory(entry); setReviewIndex(0); setView('review'); }}
            onDeleteEntry={(id) => {
              setDestructiveConfirm({
                title: 'Delete session?',
                body: 'This will permanently remove this session from your history.',
                onConfirm: () => void removeHistoryEntry(id)
              });
            }}
            onClearHistory={() => {
              setDestructiveConfirm({
                title: 'Clear all history?',
                body: 'This will permanently delete all stored session history.',
                onConfirm: () => { void clearHistory(); setHistory([]); setSelectedHistory(null); setReviewIndex(0); }
              });
            }}
            onNavigateToFlags={() => setView('flags')}
          />
        )}

        {view === 'flags' && (
          <FlagsView
            flags={flags}
            bankQuestions={bank.questions}
            onEditFlag={(flag) => {
              const q = bank.questions.find((question) => question.id === flag.item_id);
              if (q) openFlagComposer(q, flag.session_id, flag.blueprint, flag.mode);
            }}
            onDeleteFlag={(id) => {
              setDestructiveConfirm({
                title: 'Delete flag?',
                body: 'This will permanently remove this flag.',
                onConfirm: () => void clearFlagById(id)
              });
            }}
            onClearAll={() => {
              setDestructiveConfirm({
                title: 'Clear all flags?',
                body: 'This will permanently delete all stored item flags.',
                onConfirm: () => void resetFlags()
              });
            }}
            onExport={exportFlags}
            onBack={() => setView('history')}
          />
        )}
      </main>

      <footer className="footer-bar">
        <p>This practice app is an independent study aid, not affiliated with or endorsed by ABTC or PSI, does not reproduce real exam questions, and is not a source of patient-care decisions.</p>
      </footer>
    </>
  );
}

export default App;
