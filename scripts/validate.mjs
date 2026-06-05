#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT_DIR = process.cwd();
const QUESTIONS_DIR = path.join(ROOT_DIR, 'questions');
const STRICT_MODE = process.argv.includes('--strict');
const REVIEWED_TARGET = 500;
const MIN_SAMPLE_FOR_DISTRIBUTION_WARNINGS = 20;

async function main() {
  const schema = await readJson('schema/question.schema.json');
  const newBlueprint = await readJson('blueprints/cctc-from-2026-07.json');
  const legacyBlueprint = await readJson('blueprints/cctc-thru-2026-06.json');

  const bankFiles = [];
  const excludedEntries = [];
  await collectQuestionFiles(QUESTIONS_DIR, bankFiles, excludedEntries);

  const parsingErrors = [];
  const fileLevelErrors = [];
  const schemaErrors = [];
  const integrityErrors = [];
  const coverageWarnings = [];

  const taskToDomain = buildTaskDomainMap(newBlueprint);
  const legacySectionIds = new Set(
    (legacyBlueprint.sections ?? []).flatMap((section) =>
      (section.subsections ?? []).map((subsection) => subsection.id),
    ),
  );
  const allItems = [];

  for (const relativeFile of bankFiles) {
    let parsed;
    try {
      parsed = await readJson(relativeFile);
    } catch (error) {
      parsingErrors.push(`${relativeFile}: ${error.message}`);
      continue;
    }

    if (!Array.isArray(parsed)) {
      fileLevelErrors.push(`${relativeFile}: question bank files must contain a top-level JSON array`);
      continue;
    }

    parsed.forEach((item, index) => {
      const location = {
        file: relativeFile,
        itemIndex: index,
        itemId:
          typeof item === 'object' && item !== null && typeof item.id === 'string'
            ? item.id
            : `<unknown id at index ${index}>`,
      };
      validateSchema(item, schema, '$', schemaErrors, location);
      allItems.push({ item, location });
    });
  }

  validateIntegrity(allItems, taskToDomain, legacySectionIds, integrityErrors);
  const coverage = buildCoverageReport(allItems, newBlueprint, legacyBlueprint, coverageWarnings);

  const hardFailures = [
    ...parsingErrors,
    ...fileLevelErrors,
    ...schemaErrors,
    ...integrityErrors,
  ];

  printSummary({
    schema,
    bankFiles,
    excludedEntries,
    allItems,
    parsingErrors,
    fileLevelErrors,
    schemaErrors,
    integrityErrors,
    coverageWarnings,
    coverage,
  });

  if (hardFailures.length > 0 || (STRICT_MODE && coverageWarnings.length > 0)) {
    process.exitCode = 1;
  }
}

