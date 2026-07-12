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
vi.mock('../lib/historyTrend', () => ({
  buildHistoryTrend: vi.fn(() => ({
    chartData: [],
    emaPoints: [],
    emaDelta: null,
    recentDelta: null,
    current: { percent: 0, best: 0, avg: 0, trend: 'stable' as const, count: 0 }
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
        timed: false, timeMinutes: 1, showTimer: false, mode: 'study', includeDrafts: false,
        targetThreshold: 80,
      },
      items: [], answers: {}, itemIds: [], flaggedForReview: [], timeUsedSeconds: 60,
      result: { correct: 3, total: 4, percent: 75, estimatedPass: false, breakdown: [] },
    };
    renderHistory({ history: [entry] });

    expect(screen.getByText('75%')).toHaveClass('text-[var(--warning)]');
  });

  it('offers a start action when history is empty', async () => {
    const onStartSession = vi.fn();
    renderHistory({ onStartSession });

    await userEvent.click(screen.getByRole('button', { name: 'Start a session' }));

    expect(onStartSession).toHaveBeenCalledOnce();
  });
});
