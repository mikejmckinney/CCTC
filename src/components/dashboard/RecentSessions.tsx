import { Clock, BarChart3, ChevronRight } from 'lucide-react';
import type { HistoryEntry } from '../../types/exam';

interface RecentSessionsProps {
  sessions: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onViewAll: () => void;
}

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) return 'Untimed';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RecentSessions({ sessions, onSelect, onViewAll }: RecentSessionsProps) {
  const recent = sessions.slice(0, 5);

  if (recent.length === 0) {
    return (
      <div
        className="flex flex-col gap-3 rounded-2xl border p-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Recent Sessions
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No sessions yet. Start your first practice!
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-5"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Recent Sessions
        </p>
        <button
          type="button"
          onClick={onViewAll}
          className="flex items-center gap-0.5 text-xs font-medium transition-colors hover:underline"
          style={{ color: 'var(--primary)' }}
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {recent.map((entry) => {
          const isPass = entry.result?.estimatedPass;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onSelect(entry)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-raised)]"
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold tabular-nums"
                style={{
                  background: isPass ? 'var(--color-success-light)' : 'var(--color-warning-light)',
                  color: isPass ? 'var(--color-success)' : 'var(--color-warning)',
                }}
              >
                {entry.result?.percent ?? 0}%
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {entry.settings.mode === 'exam' ? 'Exam' : 'Study'} · {entry.settings.questionCount} Qs
                </span>
                <span className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  <span>{formatDate(entry.completedAt)}</span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {formatDuration(entry.timeUsedSeconds)}
                  </span>
                </span>
              </div>

              <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
