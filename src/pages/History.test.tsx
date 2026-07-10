import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { History } from './History';

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
});
