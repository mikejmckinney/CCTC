import { loadValidationInputs, loadQuestionItems } from '../../validate/00-load-bank.mjs';

const SCENARIO_ID_MIN = 6001;

function parseCctcNumericId(itemId) {
  const match = typeof itemId === 'string' ? itemId.match(/^cctc-(\d+)$/) : null;
  return match ? Number(match[1]) : null;
}

function companionIdForIndex(index) {
  return `cctc-${SCENARIO_ID_MIN + index}`;
}

export function listExistingCompanionParents(scenarioItems, { excludeBelowCompanionNumeric = null } = {}) {
  return new Set(
    scenarioItems
      .filter(({ item }) => {
        if (typeof item?.companion_of !== 'string') {
          return false;
        }
        if (excludeBelowCompanionNumeric == null) {
          return true;
        }
        const numeric = parseCctcNumericId(item.id);
        return numeric != null && numeric < excludeBelowCompanionNumeric;
      })
      .map(({ item }) => item.companion_of),
  );
}

export function pickStratified(pool, count, comboTarget) {
  const combos = pool.filter((entry) => entry.item.type === 'complex_combo');
  const oneBest = pool.filter((entry) => entry.item.type === 'one_best');
  const comboCount = Math.min(comboTarget, combos.length);
  const oneCount = count - comboCount;

  const picked = [];
  const oneStep = Math.max(1, Math.floor(oneBest.length / oneCount));
  for (let i = 0; i < oneCount; i += 1) {
    picked.push(oneBest[Math.min(i * oneStep, oneBest.length - 1)]);
  }

  const comboStep = Math.max(1, Math.floor(combos.length / Math.max(comboCount, 1)));
  for (let i = 0; i < comboCount; i += 1) {
    picked.push(combos[Math.min(i * comboStep, combos.length - 1)]);
  }

  return picked.slice(0, count);
}

/**
 * Select stratified standard parents for a companion wave.
 * @param {object} options
 * @param {number} options.startIndex - 0-based offset from cctc-6001 (30 = first id cctc-6031)
 * @param {number} options.perDomain - items per domain (total = perDomain * 3)
 * @param {number} [options.comboShare] - target fraction of complex_combo (default 0.15)
 */
export async function selectWaveParents({ startIndex, perDomain, comboShare = 0.15 }) {
  const { bankFiles, scenarioBankFiles } = await loadValidationInputs();
  const { allItems: standardItems } = await loadQuestionItems(bankFiles);
  const { allItems: scenarioItems } = await loadQuestionItems(scenarioBankFiles);

  const excludeBelowNumeric = SCENARIO_ID_MIN + startIndex;
  const usedParents = listExistingCompanionParents(scenarioItems, {
    excludeBelowCompanionNumeric: excludeBelowNumeric,
  });
  const reviewedStandard = standardItems.filter(
    (entry) => entry.item?.status === 'reviewed' && !usedParents.has(entry.item.id),
  );

  const byDomain = { 1: [], 2: [], 3: [] };
  for (const entry of reviewedStandard) {
    byDomain[entry.item.domain].push(entry);
  }

  const comboPerDomain = Math.round(perDomain * comboShare);
  const wave = [];

  for (const domain of [1, 2, 3]) {
    const picked = pickStratified(byDomain[domain], perDomain, comboPerDomain);
    for (const entry of picked) {
      const companionNumeric = SCENARIO_ID_MIN + startIndex + wave.length;
      wave.push({
        companionId: companionIdForIndex(startIndex + wave.length),
        parentId: entry.item.id,
        parent: entry.item,
        domain,
      });
    }
  }

  if (wave.length !== perDomain * 3) {
    throw new Error(`Expected ${perDomain * 3} selections, got ${wave.length}`);
  }

  const lastNumeric = parseCctcNumericId(wave[wave.length - 1].companionId);
  return {
    wave,
    summary: {
      count: wave.length,
      idRange: `${wave[0].companionId}–${wave[wave.length - 1].companionId}`,
      comboCount: wave.filter((entry) => entry.parent.type === 'complex_combo').length,
      excludedParents: usedParents.size,
      lastNumeric,
    },
  };
}
