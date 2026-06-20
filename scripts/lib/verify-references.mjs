import fs from 'node:fs/promises';
import path from 'node:path';
import {
  detectPoliciesOnPage,
  getPageText,
  keywordMatchScore,
  loadManifest,
  loadSourceIndex,
  resolveIndexPath,
} from './reference-index.mjs';
import {
  extractLocatorKeywords,
  extractPdfPageFromLocator,
  extractPdfPageFromUrl,
  extractPolicyNumber,
  hasOptnPolicyLocator,
  hasSpecificPublicLocator,
  hasTextbookLocator,
  isGenericOptnIndexUrl,
  isOptnOrHhsUrl,
  isOptnPoliciesPdfUrl,
} from './reference-rules.mjs';
import { formatItemError, isAbsoluteUrl, isPlainObject } from '../validate/lib.mjs';

const CITATION_SOURCE_PATTERNS = [
  { source_id: 'secrets', pattern: /transplantation nursing secrets/i },
  { source_id: 'danovitch', pattern: /handbook of kidney transplantation|danovitch/i },
  { source_id: 'cupples', pattern: /core curriculum for transplant nurses/i },
  { source_id: 'organ-transplantation', pattern: /organ transplantation,\s*2nd ed|organ transplantation \(landes/i },
  { source_id: 'nursing-drug-handbook', pattern: /nursing drug handbook|saunders nursing drug handbook/i },
  { source_id: 'mosbys', pattern: /mosby'?s diagnostic and laboratory test reference/i },
  { source_id: 'optn-policies', pattern: /optn\/unos — policies|optn policies \(effective/i },
];

const POLICY_SUBSECTION_PAGE_MARKERS = {
  '18.1': /\bTCR\b|Transplant Candidate Registration|Follow-up \(TRF\)|Registration \(TRR\)/i,
  '18.2': /Table 18-2|Timely Data Collection/i,
  '18.3': /Outcomes of Organ Offers|refusal code|PTR/i,
};

function isPolicySectionPresent(pageText, policiesOnPage, policyNumber) {
  if (!policyNumber) {
    return true;
  }

  if (policiesOnPage.includes(policyNumber)) {
    return true;
  }
  if (pageText.includes(`Policy ${policyNumber}`) || pageText.includes(policyNumber)) {
    return true;
  }

  const marker = POLICY_SUBSECTION_PAGE_MARKERS[policyNumber];
  if (marker?.test(pageText)) {
    return true;
  }

  const major = policyNumber.split('.')[0];
  return policiesOnPage.includes(major) && pageText.includes(policyNumber);
}

export async function createReferenceVerificationContext({ allowMissingIndex = false, referenceWarnings = [] } = {}) {
  const manifest = await loadManifest();
  const indexAvailability = new Map();
  const indexCache = new Map();

  for (const source of manifest.sources) {
    const indexPath = resolveIndexPath(manifest, source.id);
    try {
      await fs.access(indexPath);
      indexAvailability.set(source.id, true);
    } catch {
      indexAvailability.set(source.id, false);
    }
  }

  async function getIndex(sourceId) {
    if (indexCache.has(sourceId)) {
      return indexCache.get(sourceId);
    }
    const index = await loadSourceIndex(sourceId);
    indexCache.set(sourceId, index);
    return index;
  }

  return {
    manifest,
    allowMissingIndex,
    referenceWarnings,
    indexAvailability,
    getIndex,
  };
}

export function resolveSourceIdFromReference(reference) {
  if (isOptnPoliciesPdfUrl(reference?.url)) {
    return 'optn-policies';
  }

  const citation = reference?.citation ?? '';
  for (const entry of CITATION_SOURCE_PATTERNS) {
    if (entry.pattern.test(citation)) {
      return entry.source_id;
    }
  }

  const pdfPage = extractPdfPageFromLocator(reference?.locator);
  if (pdfPage && reference?.kind === 'textbook') {
    for (const entry of CITATION_SOURCE_PATTERNS) {
      if (entry.source_id !== 'optn-policies' && entry.pattern.test(citation)) {
        return entry.source_id;
      }
    }
  }

  return null;
}

export async function verifyItemReferences(item, location, context, errors) {
  if (!isPlainObject(item)) {
    return;
  }

  if (!Array.isArray(item.references) || item.references.length === 0) {
    errors.push(formatItemError(location, '$.references must contain at least one entry'));
    return;
  }

  await verifyPrimaryAnchor(item, location, context, errors);

  for (const [index, reference] of item.references.entries()) {
    verifyReferenceFormat(reference, index, location, errors);
    await verifyReferenceContent(reference, index, item, location, context, errors);
  }
}

async function verifyPrimaryAnchor(item, location, context, errors) {
  if (!isPlainObject(item.primary_anchor)) {
    return;
  }

  const anchor = item.primary_anchor;
  if (anchor.type === 'url') {
    if (!isAbsoluteUrl(anchor.url)) {
      errors.push(formatItemError(location, '$.primary_anchor.url must be a well-formed absolute URL'));
    }
    if (typeof anchor.url === 'string' && anchor.url.includes('optn.transplant.hrsa.gov')) {
      errors.push(
        formatItemError(
          location,
          '$.primary_anchor.url uses legacy optn.transplant.hrsa.gov host (redirects to generic landing page; use hrsa.gov/optn/... and verify)',
        ),
      );
    }
    return;
  }

  if (anchor.type !== 'pdf') {
    errors.push(formatItemError(location, '$.primary_anchor.type must be "pdf" or "url"'));
    return;
  }

  await verifyIndexedPdfPassage({
    label: '$.primary_anchor',
    sourceId: anchor.source_id,
    pdfPage: anchor.pdf_page,
    keywords: anchor.keywords,
    location,
    context,
    errors,
  });
}

function verifyReferenceFormat(reference, index, location, errors) {
  const refPath = `$.references[${index}]`;

  if (reference?.url !== undefined && !isAbsoluteUrl(reference.url)) {
    errors.push(formatItemError(location, `${refPath}.url must be a well-formed absolute URL`));
  }
  if (typeof reference?.url === 'string' && reference.url.includes('optn.transplant.hrsa.gov')) {
    errors.push(
      formatItemError(
        location,
        `${refPath}.url uses legacy optn.transplant.hrsa.gov host (redirects to generic landing page; use hrsa.gov/optn/... and verify)`,
      ),
    );
  }
  if (typeof reference?.url === 'string' && isGenericOptnIndexUrl(reference.url)) {
    errors.push(
      formatItemError(
        location,
        `${refPath}.url is a generic OPTN index page — cite a specific policy §, document, or PDF page instead`,
      ),
    );
  }
  if (
    typeof reference?.url === 'string' &&
    isOptnOrHhsUrl(reference.url) &&
    !isGenericOptnIndexUrl(reference.url) &&
    !isOptnPoliciesPdfUrl(reference.url) &&
    !hasSpecificPublicLocator(reference.locator)
  ) {
    errors.push(
      formatItemError(
        location,
        `${refPath}.locator must name a specific policy §, regulation, or document section when ${refPath}.url is OPTN/HHS`,
      ),
    );
  }
  if (reference?.kind === 'textbook' && !hasTextbookLocator(reference.locator)) {
    errors.push(
      formatItemError(
        location,
        `${refPath}.locator must include a findable outline path (→, §, item/table, or monograph) and PDF p. N when kind is textbook`,
      ),
    );
  }
  if (isOptnPoliciesPdfUrl(reference?.url) && !hasOptnPolicyLocator(reference.locator)) {
    errors.push(
      formatItemError(
        location,
        `${refPath}.locator must name Policy § (e.g. Policy 18.3) and PDF p. N when ${refPath}.url is the OPTN policies PDF`,
      ),
    );
  }
  if (isOptnPoliciesPdfUrl(reference?.url)) {
    const locatorPage = extractPdfPageFromLocator(reference.locator);
    const urlPage = extractPdfPageFromUrl(reference.url);
    if (locatorPage && !urlPage) {
      errors.push(
        formatItemError(
          location,
          `${refPath}.url must include #page=${locatorPage} when citing the OPTN policies PDF (locator names PDF p. ${locatorPage})`,
        ),
      );
    }
    if (locatorPage && urlPage && locatorPage !== urlPage) {
      errors.push(
        formatItemError(
          location,
          `${refPath}.url #page=${urlPage} does not match locator PDF p. ${locatorPage}`,
        ),
      );
    }
  }
}

async function verifyReferenceContent(reference, index, item, location, context, errors) {
  const refPath = `$.references[${index}]`;
  const sourceId = resolveSourceIdFromReference(reference);
  const pdfPage = extractPdfPageFromLocator(reference?.locator);

  if (!sourceId || !pdfPage) {
    return;
  }

  const pageText = await verifyIndexedPdfPassage({
    label: refPath,
    sourceId,
    pdfPage,
    keywords: buildReferenceKeywords(reference, item, sourceId, pdfPage),
    policyNumber: extractPolicyNumber(reference?.locator),
    location,
    context,
    errors,
  });

  if (!pageText) {
    return;
  }
}

export function buildReferenceKeywords(reference, item, sourceId, pdfPage) {
  const fromLocator = extractLocatorKeywords(reference?.locator);
  if (fromLocator.length >= 2) {
    return fromLocator;
  }

  const anchor = item.primary_anchor;
  if (anchor?.type === 'pdf' && anchor.source_id === sourceId && anchor.pdf_page === pdfPage) {
    return anchor.keywords ?? [];
  }

  if (extractPolicyNumber(reference?.locator)) {
    const policy = extractPolicyNumber(reference.locator);
    return [`Policy ${policy}`, policy.split('.')[0]];
  }

  return fromLocator;
}

async function verifyIndexedPdfPassage({
  label,
  sourceId,
  pdfPage,
  keywords,
  policyNumber,
  location,
  context,
  errors,
}) {
  if (!sourceId || !Number.isInteger(pdfPage) || pdfPage < 1) {
    return null;
  }

  if (!context.indexAvailability.get(sourceId)) {
    const message = `${label} requires local index for "${sourceId}" — run: npm run reference:index ${sourceId}`;
    if (context.allowMissingIndex) {
      context.referenceWarnings?.push(
        `[references:ci-skip] ${location.file} :: ${location.itemId}: ${message}`,
      );
      return null;
    }
    errors.push(formatItemError(location, message));
    return null;
  }

  let index;
  try {
    index = await context.getIndex(sourceId);
  } catch (error) {
    errors.push(formatItemError(location, `${label} index load failed for ${sourceId}: ${error.message}`));
    return null;
  }

  const pageText = getPageText(index, pdfPage);
  if (!pageText) {
    errors.push(
      formatItemError(
        location,
        `${label} PDF p. ${pdfPage} is out of range for ${sourceId} (1-${index.page_count})`,
      ),
    );
    return null;
  }

  if (policyNumber) {
    const policiesOnPage = detectPoliciesOnPage(pageText);
    if (!isPolicySectionPresent(pageText, policiesOnPage, policyNumber)) {
      errors.push(
        formatItemError(
          location,
          `${label} cites Policy ${policyNumber} on PDF p. ${pdfPage}, but that policy section was not found on the indexed page (found headings: ${policiesOnPage.join(', ') || 'none'})`,
        ),
      );
    }
  }

  if (Array.isArray(keywords) && keywords.length >= 2) {
    const { matched, required } = keywordMatchScore(pageText, keywords);
    if (matched.length < required) {
      errors.push(
        formatItemError(
          location,
          `${label} content check matched ${matched.length}/${required} term(s) on ${sourceId} PDF p.${pdfPage} (matched: ${matched.join(', ') || 'none'}; expected at least: ${keywords.join(', ')})`,
        ),
      );
    }
  }

  return pageText;
}
