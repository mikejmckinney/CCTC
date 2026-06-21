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

function pickEvenlyWithoutReplacement(items, count) {
  if (count === 0) {
    return [];
  }
  if (count > items.length) {
    throw new Error(`Cannot pick ${count} unique items from pool of ${items.length}`);
  }
  if (count === items.length) {
    return [...items];
  }

  const picked = [];
  const usedIds = new Set();
  for (let i = 0; i < count; i += 1) {
    let idx = Math.floor((i * items.length) / count);
    while (idx < items.length && usedIds.has(items[idx].item.id)) {
      idx += 1;
    }
    if (idx >= items.length) {
      const fallback = items.find((entry) => !usedIds.has(entry.item.id));
      if (!fallback) {
        throw new Error(`Cannot pick ${count} unique items from pool of ${items.length}`);
      }
      picked.push(fallback);
      usedIds.add(fallback.item.id);
      continue;
    }
    picked.push(items[idx]);
    usedIds.add(items[idx].item.id);
  }
  return picked;
}

export function pickStratified(pool, count, comboTarget) {
  const combos = pool.filter((entry) => entry.item.type === 'complex_combo');
  const oneBest = pool.filter((entry) => entry.item.type === 'one_best');

  let comboCount = Math.min(comboTarget, combos.length, count);
  let oneCount = count - comboCount;

  if (oneCount > oneBest.length) {
    const shortfall = oneCount - oneBest.length;
    const extraCombos = Math.min(shortfall, combos.length - comboCount);
    comboCount += extraCombos;
    oneCount = count - comboCount;
  }

  if (oneCount > oneBest.length || comboCount > combos.length) {
    throw new Error(
      `Cannot pick ${count} unique parents from pool (one_best=${oneBest.length}, complex_combo=${combos.length}; need one_best=${oneCount}, complex_combo=${comboCount})`,
    );
  }

  return [
    ...pickEvenlyWithoutReplacement(oneBest, oneCount),
    ...pickEvenlyWithoutReplacement(combos, comboCount),
  ];
}

/**
 * Select stratified standard parents for a companion wave.
 * @param {object} options
 * @param {number} options.startIndex - 0-based offset from cctc-6001 (30 = first id cctc-6031)
 * @param {number} [options.perDomain] - uniform items per domain when `perDomainCounts` omitted
 * @param {number[]} [options.perDomainCounts] - per-domain counts `[d1, d2, d3]` (overrides `perDomain`)
 * @param {number} [options.comboShare] - target fraction of complex_combo (default 0.15)
 */
export async function selectWaveParents({ startIndex, perDomain, perDomainCounts, comboShare = 0.15 }) {
  const domainCounts =
    perDomainCounts ??
    (perDomain == null ? null : [perDomain, perDomain, perDomain]);
  if (!domainCounts || domainCounts.length !== 3) {
    throw new Error('selectWaveParents requires perDomain or perDomainCounts [d1, d2, d3]');
  }
  const expectedTotal = domainCounts.reduce((sum, count) => sum + count, 0);
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

  const wave = [];

  for (const [index, domain] of [1, 2, 3].entries()) {
    const count = domainCounts[index];
    const comboTarget = Math.round(count * comboShare);
    const picked = pickStratified(byDomain[domain], count, comboTarget);
    for (const entry of picked) {
      wave.push({
        companionId: companionIdForIndex(startIndex + wave.length),
        parentId: entry.item.id,
        parent: entry.item,
        domain,
      });
    }
  }

  if (wave.length !== expectedTotal) {
    throw new Error(`Expected ${expectedTotal} selections, got ${wave.length}`);
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
