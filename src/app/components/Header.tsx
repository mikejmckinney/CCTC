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
          <span className="app-header__brand-word">CCTC Practice</span>
        </span>
        <nav className="app-header__nav" aria-label="Primary">
          <button
            className={`app-header__nav-item${view === 'dashboard' ? ' is-active' : ''}`}
            onClick={() => onNavigate('dashboard')}
            aria-current={view === 'dashboard' ? 'page' : undefined}
          >
            <span className="nav-icon">🏠</span>
            <span className="app-header__nav-label">Home</span>
          </button>
          <button
            className={`app-header__nav-item${view === 'setup' ? ' is-active' : ''}`}
            onClick={() => onNavigate('setup')}
            aria-current={view === 'setup' ? 'page' : undefined}
          >
            <span className="nav-icon">⚙</span>
            <span className="app-header__nav-label">Setup</span>
          </button>
          <button
            className={`app-header__nav-item${view === 'history' ? ' is-active' : ''}`}
            onClick={() => onNavigate('history')}
            aria-current={view === 'history' ? 'page' : undefined}
          >
            <span className="nav-icon">📊</span>
            <span className="app-header__nav-label">Progress</span>
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
