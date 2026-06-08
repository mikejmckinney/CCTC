import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildPublicPdfPageUrl,
  detectPoliciesOnPage,
  extractPdfPageFromLocator,
  extractPdfPageFromUrl,
  formatOptnPolicyLocator,
  isOptnPoliciesPdfUrl,
} from './reference-index.mjs';

describe('OPTN policy reference helpers', () => {
  it('detects policy numbers on a page', () => {
    assert.deepEqual(
      detectPoliciesOnPage(
        'Policy 18: Data Submission Requirements\nPolicy 18.3 Recording and Reporting the Outcomes of Organ Offers',
      ),
      ['18', '18.3'],
    );
  });

  it('builds public PDF page URLs', () => {
    const url = buildPublicPdfPageUrl(
      'https://www.hrsa.gov/sites/default/files/hrsa/optn/optn_policies.pdf',
      412,
    );
    assert.equal(url, 'https://www.hrsa.gov/sites/default/files/hrsa/optn/optn_policies.pdf#page=412');
  });

  it('extracts PDF page numbers from locators and URLs', () => {
    assert.equal(
      extractPdfPageFromLocator('Policy 18.3 → refusal codes; PDF p. 412 (repo file-page index)'),
      412,
    );
    assert.equal(
      extractPdfPageFromUrl(
        'https://www.hrsa.gov/sites/default/files/hrsa/optn/optn_policies.pdf#page=412',
      ),
      412,
    );
  });

  it('recognizes OPTN policies PDF URLs', () => {
    assert.equal(
      isOptnPoliciesPdfUrl('https://www.hrsa.gov/sites/default/files/hrsa/optn/optn_policies.pdf'),
      true,
    );
    assert.equal(isOptnPoliciesPdfUrl('https://www.hrsa.gov/optn/policies-bylaws/policies'), false);
  });

  it('formats OPTN policy locators', () => {
    assert.equal(
      formatOptnPolicyLocator({
        policyNumber: '18.3',
        subsection: 'organ-offer refusal reporting',
        pdfPage: 412,
      }),
      'Policy 18.3 → organ-offer refusal reporting; PDF p. 412 (repo file-page index; printed margin may differ).',
    );
  });
});

describe('hasOptnPolicyLocator (validator parity)', () => {
  function hasOptnPolicyLocator(locator) {
    if (typeof locator !== 'string' || locator.trim().length === 0) {
      return false;
    }
    return /Policy\s+\d+(?:\.\d+)+/i.test(locator) && /PDF\s+p\.\s*\d+/i.test(locator);
  }

  it('accepts policy + page locators', () => {
    assert.equal(
      hasOptnPolicyLocator('Policy 8.5 → kidney allocation; PDF p. 201 (repo file-page index)'),
      true,
    );
    assert.equal(hasOptnPolicyLocator('PDF p. 201 only'), false);
  });
});
