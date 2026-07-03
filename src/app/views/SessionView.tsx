import { useState } from 'react';
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
        const isBookmarked = session.flaggedForReview.includes(item.itemId);
        return (
          <button
            key={item.itemId}
            className={`question-map__chip${isCurrent ? ' is-current' : ''}${answered ? ' is-answered' : ''}${isBookmarked ? ' is-bookmarked' : ''}`}
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
  const [mapOpen, setMapOpen] = useState(false);

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
      <div className="row row--spread" style={{ alignItems: 'center' }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="badge badge--teal">{currentItem.categoryLabel}</span>
          {session.settings.mode === 'study' && <span className="badge">study</span>}
          {currentItem.question.shuffle === false && <span className="badge">fixed options</span>}
        </div>
        {session.remainingSeconds !== null && (
          <button className={`timer-btn${session.timerHidden ? ' is-hidden' : ''}`} onClick={onToggleTimerHidden}>
            {session.timerHidden ? '⏱ Show' : formatDuration(session.remainingSeconds)}
          </button>
        )}
      </div>

      {/* Question card */}
      <article className="card card--panel stack stack--gap">
        <p className="question-stem">{currentItem.question.stem}</p>

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
                disabled={Boolean(session.submittedAt)}
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
              <div style={{ marginTop: 12, borderTop: '1px solid var(--expline)', paddingTop: 12 }}>
                <p style={{ fontWeight: 600, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--successtext)', marginBottom: 7 }}>References</p>
                {currentItem.question.references.map((ref) => (
                  <div key={`${ref.citation}-${ref.locator ?? ''}`} style={{ fontSize: 12, color: 'var(--ink)', marginBottom: 6, lineHeight: 1.45 }}>
                    {ref.url ? <a href={ref.url} target="_blank" rel="noreferrer">{ref.citation}</a> : ref.citation}
                    {ref.locator && <span style={{ display: 'block', color: 'var(--muted)', fontSize: 11.5, marginTop: 2 }} className="field-hint">{ref.locator}</span>}
                  </div>
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
          <button className="btn-secondary" onClick={() => setMapOpen(true)}>Map</button>
          <button className="btn-gold" onClick={onSubmit}>
            {session.settings.mode === 'exam' ? 'Submit exam' : 'Finish session'}
          </button>
        </div>
      </div>

      {/* Question map modal overlay */}
      {mapOpen && (
        <section className="modal-backdrop" aria-label="Question map" onClick={() => setMapOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ width: 'min(700px, 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2>Question map</h2>
              <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--muted)' }}>
                <span>● Answered</span>
                <span>★ Bookmarked</span>
              </div>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: '60vh', paddingRight: 4 }}>
              <QuestionMapInline
                session={session}
                onSelectItem={(index) => {
                  onSelectItem(index);
                  setMapOpen(false);
                }}
              />
            </div>
            <button className="btn-secondary" onClick={() => setMapOpen(false)} style={{ marginTop: 12, alignSelf: 'flex-end' }}>
              Close
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
