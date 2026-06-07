import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { extractPdfPageFromLocator, extractPolicyNumber } from './reference-rules.mjs';
import { buildReferenceKeywords, resolveSourceIdFromReference } from './verify-references.mjs';
import { ROOT_DIR } from '../validate/lib.mjs';

export const STUBS_DIR = 'questions/.verification';
export const STUB_SCHEMA_VERSION = 1;

export function hashKeywords(keywords) {
  if (!Array.isArray(keywords) || keywords.length === 0) {
    return undefined;
  }

  const normalized = [...keywords]
    .map((keyword) => String(keyword).trim().toLowerCase())
    .sort()
    .join('\0');

  return `sha256:${createHash('sha256').update(normalized).digest('hex')}`;
}

export function buildReferenceStubEntries(item) {
  const entries = [];

  if (!Array.isArray(item.references)) {
    return entries;
  }

  for (const [index, reference] of item.references.entries()) {
    const sourceId = resolveSourceIdFromReference(reference);
    const pdfPage = extractPdfPageFromLocator(reference?.locator);
    if (!sourceId || !pdfPage) {
      continue;
    }

    const keywords = buildReferenceKeywords(reference, item, sourceId, pdfPage);
    const policy = extractPolicyNumber(reference?.locator);
    const entry = {
      ref_index: index,
      source_id: sourceId,
      pdf_page: pdfPage,
    };

    if (policy) {
      entry.policy = policy;
    }
    if (keywords.length >= 2) {
      entry.keywords = keywords;
      entry.keyword_hash = hashKeywords(keywords);
    }

    entries.push(entry);
  }

  return entries;
}

async function buildIndexSourcesForIds(context, sourceIds) {
  const indexSources = {};
  const manifestById = new Map(context.manifest.sources.map((source) => [source.id, source]));

  for (const sourceId of [...sourceIds].sort()) {
    const manifestEntry = manifestById.get(sourceId);
    if (!manifestEntry) {
      continue;
    }

    if (!context.indexAvailability.get(sourceId)) {
      continue;
    }

    const index = await context.getIndex(sourceId);
    indexSources[sourceId] = {
      filename: manifestEntry.filename,
      page_count: index.page_count,
    };
  }

  return indexSources;
}

export async function buildStubForItem(item, context) {
  const anchor = item.primary_anchor;
  if (anchor?.type !== 'pdf') {
    throw new Error(`${item.id}: primary_anchor.type must be "pdf" to build a verification stub`);
  }

  const references = buildReferenceStubEntries(item);
  const sourceIds = new Set([anchor.source_id, ...references.map((entry) => entry.source_id)]);
  const indexSources = await buildIndexSourcesForIds(context, sourceIds);

  return {
    item_id: item.id,
    schema_version: STUB_SCHEMA_VERSION,
    generated_at: new Date().toISOString().slice(0, 10),
    index_sources: indexSources,
    primary_anchor: {
      source_id: anchor.source_id,
      pdf_page: anchor.pdf_page,
      keywords: anchor.keywords,
      keyword_hash: hashKeywords(anchor.keywords),
    },
    references,
  };
}

export function stableStubJson(stub) {
  return `${JSON.stringify(stub, null, 2)}\n`;
}

function arraysEqual(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => value === right[index]);
}

function compareReferenceStubEntries(expected, actual, itemId) {
  const errors = [];
  const expectedByIndex = new Map(expected.map((entry) => [entry.ref_index, entry]));
  const actualByIndex = new Map((actual ?? []).map((entry) => [entry.ref_index, entry]));

  for (const [refIndex, expectedEntry] of expectedByIndex) {
    const actualEntry = actualByIndex.get(refIndex);
    if (!actualEntry) {
      errors.push(`${itemId}: missing stub reference for $.references[${refIndex}]`);
      continue;
    }

    for (const field of ['source_id', 'pdf_page', 'policy']) {
      if (expectedEntry[field] !== actualEntry[field]) {
        errors.push(
          `${itemId}: stub references[${refIndex}].${field} is ${JSON.stringify(actualEntry[field])}; expected ${JSON.stringify(expectedEntry[field])}`,
        );
      }
    }

    if (!arraysEqual(expectedEntry.keywords ?? [], actualEntry.keywords ?? [])) {
      errors.push(
        `${itemId}: stub references[${refIndex}].keywords mismatch (expected ${JSON.stringify(expectedEntry.keywords ?? [])}, got ${JSON.stringify(actualEntry.keywords ?? [])})`,
      );
    }
  }

  for (const refIndex of actualByIndex.keys()) {
    if (!expectedByIndex.has(refIndex)) {
      errors.push(`${itemId}: stub has unexpected reference entry for $.references[${refIndex}]`);
    }
  }

  return errors;
}

