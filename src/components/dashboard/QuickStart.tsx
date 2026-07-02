import { Play, RotateCcw, Zap, BookOpen } from 'lucide-react';

interface QuickStartProps {
  onResume: () => void;
  onStartFull: () => void;
  onStartQuick: () => void;
  onStartWeak: () => void;
  hasActiveSession: boolean;
}

export function QuickStart({ onResume, onStartFull, onStartQuick, onStartWeak, hasActiveSession }: QuickStartProps) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-5"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Quick Start
      </p>

      {hasActiveSession && (
        <button
          type="button"
          onClick={onResume}
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all hover:brightness-110"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          <RotateCcw className="h-4 w-4" />
          Resume Last Session
        </button>
      )}

      <button
        type="button"
        onClick={onStartFull}
        className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all hover:brightness-110"
        style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
      >
        <Play className="h-4 w-4" />
        Full Exam
      </button>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onStartQuick}
          className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors hover:bg-[var(--surface-raised)]"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          <Zap className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
          Quick 25
        </button>
        <button
          type="button"
          onClick={onStartWeak}
          className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors hover:bg-[var(--surface-raised)]"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          <BookOpen className="h-3.5 w-3.5" style={{ color: 'var(--color-success)' }} />
          Weak Areas
        </button>
      </div>
    </div>
  );
}
