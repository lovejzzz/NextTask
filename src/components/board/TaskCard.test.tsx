// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeLabel, makeMember, makeTask } from '../../test/factories';
import { TaskCard } from './TaskCard';

// Note: drag behavior (dnd-kit) is covered by the Playwright smoke; here we test
// the card's own rendering and the edit-icon → onOpen contract.
describe('TaskCard', () => {
  it('renders the title, description, labels, and assignees', () => {
    const task = makeTask({
      title: 'Polish drag overlay',
      description: 'Make it tactile',
      labels: [makeLabel({ name: 'Design' })],
      assignees: [makeMember({ name: 'Avery Stone' })],
      comment_count: 3,
    });
    render(<TaskCard task={task} onOpen={() => {}} />);

    expect(screen.getByRole('heading', { name: 'Polish drag overlay' })).toBeInTheDocument();
    expect(screen.getByText('Make it tactile')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('opens the editor when the edit icon is clicked', async () => {
    const onOpen = vi.fn();
    const task = makeTask({ id: 'task-7', title: 'Edit me' });
    render(<TaskCard task={task} onOpen={onOpen} />);

    const editButton = screen.getByRole('button', { name: 'Edit Edit me' });
    editButton.click();
    expect(onOpen).toHaveBeenCalledWith('task-7');
  });

  it('keeps sortable semantics on the drag handle instead of the card root', () => {
    const task = makeTask({ title: 'Drag target' });
    const { container } = render(
      <TaskCard
        task={task}
        onOpen={() => {}}
        attributes={{ role: 'button', tabIndex: 0, 'aria-roledescription': 'sortable' }}
        listeners={{ onKeyDown: vi.fn(), onMouseDown: vi.fn(), onTouchStart: vi.fn() }}
      />,
    );

    expect(container.querySelector('article.task-card')).not.toHaveAttribute('role', 'button');
    expect(screen.getByRole('button', { name: 'Drag Drag target' })).not.toHaveAttribute('aria-roledescription');
  });

  it('shows mobile move controls only when onMove is provided', () => {
    const task = makeTask({ title: 'Movable' });
    const { rerender } = render(<TaskCard task={task} onOpen={() => {}} />);
    expect(screen.queryByLabelText('Move Movable')).not.toBeInTheDocument();

    rerender(<TaskCard task={task} onOpen={() => {}} onMove={() => {}} />);
    expect(screen.getByLabelText('Move Movable')).toBeInTheDocument();
  });
});
