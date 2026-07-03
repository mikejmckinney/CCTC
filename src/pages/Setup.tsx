import { useState } from 'react';
import { cn } from '../lib/cn';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '../components/ui';
import type { BlueprintId, ExamMode, QuestionSet, SessionSettings } from '../types/exam';
import { getBlueprintLabel } from '../data/blueprints';
import { Settings, ChevronDown, ChevronUp, Play, RotateCcw } from 'lucide-react';

interface SetupProps {
  settings: SessionSettings;
  onUpdate: (settings: Partial<SessionSettings>) => void;
  onStart: () => void;
  availableCount: number;
}

export function Setup({ settings, onUpdate, onStart, availableCount }: SetupProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [examDate, setExamDate] = useState(() => {
    try { return localStorage.getItem('cctc-exam-date') ?? ''; } catch { return ''; }
  });
  const [targetScore, setTargetScore] = useState(settings.targetThreshold);

  const handleExamDateChange = (value: string) => {
    setExamDate(value);
    try { localStorage.setItem('cctc-exam-date', value); } catch {}
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Session Setup</CardTitle>
              <p className="text-sm text-[var(--muted-foreground)]">Configure your practice session</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic settings */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Mode</label>
              <select
                value={settings.mode}
                onChange={(e) => onUpdate({ mode: e.target.value as ExamMode })}
                className="flex h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <option value="exam">Exam Mode</option>
                <option value="study">Study Mode</option>
              </select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Question Set</label>
              <select
                value={settings.questionSet}
                onChange={(e) => onUpdate({ questionSet: e.target.value as QuestionSet })}
                className="flex h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <option value="standard">Standard Bank</option>
                <option value="scenario">Scenario Companions</option>
              </select>
            </div>

            <Input
              label="Question Count"
              type="number"
              value={settings.questionCount}
              onChange={(e) => onUpdate({ questionCount: Math.max(1, Number(e.target.value) || 1) })}
              hint={`Available: ${availableCount}`}
              min={1}
              max={availableCount}
            />

            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Timer</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.timed}
                    onChange={(e) => onUpdate({ timed: e.target.checked })}
                    className="h-4 w-4 rounded border-[var(--input)] text-[var(--primary)] focus:ring-[var(--ring)]"
                  />
                  <span className="text-sm text-[var(--foreground)]">Enabled</span>
                </label>
                {settings.timed && (
                  <Input
                    type="number"
                    value={settings.timeMinutes}
                    onChange={(e) => onUpdate({ timeMinutes: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-24"
                    min={1}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Advanced options */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Advanced Options
            </button>

            {showAdvanced && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-4">
                <Input
                  label="Exam Date (optional)"
                  type="date"
                  value={examDate}
                  onChange={(e) => handleExamDateChange(e.target.value)}
                  hint="Set a target date for your exam"
                />

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">
                    Target Score: <span className="text-[var(--accent)] font-bold">{targetScore}%</span>
                  </label>
                  <input
                    type="range"
                    min={50}
                    max={90}
                    value={targetScore}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTargetScore(val);
                      onUpdate({ targetThreshold: val });
                    }}
                    className="w-full accent-[var(--primary)]"
                  />
                  <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                    <span>50%</span>
                    <span>90%</span>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">Blueprint Version</label>
                  <select
                    value={settings.blueprintId}
                    onChange={(e) => onUpdate({ blueprintId: e.target.value as BlueprintId })}
                    className="flex h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  >
                    <option value="cctc-from-2026-07">2026-07 (default)</option>
                    <option value="cctc-thru-2026-06">Until 2026-06</option>
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.includeDrafts}
                      onChange={(e) => onUpdate({ includeDrafts: e.target.checked })}
                      disabled={settings.mode === 'exam'}
                      className="h-4 w-4 rounded border-[var(--input)] text-[var(--primary)] focus:ring-[var(--ring)]"
                    />
                    <span className="text-sm text-[var(--foreground)]">Include draft items</span>
                  </label>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {settings.mode === 'exam' ? 'Exam mode uses reviewed items only' : 'Drafts remain visibly labeled'}
                  </p>
                </div>

                <div className="grid gap-1.5">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.showTimer}
                      onChange={(e) => onUpdate({ showTimer: e.target.checked })}
                      className="h-4 w-4 rounded border-[var(--input)] text-[var(--primary)] focus:ring-[var(--ring)]"
                    />
                    <span className="text-sm text-[var(--foreground)]">Show on-screen timer</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Summary + Start */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">Selected Setup</h3>
            <div className="grid gap-1 text-sm text-[var(--muted-foreground)]">
              <p><span className="font-medium text-[var(--foreground)]">Blueprint:</span> {getBlueprintLabel(settings.blueprintId)}</p>
              <p><span className="font-medium text-[var(--foreground)]">Mode:</span> {settings.mode === 'exam' ? 'Exam' : 'Study'}</p>
              <p><span className="font-medium text-[var(--foreground)]">Questions:</span> {settings.questionCount}</p>
              <p><span className="font-medium text-[var(--foreground)]">Timer:</span> {settings.timed ? `${settings.timeMinutes} minutes` : 'Untimed'}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={onStart} className="flex-1 gap-2">
              <Play className="h-4 w-4" /> Start Session
            </Button>
            <Button variant="secondary" onClick={() => onUpdate({ questionCount: 175, timed: true, timeMinutes: 180 })} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
