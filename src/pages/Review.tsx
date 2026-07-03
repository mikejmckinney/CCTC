import { useState } from 'react';
import { cn } from '../lib/cn';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Progress } from '../components/ui';
import type { HistoryEntry } from '../types/exam';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, ArrowLeft, Flag } from 'lucide-react';

interface ReviewProps {
  entry: HistoryEntry;
  onBack: () => void;
  onReport: (itemId: string) => void;
}

export function Review({ entry, onBack, onReport }: ReviewProps) {
  const [reviewIndex, setReviewIndex] = useState(0);
  const currentItem = entry.items[reviewIndex];
  if (!currentItem) return null;

  const answer = entry.answers[currentItem.itemId];
  const isCorrect = answer === currentItem.question.correct;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Session Review</p>
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  {entry.result.correct}/{entry.result.total} correct · {entry.result.percent}%
                </p>
              </div>
            </div>
            <Badge variant={entry.result.estimatedPass ? 'success' : 'warning'}>
              {entry.result.estimatedPass ? 'At or above' : 'Below'} {entry.settings.targetThreshold}% target
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Category breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {entry.result.breakdown.map((bd) => (
              <div key={bd.categoryId} className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-sm font-medium text-[var(--foreground)]">{bd.categoryLabel}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={bd.total > 0 ? (bd.correct / bd.total) * 100 : 0} className="flex-1" />
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">{bd.correct}/{bd.total}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Question review */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--muted-foreground)]">
              Item {reviewIndex + 1} of {entry.items.length}
            </p>
            <Badge variant={isCorrect ? 'success' : 'destructive'}>
              {isCorrect ? 'Correct' : 'Incorrect'}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">{currentItem.categoryLabel}</Badge>
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

          {/* Options with correct/incorrect marking */}
          <div className="space-y-2">
            {currentItem.optionOrder.map((optionId, idx) => {
              const option = currentItem.question.options.find((o) => o.id === optionId)!;
              const selected = answer === option.id;
              const correct = currentItem.question.correct === option.id;
              const letter = String.fromCharCode(65 + idx);

              return (
                <div
                  key={option.id}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-4',
                    correct && 'border-[var(--success)] bg-[var(--success)]/5',
                    selected && !correct && 'border-[var(--destructive)] bg-[var(--destructive)]/5',
                    !selected && !correct && 'border-[var(--border)]',
                  )}
                >
                  <span className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    correct ? 'bg-[var(--success)] text-[var(--success-foreground)]' :
                    selected ? 'bg-[var(--destructive)] text-[var(--destructive-foreground)]' :
                    'bg-[var(--muted)] text-[var(--muted-foreground)]',
                  )}>
                    {correct ? <CheckCircle2 className="h-4 w-4" /> :
                     selected ? <XCircle className="h-4 w-4" /> :
                     letter}
                  </span>
                  <span className="text-sm text-[var(--foreground)]">{option.text}</span>
                </div>
              );
            })}
          </div>

          {/* Explanation */}
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
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => setReviewIndex((i) => Math.max(0, i - 1))} disabled={reviewIndex === 0}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button variant="ghost" onClick={() => onReport(currentItem.itemId)}>
              <Flag className="h-4 w-4" /> Report
            </Button>
            <Button variant="secondary" onClick={() => setReviewIndex((i) => Math.min(entry.items.length - 1, i + 1))} disabled={reviewIndex === entry.items.length - 1}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
