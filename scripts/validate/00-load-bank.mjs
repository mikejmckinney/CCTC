import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT_DIR } from './lib.mjs';

export async function loadValidationInputs() {
  const schema = await readJson('schema/question.schema.json');
  const newBlueprint = await readJson('blueprints/cctc-from-2026-07.json');
  const legacyBlueprint = await readJson('blueprints/cctc-thru-2026-06.json');

  const bankFiles = [];
  const excludedEntries = [];
  await collectQuestionFiles(path.join(ROOT_DIR, 'questions'), bankFiles, excludedEntries);

  return { schema, newBlueprint, legacyBlueprint, bankFiles, excludedEntries };
}

export async function loadQuestionItems(bankFiles) {
  const parsingErrors = [];
  const fileLevelErrors = [];
  const allItems = [];

  for (const relativeFile of bankFiles) {
    let parsed;
    try {
      parsed = await readJson(relativeFile);
    } catch (error) {
      parsingErrors.push(`${relativeFile}: ${error.message}`);
      continue;
    }

    if (!Array.isArray(parsed)) {
      fileLevelErrors.push(`${relativeFile}: question bank files must contain a top-level JSON array`);
      continue;
    }

    parsed.forEach((item, index) => {
      allItems.push({
        item,
        location: {
          file: relativeFile,
          itemIndex: index,
          itemId:
            typeof item === 'object' && item !== null && typeof item.id === 'string'
              ? item.id
              : `<unknown id at index ${index}>`,
        },
      });
    });
  }

  return { allItems, parsingErrors, fileLevelErrors };
}

export function buildTaskDomainMap(blueprint) {
  const map = new Map();
  for (const domain of blueprint.domains ?? []) {
    for (const task of domain.tasks ?? []) {
      map.set(task.code, { domainId: domain.id, targetItems: task.items ?? 0, name: task.name ?? task.code });
    }
  }
  return map;
}

export function buildLegacySectionIds(legacyBlueprint) {
  return new Set(
    (legacyBlueprint.sections ?? []).flatMap((section) =>
      (section.subsections ?? []).map((subsection) => subsection.id),
    ),
  );
}

async function collectQuestionFiles(currentDir, bankFiles, excludedEntries) {
  let entries = [];
  try {
    entries = await fs.readdir(currentDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    const relativePath = path.relative(ROOT_DIR, absolutePath).replaceAll(path.sep, '/');

    if (entry.name.startsWith('_')) {
      excludedEntries.push(relativePath + (entry.isDirectory() ? '/' : ''));
      continue;
    }

    if (entry.isDirectory()) {
      await collectQuestionFiles(absolutePath, bankFiles, excludedEntries);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.json')) {
      bankFiles.push(relativePath);
    }
  }
}

async function readJson(relativePath) {
  const absolutePath = path.join(ROOT_DIR, relativePath);
  const raw = await fs.readFile(absolutePath, 'utf8');
  return JSON.parse(raw);
}
