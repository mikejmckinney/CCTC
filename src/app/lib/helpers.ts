import { getBlueprint } from '../../data/blueprints';
import { isBlueprintApplicable } from '../../lib/sessionAssembly';
import type { ActiveSession, BlueprintId, ExamMode, ItemFlag, Question, SessionItemSnapshot } from '../../types/exam';
import type { FlagDraft } from './types';

export function displayLetterForIndex(optionIndex: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + optionIndex);
}

export function displayLetterForOptionId(optionOrder: string[], optionId: string): string {
  const optionIndex = optionOrder.indexOf(optionId);
  return optionIndex >= 0 ? displayLetterForIndex(optionIndex) : optionId;
}

export function incorrectRationalesForDisplay(item: SessionItemSnapshot): Array<{ displayLetter: string; rationale: string }> {
  return item.optionOrder.flatMap((optionId, optionIndex) => {
    if (optionId === item.question.correct) {
      return [];
    }

    const rationale = item.question.explanation.rationale_incorrect?.[optionId];
    if (!rationale) {
      return [];
    }

    return [{ displayLetter: displayLetterForIndex(optionIndex), rationale }];
  });
}

export function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) {
    return 'Untimed';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function sessionPersistFingerprint(session: ActiveSession): string {
  return JSON.stringify({
    id: session.id,
    settings: session.settings,
    items: session.items.map((item) => ({ itemId: item.itemId, optionOrder: item.optionOrder })),
    answers: session.answers,
    revealed: session.revealed,
    flaggedForReview: session.flaggedForReview,
    currentIndex: session.currentIndex,
    timerHidden: session.timerHidden,
    submittedAt: session.submittedAt
  });
}

export function clampQuestionCount(value: number, max: number, questionMin: number): number {
  if (max <= 0) {
    return 0;
  }

  return Math.min(Math.max(value, Math.min(questionMin, max)), max);
}

export function getAvailableQuestionCount(questions: Question[], blueprintId: BlueprintId, includeDrafts: boolean): number {
  const blueprint = getBlueprint(blueprintId);

  return questions.filter((question) => {
    if (!includeDrafts && question.status !== 'reviewed') {
      return false;
    }

    return isBlueprintApplicable(blueprint, question);
  }).length;
}

export function updateSessionTimestamp(session: ActiveSession): ActiveSession {
  return {
    ...session,
    updatedAt: new Date().toISOString()
  };
}

export function buildInitialFlagDraft(item: Question, sessionId: string, blueprint: BlueprintId, mode: ExamMode, existing?: ItemFlag): FlagDraft {
  return {
    existingId: existing?.id,
    item,
    sessionId,
    blueprint,
    mode,
    reason: existing?.reason ?? 'factual error',
    comment: existing?.comment ?? ''
  };
}