export function compareStubToItem(stub, item) {
  const errors = [];
  const itemId = item.id;

  if (stub.item_id !== itemId) {
    errors.push(`${itemId}: stub item_id is ${stub.item_id}`);
  }

  const anchor = item.primary_anchor;
  if (anchor?.type !== 'pdf') {
    errors.push(`${itemId}: question primary_anchor.type must be "pdf"`);
    return errors;
  }

  const primary = stub.primary_anchor ?? {};
  for (const field of ['source_id', 'pdf_page']) {
    if (primary[field] !== anchor[field]) {
      errors.push(`${itemId}: stub primary_anchor.${field} is ${JSON.stringify(primary[field])}; expected ${JSON.stringify(anchor[field])}`);
    }
  }

  if (!arraysEqual(primary.keywords ?? [], anchor.keywords ?? [])) {
    errors.push(
      `${itemId}: stub primary_anchor.keywords mismatch (expected ${JSON.stringify(anchor.keywords ?? [])}, got ${JSON.stringify(primary.keywords ?? [])})`,
    );
  }

  if (primary.keyword_hash && primary.keyword_hash !== hashKeywords(anchor.keywords)) {
    errors.push(`${itemId}: stub primary_anchor.keyword_hash does not match question keywords`);
  }

  errors.push(...compareReferenceStubEntries(buildReferenceStubEntries(item), stub.references, itemId));

  for (const entry of stub.references ?? []) {
    if (entry.keyword_hash && entry.keywords && entry.keyword_hash !== hashKeywords(entry.keywords)) {
      errors.push(`${itemId}: stub references[${entry.ref_index}].keyword_hash is internally inconsistent`);
    }
  }

  return errors;
}

export async function verifyStubIndexSources(stub, context) {
  const errors = [];

  for (const [sourceId, metadata] of Object.entries(stub.index_sources ?? {})) {
    if (!context.indexAvailability.get(sourceId)) {
      continue;
    }

    const index = await context.getIndex(sourceId);
    if (metadata.page_count !== index.page_count) {
      errors.push(
        `${stub.item_id}: stub index_sources.${sourceId}.page_count is ${metadata.page_count}; current index has ${index.page_count} (regenerate stubs after PDF/index update)`,
      );
    }
  }

  return errors;
}

export async function exportVerificationStubs(allItems, context, { check = false, force = false } = {}) {
  const stubsRoot = path.join(ROOT_DIR, STUBS_DIR);
  await fs.mkdir(stubsRoot, { recursive: true });

  const expectedIds = new Set();
  const changes = [];

  for (const { item } of allItems) {
    if (!item?.id) {
      continue;
    }

    expectedIds.add(item.id);
    const stub = await buildStubForItem(item, context);
    const stubPath = path.join(stubsRoot, `${item.id}.json`);
    const nextContent = stableStubJson(stub);

    let existingContent = null;
    try {
      existingContent = await fs.readFile(stubPath, 'utf8');
    } catch {
      existingContent = null;
    }

    if (existingContent === nextContent) {
      continue;
    }

    const changeKind = existingContent ? 'modified' : 'created';
    if (check || (!force && existingContent !== null)) {
      changes.push({ itemId: item.id, kind: changeKind });
      continue;
    }

    await fs.writeFile(stubPath, nextContent);
    changes.push({ itemId: item.id, kind: changeKind });
  }

  const existingFiles = await fs.readdir(stubsRoot);
  for (const filename of existingFiles) {
    if (!filename.endsWith('.json')) {
      continue;
    }

    const itemId = filename.replace(/\.json$/, '');
    if (expectedIds.has(itemId)) {
      continue;
    }

    const orphanPath = path.join(stubsRoot, filename);
    if (check || !force) {
      changes.push({ itemId, kind: 'orphan' });
      continue;
    }

    await fs.unlink(orphanPath);
    changes.push({ itemId, kind: 'removed' });
  }

  return { changes, failed: changes.length > 0 && (check || (!force && changes.some((entry) => entry.kind === 'modified' || entry.kind === 'orphan'))) };
}

export async function validateVerificationStubs(allItems, context) {
  const stubsRoot = path.join(ROOT_DIR, STUBS_DIR);
  const errors = [];
  const seenStubIds = new Set();

  for (const { item, location } of allItems) {
    if (!item?.id) {
      continue;
    }

    const stubPath = path.join(stubsRoot, `${item.id}.json`);
    let raw;
    try {
      raw = await fs.readFile(stubPath, 'utf8');
    } catch {
      errors.push(`${location.file} :: ${item.id}: missing verification stub at ${STUBS_DIR}/${item.id}.json (run: npm run reference:export-stubs)`);
      continue;
    }

    let stub;
    try {
      stub = JSON.parse(raw);
    } catch (error) {
      errors.push(`${STUBS_DIR}/${item.id}.json: invalid JSON (${error.message})`);
      continue;
    }

    seenStubIds.add(item.id);
    errors.push(...compareStubToItem(stub, item));
    errors.push(...(await verifyStubIndexSources(stub, context)));
  }

  let existingFiles = [];
  try {
    existingFiles = await fs.readdir(stubsRoot);
  } catch {
    existingFiles = [];
  }

  for (const filename of existingFiles) {
    if (!filename.endsWith('.json')) {
      continue;
    }

    const itemId = filename.replace(/\.json$/, '');
    if (!seenStubIds.has(itemId)) {
      errors.push(`${STUBS_DIR}/${filename}: orphan stub with no matching bank item`);
    }
  }

  return errors;
}
