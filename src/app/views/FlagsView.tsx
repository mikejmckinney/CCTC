import type { ItemFlag, Question } from '../../types/exam';
import { getBlueprintLabel } from '../../data/blueprints';

interface FlagsViewProps {
  flags: ItemFlag[];
  bankQuestions: Question[];
  onEditFlag: (flag: ItemFlag) => void;
  onDeleteFlag: (flagId: string) => void;
  onClearAll: () => void;
  onExport: () => void;
  onBack: () => void;
}

export function FlagsView({ flags, onEditFlag, onDeleteFlag, onClearAll, onExport, onBack }: FlagsViewProps) {
  const grouped = flags.reduce<Record<string, ItemFlag[]>>((acc, flag) => {
    acc[flag.item_id] = [...(acc[flag.item_id] ?? []), flag];
    return acc;
  }, {});

  return (
    <div className="stack stack--gap-lg">
      <div className="row row--spread">
        <div className="row" style={{ gap: 12 }}>
          <button className="btn-ghost" onClick={onBack} style={{ minHeight: 40 }}>← Back</button>
          <h1>Flags</h1>
        </div>
        <div className="action-row">
          <button className="btn-secondary" onClick={onExport} disabled={flags.length === 0} style={{ fontSize: 13 }}>Export JSON</button>
          <button className="btn-ghost" onClick={onClearAll} disabled={flags.length === 0} style={{ fontSize: 13, color: 'var(--dangertext)' }}>Clear all</button>
        </div>
      </div>

      <p className="field-hint">
        Use <strong>Export JSON</strong> to download <code>cctc-flags.json</code>. Flags stay on this device — the app never edits question files.
      </p>

      {flags.length === 0 ? (
        <p className="empty-state">No open flags yet.</p>
      ) : (
        Object.entries(grouped).map(([itemId, itemFlags]) => (
          <div key={itemId} className="flag-card">
            <div style={{ flex: 1 }}>
              <strong style={{ fontFamily: 'var(--serif)' }}>{itemId}</strong>
              {itemFlags.map((flag) => (
                <div key={flag.id} style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 13 }}>
                    <span className="badge badge--gold" style={{ marginRight: 8 }}>{flag.reason}</span>
                    {flag.mode} · {getBlueprintLabel(flag.blueprint)}
                  </p>
                  <p className="field-hint" style={{ marginTop: 4 }}>{flag.comment || 'No comment provided.'}</p>
                </div>
              ))}
            </div>
            <div className="stack" style={{ gap: 6, flexShrink: 0 }}>
              <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px', minHeight: 32 }}
                onClick={() => onEditFlag(itemFlags[0])}>
                Edit
              </button>
              <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px', minHeight: 32, color: 'var(--dangertext)' }}
                onClick={() => onDeleteFlag(itemFlags[0].id)}>
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
