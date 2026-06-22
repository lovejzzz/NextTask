import { describe, expect, it } from 'vitest';

import { makeLabel, makeTask } from '../test/factories';
import {
  detectBlocked,
  focusConfidence,
  honestStatus,
  pickBiggestRisk,
  pickDropCandidates,
  pickDropCandidatesWithReasons,
  pickNextActionable,
  pickQuickWin,
  pickQuickWins,
} from './companionAdvice';

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

  it('among equally near-done tasks, prefers the one worth doing — not the most trivial', () => {
    const tasks = [
      makeTask({ id: 'trivial', status: 'in_review', priority: 'low', position: 0, title: 'Footer year' }),
      makeTask({ id: 'worthit', status: 'in_review', priority: 'high', position: 1, title: 'Payment bug' }),
    ];
    expect(pickQuickWin(tasks, NOW)?.id).toBe('worthit');
  });

  it("lets real value outweigh a small head start (not just the nearest task)", () => {
    const tasks = [
      makeTask({ id: 'near-trivial', status: 'in_review', priority: 'low' }),
      makeTask({ id: 'worth-it', status: 'in_progress', priority: 'high' }),
    ];
    expect(pickQuickWin(tasks, NOW)?.id).toBe('worth-it');
  });

  it('skips blocked work even if it is closest to done', () => {
    const tasks = [
      makeTask({ id: 'blocked', status: 'in_review', title: 'Ship (blocked on infra)' }),
      makeTask({ id: 'open', status: 'in_progress', priority: 'high' }),
    ];
    expect(pickQuickWin(tasks, NOW)?.id).toBe('open');
  });
});

describe('pickQuickWins', () => {
  it('returns the top N fastest wins, excluding blocked tasks', () => {
    const tasks = [
      makeTask({ id: 'review', status: 'in_review' }),
      makeTask({ id: 'prog', status: 'in_progress' }),
      makeTask({ id: 'blocked', status: 'in_review', title: 'Deploy (blocked on infra)' }),
      makeTask({ id: 'todo', status: 'todo' }),
    ];
    const ids = pickQuickWins(tasks, 2).map((task) => task.id);
    expect(ids).toEqual(['review', 'prog']);
    expect(ids).not.toContain('blocked');
  });
});

