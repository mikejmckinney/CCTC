import { formatItemError, isPlainObject } from './lib.mjs';

export function validateIntegrityForItems(allItems, taskToDomain, legacySectionIds, errors) {
  const seenIds = new Map();

  for (const { item, location } of allItems) {
    if (!isPlainObject(item)) {
      continue;
    }

    if (typeof item.id === 'string') {
      const locations = seenIds.get(item.id) ?? [];
      locations.push(location);
      seenIds.set(item.id, locations);
    }

    validateItemIntegrity(item, location, taskToDomain, legacySectionIds, errors);
  }

  for (const [itemId, locations] of seenIds.entries()) {
    if (locations.length <= 1) {
      continue;
    }

    for (const location of locations) {
      const others = locations
        .filter((candidate) => candidate !== location)
        .map((candidate) => `${candidate.file}#${candidate.itemIndex + 1}`)
        .join(', ');
      errors.push(`${location.file} :: ${itemId}: duplicate item id also present in ${others}`);
    }
  }
}

function validateItemIntegrity(item, location, taskToDomain, legacySectionIds, errors) {
  if (!Array.isArray(item.options)) {
    return;
  }

  const optionIds = item.options
    .filter((option) => isPlainObject(option) && typeof option.id === 'string')
    .map((option) => option.id);

  const correctMatches = optionIds.filter((optionId) => optionId === item.correct).length;
  if (correctMatches !== 1) {
    errors.push(formatItemError(location, `$.correct must match exactly one existing option id; found ${correctMatches}`));
  }

  const rationaleIncorrect = isPlainObject(item.explanation?.rationale_incorrect)
    ? item.explanation.rationale_incorrect
    : {};
  const nonCorrectOptionIds = optionIds.filter((optionId) => optionId !== item.correct);

  for (const optionId of nonCorrectOptionIds) {
    if (!(optionId in rationaleIncorrect)) {
      errors.push(formatItemError(location, `$.explanation.rationale_incorrect is missing an entry for option ${optionId}`));
    }
  }

  for (const rationaleOptionId of Object.keys(rationaleIncorrect)) {
    if (rationaleOptionId === item.correct) {
      errors.push(formatItemError(location, `$.explanation.rationale_incorrect must not include the correct option ${item.correct}`));
      continue;
    }
    if (!nonCorrectOptionIds.includes(rationaleOptionId)) {
      errors.push(formatItemError(location, `$.explanation.rationale_incorrect includes unknown option ${rationaleOptionId}`));
    }
  }

  if (item.type === 'complex_combo') {
    const elementIds = new Set(
      Array.isArray(item.elements)
        ? item.elements
            .filter((element) => isPlainObject(element) && typeof element.id === 'string')
            .map((element) => element.id)
        : [],
    );

    if (item.shuffle !== false) {
      errors.push(formatItemError(location, '$.shuffle must be false for complex_combo items'));
    }

    (item.options ?? []).forEach((option, optionIndex) => {
      if (!Array.isArray(option?.selects)) {
        return;
      }
      for (const selectedElement of option.selects) {
        if (!elementIds.has(selectedElement)) {
          errors.push(
            formatItemError(location, `$.options[${optionIndex}].selects references undefined element ${selectedElement}`),
          );
        }
      }
    });
  }

  if (item.task !== undefined) {
    const taskMeta = taskToDomain.get(item.task);
    if (taskMeta === undefined) {
      errors.push(formatItemError(location, `$.task ${item.task} is not present in blueprints/cctc-from-2026-07.json`));
    }

    const taskDomainPrefix = Number.parseInt(String(item.task).slice(0, 2), 10);
    if (Number.isInteger(taskDomainPrefix) && item.domain !== taskDomainPrefix) {
      errors.push(formatItemError(location, `$.domain ${item.domain} does not match the domain prefix for task ${item.task}`));
    }

    if (taskMeta !== undefined && item.domain !== taskMeta.domainId) {
      errors.push(
        formatItemError(location, `$.domain ${item.domain} does not match blueprint task ${item.task} (domain ${taskMeta.domainId})`),
      );
    }
  }

  if (Array.isArray(item.knowledge_codes)) {
    const domainPrefix = String(item.domain).padStart(2, '0');
    for (const knowledgeCode of item.knowledge_codes) {
      if (!String(knowledgeCode).startsWith(domainPrefix)) {
        errors.push(
          formatItemError(location, `$.knowledge_codes entry ${knowledgeCode} does not share domain prefix ${domainPrefix}`),
        );
      }
    }
  }

  if (item.legacy_section !== undefined && !legacySectionIds.has(item.legacy_section)) {
    errors.push(
      formatItemError(location, `$.legacy_section ${item.legacy_section} is not present in blueprints/cctc-thru-2026-06.json`),
    );
  }
}
