import { useMemo, useState } from 'react';
import { cn } from '../lib/cn';
import { Card, CardContent, CardHeader, CardTitle, Badge, Progress, Button } from '../components/ui';
import { computeReadiness, computeSpacedRepetition } from '../lib/readiness';
import { formatDuration } from '../lib/format';
import { getDomainShortLabel } from '../lib/domains';
import type { HistoryEntry, SessionSettings } from '../types/exam';
import { getBlueprintLabel } from '../data/blueprints';
import {
  Play, Zap, Target, Clock, BookOpen, Brain, CheckCircle2,
  AlertTriangle, TrendingUp, ChevronRight, BarChart3, ChevronDown,
  ChevronUp, RotateCcw, Info
} from 'lucide-react';

interface DashboardProps {
  history: HistoryEntry[];
  settings: SessionSettings;
  onStartExam: () => void;
  onStartQuick: () => void;
  onStartWeakAreas: (domains: string[]) => void;
  onStartCustom: (overrides: Partial<SessionSettings>) => void;
  onUpdateSettings: (partial: Partial<SessionSettings>) => void;
  onGoToHistory: () => void;
  onViewSession: (entry: HistoryEntry) => void;
}

type ReadinessVerdict = 'exam-ready' | 'on-pace' | 'on-track' | 'at-risk';

function getReadinessVerdict(
  overallEma: number,
  target: number,
  domains: Array<{ domainId: string; emaScore: number }>,
  daysUntilExam: number | null
): { verdict: ReadinessVerdict; label: string; detail: string } {
  const allDomainsAboveTarget = domains.every((d) => d.emaScore >= target);
  const anyDomainBelow = domains.some((d) => d.emaScore < target);
  const laggingDomain = domains.find((d) => d.emaScore < target);

  if (overallEma >= target && allDomainsAboveTarget) {
    return { verdict: 'exam-ready', label: 'Exam-ready', detail: 'All domains at or above target. You\'re ready.' };
  }

  if (overallEma >= target && anyDomainBelow) {
    const lagName = getDomainShortLabel(laggingDomain!.domainId);
    return { verdict: 'on-pace', label: 'On pace', detail: `Passing overall, but ${lagName} lags at ${laggingDomain!.emaScore}%.` };
  }

  if (overallEma < target && daysUntilExam !== null && daysUntilExam > 0) {
    // Simple projection: if improving trend, estimate days to target
    const gap = target - overallEma;
    const daysNeeded = Math.ceil(gap / 2); // rough: 2% per week of study
    if (daysNeeded <= daysUntilExam) {
      return { verdict: 'on-track', label: 'On track', detail: `Below target but projected to reach ${target}% by exam day.` };
    }
    return { verdict: 'at-risk', label: 'At risk', detail: `Need +${gap}% to reach target. Consider intensive study.` };
  }

  if (overallEma < target) {
    const gap = target - overallEma;
    return { verdict: 'at-risk', label: 'At risk', detail: `Need +${gap}% to reach target.` };
  }

  return { verdict: 'on-pace', label: 'On pace', detail: 'Keep studying to maintain your readiness.' };
}

function generateStudyAction(
  readiness: ReturnType<typeof computeReadiness>,
  target: number
): { action: string; icon: React.ElementType } {
  if (readiness.totalSessions === 0) {
    return { action: 'Take a quick exam to calibrate your readiness.', icon: Zap };
  }

  const laggingDomains = readiness.domains.filter((d) => d.emaScore < target);

  if (readiness.overallEma < target) {
    if (laggingDomains.length > 0) {
      const names = laggingDomains.map((d) => getDomainShortLabel(d.domainId)).join(', ');
      return { action: `Practice weak domains: ${names}. Focus on missed items resurfaced first.`, icon: Target };
    }
    return { action: 'Study weak areas with spaced repetition of previously-incorrect items.', icon: Target };
  }

  if (laggingDomains.length > 0) {
    const names = laggingDomains.map((d) => getDomainShortLabel(d.domainId)).join(', ');
    return { action: `Practice ${names} to bring all domains above target.`, icon: AlertTriangle };
  }

  return { action: 'Take a full mock exam or brush up with a quick session.', icon: BookOpen };
}

