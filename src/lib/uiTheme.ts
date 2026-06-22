export type ThemeMode = 'day' | 'night';

const THEME_BACKGROUNDS: Record<ThemeMode, string> = {
  day: '#f4efe6',
  night: '#17140f'
};

export function resolveInitialTheme(stored?: ThemeMode): ThemeMode {
  if (stored === 'day' || stored === 'night') {
    return stored;
  }

  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'night';
  }

  return 'day';
}

/** Match prototype: set data-theme + animate body background on toggle. */
export function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.body.style.backgroundColor = THEME_BACKGROUNDS[theme];
}
