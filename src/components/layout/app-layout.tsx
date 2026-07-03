import { Home, Settings, BarChart3, Play } from 'lucide-react';
import { ThemeToggle } from '../ui/theme-toggle';
import { cn } from '../../lib/utils';
import type { ReactNode } from 'react';
import type { View } from '../../types/dashboard';

interface AppLayoutProps {
  children: ReactNode;
  currentView: View;
  onNavigate: (view: View) => void;
  hasActiveSession: boolean;
}

export function AppLayout({ children, currentView, onNavigate, hasActiveSession }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Skip link */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-lg font-bold text-primary hover:no-underline"
          >
            CCTC
          </button>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main navigation">
            <NavButton
              icon={<Home className="h-4 w-4" />}
              label="Dashboard"
              active={currentView === 'dashboard'}
              onClick={() => onNavigate('dashboard')}
            />
            <NavButton
              icon={<Settings className="h-4 w-4" />}
              label="Setup"
              active={currentView === 'setup'}
              onClick={() => onNavigate('setup')}
            />
            <NavButton
              icon={<BarChart3 className="h-4 w-4" />}
              label="History"
              active={currentView === 'history' || currentView === 'history-detail' || currentView === 'reported'}
              onClick={() => onNavigate('history')}
            />
            {hasActiveSession && (
              <NavButton
                icon={<Play className="h-4 w-4" />}
                label="Resume"
                active={currentView === 'session'}
                onClick={() => onNavigate('session')}
              />
            )}
          </nav>

          {/* Right side: theme toggle + mobile nav */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {/* Mobile nav */}
            <nav className="flex items-center gap-0.5 sm:hidden" aria-label="Mobile navigation">
              <MobileNavButton
                icon={<Home className="h-5 w-5" />}
                label="Home"
                active={currentView === 'dashboard'}
                onClick={() => onNavigate('dashboard')}
              />
              <MobileNavButton
                icon={<Settings className="h-5 w-5" />}
                label="Setup"
                active={currentView === 'setup'}
                onClick={() => onNavigate('setup')}
              />
              <MobileNavButton
                icon={<BarChart3 className="h-5 w-5" />}
                label="History"
                active={currentView === 'history' || currentView === 'history-detail' || currentView === 'reported'}
                onClick={() => onNavigate('history')}
              />
              {hasActiveSession && (
                <MobileNavButton
                  icon={<Play className="h-5 w-5" />}
                  label="Resume"
                  active={currentView === 'session'}
                  onClick={() => onNavigate('session')}
                />
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: {
  icon: ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-text-secondary hover:bg-surface-muted hover:text-text'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function MobileNavButton({ icon, label, active, onClick }: {
  icon: ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-0.5 rounded-md px-2.5 py-1.5 text-[10px] font-medium transition-colors',
        'min-h-[44px] min-w-[44px] justify-center', // 44px touch target
        active ? 'text-primary' : 'text-text-muted'
      )}
      aria-label={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
