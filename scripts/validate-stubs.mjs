#!/usr/bin/env node

import process from 'node:process';
import { createReferenceVerificationContext } from './lib/verify-references.mjs';
import { STUBS_DIR, validateVerificationStubs } from './lib/verification-stubs.mjs';
import { loadQuestionItems, loadValidationInputs } from './validate/00-load-bank.mjs';
import { filterItems, parseCliFlags } from './validate/lib.mjs';

async function main() {
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

  const context = await createReferenceVerificationContext({ allowMissingIndex: true });
  const errors = await validateVerificationStubs(allItems, context);

  if (errors.length === 0) {
    console.log(`Verification stubs passed for ${allItems.length} item(s) in ${STUBS_DIR}/.`);
    process.exit(0);
  }

  console.error(`Verification stub validation failed (${errors.length} issue(s)):\n`);
  for (const message of errors) {
    console.error(`  ${message}`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
