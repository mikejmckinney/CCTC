import { flushSync } from 'react-dom';

export type Page = 'dashboard' | 'history' | 'reported' | 'session' | 'review';

/**
 * Direction of a view transition. Each value maps to a CSS class on
 * the <main> wrapper that selects the right keyframes via the
 * ::view-transition-old/new pseudo-element selectors.
 *
 * - slide-forward: lateral "going to a new place" (dashboard → history)
 * - slide-back:    lateral "returning to a previous place" (review → history)
 * - descend:       "going deeper" (dashboard → session, the work begins)
 * - ascend:        "coming up to look at results" (session → review)
 */
export type TransitionDir = 'slide-forward' | 'slide-back' | 'descend' | 'ascend';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Infer the direction for a (from, to) page transition. The
 * hierarchical cases use depth (descend/ascend); the rest are
 * lateral (slide-forward/slide-back). Exposed so callers can use
 * the same logic if they want to.
 */
export function inferDirection(from: Page, to: Page): TransitionDir {
  if (from === to) return 'slide-forward'; // unused; same-page no-ops below
  if (from === 'dashboard' && to === 'session') return 'descend';
  if (from === 'session' && to === 'review') return 'ascend';
  if (from === 'dashboard' && (to === 'history' || to === 'reported')) return 'slide-forward';
  if (from === 'history' && to === 'reported') return 'slide-forward';
  if (from === 'reported' && to === 'history') return 'slide-back';
  if (from === 'review' && to === 'history') return 'slide-back';
  if (from === 'session' && to === 'dashboard') return 'slide-back';
  if (to === 'dashboard' || to === 'history') return 'slide-back';
  return 'slide-forward';
}

/**
 * Imperative handle to the latest view transition. Stored on
 * window so any module can read it without prop-drilling.
 */
let activeTransition: { finished: Promise<void>; ready: Promise<void> } | null = null;
let currentDir: TransitionDir | null = null;
let dirListener: ((dir: TransitionDir | null) => void) | null = null;

export function setCurrentDir(dir: TransitionDir | null): void {
  currentDir = dir;
  if (dirListener) dirListener(dir);
}

export function getCurrentDir(): TransitionDir | null {
  return currentDir;
}

export function getActiveTransition(): { finished: Promise<void>; ready: Promise<void> } | null {
  return activeTransition;
}

/**
 * Subscribe to direction changes. The navigate() helper calls this
 * whenever it sets a new direction so React can pick up the class
 * change for the <main> wrapper. Returns an unsubscribe function.
 */
export function subscribeDirChange(listener: (dir: TransitionDir | null) => void): () => void {
  dirListener = listener;
  return () => {
    if (dirListener === listener) dirListener = null;
  };
}

/**
 * Navigate to a new page with a view transition.
 *
 * - If the browser doesn't support View Transitions, or the user
 *   prefers reduced motion, falls back to a plain setState.
 * - Otherwise, calls document.startViewTransition with a callback
 *   that flushes the state commit synchronously so the browser's
 *   "new" snapshot is taken at the right moment.
 * - The direction is set on a global before the transition so the
 *   <main> element can apply the matching CSS class.
 *
 * @param setPage the React state setter from useState
 * @param to the target page
 * @param dir optional explicit direction. If omitted, inferDirection
 *           uses the current page to choose.
 * @param from optional explicit current page (used when dir is
 *           inferred but the caller has stale state in scope).
 */
export function navigate(
  setPage: (p: Page) => void,
  to: Page,
  from?: Page,
  dir?: TransitionDir
): void {
  if (from === to) return;
  const transitionDir = dir ?? (from ? inferDirection(from, to) : 'slide-forward');

  // Reduced motion or no support — plain setState, no animation.
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia(REDUCED_MOTION).matches;
  const supported =
    typeof document !== 'undefined' && 'startViewTransition' in document;

  setCurrentDir(transitionDir);

  if (prefersReduced || !supported) {
    setPage(to);
    // Clear the dir after a tick so the next animation can set it.
    queueMicrotask(() => setCurrentDir(null));
    return;
  }

  const vt = document.startViewTransition(() => {
    // flushSync forces React to commit the state update before the
    // browser takes the "new" snapshot. Without this, the snapshot
    // is taken before React has rendered, and the animation is wrong.
    flushSync(() => {
      setPage(to);
    });
  });

  activeTransition = vt;

  vt.ready
    .then(() => {
      // Wait for the animation to finish (or be skipped) before
      // clearing the dir class. The browser's `finished` promise
      // resolves after either completion or interruption.
      return vt.finished.catch(() => {
        // Animations can be cancelled (e.g., user navigates again).
        // That's fine; the next navigation will set its own dir.
      });
    })
    .finally(() => {
      if (activeTransition === vt) {
        activeTransition = null;
        setCurrentDir(null);
      }
    });
}
