import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { ThemeProvider } from '../lib/theme';

// Mock matchMedia for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

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
  loadUserPrefs: vi.fn(async () => ({
    examDate: null,
    targetScore: 65,
    lastQuickStart: null,
    lastSettings: null
  })),
  replaceFlags: vi.fn(async () => undefined),
  saveActiveSession: vi.fn(async () => undefined),
  saveHistoryEntry: vi.fn(async () => undefined),
  saveMeta: vi.fn(async () => undefined),
  saveSettings: vi.fn(async () => undefined),
  saveUserPrefs: vi.fn(async () => undefined),
  upsertFlag: vi.fn(async () => undefined)
}));

describe('App', () => {
  it('renders the dashboard as default view', async () => {
    render(<ThemeProvider><App /></ThemeProvider>);

    // Default view is now dashboard; wait for bootstrap to complete
    await waitFor(() => expect(screen.queryByText(/loading local study data/i)).not.toBeInTheDocument());

    // Dashboard should show readiness and quick start sections
    expect(screen.getByText('Readiness')).toBeInTheDocument();
    expect(screen.getByText('Quick Start')).toBeInTheDocument();
    expect(screen.getByText('Full Exam')).toBeInTheDocument();
  });
});
