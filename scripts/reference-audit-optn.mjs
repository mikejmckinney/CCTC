#!/usr/bin/env node

import fs from 'node:fs/promises';
import process from 'node:process';
import {
  analyzeOptnDrift,
  applyOptnDriftFixes,
  formatDriftIssueBody,
} from './lib/optn-drift-remediation.mjs';

function printUsage() {
  console.log(`Usage: npm run reference:audit-optn [-- options]

  Analyze OPTN policy page drift against the indexed bundle and suggest re-anchors.

  --json-out <path>   Write analysis JSON (for CI workflows)
  --apply             Apply high-confidence page re-anchors and export verification stubs
  --issue-body        Print GitHub issue markdown to stdout
  --help              Show this help
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const jsonOutIndex = args.indexOf('--json-out');
  const jsonOut = jsonOutIndex >= 0 ? args[jsonOutIndex + 1] : null;
  const apply = args.includes('--apply');
  const issueBody = args.includes('--issue-body');

  const analysis = await analyzeOptnDrift();

  if (jsonOut) {
    await fs.writeFile(jsonOut, `${JSON.stringify(analysis, null, 2)}\n`, 'utf8');
  }

  if (issueBody) {
    process.stdout.write(`${formatDriftIssueBody(analysis)}\n`);
  }

  if (!jsonOut && !issueBody && !apply) {
    console.log(`OPTN bundle: ${analysis.bundle.filename} (${analysis.bundle.page_count} pages, built ${analysis.bundle.built_at})`);
    console.log(`Reference errors (OPTN): ${analysis.optnReferenceErrors.length}`);
    console.log(`Auto-fixable items: ${analysis.autoFixes.length}`);
    console.log(`Manual review entries: ${analysis.manualReview.length}`);
    if (analysis.autoFixes.length > 0) {
      console.log('\nSuggested re-anchors:');
      for (const fix of analysis.autoFixes) {
        console.log(`  ${fix.itemId}: p. ${fix.oldPage} → ${fix.newPage} (${fix.topic})`);
      }
    }
  }

  if (apply) {
    if (analysis.autoFixes.length === 0) {
      console.error('No high-confidence OPTN page fixes to apply.');
      process.exit(1);
    }

    const result = await applyOptnDriftFixes(analysis.autoFixes);
    console.log(`Updated ${result.itemsUpdated} item(s) across ${result.changedFiles.length} file(s).`);
    for (const file of result.changedFiles) {
      console.log(`  ${file}`);
    }
  }

  if (analysis.optnReferenceErrors.length === 0 && analysis.autoFixes.length === 0) {
    process.exit(0);
  }

  if (!apply) {
    process.exit(analysis.manualReview.length > 0 && analysis.autoFixes.length === 0 ? 2 : 0);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