function QuickStartButton({ label, icon: Icon, description, onClick }: {
  label: string; icon: React.ElementType; description: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-left shadow-sm',
        'transition-all hover:shadow-md hover:border-[var(--primary)] hover:-translate-y-0.5'
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-[13px] text-[var(--foreground)]">{label}</p>
        <p className="text-xs text-[var(--muted-foreground)] truncate">{description}</p>
      </div>
      <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
    </button>
  );
}

function CategoryBar({ name, percent, examWeight, isStrong }: {
  name: string; percent: number; examWeight: string; isStrong: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-[var(--foreground)]">{name}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--muted-foreground)]">{examWeight} of exam</span>
          <span className={cn(
            'text-xs font-semibold',
            isStrong ? 'text-[var(--success)]' : 'text-[var(--warning)]'
          )}>{percent}%</span>
        </div>
      </div>
      <Progress value={percent} variant={isStrong ? 'success' : 'warning'} />
    </div>
  );
}

export function Dashboard({
  history, settings, onStartExam, onStartQuick, onStartWeakAreas,
  onStartCustom, onUpdateSettings, onGoToHistory, onViewSession
}: DashboardProps) {
  const readiness = useMemo(() => computeReadiness(history), [history]);
  const spacedCount = useMemo(() => computeSpacedRepetition(history).length, [history]);
  const [showSetup, setShowSetup] = useState(false);
  const [examDate, setExamDate] = useState(() => {
    try { return localStorage.getItem('cctc-exam-date') || ''; } catch { return ''; }
  });
  const [targetScore, setTargetScore] = useState(settings.targetThreshold);

  const daysUntilExam = examDate ? Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000) : null;
  const target = settings.targetThreshold;
  const verdict = getReadinessVerdict(readiness.overallEma, target, readiness.domains, daysUntilExam);
  const studyAction = generateStudyAction(readiness, target);
  const laggingDomains = readiness.domains.filter((d) => d.emaScore < target);
  const recentSessions = history.slice(0, 5);

  const handleExamDateChange = (value: string) => {
    setExamDate(value);
    try { localStorage.setItem('cctc-exam-date', value); } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card>
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-[30px] font-semibold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>
                CCTC Practice Exam
              </h1>
              <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
                {daysUntilExam !== null && daysUntilExam > 0
                  ? `Your exam is in ${daysUntilExam} days.`
                  : daysUntilExam !== null && daysUntilExam <= 0
                  ? 'Exam day has arrived. Good luck!'
                  : 'Welcome back. Ready to study?'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Readiness Score */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10">
              <Target className="h-7 w-7 text-[var(--accent)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="eyebrow">Readiness Score</p>
              <p className="text-[36px] font-bold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>
                {readiness.overallEma || '—'}{readiness.overallEma ? '%' : ''}
              </p>
              {readiness.overallEma > 0 && (
                <>
                  <div className="mt-3">
                    <Progress value={readiness.overallEma} variant={readiness.overallEma >= target ? 'success' : 'warning'} label="Readiness score" />
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted-foreground)] leading-relaxed">
                    Readiness is an <strong>exponential moving average (EMA)</strong> of your exam scores with α=0.3.
                    Recent sessions weigh more heavily — a single bad day won't tank your score, but consistent
                    improvement moves it up steadily. The first session initializes the EMA directly (not blended with zero).
                    Based on {readiness.totalSessions} session{readiness.totalSessions !== 1 ? 's' : ''}.
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Am I Ready Insights */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-[var(--primary)]" />
            <CardTitle>Am I Ready?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Insight 1: Verdict */}
          <div className={cn(
            'flex items-start gap-3 rounded-lg p-3',
            verdict.verdict === 'exam-ready' && 'bg-[var(--success)]/5 border border-[var(--success)]/20',
            verdict.verdict === 'on-pace' && 'bg-[var(--info)]/5 border border-[var(--info)]/20',
            verdict.verdict === 'on-track' && 'bg-[var(--warning)]/5 border border-[var(--warning)]/20',
            verdict.verdict === 'at-risk' && 'bg-[var(--destructive)]/5 border border-[var(--destructive)]/20',
          )}>
            {verdict.verdict === 'exam-ready' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" /> :
             verdict.verdict === 'at-risk' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--destructive)]" /> :
             <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />}
            <div>
              <p className="text-[13px] font-semibold text-[var(--foreground)]">{verdict.label}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{verdict.detail}</p>
            </div>
          </div>

          {/* Insight 2: Largest gap */}
          {laggingDomains.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg bg-[var(--muted)] p-3">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
              <div>
                <p className="text-[13px] font-semibold text-[var(--foreground)]">Largest gap</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {getDomainShortLabel(laggingDomains[0].domainId)} at {laggingDomains[0].emaScore}% —
                  {target - laggingDomains[0].emaScore}% below target ({target}%).
                  Weighted at {laggingDomains[0].examWeight}% of the exam.
                </p>
              </div>
            </div>
          )}

          {/* Insight 3: Due for review */}
          {spacedCount > 0 && (
            <div className="flex items-start gap-3 rounded-lg bg-[var(--muted)] p-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
              <div>
                <p className="text-[13px] font-semibold text-[var(--foreground)]">Due for review</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {spacedCount} previously-incorrect item{spacedCount !== 1 ? 's' : ''} ready for spaced repetition review.
                </p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {readiness.totalSessions === 0 && (
            <div className="flex items-start gap-3 rounded-lg bg-[var(--muted)] p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
              <p className="text-xs text-[var(--muted-foreground)]">Complete practice sessions to see your readiness breakdown.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown + Study Plan */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {readiness.domains.length > 0 ? (
              readiness.domains.map((d) => (
                <CategoryBar
                  key={d.domainId}
                  name={getDomainShortLabel(d.domainId, d.domainLabel)}
                  percent={d.emaScore}
                  examWeight={`${d.examWeight}%`}
                  isStrong={d.emaScore >= target}
                />
              ))
            ) : (
              DEMO_DOMAINS_PLACEHOLDER.map((d) => (
                <CategoryBar key={d.id} name={d.label} percent={0} examWeight={`${d.weight}%`} isStrong />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended Next Action</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 rounded-lg bg-[var(--muted)] p-4">
              <studyAction.icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
              <div>
                <p className="text-[13px] font-medium text-[var(--foreground)] leading-relaxed">{studyAction.action}</p>
                {spacedCount > 0 && readiness.totalSessions > 0 && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    {spacedCount} item{spacedCount !== 1 ? 's' : ''} due for spaced repetition.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickStartButton label="Full Exam" icon={BookOpen} description="175 questions, 180 minutes" onClick={onStartExam} />
            <QuickStartButton label="Quick Session" icon={Zap} description="25 questions, 30 minutes" onClick={onStartQuick} />
            <QuickStartButton
              label="Weak Areas"
              icon={Target}
              description={laggingDomains.length > 0
                ? `Focus on ${laggingDomains.map((d) => getDomainShortLabel(d.domainId)).join(', ')}`
                : 'Spaced repetition of missed items'}
              onClick={() => onStartWeakAreas(laggingDomains.map((d) => d.domainId))}
            />
            <QuickStartButton label="Current Settings" icon={Clock} description={getBlueprintLabel(settings.blueprintId)} onClick={() => onStartCustom({})} />
          </div>

          {/* Expandable Setup */}
          <div>
            <button
              onClick={() => setShowSetup(!showSetup)}
              className="flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline"
            >
              {showSetup ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Advanced Setup
            </button>

            {showSetup && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-4">
                <div className="grid gap-1.5">
                  <label className="text-[13px] font-medium text-[var(--foreground)]">Mode</label>
                  <select
                    value={settings.mode}
                    onChange={(e) => onUpdateSettings({ mode: e.target.value as 'exam' | 'study' })}
                    className="flex h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  >
                    <option value="exam">Exam</option>
                    <option value="study">Study</option>
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-[13px] font-medium text-[var(--foreground)]">Blueprint</label>
                  <select
                    value={settings.blueprintId}
                    onChange={(e) => onUpdateSettings({ blueprintId: e.target.value as any })}
                    className="flex h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  >
                    <option value="cctc-from-2026-07">2026-07 (default)</option>
                    <option value="cctc-thru-2026-06">Until 2026-06</option>
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-[13px] font-medium text-[var(--foreground)]">Exam Date (optional)</label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => handleExamDateChange(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  />
                </div>

                <div className="grid gap-1.5">
                  <label className="text-[13px] font-medium text-[var(--foreground)]">
                    Target Score: <span className="text-[var(--accent)] font-bold">{targetScore}%</span>
                  </label>
                  <input
                    type="range"
                    min={50}
                    max={90}
                    value={targetScore}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTargetScore(val);
                      onUpdateSettings({ targetThreshold: val });
                    }}
                    className="w-full accent-[var(--primary)]"
                  />
                  <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                    <span>50%</span>
                    <span>90%</span>
                  </div>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.includeDrafts}
                    onChange={(e) => onUpdateSettings({ includeDrafts: e.target.checked })}
                    disabled={settings.mode === 'exam'}
                    className="h-4 w-4 rounded border-[var(--input)] text-[var(--primary)] focus:ring-[var(--ring)]"
                  />
                  <span className="text-[13px] text-[var(--foreground)]">Include draft items</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.showTimer}
                    onChange={(e) => onUpdateSettings({ showTimer: e.target.checked })}
                    className="h-4 w-4 rounded border-[var(--input)] text-[var(--primary)] focus:ring-[var(--ring)]"
                  />
                  <span className="text-[13px] text-[var(--foreground)]">Show on-screen timer</span>
                </label>

                <div className="sm:col-span-2 flex gap-3 pt-2">
                  <Button onClick={() => onStartCustom({})} className="flex-1 gap-2">
                    <Play className="h-4 w-4" /> Start with Custom Settings
                  </Button>
                  <Button variant="secondary" onClick={() => {
                    onUpdateSettings({ questionCount: 175, timed: true, timeMinutes: 180, targetThreshold: 70 });
                    setTargetScore(70);
                  }} className="gap-2">
                    <RotateCcw className="h-4 w-4" /> Reset
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Sessions</CardTitle>
            <Button variant="ghost" size="sm" onClick={onGoToHistory} className="gap-1">
              <BarChart3 className="h-4 w-4" /> View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentSessions.length > 0 ? (
            <div className="divide-y divide-[var(--border)]">
              {recentSessions.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => onViewSession(entry)}
                  className="flex w-full items-center justify-between py-3 text-left transition-colors hover:bg-[var(--muted)]/50 -mx-2 px-2 rounded-lg"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[var(--foreground)]">
                      {new Date(entry.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}
                      {new Date(entry.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {entry.settings.mode === 'exam' ? 'Exam' : 'Study'} · {entry.settings.questionCount} questions · {formatDuration(entry.timeUsedSeconds)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={entry.result.percent >= target ? 'success' : 'warning'}>
                      {entry.result.percent}%
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[var(--muted-foreground)]">No completed sessions yet. Start your first practice exam!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const DEMO_DOMAINS_PLACEHOLDER = [
  { id: '1', label: 'D1: Education', weight: 33 },
  { id: '2', label: 'D2: Pre-Transplant', weight: 39 },
  { id: '3', label: 'D3: Post-Op', weight: 28 },
];