async function collectQuestionFiles(currentDir, bankFiles, excludedEntries) {
  let entries = [];
  try {
    entries = await fs.readdir(currentDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    const relativePath = path.relative(ROOT_DIR, absolutePath).replaceAll(path.sep, '/');

    if (entry.name.startsWith('_')) {
      excludedEntries.push(relativePath + (entry.isDirectory() ? '/' : ''));
      continue;
    }

    if (entry.isDirectory()) {
      await collectQuestionFiles(absolutePath, bankFiles, excludedEntries);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.json')) {
      bankFiles.push(relativePath);
    }
  }
}

async function readJson(relativePath) {
  const absolutePath = path.join(ROOT_DIR, relativePath);
  const raw = await fs.readFile(absolutePath, 'utf8');
  return JSON.parse(raw);
}

function buildTaskDomainMap(blueprint) {
  const map = new Map();
  for (const domain of blueprint.domains ?? []) {
    for (const task of domain.tasks ?? []) {
      map.set(task.code, domain.id);
    }
  }
  return map;
}

function validateSchema(value, schema, valuePath, errors, location) {
  const localErrors = [];
  collectSchemaErrors(value, schema, valuePath, localErrors);
  for (const error of localErrors) {
    errors.push(formatItemError(location, error));
  }
}

function collectSchemaErrors(value, schema, valuePath, errors) {
  if (!schema || typeof schema !== 'object') {
    return;
  }

  if (Array.isArray(schema.allOf)) {
    for (const nestedSchema of schema.allOf) {
      collectSchemaErrors(value, nestedSchema, valuePath, errors);
    }
  }

  if (schema.if && schema.then && matchesSchema(value, schema.if)) {
    collectSchemaErrors(value, schema.then, valuePath, errors);
  }

  if (schema.const !== undefined && !Object.is(value, schema.const)) {
    errors.push(`${valuePath} must equal ${JSON.stringify(schema.const)}`);
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => Object.is(candidate, value))) {
    errors.push(`${valuePath} must be one of ${schema.enum.map((candidate) => JSON.stringify(candidate)).join(', ')}`);
  }

  if (schema.type) {
    const typeError = validateType(value, schema.type, valuePath);
    if (typeError) {
      errors.push(typeError);
      return;
    }
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${valuePath} must have length >= ${schema.minLength}`);
    }
    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push(`${valuePath} must match pattern ${schema.pattern}`);
      }
    }
    if (schema.format === 'uri' && !isAbsoluteUrl(value)) {
      errors.push(`${valuePath} must be a well-formed absolute URL`);
    }
    if (schema.format === 'date' && !isDateString(value)) {
      errors.push(`${valuePath} must be a valid YYYY-MM-DD date`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${valuePath} must contain at least ${schema.minItems} item(s)`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${valuePath} must contain no more than ${schema.maxItems} item(s)`);
    }
    if (schema.items) {
      value.forEach((child, index) => {
        collectSchemaErrors(child, schema.items, `${valuePath}[${index}]`, errors);
      });
    }
  }

  if (isPlainObject(value)) {
    const properties = schema.properties ?? {};
    const required = schema.required ?? [];

    for (const key of required) {
      if (!(key in value)) {
        errors.push(`${valuePath}.${key} is required`);
      }
    }

    for (const [key, child] of Object.entries(value)) {
      if (properties[key]) {
        collectSchemaErrors(child, properties[key], `${valuePath}.${key}`, errors);
        continue;
      }

      if (schema.additionalProperties === false) {
        errors.push(`${valuePath}.${key} is not allowed`);
        continue;
      }

      if (isPlainObject(schema.additionalProperties)) {
        collectSchemaErrors(child, schema.additionalProperties, `${valuePath}.${key}`, errors);
      }
    }
  }
}

function matchesSchema(value, schema) {
  const errors = [];
  collectSchemaErrors(value, schema, '$', errors);
  return errors.length === 0;
}

function validateType(value, expectedType, valuePath) {
  switch (expectedType) {
    case 'array':
      return Array.isArray(value) ? null : `${valuePath} must be an array`;
    case 'object':
      return isPlainObject(value) ? null : `${valuePath} must be an object`;
    case 'string':
      return typeof value === 'string' ? null : `${valuePath} must be a string`;
    case 'integer':
      return Number.isInteger(value) ? null : `${valuePath} must be an integer`;
    case 'boolean':
      return typeof value === 'boolean' ? null : `${valuePath} must be a boolean`;
    default:
      return null;
  }
}

function validateIntegrity(allItems, taskToDomain, legacySectionIds, errors) {
  const seenIds = new Map();

  for (const { item, location } of allItems) {
    if (!isPlainObject(item)) {
      continue;
    }

    if (typeof item.id === 'string') {
      const locations = seenIds.get(item.id) ?? [];
      locations.push(location);
      seenIds.set(item.id, locations);
    }

    validateItemIntegrity(item, location, taskToDomain, legacySectionIds, errors);
  }

  for (const [itemId, locations] of seenIds.entries()) {
    if (locations.length <= 1) {
      continue;
    }

    for (const location of locations) {
      const others = locations
        .filter((candidate) => candidate !== location)
        .map((candidate) => `${candidate.file}#${candidate.itemIndex + 1}`)
        .join(', ');
      errors.push(`${location.file} :: ${itemId}: duplicate item id also present in ${others}`);
    }
  }
}

