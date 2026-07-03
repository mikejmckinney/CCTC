import { cn } from '../lib/cn';
import {
  BookOpen, Clock, Target, TrendingUp, BarChart3, ChevronRight,
  Zap, Brain, AlertTriangle, CheckCircle2, Play, Settings, History, Flag
} from 'lucide-react';

function StatCard({ label, value, subtext, icon: Icon, variant = 'default' }: {
  label: string; value: string; subtext?: string; icon: React.ElementType; variant?: 'default' | 'accent' | 'success' | 'warning';
}) {
  const borderColor = variant === 'accent' ? 'border-l-[var(--accent)]' :
    variant === 'success' ? 'border-l-[var(--success)]' :
    variant === 'warning' ? 'border-l-[var(--warning)]' :
    'border-l-[var(--primary)]';

  return (
    <div className={cn(
      'rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm',
      'border-l-4 transition-shadow hover:shadow-md',
      borderColor
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>{value}</p>
          {subtext && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{subtext}</p>}
        </div>
        <div className="rounded-lg bg-[var(--muted)] p-2">
          <Icon className="h-5 w-5 text-[var(--primary)]" />
        </div>
      </div>
    </div>
  );
}

function QuickStartButton({ label, icon: Icon, description }: { label: string; icon: React.ElementType; description: string }) {
  return (
    <button className={cn(
      'flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-left shadow-sm',
      'transition-all hover:shadow-md hover:border-[var(--primary)] hover:-translate-y-0.5'
    )}>
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

function CategoryBar({ name, percent, examWeight, isStrong }: { name: string; percent: number; examWeight: string; isStrong: boolean }) {
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
      <div className="h-2 rounded-full bg-[var(--muted)]">
        <div
          className={cn('h-full rounded-full transition-all', isStrong ? 'bg-[var(--success)]' : 'bg-[var(--warning)]')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function RecentSessionRow({ date, mode, questions, score, duration }: {
  date: string; mode: string; questions: number; score: number; duration: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--foreground)]">{date}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{mode} · {questions} questions · {duration}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={cn(
          'rounded-full px-2.5 py-0.5 text-xs font-semibold',
          score >= 70 ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--warning)]/10 text-[var(--warning)]'
        )}>
          {score}%
        </span>
        <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
      </div>
    </div>
  );
}

export function DashboardPreview() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      {/* Hero section */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>
              CCTC Practice Exam
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Welcome back. Your exam is in 42 days.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-all hover:shadow-md">
              <Play className="h-4 w-4" /> Start Exam
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-all hover:bg-[var(--muted)]">
              <Settings className="h-4 w-4" /> Setup
            </button>
          </div>
        </div>
      </div>

      {/* Readiness + Am I Ready */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/10">
              <Target className="h-6 w-6 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Readiness Score</p>
              <p className="text-4xl font-bold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>78%</p>
            </div>
          </div>
          <div className="mt-4 h-3 rounded-full bg-[var(--muted)]">
            <div className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" style={{ width: '78%' }} />
          </div>
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">Based on exponential moving average of your last 12 sessions</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--success)]/10">
              <Brain className="h-5 w-5 text-[var(--success)]" />
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-[var(--foreground)]">Am I Ready?</p>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                <span className="text-[var(--foreground)]">Domain 1: Education — <strong>82%</strong></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
                <span className="text-[var(--foreground)]">Domain 2: Pre-Transplant — <strong>68%</strong></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                <span className="text-[var(--foreground)]">Domain 3: Post-Op — <strong>81%</strong></span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] pt-1">Focus on Domain 2 — your weakest area by 14 points.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>Quick Start</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickStartButton label="Full Exam" icon={BookOpen} description="175 questions, 180 minutes" />
          <QuickStartButton label="Quick Session" icon={Zap} description="25 questions, 30 minutes" />
          <QuickStartButton label="Weak Areas" icon={Target} description="Spaced repetition of missed items" />
          <QuickStartButton label="Last Settings" icon={Clock} description="Resume your previous setup" />
        </div>
      </div>

      {/* Category Breakdown + Study Plan */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>Category Breakdown</h2>
          <div className="space-y-4">
            <CategoryBar name="Domain 1: Education" percent={82} examWeight="33%" isStrong />
            <CategoryBar name="Domain 2: Pre-Transplant" percent={68} examWeight="39%" isStrong={false} />
            <CategoryBar name="Domain 3: Post-Op Care" percent={81} examWeight="28%" isStrong />
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>Study Plan</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg bg-[var(--muted)] p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Priority: Domain 2 Practice</p>
                <p className="text-xs text-[var(--muted-foreground)]">Your weakest domain. Focus on pre-transplant evaluation and waitlist management.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-[var(--muted)] p-3">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Review Missed Items</p>
                <p className="text-xs text-[var(--muted-foreground)]">12 items from your last session need review. Spaced repetition suggests today.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-[var(--muted)] p-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Next Session</p>
                <p className="text-xs text-[var(--muted-foreground)]">Recommended: 30-min focused study on weak areas</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent History */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>Recent Sessions</h2>
          <button className="flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline">
            <History className="h-4 w-4" /> View All
          </button>
        </div>
        <RecentSessionRow date="Jul 2, 2026 · 3:45 PM" mode="Exam" questions={175} score={82} duration="2h 48m" />
        <RecentSessionRow date="Jul 1, 2026 · 7:12 PM" mode="Study" questions={50} score={74} duration="52m" />
        <RecentSessionRow date="Jun 30, 2026 · 1:30 PM" mode="Exam" questions={175} score={78} duration="2h 55m" />
        <RecentSessionRow date="Jun 28, 2026 · 6:00 PM" mode="Study" questions={25} score={88} duration="28m" />
        <RecentSessionRow date="Jun 27, 2026 · 4:15 PM" mode="Exam" questions={100} score={71} duration="1h 42m" />
      </div>

      {/* Bottom nav preview (mobile) */}
      <div className="mx-auto max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-sm">
        <div className="flex items-center justify-around">
          {[
            { icon: BookOpen, label: 'Home', active: true },
            { icon: Settings, label: 'Setup', active: false },
            { icon: BarChart3, label: 'History', active: false },
            { icon: Flag, label: 'Reported', active: false },
          ].map(({ icon: Icon, label, active }) => (
            <button
              key={label}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-xs transition-colors',
                active ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-semibold' : 'text-[var(--muted-foreground)]'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
