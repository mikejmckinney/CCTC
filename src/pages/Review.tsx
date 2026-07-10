import { useState, useMemo } from 'react';
import { cn } from '../lib/cn';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Progress } from '../components/ui';
import { lookupQuestion } from '../lib/bankLookup';
import type { HistoryEntry, Question } from '../types/exam';
import {
  ChevronRight, CheckCircle2, XCircle, ArrowLeft, Flag,
  Filter, ListChecks, X, Search
} from 'lucide-react';

interface ReviewProps {
  entry: HistoryEntry;
  questionIndex: Map<string, Question>;
  onBack: () => void;
  onReport: (itemId: string) => void;
}

type FilterMode = 'all' | 'incorrect' | 'correct';

/** Split text with \x01...\x02 markers around query matches */
function highlightMatches(text: string, query: string): string {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '\x01$1\x02');
}

/** Render text with <mark> highlights for search query matches */
function HighlightedSpan({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const parts = highlightMatches(text, query).split('\x01');
  return <span>{parts.map((part, i) => {
    if (part.includes('\x02')) {
      const [match, rest] = part.split('\x02');
      if (rest) {
        return <span key={i}><mark className="bg-[var(--warning)]/20 text-[var(--foreground)] rounded-sm px-0.5">{match}</mark><HighlightedSpan text={rest} query={query} /></span>;
      }
      return <mark key={i} className="bg-[var(--warning)]/20 text-[var(--foreground)] rounded-sm px-0.5">{match}</mark>;
    }
    return <span key={i}>{part}</span>;
  })}</span>;
}

export function Review({ entry, questionIndex, onBack, onReport }: ReviewProps) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [domainFilter, setDomainFilter] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const domains = entry.result.breakdown;

  const filterCounts = useMemo(() => {
    const all = entry.items.length;
    const incorrect = entry.items.filter((i) => {
      const q = lookupQuestion(questionIndex, i.itemId);
      return q ? entry.answers[i.itemId] !== q.correct : false;
    }).length;
    return { all, incorrect, correct: all - incorrect };
  }, [entry, questionIndex]);

  // Search uses simple .includes() — fast for <1000 questions, no fuzzy matching overhead
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entry.items.filter((item) => {
      const question = lookupQuestion(questionIndex, item.itemId);
      if (!question) return false;
      const answer = entry.answers[item.itemId];
      const isCorrect = answer === question.correct;
      const matchesFilter =
        filter === 'all' ||
        (filter === 'correct' && isCorrect) ||
        (filter === 'incorrect' && !isCorrect);
      const matchesDomain = !domainFilter || item.categoryId === domainFilter;
      const matchesSearch = !q ||
        question.stem.toLowerCase().includes(q) ||
        question.options.some((o) => o.text.toLowerCase().includes(q)) ||
        question.explanation.rationale_correct.toLowerCase().includes(q) ||
        question.id.toLowerCase().includes(q);
      return matchesFilter && matchesDomain && matchesSearch;
    });
  }, [entry, filter, domainFilter, searchQuery, questionIndex]);

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
                <p className="text-xs text-[var(--muted-foreground)]">
                  {entry.settings.mode === 'exam' ? 'Exam' : 'Study'} · {new Date(entry.completedAt).toLocaleString()} · {formatDuration(entry.timeUsedSeconds)}
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
            {domains.map((bd) => {
              const pct = bd.total > 0 ? Math.round((bd.correct / bd.total) * 100) : 0;
              return (
                <button
                  key={bd.categoryId}
                  type="button"
                  onClick={() => setDomainFilter(domainFilter === bd.categoryId ? null : bd.categoryId)}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-all',
                    domainFilter === bd.categoryId
                      ? 'border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]/30'
                      : 'border-[var(--border)] hover:border-[var(--primary)]/30'
                  )}
                >
                  <p className="text-sm font-medium text-[var(--foreground)]">{bd.categoryLabel}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={pct} variant={pct >= 70 ? 'success' : 'warning'} className="flex-1" />
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">{bd.correct}/{bd.total}</span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">{pct}% · {bd.total} items</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-3 space-y-3">
          {/* Text search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setExpandedIndex(null); }}
              placeholder="Search questions, answers, explanations..."
              className="w-full h-9 rounded-lg border border-[var(--input)] bg-[var(--card)] pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {/* Status + domain filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-[var(--muted-foreground)]" />
            {(['all', 'incorrect', 'correct'] as FilterMode[]).map((mode) => (
              <Button
                key={mode}
                variant={filter === mode ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => { setFilter(mode); setExpandedIndex(null); }}
              >
                {mode === 'all' && `All (${filterCounts.all})`}
                {mode === 'incorrect' && `Incorrect (${filterCounts.incorrect})`}
                {mode === 'correct' && `Correct (${filterCounts.correct})`}
              </Button>
            ))}
            {domainFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setDomainFilter(null); setExpandedIndex(null); }}
                className="gap-1"
              >
                <X className="h-3 w-3" />
                Clear domain filter
              </Button>
            )}
            <span className="ml-auto text-xs text-[var(--muted-foreground)]">
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Question list */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ListChecks className="h-8 w-8 text-[var(--muted-foreground)] mx-auto mb-2" />
            <p className="text-sm text-[var(--muted-foreground)]">No questions match the current filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item, idx) => {
            const question = lookupQuestion(questionIndex, item.itemId);
            if (!question) return null;
            const answer = entry.answers[item.itemId];
            const isCorrect = answer === question.correct;
            const isExpanded = expandedIndex === idx;

            return (
              <Card key={item.itemId} className={cn('transition-all', isExpanded && 'ring-1 ring-[var(--primary)]/20')}>
                {/* Summary row */}
                <button
                  type="button"
                  className="w-full text-left p-4 flex items-start gap-3"
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                >
                  {/* Question number instead of check/x */}
                  <span className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    isCorrect ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--destructive)]/10 text-[var(--destructive)]'
                  )}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {/* Question ID */}
                    <p className="text-[10px] text-[var(--muted-foreground)] mb-0.5 font-mono">{question.id}</p>
                    <p className="text-[13px] text-[var(--foreground)] leading-relaxed">
                      <HighlightedSpan text={question.stem} query={searchQuery} />
                    </p>
                    {/* User's actual choice text + correct answer */}
                    <div className="mt-1.5 space-y-0.5">
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Your answer:{' '}
                        <strong className={cn(isCorrect ? 'text-[var(--success)]' : 'text-[var(--destructive)]')}>
                          {answer
                            ? <HighlightedSpan text={`${String.fromCharCode(65 + item.optionOrder.indexOf(answer))}. ${question.options.find(o => o.id === answer)?.text ?? ''}`} query={searchQuery} />
                            : '—'}
                        </strong>
                      </p>
                      {!isCorrect && (
                        <p className="text-xs text-[var(--success)]">
                          Correct:{' '}
                          <strong>
                            <HighlightedSpan text={`${String.fromCharCode(65 + item.optionOrder.indexOf(question.correct))}. ${question.options.find(o => o.id === question.correct)?.text ?? ''}`} query={searchQuery} />
                          </strong>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-[var(--muted-foreground)]">{item.categoryLabel}</span>
                    </div>
                  </div>
                  <ChevronRight className={cn('h-4 w-4 text-[var(--muted-foreground)] shrink-0 mt-0.5 transition-transform', isExpanded && 'rotate-90')} />
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <CardContent className="pt-0 space-y-4 border-t border-[var(--border)]">
                    <h3 className="text-base font-semibold text-[var(--foreground)] leading-relaxed">{question.stem}</h3>

                    {question.elements && (
                      <ol className="list-inside list-alpha space-y-1 text-sm text-[var(--foreground)]">
                        {question.elements.map((el) => (
                          <li key={el.id}><strong>{el.id}.</strong> {el.text}</li>
                        ))}
                      </ol>
                    )}

                    {/* Options */}
                    <div className="space-y-2">
                      {item.optionOrder.map((optionId, optIdx) => {
                        const option = question.options.find((o) => o.id === optionId);
                        if (!option) return null;
                        const selected = answer === option.id;
                        const correct = question.correct === option.id;
                        const letter = String.fromCharCode(65 + optIdx);

                        return (
                          <div
                            key={option.id}
                            className={cn(
                              'flex items-start gap-3 rounded-xl border p-3',
                              correct && 'border-[var(--success)] bg-[var(--success)]/5',
                              selected && !correct && 'border-[var(--destructive)] bg-[var(--destructive)]/5',
                              !selected && !correct && 'border-[var(--border)]',
                            )}
                          >
                            <span className={cn(
                              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                              correct ? 'bg-[var(--success)] text-[var(--success-foreground)]' :
                              selected ? 'bg-[var(--destructive)] text-[var(--destructive-foreground)]' :
                              'bg-[var(--muted)] text-[var(--muted-foreground)]',
                            )}>
                              {correct ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                               selected ? <XCircle className="h-3.5 w-3.5" /> :
                               letter}
                            </span>
                            <div className="min-w-0">
                              <span className="text-sm text-[var(--foreground)]">{option.text}</span>
                              {option.selects && (
                                <span className="block text-xs text-[var(--muted-foreground)] mt-0.5">Selects: {option.selects.join(', ')}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-4 space-y-2">
                      <p className="text-sm">
                        <strong className="text-[var(--success)]">Correct answer ({String.fromCharCode(65 + item.optionOrder.indexOf(question.correct))}):</strong>{' '}
                        {question.explanation.rationale_correct}
                      </p>
                      {item.optionOrder
                        .filter((optId) => optId !== question.correct && question.explanation.rationale_incorrect[optId])
                        .map((optId) => {
                          const displayLetter = String.fromCharCode(65 + item.optionOrder.indexOf(optId));
                          return (
                            <p key={optId} className="text-sm text-[var(--muted-foreground)]">
                              <strong>{displayLetter}:</strong> {question.explanation.rationale_incorrect[optId]}
                            </p>
                          );
                        })}
                      {question.references.length > 0 && (
                        <div className="pt-2 border-t border-[var(--border)]">
                          <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">References</p>
                          {question.references.map((ref, i) => (
                            <p key={i} className="text-xs">
                              {ref.url ? (
                                <a href={ref.url} target="_blank" rel="noreferrer" className="text-[var(--primary)] hover:underline">{ref.citation}</a>
                              ) : (
                                <span>{ref.citation}</span>
                              )}
                              {ref.locator && <span className="text-[var(--muted-foreground)] block mt-0.5">— {ref.locator}</span>}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button variant="ghost" size="sm" onClick={() => onReport(item.itemId)}>
                      <Flag className="h-4 w-4" /> Report
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'Untimed';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
