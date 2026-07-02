import { getBlueprint } from '../data/blueprints';
import type {
  ActiveSession,
  Blueprint,
  BlueprintId,
  CognitiveLevel,
  Question,
  SessionItemSnapshot,
  SessionSettings
} from '../types/exam';

function shuffleList<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function isBlueprintApplicable(blueprint: Blueprint, question: Question): boolean {
  if (blueprint.structure === 'domain_task') {
    return true;
  }

  return Boolean(question.legacy_section || (question.task && blueprint.crosswalk_from_new_task[question.task]));
}

function resolveCategory(blueprint: Blueprint, question: Question): { id: string; label: string } {
  if (blueprint.structure === 'domain_task') {
    const domain = blueprint.domains.find((entry) => entry.id === question.domain);
    return {
      id: String(question.domain),
      label: domain?.name ?? `Domain ${question.domain}`
    };
  }

  const sectionId = question.legacy_section ?? (question.task ? blueprint.crosswalk_from_new_task[question.task] : undefined) ?? 'unmapped';
  const section = blueprint.sections.find((entry) => entry.id === sectionId || entry.subsections.some((subsection) => subsection.id === sectionId));

  return {
    id: section?.id ?? sectionId,
    label: section?.name ?? `Legacy section ${sectionId}`
  };
}

export function getScaledDomainTolerance(blueprint: Blueprint, requestedCount: number): number {
  const scoredItems = blueprint.scored_items ?? 150;
  const tolerance =
    blueprint.structure === 'domain_task'
      ? blueprint.domain_tolerance_items
      : blueprint.domain_tolerance_items ?? 2;

  if (scoredItems <= 0) {
    return 0;
  }

  return Math.max(0, Math.round((tolerance * requestedCount) / scoredItems));
}

function getBindingTargets(blueprint: Blueprint, requestedCount: number): Array<{ id: string; label: string; target: number }> {
  const bindings = blueprint.structure === 'domain_task'
    ? blueprint.domains.map((domain) => ({ id: String(domain.id), label: domain.name, items: domain.items }))
    : blueprint.sections.map((section) => ({ id: section.id, label: section.name, items: section.items }));

  const totalItems = bindings.reduce((sum, binding) => sum + binding.items, 0);
  const rawTargets = bindings.map((binding) => ({
    ...binding,
    exact: (binding.items / totalItems) * requestedCount,
    target: Math.floor((binding.items / totalItems) * requestedCount)
  }));
  let assigned = rawTargets.reduce((sum, binding) => sum + binding.target, 0);

  rawTargets
    .sort((left, right) => (right.exact - right.target) - (left.exact - left.target))
    .forEach((binding) => {
      if (assigned < requestedCount) {
        binding.target += 1;
        assigned += 1;
      }
    });

  return rawTargets.map(({ id, label, target }) => ({ id, label, target }));
}

