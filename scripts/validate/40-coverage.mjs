import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveIndexPath } from '../lib/reference-index.mjs';
import {
  MIN_SAMPLE_FOR_DISTRIBUTION_WARNINGS,
  REVIEWED_TARGET,
  ROOT_DIR,
  formatPercent,
  formatSignedPercent,
  isPlainObject,
} from './lib.mjs';

export async function buildCoverageReport(allItems, newBlueprint, legacyBlueprint, context, warnings) {
  const reviewedItems = allItems.filter(({ item }) => isPlainObject(item) && item.status === 'reviewed');
  const draftItems = allItems.filter(({ item }) => isPlainObject(item) && item.status === 'draft');
  const bankItems = [...reviewedItems, ...draftItems];

  const reviewedByDomain = new Map((newBlueprint.domains ?? []).map((domain) => [domain.id, 0]));
  const draftByDomain = new Map((newBlueprint.domains ?? []).map((domain) => [domain.id, 0]));
  const totalByDomain = new Map((newBlueprint.domains ?? []).map((domain) => [domain.id, 0]));

  for (const { item } of reviewedItems) {
    reviewedByDomain.set(item.domain, (reviewedByDomain.get(item.domain) ?? 0) + 1);
  }
  for (const { item } of draftItems) {
    draftByDomain.set(item.domain, (draftByDomain.get(item.domain) ?? 0) + 1);
  }
  for (const { item } of bankItems) {
    totalByDomain.set(item.domain, (totalByDomain.get(item.domain) ?? 0) + 1);
  }

  const domainTolerance = newBlueprint.domain_tolerance_items ?? 0;
  const domainCoverage = (newBlueprint.domains ?? []).map((domain) => {
    const reviewed = reviewedByDomain.get(domain.id) ?? 0;
    const draft = draftByDomain.get(domain.id) ?? 0;
    const total = totalByDomain.get(domain.id) ?? 0;
    const gap = Math.max(domain.items - reviewed, 0);
    if (reviewed + domainTolerance < domain.items) {
      warnings.push(
        `[coverage:new] domain ${domain.id} (${domain.name}) has ${reviewed} reviewed item(s); needs ${domain.items} (+/- ${domainTolerance}) to fill a 150-item exam`,
      );
    }
    return {
      id: domain.id,
      name: domain.name,
      reviewed,
      draft,
      total,
      target: domain.items,
      gap,
    };
  });

  const taskCoverage = buildTaskCoverage(bankItems, newBlueprint, warnings);
  const legacyCoverage = buildLegacyCoverage(reviewedItems, legacyBlueprint, warnings, domainTolerance);
  const cognitiveSummary = summarizeCognitiveTargets(reviewedItems, bankItems, newBlueprint, warnings);
  const organSummary = summarizeOrganTargets(reviewedItems, bankItems, newBlueprint, warnings);
  const ageSummary = summarizeAgeCoverage(bankItems, warnings);
  const statusSummary = {
    reviewed: reviewedItems.length,
    draft: draftItems.length,
    total: bankItems.length,
    reviewedTarget: REVIEWED_TARGET,
    reviewedGap: Math.max(REVIEWED_TARGET - reviewedItems.length, 0),
  };
  const infrastructure = await buildInfrastructureReport(context);

  if (reviewedItems.length < REVIEWED_TARGET) {
    warnings.push(
      `[coverage:progress] reviewed items ${reviewedItems.length}/${REVIEWED_TARGET}; bank still needs ${REVIEWED_TARGET - reviewedItems.length} reviewed item(s) to reach the planning target`,
    );
  }

  return {
    reviewedCount: reviewedItems.length,
    draftCount: draftItems.length,
    totalCount: bankItems.length,
    reviewedByDomain,
    draftByDomain,
    domainCoverage,
    taskCoverage,
    legacyCoverage,
    cognitiveSummary,
    organSummary,
    ageSummary,
    statusSummary,
    infrastructure,
  };
}

