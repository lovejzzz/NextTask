// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CompanionChat } from './CompanionChat';

describe('CompanionChat', () => {
  it('opens with the board greeting', () => {
    render(<CompanionChat chat={vi.fn()} onClose={() => {}} />);
    expect(screen.getByText(/It's me — the board/)).toBeInTheDocument();
  });

  it('sends a message and streams the board’s reply', async () => {
    // Stream two chunks, then resolve the final cleaned reply.
    const chat = vi.fn(async (_history, onToken: (c: string) => void) => {
      onToken('finish ');
      onToken('the overdue ones.');
      return 'finish the overdue ones.';
    });
    render(<CompanionChat chat={chat} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('Message the board'), { target: { value: 'what now?' } });
    fireEvent.click(screen.getByLabelText('Send'));

    expect(screen.getByText('what now?')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('finish the overdue ones.')).toBeInTheDocument());
    expect(chat).toHaveBeenCalledTimes(1);
    expect(chat.mock.calls[0][0].at(-1)).toEqual({ role: 'user', content: 'what now?' });
  });

  it('shows a fallback when generation yields nothing', async () => {
    const chat = vi.fn(async () => null);
    render(<CompanionChat chat={chat} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('Message the board'), { target: { value: 'hi' } });
    fireEvent.click(screen.getByLabelText('Send'));
    await waitFor(() => expect(screen.getByText(/went quiet/)).toBeInTheDocument());
  });
});
