/**
 * Theme toggle with View Transitions API circular wipe.
 *
 * Uses `document.startViewTransition()` where supported — the browser
 * snapshots old and new renders. Only the NEW snapshot animates
 * (expanding circle from click point). The OLD snapshot stays fully
 * rendered underneath and is naturally covered as the circle grows.
 * This is the Radix-UI-style magic curtain: both themes are visible
 * live along the wipe edge, no blocking overlay, no fade.
 *
 * Falls back to instant swap where View Transitions is unsupported
 * or when the user prefers reduced motion.
 */
export function performCircularReveal(
  event: React.MouseEvent<HTMLElement>,
  callback: () => void
): void {
  const button = event.currentTarget;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!('startViewTransition' in document) || prefersReducedMotion) {
    callback();
    return;
  }

  const rect = button.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const endRadius = Math.hypot(
    Math.max(cx, vw - cx),
    Math.max(cy, vh - cy)
  );

  const vt = document.startViewTransition(() => {
    callback();
  });

  vt.ready
    .then(() => {
      const duration = 500;
      const easing = 'cubic-bezier(0.4, 0, 0.2, 1)';

      // Only animate the NEW snapshot expanding from click point.
      // The OLD snapshot stays at full size underneath — no animation needed.
      document.documentElement.animate(
        [
          { clipPath: `circle(0px at ${cx}px ${cy}px)` },
          { clipPath: `circle(${endRadius * 1.1}px at ${cx}px ${cy}px)` },
        ],
        {
          duration,
          easing,
          pseudoElement: '::view-transition-new(root)',
        }
      );
    })
    .catch((e: unknown) => {
      // vt.ready can reject if the browser aborts the transition (e.g.,
      // a new transition supersedes this one, or the user navigates
      // away). The new theme has already been applied by `callback()`
      // so the swap is not lost. Log for diagnostics — the old
      // behavior of an unhandled rejection here would surface as a
      // noisy devtools warning.
      // eslint-disable-next-line no-console
      console.warn('Theme view transition aborted:', e);
    });
}
