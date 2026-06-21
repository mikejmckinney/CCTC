#!/usr/bin/env node
/**
 * Wave 4 (final) scenario companions: cctc-6331–cctc-6506 (176 items).
 * Completes 1:1 pairing — 59 / 59 / 58 per domain after prior waves.
 * Run: node scripts/scenario/build-wave-04.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectWaveParents } from './lib/wave-selection.mjs';
import { buildScenarioStem } from './lib/scenario-stem.mjs';
import { writeWaveBatchFiles } from './lib/build-companions.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const WAVE = 4;
const START_INDEX = 330; // after pilot (30) + wave 2 (150) + wave 3 (150)
const PER_DOMAIN_COUNTS = [59, 59, 58];
const BATCH_FILE = 'wave-batch-04.json';

const { wave, summary } = await selectWaveParents({
  startIndex: START_INDEX,
  perDomainCounts: PER_DOMAIN_COUNTS,
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
