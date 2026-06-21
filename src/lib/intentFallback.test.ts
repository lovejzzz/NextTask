import { describe, expect, it, vi } from 'vitest';

import { buildClassifierMessages, classifyIntent, parseClassifierReply, SAFE_INTENT_KINDS } from './intentFallback';

describe('buildClassifierMessages', () => {
  it('constrains the model to one id or none, and lists every safe intent', () => {
    const [system, user] = buildClassifierMessages('how am I tracking?');
    expect(system.content).toMatch(/ONLY the id/);
    for (const kind of SAFE_INTENT_KINDS) expect(system.content).toContain(kind);
    expect(user.content).toBe('how am I tracking?');
  });
});

describe('parseClassifierReply', () => {
  it('pulls a valid id out of a noisy reply', () => {
    expect(parseClassifierReply('whats_next')).toBe('whats_next');
    expect(parseClassifierReply('Intent: "risk".')).toBe('risk');
  });

  it('returns null for none / garbage / unsafe guesses', () => {
    expect(parseClassifierReply('none')).toBeNull();
    expect(parseClassifierReply('delete_task')).toBeNull(); // not a safe kind
    expect(parseClassifierReply('¯\\_(ツ)_/¯')).toBeNull();
  });
});

describe('classifyIntent', () => {
  it('resolves a safe query intent from the model', async () => {
    const generate = vi.fn().mockResolvedValue('status');
    expect(await classifyIntent(generate, 'where do I stand')).toBe('status');
  });

  it('never throws — model errors resolve to null', async () => {
    const generate = vi.fn().mockRejectedValue(new Error('webgpu sad'));
    expect(await classifyIntent(generate, 'anything')).toBeNull();
  });
});
