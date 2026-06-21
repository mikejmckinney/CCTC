#!/usr/bin/env node
/**
 * Wave 2 scenario companions: cctc-6031–cctc-6180 (150 items, ~50 per domain).
 * Run: node scripts/scenario/build-wave-02.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectWaveParents } from './lib/wave-selection.mjs';
import { buildScenarioStem } from './lib/scenario-stem.mjs';
import { writeWaveBatchFiles } from './lib/build-companions.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const WAVE = 2;
const START_INDEX = 30; // after pilot cctc-6001–6030
const PER_DOMAIN = 50;
const BATCH_FILE = 'wave-batch-02.json';

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
