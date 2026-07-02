import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../app/AppContext';
import { getBlueprintLabel } from '../data/blueprints';
import type { SessionItemSnapshot } from '../types/exam';

function displayLetterForIndex(i: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + i);
}

function displayLetterForOptionId(optionOrder: string[], optionId: string): string {
  const i = optionOrder.indexOf(optionId);
  return i >= 0 ? displayLetterForIndex(i) : optionId;
}

function incorrectRationales(item: SessionItemSnapshot) {
  return item.optionOrder.flatMap((optionId, i) => {
    if (optionId === item.question.correct) return [];
    const r = item.question.explanation.rationale_incorrect?.[optionId];
    if (!r) return [];
    return [{ letter: displayLetterForIndex(i), rationale: r }];
  });
}

function References({ question }: { question: SessionItemSnapshot['question'] }) {
  if (!question.references?.length) return null;
  return (
    <div className="reference-list">
      <h5>References</h5>
      <ul className="plain-list">
        {question.references.map((ref) => (
          <li key={`${ref.citation}-${ref.locator ?? ''}`} className="reference-item">
            {ref.url ? (
              <a className="reference-citation" href={ref.url} target="_blank" rel="noreferrer">{ref.citation}</a>
            ) : (
              <span className="reference-citation">{ref.citation}</span>
            )}
            {ref.locator && <div className="reference-locator">{ref.locator}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReviewPage() {
  const navigate = useNavigate();
  const { sessionId, index } = useParams<{ sessionId: string; index?: string }>();
  const { history, activeSession, openFlagComposer } = useApp();

  const entry = useMemo(() => {
    if (activeSession?.id === sessionId) return null; // active session review not supported here
    return history.find((h) => h.id === sessionId) ?? null;
  }, [history, activeSession, sessionId]);

  const idx = index ? parseInt(index, 10) : 0;

  if (!entry) {
    return (
      <div className="app-content">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--muted)' }}>Session not found.</p>
          <button className="primary-button" onClick={() => navigate('/history')} style={{ marginTop: '1rem' }}>Back to History</button>
        </div>
      </div>
    );
  }

  const item = entry.items[idx];
  const answer = item ? entry.answers[item.itemId] : null;
  const correct = answer === item?.question.correct;

  return (
    <div className="app-content">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 820, margin: '0 auto' }}>
        {/* Summary */}
        <section className="card stack-gap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Session review</p>
              <h2 style={{ fontSize: '1.1rem' }}>
                {entry.result.correct}/{entry.result.total} correct · {entry.result.percent}%
              </h2>
            </div>
            <button className="secondary-button" onClick={() => navigate('/history')}>Back to history</button>
          </div>

          <div className="notice-block">
            <p>
              {entry.result.estimatedPass ? 'At or above' : 'Below'} your {entry.settings.targetThreshold}% target estimate.
            </p>
          </div>

          <div className="breakdown-grid">
            {entry.result.breakdown.map((bd) => (
              <div key={bd.categoryId} className="summary-card summary-card--interactive" onClick={() => {}}>
                <h3 style={{ fontSize: '0.85rem' }}>{bd.categoryLabel}</h3>
                <p>{bd.correct} / {bd.total} correct</p>
              </div>
            ))}
          </div>
        </section>

        {/* Item review */}
        {item && (
          <section className="card stack-gap">
            <div className="review-nav">
              <button className="secondary-button" onClick={() => navigate(`/review/${sessionId}/${Math.max(0, idx - 1)}`)} disabled={idx === 0}>
                Previous
              </button>
              <span className="review-nav__counter">
                {idx + 1} / {entry.items.length}
              </span>
              <button className="ghost-button" onClick={() => openFlagComposer(item.question, entry.id, entry.settings.blueprintId, entry.settings.mode)}>
                Report
              </button>
              <button className="secondary-button" onClick={() => navigate(`/review/${sessionId}/${Math.min(entry.items.length - 1, idx + 1)}`)} disabled={idx === entry.items.length - 1}>
                Next
              </button>
            </div>

            <article className="question-card">
              <div className="question-meta">
                <span className="badge badge--soft">{item.categoryLabel}</span>
                <span className={correct ? 'badge badge--success' : 'badge badge--warning'}>
                  {correct ? 'Correct' : 'Review'}
                </span>
              </div>
              <h3>{item.question.stem}</h3>
              {item.question.elements && (
                <ol className="element-list">
                  {item.question.elements.map((el) => (
                    <li key={el.id}><strong>{el.id}.</strong> {el.text}</li>
                  ))}
                </ol>
              )}
              <div className="option-list">
                {item.optionOrder.map((optionId, optionIndex) => {
                  const option = item.question.options.find((o) => o.id === optionId)!;
                  const selected = answer === option.id;
                  const isCorrect = option.id === item.question.correct;
                  return (
                    <div
                      key={option.id}
                      className={[
                        'option-button',
                        isCorrect ? 'is-correct' : '',
                        selected && !isCorrect ? 'is-incorrect' : '',
                        selected ? 'is-selected' : ''
                      ].filter(Boolean).join(' ')}
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
                  {incorrectRationales(item).map(({ letter, rationale }) => (
                    <li key={letter}><strong>{letter}:</strong> {rationale}</li>
                  ))}
                </ul>
                <References question={item.question} />
              </div>
            </article>
          </section>
        )}
      </div>
    </div>
  );
}
