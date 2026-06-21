import { describe, expect, it } from 'vitest';

import { makeTask } from '../test/factories';
import { focusReason, focusScore, nextStatusFor, rankFocusTasks } from './experimental';

const NOW = new Date(2026, 5, 20); // 2026-06-20, matches dueTone's local-midnight basis.

describe('rankFocusTasks', () => {
  it('excludes done tasks', () => {
    const tasks = [
      makeTask({ id: 'done', status: 'done' }),
      makeTask({ id: 'open', status: 'todo' }),
    ];
    const ranked = rankFocusTasks(tasks, NOW);
    expect(ranked.map((task) => task.id)).toEqual(['open']);
  });

  it('puts overdue work ahead of fresh high-priority work', () => {
    const overdue = makeTask({ id: 'overdue', priority: 'low', status: 'todo', due_date: '2026-06-10' });
    const fresh = makeTask({ id: 'fresh', priority: 'high', status: 'todo', due_date: null });
    const ranked = rankFocusTasks([fresh, overdue], NOW);
    expect(ranked[0].id).toBe('overdue');
  });

  it('treats a same-day deadline as a commitment over open-ended importance', () => {
    const dueToday = makeTask({ id: 'today', priority: 'low', status: 'todo', due_date: '2026-06-20' });
    const importantNoDeadline = makeTask({ id: 'someday', priority: 'high', status: 'todo', due_date: null });
    const ranked = rankFocusTasks([importantNoDeadline, dueToday], NOW);
    expect(ranked[0].id).toBe('today');
  });

  it('prefers work already in motion when priority ties', () => {
    const doing = makeTask({ id: 'doing', priority: 'normal', status: 'in_progress' });
    const waiting = makeTask({ id: 'waiting', priority: 'normal', status: 'todo' });
    const ranked = rankFocusTasks([waiting, doing], NOW);
    expect(ranked[0].id).toBe('doing');
  });

  it('breaks score ties by board position', () => {
    const a = makeTask({ id: 'a', status: 'todo', priority: 'normal', position: 200 });
    const b = makeTask({ id: 'b', status: 'todo', priority: 'normal', position: 100 });
    const ranked = rankFocusTasks([a, b], NOW);
    expect(ranked.map((task) => task.id)).toEqual(['b', 'a']);
  });
});

describe('focusScore', () => {
  it('scores done tasks as never-focus', () => {
    expect(focusScore(makeTask({ status: 'done' }), NOW)).toBe(Number.NEGATIVE_INFINITY);
  });
});

describe('focusReason', () => {
  it('calls out overdue work with the day count', () => {
    expect(focusReason(makeTask({ status: 'todo', due_date: '2026-06-19' }), NOW)).toBe('Overdue by 1 day');
    expect(focusReason(makeTask({ status: 'todo', due_date: '2026-06-17' }), NOW)).toBe('Overdue by 3 days');
  });

  it('flags imminent due dates', () => {
    expect(focusReason(makeTask({ status: 'todo', due_date: '2026-06-20' }), NOW)).toBe('Due today');
    expect(focusReason(makeTask({ status: 'todo', due_date: '2026-06-21' }), NOW)).toBe('Due tomorrow');
    expect(focusReason(makeTask({ status: 'todo', due_date: '2026-06-23' }), NOW)).toBe('Due in 3 days');
  });

  it('falls back to priority and status signals', () => {
    expect(focusReason(makeTask({ status: 'todo', priority: 'high' }), NOW)).toBe('High priority');
    expect(focusReason(makeTask({ status: 'in_review', priority: 'normal' }), NOW)).toBe('Waiting on review');
    expect(focusReason(makeTask({ status: 'in_progress', priority: 'normal' }), NOW)).toBe('Already in motion');
    expect(focusReason(makeTask({ status: 'todo', priority: 'normal' }), NOW)).toBe('Next in your queue');
  });
});

describe('nextStatusFor', () => {
  it('advances through the board columns', () => {
    expect(nextStatusFor('todo')).toBe('in_progress');
    expect(nextStatusFor('in_progress')).toBe('in_review');
    expect(nextStatusFor('in_review')).toBe('done');
    expect(nextStatusFor('done')).toBeNull();
  });
});
