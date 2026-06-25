import { describe, expect, it } from 'vitest';

import { buildVerifyMessages, chooseToolBrain, looksActionable, parseVerdict, shouldVerifyProposal } from './agentPolicy';

describe('looksActionable', () => {
  it('fires on phrasings that want a board action', () => {
    expect(looksActionable('I just finished the onboarding doc')).toBe(true);
    expect(looksActionable('drop the stale ticket')).toBe(true);
    expect(looksActionable('can you reschedule the launch')).toBe(true);
    expect(looksActionable('clear the overdue pile')).toBe(true);
  });
  it('also fires on skill-creation requests', () => {
    expect(looksActionable('make a skill that clears overdue then plans my day')).toBe(true);
    expect(looksActionable('can you automate my monday reset')).toBe(true);
    expect(looksActionable('teach yourself to triage and plan')).toBe(true);
  });
  it('stays quiet on chit-chat and pure questions', () => {
    expect(looksActionable('how are you?')).toBe(false);
    expect(looksActionable("I'm feeling overwhelmed")).toBe(false);
    expect(looksActionable('what should I focus on?')).toBe(false);
  });
});

describe('chooseToolBrain', () => {
  it('never attempts when no brain is ready', () => {
    expect(chooseToolBrain({ brainReady: false, isRemote: true, actionable: true }).attempt).toBe(false);
  });
  it('always offers tools to a capable remote brain', () => {
    expect(chooseToolBrain({ brainReady: true, isRemote: true, actionable: false }).attempt).toBe(true);
  });
  it('asks a local model only when the message looks actionable', () => {
    expect(chooseToolBrain({ brainReady: true, isRemote: false, actionable: true }).attempt).toBe(true);
    expect(chooseToolBrain({ brainReady: true, isRemote: false, actionable: false }).attempt).toBe(false);
  });
});

describe('adversarial proposal check', () => {
  it('verifies only a local model, not a capable remote one', () => {
    expect(shouldVerifyProposal(false)).toBe(true); // local
    expect(shouldVerifyProposal(true)).toBe(false); // remote
  });

  it('builds a yes/no refute prompt carrying the ask and the proposal', () => {
    const msgs = buildVerifyMessages('drop the stale ticket', 'Drop "Stale ticket" off the board?');
    expect(msgs[0].content).toMatch(/only.*yes.*no/i);
    expect(msgs[1].content).toContain('drop the stale ticket');
    expect(msgs[1].content).toContain('Stale ticket');
  });

  it('reads a verdict, defaulting AMBIGUOUS to survive (consent is the real gate)', () => {
    expect(parseVerdict('yes')).toBe(true);
    expect(parseVerdict('Yes, that matches.')).toBe(true);
    expect(parseVerdict('no')).toBe(false);
    expect(parseVerdict('No — they meant something else.')).toBe(false);
    expect(parseVerdict('hmm, hard to say')).toBe(true); // ambiguous → keep
    expect(parseVerdict('')).toBe(true);
  });
});
