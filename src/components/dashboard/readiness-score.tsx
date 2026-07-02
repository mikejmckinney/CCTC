import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ReadinessState } from '../../types/dashboard';

interface ReadinessScoreProps {
  readiness: ReadinessState;
  targetScore: number;
}

export function ReadinessScore({ readiness, targetScore }: ReadinessScoreProps) {
  const score = readiness.composite;
  const delta = readiness.totalSessions >= 2 ? readiness.emaScore - score : null;

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface p-6 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        Readiness
      </span>

      {/* Circular gauge */}
      <div className="relative flex h-28 w-28 items-center justify-center">
        <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="8"
          />
          <circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke={scoreColor(score, targetScore)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 326.7} 326.7`}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-mono text-3xl font-bold" style={{ color: scoreColor(score, targetScore) }}>
            {score}
          </span>
          <span className="text-xs text-text-muted">%</span>
        </div>
      </div>

      {/* Delta */}
      {delta !== null && (
        <div className={cn(
          'inline-flex items-center gap-1 text-sm font-medium',
          delta > 0 ? 'text-success' : delta < 0 ? 'text-error' : 'text-text-muted'
        )}>
          {delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> :
           delta < 0 ? <TrendingDown className="h-3.5 w-3.5" /> :
           <Minus className="h-3.5 w-3.5" />}
          <span>{delta > 0 ? '+' : ''}{delta} from last</span>
        </div>
      )}

      <span className="text-xs text-text-muted">Target: {targetScore}%</span>
    </div>
  );
}

function scoreColor(score: number, target: number): string {
  if (score >= target) return 'var(--color-success)';
  if (score >= target * 0.85) return 'var(--color-warning)';
  return 'var(--color-error)';
}
