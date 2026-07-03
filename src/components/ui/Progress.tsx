import { cn } from '../../lib/cn';
import { type HTMLAttributes, forwardRef } from 'react';

export const Progress = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { value: number; max?: number; variant?: 'default' | 'success' | 'warning' | 'accent' }>(
  ({ className, value, max = 100, variant = 'default', ...props }, ref) => {
    const percent = Math.min(100, Math.max(0, (value / max) * 100));
    const bgColor = variant === 'success' ? 'bg-[var(--success)]' :
      variant === 'warning' ? 'bg-[var(--warning)]' :
      variant === 'accent' ? 'bg-[var(--accent)]' :
      'bg-[var(--primary)]';

    return (
      <div
        ref={ref}
        className={cn('relative h-2.5 w-full overflow-hidden rounded-full bg-[var(--muted)]', className)}
        {...props}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', bgColor)}
          style={{ width: `${percent}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = 'Progress';
