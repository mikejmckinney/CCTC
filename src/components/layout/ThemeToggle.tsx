import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export function ThemeToggle() {
  const { theme, setTheme, resolved } = useTheme();

  function cycle() {
    const order: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  }

  const icon = theme === 'system' ? (
    <Monitor className="h-4 w-4" />
  ) : resolved === 'dark' ? (
    <Moon className="h-4 w-4" />
  ) : (
    <Sun className="h-4 w-4" />
  );

  const label = theme === 'system' ? 'System theme' : resolved === 'dark' ? 'Dark mode' : 'Light mode';

  return (
    <button
      type="button"
      onClick={cycle}
      className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--surface-raised)]"
      style={{
        borderColor: 'var(--border)',
        color: 'var(--text-secondary)',
        background: 'var(--surface)',
      }}
      title={label}
      aria-label={`Theme: ${label}. Click to cycle.`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
