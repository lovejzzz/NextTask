import { describe, expect, it } from 'vitest';

import { makeTask } from '../test/factories';
import { groupTasks, reorderForDrop, statusLabel } from './boardLogic';

describe('groupTasks', () => {
  it('returns all four lanes even when empty', () => {
    const grouped = groupTasks([]);
    expect(Object.keys(grouped).sort()).toEqual(['done', 'in_progress', 'in_review', 'todo']);
    expect(grouped.todo).toEqual([]);
  });

  it('groups by status and sorts each lane by ascending position', () => {
    const a = makeTask({ id: 'a', status: 'todo', position: 3000 });
    const b = makeTask({ id: 'b', status: 'todo', position: 1000 });
    const c = makeTask({ id: 'c', status: 'done', position: 2000 });
    const grouped = groupTasks([a, b, c]);
    expect(grouped.todo.map((t) => t.id)).toEqual(['b', 'a']);
    expect(grouped.done.map((t) => t.id)).toEqual(['c']);
    expect(grouped.in_progress).toEqual([]);
  });
});

describe('reorderForDrop', () => {
  it('returns no updates when a task is dropped back into its current place', () => {
    const a = makeTask({ id: 'a', status: 'todo', position: 1000 });
    const b = makeTask({ id: 'b', status: 'todo', position: 2000 });
    // drop b over itself: it lands back at the end of todo, so nothing changes
    const updates = reorderForDrop([a, b], b, 'todo', 'b');
    expect(updates).toEqual([]);
  });

  it('resequences the target lane to 1000-spaced positions when moving across columns', () => {
    const a = makeTask({ id: 'a', status: 'todo', position: 1000 });
    const t1 = makeTask({ id: 't1', status: 'done', position: 1000 });
    const t2 = makeTask({ id: 't2', status: 'done', position: 2000 });
    const updates = reorderForDrop([a, t1, t2], a, 'done'); // append to done

    const moved = updates.find((u) => u.id === 'a');
    expect(moved).toEqual({ id: 'a', status: 'done', position: 3000 });
    // t1/t2 already at 1000/2000 so they should not be re-emitted
    expect(updates.find((u) => u.id === 't1')).toBeUndefined();
    expect(updates.find((u) => u.id === 't2')).toBeUndefined();
  });

  it('inserts before the task being hovered', () => {
    const a = makeTask({ id: 'a', status: 'todo', position: 1000 });
    const t1 = makeTask({ id: 't1', status: 'done', position: 1000 });
    const t2 = makeTask({ id: 't2', status: 'done', position: 2000 });
    const updates = reorderForDrop([a, t1, t2], a, 'done', 't2'); // before t2

    // order becomes t1(1000), a(2000), t2(3000)
    expect(updates.find((u) => u.id === 'a')).toEqual({ id: 'a', status: 'done', position: 2000 });
    expect(updates.find((u) => u.id === 't2')).toEqual({ id: 't2', status: 'done', position: 3000 });
  });

  it('compacts the source lane after a task leaves it', () => {
    const a = makeTask({ id: 'a', status: 'todo', position: 1000 });
    const b = makeTask({ id: 'b', status: 'todo', position: 2000 });
    const c = makeTask({ id: 'c', status: 'todo', position: 3000 });
    const updates = reorderForDrop([a, b, c], a, 'done');

    // b and c move up to 1000/2000 in the source lane
    expect(updates.find((u) => u.id === 'b')).toEqual({ id: 'b', status: 'todo', position: 1000 });
    expect(updates.find((u) => u.id === 'c')).toEqual({ id: 'c', status: 'todo', position: 2000 });
  });
});

describe('statusLabel', () => {
  it('maps known statuses to human labels', () => {
    expect(statusLabel('todo')).toBe('To Do');
    expect(statusLabel('in_progress')).toBe('In Progress');
    expect(statusLabel('in_review')).toBe('In Review');
    expect(statusLabel('done')).toBe('Done');
  });
});
