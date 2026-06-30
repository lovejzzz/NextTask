import { describe, expect, it } from 'vitest';

import { reviewOutcome, snapshotBoard, targetTitlesOf, type OutcomeSnapshot } from './reviewOutcome';
import type { ProposedAction } from './liveAction';
import type { Task } from './types';

const task = (over: Partial<Task> = {}): Task => ({
  id: over.id ?? 't1',
  user_id: 'u1',
  title: over.title ?? 'Email Sam',
  description: '',
  status: over.status ?? 'todo',
  priority: over.priority ?? 'normal',
  due_date: over.due_date ?? null,
  position: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  assignees: [],
  labels: [],
  comment_count: 0,
  latest_activity_at: null,
  ...over,
});

describe('targetTitlesOf', () => {
  it('collects distinct named titles, dropping clear_overdue (no task)', () => {
    const actions: ProposedAction[] = [{ kind: 'complete_task', task: 'A' }, { kind: 'drop_task', task: 'B' }, { kind: 'clear_overdue' }, { kind: 'complete_task', task: 'A' }];
    expect(targetTitlesOf(actions)).toEqual(['A', 'B']);
  });
});

describe('snapshotBoard', () => {
  it('captures only the requested titles, plus board-wide insights', () => {
    const tasks = [task({ title: 'A' }), task({ id: 't2', title: 'B', status: 'done' })];
    const snap = snapshotBoard(tasks, ['A']);
    expect(snap.byTitle.A).toEqual({ status: 'todo', priority: 'normal', due_date: null });
    expect(snap.byTitle.B).toBeUndefined(); // not requested, not captured
    expect(snap.insights.total).toBe(2); // insights are still board-wide
  });

  it('records an absent title as undefined, not throwing', () => {
    const snap = snapshotBoard([], ['Ghost']);
    expect(snap.byTitle.Ghost).toBeUndefined();
  });
});

describe('reviewOutcome', () => {
  const mk = (byTitle: OutcomeSnapshot['byTitle'], overdue = 0, total = 1): OutcomeSnapshot => ({
    at: 0,
    insights: { total, done: 0, active: total, completion: 0, byStatus: { todo: total, in_progress: 0, in_review: 0, done: 0 }, overdue, highPriority: 0, avgAgeDays: 0 },
    byTitle,
  });

  it('passes a complete_task whose title is now done', () => {
    const before = mk({ X: { status: 'todo', priority: 'normal', due_date: null } });
    const after = mk({ X: { status: 'done', priority: 'normal', due_date: null } });
    const review = reviewOutcome([{ kind: 'complete_task', task: 'X' }], before, after);
    expect(review.verdict).toBe('pass');
    expect(review.score).toBe(1);
    expect(review.summary).toMatch(/all 1 step/);
  });

  it('fails a complete_task whose status did not move', () => {
    const before = mk({ X: { status: 'todo', priority: 'normal', due_date: null } });
    const after = mk({ X: { status: 'todo', priority: 'normal', due_date: null } });
    const review = reviewOutcome([{ kind: 'complete_task', task: 'X' }], before, after);
    expect(review.verdict).toBe('fail');
    expect(review.steps[0].detail).toMatch(/is todo, expected done/);
  });

  it('passes drop_task when the title is gone, present and absent share the same logic', () => {
    const before = mk({ X: { status: 'todo', priority: 'normal', due_date: null } });
    const after = mk({ X: undefined });
    expect(reviewOutcome([{ kind: 'drop_task', task: 'X' }], before, after).verdict).toBe('pass');
  });

  it('passes create_task only when the title is new (absent before, present after)', () => {
    const before = mk({ Y: undefined });
    const after = mk({ Y: { status: 'todo', priority: 'normal', due_date: null } });
    expect(reviewOutcome([{ kind: 'create_task', task: 'Y' }], before, after).verdict).toBe('pass');
    // a title that already existed before doesn't count as "added", even if present after
    const beforeExisted = mk({ Y: { status: 'todo', priority: 'normal', due_date: null } });
    expect(reviewOutcome([{ kind: 'create_task', task: 'Y' }], beforeExisted, after).verdict).toBe('fail');
  });

  it('passes set_priority only when the exact requested priority landed', () => {
    const before = mk({ X: { status: 'todo', priority: 'normal', due_date: null } });
    const after = mk({ X: { status: 'todo', priority: 'high', due_date: null } });
    expect(reviewOutcome([{ kind: 'set_priority', task: 'X', priority: 'high' }], before, after).verdict).toBe('pass');
    expect(reviewOutcome([{ kind: 'set_priority', task: 'X', priority: 'low' }], before, after).verdict).toBe('fail');
  });

  it('passes reschedule_task on any due-date change, fails when unchanged', () => {
    const before = mk({ X: { status: 'todo', priority: 'normal', due_date: '2026-01-01' } });
    const movedAfter = mk({ X: { status: 'todo', priority: 'normal', due_date: '2026-02-01' } });
    const sameAfter = mk({ X: { status: 'todo', priority: 'normal', due_date: '2026-01-01' } });
    expect(reviewOutcome([{ kind: 'reschedule_task', task: 'X' }], before, movedAfter).verdict).toBe('pass');
    expect(reviewOutcome([{ kind: 'reschedule_task', task: 'X' }], before, sameAfter).verdict).toBe('fail');
  });

  it('passes clear_overdue when overdue dropped, or trivially when it was already zero', () => {
    expect(reviewOutcome([{ kind: 'clear_overdue' }], mk({}, 3), mk({}, 0)).verdict).toBe('pass');
    expect(reviewOutcome([{ kind: 'clear_overdue' }], mk({}, 0), mk({}, 0)).verdict).toBe('pass'); // nothing to clear isn't a failure
    expect(reviewOutcome([{ kind: 'clear_overdue' }], mk({}, 3), mk({}, 3)).verdict).toBe('fail');
  });

  it('scores a multi-step plan as partial when only some steps landed', () => {
    const before = mk({ A: { status: 'todo', priority: 'normal', due_date: null }, B: { status: 'todo', priority: 'normal', due_date: null } });
    const after = mk({ A: { status: 'done', priority: 'normal', due_date: null }, B: { status: 'todo', priority: 'normal', due_date: null } });
    const review = reviewOutcome(
      [{ kind: 'complete_task', task: 'A' }, { kind: 'complete_task', task: 'B' }],
      before,
      after,
    );
    expect(review.verdict).toBe('partial');
    expect(review.score).toBe(1);
    expect(review.max).toBe(2);
    expect(review.summary).toMatch(/Partly landed \(1\/2\)/);
  });

  it('never silently passes an empty action list', () => {
    expect(reviewOutcome([], mk({}), mk({})).verdict).toBe('fail');
  });
});
