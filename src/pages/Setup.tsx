import { useState } from 'react';
import type { SessionSettings, BlueprintId, ExamMode, QuestionSet } from '../types/exam';
import { getBlueprintLabel } from '../data/blueprints';

interface SetupProps {
  settings: SessionSettings;
  onUpdate: (settings: Partial<SessionSettings>) => void;
  onStart: () => void;
  availableCount: number;
}

export default function Setup({ settings, onUpdate, onStart, availableCount }: SetupProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="stack">
      <div className="page-header">
        <h1 className="page-title">Setup</h1>
        <p className="page-desc">Configure your practice session</p>
      </div>

      <div className="grid-2">
        <div className="card stack">
          <div className="form-group">
            <label className="form-label">Mode</label>
            <select
              className="form-select"
              value={settings.mode}
              onChange={(e) => onUpdate({ mode: e.target.value as ExamMode })}
            >
              <option value="exam">Exam — answers revealed after submit</option>
              <option value="study">Study — answers revealed immediately</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Question Set</label>
            <select
              className="form-select"
              value={settings.questionSet}
              onChange={(e) => onUpdate({ questionSet: e.target.value as QuestionSet })}
            >
              <option value="standard">Standard bank</option>
              <option value="scenario">Scenario companions</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Question Count</label>
            <input
              className="form-input"
              type="number"
              min={1}
              max={availableCount}
              value={settings.questionCount}
              onChange={(e) => onUpdate({ questionCount: Math.max(1, Math.min(availableCount, Number(e.target.value) || 1)) })}
            />
            <span className="form-hint">Available: {availableCount} items</span>
          </div>

          <div className="form-group">
            <label className="form-label">Timer</label>
            <div className="toggle-row">
              <button
                type="button"
                className={`toggle ${settings.timed ? 'is-on' : ''}`}
                onClick={() => onUpdate({ timed: !settings.timed })}
                aria-pressed={settings.timed}
              />
              <span style={{ fontSize: 13 }}>{settings.timed ? 'Timed' : 'Untimed'}</span>
            </div>
          </div>

          {settings.timed && (
            <div className="form-group">
              <label className="form-label">Time Limit (minutes)</label>
              <input
                className="form-input"
                type="number"
                min={1}
                value={settings.timeMinutes}
                onChange={(e) => onUpdate({ timeMinutes: Math.max(1, Number(e.target.value) || 1) })}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Show Timer During Session</label>
            <div className="toggle-row">
              <button
                type="button"
                className={`toggle ${settings.showTimer ? 'is-on' : ''}`}
                onClick={() => onUpdate({ showTimer: !settings.showTimer })}
                aria-pressed={settings.showTimer}
              />
              <span style={{ fontSize: 13 }}>{settings.showTimer ? 'Visible' : 'Hidden'}</span>
            </div>
          </div>

          {settings.mode === 'study' && (
            <div className="form-group">
              <label className="form-label">Include Draft Items</label>
              <div className="toggle-row">
                <button
                  type="button"
                  className={`toggle ${settings.includeDrafts ? 'is-on' : ''}`}
                  onClick={() => onUpdate({ includeDrafts: !settings.includeDrafts })}
                  aria-pressed={settings.includeDrafts}
                />
                <span style={{ fontSize: 13 }}>{settings.includeDrafts ? 'Drafts included' : 'Reviewed only'}</span>
              </div>
            </div>
          )}
        </div>

        <div className="card stack">
          <button
            className="btn btn-secondary"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ justifyContent: 'space-between' }}
          >
            Advanced Options
            <span>{showAdvanced ? '▲' : '▼'}</span>
          </button>

          {showAdvanced && (
            <div className="stack">
              <div className="form-group">
                <label className="form-label">Exam Date (optional)</label>
                <input
                  className="form-input"
                  type="date"
                  onChange={(e) => {
                    try { localStorage.setItem('cctc-exam-date', e.target.value); } catch {}
                  }}
                  defaultValue={(() => { try { return localStorage.getItem('cctc-exam-date') || ''; } catch { return ''; } })()}
                />
                <span className="form-hint">Set a target date for your exam — used for study plan recommendations</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Target Score: <strong>{settings.targetThreshold}%</strong>
                </label>
                <input
                  className="form-slider"
                  type="range"
                  min={50}
                  max={90}
                  step={1}
                  value={settings.targetThreshold}
                  onChange={(e) => onUpdate({ targetThreshold: Number(e.target.value) })}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-muted)' }}>
                  <span>50%</span>
                  <span>90%</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Blueprint Version</label>
                <select
                  className="form-select"
                  value={settings.blueprintId}
                  onChange={(e) => onUpdate({ blueprintId: e.target.value as BlueprintId })}
                >
                  <option value="cctc-from-2026-07">{getBlueprintLabel('cctc-from-2026-07')}</option>
                  <option value="cctc-thru-2026-06">{getBlueprintLabel('cctc-thru-2026-06')}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Draft Items</label>
                <div className="toggle-row">
                  <button
                    type="button"
                    className={`toggle ${settings.includeDrafts ? 'is-on' : ''}`}
                    onClick={() => onUpdate({ includeDrafts: !settings.includeDrafts })}
                    aria-pressed={settings.includeDrafts}
                    disabled={settings.mode === 'exam'}
                  />
                  <span style={{ fontSize: 13, color: settings.mode === 'exam' ? 'var(--fg-muted)' : undefined }}>
                    {settings.mode === 'exam' ? 'Exam mode uses reviewed items only' : settings.includeDrafts ? 'Drafts included' : 'Reviewed only'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="notice notice-info" style={{ marginTop: 12 }}>
            <strong>Selected:</strong> {getBlueprintLabel(settings.blueprintId)} · {settings.questionSet} bank · {settings.mode} mode ·{' '}
            {settings.timed ? `${settings.timeMinutes} min` : 'untimed'} · {settings.questionCount} questions
          </div>

          <button className="btn btn-primary" onClick={onStart} style={{ marginTop: 12 }}>
            Start Session
          </button>
        </div>
      </div>
    </div>
  );
}
