// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { mockApi } from './mockApi';
import { gatePlan, readPlan } from './liveAction';
import { executePlan, runReversibleSteps } from './liveExecute';

/**
 * Rung 6 follow-through, against the REAL store: a brain plan → gatePlan → executePlan runs
 * the whole sequence on mockApi, and the single unit-undo reverses all of it. The plan moved
 * the board as a unit, and undoes as a unit — same guarantee rung 4 gave a single action.
 */
beforeEach(() => {
  localStorage.clear();
});

async function seed() {
  await mockApi.resetBoard();
  await mockApi.createTask({ title: 'Reply to Dana', status: 'in_progress' });
  await mockApi.createTask({ title: 'Old onboarding doc', status: 'todo', priority: 'low' });
  await mockApi.createTask({ title: 'Stale ticket', status: 'todo', due_date: '2020-01-01' }); // overdue
}

async function board() {
  const b = await mockApi.getBoard();
  const overdue = b.tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;
  return { titles: b.tasks.map((t) => t.title), overdue };
}

describe('an admitted plan moves the real board and undoes as a unit', () => {
  it('runs every step in order, then one undo reverses all of them', async () => {
    await seed();
    const b = await board();
    expect(b.overdue).toBe(1);

    const plan = readPlan({
      rationale: 'clear the decks for the demo',
      steps: [
        { kind: 'clear_overdue' },
        { kind: 'drop_task', task: 'Old onboarding doc' },
        { kind: 'complete_task', task: 'Reply to Dana' },
      ],
    })!;
    const gated = gatePlan(plan, b);
    expect(gated.admitted).toBe(true);

    const run = await executePlan(gated.actions!);
    expect(run.ranLabels).toEqual(['clear overdue (1)', 'drop "Old onboarding doc"', 'complete "Reply to Dana"']);

    // The board really moved: overdue cleared, doc gone, Dana done.
    let after = await mockApi.getBoard();
    expect(after.tasks.find((t) => t.title === 'Stale ticket')!.status).toBe('done');
    expect(after.tasks.find((t) => t.title === 'Old onboarding doc')).toBeUndefined();
    expect(after.tasks.find((t) => t.title === 'Reply to Dana')!.status).toBe('done');

    // One unit-undo reverses the whole plan, in reverse order.
    await run.undo();
    after = await mockApi.getBoard();
    expect(after.tasks.find((t) => t.title === 'Stale ticket')!.status).toBe('todo'); // overdue restored
    expect(after.tasks.find((t) => t.title === 'Old onboarding doc')).toBeDefined(); // re-created (substance, fresh id)
    expect(after.tasks.find((t) => t.title === 'Reply to Dana')!.status).toBe('in_progress'); // un-completed
  });

  it('a plan held by the gate never reaches the store', async () => {
    await seed();
    const b = await board();
    const before = JSON.stringify((await mockApi.getBoard()).tasks.map((t) => `${t.title}:${t.status}`));

    const plan = readPlan({
      steps: [
        { kind: 'complete_task', task: 'Reply to Dana' },
        { kind: 'drop_task', task: 'Imaginary task' }, // ungrounded — holds the whole plan
      ],
    })!;
    const gated = gatePlan(plan, b);
    expect(gated.admitted).toBe(false);
    expect(gated.actions).toBeUndefined();

    // Nothing executes, because nothing was admitted — the board is byte-identical.
    const after = JSON.stringify((await mockApi.getBoard()).tasks.map((t) => `${t.title}:${t.status}`));
    expect(after).toBe(before);
  });
});

describe('runReversibleSteps — the shared orchestrator', () => {
  it('runs steps in order and one undo reverses them in reverse order', async () => {
    const log: string[] = [];
    const { ranLabels, undo } = await runReversibleSteps([
      async () => {
        log.push('do A');
        return { label: 'A', undo: async () => void log.push('undo A') };
      },
      async () => {
        log.push('do B');
        return { label: 'B', undo: async () => void log.push('undo B') };
      },
    ]);
    expect(ranLabels).toEqual(['A', 'B']);
    await undo();
    expect(log).toEqual(['do A', 'do B', 'undo B', 'undo A']);
  });

  it('skips a step that returns null without recording a label', async () => {
    const { ranLabels } = await runReversibleSteps([
      async () => null,
      async () => ({ label: 'only', undo: async () => {} }),
    ]);
    expect(ranLabels).toEqual(['only']);
  });

  it('rolls back the steps that already ran when a later step throws', async () => {
    const log: string[] = [];
    await expect(
      runReversibleSteps([
        async () => {
          log.push('do A');
          return { label: 'A', undo: async () => void log.push('undo A') };
        },
        async () => {
          log.push('do B');
          return { label: 'B', undo: async () => void log.push('undo B') };
        },
        async () => {
          log.push('do C');
          throw new Error('C failed');
        },
      ]),
    ).rejects.toThrow('C failed');
    // A and B are reversed (reverse order); the throwing step left nothing to undo.
    expect(log).toEqual(['do A', 'do B', 'do C', 'undo B', 'undo A']);
  });
});
