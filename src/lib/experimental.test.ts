import { describe, expect, it } from 'vitest';

import { makeTask } from '../test/factories';
import { focusScore, nextStatusFor, rankFocusTasks } from './experimental';

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

describe('nextStatusFor', () => {
  it('advances through the board columns', () => {
    expect(nextStatusFor('todo')).toBe('in_progress');
    expect(nextStatusFor('in_progress')).toBe('in_review');
    expect(nextStatusFor('in_review')).toBe('done');
    expect(nextStatusFor('done')).toBeNull();
  });
});
