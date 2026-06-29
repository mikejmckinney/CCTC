import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeAll } from 'vitest';
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

beforeAll(() => {
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
      dispatchEvent: vi.fn()
    }))
  });
});

describe('App', () => {
  it('renders the dashboard as default home view', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByText('CCTC Practice Exam')).toBeInTheDocument());

    expect(screen.getByText(/Practice readiness/i)).toBeInTheDocument();
    expect(screen.getByText(/Quick start/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent sessions/i)).toBeInTheDocument();
  });

  it('renders theme toggle button', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByLabelText(/Switch to night theme/i)).toBeInTheDocument());
  });

  it('renders navigation items', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Setup')).toBeInTheDocument();
      expect(screen.getByText('Progress')).toBeInTheDocument();
    });
  });
});
