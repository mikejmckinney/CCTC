import { Calendar, Target, Zap, BookOpen } from 'lucide-react';
import type { StudyPlanItem } from '../../lib/readiness';

interface StudyPlanProps {
  items: StudyPlanItem[];
}

const PRIORITY_CONFIG = {
  high: { icon: Zap, color: 'var(--color-danger)', bg: 'var(--color-danger-light)' },
  medium: { icon: Target, color: 'var(--color-warning)', bg: 'var(--color-warning-light)' },
  low: { icon: BookOpen, color: 'var(--color-info)', bg: 'var(--color-info-light)' },
} as const;

export function StudyPlan({ items }: StudyPlanProps) {
  if (items.length === 0) {
    return (
      <div
        className="flex flex-col gap-3 rounded-2xl border p-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Study Plan
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Take a session to get personalized study recommendations.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-5"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Recommended Next Steps
      </p>

      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const config = PRIORITY_CONFIG[item.priority];
          const Icon = config.icon;
          return (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-xl p-3"
              style={{ background: config.bg }}
            >
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                style={{ background: 'var(--surface)', color: config.color }}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {item.title}
                </span>
                <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