function countTagged<T extends string>(items: Question[], field: (question: Question) => T | undefined): Map<T, number> {
  const counts = new Map<T, number>();

  items.forEach((question) => {
    const value = field(question);
    if (!value) {
      return;
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return counts;
}

function softTargetPriority(
  question: Question,
  selectedQuestions: Question[],
  blueprint: Blueprint
): number {
  const selectedCount = selectedQuestions.length;
  let priority = 0;

  if (question.cognitive_level && blueprint.cognitive_level_targets) {
    const targetShare = blueprint.cognitive_level_targets[question.cognitive_level] ?? 0;
    const selectedWithLevel = selectedQuestions.filter((entry) => entry.cognitive_level === question.cognitive_level).length;
    const actualShare = selectedCount === 0 ? 0 : selectedWithLevel / selectedCount;
    priority += Math.max(0, targetShare - actualShare) * 100;
  }

  if (question.organ && blueprint.organ_targets) {
    const scoredItems = blueprint.scored_items ?? 150;
    const organTotal = Object.values(blueprint.organ_targets).reduce((sum, count) => sum + count, 0) || scoredItems;
    const targetShare = (blueprint.organ_targets[question.organ] ?? 0) / organTotal;
    const selectedWithOrgan = selectedQuestions.filter((entry) => entry.organ === question.organ).length;
    const actualShare = selectedCount === 0 ? 0 : selectedWithOrgan / selectedCount;
    priority += Math.max(0, targetShare - actualShare) * 100;
  }

  return priority;
}

function prioritizeBucketCandidates(candidates: Question[], selectedQuestions: Question[], blueprint: Blueprint): Question[] {
  return [...candidates].sort((left, right) => {
    const rightPriority = softTargetPriority(right, selectedQuestions, blueprint);
    const leftPriority = softTargetPriority(left, selectedQuestions, blueprint);
    return rightPriority - leftPriority;
  });
}

function buildCandidateBuckets(blueprint: Blueprint, questions: Question[], recentIds: Set<string>, weakAreaIds?: Set<string>): Map<string, Question[]> {
  const buckets = new Map<string, Question[]>();

  questions.forEach((question) => {
    const category = resolveCategory(blueprint, question);
    if (!buckets.has(category.id)) {
      buckets.set(category.id, []);
    }
    buckets.get(category.id)!.push(question);
  });

  buckets.forEach((bucket, key) => {
    if (weakAreaIds && weakAreaIds.size > 0) {
      const weak = shuffleList(bucket.filter((q) => weakAreaIds.has(q.id)));
      const otherUnseen = shuffleList(bucket.filter((q) => !weakAreaIds.has(q.id) && !recentIds.has(q.id)));
      const otherSeen = shuffleList(bucket.filter((q) => !weakAreaIds.has(q.id) && recentIds.has(q.id)));
      buckets.set(key, [...weak, ...otherUnseen, ...otherSeen]);
    } else {
      const unseen = shuffleList(bucket.filter((question) => !recentIds.has(question.id)));
      const seen = shuffleList(bucket.filter((question) => recentIds.has(question.id)));
      buckets.set(key, [...unseen, ...seen]);
    }
  });

  return buckets;
}

function freezeOptionOrder(question: Question): string[] {
  if (question.shuffle === false) {
    return question.options.map((option) => option.id);
  }

  return shuffleList(question.options.map((option) => option.id));
}

function pushSelectedQuestion(
  selected: SessionItemSnapshot[],
  selectedIds: Set<string>,
  selectedQuestions: Question[],
  question: Question,
  category: { id: string; label: string }
): void {
  selected.push({
    itemId: question.id,
    question,
    optionOrder: freezeOptionOrder(question),
    categoryId: category.id,
    categoryLabel: category.label
  });
  selectedIds.add(question.id);
  selectedQuestions.push(question);
}

export function createSession(
  questions: Question[],
  settings: SessionSettings,
  recentIds: Set<string>,
  weakAreaIds?: string[]
): ActiveSession {
  const blueprint = getBlueprint(settings.blueprintId);
  const filteredQuestions = questions.filter(
    (question) =>
      (settings.includeDrafts || question.status === 'reviewed') && isBlueprintApplicable(blueprint, question)
  );
  const targets = getBindingTargets(blueprint, settings.questionCount);
  const domainTolerance = getScaledDomainTolerance(blueprint, settings.questionCount);
  const weakAreaSet = weakAreaIds && weakAreaIds.length > 0 ? new Set(weakAreaIds) : undefined;
  const buckets = buildCandidateBuckets(blueprint, filteredQuestions, recentIds, weakAreaSet);
  const selected: SessionItemSnapshot[] = [];
  const selectedQuestions: Question[] = [];
  const selectedIds = new Set<string>();
  const shortageNotes: string[] = [];

  targets.forEach((target) => {
    const bucket = buckets.get(target.id) ?? [];
    const available = bucket.filter((question) => !selectedIds.has(question.id));
    const unseenAvailable = available.filter((question) => !recentIds.has(question.id));
    const seenAvailable = available.filter((question) => recentIds.has(question.id));
    const ranked = [
      ...prioritizeBucketCandidates(unseenAvailable, selectedQuestions, blueprint),
      ...prioritizeBucketCandidates(seenAvailable, selectedQuestions, blueprint)
    ];
    const chosen = ranked.slice(0, target.target);

    chosen.forEach((question) => {
      pushSelectedQuestion(selected, selectedIds, selectedQuestions, question, target);
    });

    const minimumAcceptable = Math.max(0, target.target - domainTolerance);
    if (chosen.length < minimumAcceptable) {
      shortageNotes.push(
        `${target.label}: requested ${target.target} (±${domainTolerance}), loaded ${chosen.length}.`
      );
    }
  });

  if (selected.length < settings.questionCount) {
    const leftovers = filteredQuestions.filter((question) => !selectedIds.has(question.id));
    const unseenLeftovers = shuffleList(leftovers.filter((question) => !recentIds.has(question.id)));
    const seenLeftovers = shuffleList(leftovers.filter((question) => recentIds.has(question.id)));
    const rankedLeftovers = [
      ...prioritizeBucketCandidates(unseenLeftovers, selectedQuestions, blueprint),
      ...prioritizeBucketCandidates(seenLeftovers, selectedQuestions, blueprint)
    ];
    const extraNeeded = settings.questionCount - selected.length;

    rankedLeftovers.slice(0, extraNeeded).forEach((question) => {
      const category = resolveCategory(blueprint, question);
      pushSelectedQuestion(selected, selectedIds, selectedQuestions, question, category);
    });
  }

  const orderedItems = shuffleList(selected);
  const answers = Object.fromEntries(orderedItems.map((item) => [item.itemId, null]));
  const revealed = Object.fromEntries(orderedItems.map((item) => [item.itemId, false]));
  const now = new Date().toISOString();
  const remainingSeconds = settings.timed ? settings.timeMinutes * 60 : null;
  const bankSummary = [];

  if (orderedItems.length < settings.questionCount) {
    bankSummary.push(
      `The current bank can only assemble ${orderedItems.length} of the ${settings.questionCount} requested items with the loaded content.`
    );
  }
  if (!settings.includeDrafts) {
    bankSummary.push('Exam assembly is using reviewed items only. Draft items remain visible only when included intentionally.');
  }

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    settings,
    shortageNotes,
    bankSummary,
    items: orderedItems,
    answers,
    revealed,
    flaggedForReview: [],
    currentIndex: 0,
    remainingSeconds,
    timerHidden: !settings.showTimer
  };
}

export function buildDefaultSettings(blueprintId: BlueprintId): SessionSettings {
  const blueprint = getBlueprint(blueprintId);
  return {
    blueprintId,
    questionSet: 'standard',
    questionCount: blueprint.default_exam_items,
    timed: true,
    timeMinutes: blueprint.default_time_minutes,
    showTimer: true,
    mode: 'exam',
    includeDrafts: false,
    targetThreshold: 70
  };
}

export function countAnswered(session: ActiveSession): number {
  return Object.values(session.answers).filter((answer) => Boolean(answer)).length;
}

export function summarizeSoftTargets(questions: Question[], blueprint: Blueprint): {
  cognitive: Map<CognitiveLevel, number>;
  organ: Map<string, number>;
} {
  return {
    cognitive: countTagged(questions, (question) => question.cognitive_level) as Map<CognitiveLevel, number>,
    organ: countTagged(questions, (question) => question.organ)
  };
}
