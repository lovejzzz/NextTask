import { describe, expect, it } from 'vitest';

import { makeTask } from '../test/factories';
import { acceptExplanation, extractQuoted, groundingCheck, repliesDiverge, runBrainEval, scoreReply } from './brainEval';

const tasks = [makeTask({ title: 'Fix the login bug' }), makeTask({ title: 'Email Sam about launch' })];

describe('extractQuoted', () => {
  it('pulls quoted phrases out, including curly quotes', () => {
    expect(extractQuoted('Do "fix the login bug" first, then “email Sam”.')).toEqual(['fix the login bug', 'email Sam']);
  });
});

describe('groundingCheck', () => {
  it('passes when quoted phrases match real tasks', () => {
    expect(groundingCheck('Start with "fix the login bug".', tasks).grounded).toBe(true);
  });

  it('flags invented multi-word task references', () => {
    const result = groundingCheck('Go finish "deploy to kubernetes" now.', tasks);
    expect(result.grounded).toBe(false);
    expect(result.invented).toContain('deploy to kubernetes');
  });
});

describe('scoreReply', () => {
  it('gives full marks to a grounded, concise, in-character reply', () => {
    expect(scoreReply('Knock out "fix the login bug" — it’s the most pressing.', tasks).score).toBe(3);
  });

  it('docks an "as an AI" cop-out and an overlong reply', () => {
    expect(scoreReply('As an AI language model, I cannot help with that.', tasks).checks.inCharacter).toBe(false);
    expect(scoreReply('x'.repeat(300), tasks).checks.concise).toBe(false);
  });
});

describe('repliesDiverge', () => {
  it('is true when two replies are meaningfully different', () => {
    expect(repliesDiverge('Finish the login bug, you can do it.', 'Three overdue and you are sightseeing? Bold.')).toBe(true);
  });
  it('is false for identical or near-identical replies', () => {
    expect(repliesDiverge('Focus on the login bug.', 'Focus on the login bug.')).toBe(false);
    expect(repliesDiverge('', 'anything')).toBe(false);
  });
});

describe('acceptExplanation', () => {
  const task = makeTask({ title: 'Fix the login bug' });
  it('accepts a grounded, concise, in-character explanation', () => {
    expect(acceptExplanation('It\'s overdue and blocking the release — do "Fix the login bug" first.', task)).toBe(true);
  });
  it('rejects hallucinated, off-character, or rambling explanations', () => {
    expect(acceptExplanation('As an AI I think you should "deploy the mars rocket".', task)).toBe(false);
    expect(acceptExplanation('x'.repeat(300), task)).toBe(false);
  });
});

describe('runBrainEval', () => {
  it('aggregates a high score for a grounded mock model', async () => {
    const generate = async () => 'Focus on "fix the login bug" first.';
    const result = await runBrainEval(generate, tasks);
    expect(result.score).toBe(result.max); // perfect on objective criteria
    expect(result.details).toHaveLength(4);
  });

  it('scores a hallucinating, off-character model low and names the weakest criterion', async () => {
    const generate = async () => 'As an AI, you should do "ship the imaginary rocket to mars" immediately and also reflect deeply on the nature of productivity for a very long time without stopping.';
    const result = await runBrainEval(generate, tasks);
    expect(result.score).toBeLessThan(result.max / 2);
    expect(result.weakest).not.toBeNull();
  });

  it('reports no weakest criterion when every reply is clean', async () => {
    const generate = async () => 'Focus on "fix the login bug" first.';
    const result = await runBrainEval(generate, tasks);
    expect(result.weakest).toBeNull();
  });
});
