export type ExamMode = 'study' | 'exam';
export type BlueprintId = 'cctc-from-2026-07' | 'cctc-thru-2026-06';
export type QuestionSet = 'standard' | 'scenario';
export type QuestionStatus = 'draft' | 'reviewed';
export type QuestionType = 'one_best' | 'complex_combo';
export type CognitiveLevel = 'recall' | 'application' | 'analysis';
export type OrganTarget =
  | 'general'
  | 'kidney'
  | 'liver'
  | 'heart'
  | 'lung'
  | 'pancreas'
  | 'intestine'
  | 'kidney_pancreas'
  | 'heart_lung'
  | 'multi';

export type FlagReason =
  | 'factual error'
  | 'outdated policy/guideline'
  | 'ambiguous / >1 defensible answer'
  | 'typo / wording'
  | 'broken or wrong reference link'
  | 'other';

export interface QuestionElement {
  id: string;
  text: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  selects?: string[];
}

export interface QuestionReference {
  citation: string;
  url?: string;
  locator?: string;
  kind?: 'public_authoritative' | 'guideline' | 'textbook' | 'regulation' | 'other';
}

export interface Question {
  id: string;
  schema_version?: number;
  version?: number;
  status: QuestionStatus;
  type: QuestionType;
  domain: 1 | 2 | 3;
  task?: string;
  knowledge_codes?: string[];
  cognitive_level?: CognitiveLevel;
  organ?: OrganTarget;
  recipient_age?: 'adult' | 'pediatric' | 'both';
  legacy_section?: string;
  companion_of?: string;
  stem: string;
  shuffle?: boolean;
  elements?: QuestionElement[];
  options: QuestionOption[];
  correct: string;
  explanation: {
    rationale_correct: string;
    rationale_incorrect: Record<string, string>;
  };
  references: QuestionReference[];
  notes?: string;
  last_updated?: string;
}

export interface CurrentBlueprintCategory {
  id: string;
  label: string;
  items: number;
}

export interface CurrentBlueprint {
  id: 'cctc-from-2026-07';
  label: string;
  structure: 'domain_task';
  scored_items: number;
  default_exam_items: number;
  default_time_minutes: number;
  domain_tolerance_items: number;
  cognitive_level_targets: Record<CognitiveLevel, number>;
  organ_targets: Record<string, number>;
  domains: Array<{
    id: number;
    code: string;
    name: string;
    items: number;
    tasks: Array<{ code: string; items: number; name: string }>;
  }>;
}

export interface LegacyBlueprint {
  id: 'cctc-thru-2026-06';
  label: string;
  structure: 'section_subsection';
  binding_level: 'section';
  scored_items: number;
  domain_tolerance_items?: number;
  default_exam_items: number;
  default_time_minutes: number;
  cognitive_level_targets: Record<CognitiveLevel, number>;
  organ_targets: Record<string, number>;
  sections: Array<{
    id: string;
    name: string;
    items: number;
    subsections: Array<{ id: string; name: string; items: number }>;
  }>;
  crosswalk_from_new_task: Record<string, string>;
}

export type Blueprint = CurrentBlueprint | LegacyBlueprint;

export interface SessionSettings {
  blueprintId: BlueprintId;
  questionSet: QuestionSet;
  questionCount: number;
  timed: boolean;
  timeMinutes: number;
  showTimer: boolean;
  mode: ExamMode;
  includeDrafts: boolean;
  targetThreshold: number;
}

export interface SessionItemSnapshot {
  itemId: string;
  question: Question;
  optionOrder: string[];
  categoryId: string;
  categoryLabel: string;
}

export interface SessionResultBreakdown {
  categoryId: string;
  categoryLabel: string;
  correct: number;
  total: number;
}

export interface SessionResult {
  correct: number;
  total: number;
  percent: number;
  estimatedPass: boolean;
  breakdown: SessionResultBreakdown[];
}

export interface ActiveSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  settings: SessionSettings;
  shortageNotes: string[];
  bankSummary: string[];
  items: SessionItemSnapshot[];
  answers: Record<string, string | null>;
  revealed: Record<string, boolean>;
  flaggedForReview: string[];
  currentIndex: number;
  remainingSeconds: number | null;
  timerHidden: boolean;
  submittedAt?: string;
  result?: SessionResult;
}

export interface HistoryEntry {
  id: string;
  completedAt: string;
  settings: SessionSettings;
  timeUsedSeconds: number | null;
  itemIds: string[];
  items: SessionItemSnapshot[];
  answers: Record<string, string | null>;
  flaggedForReview: string[];
  result: SessionResult;
}

export interface ItemFlag {
  id: string;
  item_id: string;
  version: number;
  status: QuestionStatus;
  reason: FlagReason;
  comment: string;
  session_id: string;
  blueprint: BlueprintId;
  mode: ExamMode;
  createdAt: string;
  updatedAt: string;
}

export interface AppMeta {
  disclaimerSeen: boolean;
  demoSeeded?: boolean;
}

export interface LoadedBank {
  questions: Question[];
  notes: string[];
}