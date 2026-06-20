import { describe, expect, it } from 'vitest';

import { formatClock } from './clock';

describe('formatClock', () => {
  it('formats minutes and seconds with zero padding', () => {
    expect(formatClock(1500)).toBe('25:00');
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(9)).toBe('00:09');
  });

  it('clamps negatives and floors fractions', () => {
    expect(formatClock(-10)).toBe('00:00');
    expect(formatClock(59.9)).toBe('00:59');
  });
});
