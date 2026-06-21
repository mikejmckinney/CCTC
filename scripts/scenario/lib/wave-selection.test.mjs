import test from 'node:test';
import assert from 'node:assert/strict';
import { listExistingCompanionParents, pickStratified } from './wave-selection.mjs';

test('excludes only prior-wave parents when excludeBelowCompanionNumeric is set', () => {
  const scenarioItems = [
    { item: { id: 'cctc-6001', companion_of: 'cctc-1001' } },
    { item: { id: 'cctc-6031', companion_of: 'cctc-1002' } },
  ];

  assert.deepEqual(listExistingCompanionParents(scenarioItems), new Set(['cctc-1001', 'cctc-1002']));
  assert.deepEqual(
    listExistingCompanionParents(scenarioItems, { excludeBelowCompanionNumeric: 6031 }),
    new Set(['cctc-1001']),
  );
});

test('pickStratified returns requested count with combo targets', () => {
  const pool = [
    ...Array.from({ length: 8 }, (_, i) => ({ item: { id: `ob-${i}`, type: 'one_best' } })),
    ...Array.from({ length: 4 }, (_, i) => ({ item: { id: `cc-${i}`, type: 'complex_combo' } })),
  ];
  const picked = pickStratified(pool, 6, 2);
  assert.equal(picked.length, 6);
  assert.equal(picked.filter((entry) => entry.item.type === 'complex_combo').length, 2);
});
