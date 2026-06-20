import fs from 'node:fs/promises';
import path from 'node:path';
import { detectPoliciesOnPage, keywordMatchScore, loadSourceIndex, searchIndex } from './reference-index.mjs';
import {
  buildReferenceKeywords,
  createReferenceVerificationContext,
  isPolicySectionPresent,
  verifyItemReferences,
} from './verify-references.mjs';
import { extractPdfPageFromLocator, extractPdfPageFromUrl, extractPolicyNumber } from './reference-rules.mjs';
import { loadQuestionItems, loadValidationInputs } from '../validate/00-load-bank.mjs';
import { validateReferencesForItems } from '../validate/30-references.mjs';
import { exportVerificationStubs } from './verification-stubs.mjs';

const OPTN_SOURCE = 'optn-policies';

function requiredKeywordCount(keywords) {
  return Math.max(1, Math.min(2, Math.ceil((keywords?.length || 0) * 0.5)));
}

function keywordsPass(pageText, keywords) {
  if (!Array.isArray(keywords) || keywords.length < 2) {
    return false;
  }
  const { matched, required } = keywordMatchScore(pageText, keywords);
  return matched.length >= required;
}

function summarizeTopic(section, policyNumber) {
  const raw = String(section ?? '').replace(/^Policy\s+/i, '').trim();
  if (!raw) {
    return policyNumber ? `Policy ${policyNumber}` : 'OPTN policy citation';
  }
  const head = raw.split('→')[0]?.trim() ?? raw;
  return head.length > 48 ? `${head.slice(0, 45)}…` : head;
}

function collectOptnChecks(item) {
  const checks = [];

  if (item.primary_anchor?.source_id === OPTN_SOURCE && item.primary_anchor.pdf_page) {
    checks.push({
      field: 'primary_anchor',
      page: item.primary_anchor.pdf_page,
      keywords: item.primary_anchor.keywords ?? [],
      section: item.primary_anchor.section,
      policyNumber: extractPolicyNumber(item.primary_anchor.section),
    });
  }

  for (const [index, reference] of (item.references ?? []).entries()) {
    const pageFromUrl = extractPdfPageFromUrl(reference?.url);
    const pageFromLocator = extractPdfPageFromLocator(reference?.locator);
    const page = pageFromUrl ?? pageFromLocator;
    if (!page || !reference?.url?.includes('optn_policies.pdf')) {
      continue;
    }
    checks.push({
      field: `references[${index}]`,
      page,
      keywords: buildReferenceKeywords(reference, item, OPTN_SOURCE, page),
      section: reference.locator,
      policyNumber: extractPolicyNumber(reference.locator),
    });
  }

  return checks;
}

function pagePassesCheck(index, check) {
  const pageRec = index.pages.find((entry) => entry.pdf_page === check.page);
  const text = pageRec?.text ?? '';
  if (!text) {
    return false;
  }

  if (check.policyNumber) {
    const policiesOnPage = detectPoliciesOnPage(text);
    if (!isPolicySectionPresent(text, policiesOnPage, check.policyNumber)) {
      return false;
    }
  }

  return keywordsPass(text, check.keywords);
}

function suggestBetterPage(index, check) {
  const query = (check.keywords ?? []).filter(Boolean).join(' ').trim();
  if (!query) {
    return null;
  }

  const hits = searchIndex(index, query, { limit: 5 });
  for (const hit of hits) {
    if (hit.pdf_page === check.page) {
      continue;
    }
    const candidate = {
      ...check,
      page: hit.pdf_page,
    };
    if (pagePassesCheck(index, candidate) && hit.score >= 0.67) {
      return hit.pdf_page;
    }
  }

  return null;
}

export async function analyzeOptnDrift({ index = null } = {}) {
  const optnIndex = index ?? (await loadSourceIndex(OPTN_SOURCE));
  const { bankFiles } = await loadValidationInputs();
  const { allItems } = await loadQuestionItems(bankFiles);

  const referenceErrors = [];
  const context = await createReferenceVerificationContext({ allowMissingIndex: false });
  for (const entry of allItems) {
    await verifyItemReferences(entry.item, entry.location, context, referenceErrors);
  }

  const optnReferenceErrors = referenceErrors.filter((line) => line.includes(OPTN_SOURCE));

  const fixByItem = new Map();

  for (const entry of allItems) {
    const item = entry.item;
    if (!item?.id) {
      continue;
    }

    const itemErrors = referenceErrors.filter((line) => line.includes(`:: ${item.id}:`));
    const checks = collectOptnChecks(item);

    for (const check of checks) {
      if (pagePassesCheck(optnIndex, check)) {
        continue;
      }

      const newPage = suggestBetterPage(optnIndex, check);
      if (!newPage || newPage === check.page) {
        continue;
      }

      const existing = fixByItem.get(item.id) ?? {
        itemId: item.id,
        file: entry.location.file,
        topic: summarizeTopic(check.section, check.policyNumber),
        oldPage: check.page,
        newPage,
        fields: new Set(),
        validationErrors: new Set(),
      };

      if (existing.oldPage !== check.page && existing.newPage !== newPage) {
        // Conflicting page suggestions for one item — skip auto-fix for safety.
        existing.conflict = true;
      } else {
        existing.oldPage = check.page;
        existing.newPage = newPage;
        existing.fields.add(check.field);
      }

      for (const err of itemErrors) {
        existing.validationErrors.add(err);
      }

      fixByItem.set(item.id, existing);
    }
  }

  const autoFixes = [...fixByItem.values()]
    .filter((fix) => !fix.conflict && fix.oldPage !== fix.newPage)
    .map((fix) => ({
      ...fix,
      fields: [...fix.fields],
      validationErrors: [...fix.validationErrors],
      confidence: 'high',
    }));

  const manualReview = optnReferenceErrors
    .map((line) => {
      const match = line.match(/^([^:]+) :: ([^:]+): (.+)$/);
      if (!match) {
        return { raw: line };
      }
      const [, file, itemId, message] = match;
      const auto = autoFixes.find((fix) => fix.itemId === itemId);
      if (auto) {
        return null;
      }
      return { file, itemId, message };
    })
    .filter(Boolean);

  return {
    bundle: {
      source_id: optnIndex.source_id,
      page_count: optnIndex.page_count,
      built_at: optnIndex.built_at,
      filename: optnIndex.filename,
    },
    optnReferenceErrors,
    autoFixes,
    manualReview,
  };
}

