import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../app/AppContext';
import type { Question, SessionItemSnapshot } from '../types/exam';

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

function References({ question }: { question: Question }) {
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

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'Untimed';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((p) => String(p).padStart(2, '0')).join(':');
}

export function SessionPage() {
  const navigate = useNavigate();
  const {
    activeSession, handleAnswer, navigateSession, toggleBookmark,
    toggleTimerHidden, openFlagComposer, finalizeSession, isFinalizing, mutateSession
  } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);

  const session = activeSession;
  const currentItem = session?.items[session.currentIndex];
  const answeredCount = session ? Object.values(session.answers).filter(Boolean).length : 0;

  // Keyboard navigation
  useEffect(() => {
    if (!session || session.submittedAt) return;

    function handleKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        navigateSession(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        navigateSession(-1);
      } else if (/^[a-dA-D]$/.test(e.key) && session && !session.submittedAt) {
        const idx = e.key.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
        const item = session.items[session.currentIndex];
        if (item && idx < item.optionOrder.length) {
          handleAnswer(item.optionOrder[idx]);
        }
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [session, handleAnswer, navigateSession]);

  // Scroll to top on question change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [session?.currentIndex]);

  if (!session || !currentItem) {
    return (
      <div className="app-content">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--muted)' }}>No active session.</p>
          <button className="primary-button" onClick={() => navigate('/')} style={{ marginTop: '1rem' }}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-content" ref={scrollRef}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 820, margin: '0 auto' }}>
        {/* Header */}
        <section className="card stack-gap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{session.settings.mode === 'exam' ? 'Exam session' : 'Study session'}</p>
              <h2 style={{ fontSize: '1rem' }}>
                Item {session.currentIndex + 1} of {session.items.length}
              </h2>
            </div>
            <div className="session-stats">
              <span className="badge">Answered {answeredCount}</span>
              <span className="badge">Remaining {session.items.length - answeredCount}</span>
              <span className="badge">Bookmarks {session.flaggedForReview.length}</span>
              {session.settings.timed && (
                <button className="pill" onClick={toggleTimerHidden}>
                  {session.timerHidden ? 'Show timer' : formatDuration(session.remainingSeconds)}
                </button>
              )}
            </div>
          </div>

          {/* Question */}
          <article className="question-card">
            <div className="question-meta">
              <span className="badge badge--soft">{currentItem.categoryLabel}</span>
              <span className={currentItem.question.status === 'draft' ? 'badge badge--warning' : 'badge badge--success'}>
                {currentItem.question.status}
              </span>
              <span className="badge badge--soft">{currentItem.question.type === 'one_best' ? 'Single best' : 'Complex combo'}</span>
            </div>

            <h3>{currentItem.question.stem}</h3>

            {currentItem.question.elements && (
              <ol className="element-list">
                {currentItem.question.elements.map((el) => (
                  <li key={el.id}><strong>{el.id}.</strong> {el.text}</li>
                ))}
              </ol>
            )}

            <div className="option-list" role="radiogroup" aria-label="Answer choices">
              {currentItem.optionOrder.map((optionId, optionIndex) => {
                const option = currentItem.question.options.find((o) => o.id === optionId)!;
                const letter = displayLetterForIndex(optionIndex);
                const selected = session.answers[currentItem.itemId] === option.id;
                const revealed = session.settings.mode === 'study' ? session.revealed[currentItem.itemId] : Boolean(session.submittedAt);
                const correct = currentItem.question.correct === option.id;

                return (
                  <button
                    key={option.id}
                    className={[
                      'option-button',
                      selected ? 'is-selected' : '',
                      revealed && correct ? 'is-correct' : '',
                      revealed && selected && !correct ? 'is-incorrect' : ''
                    ].filter(Boolean).join(' ')}
                    role="radio"
                    aria-checked={selected}
                    aria-label={`${letter}. ${option.text}`}
                    onClick={() => handleAnswer(option.id)}
                  >
                    <span className="option-letter">{letter}</span>
                    <span>
                      {option.text}
                      {option.selects && <small className="option-helper">Selects: {option.selects.join(', ')}</small>}
                    </span>
                  </button>
                );
              })}
            </div>

            {((session.settings.mode === 'study' && session.revealed[currentItem.itemId]) || session.submittedAt) && (
              <div className="explanation-card">
                <p>
                  <strong>Correct answer ({displayLetterForOptionId(currentItem.optionOrder, currentItem.question.correct)}):</strong>{' '}
                  {currentItem.question.explanation.rationale_correct}
                </p>
                <ul className="plain-list">
                  {incorrectRationales(currentItem).map(({ letter, rationale }) => (
                    <li key={letter}><strong>{letter}:</strong> {rationale}</li>
                  ))}
                </ul>
                <References question={currentItem.question} />
              </div>
            )}
          </article>

          {/* Toolbar */}
          <div className="action-row action-row--spread">
            <div className="action-row">
              <button className="secondary-button" onClick={() => navigateSession(-1)} disabled={session.currentIndex === 0}>
                Previous
              </button>
              <button className="secondary-button" onClick={() => navigateSession(1)} disabled={session.currentIndex === session.items.length - 1}>
                Next
              </button>
            </div>
            <div className="action-row">
              <button className="ghost-button" onClick={toggleBookmark}>
                {session.flaggedForReview.includes(currentItem.itemId) ? 'Unbookmark' : 'Bookmark'}
              </button>
              <button className="ghost-button" onClick={() => openFlagComposer(currentItem.question, session.id, session.settings.blueprintId, session.settings.mode)}>
                Report
              </button>
              <button className="primary-button" onClick={() => void finalizeSession()} disabled={isFinalizing}>
                {session.settings.mode === 'exam' ? 'Submit exam' : 'Complete session'}
              </button>
            </div>
          </div>
        </section>

        {/* Item tracker */}
        <section className="card stack-gap">
          <p className="eyebrow">Tracker</p>
          <div className="tracker-grid">
            {session.items.map((item, index) => {
              const answered = Boolean(session.answers[item.itemId]);
              const bookmarked = session.flaggedForReview.includes(item.itemId);
              return (
                <button
                  key={item.itemId}
                  className={[
                    'tracker-chip',
                    index === session.currentIndex ? 'is-current' : '',
                    answered ? 'is-answered' : '',
                    bookmarked ? 'is-bookmarked' : ''
                  ].filter(Boolean).join(' ')}
                  onClick={() => mutateSession((cur) => ({ ...cur, currentIndex: index }))}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
