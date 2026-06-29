import type { ActiveSession, FlagReason, Question, SessionItemSnapshot } from '../../types/exam';
import type { BlueprintId, ExamMode } from '../../types/exam';

interface SessionViewProps {
  session: ActiveSession;
  currentItem: SessionItemSnapshot;
  answeredCount: number;
  onAnswer: (optionId: string) => void;
  onNavigate: (dir: -1 | 1) => void;
  onToggleBookmark: () => void;
  onToggleTimerHidden: () => void;
  onSubmit: () => void;
  onExit: () => void;
  onOpenFlagComposer: (item: Question, sessionId: string, blueprint: BlueprintId, mode: ExamMode) => void;
  onSelectItem: (index: number) => void;
}

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) return 'Untimed';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((p) => String(p).padStart(2, '0')).join(':');
}

function displayLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

function QuestionMapInline({ session, onSelectItem }: { session: ActiveSession; onSelectItem: (i: number) => void }) {
  return (
    <div className="question-map" role="group" aria-label="Question map">
      {session.items.map((item, i) => {
        const answered = Boolean(session.answers[item.itemId]);
        const isCurrent = i === session.currentIndex;
        return (
          <button
            key={item.itemId}
            className={`question-map__chip${isCurrent ? ' is-current' : ''}${answered ? ' is-answered' : ''}`}
            onClick={() => onSelectItem(i)}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}

export function SessionView({ session, currentItem, answeredCount, onAnswer, onNavigate, onToggleBookmark, onToggleTimerHidden, onSubmit, onExit, onOpenFlagComposer, onSelectItem }: SessionViewProps) {
  const revealed = session.settings.mode === 'study' ? session.revealed[currentItem.itemId] : Boolean(session.submittedAt);
  const bookmarked = session.flaggedForReview.includes(currentItem.itemId);

  return (
    <div className="stack stack--gap-lg">
      {/* Header */}
      <div className="session-header">
        <button className="btn-ghost" onClick={onExit} style={{ minHeight: 40 }}>Exit</button>
        <div style={{ textAlign: 'center' }}>
          <p className="eyebrow">{session.settings.mode === 'exam' ? 'Exam session' : 'Study session'}</p>
          <h2 style={{ fontSize: 18 }}>Item {session.currentIndex + 1} of {session.items.length}</h2>
        </div>
        <button className={`btn-ghost${bookmarked ? '' : ''}`} onClick={onToggleBookmark} style={{ minHeight: 40, color: bookmarked ? 'var(--goldtext)' : undefined }}>
          {bookmarked ? '★ Bookmarked' : '☆ Bookmark'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="progress-bar">
        <div className="progress-bar__fill" style={{ width: `${((session.currentIndex + 1) / session.items.length) * 100}%` }} />
      </div>

      {/* Badges + timer */}
      <div className="row" style={{ gap: 8 }}>
        <span className="badge badge--teal">{currentItem.categoryLabel}</span>
        <span className={`badge${currentItem.question.status === 'draft' ? ' badge--gold' : ' badge--success'}`}>{currentItem.question.status}</span>
        <span className="badge">{currentItem.question.type === 'one_best' ? 'Single best' : 'Complex combo'}</span>
        {session.settings.timed && (
          <button className="timer-pill" onClick={onToggleTimerHidden}>
            {session.timerHidden ? 'Show timer' : formatDuration(session.remainingSeconds)}
          </button>
        )}
        <span className="badge">Answered {answeredCount}</span>
        <span className="badge">Bookmarks {session.flaggedForReview.length}</span>
      </div>

      {/* Question */}
      <article className="card card--panel stack stack--gap">
        <h3 className="question-stem">{currentItem.question.stem}</h3>

        {currentItem.question.elements && (
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {currentItem.question.elements.map((el) => (
              <li key={el.id} style={{ marginBottom: 4 }}>
                <strong>{el.id}.</strong> {el.text}
              </li>
            ))}
          </ol>
        )}

        <div className="stack" style={{ gap: 10 }}>
          {currentItem.optionOrder.map((optionId, i) => {
            const option = currentItem.question.options.find((o) => o.id === optionId)!;
            const selected = session.answers[currentItem.itemId] === option.id;
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
                onClick={() => onAnswer(option.id)}
              >
                <span className="option-letter">{displayLetter(i)}</span>
                <span>
                  {option.text}
                  {option.selects && <small className="option-helper">Selects: {option.selects.join(', ')}</small>}
                </span>
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className="explanation-card">
            <p><strong>Correct answer ({displayLetter(currentItem.optionOrder.indexOf(currentItem.question.correct))}):</strong> {currentItem.question.explanation.rationale_correct}</p>
            {currentItem.optionOrder.map((optionId, i) => {
              if (optionId === currentItem.question.correct) return null;
              const rationale = currentItem.question.explanation.rationale_incorrect?.[optionId];
              if (!rationale) return null;
              return <p key={optionId}><strong>{displayLetter(i)}:</strong> {rationale}</p>;
            })}
            {currentItem.question.references.length > 0 && (
              <div>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>References</p>
                {currentItem.question.references.map((ref) => (
                  <p key={`${ref.citation}-${ref.locator ?? ''}`} style={{ marginBottom: 4 }}>
                    {ref.url ? <a href={ref.url} target="_blank" rel="noreferrer">{ref.citation}</a> : ref.citation}
                    {ref.locator && <span className="field-hint" style={{ display: 'block' }}>{ref.locator}</span>}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </article>

      {/* Toolbar */}
      <div className="session-toolbar">
        <div className="action-row">
          <button className="btn-secondary" onClick={() => onNavigate(-1)} disabled={session.currentIndex === 0}>Previous</button>
          <button className="btn-secondary" onClick={() => onNavigate(1)} disabled={session.currentIndex === session.items.length - 1}>Next</button>
        </div>
        <div className="action-row">
          <button className="btn-ghost" onClick={() => onOpenFlagComposer(currentItem.question, session.id, session.settings.blueprintId, session.settings.mode)}>
            Report an issue
          </button>
          <button className="btn-primary" onClick={onSubmit}>
            {session.settings.mode === 'exam' ? 'Submit exam' : 'Finish session'}
          </button>
        </div>
      </div>

      {/* Question map */}
      <div className="card card--panel">
        <p className="eyebrow" style={{ marginBottom: 8 }}>Question map</p>
        <QuestionMapInline session={session} onSelectItem={onSelectItem} />
      </div>
    </div>
  );
}
