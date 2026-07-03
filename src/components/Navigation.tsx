import { cn } from '../lib/cn';

import { useTheme } from './ThemeProvider';
import { Sun, Moon, Home, Settings, BarChart3, Flag, Play, BookOpen } from 'lucide-react';

type Page = 'dashboard' | 'setup' | 'history' | 'reported' | 'session' | 'review';

interface NavigationProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  hasActiveSession: boolean;
}

const NAV_ITEMS: Array<{ page: Page; label: string; icon: React.ElementType; mobileIcon: React.ElementType; show: boolean }> = [
  { page: 'dashboard', label: 'Home', icon: Home, mobileIcon: Home, show: true },
  { page: 'setup', label: 'Setup', icon: Settings, mobileIcon: Settings, show: true },
  { page: 'history', label: 'History', icon: BarChart3, mobileIcon: BarChart3, show: true },
  { page: 'reported', label: 'Reported', icon: Flag, mobileIcon: Flag, show: true },
];

export function Navigation({ currentPage, onNavigate, hasActiveSession }: NavigationProps) {
  const { colorMode, toggleColorMode } = useTheme();

  return (
    <>
      {/* Desktop header */}
      <header className="sticky top-0 z-50 hidden sm:block border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('dashboard')} className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[var(--primary)]" />
              <span className="text-lg font-bold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>CCTC</span>
            </button>
            <nav className="flex items-center gap-1" aria-label="Primary">
              {NAV_ITEMS.filter((item) => item.show).map(({ page, label, icon: Icon }) => (
                <button
                  key={page}
                  onClick={() => onNavigate(page)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    currentPage === page
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                  )}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
              {hasActiveSession && (
                <button
                  onClick={() => onNavigate('session')}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    currentPage === 'session'
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                  )}
                >
                  <Play className="h-4 w-4" />
                  Resume
                </button>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleColorMode}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
              aria-label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
            >
              {colorMode === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden border-t border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-sm safe-area-pb" aria-label="Mobile navigation">
        <div className="flex items-center justify-around px-2 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
          {NAV_ITEMS.filter((item) => item.show).map(({ page, mobileIcon: Icon, label }) => (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs transition-colors min-w-[44px] min-h-[44px] justify-center',
                currentPage === page
                  ? 'text-[var(--primary)] font-semibold'
                  : 'text-[var(--muted-foreground)]'
              )}
              aria-label={label}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
          {hasActiveSession && (
            <button
              onClick={() => onNavigate('session')}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs transition-colors min-w-[44px] min-h-[44px] justify-center',
                currentPage === 'session'
                  ? 'text-[var(--accent)] font-semibold'
                  : 'text-[var(--muted-foreground)]'
              )}
              aria-label="Resume"
              aria-current={currentPage === 'session' ? 'page' : undefined}
            >
              <Play className="h-5 w-5" />
              <span className="text-[10px]">Resume</span>
            </button>
          )}
          <button
            onClick={toggleColorMode}
            className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs text-[var(--muted-foreground)] min-w-[44px] min-h-[44px] justify-center"
            aria-label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
          >
            {colorMode === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            <span className="text-[10px]">{colorMode === 'light' ? 'Dark' : 'Light'}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
