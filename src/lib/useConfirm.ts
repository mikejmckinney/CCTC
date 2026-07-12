import { useState, useCallback } from 'react';

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'primary' | 'destructive';
  onConfirm: () => void;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const confirm = useCallback((opts: ConfirmOptions) => {
    setState({ open: true, ...opts });
  }, []);

  const handleConfirm = useCallback(() => {
    state.onConfirm();
    setState((prev) => ({ ...prev, open: false }));
  }, [state.onConfirm]);

  const handleCancel = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    confirm,
    handleConfirm,
    handleCancel,
    open: state.open,
    title: state.title,
    description: state.description,
    confirmLabel: state.confirmLabel ?? 'Confirm',
    variant: state.variant ?? 'primary',
  };
}

