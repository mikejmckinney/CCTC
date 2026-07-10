import { useEffect, useMemo, useRef, useState, type MouseEvent, type ChangeEvent, type ReactNode, Component } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { getBlueprint, getBlueprintLabel } from '../data/blueprints';
import { loadQuestionBanks } from '../data/questionBank';
import {
  buildDefaultSettings,
  countAnswered,
  createSession,
  isBlueprintApplicable
} from '../lib/sessionAssembly';
import { buildRecentItemIds } from '../lib/sessionPersistence';
import { scoreSession, toHistoryEntry } from '../lib/scoring';
import {
  bootstrapState,
  clearActiveSession,
  clearHistory,
  deleteFlag,
  deleteHistoryEntry,
  deleteSampleHistory,
  loadSampleHistory,
  replaceFlags,
  saveActiveSession,
  saveHistoryEntry,
  saveMeta,
  saveSettings,
  upsertFlag
} from '../lib/storage';
import {
  computeReadinessDelta,
  computeReadinessEMA,
  daysToExam,
  domainEMA,
  domainStatus,
  examPercents,
  incorrectItemIds,
  readinessInsight,
  statusColor,
  statusLabel,
  statusTextColor,
  weakDomains
} from '../lib/readiness';
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

type View = 'dashboard' | 'session' | 'results' | 'history' | 'flags';
type TrendScope = 'exam' | 'study' | 'both';
type ResultFilter = 'all' | 'correct' | 'incorrect';
type Theme = 'day' | 'night';

interface FlagDraft {
  existingId?: string;
  item: Question;
  sessionId: string;
  blueprint: BlueprintId;
  mode: ExamMode;
  reason: FlagReason;
  comment: string;
}

interface DestructiveAction {
  title: string;
  body: string;
  cta: string;
  run: () => void;
  altCta?: string;
  altRun?: () => void;
}

const FLAG_REASONS: FlagReason[] = [
  'factual error',
  'outdated policy/guideline',
  'ambiguous / >1 defensible answer',
  'typo / wording',
  'broken or wrong reference link',
  'other'
];

const FLAG_REASON_LABELS_SHORT: Record<string, string> = {
  'factual error': 'Factual error',
  'outdated policy/guideline': 'Outdated policy/guideline',
  'ambiguous / >1 defensible answer': 'Ambiguous',
  'typo / wording': 'Typo / wording',
  'broken or wrong reference link': 'Broken reference',
  'other': 'Other'
};

const FLAG_REASON_LABELS_LONG: Record<string, string> = {
  'factual error': 'Factual error',
  'outdated policy/guideline': 'Outdated policy/guideline',
  'ambiguous / >1 defensible answer': 'Ambiguous / more than one defensible answer',
  'typo / wording': 'Typo / wording',
  'broken or wrong reference link': 'Broken or wrong reference link',
  'other': 'Other'
};

const DOMAIN_SHORT_NAMES: Record<number, string> = {
  1: 'Education',
  2: 'Pre-transplant',
  3: 'Post-op'
};

const DOMAIN_WEIGHT_PCTS: Record<number, number> = {
  1: 31,
  2: 30,
  3: 39
};

function displayLetterForIndex(optionIndex: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + optionIndex);
}

function displayLetterForOptionId(optionOrder: string[], optionId: string): string {
  const optionIndex = optionOrder.indexOf(optionId);
  return optionIndex >= 0 ? displayLetterForIndex(optionIndex) : optionId;
}

function incorrectRationalesForDisplay(
  item: SessionItemSnapshot
): Array<{ displayLetter: string; rationale: string }> {
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
  if (totalSeconds === null) return 'Untimed';
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return [Math.floor(m / 60) > 0 ? String(Math.floor(m / 60)).padStart(2, '0') + ':' : '', String(m % 60).padStart(2, '0'), String(s).padStart(2, '0')].join(':');
}

