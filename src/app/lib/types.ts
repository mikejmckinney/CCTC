import type { BlueprintId, ExamMode, FlagReason, Question } from '../../types/exam';

export type View = 'home' | 'session' | 'history' | 'history-detail' | 'flags';

export interface FlagDraft {
  existingId?: string;
  item: Question;
  sessionId: string;
  blueprint: BlueprintId;
  mode: ExamMode;
  reason: FlagReason;
  comment: string;
}

export const FLAG_REASONS: FlagReason[] = [
  'factual error',
  'outdated policy/guideline',
  'ambiguous / >1 defensible answer',
  'typo / wording',
  'broken or wrong reference link',
  'other'
];

export const QUESTION_MIN = 10;
