import { describe, expect, it } from 'vitest';

import { eventLine } from './companionEvents';

describe('eventLine', () => {
  it('returns a line from the matching event pool', () => {
    expect(typeof eventLine('shipped', 0)).toBe('string');
    expect(eventLine('milestone', 0)).toMatch(/three/i);
    expect(eventLine('goal', 0)).toMatch(/goal|number/i);
  });

  it('wraps the seed deterministically', () => {
    expect(eventLine('created', 0)).toBe(eventLine('created', 3));
  });

  it('handles negative seeds', () => {
    expect(typeof eventLine('cleared', -1)).toBe('string');
  });
});
