// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ActionProposalCard } from './ActionProposalCard';

describe('ActionProposalCard', () => {
  it('renders a single-action proposal and fires Accept / Dismiss', () => {
    const onAccept = vi.fn();
    const onDismiss = vi.fn();
    render(
      <ActionProposalCard
        proposal={{ summary: 'Mark "Email Sam" done? You decide; it undoes.', reason: 'grounded in "Email Sam", reversible' }}
        onAccept={onAccept}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.getByText(/Mark "Email Sam" done\?/)).toBeInTheDocument();
    expect(screen.getByText(/grounded in "Email Sam"/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Proposed board action' })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Accept suggestion'));
    expect(onAccept).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText('Dismiss suggestion'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders a plan variant with its ordered steps', () => {
    render(
      <ActionProposalCard
        proposal={{ summary: "Here's a plan — tidy up: complete then clear.", steps: ['complete "Email Sam"', 'clear overdue'] }}
        onAccept={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByRole('group', { name: 'Proposed plan' })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items.map((i) => i.textContent)).toEqual(['complete "Email Sam"', 'clear overdue']);
  });

  it('shows a resolved status and hides the buttons once decided', () => {
    const { rerender } = render(
      <ActionProposalCard proposal={{ summary: 'x' }} onAccept={() => {}} onDismiss={() => {}} decided="accepted" />,
    );
    expect(screen.getByText(/Done — and reversible/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Accept suggestion')).not.toBeInTheDocument();

    rerender(<ActionProposalCard proposal={{ summary: 'x' }} onAccept={() => {}} onDismiss={() => {}} decided="dismissed" />);
    expect(screen.getByText(/Dismissed. Nothing changed/)).toBeInTheDocument();
  });
});
