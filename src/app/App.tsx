import { useEffect, useMemo, useRef, useState } from 'react';
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

import Header from '../components/Header';
import Dashboard from '../components/Dashboard';
import Setup from '../components/Setup';
import SessionView from '../components/SessionView';
import HistoryPage from '../components/HistoryPage';
import HistoryDetail from '../components/HistoryDetail';
import ReportedItems from '../components/ReportedItems';

type View = 'dashboard' | 'setup' | 'session' | 'history' | 'history-detail' | 'reported-items';

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

function updateSessionTimestamp(session: ActiveSession): ActiveSession {
  return { ...session, updatedAt: new Date().toISOString() };
}

function normalizeSettings(settings: SessionSettings): SessionSettings {
  const defaults = buildDefaultSettings(settings.blueprintId);
  return { ...defaults, ...settings, questionSet: settings.questionSet ?? 'standard' };
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

export default function App() {
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
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [sessionReplacePromptOpen, setSessionReplacePromptOpen] = useState(false);
  const [pendingSessionSettings, setPendingSessionSettings] = useState<SessionSettings | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<HistoryEntry | null>(null);
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

  // Ref sync
  useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);

  // Persist active session
  useEffect(() => {
    if (!ready) return;
    if (!activeSession) {
      lastPersistFingerprint.current = '';
      void clearActiveSession();
      return;
    }
    const fp = sessionPersistFingerprint(activeSession);
    if (fp !== lastPersistFingerprint.current) {
      lastPersistFingerprint.current = fp;
      void saveActiveSession(activeSession);
    }
  }, [activeSession, ready]);

  // Flush on unload
  useEffect(() => {
    const flush = () => { if (activeSession) void saveActiveSession(activeSession); };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [activeSession]);

  // Timer
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
      setActiveSession((current) => {
        if (!current || current.id !== timedSessionId || current.submittedAt || current.remainingSeconds === null || current.remainingSeconds <= 0) return current;
        return updateSessionTimestamp({ ...current, remainingSeconds: Math.max(0, current.remainingSeconds - 1) });
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timedSessionId]);

  const currentBlueprint = getBlueprint(settings.blueprintId);
  const availableQuestionCount = getAvailableQuestionCount(bank.questions, settings.blueprintId, settings.includeDrafts);

  // Settings helpers
  function persistSettings(next: SessionSettings) {
    setSettings(next);
    void saveSettings(next);
  }

  function updateSettings(next: Partial<SessionSettings>) {
    const merged = { ...settings, ...next };
    const max = getAvailableQuestionCount(bank.questions, merged.blueprintId, merged.includeDrafts);
    merged.questionCount = clampQuestionCount(merged.questionCount, max);
    persistSettings(merged);
  }

  function handleBlueprintChange(id: BlueprintId) {
    const bp = getBlueprint(id);
    const max = getAvailableQuestionCount(bank.questions, id, settings.includeDrafts);
    persistSettings({ ...settings, blueprintId: id, questionCount: clampQuestionCount(bp.default_exam_items, max), timeMinutes: bp.default_time_minutes });
  }

  function handleModeChange(mode: ExamMode) {
    const includeDrafts = mode === 'study';
    const max = getAvailableQuestionCount(bank.questions, settings.blueprintId, includeDrafts);
    persistSettings({ ...settings, mode, includeDrafts, questionCount: clampQuestionCount(settings.questionCount, max) });
  }

  function handleQuestionSetChange(qs: QuestionSet) {
    const nextBank = qs === 'scenario' ? banks.scenario : banks.standard;
    const max = getAvailableQuestionCount(nextBank.questions, settings.blueprintId, settings.includeDrafts);
    persistSettings({ ...settings, questionSet: qs, questionCount: clampQuestionCount(settings.questionCount, max) });
  }

  // Session mutation
  function mutateSession(mutator: (current: ActiveSession) => ActiveSession) {
    setActiveSession((current) => current ? updateSessionTimestamp(mutator(current)) : current);
  }

  // Session creation
  function beginNewSession(nextSettings: SessionSettings = settings) {
    const recentIds = buildRecentItemIds(history.map((e) => ({ itemIds: e.itemIds })));
    const nextSession = createSession(bank.questions, nextSettings, recentIds);
    setActiveSession(nextSession);
    setView('session');
  }

  function startSession() {
    let nextSettings = settings;
    if (availableQuestionCount === 0 && !settings.includeDrafts) {
      const useDrafts = window.confirm('No reviewed items available. Include draft items?');
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

  function handleQuickStart(mode: 'full' | 'quick' | 'weak' | 'custom') {
    let nextSettings = { ...settings };
    switch (mode) {
      case 'full':
        nextSettings.questionCount = getAvailableQuestionCount(bank.questions, settings.blueprintId, settings.includeDrafts);
        break;
      case 'quick':
        nextSettings.questionCount = 25;
        break;
      case 'weak':
        nextSettings.questionCount = 25;
        nextSettings.mode = 'study';
        nextSettings.includeDrafts = true;
        break;
      case 'custom':
        break;
    }
    const max = getAvailableQuestionCount(bank.questions, nextSettings.blueprintId, nextSettings.includeDrafts);
    nextSettings.questionCount = clampQuestionCount(nextSettings.questionCount, max);
    persistSettings(nextSettings);

    if (activeSession && !activeSession.submittedAt) {
      setPendingSessionSettings(nextSettings);
      setSessionReplacePromptOpen(true);
      return;
    }
    beginNewSession(nextSettings);
  }

  // Session finalization
  async function finalizeSession() {
    if (!activeSession || isFinalizing) return;
    setIsFinalizing(true);
    try {
      const unanswered = activeSession.items.length - countAnswered(activeSession);
      if (activeSession.settings.mode === 'exam') {
        const shouldSubmit = window.confirm(unanswered > 0 ? `Submit exam with ${unanswered} unanswered item(s)?` : 'Submit exam and score the results?');
        if (!shouldSubmit) return;
      }
      const result = scoreSession(activeSession.settings.blueprintId, activeSession.items, activeSession.answers, activeSession.settings.targetThreshold);
      const completed = updateSessionTimestamp({ ...activeSession, submittedAt: new Date().toISOString(), result });
      const entry = toHistoryEntry(completed);
      await saveHistoryEntry(entry);
      await clearActiveSession();
      setHistory((c) => [entry, ...c]);
      setSelectedHistory(entry);
      setActiveSession(null);
      setView('history-detail');
    } finally {
      setIsFinalizing(false);
    }
  }

  // Report (flag) handling
  async function saveReport(item: Question, sessionId: string, blueprint: BlueprintId, mode: ExamMode, existing?: ItemFlag) {
    const timestamp = new Date().toISOString();
    const flag: ItemFlag = {
      id: existing?.id ?? globalThis.crypto?.randomUUID?.() ?? `flag-${Date.now()}`,
      item_id: item.id,
      version: item.version ?? 1,
      status: item.status,
      reason: existing?.reason ?? 'factual error',
      comment: existing?.comment ?? '',
      session_id: sessionId,
      blueprint,
      mode,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    };
    await upsertFlag(flag);
    setFlags((c) => [flag, ...c.filter((f) => f.item_id !== flag.item_id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }

  async function saveEditedFlag(flag: ItemFlag) {
    await upsertFlag(flag);
    setFlags((c) => c.map((f) => f.id === flag.id ? flag : f).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }

  async function clearFlagById(id: string) {
    await deleteFlag(id);
    setFlags((c) => c.filter((f) => f.id !== id));
  }

  async function handleClearAllFlags() {
    if (!window.confirm('Clear every reported item?')) return;
    await replaceFlags([]);
    setFlags([]);
  }

  function exportFlags() {
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

  // History
  async function removeHistoryEntry(id: string) {
    await deleteHistoryEntry(id);
    setHistory((c) => c.filter((e) => e.id !== id));
    if (selectedHistory?.id === id) {
      setSelectedHistory(null);
      setView('history');
    }
  }

  async function handleClearHistory() {
    if (!window.confirm('Delete all stored session history?')) return;
    await clearHistory();
    setHistory([]);
    setSelectedHistory(null);
  }

  function openCategoryTrend(categoryId: string) {
    setView('history');
  }

  // Disclaimer
  async function acknowledgeDisclaimer() {
    const next = { disclaimerSeen: true };
    setMeta(next);
    await saveMeta(next);
  }

  // Loading / error states
  if (!ready) {
    return <div className="app-shell"><div className="shell"><p className="status-card">Loading local study data...</p></div></div>;
  }
  if (error) {
    return <div className="app-shell"><div className="shell"><p className="status-card" style={{ color: 'var(--danger)' }}>{error}</p></div></div>;
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>

      {/* Disclaimer modal */}
      {!meta.disclaimerSeen && (
        <section className="modal-backdrop" aria-label="Study aid disclaimer">
          <div className="modal-card">
            <h2>Independent study aid</h2>
            <p>This practice app is not affiliated with or endorsed by ABTC or PSI, does not reproduce real exam items, and must not be used for patient-care decisions. Practice results are unofficial estimates only.</p>
            <button className="btn-primary" onClick={() => void acknowledgeDisclaimer()}>I understand</button>
          </div>
        </section>
      )}

      {/* Session replace prompt */}
      {sessionReplacePromptOpen && (
        <section className="modal-backdrop" aria-label="Unfinished session">
          <div className="modal-card">
            <h2>Unfinished session</h2>
            <p>You have a session in progress. Resume it, or start a new session (this discards in-progress answers).</p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => { setSessionReplacePromptOpen(false); setPendingSessionSettings(null); }}>Cancel</button>
              <button className="btn-secondary" onClick={() => { const ns = pendingSessionSettings ?? settings; setSessionReplacePromptOpen(false); setPendingSessionSettings(null); beginNewSession(ns); }}>Start new</button>
              <button className="btn-primary" onClick={() => { setSessionReplacePromptOpen(false); setView('session'); }}>Resume</button>
            </div>
          </div>
        </section>
      )}

      <Header view={view} setView={setView} hasActiveSession={Boolean(activeSession && !activeSession.submittedAt)} />

      <main id="main-content" className="shell">
        {view === 'dashboard' && (
          <Dashboard
            history={history}
            settings={settings}
            activeSession={activeSession}
            onStartSession={handleQuickStart}
            onResumeSession={() => setView('session')}
            onViewHistory={() => setView('history')}
            onViewHistoryDetail={(entry) => { setSelectedHistory(entry); setView('history-detail'); }}
          />
        )}

        {view === 'setup' && (
          <Setup
            settings={settings}
            onUpdateSettings={updateSettings}
            onBlueprintChange={handleBlueprintChange}
            onModeChange={handleModeChange}
            onQuestionSetChange={handleQuestionSetChange}
            onStartSession={startSession}
            availableQuestionCount={availableQuestionCount}
            hasActiveSession={Boolean(activeSession && !activeSession.submittedAt)}
            onResumeSession={() => setView('session')}
            onDiscardSession={() => { setActiveSession(null); void clearActiveSession(); }}
            bankNotes={bank.notes}
            bankQuestionCount={bank.questions.length}
          />
        )}

        {view === 'session' && activeSession && (
          <SessionView
            session={activeSession}
            onMutate={mutateSession}
            onFinalize={() => void finalizeSession()}
            isFinalizing={isFinalizing}
            onReportItem={(item, sessionId, blueprint, mode, existing) => void saveReport(item, sessionId, blueprint, mode, existing)}
            flags={flags}
          />
        )}

        {view === 'history' && (
          <HistoryPage
            history={history}
            onClearHistory={() => void handleClearHistory()}
            onViewDetail={(entry) => { setSelectedHistory(entry); setView('history-detail'); }}
            onDeleteEntry={(id) => void removeHistoryEntry(id)}
            onNavigateToReportedItems={() => setView('reported-items')}
          />
        )}

        {view === 'history-detail' && selectedHistory && (
          <HistoryDetail
            entry={selectedHistory}
            onBack={() => setView('history')}
            onOpenCategoryTrend={openCategoryTrend}
            onReportItem={(item, sessionId, blueprint, mode, existing) => void saveReport(item, sessionId, blueprint, mode, existing)}
            flags={flags}
          />
        )}

        {view === 'reported-items' && (
          <ReportedItems
            flags={flags}
            bank={allQuestions}
            onBack={() => setView('history')}
            onExportFlags={exportFlags}
            onClearAll={() => void handleClearAllFlags()}
            onSaveFlag={(flag) => void saveEditedFlag(flag)}
            onDeleteFlag={(id) => void clearFlagById(id)}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>This practice app is an independent study aid, not affiliated with or endorsed by ABTC or PSI, does not reproduce real exam questions, and is not a source of patient-care decisions.</p>
      </footer>
    </div>
  );
}
