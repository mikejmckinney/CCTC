/**
 * Circular reveal animation for theme switching.
 * Inspired by Radix UI's "magic curtain" effect.
 *
 * Captures the current background color, creates an overlay with it,
 * switches the theme underneath, then animates the overlay shrinking
 * to a point — revealing the new theme from the click origin outward.
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

  // Capture computed background BEFORE theme switch
  const oldBg = getComputedStyle(document.body).backgroundColor;

  // Create overlay covering everything with old background
  const overlay = document.createElement('div');
  overlay.setAttribute('data-curtain', '');
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 99999;
    pointer-events: none;
    background: ${oldBg};
    clip-path: circle(${maxRadius * 1.1}px at ${cx}px ${cy}px);
  `;
  document.body.appendChild(overlay);

  // Trigger reflow
  overlay.getBoundingClientRect();

  // Switch theme (new content renders behind overlay)
  callback();

  // Animate overlay shrinking to click point (reveals new theme)
  const duration = 500;
  overlay.animate(
    [
      { clipPath: `circle(${maxRadius * 1.1}px at ${cx}px ${cy}px)` },
      { clipPath: `circle(0px at ${cx}px ${cy}px)` },
    ],
    {
      duration,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards',
    }
  );

  setTimeout(() => {
    overlay.remove();
  }, duration + 50);
}
