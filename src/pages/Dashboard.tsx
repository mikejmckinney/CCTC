import { useMemo } from 'react';
import { cn } from '../lib/cn';
import { Card, CardContent, CardHeader, CardTitle, Badge, Progress, Button } from '../components/ui';
import { computeReadiness, computeSpacedRepetition, generateStudyPlan } from '../lib/readiness';
import { formatDuration } from '../lib/format';
import type { HistoryEntry } from '../types/exam';
import {
  Play, Settings, Zap, Target, Clock, BookOpen, Brain, CheckCircle2,
  AlertTriangle, TrendingUp, ChevronRight, BarChart3
} from 'lucide-react';

interface DashboardProps {
  history: HistoryEntry[];
  onStartExam: () => void;
  onStartQuick: () => void;
  onStartWeakAreas: () => void;
  onStartLastSettings: () => void;
  onGoToSetup: () => void;
  onGoToHistory: () => void;
  onViewSession: (entry: HistoryEntry) => void;
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
        <p className="font-semibold text-[var(--foreground)]">{label}</p>
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
      <div className="flex items-center justify-between text-sm">
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
  history, onStartExam, onStartQuick, onStartWeakAreas,
  onStartLastSettings, onGoToSetup, onGoToHistory, onViewSession
}: DashboardProps) {
  const readiness = useMemo(() => computeReadiness(history), [history]);
  const spacedItems = useMemo(() => computeSpacedRepetition(history).length, [history]);
  const studyPlan = useMemo(() => generateStudyPlan(readiness, spacedItems), [readiness, spacedItems]);

  const recentSessions = history.slice(0, 5);

  const examDate = (() => {
    try { return localStorage.getItem('cctc-exam-date') || null; } catch { return null; }
  })();
  const daysUntilExam = examDate ? Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000) : null;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="overflow-hidden">
        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>
                CCTC Practice Exam
              </h1>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {daysUntilExam ? `Your exam is in ${daysUntilExam} days.` : 'Welcome back. Ready to study?'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={onStartExam} className="gap-2">
                <Play className="h-4 w-4" /> Start Exam
              </Button>
              <Button variant="secondary" onClick={onGoToSetup} className="gap-2">
                <Settings className="h-4 w-4" /> Setup
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Readiness + Am I Ready */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/10">
                <Target className="h-6 w-6 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Readiness Score</p>
                <p className="text-4xl font-bold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>
                  {readiness.overallEma || '—'}{readiness.overallEma ? '%' : ''}
                </p>
              </div>
            </div>
            {readiness.overallEma > 0 && (
              <>
                <div className="mt-4">
                  <Progress value={readiness.overallEma} variant={readiness.overallEma >= 70 ? 'success' : 'warning'} />
                </div>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  Based on exponential moving average of your last {readiness.totalSessions} sessions
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--success)]/10">
                <Brain className="h-5 w-5 text-[var(--success)]" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-[var(--foreground)]">Am I Ready?</p>
                {readiness.domains.length > 0 ? (
                  <>
                    {readiness.domains.map((d) => (
                      <div key={d.domainId} className="flex items-center gap-2 text-sm">
                        {d.isWeak ? (
                          <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                        )}
                        <span className="text-[var(--foreground)]">{d.domainLabel} — <strong>{d.emaScore}%</strong></span>
                      </div>
                    ))}
                    {readiness.weakDomains.length > 0 && (
                      <p className="text-xs text-[var(--muted-foreground)] pt-1">
                        Focus on {readiness.weakDomains.join(', ')}.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">Complete practice sessions to see your readiness breakdown.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>Quick Start</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickStartButton label="Full Exam" icon={BookOpen} description="175 questions, 180 minutes" onClick={onStartExam} />
          <QuickStartButton label="Quick Session" icon={Zap} description="25 questions, 30 minutes" onClick={onStartQuick} />
          <QuickStartButton label="Weak Areas" icon={Target} description="Spaced repetition of missed items" onClick={onStartWeakAreas} />
          <QuickStartButton label="Current Settings" icon={Clock} description="Resume your previous setup" onClick={onStartLastSettings} />
        </div>
      </div>

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
                  name={d.domainLabel}
                  percent={d.emaScore}
                  examWeight={`${d.examWeight}%`}
                  isStrong={!d.isWeak}
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
            <CardTitle>Study Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {studyPlan.length > 0 ? (
              studyPlan.map((item, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg bg-[var(--muted)] p-3">
                  {i === 0 && readiness.weakDomains.length > 0 ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
                  ) : (
                    <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                  )}
                  <p className="text-sm text-[var(--foreground)]">{item}</p>
                </div>
              ))
            ) : (
              <div className="flex items-start gap-3 rounded-lg bg-[var(--muted)] p-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">Start studying</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Complete your first session to get personalized recommendations.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {new Date(entry.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}
                      {new Date(entry.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {entry.settings.mode === 'exam' ? 'Exam' : 'Study'} · {entry.settings.questionCount} questions · {formatDuration(entry.timeUsedSeconds)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={entry.result.percent >= 70 ? 'success' : 'warning'}>
                      {entry.result.percent}%
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">No completed sessions yet. Start your first practice exam!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const DEMO_DOMAINS_PLACEHOLDER = [
  { id: '1', label: 'Domain 1: Educator & Coordinator', weight: 33 },
  { id: '2', label: 'Domain 2: Pre-Transplant', weight: 39 },
  { id: '3', label: 'Domain 3: Post-Transplant Care', weight: 28 },
];
