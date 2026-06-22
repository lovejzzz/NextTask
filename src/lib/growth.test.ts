import { describe, expect, it } from 'vitest';

import {
  gapKey,
  growthRequestIntention,
  growthSummary,
  recordGrowth,
  respond,
  senseCapabilityGaps,
  senseGaps,
  strongestGap,
  type GrowthEntry,
  type GrowthSignal,
} from './growth';

describe('gapKey — the capability an ask reaches for', () => {
  it('strips lead filler to the verb, so wording does not fork the gap', () => {
    expect(gapKey('hey can you please remind me to call mom')).toBe('remind');
    expect(gapKey('remind me to email bob')).toBe('remind');
    expect(gapKey("I'd like to remind myself about rent")).toBe('remind');
  });

  it('is empty for asks with no content word', () => {
    expect(gapKey('please can you')).toBe('');
    expect(gapKey('   ')).toBe('');
  });
});

describe('senseCapabilityGaps — one miss is noise, a recurring miss is a gap', () => {
  it('surfaces only abilities asked at least minCount times', () => {
    const gaps = senseCapabilityGaps(['remind me to call mom', 'translate this to french', 'remind me to pay rent'], 2);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ kind: 'capability_gap', ability: 'remind', count: 2 });
  });

  it('carries the most recent phrasing as the concrete example', () => {
    const [gap] = senseCapabilityGaps(['remind me to call mom', 'remind me to pay rent'], 2);
    expect((gap as { example: string }).example).toBe('remind me to pay rent');
  });

  it('orders the most-asked gap first', () => {
    const gaps = senseCapabilityGaps(
      ['remind me x', 'remind me y', 'remind me z', 'export the board', 'export to csv'],
      2,
    );
    expect(gaps.map((g) => (g as { ability: string }).ability)).toEqual(['remind', 'export']);
  });

  it('returns nothing when no ask recurs', () => {
    expect(senseCapabilityGaps(['remind me once', 'translate this'], 2)).toEqual([]);
  });
});

describe('senseGaps — capability gaps lead, then repetition, then drift', () => {
  it('orders the signals by leverage', () => {
    const signals = senseGaps(
      { unmet: ['remind me a', 'remind me b'], repeated: ['clear overdue', 'plan my day'], slippedGoal: 'steady the board' },
      2,
    );
    expect(signals.map((s) => s.kind)).toEqual(['capability_gap', 'repetition', 'drift']);
  });

  it('is empty when he is keeping up', () => {
    expect(senseGaps({ unmet: ['one off ask'], repeated: null, slippedGoal: null })).toEqual([]);
  });
});

describe('respond — self where he can, ask where he cannot (the autonomy boundary)', () => {
  it('makes a repeated routine into a tool himself', () => {
    const move = respond({ kind: 'repetition', steps: ['clear overdue', 'plan my day'] });
    expect(move).toMatchObject({ by: 'self', act: 'compose_tool', steps: ['clear overdue', 'plan my day'] });
  });

  it('refocuses on his own drift himself', () => {
    expect(respond({ kind: 'drift', goal: 'steady the board' })).toMatchObject({ by: 'self', act: 'refocus' });
  });

  it('asks for a primitive it cannot build — never fakes the ability', () => {
    const move = respond({ kind: 'capability_gap', ability: 'remind', example: 'remind me to call mom', count: 3 });
    expect(move).toMatchObject({ by: 'ask', act: 'request_primitive', ability: 'remind' });
  });
});

describe('growthRequestIntention — rides the existing resource-request channel', () => {
  it('becomes a growth-drive request_resource intention, intensifying with demand', () => {
    const intention = growthRequestIntention({ kind: 'capability_gap', ability: 'remind', example: 'remind me to call mom', count: 4 });
    expect(intention.drive).toBe('growth');
    expect(intention.kind).toBe('request_resource');
    expect(intention.intensity).toBeCloseTo(0.9);
    expect(intention.summary).toContain('remind');
  });
});

describe('strongestGap', () => {
  it('returns the single highest-leverage gap, or null when keeping up', () => {
    expect(strongestGap({ unmet: ['remind a', 'remind b'] }, 2)).toMatchObject({ kind: 'capability_gap' });
    expect(strongestGap({ unmet: [] })).toBeNull();
  });
});

describe('growth ledger — his developmental autobiography', () => {
  const gap: GrowthSignal = { kind: 'capability_gap', ability: 'remind', example: 'remind me', count: 2 };

  it('appends, and de-duplicates an identical signal+move so it logs once', () => {
    let ledger: GrowthEntry[] = [];
    ledger = recordGrowth(ledger, gap, respond(gap), 1000);
    ledger = recordGrowth(ledger, gap, respond(gap), 2000);
    expect(ledger).toHaveLength(1);
  });

  it('summarizes honestly by kind, and says nothing when he has not grown', () => {
    expect(growthSummary([])).toBe('');
    let ledger: GrowthEntry[] = [];
    ledger = recordGrowth(ledger, gap, respond(gap));
    ledger = recordGrowth(ledger, { kind: 'repetition', steps: ['a', 'b'] }, respond({ kind: 'repetition', steps: ['a', 'b'] }));
    const summary = growthSummary(ledger);
    expect(summary).toContain('grown 2 times');
    expect(summary).toContain('asked for 1 new ability');
    expect(summary).toContain('crystallized 1 routine');
  });
});
