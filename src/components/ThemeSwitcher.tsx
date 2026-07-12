import { useTheme } from './ThemeProvider';
import { THEMES, type ThemeId } from '../lib/themes';
import { Sun, Moon, Palette } from 'lucide-react';
import { cn } from '../lib/cn';

export function ThemeSwitcher() {
  const { themeId, colorMode, setThemeId, toggleColorMode } = useTheme();

  return (
    <div className="flex items-center gap-2">
      {/* Theme selector */}
      <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1">
        <Palette className="h-4 w-4 text-[var(--muted-foreground)] ml-1" />
        {(Object.keys(THEMES) as ThemeId[]).map((id) => (
          <button
            key={id}
            onClick={() => setThemeId(id)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              themeId === id
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
            )}
          >
            {THEMES[id].name}
          </button>
        ))}
      </div>

      {/* Light/Dark toggle */}
      <button
        onClick={toggleColorMode}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
        aria-label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
      >
        {colorMode === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>
    </div>
  );
}
