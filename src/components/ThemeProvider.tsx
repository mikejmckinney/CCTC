import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { ThemeId } from '../lib/themes';

type ColorMode = 'light' | 'dark';

interface ThemeContextValue {
  themeId: ThemeId;
  colorMode: ColorMode;
  setThemeId: (id: ThemeId) => void;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_KEY = 'cctc-theme';
const MODE_KEY = 'cctc-color-mode';

function getSystemPreference(): ColorMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return 'warm';
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'clinical' || stored === 'warm' || stored === 'modern') return stored;
  } catch {}
  return 'warm';
}

function getStoredMode(): ColorMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(MODE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(getStoredTheme);
  const [colorMode, setColorMode] = useState<ColorMode>(() => getStoredMode() ?? getSystemPreference());

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeId);
    if (colorMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themeId, colorMode]);

  useEffect(() => {
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        try {
          if (!localStorage.getItem(MODE_KEY)) {
            setColorMode(e.matches ? 'dark' : 'light');
          }
        } catch {}
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } catch {}
  }, []);

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id);
    try { localStorage.setItem(THEME_KEY, id); } catch {}
  }, []);

  const toggleColorMode = useCallback(() => {
    setColorMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(MODE_KEY, next); } catch {}
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ themeId, colorMode, setThemeId, toggleColorMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
