import {
  formatPercent,
} from './lib.mjs';

export function printValidationReport({
  mode = 'full',
  schema,
  bankFiles,
  excludedEntries,
  allItems,
  parsingErrors,
  fileLevelErrors,
  schemaErrors,
  integrityErrors,
  referenceErrors,
  referenceWarnings = [],
  coverageWarnings,
  coverage,
  strictMode,
}) {
  const hardFailureCount =
    parsingErrors.length +
    fileLevelErrors.length +
    (mode === 'references-only' ? 0 : schemaErrors.length) +
    (mode === 'references-only' ? 0 : integrityErrors.length) +
    referenceErrors.length;
  const strictFailureCount = strictMode ? coverageWarnings.length : 0;
  const passed = hardFailureCount === 0 && strictFailureCount === 0;

  const modeLabel =
    mode === 'ci'
      ? 'CI subset'
      : mode === 'references-only'
        ? 'references only'
        : 'full (local)';

  console.log(`Question bank validation ${passed ? 'PASSED' : 'FAILED'} — ${modeLabel}${strictMode ? ' + strict coverage' : ''}`);
  console.log('');

  if (mode === 'ci') {
    console.log('CI note: this run verifies schema, integrity, reference format, and indexed content where CI built an index (OPTN policies).');
    console.log('Textbook anchor content requires local `npm run reference:index && npm run validate` before merge.');
    console.log('Future: committed verification stubs (`docs/reference/verification-stubs/README.md`) will hard-fail textbook content in CI.');
    console.log('');
  }

  if (mode === 'references-only') {
    console.log('References-only mode: schema, integrity, and coverage checks skipped.');
    console.log('');
  }

  console.log('Inputs');
  console.log(`- Schema: ${schema.title ?? 'question schema'}`);
  console.log(`- Bank files loaded: ${bankFiles.length}`);
  console.log(`- Files skipped under _-prefixed paths: ${excludedEntries.length}`);
  console.log(`- Items evaluated: ${allItems.length}`);
  if (coverage) {
    console.log(`- Reviewed items: ${coverage.reviewedCount}`);
    console.log(`- Draft items: ${coverage.draftCount}`);
  }
  console.log(`- Validation mode: ${mode}`);
  console.log(`- Coverage mode: ${strictMode ? 'strict (warnings fail)' : 'default (warnings informational)'}`);
  console.log('');

  if (excludedEntries.length > 0) {
    console.log(`Skipped paths: ${excludedEntries.join(', ')}`);
    console.log('');
  }

  printSection('Hard failures', [
    ...parsingErrors,
    ...fileLevelErrors,
    ...(mode === 'references-only' ? [] : schemaErrors),
    ...(mode === 'references-only' ? [] : integrityErrors),
    ...referenceErrors,
  ]);

  printSection('Reference skips (CI — no local index)', referenceWarnings);

  if (coverage) {
    printGapTable('Bank progress', [
      {
        area: 'Total bank',
        current: `${coverage.draftCount} draft, ${coverage.reviewedCount} reviewed (${coverage.totalCount} total)`,
        target: `~${coverage.statusSummary.reviewedTarget} reviewed (planning)`,
        gap: String(coverage.statusSummary.reviewedGap),
      },
      ...coverage.domainCoverage.map((row) => ({
        area: `Domain ${row.id}`,
        current: `${row.total} total (${row.reviewed} reviewed, ${row.draft} draft)`,
        target: String(row.target),
        gap: String(row.gap),
      })),
    ]);

    printTaskDepthTable('Per-task depth (all bank items vs blueprint targets)', coverage.taskCoverage);
    printAgeTable('Recipient age mix', coverage.ageSummary);
    printCognitiveTable('Cognitive distribution (reviewed / all bank)', coverage.cognitiveSummary);
    printOrganTable('Organ distribution (reviewed / all bank)', coverage.organSummary);
    printInfrastructureTable('Reference infrastructure', coverage.infrastructure);

    printCoverageTable('2026-07 domain coverage (reviewed only)', coverage.domainCoverage);
    printCoverageTable('Legacy section coverage (reviewed only)', coverage.legacyCoverage);
    printDomainProgressTable('Review progress by domain', coverage.reviewedByDomain, coverage.draftByDomain);
    printSection('Coverage warnings', coverageWarnings);
  }

  console.log('Summary');
  console.log(`- Schema violations: ${mode === 'references-only' ? 'skipped' : schemaErrors.length}`);
  console.log(`- Integrity violations: ${mode === 'references-only' ? 'skipped' : integrityErrors.length}`);
  console.log(`- Reference violations: ${referenceErrors.length}`);
  console.log(`- Reference CI skips: ${referenceWarnings.length}`);
  if (coverage) {
    console.log(`- Coverage warnings: ${coverageWarnings.length}${strictMode ? ' (treated as failures)' : ''}`);
  }
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

function printGapTable(title, rows) {
  console.log(title);
  for (const row of rows) {
    console.log(`- ${row.area}: current ${row.current}; target ${row.target}; gap ${row.gap}`);
  }
  console.log('');
}

function printTaskDepthTable(title, rows) {
  console.log(title);
  const shallow = rows.filter((row) => row.count > 0 && row.count < row.target);
  const empty = rows.filter((row) => row.count === 0);
  console.log(`- Tasks with items: ${rows.filter((row) => row.count > 0).length}/${rows.length}`);
  console.log(`- Tasks below target depth: ${shallow.length}`);
  console.log(`- Tasks with zero items: ${empty.length}`);
  for (const row of rows.filter((entry) => entry.count < entry.target).slice(0, 12)) {
    console.log(`- ${row.code}: ${row.count}/${row.target} (${row.name}); gap ${row.gap}`);
  }
  if (rows.filter((entry) => entry.count < entry.target).length > 12) {
    console.log(`- … and ${rows.filter((entry) => entry.count < entry.target).length - 12} more under-target task(s)`);
  }
  console.log('');
}

function printAgeTable(title, counts) {
  console.log(title);
  console.log(`- adult: ${counts.adult}`);
  console.log(`- pediatric: ${counts.pediatric}`);
  console.log(`- both: ${counts.both}`);
  console.log('');
}

function printCoverageTable(title, rows) {
  console.log(title);
  for (const row of rows) {
    const reviewed = row.reviewed ?? row.available ?? 0;
    console.log(`- ${row.id}: ${reviewed}/${row.target} reviewed (${row.name}); gap ${row.gap}`);
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
    console.log(
      `- ${row.level}: reviewed ${row.reviewedCount} (${formatPercent(row.reviewedShare)}) | bank ${row.bankCount} (${formatPercent(row.bankShare)}) | target ${formatPercent(row.targetShare)}`,
    );
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
    console.log(
      `- ${row.organ}: reviewed ${row.reviewedCount} vs expected ${row.expectedReviewed.toFixed(1)} | bank ${row.bankCount} | blueprint target ${row.targetCount}/150`,
    );
  }
  console.log('');
}

function printInfrastructureTable(title, infrastructure) {
  console.log(title);
  for (const row of infrastructure.referenceSources) {
    console.log(
      `- ${row.source_id}: pdf ${row.pdfPresent ? 'present' : 'missing'}; index ${row.indexed ? 'built' : 'missing'} (${row.indexPath})`,
    );
  }
  console.log(`- examples file excluded from bank: ${infrastructure.examplesFileExcludedFromBank ? 'present' : 'missing'}`);
  console.log(`- NATCO Clinician's Guide PDF indexed: ${infrastructure.natcoPdfPresent ? 'yes' : 'no (not in sources manifest yet)'}`);
  console.log('');
}
