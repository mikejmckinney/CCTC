import { BookOpen, Zap, Target, RotateCcw } from 'lucide-react';
import type { QuickStartType } from '../../types/dashboard';

interface QuickStartProps {
  onQuickStart: (type: QuickStartType) => void;
  hasActiveSession: boolean;
  hasHistory: boolean;
}

export function QuickStart({ onQuickStart, hasActiveSession, hasHistory }: QuickStartProps) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Quick Start
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <QuickStartButton
          icon={<BookOpen className="h-5 w-5" />}
          label="Full Exam"
          sub="175 items · 180 min"
          variant="primary"
          onClick={() => onQuickStart('full-exam')}
        />
        <QuickStartButton
          icon={<Zap className="h-5 w-5" />}
          label="Quick Session"
          sub="25 items · 30 min"
          onClick={() => onQuickStart('quick-session')}
        />
        {hasHistory && (
          <QuickStartButton
            icon={<Target className="h-5 w-5" />}
            label="Weak Areas"
            sub="Spaced review"
            onClick={() => onQuickStart('weak-areas')}
          />
        )}
        {hasActiveSession && (
          <QuickStartButton
            icon={<RotateCcw className="h-5 w-5" />}
            label="Resume"
            sub="Continue session"
            onClick={() => onQuickStart('resume')}
          />
        )}
      </div>
    </div>
  );
}

function QuickStartButton({ icon, label, sub, variant, onClick }: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  variant?: 'primary';
  onClick: () => void;
}) {
  const isPrimary = variant === 'primary';

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border px-4 py-4 text-center transition-all hover:shadow-md ${
        isPrimary
          ? 'border-primary bg-primary text-white hover:bg-primary-hover'
          : 'border-border bg-surface text-text hover:border-primary/40'
      }`}
    >
      <div className={isPrimary ? 'text-white' : 'text-primary'}>{icon}</div>
      <span className="text-sm font-semibold">{label}</span>
      <span className={`text-xs ${isPrimary ? 'text-white/75' : 'text-text-muted'}`}>{sub}</span>
    </button>
  );
}
