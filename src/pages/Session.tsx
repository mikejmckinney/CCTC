import { cn } from '../lib/cn';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '../components/ui';
import type { ActiveSession, HistoryEntry } from '../types/exam';
import { ChevronLeft, ChevronRight, Flag, Bookmark, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface SessionViewProps {
  session: ActiveSession;
  onAnswer: (optionId: string) => void;
  onNavigate: (direction: -1 | 1) => void;
  onToggleBookmark: () => void;
  onReport: () => void;
  onSubmit: () => void;
  onGoToQuestion: (index: number) => void;
}

export function SessionView({
  session, onAnswer, onNavigate, onToggleBookmark, onReport, onSubmit, onGoToQuestion
}: SessionViewProps) {
  const currentItem = session.items[session.currentIndex];
  if (!currentItem) return null;

  const answeredCount = Object.values(session.answers).filter(Boolean).length;
  const isStudy = session.settings.mode === 'study';
  const isRevealed = isStudy ? session.revealed[currentItem.itemId] : Boolean(session.submittedAt);

  return (
    <div className="space-y-4">
      {/* Session header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                {isStudy ? 'Study Session' : 'Exam Session'}
              </p>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                Item {session.currentIndex + 1} of {session.items.length}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">{answeredCount} answered</Badge>
              <Badge variant="secondary">{session.items.length - answeredCount} remaining</Badge>
              {session.flaggedForReview.length > 0 && (
                <Badge variant="warning">{session.flaggedForReview.length} bookmarked</Badge>
              )}
              {session.settings.timed && session.remainingSeconds !== null && (
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1 inline" />
                  {formatTime(session.remainingSeconds)}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question card */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">{currentItem.categoryLabel}</Badge>
            <Badge variant={currentItem.question.status === 'reviewed' ? 'success' : 'warning'}>
              {currentItem.question.status}
            </Badge>
            <Badge variant="secondary">
              {currentItem.question.type === 'one_best' ? 'Single Best' : 'Complex Combo'}
            </Badge>
          </div>

          <h2 className="text-lg font-semibold text-[var(--foreground)] leading-relaxed">{currentItem.question.stem}</h2>

          {currentItem.question.elements && (
            <ol className="list-inside list-alpha space-y-1 text-sm text-[var(--foreground)]">
              {currentItem.question.elements.map((el) => (
                <li key={el.id}><strong>{el.id}.</strong> {el.text}</li>
              ))}
            </ol>
          )}

          {/* Options */}
          <div className="space-y-2" role="radiogroup" aria-label="Answer choices">
            {currentItem.optionOrder.map((optionId, idx) => {
              const option = currentItem.question.options.find((o) => o.id === optionId)!;
              const selected = session.answers[currentItem.itemId] === option.id;
              const correct = currentItem.question.correct === option.id;
              const letter = String.fromCharCode(65 + idx);

              return (
                <button
                  key={option.id}
                  onClick={() => onAnswer(option.id)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all',
                    selected && !isRevealed && 'border-[var(--primary)] bg-[var(--primary)]/5',
                    isRevealed && correct && 'border-[var(--success)] bg-[var(--success)]/5',
                    isRevealed && selected && !correct && 'border-[var(--destructive)] bg-[var(--destructive)]/5',
                    !selected && !isRevealed && 'border-[var(--border)] hover:border-[var(--primary)]/30 hover:bg-[var(--muted)]/50',
                  )}
                  role="radio"
                  aria-checked={selected}
                >
                  <span className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    selected ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'bg-[var(--muted)] text-[var(--muted-foreground)]',
                    isRevealed && correct && 'bg-[var(--success)] text-[var(--success-foreground)]',
                    isRevealed && selected && !correct && 'bg-[var(--destructive)] text-[var(--destructive-foreground)]',
                  )}>
                    {isRevealed && correct ? <CheckCircle2 className="h-4 w-4" /> :
                     isRevealed && selected && !correct ? <XCircle className="h-4 w-4" /> :
                     letter}
                  </span>
                  <div>
                    <span className="text-sm text-[var(--foreground)]">{option.text}</span>
                    {option.selects && <span className="block text-xs text-[var(--muted-foreground)] mt-1">Selects: {option.selects.join(', ')}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation (study mode or after submit) */}
          {isRevealed && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-4 space-y-2">
              <p className="text-sm"><strong className="text-[var(--success)]">Correct:</strong> {currentItem.question.explanation.rationale_correct}</p>
              {Object.entries(currentItem.question.explanation.rationale_incorrect).map(([id, text]) => (
                <p key={id} className="text-sm text-[var(--muted-foreground)]"><strong>{id.toUpperCase()}:</strong> {text}</p>
              ))}
              {currentItem.question.references.length > 0 && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">References</p>
                  {currentItem.question.references.map((ref, i) => (
                    <p key={i} className="text-xs">
                      {ref.url ? <a href={ref.url} target="_blank" rel="noreferrer" className="text-[var(--primary)] hover:underline">{ref.citation}</a> : ref.citation}
                      {ref.locator && <span className="text-[var(--muted-foreground)]"> — {ref.locator}</span>}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Toolbar */}
      <div className="sticky bottom-16 sm:bottom-0 z-10 -mx-4 sm:mx-0">
        <Card className="rounded-t-xl sm:rounded-xl shadow-lg">
          <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => onNavigate(-1)} disabled={session.currentIndex === 0}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onNavigate(1)} disabled={session.currentIndex === session.items.length - 1}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleBookmark}
                className={cn(session.flaggedForReview.includes(currentItem.itemId) && 'text-[var(--accent)]')}
              >
                <Bookmark className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onReport}>
                <Flag className="h-4 w-4" /> Report
              </Button>
              <Button size="sm" onClick={onSubmit}>
                {isStudy ? 'Complete' : 'Submit Exam'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Question tracker */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-20 gap-1">
            {session.items.map((item, idx) => (
              <button
                key={item.itemId}
                onClick={() => onGoToQuestion(idx)}
                className={cn(
                  'h-8 w-8 rounded-md text-xs font-medium transition-colors',
                  idx === session.currentIndex && 'bg-[var(--primary)] text-[var(--primary-foreground)]',
                  idx !== session.currentIndex && session.answers[item.itemId] && 'bg-[var(--success)]/10 text-[var(--success)]',
                  idx !== session.currentIndex && !session.answers[item.itemId] && 'bg-[var(--muted)] text-[var(--muted-foreground)]',
                  session.flaggedForReview.includes(item.itemId) && 'ring-2 ring-[var(--accent)]',
                )}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}
