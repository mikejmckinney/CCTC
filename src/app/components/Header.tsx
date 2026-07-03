import type { View } from '../App';
import type { Theme } from '../../types/exam';

interface HeaderProps {
  view: View;
  activeSession: boolean;
  theme: Theme;
  onNavigate: (view: View) => void;
  onThemeToggle: () => void;
  onResume: () => void;
}

export function Header({ view, activeSession, theme, onNavigate, onThemeToggle, onResume }: HeaderProps) {
  return (
    <header className="app-header" role="banner">
      <div className="app-header__inner">
        <span className="app-header__brand">
          <span className="app-header__brand-tile">C</span>
          <span className="app-header__brand-word brand-word">CCTC Practice</span>
        </span>
        <nav className="app-header__nav" aria-label="Primary">
          <button
            className={`app-header__nav-item${view === 'dashboard' ? ' is-active' : ''}`}
            onClick={() => onNavigate('dashboard')}
            aria-current={view === 'dashboard' ? 'page' : undefined}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M3 10.5L12 3l9 7.5" />
              <path d="M5 9.5V21h14V9.5" />
            </svg>
            <span className="nav-label">Home</span>
          </button>
          <button
            className={`app-header__nav-item${view === 'setup' ? ' is-active' : ''}`}
            onClick={() => onNavigate('setup')}
            aria-current={view === 'setup' ? 'page' : undefined}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="nav-label">Setup</span>
          </button>
          <button
            className={`app-header__nav-item${view === 'history' ? ' is-active' : ''}`}
            onClick={() => onNavigate('history')}
            aria-current={view === 'history' ? 'page' : undefined}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M4 20V10" />
              <path d="M10 20V4" />
              <path d="M16 20v-7" />
              <path d="M22 20H2" />
            </svg>
            <span className="nav-label">Progress</span>
          </button>
        </nav>
        <span className="app-header__spacer" />
        {activeSession && (
          <button className="app-header__resume-btn" onClick={onResume}>
            Resume
          </button>
        )}
        <button
          className="app-header__theme-btn"
          onClick={onThemeToggle}
          aria-label={`Switch to ${theme === 'day' ? 'night' : 'day'} theme`}
        >
          {theme === 'day' ? '☾' : '☀'}
        </button>
      </div>
    </header>
  );
}
