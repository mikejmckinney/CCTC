import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { History } from './History';
import { exportBackup } from '../lib/backup';
import type { HistoryEntry } from '../types/exam';

// Mock heavy deps that History doesn't actually need for the
// connected-card copy test, but imports at the top of the file.
vi.mock('../lib/backup', () => ({
  exportBackup: vi.fn(async () => undefined),
  importBackup: vi.fn(async () => ({ historyCount: 0, activeSession: null }))
}));
vi.mock('../lib/storage', () => ({
  getDb: vi.fn(async () => ({
    transaction: () => ({ store: { put: vi.fn(), delete: vi.fn() }, done: Promise.resolve() }),
    getAll: vi.fn(async () => []),
    get: vi.fn(async () => null)
  }))
}));
// Stub the chart so it doesn't try to render with no data
vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  ReferenceLine: () => null
}));

const noop = () => undefined;

function makeEntry(id: string, mode: 'exam' | 'study', percent: number): HistoryEntry {
  return {
    id,
    completedAt: `2026-07-${id.padStart(2, '0')}T00:00:00.000Z`,
    settings: {
      blueprintId: 'cctc-from-2026-07', questionSet: 'standard', questionCount: 10,
      timed: mode === 'exam', timeMinutes: 10, showTimer: true, mode, includeDrafts: false,
      targetThreshold: 70,
    },
    items: [], answers: {}, itemIds: [], flaggedForReview: [], timeUsedSeconds: 600,
    result: {
      correct: Math.round(percent / 10), total: 10, percent, estimatedPass: percent >= 70,
      breakdown: [{ categoryId: '1', categoryLabel: 'Education', correct: 8, total: 10 }],
    },
  };
}

function renderHistory(props: Partial<React.ComponentProps<typeof History>> = {}) {
  return render(
    <History
      history={[]}
      sampleHistoryCount={0}
      onViewSession={noop}
      onDeleteSession={noop}
      onClearAll={noop}
      onStartSession={noop}
      onRemoveSampleData={noop}
      dirSyncSupported={true}
      syncFolderName="My Drive"
      syncConnected={true}
      syncing={false}
      syncMsg={null}
      metaConflict={null}
      onConnectFolder={noop}
      onSyncNow={noop}
      onKeepThisDevice={noop}
      onKeepFolder={noop}
      onDismissMetaConflict={noop}
      {...props}
    />
  );
}

describe('History — connected-card copy', () => {
  it('shows the folder name when connected', () => {
    renderHistory();
    expect(screen.getByText(/My Drive/)).toBeInTheDocument();
  });

  it('shows the auto-sync blurb when connected', () => {
    renderHistory();
    expect(
      screen.getByText(/Auto-syncs a moment after each answer and when you finish a session\./i)
    ).toBeInTheDocument();
  });

  it('hides the auto-sync blurb when not connected', () => {
    renderHistory({ syncConnected: false });
    expect(
      screen.queryByText(/Auto-syncs a moment after each answer/i)
    ).not.toBeInTheDocument();
  });

  it('hides the folder sync card when dirSyncSupported is false', () => {
    renderHistory({ dirSyncSupported: false });
    expect(screen.queryByText(/Connect folder/i)).not.toBeInTheDocument();
  });

  it('shows an actionable message when export fails', async () => {
    vi.mocked(exportBackup).mockRejectedValueOnce(new Error('Download blocked'));
    renderHistory();

    await userEvent.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => expect(screen.getByText(/Download blocked/)).toBeInTheDocument());
  });

  it('colors a score against the target recorded for that session', () => {
    const entry: HistoryEntry = {
      id: 'history-1',
      completedAt: '2026-07-12T00:00:00.000Z',
      settings: {
        blueprintId: 'cctc-from-2026-07', questionSet: 'standard', questionCount: 1,
        timed: false, timeMinutes: 1, showTimer: false, mode: 'exam', includeDrafts: false,
        targetThreshold: 80,
      },
      items: [], answers: {}, itemIds: [], flaggedForReview: [], timeUsedSeconds: 60,
      result: { correct: 3, total: 4, percent: 75, estimatedPass: false, breakdown: [] },
    };
    renderHistory({ history: [entry] });

    expect(screen.getAllByText('75%').at(-1)).toHaveClass('text-[var(--warning)]');
  });

  it('offers a start action when history is empty', async () => {
    const onStartSession = vi.fn();
    renderHistory({ onStartSession });

    await userEvent.click(screen.getByRole('button', { name: 'Start a session' }));

    expect(onStartSession).toHaveBeenCalledOnce();
  });

  it('defaults Progress metrics and records to exam sessions', () => {
    renderHistory({ history: [makeEntry('1', 'exam', 60), makeEntry('2', 'study', 100)] });

    expect(screen.getByText('Avg').parentElement).toHaveTextContent('60%');
    expect(screen.getByText('Exam Sessions')).toBeInTheDocument();
    expect(screen.queryByText('study · 10q')).not.toBeInTheDocument();
  });

  it('labels combined-mode trend as mixed and renders themed mode labels', async () => {
    renderHistory({ history: [makeEntry('1', 'exam', 60), makeEntry('2', 'study', 100)] });

    await userEvent.click(screen.getByRole('button', { name: 'Both' }));

    expect(screen.getByText('Mixed modes')).toBeInTheDocument();
    expect(screen.getByText('Exam', { selector: '[data-session-mode]' })).toHaveClass('text-[var(--primary)]');
    expect(screen.getByText('Study', { selector: '[data-session-mode]' })).toHaveClass('text-[var(--warning)]');
  });

  it('renders domain score bars in each session record', () => {
    renderHistory({ history: [makeEntry('1', 'exam', 60)] });

    expect(screen.getByRole('progressbar', { name: 'D1: Education: 80%' })).toBeInTheDocument();
    expect(screen.getByText('8/10')).toBeInTheDocument();
  });
});
