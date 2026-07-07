import { cn } from '../lib/cn';
import { performCircularReveal } from '../lib/circularReveal';
import { useTheme } from './ThemeProvider';
import { Sun, Moon, Home, BarChart3, Play, BookOpen, Calendar, Target } from 'lucide-react';

type Page = 'dashboard' | 'history' | 'reported' | 'session' | 'review';

interface NavigationProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  hasActiveSession: boolean;
  daysUntilExam?: number | null;
  targetScore?: number;
  onNavigateToExamDate?: () => void;
  onNavigateToTargetScore?: () => void;
}

const NAV_ITEMS: Array<{ page: Page; label: string; icon: React.ElementType }> = [
  { page: 'dashboard', label: 'Home', icon: Home },
  { page: 'history', label: 'Progress', icon: BarChart3 },
];

export function Navigation({
  currentPage, onNavigate, hasActiveSession, daysUntilExam, targetScore,
  onNavigateToExamDate, onNavigateToTargetScore
}: NavigationProps) {
  const { colorMode, toggleColorMode } = useTheme();

  return (
    <>
      {/* Header — visible on all viewports */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('dashboard')} className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[var(--primary)]" />
              <span className="text-lg font-bold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>CCTC</span>
            </button>
            {/* Desktop nav links */}
            <nav className="hidden sm:flex items-center gap-1" aria-label="Primary">
              {NAV_ITEMS.map(({ page, label, icon: Icon }) => (
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
            {/* Exam info pills — always visible, clickable */}
            {daysUntilExam !== null && daysUntilExam !== undefined && (
              <button
                type="button"
                onClick={onNavigateToExamDate}
                className="flex items-center gap-1.5 rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--primary)]/10"
              >
                <Calendar className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span className="hidden sm:inline">{daysUntilExam > 0 ? `${daysUntilExam}d to exam` : daysUntilExam === 0 ? 'Exam today' : 'Exam passed'}</span>
                <span className="sm:hidden">{daysUntilExam > 0 ? `${daysUntilExam}d` : daysUntilExam === 0 ? 'Today' : 'Passed'}</span>
              </button>
            )}
            {targetScore !== undefined && (
              <button
                type="button"
                onClick={onNavigateToTargetScore}
                className="flex items-center gap-1.5 rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--primary)]/10"
              >
                <Target className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span className="hidden sm:inline">Target {targetScore}%</span>
                <span className="sm:hidden">{targetScore}%</span>
              </button>
            )}
            {/* Dark/light toggle — desktop only (already in bottom nav on mobile) */}
            <button
              onClick={(e) => performCircularReveal(e, toggleColorMode)}
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
              aria-label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
            >
              {colorMode === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav — with labels */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden border-t border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-sm safe-area-pb" aria-label="Mobile navigation">
        <div className="flex items-center justify-around px-2 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
          {NAV_ITEMS.map(({ page, icon: Icon, label }) => (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 transition-colors min-w-[44px] min-h-[44px] justify-center',
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
                'flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 transition-colors min-w-[44px] min-h-[44px] justify-center',
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
            onClick={(e) => performCircularReveal(e, toggleColorMode)}
            className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-[var(--muted-foreground)] min-w-[44px] min-h-[44px] justify-center"
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
