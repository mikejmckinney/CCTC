import { cn } from '../../lib/cn';
import { type HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-[var(--primary)]/10 text-[var(--primary)]',
        secondary: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
        success: 'bg-[var(--success)]/10 text-[var(--success)]',
        warning: 'bg-[var(--warning)]/10 text-[var(--warning)]',
        destructive: 'bg-[var(--destructive)]/10 text-[var(--destructive)]',
        accent: 'bg-[var(--accent)]/10 text-[var(--accent)]',
        outline: 'border border-[var(--border)] text-[var(--foreground)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  )
);
Badge.displayName = 'Badge';
