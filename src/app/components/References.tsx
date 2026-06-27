import type { Question } from '../../types/exam';

export function References({ question }: { question: Question }) {
  return (
    <div className="reference-list">
      <h5>References</h5>
      <ul className="plain-list">
        {question.references.map((reference) => (
          <li key={`${reference.citation}-${reference.locator ?? ''}`} className="reference-item">
            {reference.url ? (
              <a className="reference-citation" href={reference.url} target="_blank" rel="noreferrer">
                {reference.citation}
              </a>
            ) : (
              <span className="reference-citation">{reference.citation}</span>
            )}
            {reference.locator ? <div className="reference-locator">{reference.locator}</div> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
