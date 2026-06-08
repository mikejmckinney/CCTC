import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const MANIFEST_PATH = path.join(ROOT_DIR, 'scripts/reference/sources.json');

export const OPTN_POLICIES_PUBLIC_URL =
  'https://www.hrsa.gov/sites/default/files/hrsa/optn/optn_policies.pdf';

export async function loadManifest() {
  const raw = await fs.readFile(MANIFEST_PATH, 'utf8');
  return JSON.parse(raw);
}

export function resolvePdfPath(manifest, sourceId) {
  const source = manifest.sources.find((entry) => entry.id === sourceId);
  if (!source) {
    throw new Error(`Unknown source_id "${sourceId}"`);
  }
  return {
    source,
    pdfPath: path.join(ROOT_DIR, 'docs/reference', source.filename),
  };
}

export function resolveIndexPath(manifest, sourceId) {
  return path.join(ROOT_DIR, manifest.index_dir, `${sourceId}.json`);
}

export async function loadSourceIndex(sourceId) {
  const manifest = await loadManifest();
  const indexPath = resolveIndexPath(manifest, sourceId);
  try {
    const raw = await fs.readFile(indexPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(
        `Index missing for "${sourceId}". Run: npm run reference:index`,
      );
    }
    throw error;
  }
}

export function getPageText(index, pdfPage) {
  const page = index.pages.find((entry) => entry.pdf_page === pdfPage);
  return page?.text ?? null;
}

export function detectChapter(text) {
  const normalized = normalizeText(text);
  const chapterMatch =
    normalized.match(/\bchapter\s+(\d+)\b/i) ??
    normalized.match(/\bch\.?\s*(\d+)\b/i);
  return chapterMatch ? chapterMatch[1] : null;
}

const POLICY_HEADING_PATTERN = /\bPolicy\s+(\d+(?:\.\d+)*)\b/g;

export function detectPoliciesOnPage(text) {
  const policies = [];
  const seen = new Set();
  for (const match of String(text ?? '').matchAll(POLICY_HEADING_PATTERN)) {
    const policyNumber = match[1];
    if (!seen.has(policyNumber)) {
      seen.add(policyNumber);
      policies.push(policyNumber);
    }
  }
  return policies;
}

export function detectPrimaryPolicy(text) {
  return detectPoliciesOnPage(text)[0] ?? null;
}

export function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\w\s%.°/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function keywordMatchScore(pageText, keywords) {
  if (!Array.isArray(keywords) || keywords.length === 0) {
    return { matched: [], required: 0, score: 0 };
  }

  const haystack = normalizeText(pageText);
  const matched = keywords.filter((keyword) => {
    const needle = normalizeText(keyword);
    return needle.length > 0 && haystack.includes(needle);
  });

  const required = Math.max(1, Math.min(2, Math.ceil(keywords.length * 0.5)));
  const score = matched.length / required;
  return { matched, required, score: Math.min(score, 1) };
}

export function extractPageText(pdfPath, pageNumber) {
  const result = spawnSync(
    'pdftotext',
    ['-f', String(pageNumber), '-l', String(pageNumber), pdfPath, '-'],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `pdftotext failed for ${pdfPath} page ${pageNumber}: ${result.stderr || result.stdout}`,
    );
  }

  return (result.stdout ?? '').replace(/\r\n/g, '\n').trim();
}

export function getPdfPageCount(pdfPath) {
  const result = spawnSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`pdfinfo failed for ${pdfPath}: ${result.stderr}`);
  }
  const match = result.stdout.match(/^Pages:\s+(\d+)/m);
  if (!match) {
    throw new Error(`Could not read page count for ${pdfPath}`);
  }
  return Number.parseInt(match[1], 10);
}

export function isOptnPolicySource(source) {
  return source?.kind === 'optn_policy' || source?.id === 'optn-policies';
}

