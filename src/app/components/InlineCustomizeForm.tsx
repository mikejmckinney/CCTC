import { useState } from 'react';
import { getBlueprintLabel } from '../../data/blueprints';
import type { SessionSettings, BlueprintId, ExamMode, QuestionSet } from '../../types/exam';

interface InlineCustomizeFormProps {
  settings: SessionSettings;
  availableQuestionCount: number;
  examDate?: string;
  onUpdateSettings: (partial: Partial<SessionSettings>) => void;
  onStartSession: () => void;
  onUpdateExamDate: (date: string) => void;
  onSaveLastCustom: (settings: SessionSettings) => void;
}

export function InlineCustomizeForm({
  settings, availableQuestionCount, examDate,
  onUpdateSettings, onStartSession, onUpdateExamDate, onSaveLastCustom
}: InlineCustomizeFormProps) {
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  function handleStart(): void {
    onSaveLastCustom(settings);
    onStartSession();
  }

  function handleToggleDomain(id: number | 'all') {
    const currentDomains = settings.domains ?? 'all';
    if (id === 'all') {
      onUpdateSettings({ domains: 'all' });
      return;
    }
    let next: number[];
    if (currentDomains === 'all') {
      next = [id as number];
    } else {
      next = [...currentDomains];
      const i = next.indexOf(id as number);
      if (i >= 0) {
        next.splice(i, 1);
      } else {
        next.push(id as number);
      }
    }
    onUpdateSettings({ domains: next.length > 0 ? next : 'all' });
  }

  const modeHint = settings.mode === 'exam'
    ? 'Timed, graded, exam-like experience'
    : 'Untimed, see explanations after each item';

  const questionSetHint = settings.questionSet === 'scenario'
    ? 'Scenario companions for case-based prep'
    : 'Full CCTC question bank';

  return (
    <div>
      {/* Toggle button */}
      <button
        className="quick-card"
        onClick={() => setOpen(!open)}
        style={{ width: '100%', textAlign: 'left' }}
      >
        <span className="quick-card__title" style={{ letterSpacing: '.14em', textTransform: 'uppercase', fontSize: 11 }}>
          Customize a session
        </span>
        <span className="quick-card__desc" style={{ marginTop: 3 }}>
          Mode, question set, focus, count, timing &amp; more
        </span>
      </button>

      {/* Collapsible form */}
      {open && (
        <div style={{ padding: '16px 0 4px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Mode */}
          <div>
            <div style={{ font: '600 13px var(--sans)', color: 'var(--ink)', marginBottom: 8 }}>Mode</div>
            <div className="segmented">
              <button
                className={`segmented__option${settings.mode === 'exam' ? ' is-active' : ''}`}
                onClick={() => onUpdateSettings({ mode: 'exam' as ExamMode })}
              >Exam</button>
              <button
                className={`segmented__option${settings.mode === 'study' ? ' is-active' : ''}`}
                onClick={() => onUpdateSettings({ mode: 'study' as ExamMode })}
              >Study</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{modeHint}</div>
          </div>

          {/* Question set */}
          <div>
            <div style={{ font: '600 13px var(--sans)', color: 'var(--ink)', marginBottom: 8 }}>Question set</div>
            <div className="segmented">
              <button
                className={`segmented__option${settings.questionSet === 'standard' ? ' is-active' : ''}`}
                onClick={() => onUpdateSettings({ questionSet: 'standard' as QuestionSet })}
              >Standard bank</button>
              <button
                className={`segmented__option${settings.questionSet === 'scenario' ? ' is-active' : ''}`}
                onClick={() => onUpdateSettings({ questionSet: 'scenario' as QuestionSet })}
              >Scenario companions</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{questionSetHint}</div>
          </div>

          {/* Focus */}
          <div>
            <div style={{ font: '600 13px var(--sans)', color: 'var(--ink)', marginBottom: 8 }}>Focus</div>
            <div className="focus-chips">
              <button
                className={`focus-chip${(settings.domains === 'all' || !settings.domains) ? ' is-selected' : ''}`}
                onClick={() => handleToggleDomain('all')}
              >All domains</button>
              <button
                className={`focus-chip${(settings.domains !== 'all' && settings.domains?.includes(1)) ? ' is-selected' : ''}`}
                onClick={() => handleToggleDomain(1)}
              >Education</button>
              <button
                className={`focus-chip${(settings.domains !== 'all' && settings.domains?.includes(2)) ? ' is-selected' : ''}`}
                onClick={() => handleToggleDomain(2)}
              >Pre-transplant</button>
              <button
                className={`focus-chip${(settings.domains !== 'all' && settings.domains?.includes(3)) ? ' is-selected' : ''}`}
                onClick={() => handleToggleDomain(3)}
              >Post-op</button>
            </div>
          </div>

          {/* Question count + Time limit */}
          <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <label>
              <div style={{ font: '600 13px var(--sans)', color: 'var(--ink)', marginBottom: 8 }}>Question count</div>
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
              <div style={{ font: '600 13px var(--sans)', color: 'var(--ink)', marginBottom: 8 }}>Time limit (minutes)</div>
              <input
                type="number"
                min={1}
                value={settings.timeMinutes}
                onChange={(e) => onUpdateSettings({ timeMinutes: Math.max(1, Number(e.target.value) || 1) })}
                disabled={!settings.timed}
              />
            </label>
          </div>

          {/* Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="toggle-row">
              <div>
                <div style={{ font: '600 13px var(--sans)', color: 'var(--ink)' }}>Timed session</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Counts down like the real 3-hour exam</div>
              </div>
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
              <div>
                <div style={{ font: '600 13px var(--sans)', color: 'var(--ink)' }}>Show timer on screen</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Hide it to reduce pressure</div>
              </div>
              <button
                className={`toggle-track${settings.showTimer ? ' is-on' : ''}`}
                onClick={() => onUpdateSettings({ showTimer: !settings.showTimer })}
                role="switch"
                aria-checked={settings.showTimer}
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </div>

          {/* Advanced */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <button
              className="btn-ghost"
              style={{ justifyContent: 'flex-start', fontSize: 13 }}
              onClick={() => setAdvancedOpen(!advancedOpen)}
            >
              {advancedOpen ? '▾' : '▸'} Exam preferences &amp; advanced
            </button>

            {advancedOpen && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label>
                  <div style={{ font: '600 13px var(--sans)', color: 'var(--ink)', marginBottom: 8 }}>Exam date</div>
                  <input
                    type="date"
                    value={examDate ?? ''}
                    onChange={(e) => onUpdateExamDate(e.target.value)}
                  />
                  <span className="field-hint">Drives the countdown and readiness pacing.</span>
                </label>
                <label>
                  <div style={{ font: '600 13px var(--sans)', color: 'var(--ink)', marginBottom: 8 }}>
                    Target score: {settings.targetThreshold}%
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={90}
                    step={1}
                    value={settings.targetThreshold}
                    onChange={(e) => onUpdateSettings({ targetThreshold: Number(e.target.value) })}
                  />
                  <span className="field-hint">Your personal pass goal. Sets the pass/below line on results, readiness, weak areas, and trend bars. Saved as a preference.</span>
                </label>
                <label>
                  <div style={{ font: '600 13px var(--sans)', color: 'var(--ink)', marginBottom: 8 }}>Blueprint version</div>
                  <select
                    value={settings.blueprintId}
                    onChange={(e) => onUpdateSettings({ blueprintId: e.target.value as BlueprintId })}
                  >
                    <option value="cctc-from-2026-07">2026-07 outline (default)</option>
                    <option value="cctc-thru-2026-06">Legacy outline (until 2026-06)</option>
                  </select>
                </label>
                {settings.mode === 'study' && (
                  <div className="toggle-row">
                    <div>
                      <div style={{ font: '600 13px var(--sans)', color: 'var(--ink)' }}>Include draft items</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Exam mode is reviewed-only</div>
                    </div>
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
              </div>
            )}
          </div>

          {/* Start button */}
          <button
            data-el="btn-primary"
            className="btn-primary"
            style={{ width: '100%' }}
            onClick={handleStart}
          >
            Start {settings.mode} session · {settings.questionCount} questions
          </button>
        </div>
      )}
    </div>
  );
}
