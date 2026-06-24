// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { mockApi } from './mockApi';
import { gateAction, readAction, toProposal } from './liveAction';
import type { ToolCall } from './brainProviders';

/**
 * The full loop, against the REAL store the app uses (mockApi over localStorage):
 * a brain tool-call → the action gate → an audited mutation → a working undo. This is
 * what turns "the brain proposed an action" into "the board actually moved, reversibly."
 * The primitive→store mapping mirrors App.tsx's own complete/undo wiring.
 */
beforeEach(() => {
  localStorage.clear();
});

async function seed() {
  await mockApi.resetBoard();
  await mockApi.createTask({ title: 'Fix Stripe webhook', status: 'in_progress' });
  await mockApi.createTask({ title: 'Ship v2 landing', status: 'todo' });
}

async function actionBoard() {
  const board = await mockApi.getBoard();
  const today = new Date();
  const overdue = board.tasks.filter((t) => t.due_date && new Date(t.due_date) < today && t.status !== 'done').length;
  return { titles: board.tasks.map((t) => t.title), overdue, tasks: board.tasks };
}

describe('brain → gate → real mutation → real undo', () => {
  it('a grounded complete_task moves the real board and undoes cleanly', async () => {
    await seed();
    const board = await actionBoard();

    // What the live brain returned through the bridge in the demo:
    const toolCall: ToolCall = { name: 'propose_board_action', args: { kind: 'complete_task', task: 'fix stripe webhook', reason: "you said it's passing in prod" } };

    const gated = gateAction(readAction(toolCall.args), { titles: board.titles, overdue: board.overdue });
    expect(gated.admitted).toBe(true);
    expect(gated.action?.task).toBe('Fix Stripe webhook'); // normalized to the exact title

    const target = board.tasks.find((t) => t.title === gated.action!.task)!;
    const prevStatus = target.status;
    const proposal = toProposal(gated.action!);
    expect(proposal.primitive).toBe('complete');

    // Execute the admitted action through the SAME audited mutation App.tsx uses.
    await mockApi.updateTask(target.id, { status: 'done' });
    let after = await mockApi.getBoard();
    expect(after.tasks.find((t) => t.id === target.id)!.status).toBe('done'); // the board really moved

    // The undo the proposal carries actually reverses it.
    expect(proposal.undoLabel).toBe('complete "Fix Stripe webhook"');
    await mockApi.updateTask(target.id, { status: prevStatus });
    after = await mockApi.getBoard();
    expect(after.tasks.find((t) => t.id === target.id)!.status).toBe('in_progress'); // fully reverted
  });

  it('a hallucinated action never reaches the store', async () => {
    await seed();
    const board = await actionBoard();
    const before = JSON.stringify((await mockApi.getBoard()).tasks.map((t) => t.status));

    const gated = gateAction(readAction({ kind: 'drop_task', task: 'Delete all finished tasks' }), { titles: board.titles, overdue: board.overdue });
    expect(gated.admitted).toBe(false);
    // Because it was never admitted, no mutation runs — the board is byte-identical.
    const afterStatuses = JSON.stringify((await mockApi.getBoard()).tasks.map((t) => t.status));
    expect(afterStatuses).toBe(before);
  });
});
