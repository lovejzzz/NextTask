import { describe, expect, it } from 'vitest';

import { makeTask } from '../test/factories';
import { buildStandup } from './standup';

const NOW = new Date(2026, 5, 20, 9, 30); // Sat, Jun 20 2026, 09:30 local

describe('buildStandup', () => {
  it('groups the board into standup sections with counts', () => {
    const tasks = [
      makeTask({ title: 'Wire API', status: 'in_progress' }),
      makeTask({ title: 'Polish drawer', status: 'in_progress' }),
      makeTask({ title: 'Review PR', status: 'in_review' }),
    ];
    const text = buildStandup(tasks, NOW);
    expect(text).toContain('🗓️ Standup — Sat, Jun 20');
    expect(text).toContain('🚀 In progress (2)');
    expect(text).toContain('- Wire API');
    expect(text).toContain('🔍 In review (1)');
  });

  it('counts only tasks marked done today', () => {
    const tasks = [
      makeTask({ title: 'Shipped today', status: 'done', updated_at: '2026-06-20T08:00:00.000Z' }),
      makeTask({ title: 'Shipped yesterday', status: 'done', updated_at: '2026-06-19T08:00:00.000Z' }),
    ];
    const text = buildStandup(tasks, NOW);
    expect(text).toContain('✅ Done today (1)');
    expect(text).toContain('- Shipped today');
    expect(text).not.toContain('- Shipped yesterday');
  });

  it('surfaces the top-ranked task as up next', () => {
    const tasks = [
      makeTask({ title: 'Low key', status: 'todo', priority: 'low' }),
      makeTask({ title: 'Overdue thing', status: 'todo', priority: 'low', due_date: '2026-06-10' }),
    ];
    const text = buildStandup(tasks, NOW);
    expect(text).toContain('⏭️ Up next\n- Overdue thing');
  });

  it('calls out overdue tasks in their own section', () => {
    const tasks = [
      makeTask({ title: 'Late report', status: 'todo', due_date: '2026-06-10' }),
      makeTask({ title: 'On track', status: 'todo', due_date: '2026-06-25' }),
    ];
    const text = buildStandup(tasks, NOW);
    expect(text).toContain('⚠️ Overdue (1)');
    expect(text).toContain('- Late report');
  });

  it('omits the overdue section when nothing is late', () => {
    const text = buildStandup([makeTask({ title: 'Fresh', status: 'todo' })], NOW);
    expect(text).not.toContain('Overdue');
  });

  it('handles an empty board gracefully', () => {
    const text = buildStandup([], NOW);
    expect(text).toContain('🚀 In progress (0)');
    expect(text).toContain('- Nothing queued');
  });
});
