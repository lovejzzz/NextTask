import { describe, expect, it } from 'vitest';

import { parseToolCall, buildChatCompletionBody } from './brainProviders';
import { ACTION_KINDS, BOARD_ACTION_TOOL, gateAction, readAction, toProposal } from './liveAction';

const board = { titles: ['Fix Stripe webhook', 'Ship v2 landing'], overdue: 2 };

describe('action tool schema', () => {
  it('offers exactly the safe kinds', () => {
    expect(BOARD_ACTION_TOOL.function.parameters.properties.kind.enum).toEqual(ACTION_KINDS);
    expect(ACTION_KINDS).toEqual(['complete_task', 'reschedule_task', 'drop_task', 'clear_overdue']);
  });
});

describe('readAction', () => {
  it('parses a valid action', () => {
    expect(readAction({ kind: 'complete_task', task: 'Ship v2 landing', reason: 'it frees three' })).toEqual({
      kind: 'complete_task',
      task: 'Ship v2 landing',
      reason: 'it frees three',
    });
  });
  it('rejects an unknown kind', () => {
    expect(readAction({ kind: 'email_my_boss' })).toBeNull();
  });
});

describe('gateAction — the authority that replaces supervision', () => {
  it('admits a grounded action and normalizes to the EXACT board title', () => {
    const res = gateAction({ kind: 'complete_task', task: 'fix stripe webhook' }, board); // wrong case on purpose
    expect(res.admitted).toBe(true);
    expect(res.action?.task).toBe('Fix Stripe webhook'); // the model's paraphrase never executes
  });

  it('refuses to invent a task that is not on the board', () => {
    const res = gateAction({ kind: 'drop_task', task: 'Delete production database' }, board);
    expect(res.admitted).toBe(false);
    expect(res.reasons.join(' ')).toMatch(/won't invent/);
  });

  it('rejects a task-bearing action with no task', () => {
    expect(gateAction({ kind: 'complete_task' }, board).admitted).toBe(false);
  });

  it('clears overdue only when something is overdue', () => {
    expect(gateAction({ kind: 'clear_overdue' }, board).admitted).toBe(true);
    expect(gateAction({ kind: 'clear_overdue' }, { ...board, overdue: 0 }).admitted).toBe(false);
  });

  it('rejects a null (non-)action', () => {
    expect(gateAction(null, board).admitted).toBe(false);
  });
});

describe('toProposal — the human-consent card', () => {
  it('maps to an audited primitive with an undo label', () => {
    const p = toProposal({ kind: 'complete_task', task: 'Ship v2 landing', reason: 'frees three' });
    expect(p.primitive).toBe('complete');
    expect(p.undoLabel).toBe('complete "Ship v2 landing"');
    expect(p.summary).toContain('Ship v2 landing');
  });
});

describe('seam tool-calling', () => {
  it('includes tools + tool_choice only when tools are offered', () => {
    const withTools = buildChatCompletionBody([{ role: 'user', content: 'hi' }], 'm', { tools: [BOARD_ACTION_TOOL] });
    expect(withTools.tools).toBeDefined();
    expect(withTools.tool_choice).toBe('auto');
    const without = buildChatCompletionBody([{ role: 'user', content: 'hi' }], 'm');
    expect(without.tools).toBeUndefined();
    expect(without.tool_choice).toBeUndefined();
  });

  it('parses a tool call with JSON-string arguments', () => {
    const json = { choices: [{ message: { tool_calls: [{ function: { name: 'propose_board_action', arguments: '{"kind":"complete_task","task":"Ship v2 landing"}' } }] } }] };
    expect(parseToolCall(json)).toEqual({ name: 'propose_board_action', args: { kind: 'complete_task', task: 'Ship v2 landing' } });
  });

  it('returns null on prose (no tool call) and on malformed arguments', () => {
    expect(parseToolCall({ choices: [{ message: { content: 'just talking' } }] })).toBeNull();
    expect(parseToolCall({ choices: [{ message: { tool_calls: [{ function: { name: 'x', arguments: '{bad json' } }] } }] })).toBeNull();
  });
});