function buildTaskCoverage(bankItems, blueprint, warnings) {
  const counts = new Map();
  for (const domain of blueprint.domains ?? []) {
    for (const task of domain.tasks ?? []) {
      counts.set(task.code, { count: 0, target: task.items ?? 0, name: task.name ?? task.code, domainId: domain.id });
    }
  }

  for (const { item } of bankItems) {
    if (!item.task || !counts.has(item.task)) {
      continue;
    }
    const entry = counts.get(item.task);
    entry.count += 1;
  }

  const rows = [...counts.entries()].map(([code, meta]) => {
    const gap = Math.max(meta.target - meta.count, 0);
    if (meta.count === 0) {
      warnings.push(`[coverage:task] task ${code} (${meta.name}) has no items yet; target ${meta.target}`);
    } else if (meta.count < meta.target) {
      warnings.push(
        `[coverage:task] task ${code} (${meta.name}) has ${meta.count} item(s); target ${meta.target} (gap ${gap})`,
      );
    }
    return { code, ...meta, gap };
  });

  return rows.sort((a, b) => a.code.localeCompare(b.code));
}

function buildLegacyCoverage(reviewedItems, legacyBlueprint, warnings, domainTolerance) {
  const subsectionToSection = new Map();
  for (const section of legacyBlueprint.sections ?? []) {
    for (const subsection of section.subsections ?? []) {
      subsectionToSection.set(subsection.id, section.id);
    }
  }

  const legacyTolerance = legacyBlueprint.domain_tolerance_items ?? domainTolerance;
  const legacyCounts = new Map((legacyBlueprint.sections ?? []).map((section) => [section.id, 0]));
  const unmappedReviewedItems = [];

  for (const { item, location } of reviewedItems) {
    const subsectionId = item.legacy_section ?? legacyBlueprint.crosswalk_from_new_task?.[item.task];
    const sectionId = subsectionId ? subsectionToSection.get(subsectionId) ?? subsectionId.slice(0, 1) : null;
    if (!sectionId || !legacyCounts.has(sectionId)) {
      unmappedReviewedItems.push(`${location.file} :: ${location.itemId}`);
      continue;
    }
    legacyCounts.set(sectionId, (legacyCounts.get(sectionId) ?? 0) + 1);
  }

  if (unmappedReviewedItems.length > 0) {
    warnings.push(
      `[coverage:legacy] ${unmappedReviewedItems.length} reviewed item(s) could not be mapped to a legacy section: ${unmappedReviewedItems.join(', ')}`,
    );
  }

  return (legacyBlueprint.sections ?? []).map((section) => {
    const available = legacyCounts.get(section.id) ?? 0;
    const gap = Math.max(section.items - available, 0);
    if (available + legacyTolerance < section.items) {
      warnings.push(
        `[coverage:legacy] section ${section.id} (${section.name}) has ${available} reviewed item(s); needs ${section.items} (+/- ${legacyTolerance}) to fill a 150-item exam`,
      );
    }
    return { id: section.id, name: section.name, available, target: section.items, gap };
  });
}

function summarizeCognitiveTargets(reviewedItems, bankItems, blueprint, warnings) {
  const targets = blueprint.cognitive_level_targets ?? {};
  const reviewedCounts = new Map(Object.keys(targets).map((key) => [key, 0]));
  const bankCounts = new Map(Object.keys(targets).map((key) => [key, 0]));

  for (const { item } of reviewedItems) {
    if (reviewedCounts.has(item.cognitive_level)) {
      reviewedCounts.set(item.cognitive_level, (reviewedCounts.get(item.cognitive_level) ?? 0) + 1);
    }
  }
  for (const { item } of bankItems) {
    if (bankCounts.has(item.cognitive_level)) {
      bankCounts.set(item.cognitive_level, (bankCounts.get(item.cognitive_level) ?? 0) + 1);
    }
  }

  if (reviewedItems.length === 0) {
    warnings.push('[coverage:new] cognitive level coverage cannot be evaluated on reviewed items yet because there are no reviewed items');
  }

  const threshold = Math.max(0.1, 5 / Math.max(reviewedItems.length, 1));
  const summary = [];

  for (const [level, targetShare] of Object.entries(targets)) {
    const reviewedCount = reviewedCounts.get(level) ?? 0;
    const bankCount = bankCounts.get(level) ?? 0;
    const reviewedShare = reviewedItems.length > 0 ? reviewedCount / reviewedItems.length : 0;
    const bankShare = bankItems.length > 0 ? bankCount / bankItems.length : 0;
    const deviation = reviewedShare - targetShare;
    summary.push({ level, reviewedCount, bankCount, reviewedShare, bankShare, targetShare, deviation });
    if (reviewedItems.length >= MIN_SAMPLE_FOR_DISTRIBUTION_WARNINGS && Math.abs(deviation) > threshold) {
      warnings.push(
        `[coverage:new] cognitive level ${level} is ${formatPercent(reviewedShare)} vs target ${formatPercent(targetShare)} (deviation ${formatSignedPercent(deviation)})`,
      );
    }
  }

  return summary;
}

