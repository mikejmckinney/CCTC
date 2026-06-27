import type { ItemFlag, Question } from '../../types/exam';
import { getBlueprintLabel } from '../../data/blueprints';
import { buildInitialFlagDraft } from '../lib/helpers';
import type { FlagDraft } from '../lib/types';

interface ReviewFeedbackProps {
  flags: ItemFlag[];
  exportFlags: () => void;
  resetFlags: () => void;
  setFlagDraft: (draft: FlagDraft) => void;
  clearFlagById: (id: string) => void;
  bankQuestions: Question[];
}

export function ReviewFeedback({
  flags,
  exportFlags,
  resetFlags,
  setFlagDraft,
  clearFlagById,
  bankQuestions
}: ReviewFeedbackProps) {
  return (
    <>
      <section className="panel panel--span-2 stack-gap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Structured review feedback</p>
            <h2>Flags</h2>
          </div>
          <div className="action-row">
            <button className="secondary-button" onClick={() => void exportFlags()} disabled={flags.length === 0}>
              Export flags
            </button>
            <button className="ghost-button" onClick={() => void resetFlags()} disabled={flags.length === 0}>
              Clear all
            </button>
          </div>
        </div>

        <p className="field-hint">
          Use <strong>Export flags</strong> to download <code>cctc-flags.json</code>, then email that file to your SME reviewer.
          Flags stay on this device only — the app never edits question files in the repository.
        </p>

        {flags.length === 0 ? (
          <p className="status-card">No open flags yet.</p>
        ) : (
          Object.entries(
            flags.reduce<Record<string, ItemFlag[]>>((groups, flag) => {
              groups[flag.item_id] = [...(groups[flag.item_id] ?? []), flag];
              return groups;
            }, {})
          ).map(([itemId, itemFlags]) => (
            <article key={itemId} className="history-card">
              <div>
                <h3>{itemId}</h3>
                {itemFlags.map((flag) => (
                  <div key={flag.id} className="flag-row">
                    <p>
                      <strong>{flag.reason}</strong> · {flag.mode} · {getBlueprintLabel(flag.blueprint)}
                    </p>
                    <p>{flag.comment || 'No comment provided.'}</p>
                  </div>
                ))}
              </div>
              <div className="action-row action-row--column">
                <button
                  className="secondary-button"
                  onClick={() => {
                    const matchedQuestion = bankQuestions.find((question) => question.id === itemId);
                    if (matchedQuestion) {
                      setFlagDraft(buildInitialFlagDraft(matchedQuestion, itemFlags[0].session_id, itemFlags[0].blueprint, itemFlags[0].mode, itemFlags[0]));
                    }
                  }}
                >
                  Edit latest
                </button>
                <button className="ghost-button" onClick={() => void clearFlagById(itemFlags[0].id)}>
                  Clear latest
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="panel stack-gap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Export contract</p>
            <h2>Shape</h2>
          </div>
        </div>
        <pre className="code-block">{`{
  "exportedAt": "ISO-8601",
  "flags": [{
    "item_id": "cctc-0001",
    "version": 1,
    "status": "draft",
    "reason": "typo / wording",
    "comment": "optional note",
    "session_id": "...",
    "blueprint": "cctc-from-2026-07",
    "mode": "study"
  }]
}`}</pre>
      </section>
    </>
  );
}