function validateItemIntegrity(item, location, taskToDomain, legacySectionIds, errors) {
  const optionIds = Array.isArray(item.options)
    ? item.options
        .filter((option) => isPlainObject(option) && typeof option.id === 'string')
        .map((option) => option.id)
    : [];

  const correctMatches = optionIds.filter((optionId) => optionId === item.correct).length;
  if (correctMatches !== 1) {
    errors.push(formatItemError(location, `$.correct must match exactly one existing option id; found ${correctMatches}`));
  }

  const rationaleIncorrect = isPlainObject(item.explanation?.rationale_incorrect)
    ? item.explanation.rationale_incorrect
    : {};
  const nonCorrectOptionIds = optionIds.filter((optionId) => optionId !== item.correct);

  for (const optionId of nonCorrectOptionIds) {
    if (!(optionId in rationaleIncorrect)) {
      errors.push(formatItemError(location, `$.explanation.rationale_incorrect is missing an entry for option ${optionId}`));
    }
  }

  for (const rationaleOptionId of Object.keys(rationaleIncorrect)) {
    if (rationaleOptionId === item.correct) {
      errors.push(formatItemError(location, `$.explanation.rationale_incorrect must not include the correct option ${item.correct}`));
      continue;
    }
    if (!nonCorrectOptionIds.includes(rationaleOptionId)) {
      errors.push(formatItemError(location, `$.explanation.rationale_incorrect includes unknown option ${rationaleOptionId}`));
    }
  }

  if (item.type === 'complex_combo') {
    const elementIds = new Set(
      Array.isArray(item.elements)
        ? item.elements
            .filter((element) => isPlainObject(element) && typeof element.id === 'string')
            .map((element) => element.id)
        : [],
    );

    if (item.shuffle !== false) {
      errors.push(formatItemError(location, '$.shuffle must be false for complex_combo items'));
    }

    (item.options ?? []).forEach((option, optionIndex) => {
      if (!Array.isArray(option?.selects)) {
        return;
      }
      for (const selectedElement of option.selects) {
        if (!elementIds.has(selectedElement)) {
          errors.push(
            formatItemError(location, `$.options[${optionIndex}].selects references undefined element ${selectedElement}`),
          );
        }
      }
    });
  }

  if (!Array.isArray(item.references) || item.references.length === 0) {
    errors.push(formatItemError(location, '$.references must contain at least one entry'));
  }

  (item.references ?? []).forEach((reference, index) => {
    if (reference?.url !== undefined && !isAbsoluteUrl(reference.url)) {
      errors.push(formatItemError(location, `$.references[${index}].url must be a well-formed absolute URL`));
    }
  });

  if (item.task !== undefined) {
    const expectedDomain = taskToDomain.get(item.task);
    if (expectedDomain === undefined) {
      errors.push(formatItemError(location, `$.task ${item.task} is not present in blueprints/cctc-from-2026-07.json`));
    }

    const taskDomainPrefix = Number.parseInt(String(item.task).slice(0, 2), 10);
    if (Number.isInteger(taskDomainPrefix) && item.domain !== taskDomainPrefix) {
      errors.push(formatItemError(location, `$.domain ${item.domain} does not match the domain prefix for task ${item.task}`));
    }

    if (expectedDomain !== undefined && item.domain !== expectedDomain) {
      errors.push(
        formatItemError(location, `$.domain ${item.domain} does not match blueprint task ${item.task} (domain ${expectedDomain})`),
      );
    }
  }

  if (Array.isArray(item.knowledge_codes)) {
    const domainPrefix = String(item.domain).padStart(2, '0');
    for (const knowledgeCode of item.knowledge_codes) {
      if (!String(knowledgeCode).startsWith(domainPrefix)) {
        errors.push(
          formatItemError(location, `$.knowledge_codes entry ${knowledgeCode} does not share domain prefix ${domainPrefix}`),
        );
      }
    }
  }

  if (item.legacy_section !== undefined && !legacySectionIds.has(item.legacy_section)) {
    errors.push(
      formatItemError(location, `$.legacy_section ${item.legacy_section} is not present in blueprints/cctc-thru-2026-06.json`),
    );
  }
}

