import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { DomainReadiness } from '../../lib/readiness';

interface CategoryBreakdownProps {
  domains: DomainReadiness[];
  targetThreshold: number;
}

export function CategoryBreakdown({ domains, targetThreshold }: CategoryBreakdownProps) {
  if (domains.length === 0) {
    return (
      <div
        className="flex flex-col gap-3 rounded-2xl border p-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Category Breakdown
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Complete a session to see your domain breakdown.
        </p>
      </div>
    );
  }

  const chartColors = [
    'var(--color-chart-1)',
    'var(--color-chart-2)',
    'var(--color-chart-3)',
    'var(--color-chart-4)',
    'var(--color-chart-5)',
    'var(--color-chart-6)',
  ];

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border p-5"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Category Breakdown
      </p>

      {domains.map((domain, i) => {
        const TrendIcon = domain.trend === 'improving' ? TrendingUp : domain.trend === 'declining' ? TrendingDown : Minus;
        const color = chartColors[i % chartColors.length];
        const isBelow = domain.emaScore < targetThreshold;

        return (
          <div key={domain.categoryId} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {domain.categoryLabel}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {domain.examWeight}% of exam
                </span>
                <TrendIcon
                  className="h-3 w-3"
                  style={{
                    color: domain.trend === 'improving'
                      ? 'var(--color-success)'
                      : domain.trend === 'declining'
                        ? 'var(--color-danger)'
                        : 'var(--text-muted)',
                  }}
                />
                <span
                  className="tabular-nums text-sm font-semibold"
                  style={{ color: isBelow ? 'var(--color-warning)' : 'var(--color-success)' }}
                >
                  {domain.emaScore}%
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div
              className="h-2 w-full overflow-hidden rounded-full"
              style={{ background: 'var(--surface-raised)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(100, domain.emaScore)}%`,
                  background: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
