import { cn } from '../../lib/utils';
import { AlertTriangle, CheckCircle, Info, Lightbulb } from 'lucide-react';
import type { AmIReady } from '../../types/dashboard';

interface AmIReadyCardProps {
  ready: AmIReady;
  examCountdown: number | null;
}

export function AmIReadyCard({ ready, examCountdown }: AmIReadyCardProps) {
  const levelColors = {
    'not-ready': 'border-error/30 bg-error/5',
    'getting-there': 'border-warning/30 bg-warning/5',
    'almost-there': 'border-primary/30 bg-primary/5',
    'ready': 'border-success/30 bg-success/5'
  };

  const levelTextColors = {
    'not-ready': 'text-error',
    'getting-there': 'text-warning',
    'almost-there': 'text-primary',
    'ready': 'text-success'
  };

  return (
    <div className={cn(
      'rounded-lg border p-5',
      levelColors[ready.level]
    )}>
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className={cn('h-4 w-4', levelTextColors[ready.level])} />
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Am I Ready?
          </span>
        </div>
        <span className={cn('text-sm font-bold', levelTextColors[ready.level])}>
          {ready.label}
        </span>
      </div>

      {/* Summary */}
      <p className="mb-3 text-sm text-text-secondary">{ready.summary}</p>

      {/* Exam countdown */}
      {examCountdown !== null && examCountdown > 0 && (
        <div className="mb-3 rounded-md bg-surface-muted px-3 py-2 text-center text-sm">
          <span className="font-mono font-bold text-text">{examCountdown}</span>
          <span className="text-text-secondary"> days until exam</span>
        </div>
      )}

      {/* Insights */}
      <div className="space-y-2">
        {ready.insights.slice(0, 4).map((insight, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            {insight.type === 'positive' && <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-success" />}
            {insight.type === 'warning' && <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-warning" />}
            {insight.type === 'info' && <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-text-muted" />}
            <span className="text-text-secondary">{insight.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
