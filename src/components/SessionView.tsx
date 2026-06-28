import type { ActiveSession, SessionItemSnapshot, Question, BlueprintId, ExamMode, ItemFlag, FlagReason } from '../types/exam';
import { getBlueprintLabel } from '../data/blueprints';
import { useState } from 'react';

function displayLetterForIndex(i: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + i);
}

function displayLetterForOptionId(optionOrder: string[], optionId: string): string {
  const idx = optionOrder.indexOf(optionId);
  return idx >= 0 ? displayLetterForIndex(idx) : optionId;
}

function incorrectRationalesForDisplay(item: SessionItemSnapshot) {
  return item.optionOrder.flatMap((optionId, optionIndex) => {
    if (optionId === item.question.correct) return [];
    const rationale = item.question.explanation.rationale_incorrect?.[optionId];
    if (!rationale) return [];
    return [{ displayLetter: displayLetterForIndex(optionIndex), rationale }];
  });
}

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) return 'Untimed';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((p) => String(p).padStart(2, '0')).join(':');
}

function References({ question }: { question: Question }) {
  return (
    <div className="reference-list">
      <h5>References</h5>
      <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
        {question.references.map((ref) => (
          <li key={`${ref.citation}-${ref.locator ?? ''}`} style={{ marginBottom: '0.5rem' }}>
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

const FLAG_REASONS: FlagReason[] = [
  'factual error',
  'outdated policy/guideline',
  'ambiguous / >1 defensible answer',
  'typo / wording',
  'broken or wrong reference link',
  'other'
];

interface SessionViewProps {
  session: ActiveSession;
  onMutate: (mutator: (current: ActiveSession) => ActiveSession) => void;
  onFinalize: () => void;
  isFinalizing: boolean;
  onReportItem: (item: Question, sessionId: string, blueprint: BlueprintId, mode: ExamMode, existing?: ItemFlag) => void;
  flags: ItemFlag[];
}

export default function SessionView({ session, onMutate, onFinalize, isFinalizing, onReportItem, flags }: SessionViewProps) {
  const currentItem = session.items[session.currentIndex];
  const answeredCount = Object.values(session.answers).filter((a) => Boolean(a)).length;
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<FlagReason>('factual error');
  const [reportComment, setReportComment] = useState('');

  function handleAnswer(optionId: string) {
    onMutate((current) => ({
      ...current,
      answers: { ...current.answers, [current.items[current.currentIndex].itemId]: optionId },
      revealed: current.settings.mode === 'study'
        ? { ...current.revealed, [current.items[current.currentIndex].itemId]: true }
        : current.revealed
    }));
  }

  function navigate(direction: -1 | 1) {
    onMutate((current) => ({
      ...current,
      currentIndex: Math.min(Math.max(current.currentIndex + direction, 0), current.items.length - 1)
    }));
  }

  function toggleBookmark() {
    onMutate((current) => {
      const itemId = current.items[current.currentIndex].itemId;
      const bookmarked = current.flaggedForReview.includes(itemId);
      return {
        ...current,
        flaggedForReview: bookmarked
          ? current.flaggedForReview.filter((v) => v !== itemId)
          : [...current.flaggedForReview, itemId]
      };
    });
  }

  if (!currentItem) return null;

  return (
    <>
      <div className="card card-stack">
        <div className="session-header">
          <div>
            <p className="eyebrow">{session.settings.mode === 'exam' ? 'Exam session' : 'Study session'}</p>
            <h2>Item {session.currentIndex + 1} of {session.items.length}</h2>
          </div>
          <div className="session-stats">
            <span className="badge badge-default">Answered {answeredCount}</span>
            <span className="badge badge-default">Remaining {session.items.length - answeredCount}</span>
            <span className="badge badge-default">Bookmarks {session.flaggedForReview.length}</span>
            {session.settings.timed && (
              <button className="badge badge-accent" onClick={() => onMutate((c) => ({ ...c, timerHidden: !c.timerHidden }))}>
                {session.timerHidden ? 'Show timer' : formatDuration(session.remainingSeconds)}
              </button>
            )}
          </div>
        </div>

        <article className="question-card">
          <div className="question-meta">
            <span className="badge badge-accent">{currentItem.categoryLabel}</span>
            <span className={`badge ${currentItem.question.status === 'draft' ? 'badge-warning' : 'badge-success'}`}>
              {currentItem.question.status}
            </span>
            <span className="badge badge-default">{currentItem.question.type === 'one_best' ? 'Single best' : 'Complex combo'}</span>
          </div>

          <p className="question-stem">{currentItem.question.stem}</p>

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
                  ].filter(Boolean).join(' ')}
                  role="radio"
                  aria-checked={selected}
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
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {incorrectRationalesForDisplay(currentItem).map(({ displayLetter, rationale }) => (
                  <li key={displayLetter}><strong>{displayLetter}:</strong> {rationale}</li>
                ))}
              </ul>
              <References question={currentItem.question} />
            </div>
          )}
        </article>

        <div className="btn-group" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div className="btn-group">
            <button className="btn-secondary" onClick={() => navigate(-1)} disabled={session.currentIndex === 0}>Previous</button>
            <button className="btn-secondary" onClick={() => navigate(1)} disabled={session.currentIndex === session.items.length - 1}>Next</button>
          </div>
          <div className="btn-group">
            <button className="btn-ghost" onClick={toggleBookmark}>
              {session.flaggedForReview.includes(currentItem.itemId) ? 'Remove bookmark' : 'Bookmark item'}
            </button>
            <button className="btn-ghost" onClick={() => {
              const existing = flags.find((f) => f.item_id === currentItem.question.id);
              if (existing) {
                setReportReason(existing.reason);
                setReportComment(existing.comment);
              } else {
                setReportReason('factual error');
                setReportComment('');
              }
              setShowReportModal(true);
            }}>
              Report item
            </button>
            <button className="btn-primary" onClick={onFinalize} disabled={isFinalizing}>
              {session.settings.mode === 'exam' ? 'Submit exam' : 'Complete session'}
            </button>
          </div>
        </div>
      </div>

      {/* Tracker */}
      <div className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Session overview</p>
            <h3>Tracking</h3>
          </div>
        </div>
        <div className="tracker-grid" style={{ marginTop: '0.65rem' }}>
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
                onClick={() => onMutate((current) => ({ ...current, currentIndex: index }))}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Report Item Modal */}
      {showReportModal && (
        <section className="modal-backdrop" aria-label="Report this item">
          <div className="modal-card">
            <h2>Report this item</h2>
            <label className="form-label">
              Reason
              <select value={reportReason} onChange={(e) => setReportReason(e.target.value as FlagReason)}>
                {FLAG_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="form-label">
              Comment
              <textarea rows={4} value={reportComment} onChange={(e) => setReportComment(e.target.value)} />
            </label>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowReportModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => {
                onReportItem(currentItem.question, session.id, session.settings.blueprintId, session.settings.mode, flags.find((f) => f.item_id === currentItem.question.id));
                setShowReportModal(false);
              }}>Save report</button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

export { formatDuration, displayLetterForOptionId, incorrectRationalesForDisplay, References };