function summarizeOrganTargets(reviewedItems, bankItems, blueprint, warnings) {
  const targets = blueprint.organ_targets ?? {};
  const reviewedCounts = new Map(Object.keys(targets).map((key) => [key, 0]));
  const bankCounts = new Map(Object.keys(targets).map((key) => [key, 0]));

  for (const { item } of reviewedItems) {
    if (reviewedCounts.has(item.organ)) {
      reviewedCounts.set(item.organ, (reviewedCounts.get(item.organ) ?? 0) + 1);
    }
  }
  for (const { item } of bankItems) {
    if (bankCounts.has(item.organ)) {
      bankCounts.set(item.organ, (bankCounts.get(item.organ) ?? 0) + 1);
    }
  }

  if (reviewedItems.length === 0) {
    warnings.push('[coverage:new] organ coverage cannot be evaluated on reviewed items yet because there are no reviewed items');
  }

  const summary = [];
  for (const [organ, targetCount] of Object.entries(targets)) {
    const targetShare = targetCount / blueprint.scored_items;
    const reviewedCount = reviewedCounts.get(organ) ?? 0;
    const bankCount = bankCounts.get(organ) ?? 0;
    const expectedReviewed = reviewedItems.length * targetShare;
    const delta = reviewedCount - expectedReviewed;
    summary.push({ organ, reviewedCount, bankCount, expectedReviewed, delta, targetCount });
    if (reviewedItems.length >= MIN_SAMPLE_FOR_DISTRIBUTION_WARNINGS && Math.abs(delta) > Math.max(3, expectedReviewed * 0.25)) {
      warnings.push(
        `[coverage:new] organ ${organ} has ${reviewedCount} reviewed item(s); expected about ${expectedReviewed.toFixed(1)} based on target share ${formatPercent(targetShare)}`,
      );
    }
    if (bankCount === 0 && targetCount > 0) {
      warnings.push(`[coverage:organ] organ ${organ} has no bank items yet; blueprint target ${targetCount} of 150`);
    }
  }

  return summary;
}

function summarizeAgeCoverage(bankItems, warnings) {
  const counts = { adult: 0, pediatric: 0, both: 0 };
  for (const { item } of bankItems) {
    const age = item.recipient_age ?? 'adult';
    if (age in counts) {
      counts[age] += 1;
    }
  }
  if (counts.pediatric === 0 && counts.both === 0) {
    warnings.push('[coverage:age] no pediatric or both-age items in the bank yet');
  }
  return counts;
}

async function buildInfrastructureReport(context) {
  const manifest = context?.manifest;
  const rows = [];

  if (manifest) {
    for (const source of manifest.sources) {
      const indexed = context.indexAvailability.get(source.id) ?? false;
      const pdfPath = path.join(ROOT_DIR, 'docs/reference', source.filename);
      let pdfPresent = false;
      try {
        await fs.access(pdfPath);
        pdfPresent = true;
      } catch {
        pdfPresent = false;
      }
      rows.push({
        source_id: source.id,
        pdfPresent,
        indexed,
        indexPath: path.relative(ROOT_DIR, resolveIndexPath(manifest, source.id)),
      });
    }
  }

  let examplesPresent = false;
  try {
    await fs.access(path.join(ROOT_DIR, 'questions/_examples/examples.json'));
    examplesPresent = true;
  } catch {
    examplesPresent = false;
  }

  const natcoPresent = rows.some((row) => row.source_id.includes('natco') && row.pdfPresent);

  return {
    referenceSources: rows,
    examplesFileExcludedFromBank: examplesPresent,
    natcoPdfPresent: natcoPresent,
  };
}
