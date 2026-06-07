import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildReferenceStubEntries,
  buildStubForItem,
  compareStubToItem,
  hashKeywords,
} from './verification-stubs.mjs';

const mockContext = {
  manifest: {
    sources: [
      { id: 'danovitch', filename: 'danovitch-handbook-kidney-transplantation.pdf' },
      { id: 'optn-policies', filename: 'optn-policies.pdf' },
    ],
  },
  indexAvailability: new Map([
    ['danovitch', true],
    ['optn-policies', true],
  ]),
  async getIndex(sourceId) {
    return {
      page_count: sourceId === 'danovitch' ? 512 : 372,
    };
  },
};

describe('verification stub helpers', () => {
  it('hashes keywords deterministically', () => {
    const first = hashKeywords(['DonorNet', 'declined', 'refusal']);
    const second = hashKeywords(['refusal', 'donornet', 'declined']);
    assert.equal(first, second);
    assert.match(first, /^sha256:[a-f0-9]{64}$/);
  });

  it('builds stub entries for indexed PDF references', () => {
    const item = {
      id: 'cctc-2004',
      primary_anchor: {
        type: 'pdf',
        source_id: 'danovitch',
        pdf_page: 113,
        keywords: ['DonorNet', 'declined', 'refusal'],
      },
      references: [
        {
          kind: 'textbook',
          citation: 'Handbook of Kidney Transplantation, 6th ed.',
          locator: 'DonorNet offer workflow → PDF p. 113',
        },
        {
          kind: 'policy',
          citation: 'OPTN/UNOS — Policies (effective policy bundle)',
          url: 'https://www.hrsa.gov/sites/default/files/hrsa/optn/optn_policies.pdf#page=332',
          locator: 'Policy 18.3 → refusal reporting; PDF p. 332',
        },
      ],
    };

    const entries = buildReferenceStubEntries(item);
    assert.equal(entries.length, 2);
    assert.equal(entries[1].policy, '18.3');
    assert.equal(entries[1].source_id, 'optn-policies');
  });

  it('compares committed stubs against question JSON', async () => {
    const item = {
      id: 'cctc-2004',
      primary_anchor: {
        type: 'pdf',
        source_id: 'danovitch',
        pdf_page: 113,
        keywords: ['DonorNet', 'declined', 'refusal'],
      },
      references: [],
    };

    const stub = await buildStubForItem(item, mockContext);
    assert.deepEqual(compareStubToItem(stub, item), []);

    const drifted = {
      ...stub,
      primary_anchor: {
        ...stub.primary_anchor,
        pdf_page: 114,
      },
    };
    assert.ok(compareStubToItem(drifted, item).some((message) => message.includes('pdf_page')));
  });
});
