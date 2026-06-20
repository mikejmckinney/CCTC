import { formatItemError, isPlainObject } from './lib.mjs';

export const SCENARIO_COMPANION_TARGET = 506;
export const SCENARIO_ID_MIN = 6001;
export const SCENARIO_ID_MAX = 6506;

const COGNITIVE_RANK = {
  recall: 0,
  application: 1,
  analysis: 2,
};

function parseCctcNumericId(itemId) {
  if (typeof itemId !== 'string') {
    return null;
  }
  const match = itemId.match(/^cctc-(\d+)$/);
  return match ? Number(match[1]) : null;
}

function isScenarioIdBand(itemId) {
  const numeric = parseCctcNumericId(itemId);
  return numeric !== null && numeric >= SCENARIO_ID_MIN && numeric <= SCENARIO_ID_MAX;
}

function arraysEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) {
    return false;
  }
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

export function buildScenarioCompanionSummary(scenarioItems, standardItems) {
  const reviewedStandard = standardItems.filter(({ item }) => item?.status === 'reviewed').length;
  const reviewedCompanions = scenarioItems.filter(({ item }) => item?.status === 'reviewed').length;
  const draftCompanions = scenarioItems.filter(({ item }) => item?.status === 'draft').length;

  return {
    target: SCENARIO_COMPANION_TARGET,
    standardReviewed: reviewedStandard,
    companionTotal: scenarioItems.length,
    companionReviewed: reviewedCompanions,
    companionDraft: draftCompanions,
    companionGap: Math.max(SCENARIO_COMPANION_TARGET - reviewedCompanions, 0),
  };
}

export function validateScenarioCompanions(scenarioItems, standardItems, errors, warnings) {
  const standardById = new Map();
  for (const entry of standardItems) {
    if (!isPlainObject(entry.item) || typeof entry.item.id !== 'string') {
      continue;
    }
    standardById.set(entry.item.id, entry.item);
  }

  const companionOwners = new Map();

  for (const entry of standardItems) {
    const { item, location } = entry;
    if (!isPlainObject(item)) {
      continue;
    }

    if (typeof item.companion_of === 'string') {
      errors.push(formatItemError(location, '$.companion_of is only allowed on scenario companion items under questions/scenario/'));
    }

    if (isScenarioIdBand(item.id)) {
      errors.push(
        formatItemError(
          location,
          `$.id ${item.id} is reserved for scenario companions (${SCENARIO_ID_MIN}–${SCENARIO_ID_MAX}); standard bank items must use another id band`,
        ),
      );
    }
  }

  for (const entry of scenarioItems) {
    const { item, location } = entry;
    if (!isPlainObject(item)) {
      continue;
    }

    if (!location.file.includes('/scenario/')) {
      errors.push(formatItemError(location, 'scenario companion items must live under questions/scenario/'));
    }

    if (!isScenarioIdBand(item.id)) {
      errors.push(
        formatItemError(
          location,
          `$.id must use the scenario companion id band cctc-${SCENARIO_ID_MIN}–cctc-${SCENARIO_ID_MAX}`,
        ),
      );
    }

    if (typeof item.companion_of !== 'string') {
      errors.push(formatItemError(location, '$.companion_of is required for scenario companion items'));
      continue;
    }

    const parent = standardById.get(item.companion_of);
    if (!parent) {
      errors.push(formatItemError(location, `$.companion_of ${item.companion_of} does not match any standard-bank item`));
      continue;
    }

    const owners = companionOwners.get(item.companion_of) ?? [];
    owners.push(location);
    companionOwners.set(item.companion_of, owners);

    if (item.domain !== parent.domain) {
      errors.push(formatItemError(location, `$.domain ${item.domain} must match companion_of domain ${parent.domain}`));
    }

    if (item.task !== parent.task) {
      errors.push(formatItemError(location, `$.task ${item.task} must match companion_of task ${parent.task}`));
    }

    if (!arraysEqual(item.knowledge_codes ?? [], parent.knowledge_codes ?? [])) {
      errors.push(formatItemError(location, '$.knowledge_codes must match companion_of knowledge_codes exactly'));
    }

    if (item.type !== parent.type) {
      errors.push(formatItemError(location, `$.type ${item.type} must match companion_of type ${parent.type}`));
    }

    const parentLevel = parent.cognitive_level;
    const companionLevel = item.cognitive_level;
    if (
      parentLevel &&
      companionLevel &&
      (COGNITIVE_RANK[companionLevel] ?? -1) < (COGNITIVE_RANK[parentLevel] ?? -1)
    ) {
      warnings.push(
        formatItemError(
          location,
          `$.cognitive_level ${companionLevel} is below companion_of ${parentLevel}; scenario companions usually stay at or above the parent level`,
        ),
      );
    }
  }

  for (const [parentId, locations] of companionOwners.entries()) {
    if (locations.length > 1) {
      for (const location of locations) {
        errors.push(formatItemError(location, `duplicate scenario companion for ${parentId}`));
      }
    }
  }

  const summary = buildScenarioCompanionSummary(scenarioItems, standardItems);
  if (summary.companionTotal < SCENARIO_COMPANION_TARGET) {
    warnings.push(
      `[coverage:scenario] scenario companions ${summary.companionReviewed} reviewed / ${summary.companionTotal} total; target is ${SCENARIO_COMPANION_TARGET} reviewed companions`,
    );
  }
}
