import { useState } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ChevronDown, ChevronUp, Play, Settings } from 'lucide-react';
import type { BlueprintId, ExamMode, QuestionSet, SessionSettings } from '../../types/exam';
import type { UserPreferences } from '../../types/dashboard';

interface SetupPageProps {
  settings: SessionSettings;
  userPrefs: UserPreferences;
  availableCount: number;
  bankNotes: string[];
  bankLabel: string;
  bankCount: number;
  hasActiveSession: boolean;
  onUpdateSettings: (patch: Partial<SessionSettings>) => void;
  onUpdatePrefs: (patch: Partial<UserPreferences>) => void;
  onStartSession: () => void;
  onResumeSession: () => void;
  onDiscardSession: () => void;
  onBlueprintChange: (id: BlueprintId) => void;
  onModeChange: (mode: ExamMode) => void;
  onQuestionSetChange: (set: QuestionSet) => void;
}

export function SetupPage({
  settings,
  userPrefs,
  availableCount,
  bankNotes,
  bankLabel,
  bankCount,
  hasActiveSession,
  onUpdateSettings,
  onUpdatePrefs,
  onStartSession,
  onResumeSession,
  onDiscardSession,
  onBlueprintChange,
  onModeChange,
  onQuestionSetChange,
}: SetupPageProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-text">Setup</h1>
          <p className="text-sm text-text-secondary">{bankLabel}: {bankCount} item(s)</p>
        </div>
      </div>

      {/* Bank notes */}
      {bankNotes.length > 0 && (
        <div className="rounded-md bg-primary/5 px-4 py-3 text-sm text-text-secondary">
          {bankNotes.map((note) => <p key={note}>{note}</p>)}
        </div>
      )}

      {/* Core settings */}
      <Card>
        <div className="space-y-5">
          {/* Blueprint */}
          <Field label="Blueprint version">
            <select
              className="input-field"
              value={settings.blueprintId}
              onChange={(e) => onBlueprintChange(e.target.value as BlueprintId)}
            >
              <option value="cctc-from-2026-07">2026-07 (default)</option>
              <option value="cctc-thru-2026-06">Until 2026-06</option>
            </select>
          </Field>

          {/* Question count */}
          <Field label="Question count" hint={`Available: ${availableCount}`}>
            <input
              type="number"
              className="input-field"
              min={Math.min(10, Math.max(1, availableCount))}
              max={Math.max(availableCount, 1)}
              value={settings.questionCount}
              onChange={(e) => onUpdateSettings({ questionCount: Number(e.target.value) || 0 })}
            />
          </Field>

          {/* Mode */}
          <Field label="Mode">
            <select
              className="input-field"
              value={settings.mode}
              onChange={(e) => onModeChange(e.target.value as ExamMode)}
            >
              <option value="exam">Exam — results after submit</option>
              <option value="study">Study — reveal immediately</option>
            </select>
          </Field>

          {/* Timed */}
          <Field label="Timer">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-primary"
                  checked={settings.timed}
                  onChange={(e) => onUpdateSettings({ timed: e.target.checked })}
                />
                <span className="text-text">Timed</span>
              </label>
              {settings.timed && (
                <input
                  type="number"
                  className="input-field w-20"
                  min={1}
                  value={settings.timeMinutes}
                  onChange={(e) => onUpdateSettings({ timeMinutes: Math.max(1, Number(e.target.value) || 1) })}
                />
              )}
              {settings.timed && <span className="text-sm text-text-muted">minutes</span>}
            </div>
          </Field>
        </div>
      </Card>

      {/* Advanced Options */}
      <div className="rounded-lg border border-border bg-surface">
        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-surface-muted"
        >
          <span className="text-sm font-semibold text-text">Advanced Options</span>
          {advancedOpen ? (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
        </button>

        {advancedOpen && (
          <div className="space-y-5 border-t border-border px-5 py-5">
            {/* Exam date */}
            <Field label="Exam date" hint="Optional — sets a countdown on the dashboard">
              <input
                type="date"
                className="input-field"
                value={userPrefs.examDate ?? ''}
                onChange={(e) => onUpdatePrefs({ examDate: e.target.value || null })}
              />
            </Field>

            {/* Target score */}
            <Field label={`Target score: ${userPrefs.targetScore}%`} hint="Used for readiness assessment">
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted">50%</span>
                <input
                  type="range"
                  className="flex-1 accent-primary"
                  min={50}
                  max={90}
                  step={1}
                  value={userPrefs.targetScore}
                  onChange={(e) => onUpdatePrefs({ targetScore: Number(e.target.value) })}
                />
                <span className="text-xs text-text-muted">90%</span>
              </div>
            </Field>

            {/* Blueprint version (detailed) */}
            <Field label="Question set">
              <select
                className="input-field"
                value={settings.questionSet}
                onChange={(e) => onQuestionSetChange(e.target.value as QuestionSet)}
              >
                <option value="standard">Standard bank</option>
                <option value="scenario">Scenario companions</option>
              </select>
            </Field>

            {/* Draft toggle */}
            <Field label="Include draft items" hint={settings.mode === 'exam' ? 'Exam mode defaults to reviewed-only' : 'Drafts remain visibly labeled'}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-primary"
                  checked={settings.includeDrafts}
                  onChange={(e) => onUpdateSettings({ includeDrafts: e.target.checked })}
                  disabled={settings.mode === 'exam'}
                />
                <span className="text-text">Include draft items in session</span>
              </label>
            </Field>

            {/* On-screen timer */}
            <Field label="On-screen timer">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-primary"
                  checked={settings.showTimer}
                  onChange={(e) => onUpdateSettings({ showTimer: e.target.checked })}
                />
                <span className="text-text">{settings.showTimer ? 'Visible during session' : 'Hidden during session'}</span>
              </label>
            </Field>

            {/* Target threshold (exam-level) */}
            <Field label="Session pass threshold" hint="Used only for the unofficial practice estimate label">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="input-field w-20"
                  min={1}
                  max={100}
                  value={settings.targetThreshold}
                  onChange={(e) => onUpdateSettings({ targetThreshold: Math.min(100, Math.max(1, Number(e.target.value) || 1)) })}
                />
                <span className="text-sm text-text-muted">%</span>
              </div>
            </Field>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {hasActiveSession && (
          <Button variant="secondary" onClick={onResumeSession}>
            Resume current session
          </Button>
        )}
        {hasActiveSession && (
          <Button variant="ghost" onClick={onDiscardSession}>
            Discard unfinished session
          </Button>
        )}
        <Button onClick={onStartSession} className="gap-2">
          <Play className="h-4 w-4" />
          {hasActiveSession ? 'Replace or resume session' : 'Start session'}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