function buildCoverageReport(allItems, newBlueprint, legacyBlueprint, warnings) {
  const reviewedItems = allItems.filter(({ item }) => isPlainObject(item) && item.status === 'reviewed');
  const draftItems = allItems.filter(({ item }) => isPlainObject(item) && item.status === 'draft');

  const reviewedByDomain = new Map((newBlueprint.domains ?? []).map((domain) => [domain.id, 0]));
  const draftByDomain = new Map((newBlueprint.domains ?? []).map((domain) => [domain.id, 0]));

  for (const { item } of reviewedItems) {
    reviewedByDomain.set(item.domain, (reviewedByDomain.get(item.domain) ?? 0) + 1);
  }
  for (const { item } of draftItems) {
    draftByDomain.set(item.domain, (draftByDomain.get(item.domain) ?? 0) + 1);
  }

  const domainTolerance = newBlueprint.domain_tolerance_items ?? 0;
  const domainCoverage = (newBlueprint.domains ?? []).map((domain) => {
    const available = reviewedByDomain.get(domain.id) ?? 0;
    const gap = Math.max(domain.items - available, 0);
    if (available + domainTolerance < domain.items) {
      warnings.push(
        `[coverage:new] domain ${domain.id} (${domain.name}) has ${available} reviewed item(s); needs ${domain.items} (+/- ${domainTolerance}) to fill a 150-item exam`,
      );
    }
    return { id: domain.id, name: domain.name, available, target: domain.items, gap };
  });

  const subsectionToSection = new Map();
  for (const section of legacyBlueprint.sections ?? []) {
    for (const subsection of section.subsections ?? []) {
      subsectionToSection.set(subsection.id, section.id);
    }
  }

  const legacyTolerance = legacyBlueprint.domain_tolerance_items ?? domainTolerance;
  const legacyCounts = new Map((legacyBlueprint.sections ?? []).map((section) => [section.id, 0]));
  const unmappedReviewedItems = [];

  for (const { item, location } of reviewedItems) {
    const subsectionId = item.legacy_section ?? legacyBlueprint.crosswalk_from_new_task?.[item.task];
    const sectionId = subsectionId ? subsectionToSection.get(subsectionId) ?? subsectionId.slice(0, 1) : null;
    if (!sectionId || !legacyCounts.has(sectionId)) {
      unmappedReviewedItems.push(`${location.file} :: ${location.itemId}`);
      continue;
    }
    legacyCounts.set(sectionId, (legacyCounts.get(sectionId) ?? 0) + 1);
  }

  if (unmappedReviewedItems.length > 0) {
    warnings.push(
      `[coverage:legacy] ${unmappedReviewedItems.length} reviewed item(s) could not be mapped to a legacy section: ${unmappedReviewedItems.join(', ')}`,
    );
  }

  const legacyCoverage = (legacyBlueprint.sections ?? []).map((section) => {
    const available = legacyCounts.get(section.id) ?? 0;
    const gap = Math.max(section.items - available, 0);
    if (available + legacyTolerance < section.items) {
      warnings.push(
        `[coverage:legacy] section ${section.id} (${section.name}) has ${available} reviewed item(s); needs ${section.items} (+/- ${legacyTolerance}) to fill a 150-item exam`,
      );
    }
    return { id: section.id, name: section.name, available, target: section.items, gap };
  });

  const cognitiveSummary = summarizeCognitiveTargets(reviewedItems, newBlueprint, warnings);
  const organSummary = summarizeOrganTargets(reviewedItems, newBlueprint, warnings);

  if (reviewedItems.length < REVIEWED_TARGET) {
    warnings.push(
      `[coverage:progress] reviewed items ${reviewedItems.length}/${REVIEWED_TARGET}; bank still needs ${REVIEWED_TARGET - reviewedItems.length} reviewed item(s) to reach the planning target`,
    );
  }

  return {
    reviewedCount: reviewedItems.length,
    draftCount: draftItems.length,
    reviewedByDomain,
    draftByDomain,
    domainCoverage,
    legacyCoverage,
    cognitiveSummary,
    organSummary,
  };
}

