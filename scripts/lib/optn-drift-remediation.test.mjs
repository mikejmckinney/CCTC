import test from 'node:test';
import assert from 'node:assert/strict';
import { groupFixesForTable } from './optn-drift-remediation.mjs';

test('groupFixesForTable merges items with the same page shift and topic', () => {
  const groups = groupFixesForTable([
    {
      itemId: 'cctc-2041',
      topic: 'Policy 3.5 patient notification',
      oldPage: 46,
      newPage: 47,
    },
    {
      itemId: 'cctc-2044',
      topic: 'Policy 3.9 waitlist removal',
      oldPage: 53,
      newPage: 54,
    },
    {
      itemId: 'cctc-2049',
      topic: 'Policy 3.9 waitlist removal',
      oldPage: 53,
      newPage: 54,
    },
  ]);

  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].itemIds, ['cctc-2041']);
  assert.deepEqual(groups[1].itemIds, ['cctc-2044', 'cctc-2049']);
});
