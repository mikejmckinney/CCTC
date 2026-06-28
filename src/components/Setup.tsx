import { useState } from 'react';
import { getBlueprint, getBlueprintLabel } from '../data/blueprints';
import type { BlueprintId, ExamMode, QuestionSet, SessionSettings } from '../types/exam';

interface SetupProps {
  settings: SessionSettings;
  onUpdateSettings: (next: Partial<SessionSettings>) => void;
  onBlueprintChange: (id: BlueprintId) => void;
  onModeChange: (mode: ExamMode) => void;
  onQuestionSetChange: (qs: QuestionSet) => void;
  onStartSession: () => void;
  availableQuestionCount: number;
  hasActiveSession: boolean;
  onResumeSession: () => void;
  onDiscardSession: () => void;
  bankNotes: string[];
  bankQuestionCount: number;
}

export default function Setup({
  settings,
  onUpdateSettings,
  onBlueprintChange,
  onModeChange,
  onQuestionSetChange,
  onStartSession,
  availableQuestionCount,
  hasActiveSession,
  onResumeSession,
  onDiscardSession,
  bankNotes,
  bankQuestionCount,
}: SetupProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const blueprint = getBlueprint(settings.blueprintId);

  return (
    <div className="card card-stack">
      <div className="card-header">
        <div>
          <p className="eyebrow">Session setup</p>
          <h2>Build a practice session</h2>
        </div>
        <span className="badge badge-default">
          {settings.questionSet === 'scenario' ? 'Scenario' : 'Standard'} bank: {bankQuestionCount}
        </span>
      </div>

      {bankNotes.length > 0 && (
        <div className="notice-block">
          {bankNotes.map((note) => <p key={note}>{note}</p>)}
        </div>
      )}

      <div className="form-grid">
        <label className="form-label">
          Blueprint version
          <select
            value={settings.blueprintId}
            onChange={(e) => onBlueprintChange(e.target.value as BlueprintId)}
          >
            <option value="cctc-from-2026-07">2026-07 (default)</option>
            <option value="cctc-thru-2026-06">Until 2026-06</option>
          </select>
        </label>

        <label className="form-label">
          Question set
          <select
            value={settings.questionSet}
            onChange={(e) => onQuestionSetChange(e.target.value as QuestionSet)}
          >
            <option value="standard">Standard bank</option>
            <option value="scenario">Scenario companions</option>
          </select>
          <span className="field-hint">Clinical vignettes paired 1:1 with standard bank.</span>
        </label>

        <label className="form-label">
          Question count
          <input
            type="number"
            min={Math.min(10, Math.max(1, availableQuestionCount))}
            max={Math.max(availableQuestionCount, 1)}
            value={settings.questionCount}
            onChange={(e) => onUpdateSettings({ questionCount: Number(e.target.value) || 0 })}
          />
          <span className="field-hint">Available: {availableQuestionCount}</span>
        </label>

        <label className="form-label">
          Mode
          <select value={settings.mode} onChange={(e) => onModeChange(e.target.value as ExamMode)}>
            <option value="exam">Exam</option>
            <option value="study">Study</option>
          </select>
        </label>

        <label className="form-label">
          Timed session
          <div className="toggle-row">
            <input
              type="checkbox"
              checked={settings.timed}
              onChange={(e) => onUpdateSettings({ timed: e.target.checked })}
            />
            <span>{settings.timed ? 'Timer enabled' : 'Untimed session'}</span>
          </div>
        </label>

        <label className="form-label">
          Minutes
          <input
            type="number"
            min={1}
            value={settings.timeMinutes}
            onChange={(e) => onUpdateSettings({ timeMinutes: Math.max(1, Number(e.target.value) || 1) })}
            disabled={!settings.timed}
          />
        </label>
      </div>

      <button
        className={`advanced-toggle ${showAdvanced ? 'open' : ''}`}
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        Advanced options
      </button>

      {showAdvanced && (
        <div className="form-grid">
          <label className="form-label">
            Exam date
            <input
              type="date"
              value={settings.examDate ?? ''}
              onChange={(e) => onUpdateSettings({ examDate: e.target.value || undefined })}
            />
            <span className="field-hint">Used for countdown and study plan.</span>
          </label>

          <label className="form-label">
            Target score (%)
            <input
              type="number"
              min={1}
              max={100}
              value={settings.targetThreshold}
              onChange={(e) => onUpdateSettings({ targetThreshold: Math.min(100, Math.max(1, Number(e.target.value) || 1)) })}
            />
            <span className="field-hint">Used for readiness estimate.</span>
          </label>

          <label className="form-label">
            On-screen timer
            <div className="toggle-row">
              <input
                type="checkbox"
                checked={settings.showTimer}
                onChange={(e) => onUpdateSettings({ showTimer: e.target.checked })}
              />
              <span>{settings.showTimer ? 'Visible during session' : 'Hidden during session'}</span>
            </div>
          </label>

          <label className="form-label">
            Include draft items
            <div className="toggle-row">
              <input
                type="checkbox"
                checked={settings.includeDrafts}
                onChange={(e) => onUpdateSettings({ includeDrafts: e.target.checked })}
                disabled={settings.mode === 'exam'}
              />
              <span>{settings.mode === 'exam' ? 'Exam mode: reviewed-only' : 'Drafts included and labeled'}</span>
            </div>
          </label>
        </div>
      )}

      <div className="settings-summary">
        <p><strong>Blueprint:</strong> {getBlueprintLabel(settings.blueprintId)}</p>
        <p><strong>Question set:</strong> {settings.questionSet === 'scenario' ? 'Scenario companions' : 'Standard bank'}</p>
        <p><strong>Mode:</strong> {settings.mode === 'exam' ? 'Exam mode' : 'Study mode'}</p>
        <p><strong>Timer:</strong> {settings.timed ? `${settings.timeMinutes} minutes` : 'Untimed'}</p>
        <p><strong>Weighting:</strong> {blueprint.structure === 'domain_task' ? 'Current blueprint domains' : 'Legacy blueprint sections via crosswalk'}</p>
      </div>

      <div className="btn-group">
        {hasActiveSession && (
          <button className="btn-secondary" onClick={onResumeSession}>
            Resume current session
          </button>
        )}
        {hasActiveSession && (
          <button className="btn-ghost" onClick={onDiscardSession}>
            Discard unfinished session
          </button>
        )}
        <button className="btn-primary" onClick={onStartSession}>
          {hasActiveSession ? 'Replace or resume session' : 'Start session'}
        </button>
      </div>
    </div>
  );
}
