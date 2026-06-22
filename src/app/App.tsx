import { useEffect, useMemo, useRef, useState } from 'react';
import { getBlueprint, getBlueprintLabel } from '../data/blueprints';
import { loadQuestionBanks } from '../data/questionBank';
import {
  buildDefaultSettings,
  countAnswered,
  countAvailableQuestions,
  createSession
} from '../lib/sessionAssembly';
import { buildRecentItemIds } from '../lib/sessionPersistence';
import { buildCategoryHistoryTrend, listHistoryCategories } from '../lib/categoryHistoryTrend';
import {
  buildFocusAreas,
  buildReadinessSummary,
  buildRecentTrend,
  buildWeakAreaCategoryIds,
  formatDomainBarName,
  formatHomeSubtitle,
  formatReadinessDelta,
  performanceBand,
  readinessDeltaTone
} from '../lib/dashboardMetrics';
import { buildHistoryTrend, formatHistoryLatestDelta, historyLatestDeltaTone } from '../lib/historyTrend';
import { shouldRunSessionTimer } from '../lib/sessionTimer';
import { scoreSession, toHistoryEntry } from '../lib/scoring';
import { applyTheme, resolveInitialTheme } from '../lib/uiTheme';
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
  SessionItemSnapshot,
  SessionSettings,
  ThemeMode
} from '../types/exam';

type View = 'dashboard' | 'setup' | 'session' | 'results' | 'review' | 'history';

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

function answerOptionClasses({
  selected,
  revealed,
  correct
}: {
  selected: boolean;
  revealed: boolean;
  correct: boolean;
}): string {
  const classes = ['option-row'];
  if (revealed && correct) {
    classes.push('is-correct');
  } else if (revealed && selected && !correct) {
    classes.push('is-incorrect');
  } else if (selected) {
    classes.push('is-selected');
  }
  return classes.join(' ');
}

function answerOptionNote({
  revealed,
  correct,
  selected,
  reviewMode
}: {
  revealed: boolean;
  correct: boolean;
  selected: boolean;
  reviewMode: boolean;
}): { text: string; tone: 'success' | 'danger' } | null {
  if (reviewMode) {
    if (correct) {
      return { text: 'Correct answer', tone: 'success' };
    }
    if (selected && !correct) {
      return { text: 'Your answer', tone: 'danger' };
    }
    return null;
  }
  return null;
}

