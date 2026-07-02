import { Home, Settings, BarChart3, FileText, BookOpen } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ThemeToggle } from './ThemeToggle';

type View = 'dashboard' | 'setup' | 'history' | 'reported-items' | 'session' | 'session-review';

interface HeaderProps {
  active: View;
  onNavigate: (view: View) => void;
  hasActiveSession: boolean;
}

const NAV_ITEMS: Array<{ view: View; icon: typeof Home; label: string }> = [
  { view: 'dashboard', icon: Home, label: 'Dashboard' },
  { view: 'setup', icon: BookOpen, label: 'Setup' },
  { view: 'history', icon: BarChart3, label: 'Progress' },
  { view: 'reported-items', icon: FileText, label: 'Reported' },
];

export function Header({ active, onNavigate, hasActiveSession }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 w-full border-b"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="mx-auto flex h-14 max-w-[940px] items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
          >
            C
          </div>
          <span className="hidden text-sm font-semibold sm:inline" style={{ color: 'var(--text)' }}>
            CCTC
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" role="navigation" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => onNavigate(item.view)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--primary)] text-[var(--primary-fg)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
          {hasActiveSession && (
            <button
              type="button"
              onClick={() => onNavigate('session')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                active === 'session'
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'text-[var(--accent)] hover:bg-[var(--accent-light)]'
              )}
            >
              <Settings className="h-3.5 w-3.5" />
              Resume
            </button>
          )}
        </nav>

        {/* Theme toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
