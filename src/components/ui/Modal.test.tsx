import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('does not close from Escape or backdrop when nondismissible', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Required notice" dismissible={false}>
        <button>Continue</button>
      </Modal>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('dialog').firstElementChild as HTMLElement);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('only references labels and descriptions that exist', () => {
    const { rerender } = render(
      <Modal open onClose={() => undefined} title="Named dialog">
        <p>Child content</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).not.toHaveAttribute('aria-describedby');

    rerender(
      <Modal open onClose={() => undefined} description="Described dialog">
        <p>Child content</p>
      </Modal>
    );
    expect(dialog).not.toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');
  });
});
