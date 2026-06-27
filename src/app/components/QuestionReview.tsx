import type { Question, SessionItemSnapshot } from '../../types/exam';
import { displayLetterForIndex, displayLetterForOptionId, incorrectRationalesForDisplay } from '../lib/helpers';
import { References } from './References';

export function QuestionReview({ item, answer }: { item: SessionItemSnapshot; answer: string | null }) {
  return (
    <article className="question-card">
      <div className="question-meta">
        <span className="badge badge--soft">{item.categoryLabel}</span>
        <span className={answer === item.question.correct ? 'badge badge--success' : 'badge badge--warning'}>
          {answer === item.question.correct ? 'Correct' : 'Review'}
        </span>
      </div>
      <h3>{item.question.stem}</h3>
      {item.question.elements && (
        <ol className="element-list">
          {item.question.elements.map((element) => (
            <li key={element.id}>
              <strong>{element.id}.</strong> {element.text}
            </li>
          ))}
        </ol>
      )}
      <div className="option-list">
        {item.optionOrder.map((optionId, optionIndex) => {
          const option = item.question.options.find((entry) => entry.id === optionId)!;
          const selected = answer === option.id;
          const correct = option.id === item.question.correct;
          return (
            <div
              key={option.id}
              className={[
                'option-button',
                correct ? 'is-correct' : '',
                selected && !correct ? 'is-incorrect' : '',
                selected ? 'is-selected' : ''
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="option-letter">{displayLetterForIndex(optionIndex)}</span>
              <span>
                {option.text}
                {option.selects && <small className="option-helper">Selects: {option.selects.join(', ')}</small>}
              </span>
            </div>
          );
        })}
      </div>
      <div className="explanation-card">
        <p>
          <strong>Correct answer ({displayLetterForOptionId(item.optionOrder, item.question.correct)}):</strong>{' '}
          {item.question.explanation.rationale_correct}
        </p>
        <ul className="plain-list">
          {incorrectRationalesForDisplay(item).map(({ displayLetter, rationale }) => (
            <li key={displayLetter}>
              <strong>{displayLetter}:</strong> {rationale}
            </li>
          ))}
        </ul>
        <References question={item.question} />
      </div>
    </article>
  );
}