function durationMin(sec: number | null): string {
  if (sec === null) return 'Untimed';
  return Math.max(1, Math.round(sec / 60)) + ' min';
}

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function dateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function clock(sec: number | null): string {
  if (sec === null) return 'Untimed';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function blueprintLabel(id: string): string {
  if (id === 'cctc-thru-2026-06') return 'Legacy (thru 2026-06)';
  if (id === 'cctc-from-2026-07') return '2026-07 outline';
  return id || '—';
}

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sessionPersistFingerprint(session: ActiveSession): string {
  return JSON.stringify({
    a: session.answers,
    r: session.revealed,
    f: session.flaggedForReview,
    i: session.currentIndex,
    s: session.remainingSeconds,
    t: session.timerHidden,
    u: session.submittedAt,
    re: session.result
  });
}

function clampQuestionCount(value: number, max: number): number {
  const min = 5;
  if (!Number.isFinite(value)) return Math.min(min, max);
  if (value < min) return Math.min(min, max);
  if (value > max) return max;
  return value;
}

function getAvailableQuestionCount(
  questions: Question[],
  blueprintId: BlueprintId,
  includeDrafts: boolean
): number {
  const blueprint = getBlueprint(blueprintId);
  return questions.filter(
    (q) => (includeDrafts || q.status === 'reviewed') && isBlueprintApplicable(blueprint, q)
  ).length;
}

function updateSessionTimestamp(session: ActiveSession): ActiveSession {
  return { ...session, updatedAt: new Date().toISOString() };
}

function buildInitialFlagDraft(
  item: Question,
  sessionId: string,
  blueprint: BlueprintId,
  mode: ExamMode,
  existing?: ItemFlag
): FlagDraft {
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
  return { ...settings, questionCount: Math.max(1, settings.questionCount) };
}

function summary(settings: SessionSettings): string {
  const modeLabel = settings.mode === 'exam' ? 'Exam' : 'Study';
  const focus = settings.domains === 'all' || !settings.domains
    ? 'All domains'
    : settings.domains.map((id) => DOMAIN_SHORT_NAMES[id] ?? `D${id}`).join(', ');
  const timed = settings.timed ? `${settings.timeMinutes} min` : 'untimed';
  const qs = settings.questionSet === 'scenario' ? ' · scenario' : '';
  return `${modeLabel} · ${focus} · ${settings.questionCount} items · ${timed}${qs}`;
}

function App() {
  const banks = useMemo(() => loadQuestionBanks(), []);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [meta, setMeta] = useState<AppMeta>({ disclaimerSeen: false });
  const [settings, setSettings] = useState<SessionSettings>(() =>
    buildDefaultSettings('cctc-from-2026-07')
  );
  const bank = useMemo(
    () => (settings.questionSet === 'scenario' ? banks.scenario : banks.standard),
    [banks, settings.questionSet]
  );
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [flags, setFlags] = useState<ItemFlag[]>([]);
  const [flagDraft, setFlagDraft] = useState<FlagDraft | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [startPromptOpen, setStartPromptOpen] = useState(false);
  const [pendingSessionSettings, setPendingSessionSettings] = useState<SessionSettings | null>(null);
  const [completedSession, setCompletedSession] = useState<HistoryEntry | null>(null);
  const [reviewFrom, setReviewFrom] = useState<'results' | 'history' | 'dashboard'>('results');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [resultDomain, setResultDomain] = useState<'all' | number>('all');
  const [reviewQuery, setReviewQuery] = useState('');
  const [expandedReview, setExpandedReview] = useState<Record<number, boolean>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [destructive, setDestructive] = useState<DestructiveAction | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [readyInfoOpen, setReadyInfoOpen] = useState(false);
  const [trendScope, setTrendScope] = useState<TrendScope>('exam');
  const [reportOpen, setReportOpen] = useState(false);
  const [editingFlagId, setEditingFlagId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<FlagReason>('factual error');
  const [reportComment, setReportComment] = useState('');
  const [reportItem, setReportItem] = useState<Question | null>(null);
  const [bankError, setBankError] = useState(false);
  const lastPersistFingerprint = useRef('');
  const activeSessionRef = useRef<ActiveSession | null>(null);

  const theme = meta.theme ?? 'day';

  const allQuestions = useMemo(
    () => [...banks.standard.questions, ...banks.scenario.questions],
    [banks]
  );

  // Bootstrap
  useEffect(() => {
    let cancelled = false;
    bootstrapState(allQuestions)
      .then(async (state) => {
        if (cancelled) return;
        let meta = state.meta;
        if (!meta.theme) {
          let prefersDark = false;
          try { prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { /* noop */ }
          meta = { ...meta, theme: prefersDark ? 'night' : 'day' };
          void saveMeta(meta);
        }

        let history = state.history;
        if (history.length === 0 && !meta.seeded) {
          try {
            const sampleHistory = loadSampleHistory(allQuestions);
            for (const entry of sampleHistory) await saveHistoryEntry(entry);
            history = sampleHistory.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
            const nextMeta = { ...meta, seeded: true };
            await saveMeta(nextMeta);
            meta = nextMeta;
          } catch (e) {
            if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load sample history.');
          }
        }

        if (cancelled) return;
        setMeta(meta);
        setSettings(normalizeSettings(state.settings ?? buildDefaultSettings('cctc-from-2026-07')));
        setActiveSession(state.activeSession);
        setHistory(history);
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

  // Persist settings
  useEffect(() => {
    if (!ready) return;
    void saveSettings(settings);
  }, [ready, settings]);

  // Apply theme to <html>
  useEffect(() => {
    if (theme === 'night') {
      document.documentElement.setAttribute('data-theme', 'night');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [theme]);

  // Persist session
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
    const fp = sessionPersistFingerprint(activeSession);
    if (fp !== lastPersistFingerprint.current) {
      lastPersistFingerprint.current = fp;
      void saveActiveSession(activeSession);
    }
  }, [activeSession, ready]);

  // Beforeunload flush
  useEffect(() => {
    const flushSession = () => {
      if (activeSession) void saveActiveSession(activeSession);
    };
    window.addEventListener('beforeunload', flushSession);
    return () => window.removeEventListener('beforeunload', flushSession);
  }, [activeSession]);

  // Timer
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
        if (
          !current || current.id !== timedSessionId || current.submittedAt ||
          current.remainingSeconds === null || current.remainingSeconds <= 0
        ) {
          return current;
        }
        const next = { ...current, remainingSeconds: Math.max(0, current.remainingSeconds - 1) };
        if (next.remainingSeconds === 0) {
          void doFinalize(next);
        }
        return updateSessionTimestamp(next);
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [timedSessionId]);

  const session = activeSession;
  const currentItem = session ? session.items[session.currentIndex] : null;
  const availableQuestionCount = getAvailableQuestionCount(
    bank.questions, settings.blueprintId, settings.includeDrafts
  );

  // Readiness analytics
  const readinessPct = useMemo(() => computeReadinessEMA(history), [history]);
  const readinessDelta = useMemo(() => computeReadinessDelta(history), [history]);
  const bestExam = useMemo(() => {
    const pcts = examPercents(history);
    return pcts.length > 0 ? Math.max(...pcts) : null;
  }, [history]);
  const domainList = useMemo(() => {
    const bp = getBlueprint(settings.blueprintId);
    if (bp.structure === 'domain_task') {
      return bp.domains.map((d) => ({ id: d.id, name: d.name, short: DOMAIN_SHORT_NAMES[d.id] ?? d.name, weightPct: DOMAIN_WEIGHT_PCTS[d.id] ?? null }));
    }
    return bp.sections.map((s, i) => ({ id: i + 1, name: s.name, short: s.name, weightPct: null }));
  }, [settings.blueprintId]);

  const targetThreshold = meta.targetThreshold ?? settings.targetThreshold ?? 70;
  const insight = useMemo(
    () => readinessInsight(history, readinessPct, targetThreshold, domainList, meta.examDate ?? null),
    [history, readinessPct, targetThreshold, domainList, meta.examDate]
  );

  const incorrectIds = useMemo(() => incorrectItemIds(history), [history]);

  // Keyboard nav for session
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

  // Helpers
  function persistSettings(next: SessionSettings): void {
    setSettings(next);
    void saveSettings(next);
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
    scheduleAutoSync();
  }

  function handleAnswer(optionId: string): void {
    mutateSession((current) => ({
      ...current,
      answers: { ...current.answers, [current.items[current.currentIndex].itemId]: optionId },
      revealed:
        current.settings.mode === 'study'
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
          ? current.flaggedForReview.filter((v) => v !== itemId)
          : [...current.flaggedForReview, itemId]
      };
    });
  }

  function toggleTimerHidden(): void {
    mutateSession((current) => ({ ...current, timerHidden: !current.timerHidden }));
    setMenuOpen(false);
  }

  function toggleDomain(id: 'all' | number): void {
    if (id === 'all') {
      updateSettings({ domains: 'all' });
      return;
    }
    let cur = settings.domains ?? 'all';
    const arr = cur === 'all' ? [] : [...cur];
    const i = arr.indexOf(id);
    if (i >= 0) arr.splice(i, 1);
    else arr.push(id);
    updateSettings({ domains: arr.length ? arr : 'all' });
  }

  const toggleThemeRef = useRef<{ x: number; y: number } | null>(null);

  function toggleTheme(e?: MouseEvent): void {
    if (e) { toggleThemeRef.current = { x: e.clientX, y: e.clientY }; }
    const next: Theme = theme === 'night' ? 'day' : 'night';
    const swap = () => {
      const nextMeta = { ...meta, theme: next };
      setMeta(nextMeta);
      void saveMeta(nextMeta);
    };
    let reduced = false;
    try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* noop */ }
    const x = toggleThemeRef.current?.x ?? window.innerWidth - 40;
    const y = toggleThemeRef.current?.y ?? 30;
    if (!reduced && typeof document.startViewTransition === 'function') {
      try {
        const vt = document.startViewTransition(() => { swap(); return Promise.resolve(); });
        vt.ready.then(() => {
          const endR = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 4;
          document.documentElement.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endR}px at ${x}px ${y}px)`] },
            { duration: 480, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' }
          );
        }).catch(() => { swap(); });
        return;
      } catch { /* fallback */ }
    }
    swap();
  }

  function setTarget(v: number): void {
    const n = Math.max(50, Math.min(90, Math.round(v)));
    const nextMeta = { ...meta, targetThreshold: n };
    setMeta(nextMeta);
    void saveMeta(nextMeta);
  }

  function setExamDate(v: string): void {
    const nextMeta = { ...meta, examDate: v || undefined };
    setMeta(nextMeta);
    void saveMeta(nextMeta);
  }

  function beginNewSession(nextSettings: SessionSettings = settings): void {
    const recentIds = buildRecentItemIds(history.map((entry) => ({ itemIds: entry.itemIds })));
    const nextSession = createSession(
      bank.questions,
      nextSettings,
      recentIds,
      nextSettings.prioritizeIncorrect ? incorrectIds : undefined
    );
    if (nextSession.items.length === 0) {
      setBankError(true);
      setView('dashboard');
      setCustomizeOpen(true);
      return;
    }
    setBankError(false);
    setActiveSession(nextSession);
    setView('session');
    scheduleAutoSync();
  }

  function startFlow(nextSettings: SessionSettings): void {
    if (activeSession && !activeSession.submittedAt) {
      setPendingSessionSettings(nextSettings);
      setStartPromptOpen(true);
    } else {
      beginNewSession(nextSettings);
    }
  }

  function startSessionFromForm(): void {
    const next = { ...settings, questionCount: Math.min(settings.questionCount, availableQuestionCount) };
    const nextMeta = { ...meta, lastCustomSettings: next };
    setMeta(nextMeta);
    void saveMeta(nextMeta);
    startFlow(next);
  }

  function resumeFromPrompt(): void {
    setStartPromptOpen(false);
    setPendingSessionSettings(null);
    setView('session');
  }

  function startNewAnyway(): void {
    const s = pendingSessionSettings;
    setStartPromptOpen(false);
    setPendingSessionSettings(null);
    if (s) beginNewSession(s);
  }

  function cancelStart(): void {
    setStartPromptOpen(false);
    setPendingSessionSettings(null);
  }

  function discardActiveSession(): void {
    setActiveSession(null);
    void clearActiveSession();
    setStartPromptOpen(false);
    setPendingSessionSettings(null);
    setView('dashboard');
  }

  function preset(name: 'full' | 'quick' | 'weak'): void {
    const all = bank.questions.length;
    let s: SessionSettings;
    if (name === 'full') {
      s = { ...settings, mode: 'exam', questionSet: 'standard', timed: true, timeMinutes: 180, showTimer: true, domains: 'all', questionCount: Math.min(all, 175), includeDrafts: false, prioritizeIncorrect: false };
    } else if (name === 'quick') {
      s = { ...settings, mode: 'exam', questionSet: 'standard', timed: true, timeMinutes: 30, showTimer: true, domains: 'all', questionCount: Math.min(25, all), includeDrafts: false, prioritizeIncorrect: false };
    } else {
      const weak = weakDomains(history, domainList, targetThreshold);
      const dms = weak.length ? weak.map((w) => w.id) : 'all';
      s = { ...settings, mode: 'study', questionSet: 'standard', timed: false, domains: dms, questionCount: Math.min(10, all), prioritizeIncorrect: true };
    }
    setSettings(s);
    startFlow(s);
  }

  function startRecommended(): void {
    if (insight.action === 'full') { preset('full'); return; }
    if (insight.action === 'quick') { preset('quick'); return; }
    const dom = insight.actionDomain;
    const s: SessionSettings = {
      ...settings, mode: 'study', questionSet: 'standard', timed: false,
      domains: dom ? [dom] : 'all', questionCount: Math.min(10, bank.questions.length),
      prioritizeIncorrect: true
    };
    setSettings(s);
    startFlow(s);
  }

  function openCustomize(alsoAdvanced: boolean): void {
    setView('dashboard');
    setCustomizeOpen(true);
    if (alsoAdvanced) setAdvancedOpen(true);
    setMenuOpen(false);
    setMapOpen(false);
    setTimeout(() => {
      try {
        const el = document.getElementById('customize-anchor');
        if (el) {
          const y = el.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop) - 70;
          window.scrollTo(0, Math.max(0, y));
        }
      } catch { /* noop */ }
    }, 120);
  }

  async function finalizeSession(): Promise<void> {
    if (!activeSession || isFinalizing) return;
    setConfirmOpen(true);
    setMenuOpen(false);
  }

  async function doFinalize(sess: ActiveSession): Promise<void> {
    if (!sess || sess.submittedAt || isFinalizing) return;
    setIsFinalizing(true);
    setConfirmOpen(false);
    try {
      const result = scoreSession(
        sess.settings.blueprintId,
        sess.items,
        sess.answers,
        sess.settings.targetThreshold
      );
      const completed: ActiveSession = updateSessionTimestamp({
        ...sess,
        submittedAt: new Date().toISOString(),
        result
      });
      const entry = toHistoryEntry(completed);
      await saveHistoryEntry(entry);
      await clearActiveSession();
      setHistory((cur) => [entry, ...cur]);
      setCompletedSession(entry);
      setReviewFrom('results');
      setResultFilter('all');
      setResultDomain('all');
      setExpandedReview({});
      setActiveSession(null);
      setView('results');
      scheduleAutoSync();
    } finally {
      setIsFinalizing(false);
    }
  }

  function openReport(item?: Question): void {
    setMenuOpen(false);
    setEditingFlagId(null);
    setReportReason('factual error');
    setReportComment('');
    if (item) {
      setReportItem(item);
    } else if (session && view === 'session') {
      setReportItem(session.items[session.currentIndex].question);
    } else if (completedSession) {
      setReportItem(completedSession.items[0]?.question ?? null);
    } else {
      setReportItem(null);
    }
    setReportOpen(true);
  }

  function editFlag(id: string): void {
    const f = flags.find((x) => x.id === id);
    if (!f) return;
    setEditingFlagId(id);
    setReportReason(f.reason);
    setReportComment(f.comment || '');
    setReportOpen(true);
  }

  async function saveReport(): Promise<void> {
    if (editingFlagId) {
      const updated = flags.map((f) =>
        f.id === editingFlagId
          ? { ...f, reason: reportReason, comment: reportComment, updatedAt: new Date().toISOString() }
          : f
      );
      setFlags(updated);
      setReportOpen(false);
      setEditingFlagId(null);
      return;
    }
    const item = reportItem;
    if (!item) return;
    const flag: ItemFlag = {
      id: globalThis.crypto?.randomUUID?.() ?? `flag-${Date.now()}`,
      item_id: item.id,
      version: item.version ?? 1,
      status: item.status,
      reason: reportReason,
      comment: reportComment,
      session_id: session?.id ?? completedSession?.id ?? '',
      blueprint: settings.blueprintId,
      mode: settings.mode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      domain: item.domain,
      itemStem: (item.stem ?? '').slice(0, 160)
    };
    await upsertFlag(flag);
    setFlags((cur) => [flag, ...cur.filter((f) => f.item_id !== flag.item_id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    setReportOpen(false);
  }

  async function clearFlagById(flagId: string): Promise<void> {
    await deleteFlag(flagId);
    setFlags((cur) => cur.filter((f) => f.id !== flagId));
  }

  async function removeHistoryEntry(entryId: string): Promise<void> {
    await deleteHistoryEntry(entryId);
    setHistory((cur) => cur.filter((e) => e.id !== entryId));
  }

  async function handleClearHistory(): Promise<void> {
    setDestructive({
      title: 'Clear all history?',
      body: 'This permanently deletes every saved session on this device, including their answer reviews. This cannot be undone.',
      cta: 'Clear history',
      run: async () => { await clearHistory(); setHistory([]); setCompletedSession(null); }
    });
  }

  async function handleRemoveSampleData(): Promise<void> {
    const sampleCount = history.filter((e) => e.sample).length;
    if (sampleCount === 0) return;
    setDestructive({
      title: 'Remove sample data?',
      body: `This deletes the ${sampleCount} sample demo session(s). Your own sessions will be kept. This cannot be undone.`,
      cta: 'Remove samples',
      run: async () => {
        const removed = await deleteSampleHistory();
        setHistory((cur) => cur.filter((e) => !e.sample));
        setImportMsg(`Removed ${removed} sample session(s).`);
        const nextMeta = { ...meta, sampleNoticeDismissed: true };
        setMeta(nextMeta);
        void saveMeta(nextMeta);
      }
    });
  }

  function dismissSampleNotice(): void {
    const nextMeta = { ...meta, sampleNoticeDismissed: true };
    setMeta(nextMeta);
    void saveMeta(nextMeta);
  }

  async function handleClearFlags(): Promise<void> {
    setDestructive({
      title: 'Clear all flags?',
      body: 'This removes every reported item saved on this device. This cannot be undone.',
      cta: 'Clear flags',
      run: async () => { await replaceFlags([]); setFlags([]); }
    });
  }

  function handleDeleteFlag(flagId: string): void {
    setDestructive({
      title: 'Delete this flag?',
      body: 'This removes the reported item from your device. This cannot be undone.',
      cta: 'Delete',
      run: () => void clearFlagById(flagId)
    });
  }

  function handleDeleteEntry(entryId: string, entry: HistoryEntry): void {
    const label = `${entry.result.percent}% · ${shortDate(entry.completedAt)}`;
    setDestructive({
      title: 'Delete this session?',
      body: `This permanently removes the ${label} result and its answer review. This cannot be undone.`,
      cta: 'Delete',
      run: () => void removeHistoryEntry(entryId)
    });
  }

  function openReviewFromHistory(entry: HistoryEntry): void {
    setCompletedSession(entry);
    setReviewFrom('history');
    setResultFilter('all');
    setResultDomain('all');
    setExpandedReview({});
    setView('results');
  }

  function openReviewFromDashboard(entry: HistoryEntry): void {
    setCompletedSession(entry);
    setReviewFrom('dashboard');
    setResultFilter('all');
    setResultDomain('all');
    setExpandedReview({});
    setView('results');
  }

  async function acknowledgeDisclaimer(): Promise<void> {
    const nextMeta = { ...meta, disclaimerSeen: true };
    setMeta(nextMeta);
    await saveMeta(nextMeta);
  }

  function exportFlags(): void {
    downloadJson('cctc-flags.json', {
      schema: 'cctc-flags',
      version: 1,
      exportedAt: new Date().toISOString(),
      blueprint: settings.blueprintId,
      flags
    });
  }

  function exportBackup(): void {
    downloadJson('cctc-progress-' + new Date().toISOString().slice(0, 10) + '.json', {
      schema: 'cctc-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      prefs: meta,
      history,
      session: activeSession
    });
  }

  const importInputRef = useRef<HTMLInputElement | null>(null);

  function triggerImport(): void {
    if (importInputRef.current) importInputRef.current.click();
  }

  function onImportFile(e: ChangeEvent<HTMLInputElement>): void {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data || data.schema !== 'cctc-backup') {
          setImportMsg('That file isn\u2019t a CCTC progress backup.');
          return;
        }
        const hist: HistoryEntry[] = Array.isArray(data.history) ? data.history : [];
        setDestructive({
          title: 'Restore progress?',
          body: `This replaces the ${history.length} session(s) on this device with ${hist.length} from the backup (taken ${shortDate(data.exportedAt)}). Your current progress will be overwritten.`,
          cta: 'Restore',
          run: () => {
            setHistory(hist);
            if (data.prefs) setMeta(data.prefs);
            if (data.session) setActiveSession(data.session);
            else { setActiveSession(null); void clearActiveSession(); }
            setImportMsg(`Restored ${hist.length} session(s)${data.session ? ' + your in-progress session' : ''}.`);
          }
        });
      } catch {
        setImportMsg('Couldn\u2019t read that file \u2014 it may be corrupted.');
      }
    };
    reader.readAsText(f);
  }

  const [importMsg, setImportMsg] = useState('');
  const [syncConnected, setSyncConnected] = useState(false);
  const [syncFolderName, setSyncFolderName] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const syncDirRef = useRef<FileSystemDirectoryHandle | null>(null);
  const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function supportsDirSync(): boolean {
    return typeof window !== 'undefined' && !!(window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker;
  }

  async function connectSyncFolder(): Promise<void> {
    if (!supportsDirSync()) {
      setImportMsg('Folder sync needs a Chromium desktop browser (Chrome/Edge). Use Export/Import backup instead.');
      return;
    }
    try {
      const dir = await (window as unknown as { showDirectoryPicker: (opts: unknown) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({ id: 'cctc-sync', mode: 'readwrite' });
      syncDirRef.current = dir;
      setSyncConnected(true);
      setSyncFolderName(dir.name);
      setImportMsg('');
      void syncNow();
    } catch (e) {
      if (e && (e as Error).name === 'AbortError') return;
      setImportMsg('Your browser blocked the folder picker (this can happen in an embedded preview or non-secure context). Open the app in its own tab and try again, or use Export/Import below.');
    }
  }

  async function readJsonFromDir(dir: FileSystemDirectoryHandle, name: string): Promise<any | null> {
    try {
      const fh = await dir.getFileHandle(name);
      const f = await fh.getFile();
      return JSON.parse(await f.text());
    } catch { return null; }
  }

  async function writeJsonToDir(dir: FileSystemDirectoryHandle, name: string, obj: unknown): Promise<void> {
    const fh = await dir.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(JSON.stringify(obj, null, 2));
    await w.close();
  }

  function scheduleAutoSync(): void {
    if (!syncDirRef.current) return;
    if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current);
    autoSyncTimerRef.current = setTimeout(() => { void syncNow(true); }, 2500);
  }

  async function syncNow(auto?: boolean): Promise<void> {
    const dir = syncDirRef.current;
    if (!dir) { if (!auto) void connectSyncFolder(); return; }
    if (syncing) return;
    setSyncing(true);
    setImportMsg('');
    try {
      const folderSessions: Record<string, HistoryEntry> = {};
      for await (const [name, handle] of (dir as unknown as { entries(): AsyncIterable<[string, FileSystemHandle]> }).entries()) {
        if (handle.kind === 'file' && /^session-.*\.json$/.test(name)) {
          const obj = await readJsonFromDir(dir, name);
          if (obj && obj.id) folderSessions[obj.id] = obj;
        }
      }
      const localById: Record<string, HistoryEntry> = {};
      history.forEach((e) => { localById[e.id] = e; });
      const merged: Record<string, HistoryEntry> = { ...folderSessions, ...localById };
      const mergedList = Object.values(merged).sort((a, b) => a.completedAt.localeCompare(b.completedAt));
      for (const e of mergedList) {
        if (!folderSessions[e.id]) await writeJsonToDir(dir, 'session-' + e.id + '.json', e);
      }
      const cur = activeSession;
      if (cur && !cur.submittedAt) await writeJsonToDir(dir, 'current-session.json', cur);
      const folderMeta = await readJsonFromDir(dir, 'meta.json');
      const localMeta = meta;
      const metaDiffers = folderMeta && JSON.stringify({ t: folderMeta.targetThreshold, e: folderMeta.examDate }) !== JSON.stringify({ t: localMeta.targetThreshold, e: localMeta.examDate });
      const applyMerge = (chosenMeta: AppMeta | null) => {
        setHistory(mergedList);
        if (chosenMeta) { setMeta(chosenMeta); void saveMeta(chosenMeta); }
        setSyncing(false);
        setLastSyncAt(Date.now());
        setImportMsg('Synced · ' + mergedList.length + ' session(s) in folder.');
      };
      if (metaDiffers && !auto) {
        setSyncing(false);
        setDestructive({
          title: 'Settings differ between devices',
          body: 'Your target/exam-date on this device differ from the folder. Keep which? (Your session history is already merged either way.)',
          cta: 'Keep this device',
          altCta: 'Keep folder',
          run: () => { void writeJsonToDir(dir, 'meta.json', localMeta); applyMerge(localMeta); },
          altRun: () => { applyMerge(folderMeta as AppMeta); }
        });
      } else if (metaDiffers && auto) {
        applyMerge(null);
      } else {
        await writeJsonToDir(dir, 'meta.json', folderMeta || localMeta);
        applyMerge((folderMeta || localMeta) as AppMeta);
      }
    } catch {
      setSyncing(false);
      setImportMsg('Sync failed — check folder permissions and try again.');
    }
  }

  function runDestructive(): void {
    const d = destructive;
    setDestructive(null);
    if (d?.run) d.run();
  }

  function runDestructiveAlt(): void {
    const d = destructive;
    setDestructive(null);
    if (d?.altRun) d.altRun();
  }

  // Filtered review items (must be before early returns — Rules of Hooks)
  const completed = completedSession;
  const reviewItems = useMemo(() => {
    if (!completed) return [];
    const items = completed.items;
    const isCorrect = (it: SessionItemSnapshot) => completed.answers[it.itemId] === it.question.correct;
    const q = reviewQuery.trim().toLowerCase();
    return items.map((it, i) => ({ it, i })).filter(({ it }) => {
      if (resultFilter === 'correct' && !isCorrect(it)) return false;
      if (resultFilter === 'incorrect' && isCorrect(it)) return false;
      if (resultDomain !== 'all' && it.question.domain !== Number(resultDomain)) return false;
      if (q) {
        const hay = (it.question.stem + ' ' + it.question.options.map((o) => o.text).join(' ') + ' ' + it.question.id).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [completed, resultFilter, resultDomain, reviewQuery]);

  const nCorrect = completed ? completed.items.filter((it) => completed.answers[it.itemId] === it.question.correct).length : 0;
  const nIncorrect = completed ? completed.items.length - nCorrect : 0;

  if (!ready) {
    return <div className="app-main"><p style={{ color: 'var(--muted)', fontSize: '14px', padding: '40px 0' }}>Loading study data…</p></div>;
  }

  if (error) {
    return <div className="app-main"><div className="card" style={{ borderColor: 'var(--danger)' }}><p style={{ color: 'var(--dangertext)' }}>{error}</p></div></div>;
  }

  const hasResume = !!(session && !session.submittedAt);
  const examDays = daysToExam(meta.examDate ?? null);
  const headerDays = examDays === null ? 'Set' : examDays < 0 ? '—' : examDays + 'd';
  const daysText = examDays === null ? 'Set your exam date' : examDays < 0 ? 'Exam date has passed' : examDays === 0 ? 'Your exam is today' : examDays + ' day' + (examDays === 1 ? '' : 's') + ' to your exam';

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>

      {/* Disclaimer modal */}
      {!meta.disclaimerSeen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-eyebrow">Independent study aid</div>
            <h2 className="modal-title">Before you begin</h2>
            <p className="modal-body-text">This practice app is not affiliated with or endorsed by ABTC or PSI, does not reproduce real exam items, and is not a source of patient-care decisions. Practice results are unofficial estimates only.</p>
            <button className="modal-btn--full" onClick={() => void acknowledgeDisclaimer()}>I understand</button>
          </div>
        </div>
      )}

      {/* Start prompt modal */}
      {startPromptOpen && (
        <div className="modal-backdrop">
          <div className="modal-card modal-card--md">
            <h2 className="modal-title" style={{ fontSize: '21px' }}>Session in progress</h2>
            <p className="modal-body-text" style={{ marginBottom: '6px' }}>You have an unfinished session. Resume it, or start a new one — starting new discards your in-progress answers and bookmarks.</p>
            {pendingSessionSettings && (
              <p style={{ fontSize: '12.5px', color: 'var(--tealtext)', background: 'var(--tealsoft)', borderRadius: '9px', padding: '9px 12px', margin: '0 0 18px' }}>New session: {summary(pendingSessionSettings)}</p>
            )}
            <div className="modal-actions">
              <button className="modal-btn modal-btn--ghost" onClick={cancelStart}>Cancel</button>
              <button className="modal-btn modal-btn--secondary" onClick={startNewAnyway}>Start new</button>
              <button className="modal-btn modal-btn--primary" onClick={resumeFromPrompt}>Resume current</button>
            </div>
          </div>
        </div>
      )}

      {/* Submit/Finish confirm modal */}
      {confirmOpen && session && (
        <div className="modal-backdrop">
          <div className="modal-card modal-card--sm">
            <h2 className="modal-title" style={{ fontSize: '21px' }}>{session.settings.mode === 'exam' ? 'Submit exam?' : 'Finish session?'}</h2>
            <p className="modal-body-text">
              {session.items.length - countAnswered(session) > 0
                ? `You have ${session.items.length - countAnswered(session)} unanswered item(s); they will be marked incorrect. Submit and score now? You can review every answer afterward.`
                : `Submit and score your ${session.items.length} answers now? You can review every answer afterward.`}
            </p>
            <div className="modal-actions">
              <button className="modal-btn modal-btn--ghost" onClick={() => setConfirmOpen(false)}>Keep going</button>
              <button className="modal-btn modal-btn--primary" onClick={() => void doFinalize(session)}>{session.settings.mode === 'exam' ? 'Submit exam' : 'Finish'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Destructive confirm modal */}
      {destructive && (
        <div className="modal-backdrop">
          <div className="modal-card modal-card--sm">
            <h2 className="modal-title" style={{ fontSize: '21px' }}>{destructive.title}</h2>
            <p className="modal-body-text">{destructive.body}</p>
            <div className="modal-actions">
              <button className="modal-btn modal-btn--ghost" onClick={() => setDestructive(null)}>Cancel</button>
              {destructive.altCta && <button className="modal-btn modal-btn--secondary" onClick={runDestructiveAlt}>{destructive.altCta}</button>}
              <button className="modal-btn" style={{ border: 'none', background: destructive.altCta ? 'var(--teal)' : 'var(--danger)', color: '#fff' }} onClick={runDestructive}>{destructive.cta}</button>
            </div>
          </div>
        </div>
      )}

      {/* Report/Flag modal */}
      {reportOpen && (
        <div className="modal-backdrop">
          <div className="modal-card modal-card--md">
            <h2 className="modal-title" style={{ fontSize: '21px' }}>{editingFlagId ? 'Edit flag' : 'Report an issue'}</h2>
            <p className="modal-body-text" style={{ marginBottom: '18px' }}>Flag this item for SME review. Saved on this device.</p>
            <label className="report-field">Reason</label>
            <select className="report-select" value={reportReason} onChange={(e) => setReportReason(e.target.value as FlagReason)} style={{ marginBottom: '16px' }}>
              {FLAG_REASONS.map((r) => <option key={r} value={r}>{FLAG_REASON_LABELS_LONG[r] ?? r}</option>)}
            </select>
            <label className="report-field">Comment</label>
            <textarea className="report-textarea" rows={4} value={reportComment} onChange={(e) => setReportComment(e.target.value)} />
            <div className="modal-actions" style={{ marginTop: '18px' }}>
              <button className="modal-btn modal-btn--ghost" onClick={() => setReportOpen(false)}>Cancel</button>
              <button className="modal-btn modal-btn--primary" onClick={() => void saveReport()}>{editingFlagId ? 'Save changes' : 'Save flag'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="app-header" data-el="header">
        <div className="app-header__inner">
          <button className="brand-button" onClick={() => setView('dashboard')}>
            <span className="brand-tile">C</span>
            <span className="brand-word">CCTC Practice</span>
          </button>
          <nav className="header-nav" data-el="nav">
            <button className="header-stat" title="Set exam date" onClick={() => openCustomize(true)}>
              <span className="header-stat__value">{headerDays}</span>
              <span className="header-stat__label">To exam</span>
            </button>
            <button className="header-stat" title="Set target score" onClick={() => openCustomize(true)}>
              <span className="header-stat__value">{targetThreshold}%</span>
              <span className="header-stat__label">Target</span>
            </button>
            <span className="header-divider" />
            <button className={`nav-btn ${view === 'dashboard' ? 'nav-btn--active' : ''}`} title="Home" onClick={() => setView('dashboard')} data-el="nav-home">
              <svg className="nav-btn__icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
              <span className="nav-label">Home</span>
            </button>
            <button className={`nav-btn ${view === 'history' ? 'nav-btn--active' : ''}`} title="Progress" onClick={() => setView('history')} data-el="nav-progress">
              <svg className="nav-btn__icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></svg>
              <span className="nav-label">Progress</span>
            </button>
            {hasResume && (
              <button className="nav-btn nav-btn--resume hdr-primary" title="Resume session" onClick={() => setView('session')} data-el="nav-resume">
                <svg className="nav-btn__icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                <span className="nav-label">Resume</span>
              </button>
            )}
            <button className="nav-btn hdr-primary" title={theme === 'night' ? 'Switch to day mode' : 'Switch to night mode'} onClick={(e) => toggleTheme(e)} data-el="nav-theme">
              <span style={{ fontSize: '16px', lineHeight: '18px' }}>{theme === 'night' ? '☀' : '☾'}</span>
              <span className="nav-label" style={{ color: 'var(--muted)' }}>{theme === 'night' ? 'Light' : 'Dark'}</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Bottom nav (mobile) */}
      <nav className="bottom-nav">
        <button className={`bnav-btn ${view === 'dashboard' ? 'bnav-btn--active' : ''}`} onClick={() => setView('dashboard')}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
          <span style={{ font: '600 10px var(--sans)' }}>Home</span>
        </button>
        <button className={`bnav-btn ${view === 'history' ? 'bnav-btn--active' : ''}`} onClick={() => setView('history')}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></svg>
          <span style={{ font: '600 10px var(--sans)' }}>Progress</span>
        </button>
        {hasResume && (
          <button className="bnav-btn bnav-btn--active" onClick={() => setView('session')}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            <span style={{ font: '600 10px var(--sans)' }}>Resume</span>
          </button>
        )}
        <button className="bnav-btn" onClick={(e) => toggleTheme(e)}>
          <span style={{ fontSize: '18px', lineHeight: '20px' }}>{theme === 'night' ? '☀' : '☾'}</span>
          <span style={{ font: '600 10px var(--sans)', color: 'var(--muted)' }}>{theme === 'night' ? 'Light' : 'Dark'}</span>
        </button>
      </nav>

      <main className="app-main" id="main-content">
        {/* ===== DASHBOARD ===== */}
        {view === 'dashboard' && (
          <div className="dashboard">
            {bankError && (
              <div style={{ background: 'var(--dangersoft)', border: '1px solid var(--danger)', borderRadius: '14px', padding: '16px 18px' }}>
                <div style={{ font: '600 14px var(--sans)', color: 'var(--dangertext)' }}>No questions available</div>
                <div style={{ fontSize: '12.5px', color: 'var(--ink)', marginTop: '5px', lineHeight: 1.5 }}>No questions match the current filters. Try changing the focus, question set, or include draft items.</div>
              </div>
            )}

            {/* Sample data notice — one-time, dismissible */}
            {history.some((e) => e.sample) && !meta.sampleNoticeDismissed && (
              <div className="sample-notice" role="status">
                <div style={{ minWidth: 0 }}>
                  <div className="sample-notice__title">Showing sample data</div>
                  <div className="sample-notice__body">These are demo sessions so you can see the analytics. Clear them in Progress when you&apos;re ready to start.</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                  <button className="sample-notice__remove" onClick={() => void handleRemoveSampleData()}>Remove sample data</button>
                  <button className="sample-notice__close" onClick={dismissSampleNotice} aria-label="Dismiss sample data notice">×</button>
                </div>
              </div>
            )}

            <h1>Welcome back</h1>
            <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 4px' }}>{bank.questions.length} items · {getBlueprint(settings.blueprintId).default_exam_items}-item exam, {getBlueprint(settings.blueprintId).default_time_minutes} min</p>

            {/* Resume banner */}
            {hasResume && session && (
              <div className="resume-banner" data-el="resume-banner">
                <div>
                  <div className="resume-banner__eyebrow">Continue</div>
                  <div className="resume-banner__text">
                    <span className="resume-banner__text--bold">Resume your session</span>
                    <span className="resume-banner__text--muted"> · Item {session.currentIndex + 1} of {session.items.length} · {session.settings.mode === 'exam' ? 'Exam' : 'Study'}{session.remainingSeconds != null ? ` · ${clock(session.remainingSeconds)} left` : ''}</span>
                  </div>
                </div>
                <button className="resume-banner__btn" onClick={() => setView('session')}>Resume →</button>
              </div>
            )}

            {/* Two-column row */}
            <div className="dash-grid">
              {/* Readiness + Domains card */}
              <div className="card" data-el="card">
                <div className="readiness-row">
                  <div className="donut" style={{ background: `conic-gradient(var(--teal) 0% ${readinessPct ?? 0}%, var(--ring) ${readinessPct ?? 0}% 100%)` }}>
                    <div className="donut__inner">
                      <div className="donut__value">{readinessPct === null ? '—' : readinessPct + '%'}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="readiness-label">Practice readiness</span>
                      <span className={`badge badge--${insight.badgeKind}`}>{insight.badge}</span>
                    </div>
                    <div className="readiness-sub">Weighted recent exam average
                      <button onClick={() => setReadyInfoOpen(!readyInfoOpen)} title="How is this calculated?" style={{ display: 'inline-grid', placeItems: 'center', width: '16px', height: '16px', borderRadius: '50%', border: '1px solid var(--line2)', background: 'var(--surface2)', fontSize: '9px', fontWeight: 700, color: 'var(--muted)', marginLeft: '5px', flexShrink: 0 }}>i</button>
                      {readyInfoOpen && (
                        <span style={{ position: 'absolute', top: '24px', left: '0', display: 'block', width: 'min(280px, 78vw)', background: 'var(--ink)', color: 'var(--surface)', borderRadius: '10px', padding: '11px 13px', fontSize: '12px', lineHeight: '1.5', fontWeight: 400, boxShadow: '0 10px 30px rgba(0,0,0,.28)', zIndex: 20 }}>
                          Readiness is an exponential moving average (EMA) of your recent exam-mode scores — the most recent sessions count the most, so it tracks where you are now rather than your all-time average. Study sessions are excluded. Target: {targetThreshold}%.
                        </span>
                      )}
                    </div>
                    <div className={`readiness-delta ${readinessDelta === null ? 'delta--none' : readinessDelta > 0 ? 'delta--up' : readinessDelta < 0 ? 'delta--down' : 'delta--none'}`}>
                      {readinessDelta === null ? 'No exam sessions yet' : readinessDelta > 0 ? `▲ ${readinessDelta} pts` : readinessDelta < 0 ? `▼ ${Math.abs(readinessDelta)} pts` : 'No change'}
                    </div>
                  </div>
                </div>
                <div className="insight-box">
                  <p className="insight-text">{insight.text}</p>
                  <button className="insight-action" onClick={startRecommended} data-el="btn-primary">{insight.label}</button>
                </div>
                <div className="domains-header">
                  <span className="eyebrow">Domains</span>
                  <span className="domains-subtitle">recent performance · share of exam</span>
                </div>
                {domainList.map((d) => {
                  const emaVal = domainEMA(history, d.id);
                  const st = domainStatus(emaVal, targetThreshold);
                  const stLabel = statusLabel(st);
                  const stColor = statusColor(st);
                  const stTextColor = statusTextColor(st);
                  return (
                    <div className="domain-row" key={d.id}>
                      <div className="domain-row__top">
                        <span className="domain-name">
                          {d.short}
                          {d.weightPct != null && <span className="weight-chip">{d.weightPct}% of exam</span>}
                        </span>
                        <span className="domain-right">
                          <span className={`status-label status-label--${st === 'none' ? 'none' : st}`}>{stLabel}</span>
                          <span style={{ color: stTextColor }}>{emaVal === null ? '—' : emaVal + '%'}</span>
                        </span>
                      </div>
                      <div className="bar-track"><div className="bar-fill" style={{ width: (emaVal ?? 0) + '%', background: stColor }} /></div>
                    </div>
                  );
                })}
              </div>

              {/* Quick start card */}
              <div className="card">
                <div className="eyebrow" style={{ marginBottom: '14px' }}>Quick start</div>
                <div className="quick-start">
                  <button className="quick-card" onClick={() => preset('full')} data-el="quick-card">
                    <div className="quick-card__title">Full mock exam</div>
                    <div className="quick-card__sub">All {bank.questions.length} items · timed 180 min</div>
                  </button>
                  <button className="quick-card" onClick={() => preset('quick')}>
                    <div className="quick-card__title">Quick exam</div>
                    <div className="quick-card__sub">25 questions · 30 min · exam</div>
                  </button>
                  <button className="quick-card" onClick={() => preset('weak')}>
                    <div className="quick-card__title">Weak areas</div>
                    <div className="quick-card__sub">
                      {(() => {
                        const w = weakDomains(history, domainList, targetThreshold);
                        const base = w.length ? `Study · ${w.map((x) => DOMAIN_SHORT_NAMES[x.id] ?? x.name).join(', ')}` : 'Study · all domains · on target';
                        return base + (incorrectIds.length ? ' · revisits your misses' : '');
                      })()}
                    </div>
                  </button>
                </div>

                {/* Last custom tile */}
                {meta.lastCustomSettings && (
                  <button className="last-custom" onClick={() => { setSettings(meta.lastCustomSettings!); startFlow(meta.lastCustomSettings!); }}>
                    <span>
                      <span className="last-custom__label">Your last custom setup</span>
                      <span className="last-custom__summary">{summary(meta.lastCustomSettings)}</span>
                    </span>
                    <span className="last-custom__start">Start →</span>
                  </button>
                )}

                {/* Customize expandable */}
                <div className="customize-anchor" id="customize-anchor">
                  <button className="customize-toggle" onClick={() => setCustomizeOpen(!customizeOpen)}>
                    <span>
                      <span className="customize-toggle__label">Customize a session</span>
                      <span className="customize-toggle__sub">Mode, question set, focus, count, timing &amp; more</span>
                    </span>
                    <span className="customize-chevron">{customizeOpen ? '−' : '+'}</span>
                  </button>
                  {customizeOpen && (
                    <div className="customize-body">
                      {/* Mode */}
                      <div>
                        <div className="form-label">Mode</div>
                        <div className="seg">
                          <button className={`seg__btn ${settings.mode === 'exam' ? 'seg__btn--active' : ''}`} onClick={() => updateSettings({ mode: 'exam', includeDrafts: false })}>Exam</button>
                          <button className={`seg__btn ${settings.mode === 'study' ? 'seg__btn--active' : ''}`} onClick={() => updateSettings({ mode: 'study' })}>Study</button>
                        </div>
                        <div className="form-hint">{settings.mode === 'exam' ? 'Answers and explanations are revealed only after you submit.' : 'Each answer reveals the explanation immediately.'}</div>
                      </div>

                      {/* Question set */}
                      <div>
                        <div className="form-label">Question set</div>
                        <div className="seg">
                          <button className={`seg__btn ${settings.questionSet !== 'scenario' ? 'seg__btn--active' : ''}`} onClick={() => updateSettings({ questionSet: 'standard' })}>Standard bank</button>
                          <button className={`seg__btn ${settings.questionSet === 'scenario' ? 'seg__btn--active' : ''}`} onClick={() => updateSettings({ questionSet: 'scenario' })}>Scenario companions</button>
                        </div>
                        <div className="form-hint">{settings.questionSet === 'scenario' ? 'Longer clinical vignettes paired with the standard bank.' : 'Focused single-concept items written to the content outline.'}</div>
                      </div>

                      {/* Focus */}
                      <div>
                        <div className="form-label">Focus</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button className={`chip ${(settings.domains ?? 'all') === 'all' ? 'chip--active' : ''}`} onClick={() => toggleDomain('all')}>All domains</button>
                          {domainList.map((d) => (
                            <button key={d.id} className={`chip ${settings.domains !== 'all' && settings.domains?.includes(d.id) ? 'chip--active' : ''}`} onClick={() => toggleDomain(d.id)}>{d.short}</button>
                          ))}
                        </div>
                      </div>

                      {/* Count + Time */}
                      <div style={{ display: 'grid', gap: '18px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <div>
                          <div className="form-label">Question count</div>
                          <input className="form-input" type="number" min={5} max={availableQuestionCount} value={settings.questionCount} onChange={(e) => updateSettings({ questionCount: parseInt(e.target.value, 10) || 5 })} />
                          <div className="form-hint">{availableQuestionCount} items available for this focus</div>
                        </div>
                        <div>
                          <div className="form-label">Time limit (minutes)</div>
                          <input className="form-input" type="number" min={1} value={settings.timeMinutes} disabled={!settings.timed} onChange={(e) => updateSettings({ timeMinutes: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
                        </div>
                      </div>

                      {/* Toggles */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div className="form-label" style={{ marginBottom: 0 }}>Timed session</div>
                            <div className="form-hint">Counts down like the real 3-hour exam</div>
                          </div>
                          <button className={`toggle ${settings.timed ? 'toggle--on' : ''}`} onClick={() => updateSettings({ timed: !settings.timed })}><span className="toggle__knob" /></button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div className="form-label" style={{ marginBottom: 0 }}>Show timer on screen</div>
                            <div className="form-hint">Hide it to reduce pressure</div>
                          </div>
                          <button className={`toggle ${settings.showTimer ? 'toggle--on' : ''}`} onClick={() => updateSettings({ showTimer: !settings.showTimer })}><span className="toggle__knob" /></button>
                        </div>
                      </div>

                      {/* Advanced */}
                      <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
                        <button className="advanced-toggle" onClick={() => setAdvancedOpen(!advancedOpen)}>{(advancedOpen ? '− ' : '+ ') + 'Exam preferences & advanced'}</button>
                        {advancedOpen && (
                          <div className="advanced-body">
                            <div>
                              <div className="form-label">Exam date</div>
                              <input className="form-input" type="date" value={meta.examDate ?? ''} onChange={(e) => setExamDate(e.target.value)} style={{ maxWidth: '340px' }} />
                              <div className="form-hint">{(() => { const d = daysToExam(meta.examDate ?? null); if (d === null) return 'Set this to see a live countdown and readiness pacing.'; if (d < 0) return 'This date has passed — update it for an upcoming attempt.'; if (d === 0) return 'Your exam is today. Good luck.'; return d + ' day' + (d === 1 ? '' : 's') + ' from today.'; })()}</div>
                            </div>
                            <div>
                              <div className="form-label">Target score: {targetThreshold}%</div>
                              <input type="range" min={50} max={90} step={1} value={targetThreshold} onChange={(e) => setTarget(parseInt(e.target.value, 10))} style={{ width: '100%', maxWidth: '340px', accentColor: 'var(--teal)' }} />
                              <div className="form-hint">Your personal pass goal. Sets the pass/below line on results, readiness, weak areas, and trend bars. Saved as a preference.</div>
                            </div>
                            <div>
                              <div className="form-label">Blueprint version</div>
                              <select className="form-input" value={settings.blueprintId} onChange={(e) => updateSettings({ blueprintId: e.target.value as BlueprintId })} style={{ maxWidth: '340px' }}>
                                <option value="cctc-from-2026-07">2026-07 outline (default)</option>
                                <option value="cctc-thru-2026-06">Legacy outline (until 2026-06)</option>
                              </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '340px' }}>
                              <div>
                                <div className="form-label" style={{ marginBottom: 0 }}>Include draft items</div>
                                <div className="form-hint">Exam mode is reviewed-only</div>
                              </div>
                              <button className={`toggle ${settings.includeDrafts ? 'toggle--on' : ''}`} onClick={() => settings.mode !== 'exam' && updateSettings({ includeDrafts: !settings.includeDrafts })}><span className="toggle__knob" /></button>
                            </div>
                          </div>
                        )}
                      </div>

                      <button className="start-btn" onClick={startSessionFromForm} data-el="btn-primary">Start {settings.mode === 'exam' ? 'exam' : 'study'} · {Math.min(settings.questionCount, availableQuestionCount)} items</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent sessions */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
                <div className="eyebrow">Recent sessions</div>
                <button style={{ background: 'none', border: 'none', color: 'var(--tealtext)', font: '600 12px var(--sans)', padding: 0 }} onClick={() => setView('history')}>View all history →</button>
              </div>
              {history.length > 0 ? (
                <div>
                  <div className="recent-header">
                    <span>Date</span><span>Mode</span><span>Questions</span><span>Score</span><span>Duration</span>
                  </div>
                  {history.slice().sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 5).map((e) => {
                    const isExam = e.settings.mode === 'exam';
                    const pass = e.result.estimatedPass;
                    const canReview = !!(e.items && e.items.length > 0);
                    return (
                      <div key={e.id} className={`recent-row ${canReview ? 'recent-row--clickable' : ''}`} onClick={() => canReview && openReviewFromDashboard(e)}>
                        <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{shortDate(e.completedAt)}</span>
                        <span><span className={`mode-chip mode-chip--${isExam ? 'exam' : 'study'}`}>{isExam ? 'Exam' : 'Study'}</span></span>
                        <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{e.result.total}</span>
                        <span style={{ font: '700 13px var(--sans)', color: pass ? 'var(--successtext)' : 'var(--dangertext)' }}>{e.result.percent}%</span>
                        <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{durationMin(e.timeUsedSeconds)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>Your completed sessions will appear here.</p>
              )}
            </div>
          </div>
        )}

        {/* ===== SESSION ===== */}
        {view === 'session' && session && session.items.length > 0 && (
          <SessionView
            session={session}
            onExit={() => setView('dashboard')}
            onBookmark={toggleBookmark}
            onToggleMenu={() => setMenuOpen(!menuOpen)}
            menuOpen={menuOpen}
            onToggleTimerHidden={toggleTimerHidden}
            onOpenReport={() => openReport()}
            onAnswer={handleAnswer}
            onNavPrev={() => navigateSession(-1)}
            onNavNext={() => navigateSession(1)}
            onOpenMap={() => setMapOpen(!mapOpen)}
            mapOpen={mapOpen}
            onGoItem={(i) => { mutateSession((s) => ({ ...s, currentIndex: i })); setMapOpen(false); }}
            onSubmit={() => void finalizeSession()}
          />
        )}

        {/* ===== RESULTS + REVIEW ===== */}
        {view === 'results' && completed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Hero */}
            <div className="results-hero">
              <div className="results-hero__eyebrow">{completed.settings.mode === 'exam' ? 'Exam' : 'Study'} complete</div>
              <div className="results-hero__pct">{completed.result.percent}%</div>
              <div className="results-hero__detail">{completed.result.correct} of {completed.result.total} correct · Time {clock(completed.timeUsedSeconds)}</div>
              <div className={`results-hero__badge ${completed.result.estimatedPass ? 'results-badge--pass' : 'results-badge--below'}`}>
                {completed.result.estimatedPass ? `At or above your ${targetThreshold}% target` : `Below your ${targetThreshold}% target`}
              </div>
            </div>

            {/* By domain */}
            <div className="card">
              <div className="eyebrow" style={{ marginBottom: '14px' }}>By domain</div>
              {completed.result.breakdown.map((b) => {
                const pct = b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0;
                const color = pct >= 75 ? 'var(--success)' : pct >= 65 ? 'var(--gold)' : 'var(--danger)';
                return (
                  <div className="breakdown-row" key={b.categoryId}>
                    <div className="breakdown-row__top">
                      <span>Domain {b.categoryId} · {b.categoryLabel}</span>
                      <span className="breakdown-row__score">{b.correct}/{b.total} · {pct}%</span>
                    </div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: pct + '%', background: color }} /></div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="results-actions">
              <button className="retake-btn" onClick={() => beginNewSession(completed.settings)}>Retake</button>
              <button className="back-btn" onClick={() => setView(reviewFrom === 'history' ? 'history' : 'dashboard')}>{reviewFrom === 'history' ? 'Back to progress' : 'Home'}</button>
            </div>

            {/* Review answers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="review-header">
                <div className="review-title">Review answers</div>
                <div className="review-count">{completed.items.length} question{completed.items.length === 1 ? '' : 's'}</div>
              </div>
              <input className="review-search" type="search" placeholder="Search questions & answers…" value={reviewQuery} onChange={(e) => setReviewQuery(e.target.value)} />
              <div className="review-filters">
                <div className="seg">
                  <button className={`seg__btn seg__btn--sm ${resultFilter === 'all' ? 'seg__btn--active' : ''}`} onClick={() => setResultFilter('all')}>All {completed.items.length}</button>
                  <button className={`seg__btn seg__btn--sm ${resultFilter === 'incorrect' ? 'seg__btn--active' : ''}`} onClick={() => setResultFilter('incorrect')}>Incorrect {nIncorrect}</button>
                  <button className={`seg__btn seg__btn--sm ${resultFilter === 'correct' ? 'seg__btn--active' : ''}`} onClick={() => setResultFilter('correct')}>Correct {nCorrect}</button>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button className={`chip chip--sm ${resultDomain === 'all' ? 'chip--active' : ''}`} onClick={() => setResultDomain('all')}>All domains</button>
                  {[...new Set(completed.items.map((it) => it.question.domain))].sort().map((id) => {
                    const d = domainList.find((x) => x.id === id);
                    return <button key={id} className={`chip chip--sm ${resultDomain === id ? 'chip--active' : ''}`} onClick={() => setResultDomain(Number(id))}>{d?.short ?? `D${id}`}</button>;
                  })}
                </div>
              </div>

              {/* Review question map */}
              {completed.items.length > 0 && (
                <div className="q-map">
                  <div className="q-map__header">
                    <div className="eyebrow">Question map</div>
                    <div className="q-map__legend"><span style={{ color: 'var(--successtext)' }}>● Correct</span><span style={{ color: 'var(--dangertext)' }}>● Incorrect</span></div>
                  </div>
                  <div className="q-map__grid">
                    {completed.items.map((it, i) => {
                      const ans = completed.answers[it.itemId];
                      const correct = ans === it.question.correct;
                      return (
                        <button key={it.itemId} className="tracker-chip" style={correct ? { border: '1px solid var(--success)', background: 'var(--successsoft)' } : { border: '1px solid var(--danger)', background: 'var(--dangersoft)' }} onClick={() => {
                          setExpandedReview((cur) => ({ ...cur, [i]: true }));
                          setTimeout(() => {
                            const el = document.getElementById(`review-item-${i}`);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 50);
                        }}>{i + 1}</button>
                      );
                    })}
                  </div>
                </div>
              )}

              {reviewItems.length === 0 ? (
                <div className="review-empty">No questions match this filter.</div>
              ) : (
                reviewItems.map(({ it, i }) => {
                  const ans = completed.answers[it.itemId];
                  const correct = ans === it.question.correct;
                  const expanded = !!expandedReview[i];
                  const correctIdx = it.optionOrder.indexOf(it.question.correct);
                  const yourOpt = ans ? it.question.options.find((o) => o.id === ans) : null;
                  const correctOpt = it.question.options.find((o) => o.id === it.question.correct);
                  const refs = it.question.references ?? [];
                  return (
                    <div className="review-card" key={it.itemId} id={`review-item-${i}`}>
                      <button className="review-card__header" onClick={() => setExpandedReview((cur) => ({ ...cur, [i]: !cur[i] }))}>
                        <span className={`review-num ${correct ? 'review-num--correct' : ans ? 'review-num--incorrect' : 'review-num--skipped'}`}>{i + 1}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className="review-meta">
                            <span className={`verdict-badge ${correct ? 'verdict-badge--correct' : 'verdict-badge--incorrect'}`}>{correct ? 'Correct' : ans ? 'Incorrect' : 'Skipped'}</span>
                            <span className="review-category">D{it.question.domain} · {DOMAIN_SHORT_NAMES[it.question.domain] ?? it.categoryLabel}</span>
                            <span className="review-qid">{it.question.id}</span>
                          </span>
                          <span className="review-stem">{it.question.stem}</span>
                          <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span className="review-answer-row">
                              <span className="review-answer-label">Your answer</span>
                              <span style={{ color: correct ? 'var(--successtext)' : ans ? 'var(--dangertext)' : 'var(--muted)', fontWeight: 600, fontStyle: !ans ? 'italic' : undefined }}>{yourOpt ? yourOpt.text : 'Not answered'}</span>
                            </span>
                            {!correct && (
                              <span className="review-answer-row">
                                <span className="review-answer-label">Correct</span>
                                <span style={{ color: 'var(--successtext)', fontWeight: 600 }}>{correctOpt?.text ?? ''}</span>
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="review-chevron">{expanded ? '−' : '+'}</span>
                      </button>
                      {expanded && (
                        <div className="review-expanded">
                          <p className="review-expanded__stem">{it.question.stem}</p>
                          <div className="review-options">
                            {it.optionOrder.map((oid, k) => {
                              const opt = it.question.options.find((o) => o.id === oid);
                              const letter = displayLetterForIndex(k);
                              const isC = it.question.correct === oid;
                              const isSel = ans === oid;
                              let cls = 'review-option';
                              let letterCls = 'review-option__letter';
                              let note = '';
                              let noteCls = '';
                              if (isC) { cls += ' review-option--correct'; letterCls += ' review-option__letter--correct'; note = 'Correct answer'; noteCls = 'review-option__note--correct'; }
                              if (isSel && !isC) { cls += ' review-option--incorrect'; letterCls += ' review-option__letter--incorrect'; note = 'Your answer'; noteCls = 'review-option__note--incorrect'; }
                              return (
                                <div key={oid} className={cls}>
                                  <span className={letterCls}>{letter}</span>
                                  <span className="review-option__text">{opt?.text}{note && <small className={`review-option__note ${noteCls}`}>{note}</small>}</span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="review-explanation">
                            <div className="explanation__header">Correct · {displayLetterForIndex(correctIdx >= 0 ? correctIdx : 0)}</div>
                            <p className="explanation__correct">{it.question.explanation.rationale_correct}</p>
                            {incorrectRationalesForDisplay(it).map((x) => (
                              <p key={x.displayLetter} className="explanation__incorrect"><strong style={{ color: 'var(--ink)' }}>{x.displayLetter}.</strong> {x.rationale}</p>
                            ))}
                            {refs.length > 0 && (
                              <div style={{ marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
                                <div style={{ font: '600 11px var(--sans)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '7px' }}>References</div>
                                {refs.map((r, k) => (
                                  <div key={k} className="explanation__ref">{r.citation}{r.locator && <span className="explanation__ref-locator">{r.locator}</span>}</div>
                                ))}
                              </div>
                            )}
                            <button className="review-report-btn" onClick={() => openReport(it.question)}>Report an issue</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ===== HISTORY / PROGRESS ===== */}
        {view === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="history-header">
              <div>
                <h1>Progress</h1>
                <p className="history-subtitle">{history.length > 0 ? `${history.length} sessions recorded` : 'Your completed sessions appear here'}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {history.some((e) => e.sample) && <button className="clear-btn" onClick={() => void handleRemoveSampleData()}>Remove sample data</button>}
                {history.length > 0 && <button className="clear-btn" onClick={() => void handleClearHistory()}>Clear history</button>}
              </div>
            </div>

            {history.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state__text">No completed sessions yet.</p>
                <button className="empty-state__btn" onClick={() => setView('dashboard')}>Start a session</button>
              </div>
            ) : (
              <>
                {/* Score trend card */}
                <div className="trend-card">
                  <div className="trend-header">
                    <div className="eyebrow">Score trend</div>
                    <div className="seg">
                      <button className={`seg__btn ${trendScope === 'exam' ? 'seg__btn--active' : ''}`} onClick={() => setTrendScope('exam')}>Exam</button>
                      <button className={`seg__btn ${trendScope === 'study' ? 'seg__btn--active' : ''}`} onClick={() => setTrendScope('study')}>Study</button>
                      <button className={`seg__btn ${trendScope === 'both' ? 'seg__btn--active' : ''}`} onClick={() => setTrendScope('both')}>Both</button>
                    </div>
                  </div>
                  {(() => {
                    const scoped = history.filter((e) => trendScope === 'study' ? e.settings.mode === 'study' : trendScope === 'both' ? true : e.settings.mode === 'exam').sort((a, b) => a.completedAt.localeCompare(b.completedAt));
                    const last8 = scoped.slice(-8);
                    const pcts = scoped.map((e) => e.result.percent);
                    const avg = last8.length > 0 ? Math.round(last8.reduce((a, b) => a + b.result.percent, 0) / last8.length) : null;
                    const best = pcts.length > 0 ? Math.max(...pcts) : null;
                    const delta = last8.length >= 2 ? last8[last8.length - 1].result.percent - last8[0].result.percent : null;
                    return (
                      <>
                        <div className="trend-stats">
                          <div><div className="trend-stat__label">Average</div><div className="trend-stat__value">{avg === null ? '—' : `${avg}%`}</div></div>
                          <div><div className="trend-stat__label">Best</div><div className="trend-stat__value">{best === null ? '—' : `${best}%`}</div></div>
                          <div><div className="trend-stat__label">Trend</div><div className="trend-stat__value" style={{ color: delta === null ? 'var(--muted)' : delta > 0 ? 'var(--successtext)' : delta < 0 ? 'var(--dangertext)' : 'var(--ink)' }}>{delta === null ? '—' : delta > 0 ? `+${delta}` : `${delta}`}</div></div>
                        </div>
                        {last8.length > 0 ? (
                          <ScoreTrendChart data={last8} domains={domainList} target={targetThreshold} theme={theme} />
                        ) : (
                          <div className="trend-empty">
                            {trendScope === 'study' ? 'No study sessions yet.' : trendScope === 'both' ? 'No sessions yet.' : 'No exam sessions yet.'}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* History rows */}
                <div className="history-rows">
                  {history.map((e) => {
                    const isExam = e.settings.mode === 'exam';
                    const pass = e.result.estimatedPass;
                    const canReview = !!(e.items && e.items.length > 0);
                    return (
                      <div key={e.id} className={`history-row ${canReview ? 'history-row--clickable' : ''}`} onClick={() => canReview && openReviewFromHistory(e)}>
                        <div className="history-row__top">
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span className="history-row__date">{dateTime(e.completedAt)}</span>
                              {e.sample && <span className="sample-badge">Sample</span>}
                            </div>
                            <div className="history-row__meta">
                              <span className={`mode-chip mode-chip--${isExam ? 'exam' : 'study'}`}>{isExam ? 'Exam' : 'Study'}</span>
                              <span className="history-row__meta-text">{e.result.total} items · {durationMin(e.timeUsedSeconds)}</span>
                            </div>
                            <div className="history-row__blueprint">blueprint {blueprintLabel(e.settings.blueprintId)}</div>
                          </div>
                          <div className="history-row__score-block">
                            <div style={{ textAlign: 'right' }}>
                              <div className="history-row__score" style={{ color: pass ? 'var(--successtext)' : 'var(--dangertext)' }}>{e.result.percent}%</div>
                              <div className="history-row__correct">{e.result.correct}/{e.result.total} correct</div>
                            </div>
                            <button className="delete-btn" title="Delete session" onClick={(ev) => { ev.stopPropagation(); handleDeleteEntry(e.id, e); }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                            </button>
                          </div>
                        </div>
                        <div className="history-row__domains">
                          {e.result.breakdown.map((b) => {
                            const pct = b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0;
                            const st = domainStatus(pct, targetThreshold);
                            const d = domainList.find((x) => x.id === Number(b.categoryId));
                            return (
                              <div className="domain-cell" key={b.categoryId}>
                                <div className="domain-cell__top">
                                  <span style={{ minWidth: 0 }}>
                                    <span className="domain-cell__tag" style={{ color: statusTextColor(st) }}>D{b.categoryId}</span>
                                    <span className="domain-cell__name">{d?.short ?? b.categoryLabel}</span>
                                  </span>
                                  <span className="domain-cell__score">{b.correct}/{b.total}</span>
                                </div>
                                <div className="bar-track" style={{ height: '7px' }}><div className="bar-fill" style={{ width: pct + '%', background: statusColor(st) }} /></div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Flags summary */}
                {flags.length > 0 && (
                  <div className="flags-summary">
                    <div>
                      <div className="flags-summary__count">{flags.length} reported item(s)</div>
                      <div className="flags-summary__sub">Reported items, stored on this device</div>
                    </div>
                    <button className="manage-flags-btn" onClick={() => setView('flags')}>Manage flags →</button>
                  </div>
                )}
              </>
            )}

            {/* Export/Import — always shown so fresh devices can restore from backup */}
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: '14px', padding: '16px 18px' }}>
              <div style={{ font: '600 13px var(--sans)', color: 'var(--ink)' }}>Move progress between devices</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px', lineHeight: 1.5 }}>Your progress is stored on this device only. Sync to a cloud-synced folder to carry it across devices, or export/import a backup file manually.</div>
              {supportsDirSync() && (
                <div style={{ marginTop: '12px', padding: '12px 14px', border: '1px solid var(--line)', borderRadius: '11px', background: 'var(--surface)' }}>
                  {syncConnected ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '12.5px', color: 'var(--ink)' }}>Folder: <strong>{syncFolderName}</strong> <span style={{ color: 'var(--muted)' }}>· {syncing ? 'syncing…' : lastSyncAt ? 'last synced ' + new Date(lastSyncAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'connected'}</span><span style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted)', marginTop: '3px' }}>Auto-syncs a moment after each answer and when you finish a session.</span></div>
                      <button style={{ padding: '9px 14px', border: 'none', borderRadius: '9px', background: 'var(--teal)', color: '#fff', font: '600 12.5px var(--sans)' }} onClick={() => void syncNow()}>{syncing ? 'Syncing…' : 'Sync now'}</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>Point at your Google Drive / OneDrive / iCloud synced folder — one file per session, merged across devices.</div>
                      <button style={{ padding: '9px 14px', border: 'none', borderRadius: '9px', background: 'var(--teal)', color: '#fff', font: '600 12.5px var(--sans)', whiteSpace: 'nowrap' }} onClick={() => void connectSyncFolder()}>Connect folder</button>
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', alignItems: 'center' }}>
                <span className="eyebrow" style={{ fontSize: '10.5px' }}>Manual backup</span>
                <button className="back-btn" style={{ padding: '8px 14px', fontSize: '12.5px' }} onClick={exportBackup}>Export</button>
                <button className="back-btn" style={{ padding: '8px 14px', fontSize: '12.5px' }} onClick={triggerImport}>Import</button>
                <input type="file" accept="application/json,.json" ref={importInputRef} onChange={onImportFile} style={{ display: 'none' }} />
              </div>
              {importMsg && <div style={{ fontSize: '12px', color: 'var(--tealtext)', marginTop: '10px' }}>{importMsg}</div>}
            </div>
          </div>
        )}

        {/* ===== FLAGS ===== */}
        {view === 'flags' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="flags-header">
              <div>
                <button className="flags-back" onClick={() => setView('history')}>‹ Back to progress</button>
                <h1 className="flags-title">Reported items</h1>
                <p className="flags-subtitle">{flags.length} reported item(s) flagged for SME review · stored on this device</p>
              </div>
              {flags.length > 0 && (
                <div className="flags-actions">
                  <button className="export-btn" onClick={exportFlags}>Export JSON</button>
                  <button className="clear-btn" onClick={() => void handleClearFlags()}>Clear all</button>
                </div>
              )}
            </div>

            {flags.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state__text">No reported items. Use {'\u201c'}Report an issue{'\u2019'} from a question{'\u2019'}s menu to flag content for review.</p>
              </div>
            ) : (
              <div className="flag-rows">
                {flags.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((f) => (
                  <div className="flag-card" key={f.id}>
                    <div className="flag-card__top">
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="flag-card__reason">{FLAG_REASON_LABELS_SHORT[f.reason] ?? f.reason}</span>
                          <span className="flag-card__itemid">{f.item_id}</span>
                          {f.domain != null && <span className="flag-card__domain">Domain {f.domain}</span>}
                        </div>
                        {f.itemStem && <div className="flag-card__stem">{f.itemStem}</div>}
                        <div className="flag-card__comment" style={{ marginTop: '8px' }}>{(f.comment ?? '').trim() || 'No comment added.'}</div>
                        <div className="flag-card__date">{dateTime(f.updatedAt)}</div>
                      </div>
                      <div className="flag-card__actions">
                        <button className="flag-edit-btn" onClick={() => editFlag(f.id)}>Edit</button>
                        <button className="flag-delete-btn" onClick={() => handleDeleteFlag(f.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <div className="app-footer__inner">
          <span className="app-footer__text">Independent study aid · not affiliated with or endorsed by ABTC or PSI · does not reproduce real exam questions · not a source of patient-care decisions. Practice results are unofficial estimates.</span>
          <a className="app-footer__link" href="https://donate.stripe.com/dRm9AMcYs0sa2F8dNQ18c00" target="_blank" rel="noopener">♥ Support this project</a>
        </div>
      </footer>
    </div>
  );
}

// Session view component
function SessionView({
  session, onExit, onBookmark, onToggleMenu, menuOpen, onToggleTimerHidden,
  onOpenReport, onAnswer, onNavPrev, onNavNext, onOpenMap, mapOpen, onGoItem, onSubmit
}: {
  session: ActiveSession;
  onExit: () => void;
  onBookmark: () => void;
  onToggleMenu: () => void;
  menuOpen: boolean;
  onToggleTimerHidden: () => void;
  onOpenReport: () => void;
  onAnswer: (optionId: string) => void;
  onNavPrev: () => void;
  onNavNext: () => void;
  onOpenMap: () => void;
  mapOpen: boolean;
  onGoItem: (i: number) => void;
  onSubmit: () => void;
}) {
  const safeIdx = Math.min(Math.max(session.currentIndex, 0), session.items.length - 1);
  const it = session.items[safeIdx];
  const ans = session.answers[it.itemId];
  const revealed = session.settings.mode === 'study' ? !!session.revealed[it.itemId] : !!session.submittedAt;
  const total = session.items.length;
  const bm = session.flaggedForReview.includes(it.itemId);

  const options = it.optionOrder.map((oid, i) => {
    const opt = it.question.options.find((o) => o.id === oid);
    const letter = displayLetterForIndex(i);
    const selected = ans === oid;
    const correct = it.question.correct === oid;
    let cls = 'option-btn';
    let letterCls = 'option-letter';
    if (revealed && correct) { cls += ' option-btn--correct'; letterCls += ' option-letter--correct'; }
    else if (revealed && selected && !correct) { cls += ' option-btn--incorrect'; letterCls += ' option-letter--incorrect'; }
    else if (selected) { cls += ' option-btn--selected'; letterCls += ' option-letter--selected'; }
    if (revealed && session.settings.mode === 'exam') cls += ' option-btn--locked';
    return { oid, letter, text: opt?.text ?? '', hasSelects: !!opt?.selects, selectsText: opt?.selects ? 'Selects: ' + opt.selects.join(', ') : '', cls, letterCls, onClick: revealed && session.settings.mode === 'exam' ? undefined : () => onAnswer(oid) };
  });

  const correctIdx = it.optionOrder.indexOf(it.question.correct);
  const refs = it.question.references ?? [];
  const expIncorrect = incorrectRationalesForDisplay(it);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="session-top">
        <button className="exit-btn" onClick={onExit}>‹ Exit</button>
        <span className="item-pos">Item {session.currentIndex + 1} of {total}</span>
        <div className="session-actions">
          <button className={`bookmark-btn ${bm ? 'bookmark-btn--on' : ''}`} onClick={onBookmark}>{bm ? '★' : '☆'}</button>
          <button className="overflow-btn" onClick={onToggleMenu}>⋯</button>
          {menuOpen && (
            <div className="overflow-menu">
              <button className="overflow-item" onClick={onToggleTimerHidden}>{session.settings.showTimer ? 'Hide timer' : 'Show timer'}</button>
              <button className="overflow-item" onClick={onOpenReport}>Report an issue</button>
            </div>
          )}
        </div>
      </div>

      <div className="progress-track"><div className="progress-fill" style={{ width: Math.round((session.currentIndex + 1) / total * 100) + '%' }} /></div>

      <div className="session-badges">
        <div className="session-badges__left">
          <span className="badge--teal">Domain {it.question.domain} · {DOMAIN_SHORT_NAMES[it.question.domain] ?? it.categoryLabel}</span>
          <span className="badge--neutral">{it.question.type === 'one_best' ? 'Single best answer' : 'Complex combo'}</span>
        </div>
        {session.settings.timed && session.settings.showTimer && !session.submittedAt && (
          <span className="timer-pill">{clock(session.remainingSeconds)}</span>
        )}
      </div>

      <div className="question-card">
        <p className="question-stem">{it.question.stem}</p>
        {it.question.elements && it.question.elements.length > 0 && (
          <ol className="element-list">
            {it.question.elements.map((e) => <li key={e.id}><strong>{e.id}.</strong> {e.text}</li>)}
          </ol>
        )}
        <div className="option-list">
          {options.map((opt) => (
            <button key={opt.oid} className={opt.cls} onClick={opt.onClick} data-el="option-button">
              <span className={opt.letterCls} data-el="option-letter">{opt.letter}</span>
              <span className="option-text">{opt.text}{opt.hasSelects && <small className="option-selects">{opt.selectsText}</small>}</span>
            </button>
          ))}
        </div>

        {revealed && (
          <div className="explanation">
            <div className="explanation__header">Correct · {displayLetterForIndex(correctIdx >= 0 ? correctIdx : 0)}</div>
            <p className="explanation__correct">{it.question.explanation.rationale_correct}</p>
            {expIncorrect.map((x) => (
              <p key={x.displayLetter} className="explanation__incorrect"><strong style={{ color: 'var(--ink)' }}>{x.displayLetter}.</strong> {x.rationale}</p>
            ))}
            {refs.length > 0 && (
              <div style={{ marginTop: '12px', borderTop: '1px solid var(--expline)', paddingTop: '12px' }}>
                <div className="explanation__refs-header">References</div>
                {refs.map((r, k) => (
                  <div key={k} className="explanation__ref">{r.citation}{r.locator && <span className="explanation__ref-locator">{r.locator}</span>}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="session-nav">
        <button className={`nav-prev ${session.currentIndex === 0 ? 'nav-prev--disabled' : ''}`} onClick={onNavPrev}>Previous</button>
        <button className={`nav-next ${session.currentIndex === total - 1 ? 'nav-next--disabled' : ''}`} onClick={onNavNext}>Next</button>
        <div style={{ flex: 1 }} />
        <button className="map-btn" onClick={onOpenMap}>Map</button>
        <button className="submit-btn" onClick={onSubmit} data-el="btn-primary">{session.settings.mode === 'exam' ? 'Submit' : 'Finish'}</button>
      </div>

      {mapOpen && (
        <div className="q-map">
          <div className="q-map__header">
            <div className="eyebrow">Question map</div>
            <div className="q-map__legend"><span>● Answered</span><span>★ Bookmarked</span></div>
          </div>
          <div className="q-map__grid">
            {session.items.map((item, i) => {
              const answered = !!session.answers[item.itemId];
              const bmk = session.flaggedForReview.includes(item.itemId);
              const cur = i === session.currentIndex;
              let cls = 'tracker-chip';
              if (answered) cls += ' tracker-chip--answered';
              if (cur) cls += ' tracker-chip--current';
              if (bmk && !cur) cls += ' tracker-chip--bookmarked';
              return <button key={item.itemId} className={cls} onClick={() => onGoItem(i)}>{i + 1}</button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Score trend chart component using Recharts
function ScoreTrendChart({
  data, domains, target, theme
}: {
  data: HistoryEntry[];
  domains: Array<{ id: number; short: string }>;
  target: number;
  theme: Theme;
}) {
  const chartData = data.map((e) => {
    const tot = e.result.total || 1;
    const row: Record<string, string | number> = { name: shortDate(e.completedAt) };
    domains.forEach((d) => {
      const b = e.result.breakdown.find((x) => x.categoryId === String(d.id));
      row[d.short] = b ? Math.round((b.correct / tot) * 1000) / 10 : 0;
    });
    return row;
  });

  const trendPalette: Record<number, string> = theme === 'night'
    ? { 1: '#2a937c', 2: '#f4a24b', 3: '#767ad8' }
    : { 1: '#006652', 2: '#a75c00', 3: '#6364c0' };

  const domSorted = domains.slice().sort((a, b) => a.id - b.id);
  const axisColor = theme === 'night' ? '#aa9f8c' : '#6f6557';
  const gridColor = theme === 'night' ? '#332d24' : '#e6dcc9';
  const tooltipBg = theme === 'night' ? '#211d16' : '#fffdf9';
  const tooltipBorder = theme === 'night' ? '#443d31' : '#ddd2bf';
  const tooltipInk = theme === 'night' ? '#f1ebdf' : '#221d16';
  const barStrong = theme === 'night' ? '#3f9d72' : '#2f7d5b';
  const barMid = theme === 'night' ? '#c79a5a' : '#b07a3c';
  const barWeak = theme === 'night' ? '#cf7a70' : '#a8443b';

  const [useFallback, setUseFallback] = useState(false);

  function drawNativeSvg(): React.ReactElement {
    const n = chartData.length;
    const VBW = 600, padL = 30, padR = 12, padT = 12, chartH = 240 - 46, axisY = padT + chartH;
    const innerW = VBW - padL - padR;
    const slot = n > 1 ? innerW / (n - 1) : innerW;
    const bw = Math.max(10, Math.min(34, slot * 0.5));
    function xAt(i: number) { return n > 1 ? padL + i * (innerW / (n - 1)) : padL + innerW / 2; }
    function yAt(v: number) { return padT + (100 - Math.max(0, Math.min(100, v))) / 100 * chartH; }
    function overall(row: Record<string, string | number>): number {
      let s = 0; domSorted.forEach((d) => { s += Number(row[d.short] ?? 0); }); return Math.round(s);
    }
    function barColor(v: number): string {
      if (v >= target) return barStrong;
      if (v >= target - 15) return barMid;
      return barWeak;
    }
    return (
      <svg viewBox={`0 0 ${VBW} 240`} width="100%" height={240} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', overflow: 'hidden', width: '100%', height: 240 }}>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={padL} x2={VBW - padR} y1={yAt(v)} y2={yAt(v)} stroke={gridColor} strokeWidth={0.75} strokeDasharray="3 3" />
            <text x={padL - 6} y={yAt(v) + 3} textAnchor="end" fontSize={10} fill={axisColor} fontFamily="Public Sans, sans-serif">{v}</text>
          </g>
        ))}
        {chartData.map((row, ix) => {
          const v = overall(row);
          const x = xAt(ix) - bw / 2;
          const y = yAt(v);
          const hgt = Math.max(2, axisY - y);
          return (
            <g key={ix}>
              <rect x={x.toFixed(1)} y={y.toFixed(1)} width={bw.toFixed(1)} height={hgt.toFixed(1)} rx={5} fill={barColor(v)} />
              {(n <= 1 || ix % Math.ceil(n / 6) === 0 || ix === n - 1) && (
                <text x={xAt(ix).toFixed(1)} y={axisY + 16} textAnchor="middle" fontSize={10} fill={axisColor} fontFamily="Public Sans, sans-serif">{String(row.name)}</text>
              )}
            </g>
          );
        })}
        <line x1={padL} x2={VBW - padR} y1={yAt(target)} y2={yAt(target)} stroke={barMid} strokeWidth={1.25} strokeDasharray="4 3" opacity={0.85} />
        <text x={VBW - padR} y={yAt(target) - 4} textAnchor="end" fontSize={9} fill={axisColor} fontFamily="monospace">TARGET {target}</text>
      </svg>
    );
  }

  if (useFallback) return <div style={{ position: 'relative', height: 240, overflow: 'hidden' }}>{drawNativeSvg()}</div>;

  try {
    return (
      <ErrorBoundaryFallback fallback={drawNativeSvg()}>
        <div style={{ position: 'relative', height: 240, overflow: 'hidden' }}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 10, right: 22, left: 4, bottom: 0 }}>
              <defs>
                {domSorted.map((d) => (
                  <linearGradient key={d.id} id={`stc_d${d.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={trendPalette[d.id]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={trendPalette[d.id]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: axisColor }} axisLine={{ stroke: gridColor }} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 10, fontSize: 12, fontFamily: 'Public Sans, sans-serif', color: tooltipInk }} labelStyle={{ color: tooltipInk, fontWeight: 600 }} formatter={(v: any, n: any) => [Math.round(Number(v)) + ' pts', n]} />
              <ReferenceLine y={target} stroke={tooltipInk} strokeDasharray="4 3" strokeWidth={1} label={{ value: `TARGET ${target}`, position: 'insideTopLeft', fontSize: 9, fill: axisColor, fontFamily: 'IBM Plex Mono, monospace' }} />
              {domSorted.map((d) => (
                <Area key={d.id} type="monotone" dataKey={d.short} stackId="1" stroke={trendPalette[d.id]} strokeWidth={1.5} fill={`url(#stc_d${d.id})`} isAnimationActive={false} dot={false} activeDot={{ r: 3 }} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ErrorBoundaryFallback>
    );
  } catch {
    return <div style={{ position: 'relative', height: 240, overflow: 'hidden' }}>{drawNativeSvg()}</div>;
  }
}

class ErrorBoundaryFallback extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

export default App;
