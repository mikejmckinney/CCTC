import { cn } from '../../lib/utils';
import { BookOpen, ArrowRight } from 'lucide-react';
import type { StudyPlan } from '../../types/dashboard';

interface StudyPlanCardProps {
  plan: StudyPlan;
  onStudyDomain: (domainId: string) => void;
}

export function StudyPlanCard({ plan, onStudyDomain }: StudyPlanCardProps) {
  if (plan.items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Study Plan
        </h2>
        <p className="text-sm text-text-muted">Complete sessions to get personalized recommendations.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Study Plan
      </h2>

      {/* Recommended action */}
      <div className="mb-4 rounded-md bg-primary/5 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <BookOpen className="h-4 w-4" />
          <span>{plan.recommendedNextAction}</span>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-0 divide-y divide-border">
        {plan.items.map((item, i) => (
          <button
            key={i}
            onClick={() => onStudyDomain(item.domainId)}
            className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-surface-muted -mx-2 px-2 rounded"
          >
            <div className={cn(
              'h-2 w-2 flex-shrink-0 rounded-full',
              item.priority === 'high' ? 'bg-error' : item.priority === 'medium' ? 'bg-warning' : 'bg-success'
            )} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text truncate">{item.topic}</div>
              <div className="text-xs text-text-muted">{item.reason}</div>
            </div>
            <span className="flex-shrink-0 text-xs text-text-muted">~{item.estimatedMinutes}m</span>
            <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-text-muted" />
          </button>
        ))}
      </div>
    </div>
  );
}
