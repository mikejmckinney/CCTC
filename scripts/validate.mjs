#!/usr/bin/env node

import process from 'node:process';
import {
  buildLegacySectionIds,
  buildTaskDomainMap,
  loadQuestionItems,
  loadValidationInputs,
} from './validate/00-load-bank.mjs';
import { validateSchemaForItems } from './validate/10-schema.mjs';
import { validateIntegrityForItems } from './validate/20-integrity.mjs';
import { validateReferencesForItems } from './validate/30-references.mjs';
import { buildCoverageReport } from './validate/40-coverage.mjs';
import { printValidationReport } from './validate/90-report.mjs';
import { filterItems, parseCliFlags, resolveValidationMode } from './validate/lib.mjs';

async function main() {
  const flags = parseCliFlags();
  const mode = resolveValidationMode(flags);
  const { schema, newBlueprint, legacyBlueprint, bankFiles, excludedEntries } = await loadValidationInputs();
  const { allItems: loadedItems, parsingErrors, fileLevelErrors } = await loadQuestionItems(bankFiles);
  const allItems = filterItems(loadedItems, flags.itemFilter);

  const schemaErrors = [];
  const integrityErrors = [];
  const coverageWarnings = [];
  const referenceWarnings = [];

  const taskToDomain = buildTaskDomainMap(newBlueprint);
  const legacySectionIds = buildLegacySectionIds(legacyBlueprint);

  if (mode !== 'references-only') {
    validateSchemaForItems(allItems, schema, schemaErrors);
    validateIntegrityForItems(allItems, taskToDomain, legacySectionIds, integrityErrors);
  }

  const requireFullIndex = mode === 'full' || mode === 'references-only';
  const { errors: referenceErrors, context } = await validateReferencesForItems(allItems, {
    allowMissingIndex: !requireFullIndex,
    referenceWarnings,
  });

  const coverage =
    mode === 'references-only'
      ? null
      : await buildCoverageReport(allItems, newBlueprint, legacyBlueprint, context, coverageWarnings);

  printValidationReport({
    mode,
    schema,
    bankFiles,
    excludedEntries,
    allItems,
    parsingErrors,
    fileLevelErrors,
    schemaErrors,
    integrityErrors,
    referenceErrors,
    referenceWarnings,
    coverageWarnings,
    coverage,
    strictMode: flags.strict,
  });

  const hardFailures = [
    ...parsingErrors,
    ...fileLevelErrors,
    ...(mode === 'references-only' ? [] : schemaErrors),
    ...(mode === 'references-only' ? [] : integrityErrors),
    ...referenceErrors,
  ];

  if (hardFailures.length > 0 || (flags.strict && coverageWarnings.length > 0)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error?.stack ?? error?.message ?? String(error));
  process.exitCode = 1;
});
