// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { defaultFilters } from '../../lib/filterLogic';
import type { TaskStatus } from '../../lib/types';
import { ActiveFilterBar, MobileStatusNav, StatsStrip } from './BoardSummary';

describe('BoardSummary', () => {
  it('renders all summary values', () => {
    render(
      <StatsStrip
        loading={false}
        stats={{
          total: 8,
          completed: 2,
          overdue: 1,
          dueSoon: 3,
          byStatus: { todo: 2, in_progress: 2, in_review: 2, done: 2 },
          byPriority: { low: 1, normal: 4, high: 3 },
        }}
      />,
    );

    expect(screen.getByLabelText('Board summary')).toHaveTextContent('Total tasks8');
    expect(screen.getByLabelText('Board summary')).toHaveTextContent('Completed2');
    expect(screen.getByLabelText('Board summary')).toHaveTextContent('In review2');
  });

  it('removes an active filter without changing unrelated filter state', () => {
    const setFilters = vi.fn();
    render(
      <ActiveFilterBar
        filters={{ ...defaultFilters, status: 'done', search: 'ship' }}
        setFilters={setFilters}
        labels={[]}
        members={[]}
        resultCount={2}
        totalCount={8}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove Status: Done filter' }));
    expect(setFilters).toHaveBeenCalledWith({ ...defaultFilters, status: 'all', search: 'ship' });
  });

  it('exposes all mobile statuses and reports the selected status', () => {
    const onChange = vi.fn();
    const grouped = Object.fromEntries(
      (['todo', 'in_progress', 'in_review', 'done'] satisfies TaskStatus[]).map((status) => [status, []]),
    ) as Record<TaskStatus, []>;
    render(<MobileStatusNav active="todo" grouped={grouped} onChange={onChange} />);

    expect(screen.getAllByRole('button')).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: /Review/ }));
    expect(onChange).toHaveBeenCalledWith('in_review');
  });
});