function ExplanationPanel({
  item,
  variant
}: {
  item: SessionItemSnapshot;
  variant: 'session' | 'review';
}) {
  const correctLetter = displayLetterForOptionId(item.optionOrder, item.question.correct);
  const incorrect = incorrectRationalesForDisplay(item);

  return (
    <div className={['explanation-card', variant === 'review' ? 'explanation-card--review' : ''].filter(Boolean).join(' ')}>
      <p className="explanation-card__eyebrow">Correct · {correctLetter}</p>
      <p className="explanation-card__body">{item.question.explanation.rationale_correct}</p>
      {incorrect.map(({ displayLetter, rationale }) => (
        <p key={displayLetter} className="explanation-card__incorrect">
          <strong>{displayLetter}.</strong> {rationale}
        </p>
      ))}
      <div className="explanation-card__references">
        <p className="explanation-card__references-label">References</p>
        {item.question.references.map((reference) => (
          <div key={`${reference.citation}-${reference.locator ?? ''}`} className="reference-item">
            {reference.url ? (
              <a className="reference-citation" href={reference.url} target="_blank" rel="noreferrer">
                {reference.citation}
              </a>
            ) : (
              <span className="reference-citation">{reference.citation}</span>
            )}
            {reference.locator ? <span className="reference-locator">{reference.locator}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnswerOption({
  letter,
  text,
  selected,
  revealed,
  correct,
  interactive,
  onSelect,
  selects,
  reviewMode = false
}: {
  letter: string;
  text: string;
  selected: boolean;
  revealed: boolean;
  correct: boolean;
  interactive: boolean;
  onSelect?: () => void;
  selects?: string[];
  reviewMode?: boolean;
}) {
  const note = answerOptionNote({ revealed: revealed || reviewMode, correct, selected, reviewMode });
  const className = answerOptionClasses({
    selected,
    revealed: revealed || reviewMode,
    correct
  });
  const body = (
    <>
      <span className="option-letter">{letter}</span>
      <span className="option-copy">
        {text}
        {selects && selects.length > 0 ? <small className="option-helper">Selects: {selects.join(', ')}</small> : null}
        {note ? <small className={`option-note option-note--${note.tone}`}>{note.text}</small> : null}
      </span>
    </>
  );

  if (interactive) {
    return (
      <button type="button" className={className} role="radio" aria-checked={selected} onClick={onSelect}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
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

function listBlueprintCategories(blueprintId: BlueprintId): Array<{ id: string; label: string }> {
  const blueprint = getBlueprint(blueprintId);
  if (blueprint.structure === 'domain_task') {
    return blueprint.domains.map((domain) => ({ id: String(domain.id), label: domain.name }));
  }
  return blueprint.sections.map((section) => ({ id: section.id, label: section.name }));
}

function summarizeSettings(settings: SessionSettings): string {
  const mode = settings.mode === 'exam' ? 'Exam' : 'Study';
  const focusIds = settings.focusCategoryIds?.filter(Boolean) ?? [];
  let focus = 'All domains';
  if (focusIds.length > 0) {
    const categories = listBlueprintCategories(settings.blueprintId);
    const labels = focusIds
      .map((id) => categories.find((category) => category.id === id)?.label)
      .filter((label): label is string => Boolean(label));
    focus = labels.length === 1 ? labels[0] : `${focusIds.length} focus area(s)`;
  }
  const timing = settings.timed ? `${settings.timeMinutes} min` : 'untimed';
  const scenario = settings.questionSet === 'scenario' ? ' · scenario' : '';
  return `${mode} · ${focus} · ${settings.questionCount} items · ${timing}${scenario}`;
}

function formatResumeSubtitle(session: ActiveSession): string {
  const mode = session.settings.mode === 'exam' ? 'Exam' : 'Study';
  let text = `Item ${session.currentIndex + 1} of ${session.items.length} · ${mode}`;
  if (session.remainingSeconds !== null) {
    text += ` · ${formatDuration(session.remainingSeconds)} left`;
  }
  return text;
}

function weakAreasPresetSubtitle(focusAreas: ReturnType<typeof buildFocusAreas>): string {
  if (focusAreas.length === 0) {
    return 'Study mode · 10 items';
  }
  return `Study mode · Domain ${focusAreas[0].categoryId}`;
}

function domainChipLabel(categoryId: string, label: string): string {
  const shortNames: Record<string, string> = {
    '1': 'Education',
    '2': 'Pre-transplant',
    '3': 'Post-op'
  };
  return shortNames[categoryId] ?? label;
}

function formatHistoryDate(completedAt: string): string {
  return new Date(completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function normalizeActiveSession(session: ActiveSession): ActiveSession {
  const showTimer = session.timerHidden ? false : session.settings.showTimer;
  return {
    ...session,
    settings: { ...session.settings, showTimer },
    timerHidden: !showTimer
  };
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
  const defaults = buildDefaultSettings(settings.blueprintId);
  return {
    ...defaults,
    ...settings,
    questionSet: settings.questionSet ?? 'standard',
    focusCategoryIds: settings.focusCategoryIds ?? []
  };
}

function normalizeMeta(meta: AppMeta): AppMeta {
  const examDate =
    meta.examDate && /^\d{4}-\d{2}-\d{2}$/.test(meta.examDate) ? meta.examDate : undefined;
  return {
    disclaimerSeen: meta.disclaimerSeen,
    examDate,
    theme: resolveInitialTheme(meta.theme),
    lastCustomSettings: meta.lastCustomSettings ? normalizeSettings(meta.lastCustomSettings) : undefined
  };
}

function QuestionReview({
  item,
  answer,
  showVerdict = true
}: {
  item: SessionItemSnapshot;
  answer: string | null;
  showVerdict?: boolean;
}) {
  const skipped = !answer;
  const correct = answer === item.question.correct;

  return (
    <article className="panel question-panel">
      <div className="question-panel__meta">
        <span className="category-pill">{formatDomainBarName(item.categoryId, item.categoryLabel)}</span>
        {showVerdict && (
          <span
            className={[
              'verdict-pill',
              correct ? 'verdict-pill--success' : 'verdict-pill--danger'
            ].join(' ')}
          >
            {skipped ? 'Skipped' : correct ? 'Correct' : 'Incorrect'}
          </span>
        )}
      </div>
      <p className="stem-text">{item.question.stem}</p>
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
          const isCorrect = option.id === item.question.correct;
          return (
            <AnswerOption
              key={option.id}
              letter={displayLetterForIndex(optionIndex)}
              text={option.text}
              selected={selected}
              revealed
              correct={isCorrect}
              interactive={false}
              selects={option.selects}
              reviewMode
            />
          );
        })}
      </div>
      <ExplanationPanel item={item} variant="review" />
    </article>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <label className={['switch-row', label ? '' : 'switch-row--compact'].filter(Boolean).join(' ')}>
      <span className="switch">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-label={label || 'Toggle'} />
        <span className="switch__track">
          <span className="switch__knob" />
        </span>
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}

function HomeSwitcher({
  view,
  onDashboard,
  onSetup
}: {
  view: 'dashboard' | 'setup';
  onDashboard: () => void;
  onSetup: () => void;
}) {
  return (
    <div className="home-switcher" role="tablist" aria-label="Home layout">
      <span className="home-switcher__label">Home</span>
      <button
        type="button"
        role="tab"
        aria-selected={view === 'dashboard'}
        className={['home-switcher__btn', view === 'dashboard' ? 'home-switcher__btn--active' : ''].filter(Boolean).join(' ')}
        onClick={onDashboard}
      >
        Dashboard
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === 'setup'}
        className={['home-switcher__btn', view === 'setup' ? 'home-switcher__btn--active' : ''].filter(Boolean).join(' ')}
        onClick={onSetup}
      >
        Setup form
      </button>
    </div>
  );
}

function QuickStartPanel({
  blueprintDefaults,
  weakSubtitle,
  weakDisabled,
  lastCustomSettings,
  onPreset,
  onLastCustom,
  showCustomizeLink,
  onCustomize,
  wide = false
}: {
  blueprintDefaults: SessionSettings;
  weakSubtitle: string;
  weakDisabled?: boolean;
  lastCustomSettings?: SessionSettings;
  onPreset: (preset: 'full' | 'quick' | 'weak') => void;
  onLastCustom: (settings: SessionSettings) => void;
  showCustomizeLink: boolean;
  onCustomize: () => void;
  wide?: boolean;
}) {
  return (
    <article className={['panel', 'quick-start-panel', wide ? 'dashboard-grid__wide' : ''].filter(Boolean).join(' ')}>
      <p className="eyebrow">Quick start</p>
      <div className="preset-grid">
        <button type="button" className="preset-card" onClick={() => onPreset('full')}>
          <span className="preset-card__title">Full mock exam</span>
          <span className="preset-card__sub">
            {blueprintDefaults.questionCount} items · timed {blueprintDefaults.timeMinutes} min
          </span>
        </button>
        <button type="button" className="preset-card" onClick={() => onPreset('quick')}>
          <span className="preset-card__title">Quick 10</span>
          <span className="preset-card__sub">Untimed · all domains</span>
        </button>
        <button type="button" className="preset-card" onClick={() => onPreset('weak')} disabled={weakDisabled}>
          <span className="preset-card__title">Weak areas</span>
          <span className="preset-card__sub">{weakSubtitle}</span>
        </button>
      </div>
      {lastCustomSettings && (
        <button type="button" className="last-custom-tile" onClick={() => onLastCustom(lastCustomSettings)}>
          <span>
            <span className="last-custom-tile__label">Your last custom setup</span>
            <span className="last-custom-tile__summary">{summarizeSettings(lastCustomSettings)}</span>
          </span>
          <span className="last-custom-tile__action">Start →</span>
        </button>
      )}
      {showCustomizeLink && (
        <button type="button" className="customize-session-link" onClick={onCustomize}>
          Customize a session →
        </button>
      )}
    </article>
  );
}

function TrendChart({
  points,
  compact = false
}: {
  points: Array<{ id: string; label: string; percent: number; belowTarget?: boolean }>;
  compact?: boolean;
}) {
  return (
    <div
      className={['trend-chart', compact ? 'trend-chart--compact' : ''].filter(Boolean).join(' ')}
      role="img"
      aria-label={`Score trend across ${points.length} sessions`}
    >
      <div className="trend-chart__plot">
        {points.map((point) => (
          <div key={point.id} className="trend-chart__bar-wrap">
            <div
              className={['trend-chart__bar', point.belowTarget ? 'trend-chart__bar--gold' : ''].filter(Boolean).join(' ')}
              style={{ height: `${Math.max(4, point.percent)}%` }}
              title={`${point.label}: ${point.percent}%`}
            />
            <span className="trend-chart__label">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  const banks = useMemo(() => loadQuestionBanks(), []);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [meta, setMeta] = useState<AppMeta>(() => normalizeMeta({ disclaimerSeen: false }));
  const [settings, setSettings] = useState<SessionSettings>(() => buildDefaultSettings('cctc-from-2026-07'));
  const bank = useMemo(
    () => (settings.questionSet === 'scenario' ? banks.scenario : banks.standard),
    [banks, settings.questionSet]
  );
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const blueprintDefaults = useMemo(() => buildDefaultSettings(settings.blueprintId), [settings.blueprintId]);
  const homeSubtitle = useMemo(
    () => formatHomeSubtitle(meta.examDate, bank.questions.length),
    [meta.examDate, bank.questions.length]
  );
  const historyTrend = useMemo(() => buildHistoryTrend(history), [history]);
  const recentTrend = useMemo(() => buildRecentTrend(history, 8), [history]);
  const readiness = useMemo(() => buildReadinessSummary(history), [history]);
  const focusAreas = useMemo(() => buildFocusAreas(history), [history]);
  const weakPresetSubtitle = useMemo(() => weakAreasPresetSubtitle(focusAreas), [focusAreas]);
  const bestHistoryPercent = useMemo(
    () => (history.length > 0 ? Math.max(...history.map((entry) => entry.result.percent)) : null),
    [history]
  );
  const historyCategories = useMemo(() => listHistoryCategories(history), [history]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const categoryTrend = useMemo(
    () => (selectedCategoryId ? buildCategoryHistoryTrend(history, selectedCategoryId) : null),
    [history, selectedCategoryId]
  );
  const [selectedHistory, setSelectedHistory] = useState<HistoryEntry | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewFrom, setReviewFrom] = useState<'results' | 'history'>('results');
  const [flags, setFlags] = useState<ItemFlag[]>([]);
  const [flagDraft, setFlagDraft] = useState<FlagDraft | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const autoSubmittedSessionIdRef = useRef<string | null>(null);
  const [sessionReplacePromptOpen, setSessionReplacePromptOpen] = useState(false);
  const [pendingSessionSettings, setPendingSessionSettings] = useState<SessionSettings | null>(null);
  const [pendingFromCustomForm, setPendingFromCustomForm] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [sessionOverflowOpen, setSessionOverflowOpen] = useState(false);
  const [showAdvancedSetup, setShowAdvancedSetup] = useState(false);
  const [showSessionMap, setShowSessionMap] = useState(false);
  const [showReviewMap, setShowReviewMap] = useState(false);
  const lastPersistFingerprint = useRef('');
  const activeSessionRef = useRef<ActiveSession | null>(null);

  const allQuestions = useMemo(
    () => [...banks.standard.questions, ...banks.scenario.questions],
    [banks]
  );
  const blueprintCategories = useMemo(() => listBlueprintCategories(settings.blueprintId), [settings.blueprintId]);
  const availableQuestionCount = useMemo(
    () =>
      countAvailableQuestions(bank.questions, {
        blueprintId: settings.blueprintId,
        includeDrafts: settings.includeDrafts,
        focusCategoryIds: settings.focusCategoryIds
      }),
    [bank.questions, settings.blueprintId, settings.includeDrafts, settings.focusCategoryIds]
  );

  const theme = meta.theme ?? 'day';
  const hasUnfinishedSession = Boolean(activeSession && !activeSession.submittedAt);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    bootstrapState(allQuestions)
      .then((state) => {
        if (cancelled) {
          return;
        }
        const nextMeta = normalizeMeta(state.meta);
        setMeta(nextMeta);
        applyTheme(nextMeta.theme ?? 'day');
        setSettings(normalizeSettings(state.settings ?? buildDefaultSettings('cctc-from-2026-07')));
        setActiveSession(state.activeSession ? normalizeActiveSession(state.activeSession) : null);
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
  const sessionTimerActive = shouldRunSessionTimer(view, activeSession);

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
    if (!sessionTimerActive || !timedSessionId) {
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
  }, [sessionTimerActive, timedSessionId]);

  useEffect(() => {
    const current = activeSession;
    if (
      !current ||
      current.submittedAt ||
      !current.settings.timed ||
      view !== 'session' ||
      current.remainingSeconds !== 0 ||
      isFinalizing
    ) {
      return;
    }
    if (autoSubmittedSessionIdRef.current === current.id) {
      return;
    }
    autoSubmittedSessionIdRef.current = current.id;
    void finalizeSession();
  }, [activeSession?.id, activeSession?.remainingSeconds, activeSession?.submittedAt, activeSession?.settings.timed, isFinalizing, view]);

  const session = activeSession;
  const currentItem = session ? session.items[session.currentIndex] : null;
  const answeredCount = session ? countAnswered(session) : 0;
  const selectedHistoryItem = selectedHistory?.items[reviewIndex] ?? null;
  const unansweredCount = session ? session.items.length - countAnswered(session) : 0;

  useEffect(() => {
    if (selectedCategoryId && !historyCategories.some((category) => category.categoryId === selectedCategoryId)) {
      setSelectedCategoryId(null);
    }
  }, [historyCategories, selectedCategoryId]);

  useEffect(() => {
    if (!selectedHistory || view !== 'review') {
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

  async function persistMeta(nextMeta: AppMeta): Promise<void> {
    const normalized = normalizeMeta(nextMeta);
    setMeta(normalized);
    await saveMeta(normalized);
  }

  function updateExamDate(examDate: string): void {
    void persistMeta({ ...meta, examDate: examDate || undefined });
  }

  function updateSettings(next: Partial<SessionSettings>): void {
    const merged = { ...settings, ...next };
    const max = countAvailableQuestions(bank.questions, {
      blueprintId: merged.blueprintId,
      includeDrafts: merged.includeDrafts,
      focusCategoryIds: merged.focusCategoryIds
    });
    merged.questionCount = clampQuestionCount(merged.questionCount, max);
    persistSettings(merged);
  }

  function toggleFocusCategory(categoryId: string): void {
    const current = settings.focusCategoryIds ?? [];
    const next = current.includes(categoryId) ? current.filter((id) => id !== categoryId) : [...current, categoryId];
    updateSettings({ focusCategoryIds: next });
  }

  function handleBlueprintChange(nextBlueprintId: BlueprintId): void {
    const blueprint = getBlueprint(nextBlueprintId);
    const includeDrafts = settings.mode === 'study' ? settings.includeDrafts : false;
    persistSettings({
      ...settings,
      blueprintId: nextBlueprintId,
      focusCategoryIds: [],
      questionCount: clampQuestionCount(
        blueprint.default_exam_items,
        countAvailableQuestions(bank.questions, { blueprintId: nextBlueprintId, includeDrafts, focusCategoryIds: [] })
      ),
      timeMinutes: blueprint.default_time_minutes,
      includeDrafts
    });
  }

  function handleModeChange(nextMode: ExamMode): void {
    const includeDrafts = nextMode === 'exam' ? false : settings.includeDrafts;
    updateSettings({ mode: nextMode, includeDrafts: nextMode === 'exam' ? false : includeDrafts });
  }

  function handleQuestionSetChange(nextQuestionSet: QuestionSet): void {
    const nextBank = nextQuestionSet === 'scenario' ? banks.scenario : banks.standard;
    const includeDrafts = settings.mode === 'study' ? settings.includeDrafts : false;
    const max = countAvailableQuestions(nextBank.questions, {
      blueprintId: settings.blueprintId,
      includeDrafts,
      focusCategoryIds: settings.focusCategoryIds
    });
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

  function toggleShowTimer(): void {
    mutateSession((current) => {
      const showTimer = !current.settings.showTimer;
      return {
        ...current,
        settings: { ...current.settings, showTimer },
        timerHidden: !showTimer
      };
    });
    setSessionOverflowOpen(false);
  }

  function beginNewSession(nextSettings: SessionSettings): void {
    const questionBank = nextSettings.questionSet === 'scenario' ? banks.scenario : banks.standard;
    const recentIds = buildRecentItemIds(history.map((entry) => ({ itemIds: entry.itemIds })));
    const nextSession = createSession(questionBank.questions, nextSettings, recentIds);
    setActiveSession(nextSession);
    setShowSessionMap(false);
    setView('session');
  }

  function requestStartSession(nextSettings: SessionSettings, fromCustomForm = false): void {
    let resolved = nextSettings;
    const nextBank = resolved.questionSet === 'scenario' ? banks.scenario : banks.standard;
    const max = countAvailableQuestions(nextBank.questions, {
      blueprintId: resolved.blueprintId,
      includeDrafts: resolved.includeDrafts,
      focusCategoryIds: resolved.focusCategoryIds
    });

    if (max === 0 && !resolved.includeDrafts) {
      const useDrafts = window.confirm(
        'No reviewed items are available for this configuration yet. Click OK to include draft items for a bootstrap practice session.'
      );
      if (!useDrafts) {
        return;
      }
      resolved = { ...resolved, includeDrafts: true };
    }

    resolved = { ...resolved, questionCount: clampQuestionCount(resolved.questionCount, max) };
    persistSettings(resolved);

    if (activeSession && !activeSession.submittedAt) {
      setPendingSessionSettings(resolved);
      setPendingFromCustomForm(fromCustomForm);
      setSessionReplacePromptOpen(true);
      return;
    }

    if (fromCustomForm) {
      void persistMeta({ ...meta, lastCustomSettings: resolved });
    }
    beginNewSession(resolved);
  }

  function dismissSessionReplacePrompt(): void {
    setSessionReplacePromptOpen(false);
    setPendingSessionSettings(null);
    setPendingFromCustomForm(false);
  }

  function resumeExistingSession(): void {
    dismissSessionReplacePrompt();
    setView('session');
  }

  function replaceActiveSession(): void {
    const nextSettings = pendingSessionSettings ?? settings;
    const fromCustom = pendingFromCustomForm;
    dismissSessionReplacePrompt();
    if (fromCustom) {
      void persistMeta({ ...meta, lastCustomSettings: nextSettings });
    }
    beginNewSession(nextSettings);
  }

  function discardActiveSession(): void {
    setActiveSession(null);
    void clearActiveSession();
  }

  function openSubmitConfirm(): void {
    setSubmitConfirmOpen(true);
  }

  async function finalizeSession(): Promise<void> {
    if (!activeSession || isFinalizing) {
      return;
    }
    setIsFinalizing(true);
    setSubmitConfirmOpen(false);
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
      setView('results');
    } finally {
      setIsFinalizing(false);
    }
  }

  function openFlagComposer(item: Question, sessionId: string, blueprint: BlueprintId, mode: ExamMode): void {
    const existing = flags.find((flag) => flag.item_id === item.id);
    setFlagDraft(buildInitialFlagDraft(item, sessionId, blueprint, mode, existing));
    setSessionOverflowOpen(false);
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
    setFlags((current) =>
      [nextFlag, ...current.filter((flag) => flag.item_id !== nextFlag.item_id)].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt)
      )
    );
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
    await persistMeta({ ...meta, disclaimerSeen: true });
  }

  async function toggleTheme(): Promise<void> {
    const nextTheme: ThemeMode = theme === 'day' ? 'night' : 'day';
    await persistMeta({ ...meta, theme: nextTheme });
  }

  async function exportFlags(): Promise<void> {
    downloadJson('cctc-flags.json', { exportedAt: new Date().toISOString(), flags });
  }

  async function resetFlags(): Promise<void> {
    if (!window.confirm('Clear every reported item flag?')) {
      return;
    }
    await replaceFlags([]);
    setFlags([]);
  }

  function startPreset(preset: 'full' | 'quick' | 'weak'): void {
    const defaults = buildDefaultSettings(settings.blueprintId);
    if (preset === 'full') {
      requestStartSession({ ...defaults, mode: 'exam', timed: true, questionSet: settings.questionSet });
      return;
    }
    if (preset === 'quick') {
      requestStartSession({
        ...defaults,
        mode: 'study',
        timed: false,
        questionCount: clampQuestionCount(10, availableQuestionCount),
        questionSet: settings.questionSet
      });
      return;
    }
    const weakIds = buildWeakAreaCategoryIds(history);
    requestStartSession({
      ...defaults,
      mode: 'study',
      timed: false,
      questionCount: clampQuestionCount(25, availableQuestionCount),
      focusCategoryIds: weakIds,
      questionSet: settings.questionSet
    });
  }

  function retakeSelectedHistory(): void {
    if (!selectedHistory) {
      return;
    }
    requestStartSession(selectedHistory.settings);
  }

  function reviewChipState(entry: HistoryEntry, item: SessionItemSnapshot): 'correct' | 'incorrect' | 'skipped' {
    const answer = entry.answers[item.itemId];
    if (!answer) {
      return 'skipped';
    }
    return answer === item.question.correct ? 'correct' : 'incorrect';
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

  const readinessBand = readiness.averagePercent === null ? 'teal' : performanceBand(readiness.averagePercent);

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      {!meta.disclaimerSeen && (
        <section className="modal-backdrop" aria-label="Study aid disclaimer">
          <div className="modal-card">
            <p className="modal-eyebrow">Independent study aid</p>
            <h2>Before you begin</h2>
            <p>
              This practice app is not affiliated with or endorsed by ABTC or PSI, does not reproduce real exam items, and is not a source of
              patient-care decisions. Practice results are unofficial estimates only.
            </p>
            <button className="primary-button" onClick={() => void acknowledgeDisclaimer()}>
              I understand
            </button>
          </div>
        </section>
      )}

      {sessionReplacePromptOpen && pendingSessionSettings && (
        <section className="modal-backdrop" aria-label="Unfinished session">
          <div className="modal-card">
            <h2>Session in progress</h2>
            <p>
              You have an unfinished session. Resume it, or start a new one — starting new discards your in-progress answers and bookmarks.
            </p>
            <p className="session-summary-chip">New session: {summarizeSettings(pendingSessionSettings)}</p>
            <div className="modal-actions">
              <button className="ghost-button" onClick={dismissSessionReplacePrompt}>
                Cancel
              </button>
              <button className="secondary-button" onClick={replaceActiveSession}>
                Start new
              </button>
              <button className="primary-button" onClick={resumeExistingSession}>
                Resume current
              </button>
            </div>
          </div>
        </section>
      )}

      {submitConfirmOpen && session && (
        <section className="modal-backdrop" aria-label="Confirm finish">
          <div className="modal-card">
            <h2>{session.settings.mode === 'exam' ? 'Submit exam?' : 'Finish session?'}</h2>
            <p>
              {unansweredCount > 0
                ? `You have ${unansweredCount} unanswered item(s); they will be marked incorrect. Submit and score now? You can review every answer afterward.`
                : `Submit and score your ${session.items.length} answers now? You can review every answer afterward.`}
            </p>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setSubmitConfirmOpen(false)}>
                Keep going
              </button>
              <button className="primary-button" onClick={() => void finalizeSession()} disabled={isFinalizing}>
                {session.settings.mode === 'exam' ? 'Submit' : 'Finish'}
              </button>
            </div>
          </div>
        </section>
      )}

      {flagDraft && (
        <section className="modal-backdrop" aria-label="Report an issue">
          <div className="modal-card">
            <h2>Report an issue</h2>
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
                Save report
              </button>
            </div>
          </div>
        </section>
      )}

      <header className="app-header" role="banner">
        <div className="app-header__inner">
          <button type="button" className="brand" onClick={() => setView('dashboard')} aria-label="CCTC home">
            <span className="brand__mark" aria-hidden="true">
              C
            </span>
            <span className="brand__wordmark">CCTC Practice</span>
          </button>
          <nav className="header-nav" aria-label="Primary">
            <button
              type="button"
              className={['nav-link', view === 'dashboard' || view === 'setup' ? 'nav-link--active' : ''].filter(Boolean).join(' ')}
              onClick={() => setView('dashboard')}
            >
              Home
            </button>
            <button
              type="button"
              className={['nav-link', view === 'history' ? 'nav-link--active' : ''].filter(Boolean).join(' ')}
              onClick={() => setView('history')}
            >
              Progress
            </button>
            {hasUnfinishedSession && (
              <button type="button" className={['nav-link', view === 'session' ? 'nav-link--active' : ''].filter(Boolean).join(' ')} onClick={() => setView('session')}>
                Resume
              </button>
            )}
            <button type="button" className="theme-toggle" onClick={() => void toggleTheme()} aria-label={theme === 'day' ? 'Switch to night theme' : 'Switch to day theme'}>
              {theme === 'day' ? '☾' : '☀'}
            </button>
          </nav>
        </div>
      </header>

      <div className="shell">
      <main id="main-content" className="main-stack">
        {(view === 'dashboard' || view === 'setup') && (
          <section className="stack-gap">
            <div className="home-toolbar">
              <div>
                {view === 'dashboard' ? (
                  <>
                    <h1 className="page-title">Welcome back</h1>
                    <p className="muted-text">{homeSubtitle}</p>
                  </>
                ) : (
                  <>
                    <h1 className="page-title">Build a session</h1>
                    <p className="muted-text">{availableQuestionCount} items available for this focus</p>
                  </>
                )}
              </div>
              <HomeSwitcher view={view} onDashboard={() => setView('dashboard')} onSetup={() => setView('setup')} />
            </div>

            {view === 'dashboard' && (
              <div className="dashboard-grid">
                <article className="panel readiness-card">
                  {readiness.averagePercent === null ? (
                    <p className="muted-text">Complete a session to see your unofficial readiness estimate.</p>
                  ) : (
                    <div className="readiness-card__layout">
                      <div
                        className={['readiness-donut', readinessBand === 'gold' ? 'readiness-donut--gold' : '', readinessBand === 'danger' ? 'readiness-donut--danger' : '']
                          .filter(Boolean)
                          .join(' ')}
                        style={{ ['--pct' as string]: readiness.averagePercent }}
                        aria-hidden="true"
                      >
                        <span className="readiness-donut__value">{readiness.averagePercent}%</span>
                      </div>
                      <div className="readiness-card__copy">
                        <strong className="readiness-card__title">Practice readiness</strong>
                        <p className="muted-text">Average, last 8 sessions</p>
                        <p className={`readiness-card__delta readiness-card__delta--${readinessDeltaTone(readiness.deltaPercent)}`}>
                          {formatReadinessDelta(readiness.deltaPercent)}
                        </p>
                      </div>
                    </div>
                  )}
                </article>

                <article className="panel panel--teal continue-hero stack-gap">
                  {hasUnfinishedSession && activeSession ? (
                    <>
                      <p className="eyebrow">Continue</p>
                      <h2 className="card-title">Resume your session</h2>
                      <p>{formatResumeSubtitle(activeSession)}</p>
                      <button type="button" className="continue-hero__cta" onClick={() => setView('session')}>
                        Resume →
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="eyebrow">Get started</p>
                      <h2 className="card-title">Start a practice session</h2>
                      <p>Pick a quick-start below or customize your own.</p>
                      <button type="button" className="continue-hero__cta" onClick={() => setView('setup')}>
                        Customize →
                      </button>
                    </>
                  )}
                </article>

                <QuickStartPanel
                  blueprintDefaults={blueprintDefaults}
                  weakSubtitle={weakPresetSubtitle}
                  weakDisabled={focusAreas.length === 0}
                  lastCustomSettings={meta.lastCustomSettings}
                  onPreset={startPreset}
                  onLastCustom={requestStartSession}
                  showCustomizeLink
                  onCustomize={() => setView('setup')}
                  wide
                />

                <article className="panel">
                  <p className="eyebrow">Focus areas</p>
                  {focusAreas.length === 0 ? (
                    <p className="muted-text">Domain readiness appears after you complete sessions.</p>
                  ) : (
                    <div className="stack-gap">
                      {focusAreas.map((area) => (
                        <div key={area.categoryId} className="focus-bar">
                          <div className="focus-bar__label">
                            <span>{formatDomainBarName(area.categoryId, area.categoryLabel)}</span>
                            <strong>{area.percent}%</strong>
                          </div>
                          <div className="focus-bar__track focus-bar__track--gold">
                            <div className={`focus-bar__fill focus-bar__fill--${area.band}`} style={{ width: `${area.percent}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>

                <article className="panel">
                  <div className="section-heading section-heading--compact">
                    <p className="eyebrow">Score trend</p>
                    <button type="button" className="text-button" onClick={() => setView('history')}>
                      View all →
                    </button>
                  </div>
                  {recentTrend.points.length === 0 ? (
                    <p className="muted-text">Complete a session to see your trend.</p>
                  ) : (
                    <TrendChart points={recentTrend.points} compact />
                  )}
                </article>
              </div>
            )}

            {view === 'setup' && (
              <div className="stack-gap">
                {hasUnfinishedSession && activeSession && (
                  <div className="resume-banner">
                    <div>
                      <strong>Session in progress</strong>
                      <p className="resume-banner__sub">{formatResumeSubtitle(activeSession)}</p>
                    </div>
                    <div className="action-row">
                      <button type="button" className="ghost-button" onClick={discardActiveSession}>
                        Discard
                      </button>
                      <button type="button" className="primary-button" onClick={() => setView('session')}>
                        Resume
                      </button>
                    </div>
                  </div>
                )}

                <QuickStartPanel
                  blueprintDefaults={blueprintDefaults}
                  weakSubtitle={weakPresetSubtitle}
                  weakDisabled={focusAreas.length === 0}
                  lastCustomSettings={meta.lastCustomSettings}
                  onPreset={startPreset}
                  onLastCustom={requestStartSession}
                  showCustomizeLink={false}
                  onCustomize={() => setView('setup')}
                />

                <article className="panel setup-customize">
                  <p className="eyebrow">Customize</p>

                  <div className="setup-field">
                    <p className="setup-field-label">Mode</p>
                    <div className="segmented setup-segmented" role="radiogroup" aria-label="Mode">
                      <button
                        type="button"
                        className={['segmented__btn', settings.mode === 'exam' ? 'segmented__btn--active' : ''].filter(Boolean).join(' ')}
                        onClick={() => handleModeChange('exam')}
                      >
                        Exam
                      </button>
                      <button
                        type="button"
                        className={['segmented__btn', settings.mode === 'study' ? 'segmented__btn--active' : ''].filter(Boolean).join(' ')}
                        onClick={() => handleModeChange('study')}
                      >
                        Study
                      </button>
                    </div>
                    <p className="setup-field-hint">
                      {settings.mode === 'exam'
                        ? 'Answers and explanations are revealed only after you submit.'
                        : 'Each answer reveals the explanation immediately.'}
                    </p>
                  </div>

                  <div className="setup-field">
                    <p className="setup-field-label">Question set</p>
                    <div className="segmented setup-segmented" role="radiogroup" aria-label="Question set">
                      <button
                        type="button"
                        className={['segmented__btn', settings.questionSet === 'standard' ? 'segmented__btn--active' : ''].filter(Boolean).join(' ')}
                        onClick={() => handleQuestionSetChange('standard')}
                      >
                        Standard bank
                      </button>
                      <button
                        type="button"
                        className={['segmented__btn', settings.questionSet === 'scenario' ? 'segmented__btn--active' : ''].filter(Boolean).join(' ')}
                        onClick={() => handleQuestionSetChange('scenario')}
                      >
                        Scenario companions
                      </button>
                    </div>
                    <p className="setup-field-hint">
                      {settings.questionSet === 'scenario'
                        ? 'Longer clinical vignettes paired with the standard bank.'
                        : 'Focused single-concept items written to the content outline.'}
                    </p>
                  </div>

                  <div className="setup-field">
                    <p className="setup-field-label">Focus</p>
                    <div className="focus-chips" role="group" aria-label="Focus domains">
                      <button
                        type="button"
                        className={['focus-chip', (settings.focusCategoryIds?.length ?? 0) === 0 ? 'focus-chip--active' : ''].filter(Boolean).join(' ')}
                        onClick={() => updateSettings({ focusCategoryIds: [] })}
                      >
                        All domains
                      </button>
                      {blueprintCategories.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          className={['focus-chip', settings.focusCategoryIds?.includes(category.id) ? 'focus-chip--active' : '']
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => toggleFocusCategory(category.id)}
                        >
                          {domainChipLabel(category.id, category.label)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="settings-grid settings-grid--setup">
                    <div className="setup-field">
                      <p className="setup-field-label">Question count</p>
                      <input
                        type="number"
                        aria-label="Question count"
                        min={Math.min(QUESTION_MIN, Math.max(1, availableQuestionCount))}
                        max={Math.max(availableQuestionCount, 1)}
                        value={settings.questionCount}
                        onChange={(event) => updateSettings({ questionCount: Number(event.target.value) || 0 })}
                      />
                      <p className="setup-field-hint setup-field-hint--count">{availableQuestionCount} items available for this focus</p>
                    </div>
                    <div className="setup-field">
                      <p className="setup-field-label">Time limit (minutes)</p>
                      <input
                        type="number"
                        aria-label="Time limit in minutes"
                        min={1}
                        value={settings.timeMinutes}
                        onChange={(event) => updateSettings({ timeMinutes: Math.max(1, Number(event.target.value) || 1) })}
                        disabled={!settings.timed}
                      />
                    </div>
                  </div>

                  <div className="setup-toggle-list">
                    <div className="setup-toggle-row">
                      <div className="setup-toggle-copy">
                        <p className="setup-toggle-title">Timed session</p>
                        <p className="setup-toggle-desc">Counts down like the real 3-hour exam</p>
                      </div>
                      <Switch checked={settings.timed} onChange={(next) => updateSettings({ timed: next })} label="" />
                    </div>
                    <div className="setup-toggle-row">
                      <div className="setup-toggle-copy">
                        <p className="setup-toggle-title">Show timer on screen</p>
                        <p className="setup-toggle-desc">Hide it to reduce pressure</p>
                      </div>
                      <Switch
                        checked={settings.showTimer}
                        onChange={(next) => updateSettings({ showTimer: next })}
                        label=""
                      />
                    </div>
                  </div>

                  <div className="setup-advanced-section">
                    <button type="button" className="setup-advanced-toggle" onClick={() => setShowAdvancedSetup((current) => !current)}>
                      {showAdvancedSetup ? '− Advanced options' : '+ Advanced options'}
                    </button>

                    {showAdvancedSetup && (
                      <div className="setup-advanced">
                      <label>
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
                      </label>
                      <label>
                        Exam date
                        <input
                          type="date"
                          aria-label="Exam date"
                          value={meta.examDate ?? ''}
                          onChange={(event) => updateExamDate(event.target.value)}
                        />
                        <span className="field-hint">Optional — powers the dashboard countdown</span>
                      </label>
                      <label>
                        Blueprint version
                        <select value={settings.blueprintId} onChange={(event) => handleBlueprintChange(event.target.value as BlueprintId)}>
                          <option value="cctc-from-2026-07">2026-07 (default)</option>
                          <option value="cctc-thru-2026-06">Until 2026-06</option>
                        </select>
                      </label>
                      <Switch
                        checked={settings.includeDrafts}
                        onChange={(next) => updateSettings({ includeDrafts: next })}
                        label={
                          settings.mode === 'exam'
                            ? 'Exam mode uses reviewed items only'
                            : settings.includeDrafts
                              ? 'Include draft items'
                              : 'Reviewed items only'
                        }
                      />
                    </div>
                    )}
                  </div>

                  <button type="button" className="primary-button setup-start-button" onClick={() => requestStartSession(settings, true)}>
                    Start {settings.mode === 'exam' ? 'exam' : 'study'} · {settings.questionCount} items
                  </button>
                </article>
              </div>
            )}
          </section>
        )}

        {view === 'session' && session && currentItem && (
          <section className="stack-gap">
            <div className="session-topbar">
              <button type="button" className="session-back-button" onClick={() => setView('dashboard')}>
                ‹ Exit
              </button>
              <strong className="session-position">
                Item {session.currentIndex + 1} of {session.items.length}
              </strong>
              <div className="session-topbar__actions">
                <button
                  type="button"
                  className={[
                    'bookmark-toggle',
                    session.flaggedForReview.includes(currentItem.itemId) ? 'bookmark-toggle--active' : ''
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={toggleBookmark}
                  aria-pressed={session.flaggedForReview.includes(currentItem.itemId)}
                  aria-label={session.flaggedForReview.includes(currentItem.itemId) ? 'Remove bookmark' : 'Bookmark item'}
                >
                  {session.flaggedForReview.includes(currentItem.itemId) ? '★' : '☆'}
                </button>
                <div className="overflow-menu">
                  <button
                    type="button"
                    className="overflow-trigger"
                    onClick={() => setSessionOverflowOpen((open) => !open)}
                    aria-expanded={sessionOverflowOpen}
                    aria-label="Session menu"
                  >
                    ⋯
                  </button>
                  {sessionOverflowOpen && (
                    <div className="overflow-menu__panel">
                      <button type="button" className="overflow-menu__item" onClick={toggleShowTimer}>
                        {session.settings.showTimer ? 'Hide timer' : 'Show timer'}
                      </button>
                      <button
                        type="button"
                        className="overflow-menu__item"
                        onClick={() => openFlagComposer(currentItem.question, session.id, session.settings.blueprintId, session.settings.mode)}
                      >
                        Report an issue
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="session-progress session-progress--gold" aria-hidden="true">
              <div className="session-progress__fill" style={{ width: `${((session.currentIndex + 1) / session.items.length) * 100}%` }} />
            </div>

            <div className="session-meta-row">
              <div className="session-meta">
                <span className="category-pill">{formatDomainBarName(currentItem.categoryId, currentItem.categoryLabel)}</span>
                <span className="type-pill">
                  {currentItem.question.type === 'one_best' ? 'Single best answer' : 'Complex combo'}
                </span>
                {currentItem.question.status === 'draft' ? <span className="badge badge--draft">draft</span> : null}
              </div>
              {session.settings.timed && session.settings.showTimer && session.remainingSeconds !== null && (
                <span className="timer-pill">{formatDuration(session.remainingSeconds)}</span>
              )}
            </div>

            <article className="panel question-panel">
              <p className="stem-text">{currentItem.question.stem}</p>

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
                  const selected = session.answers[currentItem.itemId] === option.id;
                  const revealed =
                    session.settings.mode === 'study' ? session.revealed[currentItem.itemId] : Boolean(session.submittedAt);
                  const correct = currentItem.question.correct === option.id;
                  return (
                    <AnswerOption
                      key={option.id}
                      letter={displayLetterForIndex(optionIndex)}
                      text={option.text}
                      selected={selected}
                      revealed={revealed}
                      correct={correct}
                      interactive={!(revealed && session.settings.mode === 'exam')}
                      onSelect={() => handleAnswer(option.id)}
                      selects={option.selects}
                    />
                  );
                })}
              </div>

              {((session.settings.mode === 'study' && session.revealed[currentItem.itemId]) || session.submittedAt) && (
                <ExplanationPanel item={currentItem} variant="session" />
              )}
            </article>

            <div className="session-nav">
              <button
                type="button"
                className="session-nav__btn"
                onClick={() => navigateSession(-1)}
                disabled={session.currentIndex === 0}
              >
                Previous
              </button>
              <button
                type="button"
                className="session-nav__btn"
                onClick={() => navigateSession(1)}
                disabled={session.currentIndex === session.items.length - 1}
              >
                Next
              </button>
              <div className="session-nav__spacer" aria-hidden="true" />
              <button type="button" className="session-nav__btn session-nav__btn--map" onClick={() => setShowSessionMap((open) => !open)}>
                Map
              </button>
              <button type="button" className="session-nav__btn session-nav__btn--submit" onClick={openSubmitConfirm} disabled={isFinalizing}>
                {session.settings.mode === 'exam' ? 'Submit' : 'Finish'}
              </button>
            </div>

            {showSessionMap && (
              <article className="panel stack-gap">
                <div className="map-panel__header">
                  <p className="eyebrow">Question map</p>
                  <div className="map-legend">
                    <span>● Answered</span>
                    <span>★ Bookmarked</span>
                  </div>
                </div>
                <div className="tracker-grid">
                  {session.items.map((item, index) => {
                    const answered = Boolean(session.answers[item.itemId]);
                    const bookmarked = session.flaggedForReview.includes(item.itemId);
                    const isCurrent = index === session.currentIndex;
                    return (
                      <button
                        key={item.itemId}
                        type="button"
                        className={[
                          'tracker-chip',
                          isCurrent ? 'is-current' : '',
                          answered ? 'is-answered' : '',
                          bookmarked ? 'is-bookmarked' : ''
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => {
                          mutateSession((current) => ({ ...current, currentIndex: index }));
                        }}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </article>
            )}
          </section>
        )}

        {view === 'results' && selectedHistory && (
          <section className="stack-gap results-page">
            <article className="results-hero">
              <p className="results-hero__eyebrow">
                {selectedHistory.settings.mode === 'exam' ? 'Exam complete' : 'Study complete'}
              </p>
              <p className="results-hero__score">{selectedHistory.result.percent}%</p>
              <p className="results-hero__meta">
                {selectedHistory.result.correct} of {selectedHistory.result.total} correct · Time{' '}
                {formatDuration(selectedHistory.timeUsedSeconds)}
              </p>
              <span
                className={[
                  'results-pass-chip',
                  selectedHistory.result.estimatedPass ? 'results-pass-chip--success' : 'results-pass-chip--warn'
                ].join(' ')}
              >
                {selectedHistory.result.estimatedPass
                  ? `At or above your ${selectedHistory.settings.targetThreshold}% target`
                  : `Below your ${selectedHistory.settings.targetThreshold}% target`}
              </span>
            </article>

            <article className="panel">
              <p className="eyebrow">By domain</p>
              <div className="breakdown-list">
                {selectedHistory.result.breakdown.map((entry) => {
                  const percent = entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0;
                  const band = performanceBand(percent);
                  return (
                    <div key={entry.categoryId} className="breakdown-row">
                      <div className="breakdown-row__header">
                        <span>{formatDomainBarName(entry.categoryId, entry.categoryLabel)}</span>
                        <span className="muted-text">
                          {entry.correct}/{entry.total} · {percent}%
                        </span>
                      </div>
                      <div className="breakdown-row__track">
                        <div className={`breakdown-row__fill breakdown-row__fill--${band}`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <div className="results-actions">
              <button
                type="button"
                className="primary-button results-actions__primary"
                onClick={() => {
                  setReviewFrom('results');
                  setShowReviewMap(false);
                  setView('review');
                }}
              >
                Review answers
              </button>
              <button type="button" className="secondary-button" onClick={retakeSelectedHistory}>
                Retake
              </button>
              <button type="button" className="secondary-button" onClick={() => setView('dashboard')}>
                Home
              </button>
            </div>
          </section>
        )}

        {view === 'review' && selectedHistory && selectedHistoryItem && (
          <section className="stack-gap review-page">
            <div className="session-topbar">
              <button
                type="button"
                className="session-back-button"
                onClick={() => setView(reviewFrom === 'history' ? 'history' : 'results')}
              >
                ‹ {reviewFrom === 'history' ? 'Back to progress' : 'Back to results'}
              </button>
              <strong className="session-position">
                Item {reviewIndex + 1} of {selectedHistory.items.length}
              </strong>
              <div className="session-topbar__actions">
                <button type="button" className="secondary-button secondary-button--compact" onClick={() => setShowReviewMap((open) => !open)}>
                  Map
                </button>
                <button
                  type="button"
                  className="secondary-button secondary-button--compact"
                  onClick={() => openFlagComposer(selectedHistoryItem.question, selectedHistory.id, selectedHistory.settings.blueprintId, selectedHistory.settings.mode)}
                >
                  Report
                </button>
              </div>
            </div>

            {showReviewMap && (
              <article className="panel stack-gap">
                <div className="map-panel__header">
                  <p className="eyebrow">Jump to item</p>
                  <div className="map-legend">
                    <span className="map-legend__correct">● Correct</span>
                    <span className="map-legend__incorrect">● Incorrect</span>
                  </div>
                </div>
                <div className="review-map">
                  {selectedHistory.items.map((item, index) => {
                    const state = reviewChipState(selectedHistory, item);
                    return (
                      <button
                        key={item.itemId}
                        type="button"
                        className={[
                          'chip-button',
                          state === 'correct' ? 'is-correct' : '',
                          state === 'incorrect' ? 'is-incorrect' : '',
                          state === 'skipped' ? 'is-skipped' : '',
                          index === reviewIndex ? 'is-current' : ''
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => {
                          setReviewIndex(index);
                        }}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </article>
            )}

            <QuestionReview item={selectedHistoryItem} answer={selectedHistory.answers[selectedHistoryItem.itemId]} />

            <div className="session-nav review-nav">
              <button
                type="button"
                className="session-nav__btn"
                onClick={() => setReviewIndex((current) => Math.max(current - 1, 0))}
                disabled={reviewIndex === 0}
              >
                Previous
              </button>
              <button
                type="button"
                className="session-nav__btn session-nav__btn--next"
                onClick={() => setReviewIndex((current) => Math.min(current + 1, selectedHistory.items.length - 1))}
                disabled={reviewIndex === selectedHistory.items.length - 1}
              >
                Next
              </button>
            </div>
          </section>
        )}

        {view === 'history' && (
          <section className="stack-gap">
            <div className="section-heading">
              <div>
                <h1 className="page-title">Progress</h1>
                <p className="muted-text">
                  {history.length} session{history.length === 1 ? '' : 's'} recorded
                </p>
              </div>
              {history.length > 0 && (
                <button type="button" className="secondary-button secondary-button--compact" onClick={() => void handleClearHistory()}>
                  Clear history
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <article className="panel progress-empty">
                <p className="muted-text">No completed sessions yet.</p>
                <button type="button" className="primary-button" onClick={() => setView('setup')}>
                  Start a session
                </button>
              </article>
            ) : (
              <>
                <div className="progress-grid">
                  <article className="panel stack-gap">
                    <p className="eyebrow">Score trend</p>
                    <div className="trend-summary">
                      <div className="trend-summary__stat">
                        <span className="trend-summary__label">Average</span>
                        <strong className="trend-summary__value">
                          {readiness.averagePercent === null ? '—' : `${readiness.averagePercent}%`}
                        </strong>
                      </div>
                      <div className="trend-summary__stat">
                        <span className="trend-summary__label">Best</span>
                        <strong className="trend-summary__value">
                          {bestHistoryPercent === null ? '—' : `${bestHistoryPercent}%`}
                        </strong>
                      </div>
                      <div className="trend-summary__stat">
                        <span className="trend-summary__label">Latest</span>
                        <strong
                          className={[
                            'trend-summary__value',
                            `trend-summary__value--${historyLatestDeltaTone(historyTrend.recentDelta)}`
                          ].join(' ')}
                        >
                          {formatHistoryLatestDelta(historyTrend.recentDelta)}
                        </strong>
                      </div>
                    </div>
                    <TrendChart points={historyTrend.points.slice(-8)} compact />
                  </article>

                  {focusAreas.length > 0 && (
                    <article className="panel stack-gap">
                      <p className="eyebrow">By domain</p>
                      {focusAreas.map((area) => (
                        <div key={area.categoryId} className="focus-bar">
                          <div className="focus-bar__label">
                            <span>{formatDomainBarName(area.categoryId, area.categoryLabel)}</span>
                            <strong>{area.percent}%</strong>
                          </div>
                          <div className="focus-bar__track focus-bar__track--gold">
                            <div className={`focus-bar__fill focus-bar__fill--${area.band}`} style={{ width: `${area.percent}%` }} />
                          </div>
                        </div>
                      ))}
                    </article>
                  )}
                </div>

                <div className="history-list">
                  {history.map((entry) => (
                    <article key={entry.id} className="history-row">
                      <div className="history-row__body">
                        <p className="history-row__score">
                          {entry.result.correct}/{entry.result.total} · {entry.result.percent}%
                        </p>
                        <p className="history-row__meta">
                          {formatHistoryDate(entry.completedAt)} · {entry.settings.mode === 'exam' ? 'Exam' : 'Study'} ·{' '}
                          {entry.result.estimatedPass ? 'On target' : 'Below target'}
                        </p>
                      </div>
                      <div className="history-row__actions">
                        <button
                          type="button"
                          className="secondary-button secondary-button--compact"
                          onClick={() => {
                            setSelectedHistory(entry);
                            setReviewIndex(0);
                            setReviewFrom('history');
                            setShowReviewMap(false);
                            setView('review');
                          }}
                        >
                          Review
                        </button>
                        <button type="button" className="ghost-button ghost-button--compact" onClick={() => void removeHistoryEntry(entry.id)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                {flags.length > 0 && (
                  <article className="panel flags-panel">
                    <div className="flags-panel__body">
                      <strong>{flags.length} reported item{flags.length === 1 ? '' : 's'}</strong>
                      <p className="muted-text">Reported items, stored on this device</p>
                    </div>
                    <div className="flags-panel__actions">
                      <button type="button" className="secondary-button secondary-button--compact" onClick={() => void exportFlags()}>
                        Export JSON
                      </button>
                      <button type="button" className="secondary-button secondary-button--compact" onClick={() => void resetFlags()}>
                        Clear
                      </button>
                    </div>
                  </article>
                )}
              </>
            )}

            {history.length > 0 && categoryTrend && (
              <article className="panel stack-gap">
                <p className="eyebrow">{categoryTrend.categoryLabel} trend</p>
                <TrendChart
                  compact
                  points={categoryTrend.points.map((point) => ({
                    id: point.sessionId,
                    label: point.label,
                    percent: point.percent,
                    belowTarget: false
                  }))}
                />
              </article>
            )}
          </section>
        )}
      </main>

      <footer className="footer-bar">
        <p>
          Independent study aid — not affiliated with or endorsed by ABTC or PSI. Practice scores are unofficial estimates, not official exam results.
        </p>
      </footer>
      </div>
    </div>
  );
}

export default App;
