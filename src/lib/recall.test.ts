import { describe, expect, it } from 'vitest';

import { makeTask } from '../test/factories';
import { remember, type MemoryStore } from './memory';
import { reconstruct, recallFromBoard, recallNearestDeadline, recallNeglected, recallRecentlyShipped } from './recall';

const NOW = new Date(2026, 5, 20); // 2026-06-20

describe('recallNearestDeadline (read live from the board)', () => {
  it('reads the nearest deadline straight off the cards', () => {
    const tasks = [
      makeTask({ id: 'far', title: 'Taxes', due_date: '2026-07-01' }),
      makeTask({ id: 'near', title: 'Invoice', due_date: '2026-06-22' }),
    ];
    expect(recallNearestDeadline(tasks, NOW)?.text).toContain('Invoice');
  });

  it('CANNOT go stale: rescheduling the card changes the memory', () => {
    const friday = [makeTask({ id: 'x', title: 'Launch', due_date: '2026-06-19' })];
    const before = recallNearestDeadline(friday, NOW);
    expect(before?.text).toMatch(/overdue/);

    // The human reschedules on the board — no memory write, no "forget the old fact".
    const monday = [makeTask({ id: 'x', title: 'Launch', due_date: '2026-06-25' })];
    const after = recallNearestDeadline(monday, NOW);
    expect(after?.text).toMatch(/due in 5 days/);
    // The conventional bug — remembering Friday after the move — is impossible here.
    expect(after?.text).not.toMatch(/overdue/);
  });

  it('returns nothing when no card carries a deadline', () => {
    expect(recallNearestDeadline([makeTask({ due_date: null })], NOW)).toBeNull();
  });
});

describe('reconstructing episodic memory from board state', () => {
  it('remembers recent ships without ever logging them', () => {
    const tasks = [
      makeTask({ id: 'a', title: 'Login fix', status: 'done', updated_at: '2026-06-19T10:00:00.000Z' }),
      makeTask({ id: 'b', title: 'Old thing', status: 'done', updated_at: '2026-01-01T00:00:00.000Z' }),
    ];
    const shipped = recallRecentlyShipped(tasks, NOW);
    expect(shipped?.text).toContain('Login fix');
    expect(shipped?.text).not.toContain('Old thing');
  });

  it('remembers neglect as the absence of recent edits', () => {
    const tasks = [makeTask({ id: 'rot', title: 'Refactor utils', status: 'todo', updated_at: '2026-04-01T00:00:00.000Z' })];
    expect(recallNeglected(tasks, NOW)?.text).toMatch(/untouched for \d+ days/);
  });
});

describe('recallFromBoard', () => {
  it('reconstructs several memories from one board read, none of them stored', () => {
    const tasks = [
      makeTask({ id: 'due', title: 'Invoice', status: 'todo', due_date: '2026-06-22' }),
      makeTask({ id: 'wip', title: 'Redesign', status: 'in_progress' }),
      makeTask({ id: 'ship', title: 'Login fix', status: 'done', updated_at: '2026-06-19T10:00:00.000Z' }),
    ];
    const kinds = recallFromBoard(tasks, NOW).map((r) => r.source);
    expect(kinds.length).toBeGreaterThanOrEqual(3);
    expect(kinds.every((s) => s === 'board')).toBe(true);
  });
});

describe('reconstruct (board primary, stored residue secondary)', () => {
  const traces = (): MemoryStore => remember([], { kind: 'semantic', text: 'Works best in the mornings', source: 'user-told' }, NOW.getTime());

  it('blends live board memory with the irreducible stored residue', () => {
    const tasks = [makeTask({ id: 'due', title: 'Invoice', status: 'todo', due_date: '2026-06-22' })];
    const all = reconstruct(tasks, traces(), NOW);
    expect(all.some((r) => r.source === 'board' && /Invoice/.test(r.text))).toBe(true);
    // The preference can't be derived from any card — only this is actually stored.
    expect(all.some((r) => r.source === 'trace' && /mornings/.test(r.text))).toBe(true);
  });

  it('answers a deadline query live from the board, with no stored note', () => {
    const tasks = [makeTask({ id: 'due', title: 'Invoice', status: 'todo', due_date: '2026-06-22' })];
    const hits = reconstruct(tasks, [], NOW, 'deadline');
    expect(hits.some((r) => /deadline/i.test(r.text) && r.source === 'board')).toBe(true);
  });
});