function summarizeCognitiveTargets(reviewedItems, blueprint, warnings) {
  const targets = blueprint.cognitive_level_targets ?? {};
  const counts = new Map(Object.keys(targets).map((key) => [key, 0]));

  for (const { item } of reviewedItems) {
    if (counts.has(item.cognitive_level)) {
      counts.set(item.cognitive_level, (counts.get(item.cognitive_level) ?? 0) + 1);
    }
  }

  if (reviewedItems.length === 0) {
    warnings.push('[coverage:new] cognitive level coverage cannot be evaluated yet because there are no reviewed items');
    return [];
  }

  const threshold = Math.max(0.1, 5 / reviewedItems.length);
  const summary = [];

  for (const [level, targetShare] of Object.entries(targets)) {
    const actualCount = counts.get(level) ?? 0;
    const actualShare = actualCount / reviewedItems.length;
    const deviation = actualShare - targetShare;
    summary.push({ level, actualCount, actualShare, targetShare, deviation });
    if (reviewedItems.length >= MIN_SAMPLE_FOR_DISTRIBUTION_WARNINGS && Math.abs(deviation) > threshold) {
      warnings.push(
        `[coverage:new] cognitive level ${level} is ${formatPercent(actualShare)} vs target ${formatPercent(targetShare)} (deviation ${formatSignedPercent(deviation)})`,
      );
    }
  }

  return summary;
}

function summarizeOrganTargets(reviewedItems, blueprint, warnings) {
  const targets = blueprint.organ_targets ?? {};
  const counts = new Map(Object.keys(targets).map((key) => [key, 0]));

  for (const { item } of reviewedItems) {
    if (counts.has(item.organ)) {
      counts.set(item.organ, (counts.get(item.organ) ?? 0) + 1);
    }
  }

  if (reviewedItems.length === 0) {
    warnings.push('[coverage:new] organ coverage cannot be evaluated yet because there are no reviewed items');
    return [];
  }

  const summary = [];
  for (const [organ, targetCount] of Object.entries(targets)) {
    const targetShare = targetCount / blueprint.scored_items;
    const expectedCount = reviewedItems.length * targetShare;
    const actualCount = counts.get(organ) ?? 0;
    const delta = actualCount - expectedCount;
    summary.push({ organ, actualCount, expectedCount, delta });
    if (reviewedItems.length >= MIN_SAMPLE_FOR_DISTRIBUTION_WARNINGS && Math.abs(delta) > Math.max(3, expectedCount * 0.25)) {
      warnings.push(
        `[coverage:new] organ ${organ} has ${actualCount} reviewed item(s); expected about ${expectedCount.toFixed(1)} based on target share ${formatPercent(targetShare)}`,
      );
    }
  }

  return summary;
}

