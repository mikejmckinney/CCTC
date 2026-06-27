import type { ActiveSession, SessionItemSnapshot } from '../../types/exam';
import { displayLetterForIndex, displayLetterForOptionId, incorrectRationalesForDisplay, formatDuration } from '../lib/helpers';
import { References } from './References';

interface SessionRunnerProps {
  session: ActiveSession;
  currentItem: SessionItemSnapshot;
  answeredCount: number;
  handleAnswer: (optionId: string) => void;
  navigateSession: (direction: -1 | 1) => void;
  toggleBookmark: () => void;
  toggleTimerHidden: () => void;
  openFlagComposer: () => void;
  finalizeSession: () => void;
  isFinalizing: boolean;
  mutateSession: (mutator: (current: ActiveSession) => ActiveSession) => void;
}

export function SessionRunner({
  session,
  currentItem,
  answeredCount,
  handleAnswer,
  navigateSession,
  toggleBookmark,
  toggleTimerHidden,
  openFlagComposer,
  finalizeSession,
  isFinalizing,
  mutateSession
}: SessionRunnerProps) {
  return (
    <>
      <section className="panel panel--span-2 stack-gap">
        <div className="session-header">
          <div className="session-header__main">
            <p className="eyebrow">{session.settings.mode === 'exam' ? 'Exam session' : 'Study session'}</p>
            <h2>
              Item {session.currentIndex + 1} of {session.items.length}
            </h2>
          </div>
          <div className="session-header__meta">
            <span className="badge badge--compact">{answeredCount} answered</span>
            <span className="badge badge--compact">{session.flaggedForReview.length} bookmarked</span>
            {session.settings.timed && (
              <button className="pill pill--compact" onClick={toggleTimerHidden}>
                {session.timerHidden ? 'Show timer' : formatDuration(session.remainingSeconds)}
              </button>
            )}
          </div>
        </div>

        {(session.bankSummary.length > 0 || session.shortageNotes.length > 0) && (
          <div className="notice-block">
            {[...session.bankSummary, ...session.shortageNotes].map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        )}

        <article className="question-card question-card--hero">
          <div className="question-meta">
            <span className="badge badge--soft">{currentItem.categoryLabel}</span>
            <span className={currentItem.question.status === 'draft' ? 'badge badge--warning' : 'badge badge--success'}>
              {currentItem.question.status}
            </span>
            <span className="badge badge--soft">{currentItem.question.type === 'one_best' ? 'Single best answer' : 'Complex combo'}</span>
          </div>

          <h3 className="question-stem">{currentItem.question.stem}</h3>

          {currentItem.question.elements && (
            <ol className="element-list">
              {currentItem.question.elements.map((element) => (
                <li key={element.id}>
                  <strong>{element.id}.</strong> {element.text}
                </li>
              ))}
            </ol>
          )}

          <div className="option-list" role="radiogroup" aria-label="Answer choices">
            {currentItem.optionOrder.map((optionId, optionIndex) => {
              const option = currentItem.question.options.find((entry) => entry.id === optionId)!;
              const displayLetter = displayLetterForIndex(optionIndex);
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
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${displayLetter}. ${option.text}`}
                  onClick={() => handleAnswer(option.id)}
                >
                  <span className="option-letter">{displayLetter}</span>
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
                {incorrectRationalesForDisplay(currentItem).map(({ displayLetter, rationale }) => (
                  <li key={displayLetter}>
                    <strong>{displayLetter}:</strong> {rationale}
                  </li>
                ))}
              </ul>
              <References question={currentItem.question} />
            </div>
          )}
        </article>

        <div className="session-toolbar-spacer" />
      </section>

      <div className="session-toolbar" role="toolbar" aria-label="Session controls">
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
            {session.flaggedForReview.includes(currentItem.itemId) ? 'Remove bookmark' : 'Bookmark item'}
          </button>
          <button className="ghost-button" onClick={openFlagComposer}>
            Flag this item
          </button>
          <button className="primary-button" onClick={() => void finalizeSession()} disabled={isFinalizing}>
            {session.settings.mode === 'exam' ? 'Submit exam' : 'Complete session'}
          </button>
        </div>
      </div>

      <section className="panel stack-gap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Session overview</p>
            <h2>Tracking</h2>
          </div>
        </div>
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
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => mutateSession((current) => ({ ...current, currentIndex: index }))}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
