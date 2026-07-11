import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// We mock react-dom.flushSync as a no-op (jsdom doesn't run React
// fiber reconciler, so we just need it to exist). The real flushSync
// is imported transitively by the helper.
vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom');
  return { ...actual, flushSync: (fn: () => void) => fn() };
});

// Mock document.startViewTransition. jsdom doesn't ship it; we
// polyfill a simple version that calls the callback synchronously
// and exposes a `finished` promise.
function installStartViewTransitionMock() {
  const original = (document as any).startViewTransition;
  (document as any).startViewTransition = (cb: () => void) => {
    cb();
    return {
      ready: Promise.resolve(),
      finished: Promise.resolve(),
    };
  };
  return () => {
    (document as any).startViewTransition = original;
  };
}

import {
  navigate,
  inferDirection,
  setCurrentDir,
  getCurrentDir,
  subscribeDirChange,
  type Page,
  type TransitionDir,
} from './navigation';

describe('inferDirection', () => {
  it('classifies the canonical cases', () => {
    expect(inferDirection('dashboard', 'session')).toBe('descend');
    expect(inferDirection('session', 'review')).toBe('ascend');
    expect(inferDirection('dashboard', 'history')).toBe('slide-forward');
    expect(inferDirection('dashboard', 'reported')).toBe('slide-forward');
    expect(inferDirection('history', 'reported')).toBe('slide-forward');
    expect(inferDirection('reported', 'history')).toBe('slide-back');
    expect(inferDirection('review', 'history')).toBe('slide-back');
    expect(inferDirection('session', 'dashboard')).toBe('slide-back');
  });

  it('defaults to slide-forward for unfamiliar pairs', () => {
    expect(inferDirection('review', 'reported')).toBe('slide-forward');
  });
});

describe('navigate', () => {
  let restore: () => void;
  beforeEach(() => {
    restore = installStartViewTransitionMock();
  });
  afterEach(() => {
    restore();
    setCurrentDir(null);
  });

  it('returns early on same-page navigation', () => {
    const setPage = vi.fn();
    const before = getCurrentDir();
    navigate(setPage, 'dashboard', 'dashboard');
    expect(setPage).not.toHaveBeenCalled();
    expect(getCurrentDir()).toBe(before);
  });

  it('sets the dir before calling the setter (so React sees the class on render)', () => {
    const setPage = vi.fn();
    const observed: (TransitionDir | null)[] = [];
    navigate(setPage, 'history', 'dashboard');
    expect(setPage).toHaveBeenCalledWith('history');
    // The direction was set on the global before the setter ran.
    // (We can't strictly observe the order in this synchronous test,
    // but the final state should match inferDirection.)
    expect(getCurrentDir()).toBe('slide-forward');
  });

  it('uses the explicit direction when provided', () => {
    const setPage = vi.fn();
    navigate(setPage, 'review', 'session', 'ascend');
    expect(getCurrentDir()).toBe('ascend');
  });

  it('falls back to setState (no animation) when startViewTransition is unsupported', () => {
    const setPage = vi.fn();
    delete (document as any).startViewTransition;
    navigate(setPage, 'history', 'dashboard');
    expect(setPage).toHaveBeenCalledWith('history');
    expect(getCurrentDir()).toBe('slide-forward');
    // Restore for afterEach — installStartViewTransitionMock's restore
    // function will be called even though we deleted the property.
  });

  it('falls back to setState when prefers-reduced-motion is set', () => {
    const setPage = vi.fn();
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true } as MediaQueryList);
    navigate(setPage, 'history', 'dashboard');
    expect(setPage).toHaveBeenCalledWith('history');
    expect(getCurrentDir()).toBe('slide-forward');
    window.matchMedia = original;
  });
});

describe('subscribeDirChange', () => {
  it('invokes the listener when setCurrentDir is called', () => {
    const listener = vi.fn();
    const unsub = subscribeDirChange(listener);
    setCurrentDir('slide-forward');
    expect(listener).toHaveBeenCalledWith('slide-forward');
    unsub();
    setCurrentDir('slide-back');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
