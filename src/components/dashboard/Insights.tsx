import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface InsightsProps {
  insight: string;
  isReady: boolean;
  score: number;
  target: number;
}

export function Insights({ insight, isReady, score, target }: InsightsProps) {
  const icon = isReady ? (
    <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--color-success)' }} />
  ) : score < target - 15 ? (
    <AlertTriangle className="h-5 w-5" style={{ color: 'var(--color-warning)' }} />
  ) : (
    <Info className="h-5 w-5" style={{ color: 'var(--color-info)' }} />
  );

  return (
    <div
      className="flex items-start gap-3 rounded-2xl border p-5"
      style={{
        background: isReady ? 'var(--color-success-light)' : 'var(--surface)',
        borderColor: isReady ? 'var(--color-success)' : 'var(--border)',
        borderWidth: isReady ? '1.5px' : '1px',
      }}
    >
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Am I Ready?
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
          {insight}
        </p>
      </div>
    </div>
  );
}
