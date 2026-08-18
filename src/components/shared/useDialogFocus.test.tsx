// @vitest-environment jsdom

import { fireEvent, render, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useDialogFocus } from './useDialogFocus';

function Dialog({ name, onClose }: { name: string; onClose: () => void }) {
  const firstRef = useRef<HTMLButtonElement | null>(null);
  useDialogFocus(true, onClose, firstRef);
  return (
    <section role="dialog" aria-modal="true" aria-label={name}>
      <button ref={firstRef}>First {name}</button>
      <button>Last {name}</button>
    </section>
  );
}

describe('useDialogFocus', () => {
  it('only lets the topmost stacked dialog handle Escape', async () => {
    const closeBottom = vi.fn();
    const closeTop = vi.fn();
    const view = render(
      <>
        <Dialog name="bottom" onClose={closeBottom} />
        <Dialog name="top" onClose={closeTop} />
      </>,
    );

    await waitFor(() => expect(view.getByRole('button', { name: 'First top' })).toHaveFocus());
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(closeTop).toHaveBeenCalledOnce();
    expect(closeBottom).not.toHaveBeenCalled();
  });

  it('wraps Tab focus inside the active dialog', async () => {
    const view = render(<Dialog name="only" onClose={() => undefined} />);
    const first = view.getByRole('button', { name: 'First only' });
    const last = view.getByRole('button', { name: 'Last only' });

    await waitFor(() => expect(first).toHaveFocus());
    last.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(first).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });
});
