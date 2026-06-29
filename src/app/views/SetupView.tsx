import { useState } from 'react';
import { getBlueprintLabel } from '../../data/blueprints';
import type { ActiveSession, BlueprintId, ExamMode, Question, QuestionSet, SessionSettings } from '../../types/exam';

interface SetupViewProps {
  settings: SessionSettings;
  bank: { questions: Question[]; notes: string[] };
  availableQuestionCount: number;
  activeSession: ActiveSession | null;
  lastCustomSettings?: SessionSettings;
  examDate?: string;
  onUpdateSettings: (partial: Partial<SessionSettings>) => void;
  onStartSession: () => void;
  onResumeSession: () => void;
  onLaunchLastCustom: () => void;
  onSaveLastCustom: (settings: SessionSettings) => void;
  onUpdateExamDate: (date: string) => void;
}

export function SetupView({
  settings, bank, availableQuestionCount, activeSession, lastCustomSettings,
  examDate, onUpdateSettings, onStartSession, onResumeSession, onLaunchLastCustom,
  onSaveLastCustom, onUpdateExamDate
}: SetupViewProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const hasUnfinished = activeSession && !activeSession.submittedAt;

  function handleStart(): void {
    onSaveLastCustom(settings);
    onStartSession();
  }

  return (
    <div className="stack stack--gap-lg">
      <div>
        <h1>Build a session</h1>
        <p className="field-hint" style={{ marginTop: 4 }}>
          {settings.questionSet === 'scenario' ? 'Scenario' : 'Standard'} bank: {bank.questions.length} items
        </p>
      </div>

      {hasUnfinished && (
        <div className="resume-banner">
          <span className="resume-banner__text">
            Resume your session · Item {(activeSession.currentIndex + 1)} of {activeSession.items.length}
          </span>
          <button className="resume-banner__btn" onClick={onResumeSession}>Resume</button>
        </div>
      )}

      {/* Quick start presets */}
      <div className="row" style={{ gap: 12 }}>
        <button className="quick-card" style={{ flex: 1 }} onClick={() => {
          onUpdateSettings({ mode: 'exam', questionCount: settings.blueprintId === 'cctc-from-2026-07' ? 175 : 150, timed: true, timeMinutes: 180 });
          handleStart();
        }}>
          <span className="quick-card__title">Full mock</span>
          <span className="quick-card__desc">175 q · 180 min</span>
        </button>
        <button className="quick-card" style={{ flex: 1 }} onClick={() => {
          onUpdateSettings({ mode: 'exam', questionCount: 25, timed: true, timeMinutes: 30 });
          handleStart();
        }}>
          <span className="quick-card__title">Quick exam</span>
          <span className="quick-card__desc">25 q · 30 min</span>
        </button>
      </div>

      {lastCustomSettings && (
        <button className="quick-card" onClick={onLaunchLastCustom}>
          <span className="quick-card__title">Your last custom setup</span>
          <span className="quick-card__desc">
            {lastCustomSettings.mode} · {lastCustomSettings.questionCount} q · {lastCustomSettings.timed ? `${lastCustomSettings.timeMinutes} min` : 'Untimed'}
          </span>
        </button>
      )}

      {/* Customize form */}
      <div className="card card--panel stack stack--gap">
        <p className="eyebrow">Customize</p>

        <label>
          Mode
          <div className="segmented">
            <button className={`segmented__option${settings.mode === 'exam' ? ' is-active' : ''}`}
              onClick={() => onUpdateSettings({ mode: 'exam' as ExamMode })}>Exam</button>
            <button className={`segmented__option${settings.mode === 'study' ? ' is-active' : ''}`}
              onClick={() => onUpdateSettings({ mode: 'study' as ExamMode })}>Study</button>
          </div>
        </label>

        <label>
          Question set
          <div className="segmented">
            <button className={`segmented__option${settings.questionSet === 'standard' ? ' is-active' : ''}`}
              onClick={() => onUpdateSettings({ questionSet: 'standard' as QuestionSet })}>Standard bank</button>
            <button className={`segmented__option${settings.questionSet === 'scenario' ? ' is-active' : ''}`}
              onClick={() => onUpdateSettings({ questionSet: 'scenario' as QuestionSet })}>Scenario companions</button>
          </div>
        </label>

        <label>
          Question count
          <input
            type="number"
            min={Math.min(10, Math.max(1, availableQuestionCount))}
            max={Math.max(availableQuestionCount, 1)}
            value={settings.questionCount}
            onChange={(e) => onUpdateSettings({ questionCount: Number(e.target.value) || 0 })}
          />
          <span className="field-hint">Available for this configuration: {availableQuestionCount}</span>
        </label>

        <label>
          Time limit (minutes)
          <input
            type="number"
            min={1}
            value={settings.timeMinutes}
            onChange={(e) => onUpdateSettings({ timeMinutes: Math.max(1, Number(e.target.value) || 1) })}
            disabled={!settings.timed}
          />
        </label>

        <div className="toggle-row">
          <span style={{ fontSize: 13, fontWeight: 600 }}>Timed session</span>
          <button
            className={`toggle-track${settings.timed ? ' is-on' : ''}`}
            onClick={() => onUpdateSettings({ timed: !settings.timed })}
            role="switch"
            aria-checked={settings.timed}
          >
            <span className="toggle-knob" />
          </button>
        </div>

        <div className="toggle-row">
          <span style={{ fontSize: 13, fontWeight: 600 }}>Show timer</span>
          <button
            className={`toggle-track${settings.showTimer ? ' is-on' : ''}`}
            onClick={() => onUpdateSettings({ showTimer: !settings.showTimer })}
            role="switch"
            aria-checked={settings.showTimer}
          >
            <span className="toggle-knob" />
          </button>
        </div>

        {/* Advanced disclosure */}
        <button className="btn-ghost" style={{ justifyContent: 'flex-start', fontSize: 13 }}
          onClick={() => setAdvancedOpen(!advancedOpen)}>
          {advancedOpen ? '▾' : '▸'} Exam preferences & advanced
        </button>

        {advancedOpen && (
          <div className="stack stack--gap" style={{ paddingLeft: 16, borderLeft: '2px solid var(--line)' }}>
            <label>
              Blueprint version
              <select value={settings.blueprintId} onChange={(e) => onUpdateSettings({ blueprintId: e.target.value as BlueprintId })}>
                <option value="cctc-from-2026-07">2026-07 (default)</option>
                <option value="cctc-thru-2026-06">Until 2026-06</option>
              </select>
            </label>

            {settings.mode === 'study' && (
              <div className="toggle-row">
                <span style={{ fontSize: 13, fontWeight: 600 }}>Include draft items</span>
                <button
                  className={`toggle-track${settings.includeDrafts ? ' is-on' : ''}`}
                  onClick={() => onUpdateSettings({ includeDrafts: !settings.includeDrafts })}
                  role="switch"
                  aria-checked={settings.includeDrafts}
                >
                  <span className="toggle-knob" />
                </button>
              </div>
            )}

            <label>
              Exam date
              <input
                type="date"
                value={examDate ?? ''}
                onChange={(e) => onUpdateExamDate(e.target.value)}
              />
              <span className="field-hint">Drives the countdown and readiness pacing.</span>
            </label>

            <label>
              Target score ({settings.targetThreshold}%)
              <input
                type="range"
                min={50}
                max={90}
                step={1}
                value={settings.targetThreshold}
                onChange={(e) => onUpdateSettings({ targetThreshold: Number(e.target.value) })}
              />
              <span className="field-hint">Pass/below line for results and readiness.</span>
            </label>
          </div>
        )}
      </div>

      {/* Start button */}
      <button className="btn-primary" style={{ width: '100%' }} onClick={handleStart}>
        Start {settings.mode} session · {settings.questionCount} questions
      </button>
    </div>
  );
}
