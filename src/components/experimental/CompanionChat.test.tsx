// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CompanionChat } from './CompanionChat';

describe('CompanionChat', () => {
  it('opens with the board greeting', () => {
    render(<CompanionChat chat={vi.fn()} onClose={() => {}} />);
    expect(screen.getByText(/It's me — Boardy/)).toBeInTheDocument();
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

  it('renders an action proposal as a consent card and runs it on Accept', async () => {
    const accept = vi.fn(async () => 'Done: complete "Email Sam". Undo\'s right there.');
    const chat = vi.fn(async () => ({
      kind: 'proposal' as const,
      proposal: { summary: 'Mark "Email Sam" done? You decide; it undoes.', reason: 'grounded, reversible' },
      accept,
    }));
    render(<CompanionChat chat={chat} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('Message the board'), { target: { value: 'done with the email' } });
    fireEvent.click(screen.getByLabelText('Send'));

    await waitFor(() => expect(screen.getByRole('group', { name: 'Proposed board action' })).toBeInTheDocument());
    expect(accept).not.toHaveBeenCalled(); // nothing runs until the human says yes

    fireEvent.click(screen.getByLabelText('Accept suggestion'));
    await waitFor(() => expect(screen.getByText(/Done: complete "Email Sam"/)).toBeInTheDocument());
    expect(accept).toHaveBeenCalledTimes(1);
  });

  it('dismisses a proposal without running it', async () => {
    const accept = vi.fn(async () => 'ran');
    const chat = vi.fn(async () => ({
      kind: 'proposal' as const,
      proposal: { summary: 'Clear the overdue pile? One yes, and it all undoes.' },
      accept,
    }));
    render(<CompanionChat chat={chat} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('Message the board'), { target: { value: 'clear overdue' } });
    fireEvent.click(screen.getByLabelText('Send'));

    await waitFor(() => expect(screen.getByLabelText('Dismiss suggestion')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Dismiss suggestion'));
    await waitFor(() => expect(screen.getByText(/Dismissed. Nothing changed/)).toBeInTheDocument());
    expect(accept).not.toHaveBeenCalled();
  });
});
