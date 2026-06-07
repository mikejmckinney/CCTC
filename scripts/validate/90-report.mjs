import {
  formatPercent,
} from './lib.mjs';
import { renderTable } from './table.mjs';

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
  coverageOnly = false,
}) {
  const hardFailureCount =
    parsingErrors.length +
    fileLevelErrors.length +
    (mode === 'references-only' ? 0 : schemaErrors.length) +
    (mode === 'references-only' ? 0 : integrityErrors.length) +
    (coverageOnly ? 0 : referenceErrors.length);
  const strictFailureCount = strictMode ? coverageWarnings.length : 0;
  const passed = hardFailureCount === 0 && strictFailureCount === 0;

  const modeLabel =
    mode === 'ci'
      ? 'CI subset'
      : mode === 'references-only'
        ? 'references only'
        : coverageOnly
          ? 'coverage dashboard'
          : 'full (local)';

  console.log(`Question bank validation ${passed ? 'PASSED' : 'FAILED'} — ${modeLabel}${strictMode ? ' + strict coverage' : ''}`);
  console.log('');

  if (coverageOnly) {
    console.log('Coverage-only mode: gap tables below; run `npm run validate` for full schema/reference checks.');
    console.log('');
  } else if (mode === 'ci') {
    console.log('CI note: textbook anchor content requires local `npm run reference:index && npm run validate` before merge.');
    console.log('');
  } else if (mode === 'references-only') {
    console.log('References-only mode: schema, integrity, and coverage checks skipped.');
    console.log('');
  }

  if (!coverageOnly) {
    console.log('Inputs');
    console.log(`- Schema: ${schema.title ?? 'question schema'}`);
    console.log(`- Bank files loaded: ${bankFiles.length}`);
    console.log(`- Items evaluated: ${allItems.length}`);
    if (coverage) {
      console.log(`- Reviewed: ${coverage.reviewedCount} | Draft: ${coverage.draftCount}`);
    }
    console.log(`- Mode: ${mode}${strictMode ? ' (strict)' : ''}`);
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
  }

  if (coverage) {
    printCoverageDashboard(coverage, coverageWarnings);
  }

  if (!coverageOnly) {
    console.log('Summary');
    console.log(`- Schema violations: ${mode === 'references-only' ? 'skipped' : schemaErrors.length}`);
    console.log(`- Integrity violations: ${mode === 'references-only' ? 'skipped' : integrityErrors.length}`);
    console.log(`- Reference violations: ${referenceErrors.length}`);
    console.log(`- Reference CI skips: ${referenceWarnings.length}`);
    if (coverage) {
      console.log(`- Coverage warnings: ${coverageWarnings.length}${strictMode ? ' (treated as failures)' : ''}`);
    }
    console.log(`- Exit code: ${passed ? 0 : 1}`);
  } else if (!passed) {
    console.log(`Exit code: 1 (${strictMode ? 'coverage strict mode' : 'parse/load errors'})`);
  }
}

export function printCoverageDashboard(coverage, coverageWarnings = []) {
  console.log('Exam coverage & gaps (2026-07 blueprint)');
  console.log('');

  console.log(renderTable(
    [
      { header: 'Area', minWidth: 12, maxWidth: 14 },
      { header: 'Current', minWidth: 16, maxWidth: 28 },
      { header: 'Target', minWidth: 10, maxWidth: 22 },
      { header: 'Gap', minWidth: 4, maxWidth: 6 },
    ],
    [
      [
        'Total bank',
        `${coverage.draftCount} draft, ${coverage.reviewedCount} reviewed`,
        `~${coverage.statusSummary.reviewedTarget} reviewed`,
        String(coverage.statusSummary.reviewedGap),
      ],
      ...coverage.domainCoverage.map((row) => [
        `Domain ${row.id}`,
        `${row.total} total (${row.reviewed} rev, ${row.draft} drf)`,
        String(row.target),
        String(row.gap),
      ]),
    ],
  ));

  console.log('Per-task depth (all bank items)');
  console.log('');
  console.log(renderTable(
    [
      { header: 'Task', minWidth: 8, maxWidth: 8 },
      { header: 'Current', minWidth: 8, maxWidth: 8 },
      { header: 'Target', minWidth: 8, maxWidth: 8 },
      { header: 'Gap', minWidth: 4, maxWidth: 6 },
      { header: 'Name', minWidth: 12, maxWidth: 36 },
    ],
    coverage.taskCoverage.map((row) => [
      row.code,
      String(row.count),
      String(row.target),
      String(row.gap),
      row.name,
    ]),
  ));

  console.log('Cognitive mix (reviewed / bank / target %)');
  console.log('');
  if (coverage.cognitiveSummary.length === 0) {
    console.log('(no cognitive data yet)\n');
  } else {
    console.log(renderTable(
      [
        { header: 'Level', minWidth: 12 },
        { header: 'Reviewed', minWidth: 10 },
        { header: 'Bank', minWidth: 10 },
        { header: 'Target', minWidth: 10 },
      ],
      coverage.cognitiveSummary.map((row) => [
        row.level,
        `${row.reviewedCount} (${formatPercent(row.reviewedShare)})`,
        `${row.bankCount} (${formatPercent(row.bankShare)})`,
        formatPercent(row.targetShare),
      ]),
    ));
  }

  console.log('Organ mix (reviewed / bank / blueprint target of 150)');
  console.log('');
  console.log(renderTable(
    [
      { header: 'Organ', minWidth: 14 },
      { header: 'Reviewed', minWidth: 10 },
      { header: 'Bank', minWidth: 8 },
      { header: 'Target', minWidth: 8 },
      { header: 'Gap', minWidth: 8 },
    ],
    coverage.organSummary.map((row) => [
      row.organ,
      String(row.reviewedCount),
      String(row.bankCount),
      String(row.targetCount),
      String(Math.max(row.targetCount - row.bankCount, 0)),
    ]),
  ));

  console.log('Recipient age');
  console.log('');
  console.log(renderTable(
    [
      { header: 'Age', minWidth: 10 },
      { header: 'Count', minWidth: 8 },
    ],
    [
      ['adult', String(coverage.ageSummary.adult)],
      ['pediatric', String(coverage.ageSummary.pediatric)],
      ['both', String(coverage.ageSummary.both)],
    ],
  ));

  console.log('Reference infrastructure');
  console.log('');
  console.log(renderTable(
    [
      { header: 'Source', minWidth: 18 },
      { header: 'PDF', minWidth: 8 },
      { header: 'Index', minWidth: 8 },
    ],
    [
      ...coverage.infrastructure.referenceSources.map((row) => [
        row.source_id,
        row.pdfPresent ? 'yes' : 'no',
        row.indexed ? 'yes' : 'no',
      ]),
      ['examples (excluded)', coverage.infrastructure.examplesFileExcludedFromBank ? 'yes' : 'no', 'n/a'],
      ['NATCO guide', coverage.infrastructure.natcoPdfPresent ? 'yes' : 'no', 'n/a'],
    ],
  ));

  console.log('Reviewed-only exam fill (150-scored exam)');
  console.log('');
  console.log(renderTable(
    [
      { header: 'Domain', minWidth: 8 },
      { header: 'Reviewed', minWidth: 10 },
      { header: 'Target', minWidth: 8 },
      { header: 'Gap', minWidth: 6 },
      { header: 'Name', minWidth: 20, maxWidth: 34 },
    ],
    coverage.domainCoverage.map((row) => [
      String(row.id),
      String(row.reviewed),
      String(row.target),
      String(row.gap),
      row.name,
    ]),
  ));

  printSection('Coverage warnings', coverageWarnings);
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
