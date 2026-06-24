import { describe, expect, it } from 'vitest';

import { PLAN_TOOL, readPlan, gatePlan, explainPlan, type ActionBoard } from './liveAction';

/**
 * Rung 6 — multi-step plans. A plan is just actions reviewed together: it adds no new
 * authority, it runs the EXISTING gateAction on every step. Admitted only if it's a genuine
 * sequence (>=2 steps) AND every step is independently grounded and reversible.
 */
const BOARD: ActionBoard = { titles: ['Investor deck', 'Refactor auth', 'Reply to Dana'], overdue: 2 };

describe('propose_plan tool', () => {
  it('parses an ordered plan of actions', () => {
    const plan = readPlan({
      rationale: 'clear the decks for the demo',
      steps: [
        { kind: 'clear_overdue', reason: 'stale' },
        { kind: 'complete_task', task: 'Reply to Dana' },
      ],
    });
    expect(plan?.steps).toHaveLength(2);
    expect(plan?.steps[1]).toMatchObject({ kind: 'complete_task', task: 'Reply to Dana' });
  });

  it('rejects a plan with no usable steps', () => {
    expect(readPlan({ steps: [] })).toBeNull();
    expect(readPlan({ steps: [{ kind: 'not_a_kind' }] })).toBeNull();
    expect(readPlan({ steps: 'nope' })).toBeNull();
  });

  it('offers an array of action-shaped steps in its schema', () => {
    expect(PLAN_TOOL.function.parameters.properties.steps.type).toBe('array');
    expect(PLAN_TOOL.function.parameters.properties.steps.items.properties.kind.enum).toContain('complete_task');
  });
});

describe('a plan faces the shared action gate, step by step', () => {
  it('admits a sequence when every step is grounded and reversible', () => {
    const plan = readPlan({
      rationale: 'clear the decks for the demo',
      steps: [
        { kind: 'clear_overdue', reason: 'stale pile' },
        { kind: 'complete_task', task: 'reply to dana', reason: 'already sent' },
      ],
    })!;
    const result = gatePlan(plan, BOARD);
    expect(result.admitted).toBe(true);
    expect(result.actions).toHaveLength(2);
    expect(result.actions![1].task).toBe('Reply to Dana'); // normalized to the exact board title
    expect(explainPlan(plan, result)).toMatch(/Accept the whole thing/);
  });

  it('holds the WHOLE plan if any single step is ungrounded', () => {
    const plan = readPlan({
      rationale: 'tidy up',
      steps: [
        { kind: 'complete_task', task: 'Investor deck' }, // real
        { kind: 'drop_task', task: 'Buy milk' }, // not on the board
      ],
    })!;
    const result = gatePlan(plan, BOARD);
    expect(result.admitted).toBe(false);
    expect(result.actions).toBeUndefined();
    expect(result.reasons.join(' ')).toMatch(/step 2 held.*Buy milk/);
    expect(explainPlan(plan, result)).toMatch(/the gate held it/);
  });

  it('holds a degenerate one-step plan (that is a single action, not a plan)', () => {
    const plan = readPlan({ steps: [{ kind: 'complete_task', task: 'Investor deck' }] })!;
    expect(gatePlan(plan, BOARD).admitted).toBe(false);
  });

  it('holds clear_overdue inside a plan when nothing is overdue', () => {
    const plan = readPlan({
      steps: [
        { kind: 'complete_task', task: 'Investor deck' },
        { kind: 'clear_overdue' },
      ],
    })!;
    expect(gatePlan(plan, { titles: ['Investor deck'], overdue: 0 }).admitted).toBe(false);
  });
});
