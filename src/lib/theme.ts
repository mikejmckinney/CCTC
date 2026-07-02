const THEME_KEY = 'cctc-theme';

type Theme = 'light' | 'dark';

function getSystemPreference(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return getSystemPreference();
}

export function setTheme(theme: Theme): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(THEME_KEY, theme);
  }
  applyTheme(theme);
}

export function toggleTheme(): Theme {
  const current = getStoredTheme();
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

export function initTheme(): Theme {
  const theme = getStoredTheme();
  applyTheme(theme);

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', () => {
      if (typeof localStorage === 'undefined' || !localStorage.getItem(THEME_KEY)) {
        applyTheme(getSystemPreference());
      }
    });
  }

  return theme;
}