export function buildPublicPdfPageUrl(publicUrl, pdfPage) {
  if (typeof publicUrl !== 'string' || publicUrl.trim().length === 0) {
    return publicUrl;
  }
  if (!Number.isInteger(pdfPage) || pdfPage < 1) {
    return publicUrl;
  }

  const url = new URL(publicUrl);
  url.hash = `page=${pdfPage}`;
  return url.toString();
}

export function extractPdfPageFromLocator(locator) {
  if (typeof locator !== 'string') {
    return null;
  }
  const match = locator.match(/PDF\s+p\.\s*(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

export function extractPdfPageFromUrl(url) {
  if (typeof url !== 'string') {
    return null;
  }
  try {
    const { hash } = new URL(url);
    const match = hash.match(/^#page=(\d+)$/i);
    return match ? Number.parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}

export function isOptnPoliciesPdfUrl(url) {
  if (typeof url !== 'string') {
    return false;
  }
  try {
    const { pathname } = new URL(url);
    return pathname.toLowerCase().endsWith('/optn_policies.pdf');
  } catch {
    return false;
  }
}

export function formatOptnPolicyLocator({ policyNumber, subsection, pdfPage }) {
  const policyLabel = policyNumber ? `Policy ${policyNumber}` : 'OPTN Policy';
  const subsectionLabel = subsection ? ` → ${subsection}` : '';
  return `${policyLabel}${subsectionLabel}; PDF p. ${pdfPage} (repo file-page index; printed margin may differ).`;
}

export async function buildSourceIndex(source) {
  const pdfPath = path.join(ROOT_DIR, 'docs/reference', source.filename);
  const pageCount = getPdfPageCount(pdfPath);
  const pages = [];
  let currentChapter = null;
  let currentPolicy = null;
  const trackPolicies = isOptnPolicySource(source);

  for (let pdfPage = 1; pdfPage <= pageCount; pdfPage += 1) {
    const text = extractPageText(pdfPath, pdfPage);
    const chapterOnPage = detectChapter(text);
    if (chapterOnPage) {
      currentChapter = chapterOnPage;
    }

    const policiesOnPage = trackPolicies ? detectPoliciesOnPage(text) : [];
    if (policiesOnPage.length > 0) {
      currentPolicy = policiesOnPage[0];
    }

    pages.push({
      pdf_page: pdfPage,
      chapter: currentChapter,
      policy: trackPolicies ? currentPolicy : undefined,
      policies_on_page: trackPolicies ? policiesOnPage : undefined,
      text,
    });

    if (pdfPage % 50 === 0) {
      process.stderr.write(`  ${source.id}: ${pdfPage}/${pageCount}\n`);
    }
  }

  return {
    source_id: source.id,
    filename: source.filename,
    title: source.title,
    kind: source.kind,
    public_url: source.public_url,
    built_at: new Date().toISOString(),
    page_count: pageCount,
    pages,
  };
}

export function searchIndex(index, query, { limit = 10 } = {}) {
  const terms = normalizeText(query).split(' ').filter(Boolean);
  if (terms.length === 0) {
    return [];
  }

  const hits = [];
  for (const page of index.pages) {
    const haystack = normalizeText(page.text);
    const matchedTerms = terms.filter((term) => haystack.includes(term));
    if (matchedTerms.length === 0) {
      continue;
    }
    hits.push({
      pdf_page: page.pdf_page,
      chapter: page.chapter,
      policy: page.policy,
      score: matchedTerms.length / terms.length,
      matched_terms: matchedTerms,
      snippet: buildSnippet(page.text, matchedTerms[0]),
    });
  }

  hits.sort((a, b) => b.score - a.score || a.pdf_page - b.pdf_page);
  return hits.slice(0, limit);
}

function buildSnippet(text, term) {
  const lower = text.toLowerCase();
  const index = lower.indexOf(term.toLowerCase());
  if (index < 0) {
    return text.slice(0, 160).replace(/\s+/g, ' ');
  }
  const start = Math.max(0, index - 80);
  const end = Math.min(text.length, index + term.length + 80);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}
