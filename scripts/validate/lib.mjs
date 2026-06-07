export const ROOT_DIR = process.cwd();
export const REVIEWED_TARGET = 500;
export const MIN_SAMPLE_FOR_DISTRIBUTION_WARNINGS = 20;

export function formatItemError(location, message) {
  return `${location.file} :: ${location.itemId}: ${message}`;
}

export function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isAbsoluteUrl(value) {
  if (typeof value !== 'string') {
    return false;
  }
  try {
    const parsed = new URL(value);
    return Boolean(parsed.protocol && parsed.hostname);
  } catch {
    return false;
  }
}

export function isDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

export function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatSignedPercent(value) {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
}

export function parseCliFlags(argv = process.argv.slice(2)) {
  return {
    strict: argv.includes('--strict'),
    ci: argv.includes('--ci'),
    referencesOnly: argv.includes('--references-only'),
    coverageOnly: argv.includes('--coverage-only'),
    itemFilter: extractFlagValue(argv, '--item'),
  };
}

export function resolveValidationMode(flags) {
  if (flags.coverageOnly) {
    return 'coverage-only';
  }
  if (flags.referencesOnly) {
    return 'references-only';
  }
  if (flags.ci) {
    return 'ci';
  }
  return 'full';
}

function extractFlagValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return argv[index + 1] ?? null;
}

export function filterItems(allItems, itemFilter) {
  if (!itemFilter) {
    return allItems;
  }
  return allItems.filter(({ item }) => item?.id === itemFilter);
}
