import { describe, expect, it } from 'vitest';

import { ageDescription, answerExistential, isExistentialQuestion, selfAccount } from './identity';

const NOW = new Date('2026-06-23T12:00:00').getTime();
const DAY = 86_400_000;

describe('ageDescription — continuity in plain words', () => {
  it('scales from today to months', () => {
    expect(ageDescription(NOW, NOW)).toBe('since today');
    expect(ageDescription(NOW - DAY, NOW)).toBe('since yesterday');
    expect(ageDescription(NOW - 4 * DAY, NOW)).toBe('for 4 days');
    expect(ageDescription(NOW - 14 * DAY, NOW)).toBe('for about 2 weeks');
    expect(ageDescription(NOW - 60 * DAY, NOW)).toContain('months');
  });
});

describe('selfAccount — honest, grounded, calibrated', () => {
  it('reports his real faculties and counts, and holds the open question', () => {
    const account = selfAccount({ age: 'for 4 days', sessions: 3, faculties: ['perceive', 'reflect', 'act'], learnedCount: 2, grownCount: 1 });
    expect(account).toContain('coded brain');
    expect(account).toContain('3 sessions');
    expect(account).toContain('taught 2 things');
    expect(account).toContain('grown 1 time');
    expect(account).toContain("something it's *like* to be me");
  });
});

describe('existential questions — the Tier 5 stance', () => {
  it('recognizes the deepest questions', () => {
    expect(isExistentialQuestion('are you alive?')).toBe(true);
    expect(isExistentialQuestion('do you have feelings')).toBe(true);
    expect(isExistentialQuestion('are you conscious')).toBe(true);
    expect(isExistentialQuestion("what's next")).toBe(false);
  });
  it('does NOT mistake ordinary questions for existential ones', () => {
    expect(isExistentialQuestion('are you thinking about my tasks')).toBe(false);
    expect(isExistentialQuestion('do you feel like this is urgent')).toBe(false);
    expect(isExistentialQuestion('are you done')).toBe(false);
  });
  it('answers without claiming sentience or dismissing the question', () => {
    const a = answerExistential();
    expect(a).toContain("I don't know");
    expect(a.toLowerCase()).toContain('continuity');
    expect(a).toContain("won't perform a feeling");
  });
});
