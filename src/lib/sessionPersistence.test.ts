import { describe, expect, it } from 'vitest';
import { buildRecentItemIds, pruneStaleFlags } from './sessionPersistence';
import type { ItemFlag } from '../types/exam';

describe('sessionPersistence helpers', () => {
  it('drops flags whose item version no longer matches the bundled bank', () => {
    const flags: ItemFlag[] = [
      {
        id: 'flag-1',
        item_id: 'cctc-0001',
        version: 1,
        status: 'draft',
        reason: 'typo / wording',
        comment: '',
        session_id: 'session-1',
        blueprint: 'cctc-from-2026-07',
        mode: 'study',
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z'
      },
      {
        id: 'flag-2',
        item_id: 'cctc-0002',
        version: 2,
        status: 'draft',
        reason: 'other',
        comment: 'stale',
        session_id: 'session-2',
        blueprint: 'cctc-thru-2026-06',
        mode: 'exam',
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z'
      }
    ];

    const retained = pruneStaleFlags(
      flags,
      new Map([
        ['cctc-0001', 1],
        ['cctc-0002', 1]
      ])
    );

    expect(retained).toEqual([flags[0]]);
  });

  it('builds a recent-item exclusion set from the newest sessions first', () => {
    const recent = buildRecentItemIds(
      [
        { itemIds: ['cctc-0001', 'cctc-0002'] },
        { itemIds: ['cctc-0003'] },
        { itemIds: ['cctc-0004'] },
        { itemIds: ['cctc-9999'] }
      ],
      3
    );

    expect(recent.has('cctc-0001')).toBe(true);
    expect(recent.has('cctc-0004')).toBe(true);
    expect(recent.has('cctc-9999')).toBe(false);
  });
});