import fs from 'node:fs';
import path from 'node:path';

export const DOMAIN_DIRS = {
  1: 'domain-1-education',
  2: 'domain-2-pretx',
  3: 'domain-3-postop',
};

export function buildCompanion(parent, { companionId, stem, waveLabel, status = 'draft' }) {
  const companion = structuredClone(parent);
  companion.id = companionId;
  companion.companion_of = parent.id;
  companion.status = status;
  companion.version = 1;
  companion.stem = stem;
  companion.last_updated = '2026-06-05';
  companion.notes = `Scenario companion (${waveLabel}) paired with ${parent.id}. ${parent.notes ?? ''}`.trim();
  return companion;
}

export function writeWaveBatchFiles(repoRoot, waveEntries, { batchFileName, waveLabel, status = 'draft' }) {
  const byDomain = { 1: [], 2: [], 3: [] };

  for (const entry of waveEntries) {
    const companion = buildCompanion(entry.parent, {
      companionId: entry.companionId,
      stem: entry.stem,
      waveLabel,
      status,
    });
    byDomain[entry.domain].push(companion);
  }

  for (const [domain, items] of Object.entries(byDomain)) {
    const dir = path.join(repoRoot, 'questions/scenario', DOMAIN_DIRS[domain]);
    fs.mkdirSync(dir, { recursive: true });
    const outPath = path.join(dir, batchFileName);
    fs.writeFileSync(outPath, `${JSON.stringify(items, null, 2)}\n`);
    console.log(`Wrote ${items.length} items → ${path.relative(repoRoot, outPath)}`);
  }

  return byDomain;
}
