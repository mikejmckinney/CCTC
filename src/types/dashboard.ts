import type { BlueprintId, ExamMode, SessionSettings } from './exam';

// ─── Expanded View type ───
export type View =
  | 'dashboard'
  | 'setup'
  | 'session'
  | 'history'
  | 'history-detail'
  | 'review'
  | 'reported';

// ─── User Preferences (persisted in IndexedDB) ───
export interface UserPreferences {
  examDate: string | null;       // ISO date string, null if not set
  targetScore: number;           // 50–90, default 65
  lastQuickStart: QuickStartType | null;
  lastSettings: SessionSettings | null;
}

export type QuickStartType = 'full-exam' | 'quick-session' | 'weak-areas' | 'resume';

// ─── Domain Performance (per-domain breakdown) ───
export interface DomainPerformance {
  domainId: string;
  domainLabel: string;
  domainWeightPct: number;      // blueprint weight %
  emaScore: number;             // 0–100, exponential moving average
  totalAttempted: number;
  totalCorrect: number;
  isWeak: boolean;              // below threshold
}

// ─── Readiness Score ───
export interface ReadinessState {
  composite: number;            // 0–100, final readiness score
  emaScore: number;             // 0–100, performance component
  coverageBreadth: number;      // 0–100, coverage component
  domains: DomainPerformance[];
  weakDomains: DomainPerformance[];
  strongDomains: DomainPerformance[];
  totalSessions: number;
  totalQuestionsAttempted: number;
  overallEmaPercent: number;    // raw EMA of overall session scores
}

// ─── Study Plan ───
export interface StudyPlanItem {
  priority: 'high' | 'medium' | 'low';
  domainId: string;
  domainLabel: string;
  topic: string;
  estimatedMinutes: number;
  reason: string;
}

export interface StudyPlan {
  items: StudyPlanItem[];
  recommendedNextAction: string;
  examCountdown: number | null; // days until exam, null if no date set
  readyLevel: 'not-ready' | 'getting-there' | 'almost-there' | 'ready';
}

// ─── Am I Ready Insights ───
export interface ReadyInsight {
  type: 'positive' | 'warning' | 'info';
  message: string;
}

export interface AmIReady {
  level: 'not-ready' | 'getting-there' | 'almost-there' | 'ready';
  label: string;
  summary: string;
  insights: ReadyInsight[];
}

// ─── Item-level performance tracking ───
export interface ItemPerformanceRecord {
  itemId: string;
  attempts: number;
  correct: number;
  incorrect: number;
  lastAttemptAt: string;
  lastCorrect: boolean;
  // Weighted score for spaced repetition: higher = needs more review
  weaknessScore: number;
}
