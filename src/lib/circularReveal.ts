/**
 * Circular reveal animation for theme switching.
 * Inspired by Radix UI's "magic curtain" effect.
 *
 * NEW theme expands FROM the click point outward,
 * replacing the old theme as the circle grows.
 */
export function performCircularReveal(
  event: React.MouseEvent<HTMLElement>,
  callback: () => void
): void {
  const button = event.currentTarget;
  const rect = button.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxRadius = Math.hypot(
    Math.max(cx, vw - cx),
    Math.max(cy, vh - cy)
  );

  // Sample new background by toggling twice without committing
  callback();
  const newBg = getComputedStyle(document.body).backgroundColor;
  callback(); // revert

  // Create overlay with NEW background, starting as tiny circle at click point
  const overlay = document.createElement('div');
  overlay.setAttribute('data-curtain', '');
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 99999;
    pointer-events: none;
    background: ${newBg};
    clip-path: circle(0px at ${cx}px ${cy}px);
  `;
  document.body.appendChild(overlay);
  overlay.getBoundingClientRect();

  // Animate circle expanding from click point to cover viewport
  const duration = 500;
  const animation = overlay.animate(
    [
      { clipPath: `circle(0px at ${cx}px ${cy}px)` },
      { clipPath: `circle(${maxRadius * 1.1}px at ${cx}px ${cy}px)` },
    ],
    {
      duration,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards',
    }
  );

  // Switch theme once overlay covers viewport
  animation.onfinish = () => {
    callback();
    overlay.remove();
  };
}
