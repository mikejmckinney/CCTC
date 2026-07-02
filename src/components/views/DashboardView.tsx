import { useMemo } from 'react';
import {
  ReadinessScore,
  QuickStart,
  CategoryBreakdown,
  RecentSessions,
  Insights,
  StudyPlan,
} from '../dashboard';
import { calculateReadiness, generateInsight, generateStudyPlan } from '../../lib/readiness';
import type { HistoryEntry, SessionSettings } from '../../types/exam';

type View = 'dashboard' | 'setup' | 'history' | 'reported-items' | 'session' | 'session-review';

interface DashboardViewProps {
  history: HistoryEntry[];
  settings: SessionSettings;
  hasActiveSession: boolean;
  onNavigate: (view: View) => void;
  onSelectSession: (entry: HistoryEntry) => void;
  onStartSession: (mode: 'full' | 'quick' | 'weak') => void;
}

export function DashboardView({
  history,
  settings,
  hasActiveSession,
  onNavigate,
  onSelectSession,
  onStartSession,
}: DashboardViewProps) {
  const readiness = useMemo(
    () => calculateReadiness(history, settings.targetThreshold, undefined),
    [history, settings.targetThreshold]
  );

  const insight = useMemo(
    () => generateInsight(readiness, settings.targetThreshold),
    [readiness, settings.targetThreshold]
  );

  const studyPlan = useMemo(
    () => generateStudyPlan(readiness, settings.targetThreshold),
    [readiness, settings.targetThreshold]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
          Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {history.length > 0
            ? `${history.length} sessions completed · Last session ${new Date(history[0].completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : 'Welcome to CCTC Practice Exam'}
        </p>
      </div>

      {/* Readiness + Quick Start row */}
      <div className="grid gap-4 md:grid-cols-2">
        <ReadinessScore
          score={readiness.overallScore}
          target={settings.targetThreshold}
          projectedScore={readiness.projectedScore}
          daysToExam={readiness.daysToExam}
          isReady={readiness.isReady}
          trend={readiness.domains.length > 0
            ? readiness.domains.reduce<'improving' | 'declining' | 'stable'>((acc, d) => {
                if (d.trend === 'improving') return 'improving';
                if (d.trend === 'declining' && acc !== 'improving') return 'declining';
                return acc;
              }, 'stable')
            : 'stable'
          }
        />
        <QuickStart
          onResume={() => onNavigate('session')}
          onStartFull={() => onStartSession('full')}
          onStartQuick={() => onStartSession('quick')}
          onStartWeak={() => onStartSession('weak')}
          hasActiveSession={hasActiveSession}
        />
      </div>

      {/* Insights */}
      <Insights
        insight={insight}
        isReady={readiness.isReady}
        score={readiness.overallScore}
        target={settings.targetThreshold}
      />

      {/* Categories + Recent Sessions row */}
      <div className="grid gap-4 md:grid-cols-2">
        <CategoryBreakdown
          domains={readiness.domains}
          targetThreshold={settings.targetThreshold}
        />
        <RecentSessions
          sessions={history}
          onSelect={onSelectSession}
          onViewAll={() => onNavigate('history')}
        />
      </div>

      {/* Study Plan */}
      <StudyPlan items={studyPlan} />
    </div>
  );
}
