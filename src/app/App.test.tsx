import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from './ThemeContext';
import App from './App';

vi.mock('../lib/storage', () => ({
  bootstrapState: vi.fn(async () => ({
    meta: { disclaimerSeen: true },
    settings: null,
    activeSession: null,
    history: [],
    flags: []
  })),
  clearActiveSession: vi.fn(async () => undefined),
  clearHistory: vi.fn(async () => undefined),
  deleteFlag: vi.fn(async () => undefined),
  deleteHistoryEntry: vi.fn(async () => undefined),
  replaceFlags: vi.fn(async () => undefined),
  saveActiveSession: vi.fn(async () => undefined),
  saveHistoryEntry: vi.fn(async () => undefined),
  saveMeta: vi.fn(async () => undefined),
  saveSettings: vi.fn(async () => undefined),
  upsertFlag: vi.fn(async () => undefined)
}));

function renderApp() {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  );
}

describe('App', () => {
  it('renders the dashboard with quick start cards', async () => {
    renderApp();

    await waitFor(() => expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0));

    expect(screen.getByText('Quick Start')).toBeInTheDocument();
    expect(screen.getByText('Full Exam')).toBeInTheDocument();
    expect(screen.getByText('Quick Session')).toBeInTheDocument();
    expect(screen.getByText('Weak Areas')).toBeInTheDocument();
  });
});
