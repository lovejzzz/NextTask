import { describe, expect, it } from 'vitest';

import { emptyMemory } from './companionMemory';
import { nextRoast, personaInstruction, warmthFromMemory } from './persona';

const DAY = 86_400_000;

describe('nextRoast', () => {
  it('cycles gentle → balanced → savage → gentle', () => {
    expect(nextRoast('gentle')).toBe('balanced');
    expect(nextRoast('balanced')).toBe('savage');
    expect(nextRoast('savage')).toBe('gentle');
  });
});

describe('warmthFromMemory', () => {
  it('starts cold for a new board', () => {
    const now = Date.now();
    expect(warmthFromMemory(emptyMemory(now), now)).toBe(0);
  });

  it('warms up roughly one level per five ships', () => {
    const now = Date.now();
    expect(warmthFromMemory({ ...emptyMemory(now), totalShipped: 12 }, now)).toBe(2);
    expect(warmthFromMemory({ ...emptyMemory(now), totalShipped: 50 }, now)).toBe(5);
  });

  it('cools by a level after a few days away', () => {
    const now = Date.now();
    const mem = { ...emptyMemory(now), totalShipped: 15, lastSeen: now - 4 * DAY };
    expect(warmthFromMemory(mem, now)).toBe(2); // 3 − 1
  });
});

describe('personaInstruction', () => {
  it('encodes the chosen tone and the bond', () => {
    expect(personaInstruction('savage', 5)).toMatch(/sarcastic/i);
    expect(personaInstruction('savage', 5)).toMatch(/fond/i);
    expect(personaInstruction('gentle', 0)).toMatch(/gentle/i);
    expect(personaInstruction('gentle', 0)).toMatch(/distance/i);
  });
});
