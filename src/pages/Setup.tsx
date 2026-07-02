import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../app/AppContext';
import { getBlueprintLabel } from '../data/blueprints';
import type { BlueprintId, ExamMode, QuestionSet } from '../types/exam';

export function Setup() {
  const navigate = useNavigate();
  const {
    settings, updateSettings, handleBlueprintChange, handleModeChange,
    handleQuestionSetChange, startSession, bank, availableQuestionCount,
    activeSession
  } = useApp();

  const [showAdvanced, setShowAdvanced] = useState(false);

  function handleStart() {
    startSession();
    navigate('/session');
  }

  const QUESTION_MIN = 10;

  return (
    <div className="app-content">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 720 }}>
        <section className="card stack-gap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Session configuration</p>
              <h2 style={{ fontSize: '1.1rem' }}>Setup</h2>
            </div>
            <span className="badge badge--soft">
              {settings.questionSet === 'scenario' ? 'Scenario' : 'Standard'} bank: {bank.questions.length} items
            </span>
          </div>

          {bank.notes.length > 0 && (
            <div className="notice-block">
              {bank.notes.map((note) => <p key={note}>{note}</p>)}
            </div>
          )}

          <div className="settings-grid">
            <label>
              Blueprint version
              <select value={settings.blueprintId} onChange={(e) => handleBlueprintChange(e.target.value as BlueprintId)}>
                <option value="cctc-from-2026-07">2026-07 (default)</option>
                <option value="cctc-thru-2026-06">Until 2026-06</option>
              </select>
            </label>

            <label>
              Question set
              <select value={settings.questionSet} onChange={(e) => handleQuestionSetChange(e.target.value as QuestionSet)}>
                <option value="standard">Standard bank</option>
                <option value="scenario">Scenario companions</option>
              </select>
            </label>

            <label>
              Question count
              <input
                type="number"
                min={Math.min(QUESTION_MIN, Math.max(1, availableQuestionCount))}
                max={Math.max(availableQuestionCount, 1)}
                value={settings.questionCount}
                onChange={(e) => updateSettings({ questionCount: Number(e.target.value) || 0 })}
              />
              <span className="field-hint">Available: {availableQuestionCount}</span>
            </label>

            <label>
              Mode
              <select value={settings.mode} onChange={(e) => handleModeChange(e.target.value as ExamMode)}>
                <option value="exam">Exam</option>
                <option value="study">Study</option>
              </select>
            </label>

            <label>
              Timed session
              <div className="toggle-row">
                <input type="checkbox" checked={settings.timed} onChange={(e) => updateSettings({ timed: e.target.checked })} />
                <span>{settings.timed ? 'Timer enabled' : 'Untimed'}</span>
              </div>
            </label>

            <label>
              Minutes
              <input
                type="number"
                min={1}
                value={settings.timeMinutes}
                onChange={(e) => updateSettings({ timeMinutes: Math.max(1, Number(e.target.value) || 1) })}
                disabled={!settings.timed}
              />
            </label>

            <label>
              On-screen timer
              <div className="toggle-row">
                <input type="checkbox" checked={settings.showTimer} onChange={(e) => updateSettings({ showTimer: e.target.checked })} />
                <span>{settings.showTimer ? 'Visible' : 'Hidden'}</span>
              </div>
            </label>
          </div>

          {/* Advanced options */}
          <button className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            Advanced Options
          </button>

          {showAdvanced && (
            <div className="settings-grid" style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
              <label>
                Exam date (optional)
                <input
                  type="date"
                  value={settings.examDate ?? ''}
                  onChange={(e) => updateSettings({ examDate: e.target.value || undefined })}
                />
                <span className="field-hint">Sets a countdown and predicted ready date</span>
              </label>

              <label>
                Target score: {settings.targetThreshold}%
                <input
                  type="range"
                  min={50}
                  max={90}
                  value={settings.targetThreshold}
                  onChange={(e) => updateSettings({ targetThreshold: Number(e.target.value) })}
                  className="target-slider"
                />
              </label>

              <label>
                Include draft items
                <div className="toggle-row">
                  <input
                    type="checkbox"
                    checked={settings.includeDrafts}
                    onChange={(e) => updateSettings({ includeDrafts: e.target.checked })}
                    disabled={settings.mode === 'exam'}
                  />
                  <span>{settings.mode === 'exam' ? 'Reviewed-only in exam mode' : 'Drafts visible and labeled'}</span>
                </div>
              </label>
            </div>
          )}

          <div style={{ paddingTop: '0.5rem' }}>
            <div className="summary-card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.9rem' }}>Selected setup</h3>
              <p><strong>Blueprint:</strong> {getBlueprintLabel(settings.blueprintId)}</p>
              <p><strong>Question set:</strong> {settings.questionSet === 'scenario' ? 'Scenario companions' : 'Standard bank'}</p>
              <p><strong>Mode:</strong> {settings.mode === 'exam' ? 'Exam mode' : 'Study mode'}</p>
              <p><strong>Timer:</strong> {settings.timed ? `${settings.timeMinutes} minutes` : 'Untimed'}</p>
              <p><strong>Draft handling:</strong> {settings.includeDrafts ? 'Drafts included' : 'Reviewed items only'}</p>
            </div>

            <div className="action-row">
              {activeSession && !activeSession.submittedAt && (
                <button className="secondary-button" onClick={() => navigate('/session')}>
                  Resume current session
                </button>
              )}
              <button className="primary-button" onClick={handleStart}>
                {activeSession ? 'Start new session' : 'Start session'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
