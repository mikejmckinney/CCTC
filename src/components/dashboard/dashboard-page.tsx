import { ReadinessScore } from './readiness-score';
import { AmIReadyCard } from './am-i-ready';
import { QuickStart } from './quick-start';
import { CategoryBreakdown } from './category-breakdown';
import { RecentSessions } from './recent-sessions';
import { StudyPlanCard } from './study-plan-card';
import type { HistoryEntry } from '../../types/exam';
import type { AmIReady as AmIReadyType, QuickStartType, ReadinessState, StudyPlan } from '../../types/dashboard';

interface DashboardPageProps {
  readiness: ReadinessState;
  amIReady: AmIReadyType;
  studyPlan: StudyPlan;
  history: HistoryEntry[];
  targetScore: number;
  hasActiveSession: boolean;
  onQuickStart: (type: QuickStartType) => void;
  onSelectHistory: (entry: HistoryEntry) => void;
  onViewAllHistory: () => void;
  onStudyDomain: (domainId: string) => void;
}

export function DashboardPage({
  readiness,
  amIReady,
  studyPlan,
  history,
  targetScore,
  hasActiveSession,
  onQuickStart,
  onSelectHistory,
  onViewAllHistory,
  onStudyDomain
}: DashboardPageProps) {
  return (
    <div className="space-y-6">
      {/* Hero: Readiness + Am I Ready */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[200px_1fr]">
        <ReadinessScore readiness={readiness} targetScore={targetScore} />
        <AmIReadyCard ready={amIReady} examCountdown={studyPlan.examCountdown} />
      </div>

      {/* Quick Start */}
      <QuickStart
        onQuickStart={onQuickStart}
        hasActiveSession={hasActiveSession}
        hasHistory={history.length > 0}
      />

      {/* Two-column: Category + Study Plan */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
        <CategoryBreakdown domains={readiness.domains} />
        <StudyPlanCard plan={studyPlan} onStudyDomain={onStudyDomain} />
      </div>

      {/* Recent Sessions */}
      <RecentSessions
        history={history}
        onSelect={onSelectHistory}
        onViewAll={onViewAllHistory}
      />
    </div>
  );
}
