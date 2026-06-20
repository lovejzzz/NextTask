// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BoardCompanion } from './BoardCompanion';

describe('BoardCompanion', () => {
  it('shows the current mood and its line of dialogue', () => {
    render(<BoardCompanion mood="exasperated" quip="Three overdue and you're recoloring things?" onPoke={() => {}} />);
    expect(screen.getByText('exasperated')).toBeInTheDocument();
    expect(screen.getByText(/Three overdue/)).toBeInTheDocument();
  });

  it('exposes the mood to assistive tech and pokes on click', () => {
    const onPoke = vi.fn();
    render(<BoardCompanion mood="proud" quip="Look at you." onPoke={onPoke} />);
    const creature = screen.getByRole('button', { name: /The board feels proud/i });
    creature.click();
    expect(onPoke).toHaveBeenCalledTimes(1);
  });
});
