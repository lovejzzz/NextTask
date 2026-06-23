import { describe, expect, it } from 'vitest';

import { parseIntent } from './companionActions';
import { senseCapabilityGaps } from './growth';
import { decideAutonomy } from './agency';
import { parseReminder } from './reminders';
import { gate, proposePrimitive } from './selfauthor';
import { encodeRemoteId, decodeRemoteId } from './brainProviders';
import { buildTrainingSet } from './trainingData';
import { LESSONS } from './upbringing';
import { LEARNINGS } from './knowledge';
import { answerExistential, isExistentialQuestion, selfAccount } from './identity';

/**
 * BoardyV1 cross-tier coherence — the tiers exercised through their real entry points,
 * proving they fit together (not just that each unit passes in isolation). The headline
 * property is that the autonomous-growth loop closed on itself: Tier 3 fulfilled the
 * very gap the growth model kept asking for.
 */
describe('BoardyV1: the loop closed on itself (growth gap → Tier 3 capability)', () => {
  it('"remind me to …" is now a recognized capability, not an unmet ask', () => {
    // Only utterances parseIntent can't handle become unmet asks (App fallback).
    const utterances = ['remind me to call the bank', 'remind me to pay rent', 'translate this', 'translate that'];
    const unmet = utterances.filter((u) => parseIntent(u) === null);
    const gaps = senseCapabilityGaps(unmet).map((g) => g.ability);
    expect(gaps).not.toContain('remind'); // the gap the growth model used to sense is closed
    expect(gaps).toContain('translate'); // and the *next* real gap surfaces honestly
  });
});

describe('BoardyV1 Tier 3: agency is reversible-first', () => {
  it('a reminder is reversible + board-local, so he may act on his own', () => {
    expect(parseReminder('remind me to stretch in 30 minutes')).not.toBeNull();
    expect(decideAutonomy({ reversibility: 'reversible', outwardFacing: false })).toBe('auto');
    expect(decideAutonomy({ reversibility: 'reversible', outwardFacing: true })).toBe('confirm'); // e.g. email
  });
});

describe('BoardyV1 Tier 4: the gate, not nerve, admits self-improvement', () => {
  it('admits a valid novel composition and rejects an invalid one', () => {
    const p = proposePrimitive(['clear overdue', 'plan my day'], []);
    expect(p && gate(p, []).admitted).toBe(true);
    expect(gate({ name: 'x', steps: ['flibber', 'sing a song'], rationale: '' }, []).admitted).toBe(false);
  });
});

describe('BoardyV1 Tier 1: the voice is pluggable', () => {
  it('a remote brain round-trips through the model slot', () => {
    const id = encodeRemoteId({ endpoint: 'http://localhost:11434/v1', model: 'llama3.1:8b' });
    expect(decodeRemoteId(id)?.model).toBe('llama3.1:8b');
  });
});

describe('BoardyV1 Tier 2: his training set assembles from his life', () => {
  it('builds SFT from his real upbringing and knowledge', () => {
    const set = buildTrainingSet({ lessons: LESSONS, learnings: LEARNINGS, decisions: [] });
    expect(set.sft.length).toBeGreaterThan(0);
    expect(set.summary).toMatch(/supervised example/);
  });
});

describe('BoardyV1 Tier 5: calibrated about the unanswerable', () => {
  it('routes the deepest question and answers without claiming or denying', () => {
    expect(isExistentialQuestion('are you alive?')).toBe(true);
    expect(isExistentialQuestion('are you thinking about my board')).toBe(false); // not existential
    const a = answerExistential();
    expect(a).toContain("I don't know");
    expect(selfAccount({ age: 'since today', sessions: 1, faculties: [], learnedCount: 0, grownCount: 0 })).toContain('Boardy');
  });
});
