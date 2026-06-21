import { describe, expect, it } from 'vitest';

import { makeTask } from '../test/factories';
import { boardShape, computeInsights, describeBoardShape } from './insights';

const NOW = new Date(2026, 5, 20); // 2026-06-20 local

describe('computeInsights', () => {
  it('summarises an empty board with zeroed stats', () => {
    const insights = computeInsights([], NOW);
    expect(insights.total).toBe(0);
    expect(insights.completion).toBe(0);
    expect(insights.byStatus).toEqual({ todo: 0, in_progress: 0, in_review: 0, done: 0 });
  });

  it('counts statuses and computes completion', () => {
    const tasks = [
      makeTask({ status: 'todo' }),
      makeTask({ status: 'in_progress' }),
      makeTask({ status: 'done' }),
      makeTask({ status: 'done' }),
    ];
    const insights = computeInsights(tasks, NOW);
    expect(insights.total).toBe(4);
    expect(insights.done).toBe(2);
    expect(insights.active).toBe(2);
    expect(insights.completion).toBe(0.5);
    expect(insights.byStatus.todo).toBe(1);
  });

  it('averages the age of active tasks only', () => {
    const tasks = [
      makeTask({ status: 'todo', created_at: '2026-06-10T00:00:00.000Z' }), // 10 days
      makeTask({ status: 'in_progress', created_at: '2026-06-16T00:00:00.000Z' }), // 4 days
      makeTask({ status: 'done', created_at: '2026-01-01T00:00:00.000Z' }), // ignored
    ];
    const insights = computeInsights(tasks, NOW);
    expect(insights.avgAgeDays).toBe(7);
  });

  it('flags overdue and high-priority active work, ignoring done tasks', () => {
    const tasks = [
      makeTask({ status: 'todo', priority: 'high', due_date: '2026-06-10' }),
      makeTask({ status: 'todo', priority: 'high' }),
      makeTask({ status: 'done', priority: 'high', due_date: '2026-06-01' }),
    ];
    const insights = computeInsights(tasks, NOW);
    expect(insights.overdue).toBe(1);
    expect(insights.highPriority).toBe(2);
  });
});

describe('boardShape', () => {
  const shapeOf = (tasks: Parameters<typeof computeInsights>[0]) => boardShape(computeInsights(tasks, NOW));

  it('reads an empty board as empty', () => {
    expect(shapeOf([])).toBe('empty');
    expect(shapeOf([makeTask({ status: 'done' })])).toBe('empty');
  });

  it('reads a wall of pressing work as overwhelmed', () => {
    const overdue = Array.from({ length: 4 }, () => makeTask({ status: 'todo', due_date: '2026-06-01' }));
    expect(shapeOf(overdue)).toBe('overwhelmed');
    const highPri = Array.from({ length: 5 }, () => makeTask({ status: 'todo', priority: 'high' }));
    expect(shapeOf(highPri)).toBe('overwhelmed');
  });

  it('reads a sprawl of stale, low-urgency tasks as scattered', () => {
    const stale = Array.from({ length: 7 }, () =>
      makeTask({ status: 'todo', priority: 'low', created_at: '2026-04-01T00:00:00.000Z' }),
    );
    expect(shapeOf(stale)).toBe('scattered');
  });

  it('reads a healthy few as calm', () => {
    const calm = [makeTask({ status: 'todo' }), makeTask({ status: 'in_progress' }), makeTask({ status: 'todo' })];
    expect(shapeOf(calm)).toBe('calm');
  });

  it('speaks a distinct read for each shape', () => {
    expect(describeBoardShape(computeInsights([], NOW))).toMatch(/empty/i);
    const overwhelmed = describeBoardShape(computeInsights(Array.from({ length: 4 }, () => makeTask({ due_date: '2026-06-01' })), NOW));
    expect(overwhelmed).toMatch(/heavy|pressing|overdue/i);
  });
});
