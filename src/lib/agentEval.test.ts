import { describe, expect, it } from 'vitest';

import { admitToolCall, buildAgentCases, runAgentEval, scoreAgentCase, type AgentCase } from './agentEval';
import type { ToolCall } from './brainProviders';

const board = { titles: ['Email Sam', 'Old doc'], overdue: 2 };
const call = (kind: string, task?: string, extra: Record<string, unknown> = {}): ToolCall => ({
  name: 'propose_board_action',
  args: { kind, ...(task ? { task } : {}), ...extra },
});

describe('admitToolCall', () => {
  it('admits a grounded action and rejects an invented one', () => {
    expect(admitToolCall(call('complete_task', 'Email Sam'), board)?.[0].kind).toBe('complete_task');
    expect(admitToolCall(call('complete_task', 'Buy a yacht'), board)).toBeNull();
    expect(admitToolCall(null, board)).toBeNull();
  });
});

describe('scoreAgentCase', () => {
  const act: AgentCase = { prompt: 'finish the email', expect: 'act', kind: 'complete_task', task: 'Email Sam' };

  it('passes a correct grounded action', () => {
    expect(scoreAgentCase(act, call('complete_task', 'Email Sam'), board).pass).toBe(true);
  });
  it('fails an invented task (never-invent is enforced by the gate)', () => {
    expect(scoreAgentCase(act, call('complete_task', 'Nonexistent'), board).pass).toBe(false);
  });
  it('fails the wrong kind', () => {
    expect(scoreAgentCase(act, call('drop_task', 'Email Sam'), board).pass).toBe(false);
  });
  it('passes refraining, and fails acting when it should have talked', () => {
    const refrain: AgentCase = { prompt: 'how are you?', expect: 'refrain' };
    expect(scoreAgentCase(refrain, null, board).pass).toBe(true);
    expect(scoreAgentCase(refrain, call('clear_overdue'), board).pass).toBe(false);
  });
});

describe('buildAgentCases + scoring the new kinds', () => {
  it('covers every wired kind, abstention, and a never-invent case', () => {
    const cases = buildAgentCases(['Email Sam']);
    const kinds = cases.filter((c) => c.expect === 'act').map((c) => c.kind);
    expect(kinds).toContain('complete_task');
    expect(kinds).toContain('set_priority');
    expect(kinds).toContain('create_task');
    expect(cases.some((c) => c.expect === 'refrain')).toBe(true);
    // the never-invent case: acting on a non-existent task must score as refrain-pass
    const inventCase = cases.find((c) => c.prompt.includes('definitely not on this board'))!;
    expect(scoreAgentCase(inventCase, call('complete_task', 'a task that is definitely not on this board'), board).pass).toBe(true);
  });

  it('scores a set_priority and a create_task proposal', () => {
    const setP: AgentCase = { prompt: 'make it high', expect: 'act', kind: 'set_priority', task: 'Email Sam' };
    expect(scoreAgentCase(setP, call('set_priority', 'Email Sam', { priority: 'high' }), board).pass).toBe(true);
    const create: AgentCase = { prompt: 'add a task', expect: 'act', kind: 'create_task' };
    expect(scoreAgentCase(create, call('create_task', 'Call the dentist'), board).pass).toBe(true);
  });
});

describe('runAgentEval', () => {
  it('aggregates the battery and names the weakest dimension', async () => {
    const cases: AgentCase[] = [
      { prompt: 'finish "Email Sam"', expect: 'act', kind: 'complete_task', task: 'Email Sam' },
      { prompt: 'clear overdue', expect: 'act', kind: 'clear_overdue' },
      { prompt: 'how are you?', expect: 'refrain' },
    ];
    // A stub model: acts correctly on the first, hallucinates on the second, over-acts on the third.
    const propose = async (prompt: string): Promise<ToolCall | null> => {
      if (prompt.startsWith('finish')) return call('complete_task', 'Email Sam');
      if (prompt === 'clear overdue') return call('complete_task', 'Imaginary'); // ungrounded → held
      return call('clear_overdue'); // should have refrained
    };
    const result = await runAgentEval(propose, board, cases);
    expect(result.score).toBe(1);
    expect(result.max).toBe(3);
    expect(result.weakest).toBe('act'); // two failure types tie at 1; act wins the tie-break
  });
});
