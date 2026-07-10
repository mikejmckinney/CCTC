import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Modal } from '../components/ui';
import { useConfirm } from '../lib/useConfirm';
import type { ItemFlag } from '../types/exam';
import { Flag, Edit3, Trash2, Download, AlertCircle } from 'lucide-react';

interface ReportedItemsProps {
  flags: ItemFlag[];
  onEdit: (flag: ItemFlag) => void;
  onDelete: (flagId: string) => void;
  onExport: () => void;
  onClearAll: () => void;
}

export function ReportedItems({ flags, onEdit, onDelete, onExport, onClearAll }: ReportedItemsProps) {
  const { confirm, handleConfirm, handleCancel, open, title, description, confirmLabel, variant } = useConfirm();
  const pendingDeleteId = useRef<string | null>(null);

  const handleDelete = (flagId: string) => {
    pendingDeleteId.current = flagId;
    confirm({
      title: 'Delete Report',
      description: 'Are you sure you want to delete this report? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'destructive',
      onConfirm: () => {
        const id = pendingDeleteId.current;
        if (id) {
          onDelete(id);
          pendingDeleteId.current = null;
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--warning)]/10">
                <Flag className="h-5 w-5 text-[var(--warning)]" />
              </div>
              <div>
                <CardTitle>Reported Items</CardTitle>
                <p className="text-sm text-[var(--muted-foreground)]">Items you've flagged for review</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={onExport} disabled={flags.length === 0} className="gap-1">
                <Download className="h-4 w-4" /> Export
              </Button>
              <Button variant="ghost" size="sm" onClick={onClearAll} disabled={flags.length === 0} className="gap-1 text-[var(--destructive)]">
                <Trash2 className="h-4 w-4" /> Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {flags.length > 0 ? (
            <div className="space-y-3">
              {flags.map((flag) => (
                <div
                  key={flag.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--warning)]/30"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-[var(--foreground)]">{flag.item_id}</span>
                      <Badge variant="warning">{flag.reason}</Badge>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {flag.comment || 'No comment provided.'}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Reported {new Date(flag.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}{flag.mode} mode
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="ghost" size="icon-sm" onClick={() => onEdit(flag)} aria-label="Edit report">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(flag.id)} aria-label="Delete report" className="text-[var(--destructive)]">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-[var(--muted-foreground)]/30 mb-3" />
              <p className="text-sm font-medium text-[var(--foreground)]">No reported items</p>
              <p className="text-xs text-[var(--muted-foreground)]">Use the "Report" button during a session to flag items for review.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export format info */}
      <Card>
        <CardHeader>
          <CardTitle>Export Format</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="rounded-lg bg-[var(--muted)] p-4 text-xs font-mono text-[var(--muted-foreground)] overflow-auto">
{`{
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
}`}
          </pre>
        </CardContent>
      </Card>

      {/* Delete confirmation modal — driven by useConfirm hook */}
      <Modal
        open={open}
        onClose={handleCancel}
        title={title}
        description={description}
      >
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
          <Button variant={variant === 'destructive' ? 'destructive' : 'primary'} onClick={handleConfirm}>{confirmLabel}</Button>
        </div>
      </Modal>
    </div>
  );
}