export function groupFixesForTable(autoFixes) {
  const groups = new Map();

  for (const fix of autoFixes) {
    const key = `${fix.topic}|${fix.oldPage}|${fix.newPage}`;
    const group = groups.get(key) ?? {
      itemIds: [],
      topic: fix.topic,
      oldPage: fix.oldPage,
      newPage: fix.newPage,
    };
    group.itemIds.push(fix.itemId);
    groups.set(key, group);
  }

  return [...groups.values()].sort(
    (a, b) => a.oldPage - b.oldPage || a.newPage - b.newPage || a.topic.localeCompare(b.topic),
  );
}

export function formatDriftIssueBody(analysis, { workflowUrl = null, prUrl = null } = {}) {
  const lines = [];
  lines.push('## OPTN policies PDF drift detected');
  lines.push('');
  lines.push(
    'HRSA republished `optn_policies.pdf` and daily validation on `main` found OPTN reference mismatches.',
  );
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Bundle file | \`${analysis.bundle.filename}\` |`);
  lines.push(`| Indexed pages | ${analysis.bundle.page_count} |`);
  lines.push(`| Index built at | ${analysis.bundle.built_at} |`);
  if (workflowUrl) {
    lines.push(`| Workflow run | ${workflowUrl} |`);
  }
  lines.push('');

  if (analysis.autoFixes.length > 0) {
    lines.push('## Suggested page re-anchors (auto-fixable)');
    lines.push('');
    lines.push('| Item | Topic | Old → New page |');
    lines.push('| --- | --- | --- |');
    for (const group of groupFixesForTable(analysis.autoFixes)) {
      lines.push(
        `| ${group.itemIds.join(', ')} | ${group.topic} | ${group.oldPage} → ${group.newPage} |`,
      );
    }
    lines.push('');
    lines.push('### Maintainer steps');
    lines.push('');
    lines.push('```bash');
    lines.push('npm run reference:fetch-optn');
    lines.push('npm run reference:index -- optn-policies');
    lines.push('npm run reference:audit-optn -- --apply');
    lines.push('npm run validate:ci && npm run validate:stubs');
    lines.push('```');
  }

  if (analysis.manualReview.length > 0) {
    lines.push('## Manual review required');
    lines.push('');
    for (const entry of analysis.manualReview) {
      if (entry.raw) {
        lines.push(`- ${entry.raw}`);
        continue;
      }
      lines.push(`- \`${entry.itemId}\` (\`${entry.file}\`): ${entry.message}`);
    }
    lines.push('');
  }

  if (prUrl) {
    lines.push(`## Remediation PR`);
    lines.push('');
    lines.push(`Opened: ${prUrl}`);
    lines.push('');
    lines.push('Please review the PR (page re-anchors + verification stubs) before merge.');
  } else if (analysis.autoFixes.length > 0) {
    lines.push('> No remediation PR was opened automatically. Apply the steps above or re-run the workflow.');
  }

  return lines.join('\n');
}

function applyPageToItem(item, newPage) {
  if (item.primary_anchor?.source_id === OPTN_SOURCE) {
    item.primary_anchor.pdf_page = newPage;
  }

  for (const ref of item.references ?? []) {
    if (ref.url?.includes('optn_policies.pdf')) {
      ref.url = ref.url.replace(/#page=\d+/, `#page=${newPage}`);
    }
    if (ref.locator) {
      ref.locator = ref.locator.replace(/PDF p\. \d+/, `PDF p. ${newPage}`);
    }
  }

  if (item.notes) {
    item.notes = item.notes
      .replace(/optn-policies p\. \d+/g, `optn-policies p. ${newPage}`)
      .replace(/optn_policies\.pdf p\. \d+/g, `optn_policies.pdf p. ${newPage}`);
  }

  item.last_updated = new Date().toISOString().slice(0, 10);
}

export async function applyOptnDriftFixes(autoFixes) {
  if (!autoFixes?.length) {
    return { changedFiles: [], itemsUpdated: 0 };
  }

  const byFile = new Map();
  for (const fix of autoFixes) {
    const list = byFile.get(fix.file) ?? [];
    list.push(fix);
    byFile.set(fix.file, list);
  }

  const changedFiles = [];

  for (const [relativeFile, fixes] of byFile.entries()) {
    const raw = await fs.readFile(relativeFile, 'utf8');
    const items = JSON.parse(raw);
    let touched = false;

    for (const item of items) {
      const fix = fixes.find((entry) => entry.itemId === item.id);
      if (!fix) {
        continue;
      }
      applyPageToItem(item, fix.newPage);
      touched = true;
    }

    if (touched) {
      await fs.writeFile(relativeFile, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
      changedFiles.push(relativeFile);
    }
  }

  const { bankFiles } = await loadValidationInputs();
  const { allItems } = await loadQuestionItems(bankFiles);
  const { context } = await validateReferencesForItems(allItems, { allowMissingIndex: false });
  await exportVerificationStubs(allItems, context, { force: true });

  return { changedFiles, itemsUpdated: autoFixes.length };
}
