#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  buildSourceIndex,
  getPageText,
  loadManifest,
  loadSourceIndex,
  resolveIndexPath,
  searchIndex,
} from './lib/reference-index.mjs';

const ROOT_DIR = process.cwd();

async function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'index':
      await buildAllIndexes(args[0]);
      break;
    case 'search':
      await searchCommand(args);
      break;
    case 'page':
      await pageCommand(args);
      break;
    default:
      printUsage();
      process.exitCode = command ? 1 : 0;
  }
}

async function buildAllIndexes(onlySourceId) {
  const manifest = await loadManifest();
  const indexDir = path.join(ROOT_DIR, manifest.index_dir);
  await fs.mkdir(indexDir, { recursive: true });

  const sources = onlySourceId
    ? manifest.sources.filter((source) => source.id === onlySourceId)
    : manifest.sources;

  if (onlySourceId && sources.length === 0) {
    throw new Error(`Unknown source_id "${onlySourceId}"`);
  }

  for (const source of sources) {
    const pdfPath = path.join(ROOT_DIR, 'docs/reference', source.filename);
    try {
      await fs.access(pdfPath);
    } catch {
      console.warn(`Skipping ${source.id}: missing ${source.filename}`);
      continue;
    }

    console.log(`Indexing ${source.id} (${source.filename})...`);
    const index = await buildSourceIndex(source);
    const outPath = resolveIndexPath(manifest, source.id);
    await fs.writeFile(outPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
    console.log(`  wrote ${path.relative(ROOT_DIR, outPath)} (${index.page_count} pages)`);
  }
}

async function searchCommand(args) {
  const sourceId = args[0];
  const query = args.slice(1).join(' ');
  if (!sourceId || !query) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const index = await loadSourceIndex(sourceId);
  const hits = searchIndex(index, query, { limit: 15 });
  if (hits.length === 0) {
    console.log(`No hits in ${sourceId} for: ${query}`);
    return;
  }

  for (const hit of hits) {
    const chapter = hit.chapter ? ` ch.${hit.chapter}` : '';
    const policy = hit.policy ? ` policy ${hit.policy}` : '';
    console.log(
      `PDF p.${hit.pdf_page}${policy}${chapter}  score=${hit.score.toFixed(2)}  ${hit.snippet}`,
    );
  }
}

async function pageCommand(args) {
  const sourceId = args[0];
  const pdfPage = Number.parseInt(args[1], 10);
  if (!sourceId || !Number.isInteger(pdfPage) || pdfPage < 1) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const index = await loadSourceIndex(sourceId);
  const text = getPageText(index, pdfPage);
  if (!text) {
    console.error(`Page ${pdfPage} not found in ${sourceId} index`);
    process.exitCode = 1;
    return;
  }

  const page = index.pages.find((entry) => entry.pdf_page === pdfPage);
  const policyLabel = page?.policy ? ` policy ${page.policy}` : '';
  const chapterLabel = page?.chapter ? ` ch.${page.chapter}` : '';
  console.log(`# ${sourceId} PDF p.${pdfPage}${policyLabel}${chapterLabel}`);
  if (index.public_url) {
    console.log(`# public: ${index.public_url}#page=${pdfPage}`);
  }
  console.log('');
  console.log(text);
}

function printUsage() {
  console.log(`Usage:
  npm run reference:index [-- <source_id>]
  npm run reference:search -- <source_id> <query words>
  npm run reference:page -- <source_id> <pdf_page>
  npm run reference:fetch-optn

Examples:
  npm run reference:index
  npm run reference:search -- cupples "urgent matters infection"
  npm run reference:page -- cupples 111
  npm run reference:fetch-optn
  npm run reference:search -- optn-policies "Policy 18.3 refusal"`);
}

main().catch((error) => {
  console.error(error?.stack ?? error?.message ?? String(error));
  process.exitCode = 1;
});
