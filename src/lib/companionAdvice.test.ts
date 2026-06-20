import { describe, expect, it } from 'vitest';

import { makeTask } from '../test/factories';
import { pickBiggestRisk, pickDropCandidates, pickQuickWin } from './companionAdvice';

const NOW = new Date(2026, 5, 20);

describe('pickQuickWin', () => {
  it('prefers the task closest to done', () => {
    const tasks = [
      makeTask({ id: 'todo', status: 'todo' }),
      makeTask({ id: 'review', status: 'in_review' }),
      makeTask({ id: 'prog', status: 'in_progress' }),
    ];
    expect(pickQuickWin(tasks)?.id).toBe('review');
  });

  it('returns null on an empty board', () => {
    expect(pickQuickWin([makeTask({ status: 'done' })])).toBeNull();
  });
});

describe('pickBiggestRisk', () => {
  it('surfaces the most pressing task (overdue beats fresh)', () => {
    const tasks = [
      makeTask({ id: 'fresh', status: 'todo', priority: 'high' }),
      makeTask({ id: 'late', status: 'todo', priority: 'low', due_date: '2026-06-10' }),
    ];
    expect(pickBiggestRisk(tasks, NOW)?.id).toBe('late');
  });
});

describe('pickDropCandidates', () => {
  it('returns the least-deserving active tasks, worst first', () => {
    const tasks = [
      makeTask({ id: 'urgent', status: 'todo', priority: 'high', due_date: '2026-06-10' }),
      makeTask({ id: 'meh', status: 'todo', priority: 'low' }),
      makeTask({ id: 'done', status: 'done' }),
    ];
    const drops = pickDropCandidates(tasks, NOW);
    expect(drops[0].id).toBe('meh');
    expect(drops.some((task) => task.status === 'done')).toBe(false);
  });
});
