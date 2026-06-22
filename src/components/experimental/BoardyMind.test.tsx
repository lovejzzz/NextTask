// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BoardyMind, type MindView } from './BoardyMind';

const mind: MindView = {
  board: ['Your nearest deadline: "Invoice" is due in 2 days.', 'Right now you\'re in the middle of: "Redesign".'],
  pursuit: 'I set out to steady the board (yesterday). It\'s moving the right way (5 → 2).',
  wants: ['Clear the 2 overdue tasks before they rot.'],
  told: ['Works best in the mornings'],
};

describe('BoardyMind (glass-box panel)', () => {
  it('shows every part of his mind, plainly', () => {
    render(<BoardyMind mind={mind} onClose={() => {}} />);
    expect(screen.getByText(/nearest deadline/)).toBeInTheDocument();
    expect(screen.getByText(/steady the board/)).toBeInTheDocument();
    expect(screen.getByText(/Clear the 2 overdue/)).toBeInTheDocument();
    expect(screen.getByText(/Works best in the mornings/)).toBeInTheDocument();
  });

  it('hides empty sections (e.g. no standing pursuit)', () => {
    render(<BoardyMind mind={{ board: ['x'], pursuit: null, wants: [], told: [] }} onClose={() => {}} />);
    expect(screen.queryByText(/What I’m pursuing/)).not.toBeInTheDocument();
    expect(screen.queryByText(/What I want right now/)).not.toBeInTheDocument();
  });

  it('has a calm empty state when his mind is quiet', () => {
    render(<BoardyMind mind={{ board: [], pursuit: null, wants: [], told: [] }} onClose={() => {}} />);
    expect(screen.getByText(/My mind’s quiet right now/)).toBeInTheDocument();
  });

  it('closes when asked', () => {
    const onClose = vi.fn();
    render(<BoardyMind mind={mind} onClose={onClose} />);
    screen.getByRole('button', { name: 'Close' }).click();
    expect(onClose).toHaveBeenCalled();
  });
});
