import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Target, Clock } from 'lucide-react';

interface ReadinessScoreProps {
  score: number;
  target: number;
  projectedScore: number;
  daysToExam: number | null;
  isReady: boolean;
  trend: 'improving' | 'declining' | 'stable';
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = display;
    const end = value;
    const duration = 800;
    const startTime = Date.now();

    function tick() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round((start + (end - start) * eased) * 10) / 10);
      if (progress < 1) {
        ref.current = requestAnimationFrame(tick);
      }
    }

    ref.current = requestAnimationFrame(tick);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [value]);

  return <>{display.toFixed(1)}</>;
}

export function ReadinessScore({ score, target, projectedScore, daysToExam, isReady, trend }: ReadinessScoreProps) {
  const circumference = 2 * Math.PI * 56;
  const offset = circumference - (score / 100) * circumference;
  const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;

  return (
    <div
      className="flex flex-col items-center gap-4 rounded-2xl border p-6 text-center"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Readiness Score
      </p>

      {/* Circular gauge */}
      <div className="relative h-32 w-32">
        <svg className="h-32 w-32 -rotate-90" viewBox="0 0 128 128">
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            stroke="var(--border)"
            strokeWidth="8"
          />
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            stroke={isReady ? 'var(--color-success)' : 'var(--accent)'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular-nums text-3xl font-bold" style={{ color: 'var(--text)' }}>
            <AnimatedNumber value={score} />%
          </span>
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
            EMA
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <TrendIcon
          className="h-4 w-4"
          style={{ color: trend === 'improving' ? 'var(--color-success)' : trend === 'declining' ? 'var(--color-danger)' : 'var(--text-muted)' }}
        />
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {trend === 'improving' ? 'Improving' : trend === 'declining' ? 'Declining' : 'Stable'}
        </span>
      </div>

      {/* Meta */}
      <div className="flex w-full items-center justify-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1">
          <Target className="h-3 w-3" />
          Target: {target}%
        </span>
        {daysToExam !== null && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {daysToExam}d to exam
          </span>
        )}
      </div>

      {/* Projected */}
      <div
        className="w-full rounded-lg px-3 py-2 text-xs"
        style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)' }}
      >
        <span className="font-medium">Projected:</span> {projectedScore}% based on recent sessions
      </div>
    </div>
  );
}
