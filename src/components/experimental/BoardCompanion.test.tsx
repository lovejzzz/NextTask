// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BoardCompanion } from './BoardCompanion';

describe('BoardCompanion', () => {
  it('shows the current mood and its rule-based line when the brain is off', () => {
    render(<BoardCompanion mood="exasperated" quip="Three overdue and you're recoloring things?" onPoke={() => {}} />);
    expect(screen.getByText('exasperated')).toBeInTheDocument();
    expect(screen.getByText(/Three overdue/)).toBeInTheDocument();
  });

  it('announces its lines through a polite live region', () => {
    render(<BoardCompanion mood="content" quip="Pick something." onPoke={() => {}} />);
    const live = screen.getByRole('status');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveTextContent('Pick something.');
  });

  it('exposes the mood to assistive tech and pokes on click', () => {
    const onPoke = vi.fn();
    render(<BoardCompanion mood="proud" quip="Look at you." onPoke={onPoke} />);
    screen.getByRole('button', { name: /The board feels proud/i }).click();
    expect(onPoke).toHaveBeenCalledTimes(1);
  });

  it('shows a download progress pill while the brain is loading', () => {
    render(<BoardCompanion mood="content" quip="hi" onPoke={() => {}} brainStatus="loading" brainProgress={0.42} />);
    expect(screen.getByText(/waking up/)).toHaveTextContent('42%');
  });

  it('speaks the generated line (and a brain badge) once the brain is ready', async () => {
    const generate = vi.fn().mockResolvedValue('I see you, procrastinator.');
    render(<BoardCompanion mood="anxious" quip="canned line" onPoke={() => {}} brainStatus="ready" generate={generate} />);
    expect(await screen.findByText('I see you, procrastinator.')).toBeInTheDocument();
    expect(screen.getByText('🧠')).toBeInTheDocument();
    expect(generate).toHaveBeenCalledWith('anxious');
  });

  it('regenerates when poked', async () => {
    const generate = vi.fn().mockResolvedValue('a line');
    const { rerender } = render(
      <BoardCompanion mood="content" quip="q" onPoke={() => {}} brainStatus="ready" generate={generate} pokeNonce={0} />,
    );
    await waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    rerender(<BoardCompanion mood="content" quip="q" onPoke={() => {}} brainStatus="ready" generate={generate} pokeNonce={1} />);
    await waitFor(() => expect(generate).toHaveBeenCalledTimes(2));
  });

  it('falls back to the rule-based line when generation yields nothing', async () => {
    const generate = vi.fn().mockResolvedValue(null);
    render(<BoardCompanion mood="bored" quip="add a task already" onPoke={() => {}} brainStatus="ready" generate={generate} />);
    await waitFor(() => expect(generate).toHaveBeenCalled());
    expect(screen.getByText('add a task already')).toBeInTheDocument();
  });

  it('offers a talk affordance only when the brain is ready and chat is wired', () => {
    const { rerender } = render(<BoardCompanion mood="content" quip="q" onPoke={() => {}} />);
    expect(screen.queryByLabelText('Talk to the board')).not.toBeInTheDocument();
    rerender(
      <BoardCompanion mood="content" quip="q" onPoke={() => {}} brainStatus="ready" generate={vi.fn()} chat={vi.fn()} />,
    );
    expect(screen.getByLabelText('Talk to the board')).toBeInTheDocument();
  });
});
