import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('../lib/storage', () => ({
  bootstrapState: vi.fn(async () => ({
    meta: { disclaimerSeen: true, theme: 'day' as const },
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

describe('App', () => {
  it('renders the dashboard and loaded-bank summary', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument());

    expect(screen.getByRole('button', { name: /cctc home/i })).toBeInTheDocument();
    expect(screen.getByText(/506 practice items/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /setup form/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quick 10/i })).toBeInTheDocument();
  });
});
