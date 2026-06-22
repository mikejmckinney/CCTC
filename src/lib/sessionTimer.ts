import type { ActiveSession } from '../types/exam';

export type SessionTimerView = 'dashboard' | 'setup' | 'session' | 'results' | 'review' | 'history';

/** Countdown runs only while the user is actively in the session view (prototype parity). */
export function shouldRunSessionTimer(
  view: SessionTimerView,
  session: Pick<ActiveSession, 'submittedAt' | 'remainingSeconds' | 'settings'> | null
): boolean {
  if (view !== 'session' || !session || session.submittedAt || !session.settings.timed) {
    return false;
  }
  return session.remainingSeconds !== null && session.remainingSeconds > 0;
}
