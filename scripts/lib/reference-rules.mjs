import {
  extractPdfPageFromLocator,
  extractPdfPageFromUrl,
  isOptnPoliciesPdfUrl,
} from './reference-index.mjs';

export function isOptnOrHhsUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'hrsa.gov' || host.endsWith('.hrsa.gov') || host === 'hhs.gov' || host.endsWith('.hhs.gov');
  } catch {
    return false;
  }
}

export function isGenericOptnIndexUrl(url) {
  try {
    const { pathname } = new URL(url);
    const normalized = pathname.replace(/\/$/, '').toLowerCase();
    return (
      normalized === '/optn' ||
      normalized === '/optn/policies-bylaws' ||
      normalized === '/optn/policies-bylaws/policies'
    );
  } catch {
    return false;
  }
}

export function hasSpecificPublicLocator(locator) {
  if (typeof locator !== 'string' || locator.trim().length === 0) {
    return false;
  }
  return (
    /Policy\s+\d+(?:\.\d+)*/i.test(locator) ||
    /PDF\s+p\.\s*\d+/i.test(locator) ||
    /42\s+C\.?F\.?R\.?\s*§?\s*\d+/i.test(locator) ||
    /§\s*\d+(\.\d+)*/.test(locator)
  );
}

export function hasTextbookLocator(locator) {
  if (typeof locator !== 'string' || locator.trim().length === 0) {
    return false;
  }
  const hasPdfPage = /PDF\s+p\.\s*\d+/i.test(locator);
  const hasOutlinePath =
    /→/.test(locator) ||
    /§\s*\d/.test(locator) ||
    /\bitem\s+\d+/i.test(locator) ||
    /\btable\b/i.test(locator) ||
    /\bmonograph\b/i.test(locator) ||
    /Part\s+[IVX]+/i.test(locator);
  return hasPdfPage && hasOutlinePath;
}

export function hasOptnPolicyLocator(locator) {
  if (typeof locator !== 'string' || locator.trim().length === 0) {
    return false;
  }
  return /Policy\s+\d+(?:\.\d+)+/i.test(locator) && /PDF\s+p\.\s*\d+/i.test(locator);
}

export function extractPolicyNumber(locator) {
  if (typeof locator !== 'string') {
    return null;
  }
  const match = locator.match(/Policy\s+(\d+(?:\.\d+)+)/i);
  return match ? match[1] : null;
}

export function extractLocatorKeywords(locator) {
  if (typeof locator !== 'string') {
    return [];
  }

  const quoted = [];
  for (const match of locator.matchAll(/[“"]([^”"]+)[”"]/g)) {
    quoted.push(...tokenizeForMatch(match[1]));
  }
  if (quoted.length >= 2) {
    return [...new Set(quoted.filter((term) => term.length >= 4))].slice(0, 8);
  }

  const arrowParts = locator.split('→');
  if (arrowParts.length > 1) {
    const tail = arrowParts.at(-1).replace(/PDF\s+p\.\s*\d+.*/i, '');
    const fromTail = tokenizeForMatch(tail).filter((term) => term.length >= 5);
    if (fromTail.length >= 2) {
      return [...new Set(fromTail)].slice(0, 8);
    }
  }

  return [...new Set(quoted.filter((term) => term.length >= 4))];
}

function tokenizeForMatch(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^\w\s%-]+/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length >= 4 && !STOPWORDS.has(term));
}

const STOPWORDS = new Set([
  'repo',
  'file',
  'page',
  'index',
  'printed',
  'margin',
  'differ',
  'policy',
  'policies',
  'transplant',
  'chapter',
]);

export {
  extractPdfPageFromLocator,
  extractPdfPageFromUrl,
  isOptnPoliciesPdfUrl,
};