function printSummary({
  schema,
  bankFiles,
  excludedEntries,
  allItems,
  parsingErrors,
  fileLevelErrors,
  schemaErrors,
  integrityErrors,
  coverageWarnings,
  coverage,
}) {
  const hardFailureCount = parsingErrors.length + fileLevelErrors.length + schemaErrors.length + integrityErrors.length;
  const strictFailureCount = STRICT_MODE ? coverageWarnings.length : 0;
  const passed = hardFailureCount === 0 && strictFailureCount === 0;

  console.log(`Question bank validation ${passed ? 'PASSED' : 'FAILED'}${STRICT_MODE ? ' (strict mode)' : ''}`);
  console.log('');
  console.log('Inputs');
  console.log(`- Schema: ${schema.title ?? 'question schema'}`);
  console.log(`- Bank files loaded: ${bankFiles.length}`);
  console.log(`- Files skipped under _-prefixed paths: ${excludedEntries.length}`);
  console.log(`- Items evaluated: ${allItems.length}`);
  console.log(`- Reviewed items: ${coverage.reviewedCount}`);
  console.log(`- Draft items: ${coverage.draftCount}`);
  console.log(`- Coverage mode: ${STRICT_MODE ? 'strict (warnings fail)' : 'default (warnings informational)'}`);
  console.log('');

  if (excludedEntries.length > 0) {
    console.log(`Skipped paths: ${excludedEntries.join(', ')}`);
    console.log('');
  }

  printSection('Hard failures', [
    ...parsingErrors,
    ...fileLevelErrors,
    ...schemaErrors,
    ...integrityErrors,
  ]);

  printCoverageTable('2026-07 domain coverage', coverage.domainCoverage);
  printCoverageTable('Legacy section coverage', coverage.legacyCoverage);
  printDomainProgressTable('Review progress by domain', coverage.reviewedByDomain, coverage.draftByDomain);
  printCognitiveTable('2026-07 cognitive distribution', coverage.cognitiveSummary);
  printOrganTable('2026-07 organ distribution', coverage.organSummary);

  printSection('Coverage warnings', coverageWarnings);

  console.log('Summary');
  console.log(`- Schema violations: ${schemaErrors.length}`);
  console.log(`- Integrity violations: ${integrityErrors.length}`);
  console.log(`- Coverage warnings: ${coverageWarnings.length}${STRICT_MODE ? ' (treated as failures)' : ''}`);
  console.log(`- Exit code: ${passed ? 0 : 1}`);
}

function printSection(title, entries) {
  console.log(title);
  if (entries.length === 0) {
    console.log('- none');
    console.log('');
    return;
  }
  for (const entry of entries) {
    console.log(`- ${entry}`);
  }
  console.log('');
}

function printCoverageTable(title, rows) {
  console.log(title);
  for (const row of rows) {
    console.log(`- ${row.id}: ${row.available}/${row.target} reviewed (${row.name}); gap ${row.gap}`);
  }
  console.log('');
}

function printDomainProgressTable(title, reviewedByDomain, draftByDomain) {
  console.log(title);
  for (const [domainId, reviewedCount] of reviewedByDomain.entries()) {
    console.log(`- Domain ${domainId}: ${reviewedCount} reviewed, ${draftByDomain.get(domainId) ?? 0} draft`);
  }
  console.log('');
}

function printCognitiveTable(title, rows) {
  console.log(title);
  if (rows.length === 0) {
    console.log('- No reviewed items yet');
    console.log('');
    return;
  }
  for (const row of rows) {
    console.log(`- ${row.level}: ${row.actualCount} reviewed (${formatPercent(row.actualShare)}) vs target ${formatPercent(row.targetShare)}`);
  }
  console.log('');
}

function printOrganTable(title, rows) {
  console.log(title);
  if (rows.length === 0) {
    console.log('- No reviewed items yet');
    console.log('');
    return;
  }
  for (const row of rows) {
    console.log(`- ${row.organ}: ${row.actualCount} reviewed vs expected ${row.expectedCount.toFixed(1)}`);
  }
  console.log('');
}

function formatItemError(location, message) {
  return `${location.file} :: ${location.itemId}: ${message}`;
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAbsoluteUrl(value) {
  if (typeof value !== 'string') {
    return false;
  }
  try {
    const parsed = new URL(value);
    return Boolean(parsed.protocol && parsed.hostname);
  } catch {
    return false;
  }
}

function isDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPercent(value) {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
}

main().catch((error) => {
  console.error(error?.stack ?? error?.message ?? String(error));
  process.exitCode = 1;
});
