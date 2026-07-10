/**
 * Theme toggle with circular reveal animation.
 *
 * OLD theme shrinks inward to the click point, revealing new theme.
 * Uses clip-path animation on a positioned overlay.
 *
 * Falls back to instant swap when prefers-reduced-motion is set.
 */
export function performCircularReveal(
  event: React.MouseEvent<HTMLElement>,
  callback: () => void
): void {
  const button = event.currentTarget;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    callback();
    return;
  }

  const rect = button.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxRadius = Math.hypot(
    Math.max(cx, vw - cx),
    Math.max(cy, vh - cy)
  );

  // Snapshot old background
  const oldBg = getComputedStyle(document.body).backgroundColor;

  // Switch theme — new content renders behind overlay
  callback();

  // Overlay with old background covers everything
  const overlay = document.createElement('div');
  overlay.setAttribute('data-curtain', '');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '99999',
    pointerEvents: 'none',
    background: oldBg,
    clipPath: `circle(${maxRadius * 1.1}px at ${cx}px ${cy}px)`,
  });
  document.body.appendChild(overlay);

  // Trigger reflow
  overlay.getBoundingClientRect();

  // Shrink overlay to click point — old theme recedes
  const anim = overlay.animate(
    [
      { clipPath: `circle(${maxRadius * 1.1}px at ${cx}px ${cy}px)` },
      { clipPath: `circle(0px at ${cx}px ${cy}px)` },
    ],
    {
      duration: 500,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards',
    }
  );

  anim.onfinish = () => overlay.remove();
}
