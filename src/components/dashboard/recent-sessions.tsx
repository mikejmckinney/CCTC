import { Clock, ChevronRight, History } from 'lucide-react';
import type { HistoryEntry } from '../../types/exam';

interface RecentSessionsProps {
  history: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onViewAll: () => void;
}

export function RecentSessions({ history, onSelect, onViewAll }: RecentSessionsProps) {
  const recent = history.slice(0, 5);

  if (recent.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Recent Sessions
        </h2>
        <p className="text-sm text-text-muted">No sessions yet. Start your first practice exam!</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Recent Sessions
        </h2>
        <button
          onClick={onViewAll}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <History className="h-3 w-3" />
          View all
        </button>
      </div>
      <div className="divide-y divide-border">
        {recent.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelect(entry)}
            className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-surface-muted"
          >
            {/* Date */}
            <div className="w-16 flex-shrink-0">
              <span className="text-xs text-text-secondary">
                {formatShortDate(entry.completedAt)}
              </span>
            </div>

            {/* Mode badge */}
            <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
              entry.settings.mode === 'exam'
                ? 'bg-primary/10 text-primary'
                : 'bg-accent/10 text-accent'
            }`}>
              {entry.settings.mode === 'exam' ? 'Exam' : 'Study'}
            </span>

            {/* Question count */}
            <span className="w-8 text-xs text-text-muted">
              {entry.result.total}q
            </span>

            {/* Score */}
            <span className={`ml-auto font-mono text-sm font-semibold ${
              entry.result.percent >= entry.settings.targetThreshold
                ? 'text-success'
                : entry.result.percent >= entry.settings.targetThreshold * 0.85
                  ? 'text-warning'
                  : 'text-error'
            }`}>
              {entry.result.percent}%
            </span>

            {/* Duration */}
            <div className="flex w-14 items-center gap-1 text-xs text-text-muted">
              <Clock className="h-3 w-3" />
              {formatShortDuration(entry.timeUsedSeconds)}
            </div>

            <ChevronRight className="h-4 w-4 flex-shrink-0 text-text-muted" />
          </button>
        ))}
      </div>
    </div>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleString(undefined, { month: 'short' });
  const day = d.getDate();
  return `${month} ${day}`;
}

function formatShortDuration(seconds: number | null): string {
  if (seconds === null) return '--';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h${rem > 0 ? ` ${rem}m` : ''}`;
}