describe('pickNextActionable', () => {
  it('skips a blocked task even when it ranks highest', () => {
    const tasks = [
      makeTask({ id: 'blocked', title: 'Ship launch (blocked on legal)', priority: 'high', due_date: '2026-06-10' }),
      makeTask({ id: 'doable', title: 'Reply to investor', priority: 'high', due_date: '2026-06-12' }),
    ];
    expect(pickNextActionable(tasks, NOW)?.id).toBe('doable');
  });

  it('returns null when everything actionable is gone', () => {
    expect(pickNextActionable([makeTask({ title: 'X (blocked on infra)' })], NOW)).toBeNull();
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

describe('detectBlocked', () => {
  it('reads blocked signals from title, description, and labels', () => {
    const tasks = [
      makeTask({ id: 'title', title: 'Deploy (blocked on infra)' }),
      makeTask({ id: 'desc', title: 'Launch', description: 'waiting on legal sign-off' }),
      makeTask({ id: 'label', title: 'Migrate db', labels: [makeLabel({ name: 'On hold' })] }),
      makeTask({ id: 'clear', title: 'Write docs' }),
      makeTask({ id: 'donequiet', title: 'blocked thing', status: 'done' }),
    ];
    const ids = detectBlocked(tasks).map((task) => task.id);
    expect(ids).toEqual(['title', 'desc', 'label']);
  });
});

describe('focusConfidence', () => {
  it('is weak when the board is flat and nothing stands out', () => {
    const flat = [
      makeTask({ id: 'a', status: 'todo', priority: 'normal', position: 0 }),
      makeTask({ id: 'b', status: 'todo', priority: 'normal', position: 1 }),
      makeTask({ id: 'c', status: 'todo', priority: 'normal', position: 2 }),
    ];
    expect(focusConfidence(flat, NOW)).toBe('weak');
  });

  it('is clear when one task plainly leads', () => {
    const tasks = [
      makeTask({ id: 'late', status: 'todo', priority: 'low', due_date: '2026-06-10' }),
      makeTask({ id: 'fresh', status: 'todo', priority: 'normal' }),
    ];
    expect(focusConfidence(tasks, NOW)).toBe('clear');
  });

  it('is clear when there is only one actionable task', () => {
    expect(focusConfidence([makeTask({ id: 'only', status: 'todo' })], NOW)).toBe('clear');
  });

  it('is none when nothing is actionable', () => {
    expect(focusConfidence([makeTask({ status: 'done' })], NOW)).toBe('none');
    expect(focusConfidence([makeTask({ title: 'Ship (blocked on legal)' })], NOW)).toBe('none');
  });
});

describe('honestStatus', () => {
  const base = { shippedToday: 1, totalShipped: 40, streak: 3, bestStreak: 9 };

  it('always reports the real counts', () => {
    const line = honestStatus({ ...base, overdue: 0, active: 4 });
    expect(line).toContain('1 shipped today');
    expect(line).toContain('40 all-time');
    expect(line).toContain('streak 3 (best 9)');
  });

  it('leads with overdue truth instead of cheer, even on a good day', () => {
    const line = honestStatus({ ...base, overdue: 5, active: 6 });
    expect(line).toContain('5 overdue');
    expect(line).toMatch(/piling up/);
    expect(line).not.toMatch(/keep it rolling/i);
  });

  it('singularizes a lone overdue task', () => {
    expect(honestStatus({ ...base, overdue: 1, active: 2 })).toContain('1 overdue task is');
  });

  it('celebrates only when the board is genuinely clear', () => {
    expect(honestStatus({ ...base, overdue: 0, active: 0 })).toMatch(/nothing pressing/i);
  });

  it("doesn't manufacture momentum when nothing shipped yet", () => {
    const line = honestStatus({ ...base, shippedToday: 0, overdue: 0, active: 3 });
    expect(line).toMatch(/nothing shipped yet/i);
    expect(line).not.toMatch(/good momentum/i);
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

describe('pickDropCandidatesWithReasons', () => {
  it('only suggests genuinely safe cuts, never load-bearing work', () => {
    const tasks = [
      makeTask({ id: 'overdue', status: 'todo', priority: 'high', due_date: '2026-06-10' }),
      makeTask({ id: 'inmotion', status: 'in_progress', priority: 'normal' }),
      makeTask({ id: 'soon', status: 'todo', priority: 'normal', due_date: '2026-06-22' }),
      makeTask({ id: 'safe', status: 'todo', priority: 'low', updated_at: '2026-04-01T00:00:00.000Z' }),
    ];
    const drops = pickDropCandidatesWithReasons(tasks, NOW);
    const ids = drops.map((d) => d.task.id);
    expect(ids).toEqual(['safe']);
    expect(ids).not.toContain('overdue');
    expect(ids).not.toContain('inmotion');
    expect(ids).not.toContain('soon');
  });

  it('explains why each cut is safe', () => {
    const [drop] = pickDropCandidatesWithReasons(
      [makeTask({ id: 'safe', status: 'todo', priority: 'low', updated_at: '2026-04-01T00:00:00.000Z' })],
      NOW,
    );
    expect(drop.reason).toMatch(/low priority/);
    expect(drop.reason).toMatch(/no deadline/);
    expect(drop.reason).toMatch(/untouched \d+ days/);
  });

  it('returns nothing when the whole board is load-bearing', () => {
    const allUrgent = [
      makeTask({ status: 'todo', priority: 'high', due_date: '2026-06-10' }),
      makeTask({ status: 'in_progress', priority: 'high' }),
      makeTask({ status: 'todo', priority: 'high', due_date: '2026-06-22' }),
    ];
    expect(pickDropCandidatesWithReasons(allUrgent, NOW)).toEqual([]);
  });
});
