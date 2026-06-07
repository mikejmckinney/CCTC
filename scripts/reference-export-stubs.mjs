#!/usr/bin/env node

import process from 'node:process';
import { loadQuestionItems, loadValidationInputs } from './validate/00-load-bank.mjs';
import { validateReferencesForItems } from './validate/30-references.mjs';
import { exportVerificationStubs, STUBS_DIR } from './lib/verification-stubs.mjs';
import { filterItems, parseCliFlags } from './validate/lib.mjs';

function printUsage() {
  console.log(`Usage: npm run reference:export-stubs [-- --check] [-- --force]

  Writes ${STUBS_DIR}/<item-id>.json after full reference validation passes.

  --check   Fail if stubs would change (no writes)
  --force   Overwrite changed stubs and remove orphan stubs
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const check = args.includes('--check');
  const force = args.includes('--force');
  const flags = parseCliFlags();
  const { bankFiles } = await loadValidationInputs();
  const { allItems: loadedItems, parsingErrors, fileLevelErrors } = await loadQuestionItems(bankFiles);
  const allItems = filterItems(loadedItems, flags.itemFilter);

  if (parsingErrors.length > 0 || fileLevelErrors.length > 0) {
    for (const message of [...parsingErrors, ...fileLevelErrors]) {
      console.error(message);
    }
    process.exit(1);
  }

  const referenceWarnings = [];
  const { errors, context } = await validateReferencesForItems(allItems, {
    allowMissingIndex: false,
    referenceWarnings,
  });

  if (errors.length > 0) {
    console.error('Reference validation failed; fix errors before exporting stubs:\n');
    for (const message of errors) {
      console.error(`  ${message}`);
    }
    process.exit(1);
  }

  const { changes, failed } = await exportVerificationStubs(allItems, context, { check, force });

  if (changes.length === 0) {
    console.log(`Verification stubs are up to date (${allItems.length} item(s)).`);
    process.exit(0);
  }

  for (const change of changes) {
    if (check) {
      console.log(`  would ${change.kind} ${STUBS_DIR}/${change.itemId}.json`);
      continue;
    }

    if (change.kind === 'removed') {
      console.log(`  removed ${STUBS_DIR}/${change.itemId}.json`);
      continue;
    }

    console.log(`  wrote ${STUBS_DIR}/${change.itemId}.json`);
  }

  if (failed) {
    console.error(
      check
        ? '\nStub export check failed. Run `npm run reference:export-stubs -- --force` after intentional anchor changes.'
        : '\nStub export refused to overwrite existing stubs. Re-run with `--force` to update committed stubs.',
    );
    process.exit(1);
  }

  console.log(`\nExported ${changes.length} verification stub change(s) to ${STUBS_DIR}/.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
