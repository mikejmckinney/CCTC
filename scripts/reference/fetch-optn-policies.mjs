#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { OPTN_POLICIES_PUBLIC_URL } from '../lib/reference-index.mjs';

const ROOT_DIR = process.cwd();
const OUTPUT_PATH = path.join(ROOT_DIR, 'docs/reference/optn-policies.pdf');

const DOWNLOAD_URLS = [
  OPTN_POLICIES_PUBLIC_URL,
  'https://optn.transplant.hrsa.gov/media/eavh5bf3/optn_policies.pdf',
];

async function main() {
  let lastError = null;

  for (const url of DOWNLOAD_URLS) {
    try {
      console.log(`Fetching ${url} ...`);
      const response = await fetch(url, {
        headers: {
          Accept: 'application/pdf,*/*',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://www.hrsa.gov/optn/policies-bylaws/policies',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.subarray(0, 5).toString('utf8').startsWith('%PDF-')) {
        throw new Error('Response was not a PDF (likely blocked by bot protection)');
      }

      await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
      await fs.writeFile(OUTPUT_PATH, buffer);
      console.log(`Wrote ${path.relative(ROOT_DIR, OUTPUT_PATH)} (${buffer.length} bytes)`);
      console.log('Next: npm run reference:index -- optn-policies');
      return;
    } catch (error) {
      lastError = error;
      console.warn(`  failed: ${error.message}`);
    }
  }

  console.error('');
  console.error('Could not download the OPTN policies PDF automatically.');
  console.error('Download manually in a browser and save to:');
  console.error(`  ${OUTPUT_PATH}`);
  console.error(`Canonical URL: ${OPTN_POLICIES_PUBLIC_URL}`);
  console.error('');
  console.error(lastError?.message ?? 'Unknown error');
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error?.stack ?? error?.message ?? String(error));
  process.exitCode = 1;
});
