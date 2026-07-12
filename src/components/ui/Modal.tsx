import { cn } from '../../lib/cn';
import { type ReactNode, useEffect, useRef, useState, useCallback, useId } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  dismissible?: boolean;
}

// Match the exit duration in index.css. If you change the CSS, change
// this too. (The skill's animation-timing table lists 100-200ms for
// direct toggles; 120ms is in range.)
const EXIT_DURATION_MS = 120;

export function Modal({ open, onClose, title, eyebrow, description, children, className, dismissible = true }: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  // Render + animation state. The modal stays mounted for the exit
  // animation duration after `open` flips false so the CSS animation
  // can play out before unmount.
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      // Open path: clear any pending exit and ensure we're rendered
      // with the enter class.
      if (exitTimerRef.current !== null) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setClosing(false);
      setRendered(true);
    } else if (rendered) {
      // Close path: apply the exit class, then unmount after the
      // animation. If `open` flips back to true before the timer
      // fires, the open path above cancels the timer.
      setClosing(true);
      exitTimerRef.current = setTimeout(() => {
        setRendered(false);
        setClosing(false);
        exitTimerRef.current = null;
      }, EXIT_DURATION_MS);
    }
    return () => {
      if (exitTimerRef.current !== null) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [open, rendered]);

  // Save previously focused element on open, restore on close
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus the first focusable element inside the modal
      requestAnimationFrame(() => {
        const focusable = contentRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
      });
    } else {
      previousFocusRef.current?.focus();
    }
  }, [open]);

  // Focus trap
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && dismissible) {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key !== 'Tab' || !contentRef.current) return;

    const focusable = contentRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [dismissible, onClose]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  if (!rendered) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
    >
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={contentRef}
        className={cn(
          'relative z-50 w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl',
          closing ? 'vt-modal-exit' : 'vt-modal-enter',
          className
        )}
      >
        {dismissible && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {eyebrow && <p className="eyebrow mb-2 text-[var(--accent)]">{eyebrow}</p>}
        {title && <h2 id={titleId} className="text-2xl font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>{title}</h2>}
        {description && <p id={descId} className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>}
        <div className={cn('mt-4', title || description ? '' : 'mt-0')}>
          {children}
        </div>
      </div>
    </div>
  );
}
