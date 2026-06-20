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
import { createReferenceVerificationContext } from './lib/verify-references.mjs';
import { buildCoverageReport } from './validate/40-coverage.mjs';
import { buildScenarioCompanionSummary, validateScenarioCompanions } from './validate/25-scenario-companions.mjs';
import { printValidationReport } from './validate/90-report.mjs';
import { filterItems, parseCliFlags, resolveValidationMode } from './validate/lib.mjs';

async function main() {
  const flags = parseCliFlags();
  const mode = resolveValidationMode(flags);
  const { schema, newBlueprint, legacyBlueprint, bankFiles, scenarioBankFiles, excludedEntries } =
    await loadValidationInputs();
  const { allItems: loadedStandardItems, parsingErrors, fileLevelErrors } = await loadQuestionItems(bankFiles);
  const { allItems: loadedScenarioItems, parsingErrors: scenarioParsingErrors, fileLevelErrors: scenarioFileErrors } =
    await loadQuestionItems(scenarioBankFiles);
  const standardItems = filterItems(loadedStandardItems, flags.itemFilter);
  const scenarioItems = filterItems(loadedScenarioItems, flags.itemFilter);
  const allItems = [...standardItems, ...scenarioItems];
  parsingErrors.push(...scenarioParsingErrors);
  fileLevelErrors.push(...scenarioFileErrors);

  const schemaErrors = [];
  const integrityErrors = [];
  const coverageWarnings = [];
  const referenceWarnings = [];

  const taskToDomain = buildTaskDomainMap(newBlueprint);
  const legacySectionIds = buildLegacySectionIds(legacyBlueprint);

  if (mode !== 'references-only' && !flags.coverageOnly) {
    validateSchemaForItems(allItems, schema, schemaErrors);
    validateIntegrityForItems(allItems, taskToDomain, legacySectionIds, integrityErrors);
    validateScenarioCompanions(scenarioItems, standardItems, integrityErrors, coverageWarnings);
  }

  const requireFullIndex = mode === 'full' || mode === 'references-only';
  let referenceErrors = [];
  let context = { manifest: null, indexAvailability: new Map() };

  if (!flags.coverageOnly) {
    const referenceResult = await validateReferencesForItems(allItems, {
      allowMissingIndex: !requireFullIndex,
      referenceWarnings,
    });
    referenceErrors = referenceResult.errors;
    context = referenceResult.context;
  } else {
    context = await createReferenceVerificationContext({ allowMissingIndex: true, referenceWarnings });
  }

  const scenarioCompanionSummary =
    mode === 'references-only' ? null : buildScenarioCompanionSummary(scenarioItems, standardItems);

  const coverage =
    mode === 'references-only'
      ? null
      : await buildCoverageReport(standardItems, newBlueprint, legacyBlueprint, context, coverageWarnings);

  printValidationReport({
    mode: flags.coverageOnly ? 'full' : mode,
    coverageOnly: flags.coverageOnly,
    schema,
    bankFiles,
    scenarioBankFiles,
    excludedEntries,
    allItems,
    scenarioCompanionSummary,
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
    ...(flags.coverageOnly || mode === 'references-only' ? [] : schemaErrors),
    ...(flags.coverageOnly || mode === 'references-only' ? [] : integrityErrors),
    ...(flags.coverageOnly ? [] : referenceErrors),
  ];

  if (hardFailures.length > 0 || (flags.strict && coverageWarnings.length > 0)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error?.stack ?? error?.message ?? String(error));
  process.exitCode = 1;
});
