import type { HistoryEntry, Question, BlueprintId, ExamMode } from '../../types/exam';
import { QuestionMap } from '../components/QuestionMap';

interface ReviewViewProps {
  entry: HistoryEntry;
  currentIndex: number;
  onNavigate: (index: number) => void;
  onOpenFlagComposer: (item: Question, sessionId: string, blueprint: BlueprintId, mode: ExamMode) => void;
  onSelectItem: (index: number) => void;
  onBack: () => void;
}

function displayLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export function ReviewView({ entry, currentIndex, onNavigate, onOpenFlagComposer, onSelectItem, onBack }: ReviewViewProps) {
  const item = entry.items[currentIndex];
  if (!item) return null;
  const answer = entry.answers[item.itemId];
  const isCorrect = answer === item.question.correct;
  const correctSet = new Set<string>();
  const incorrectSet = new Set<string>();
  for (const si of entry.items) {
    const a = entry.answers[si.itemId];
    if (a === si.question.correct) correctSet.add(si.itemId);
    else if (a !== null) incorrectSet.add(si.itemId);
  }

  return (
    <div className="stack stack--gap-lg">
      <div className="row row--spread">
        <button className="btn-ghost" onClick={onBack} style={{ minHeight: 40 }}>← Back</button>
        <h2 style={{ fontSize: 18 }}>
          {entry.result.correct}/{entry.result.total} correct · {entry.result.percent}%
        </h2>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <span className="badge badge--teal">{item.categoryLabel}</span>
        <span className={`review-verdict ${isCorrect ? 'review-verdict--correct' : answer === null ? 'review-verdict--skipped' : 'review-verdict--incorrect'}`}>
          {isCorrect ? 'Correct' : answer === null ? 'Skipped' : 'Incorrect'}
        </span>
      </div>

      <article className="card card--panel stack stack--gap">
        <h3 className="question-stem">{item.question.stem}</h3>

        {item.question.elements && (
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {item.question.elements.map((el) => (
              <li key={el.id} style={{ marginBottom: 4 }}>
                <strong>{el.id}.</strong> {el.text}
              </li>
            ))}
          </ol>
        )}

        <div className="stack" style={{ gap: 10 }}>
          {item.optionOrder.map((optionId, i) => {
            const option = item.question.options.find((o) => o.id === optionId)!;
            const selected = answer === option.id;
            const correct = item.question.correct === option.id;
            return (
              <div
                key={option.id}
                className={[
                  'option-button',
                  correct ? 'is-correct' : '',
                  selected && !correct ? 'is-incorrect' : '',
                  selected ? 'is-selected' : ''
                ].filter(Boolean).join(' ')}
              >
                <span className="option-letter">{displayLetter(i)}</span>
                <span>
                  {option.text}
                  {correct && <small style={{ display: 'block', color: 'var(--successtext)', fontWeight: 600, marginTop: 2 }}>Correct answer</small>}
                  {selected && !correct && <small style={{ display: 'block', color: 'var(--dangertext)', fontWeight: 600, marginTop: 2 }}>Your answer</small>}
                </span>
              </div>
            );
          })}
        </div>

        <div className="explanation-card">
          <p><strong>Correct answer ({displayLetter(item.optionOrder.indexOf(item.question.correct))}):</strong> {item.question.explanation.rationale_correct}</p>
          {item.optionOrder.map((optionId, i) => {
            if (optionId === item.question.correct) return null;
            const rationale = item.question.explanation.rationale_incorrect?.[optionId];
            if (!rationale) return null;
            return <p key={optionId}><strong>{displayLetter(i)}:</strong> {rationale}</p>;
          })}
          {item.question.references.length > 0 && (
            <div>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>References</p>
              {item.question.references.map((ref) => (
                <p key={`${ref.citation}-${ref.locator ?? ''}`} style={{ marginBottom: 4 }}>
                  {ref.url ? <a href={ref.url} target="_blank" rel="noreferrer">{ref.citation}</a> : ref.citation}
                  {ref.locator && <span className="field-hint" style={{ display: 'block' }}>{ref.locator}</span>}
                </p>
              ))}
            </div>
          )}
        </div>
      </article>

      <div className="action-row action-row--spread">
        <button className="btn-secondary" onClick={() => onNavigate(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>Previous</button>
        <button className="btn-ghost" onClick={() => onOpenFlagComposer(item.question, entry.id, entry.settings.blueprintId, entry.settings.mode)}>
          Flag this item
        </button>
        <button className="btn-secondary" onClick={() => onNavigate(Math.min(entry.items.length - 1, currentIndex + 1))} disabled={currentIndex === entry.items.length - 1}>Next</button>
      </div>

      <div className="card card--panel">
        <p className="eyebrow" style={{ marginBottom: 8 }}>Jump to item</p>
        <QuestionMap
          total={entry.items.length}
          currentIndex={currentIndex}
          answers={entry.answers}
          itemIds={entry.items.map((i) => i.itemId)}
          correctSet={correctSet}
          incorrectSet={incorrectSet}
          onSelect={onSelectItem}
        />
      </div>
    </div>
  );
}
