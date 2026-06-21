// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BoardyDesk } from './BoardyDesk';
import type { Proposal } from '../../lib/proposals';

const proposals: Proposal[] = [
  { id: 'clear-overdue', kind: 'clear_overdue', count: 2, summary: 'Let me clear your 2 overdue tasks.' },
  { id: 'upgrade-0', kind: 'upgrade', idea: { title: 'Cache weights', description: 'x', priority: 'normal' }, summary: 'File an upgrade I want: "Cache weights".' },
];

describe('BoardyDesk', () => {
  it('lists Boardy’s wants', () => {
    render(<BoardyDesk proposals={proposals} onAccept={() => {}} onDismiss={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/clear your 2 overdue/)).toBeInTheDocument();
    expect(screen.getByText(/Cache weights/)).toBeInTheDocument();
  });

  it('accepts and dismisses individual proposals', () => {
    const onAccept = vi.fn();
    const onDismiss = vi.fn();
    render(<BoardyDesk proposals={proposals} onAccept={onAccept} onDismiss={onDismiss} onClose={() => {}} />);
    screen.getAllByRole('button', { name: 'Accept' })[0].click();
    expect(onAccept).toHaveBeenCalledWith(proposals[0]);
    screen.getAllByRole('button', { name: 'Dismiss' })[1].click();
    expect(onDismiss).toHaveBeenCalledWith('upgrade-0');
  });

  it('shows an empty state when Boardy wants nothing', () => {
    render(<BoardyDesk proposals={[]} onAccept={() => {}} onDismiss={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/Nothing I want right now/)).toBeInTheDocument();
  });
});
