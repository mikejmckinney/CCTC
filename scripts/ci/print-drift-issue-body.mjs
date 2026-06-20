#!/usr/bin/env node

import fs from 'node:fs';
import process from 'node:process';
import { formatDriftIssueBody } from '../lib/optn-drift-remediation.mjs';

const [jsonPath, workflowUrl = '', prUrl = ''] = process.argv.slice(2);
if (!jsonPath) {
  console.error('Usage: node scripts/ci/print-drift-issue-body.mjs <analysis.json> [workflowUrl] [prUrl]');
  process.exit(1);
}

const analysis = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
process.stdout.write(
  `${formatDriftIssueBody(analysis, {
    workflowUrl: workflowUrl || null,
    prUrl: prUrl || null,
  })}\n`,
);
