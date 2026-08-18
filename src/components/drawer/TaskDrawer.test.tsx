// @vitest-environment jsdom

import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CommentPanel } from './TaskDrawer';

function renderComments(onCreate: (body: string) => Promise<void>) {
  return render(
    <CommentPanel comments={[]} loading={false} taskId="task-1" onCreate={onCreate} onDelete={async () => undefined} />,
  );
}

describe('CommentPanel', () => {
  it('clears a comment draft only after a successful submission', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const view = renderComments(onCreate);
    const input = view.getByPlaceholderText('Write a comment...') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '  Looks good  ' } });
    fireEvent.click(view.getByRole('button', { name: 'Add comment' }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('Looks good'));
    await waitFor(() => expect(input.value).toBe(''));
  });

  it('keeps a failed draft available for retry', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('Network unavailable'));
    const view = renderComments(onCreate);
    const input = view.getByPlaceholderText('Write a comment...') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'Please keep me' } });
    fireEvent.click(view.getByRole('button', { name: 'Add comment' }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledOnce());
    await waitFor(() => expect(view.getByRole('button', { name: 'Add comment' })).toBeEnabled());
    expect(input.value).toBe('Please keep me');
  });
});
