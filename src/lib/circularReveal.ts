/**
 * Theme toggle with View Transitions API circular wipe.
 *
 * Uses `document.startViewTransition()` where supported — the browser
 * snapshots old and new renders and clips between them, so both themes
 * are visible live along the wipe edge (no blocking overlay, no fade).
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

  // Fallback: instant swap
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

  const vt = (document as any).startViewTransition(() => {
    callback();
  });

  // Animate the transition pseudo-elements with a circular clip-path
  vt.ready.then(() => {
    const duration = 500;
    const easing = 'cubic-bezier(0.4, 0, 0.2, 1)';

    // ::view-transition-old(root) fades out
    document.documentElement.animate(
      [
        { clipPath: `circle(${endRadius * 1.1}px at ${cx}px ${cy}px)` },
        { clipPath: `circle(0px at ${cx}px ${cy}px)` },
      ],
      {
        duration,
        easing,
        pseudoElement: '::view-transition-old(root)',
      }
    );

    // ::view-transition-new(root) reveals in
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
  });
}
