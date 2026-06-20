import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

describe('App', () => {
  it('renders the start screen and loaded-bank summary', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { name: /build a practice session/i })).toBeInTheDocument());

    expect(screen.getByRole('heading', { name: 'CCTC Practice Exam' })).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => Boolean(element?.closest('.badge')?.textContent?.includes('506 item')))
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Blueprint version/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start session/i })).toBeInTheDocument();
  });
});
