#!/usr/bin/env node
/**
 * Wave 3 scenario companions: cctc-6181–cctc-6330 (150 items, ~50 per domain).
 * Run: node scripts/scenario/build-wave-03.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectWaveParents } from './lib/wave-selection.mjs';
import { buildScenarioStem } from './lib/scenario-stem.mjs';
import { writeWaveBatchFiles } from './lib/build-companions.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const WAVE = 3;
const START_INDEX = 180; // after pilot (30) + wave 2 (150)
const PER_DOMAIN = 50;
const BATCH_FILE = 'wave-batch-03.json';

const { wave, summary } = await selectWaveParents({
  startIndex: START_INDEX,
  perDomain: PER_DOMAIN,
});

const waveWithStems = wave.map((entry) => ({
  ...entry,
  stem: buildScenarioStem(entry.parent),
}));

writeWaveBatchFiles(repoRoot, waveWithStems, {
  batchFileName: BATCH_FILE,
  waveLabel: `wave ${WAVE}`,
});

console.log(
  `Wave ${WAVE} companions: ${summary.count} (${summary.idRange}), complex_combo=${summary.comboCount}, parents excluded=${summary.excludedParents}`,
);
