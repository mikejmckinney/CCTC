import { type ReactNode } from 'react';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

type View = 'dashboard' | 'setup' | 'history' | 'reported-items' | 'session' | 'session-review';

interface AppShellProps {
  children: ReactNode;
  active: View;
  onNavigate: (view: View) => void;
  hasActiveSession: boolean;
}

export function AppShell({ children, active, onNavigate, hasActiveSession }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--bg)' }}>
      <Header active={active} onNavigate={onNavigate} hasActiveSession={hasActiveSession} />
      <main className="flex-1 pb-20 md:pb-8">
        <div className="mx-auto max-w-[940px] px-4 py-6 md:px-6">
          {children}
        </div>
      </main>
      <MobileNav active={active} onNavigate={onNavigate} hasActiveSession={hasActiveSession} />
    </div>
  );
}
