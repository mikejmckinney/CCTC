import { useState } from 'react';
import { Play, ChevronDown, ChevronUp } from 'lucide-react';
import type { BlueprintId, ExamMode, QuestionSet, SessionSettings } from '../../types/exam';
import { getBlueprintLabel } from '../../data/blueprints';

type View = 'dashboard' | 'setup' | 'history' | 'reported-items' | 'session' | 'session-review';

interface SetupViewProps {
  settings: SessionSettings;
  onUpdateSettings: (next: Partial<SessionSettings>) => void;
  onStartSession: () => void;
  hasActiveSession: boolean;
  onResumeSession: () => void;
  availableQuestionCount: number;
  onNavigate: (view: View) => void;
}

export function SetupView({
  settings,
  onUpdateSettings,
  onStartSession,
  hasActiveSession,
  onResumeSession,
  availableQuestionCount,
  onNavigate,
}: SetupViewProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
          Setup
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Configure your practice session
        </p>
      </div>

      {/* Main settings card */}
      <div
        className="flex flex-col gap-5 rounded-2xl border p-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {/* Blueprint */}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Blueprint Version
          </span>
          <select
            value={settings.blueprintId}
            onChange={(e) => onUpdateSettings({ blueprintId: e.target.value as BlueprintId })}
            className="rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          >
            <option value="cctc-from-2026-07">2026-07 (default)</option>
            <option value="cctc-thru-2026-06">Until 2026-06</option>
          </select>
        </label>

        {/* Question Set */}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Question Set
          </span>
          <select
            value={settings.questionSet}
            onChange={(e) => onUpdateSettings({ questionSet: e.target.value as QuestionSet })}
            className="rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          >
            <option value="standard">Standard bank</option>
            <option value="scenario">Scenario companions</option>
          </select>
        </label>

        {/* Mode */}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Mode
          </span>
          <div className="flex gap-2">
            {(['exam', 'study'] as ExamMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onUpdateSettings({ mode })}
                className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
                style={{
                  borderColor: settings.mode === mode ? 'var(--primary)' : 'var(--border)',
                  background: settings.mode === mode ? 'var(--primary)' : 'var(--surface)',
                  color: settings.mode === mode ? 'var(--primary-fg)' : 'var(--text)',
                }}
              >
                {mode === 'exam' ? 'Exam' : 'Study'}
              </button>
            ))}
          </div>
        </label>

        {/* Question count */}
        <label className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Question Count
            </span>
            <span className="tabular-nums text-sm font-semibold" style={{ color: 'var(--primary)' }}>
              {settings.questionCount}
            </span>
          </div>
          <input
            type="range"
            min={Math.min(10, availableQuestionCount)}
            max={availableQuestionCount}
            value={settings.questionCount}
            onChange={(e) => onUpdateSettings({ questionCount: Number(e.target.value) })}
            className="w-full accent-[var(--primary)]"
          />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Available: {availableQuestionCount} questions
          </span>
        </label>

        {/* Advanced options toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-sm font-medium transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Advanced Options
        </button>

        {showAdvanced && (
          <div className="flex flex-col gap-4 rounded-xl border p-4" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
            {/* Exam date */}
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                Exam Date <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(optional)</span>
              </span>
              <input
                type="date"
                className="rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                }}
              />
            </label>

            {/* Target score slider */}
            <label className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  Target Score
                </span>
                <span className="tabular-nums text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                  {settings.targetThreshold}%
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={90}
                value={settings.targetThreshold}
                onChange={(e) => onUpdateSettings({ targetThreshold: Number(e.target.value) })}
                className="w-full accent-[var(--accent)]"
              />
              <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
                <span>50%</span>
                <span>90%</span>
              </div>
            </label>

            {/* Timer */}
            <label className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  Timer
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {settings.timed ? `${settings.timeMinutes} min` : 'Untimed'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ timed: !settings.timed })}
                  className="relative h-6 w-11 rounded-full transition-colors"
                  style={{
                    background: settings.timed ? 'var(--primary)' : 'var(--border-strong)',
                  }}
                  role="switch"
                  aria-checked={settings.timed}
                >
                  <span
                    className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
                    style={{
                      transform: settings.timed ? 'translateX(20px)' : 'translateX(0)',
                    }}
                  />
                </button>
                {settings.timed && (
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={settings.timeMinutes}
                    onChange={(e) => onUpdateSettings({ timeMinutes: Math.max(1, Number(e.target.value)) })}
                    className="w-20 rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                    style={{
                      background: 'var(--surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)',
                    }}
                  />
                )}
              </div>
            </label>

            {/* Include drafts */}
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.includeDrafts}
                onChange={(e) => onUpdateSettings({ includeDrafts: e.target.checked })}
                disabled={settings.mode === 'exam'}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              <span className="text-sm" style={{ color: settings.mode === 'exam' ? 'var(--text-muted)' : 'var(--text)' }}>
                Include draft questions
              </span>
            </label>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2 pt-2">
          {hasActiveSession && (
            <button
              type="button"
              onClick={onResumeSession}
              className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors hover:bg-[var(--surface-raised)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              Resume Current Session
            </button>
          )}
          <button
            type="button"
            onClick={onStartSession}
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all hover:brightness-110"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
          >
            <Play className="h-4 w-4" />
            Start Session
          </button>
        </div>
      </div>

      {/* Selected setup summary */}
      <div
        className="flex flex-col gap-2 rounded-2xl border p-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Selected Setup
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span>Blueprint:</span>
          <span className="font-medium" style={{ color: 'var(--text)' }}>{getBlueprintLabel(settings.blueprintId)}</span>
          <span>Question set:</span>
          <span className="font-medium" style={{ color: 'var(--text)' }}>{settings.questionSet === 'scenario' ? 'Scenario companions' : 'Standard bank'}</span>
          <span>Mode:</span>
          <span className="font-medium" style={{ color: 'var(--text)' }}>{settings.mode === 'exam' ? 'Exam' : 'Study'}</span>
          <span>Timer:</span>
          <span className="font-medium" style={{ color: 'var(--text)' }}>{settings.timed ? `${settings.timeMinutes} minutes` : 'Untimed'}</span>
          <span>Target:</span>
          <span className="font-medium" style={{ color: 'var(--text)' }}>{settings.targetThreshold}%</span>
        </div>
      </div>
    </div>
  );
}
