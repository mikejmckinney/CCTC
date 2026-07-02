import type { DomainPerformance } from '../../types/dashboard';

interface CategoryBreakdownProps {
  domains: DomainPerformance[];
}

export function CategoryBreakdown({ domains }: CategoryBreakdownProps) {
  if (domains.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Category Breakdown
        </h2>
        <p className="text-sm text-text-muted">Complete a session to see your breakdown.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Category Breakdown
      </h2>
      <div className="space-y-3">
        {domains.map((domain) => (
          <div key={domain.domainId} className="flex items-center gap-3">
            <div className="w-28 flex-shrink-0 text-right text-xs text-text-secondary truncate" title={domain.domainLabel}>
              {domain.domainLabel}
            </div>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(domain.emaScore, 100)}%`,
                  backgroundColor: domain.isWeak
                    ? 'var(--color-error)'
                    : domain.emaScore >= 75
                      ? 'var(--color-success)'
                      : 'var(--color-warning)'
                }}
              />
            </div>
            <div className="w-10 text-right">
              <span className="font-mono text-xs font-medium text-text">{domain.emaScore}%</span>
            </div>
            <div className="w-10 text-right">
              <span className="text-[10px] text-text-muted">{domain.domainWeightPct}%</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-text-muted">% = exam weight per domain</p>
    </div>
  );
}
