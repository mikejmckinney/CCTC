import { Home, Settings, BarChart3, Play, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';

type View = 'dashboard' | 'setup' | 'history' | 'reported-items' | 'session' | 'session-review';

interface MobileNavProps {
  active: View;
  onNavigate: (view: View) => void;
  hasActiveSession: boolean;
}

const NAV_ITEMS: Array<{ view: View; icon: typeof Home; label: string; show?: (has: boolean) => boolean }> = [
  { view: 'dashboard', icon: Home, label: 'Home' },
  { view: 'setup', icon: Settings, label: 'Setup' },
  { view: 'history', icon: BarChart3, label: 'Progress' },
  { view: 'session', icon: Play, label: 'Resume', show: (has) => has },
];

export function MobileNav({ active, onNavigate, hasActiveSession }: MobileNavProps) {
  const items = NAV_ITEMS.filter((item) => !item.show || item.show(hasActiveSession));

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t px-2 pb-[env(safe-area-inset-bottom)] md:hidden"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        height: '64px',
      }}
      role="navigation"
      aria-label="Primary navigation"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.view;
        return (
          <button
            key={item.view}
            type="button"
            onClick={() => onNavigate(item.view)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors',
              isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
