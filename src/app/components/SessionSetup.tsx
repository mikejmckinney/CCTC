import { useState } from 'react';
import type { BlueprintId, QuestionSet, ExamMode, SessionSettings, Blueprint, ActiveSession, LoadedBank } from '../../types/exam';
import { getBlueprintLabel } from '../../data/blueprints';

interface SessionSetupProps {
  settings: SessionSettings;
  bank: LoadedBank;
  availableQuestionCount: number;
  currentBlueprint: Blueprint;
  handleBlueprintChange: (nextBlueprintId: BlueprintId) => void;
  handleQuestionSetChange: (nextQuestionSet: QuestionSet) => void;
  updateSettings: (next: Partial<SessionSettings>) => void;
  handleModeChange: (nextMode: ExamMode) => void;
  startSession: () => void;
  activeSession: ActiveSession | null;
  discardActiveSession: () => void;
  setView: (view: 'session') => void;
  questionMin: number;
}

export function SessionSetup({
  settings,
  bank,
  availableQuestionCount,
  currentBlueprint,
  handleBlueprintChange,
  handleQuestionSetChange,
  updateSettings,
  handleModeChange,
  startSession,
  activeSession,
  discardActiveSession,
  setView,
  questionMin
}: SessionSetupProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <section className="panel stack-gap">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Customize session</p>
          <h2>Session setup</h2>
        </div>
        <span className="badge badge--soft">
          {settings.questionSet === 'scenario' ? 'Scenario' : 'Standard'} bank: {bank.questions.length} item(s)
        </span>
      </div>

      {bank.notes.length > 0 && (
        <div className="notice-block">
          {bank.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      )}

      <div className="settings-grid settings-grid--compact">
        <label>
          Mode
          <select value={settings.mode} onChange={(event) => handleModeChange(event.target.value as ExamMode)}>
            <option value="exam">Exam</option>
            <option value="study">Study</option>
          </select>
        </label>

        <label>
          Blueprint version
          <select value={settings.blueprintId} onChange={(event) => handleBlueprintChange(event.target.value as BlueprintId)}>
            <option value="cctc-from-2026-07">2026-07 (default)</option>
            <option value="cctc-thru-2026-06">Until 2026-06</option>
          </select>
        </label>

        <label>
          Question set
          <select value={settings.questionSet} onChange={(event) => handleQuestionSetChange(event.target.value as QuestionSet)}>
            <option value="standard">Standard bank</option>
            <option value="scenario">Scenario companions</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        className="text-link-button disclosure-toggle"
        onClick={() => setShowAdvanced(!showAdvanced)}
        aria-expanded={showAdvanced}
      >
        {showAdvanced ? 'Hide advanced settings' : 'Advanced settings'}
      </button>

      {showAdvanced && (
        <div className="settings-grid">
          <label>
            Question count
            <input
              type="number"
              min={Math.min(questionMin, Math.max(1, availableQuestionCount))}
              max={Math.max(availableQuestionCount, 1)}
              value={settings.questionCount}
              onChange={(event) => updateSettings({ questionCount: Number(event.target.value) || 0 })}
            />
            <span className="field-hint">Available for this configuration: {availableQuestionCount}</span>
          </label>

          <label>
            Timed session
            <div className="toggle-row">
              <input type="checkbox" checked={settings.timed} onChange={(event) => updateSettings({ timed: event.target.checked })} />
              <span>{settings.timed ? 'Timer enabled' : 'Untimed session'}</span>
            </div>
          </label>

          <label>
            Minutes
            <input
              type="number"
              min={1}
              value={settings.timeMinutes}
              onChange={(event) => updateSettings({ timeMinutes: Math.max(1, Number(event.target.value) || 1) })}
              disabled={!settings.timed}
            />
          </label>

          <label>
            On-screen timer
            <div className="toggle-row">
              <input type="checkbox" checked={settings.showTimer} onChange={(event) => updateSettings({ showTimer: event.target.checked })} />
              <span>{settings.showTimer ? 'Visible during session' : 'Hidden during session'}</span>
            </div>
          </label>

          <label>
            Include draft items
            <div className="toggle-row">
              <input
                type="checkbox"
                checked={settings.includeDrafts}
                onChange={(event) => updateSettings({ includeDrafts: event.target.checked })}
                disabled={settings.mode === 'exam'}
              />
              <span>{settings.mode === 'exam' ? 'Exam mode defaults to reviewed-only' : 'Drafts remain visibly labeled'}</span>
            </div>
          </label>

          <label>
            Target threshold (%)
            <input
              type="number"
              min={1}
              max={100}
              value={settings.targetThreshold}
              onChange={(event) => updateSettings({ targetThreshold: Math.min(100, Math.max(1, Number(event.target.value) || 1)) })}
            />
            <span className="field-hint">Used only for the unofficial practice estimate label.</span>
          </label>
        </div>
      )}

      <div className="summary-card">
        <h3>Selected setup</h3>
        <p><strong>Blueprint:</strong> {getBlueprintLabel(settings.blueprintId)}</p>
        <p><strong>Question set:</strong> {settings.questionSet === 'scenario' ? 'Scenario companions' : 'Standard bank'}</p>
        <p><strong>Mode:</strong> {settings.mode === 'exam' ? 'Exam mode' : 'Study mode'}</p>
        <p><strong>Timer:</strong> {settings.timed ? `${settings.timeMinutes} minutes` : 'Untimed'}</p>
        <p><strong>Draft handling:</strong> {settings.includeDrafts ? 'Drafts included and labeled' : 'Reviewed items only'}</p>
        <p>
          <strong>Weighting:</strong> {currentBlueprint.structure === 'domain_task' ? 'Current blueprint domains' : 'Legacy blueprint sections via crosswalk'}
        </p>
      </div>

      <div className="action-row">
        {activeSession && (
          <button className="secondary-button" onClick={() => setView('session')}>
            Resume current session
          </button>
        )}
        {activeSession && (
          <button className="ghost-button" onClick={discardActiveSession}>
            Discard unfinished session
          </button>
        )}
        <button className="primary-button" onClick={startSession}>
          {activeSession ? 'Replace or resume session' : 'Start session'}
        </button>
      </div>
    </section>
  );
}
