import { describe, expect, it } from 'vitest';

import { dayKey, parseShipped, storageKey } from './momentum';

describe('dayKey', () => {
  it('formats a local date as YYYY-MM-DD with zero padding', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('storageKey', () => {
  it('namespaces the day key', () => {
    expect(storageKey(new Date(2026, 5, 20))).toBe('next-task:shipped:2026-06-20');
  });
});

describe('parseShipped', () => {
  it('reads positive integers', () => {
    expect(parseShipped('3')).toBe(3);
  });

  it('floors fractional values', () => {
    expect(parseShipped('2.9')).toBe(2);
  });

  it('treats missing or junk values as zero', () => {
    expect(parseShipped(null)).toBe(0);
    expect(parseShipped('')).toBe(0);
    expect(parseShipped('-4')).toBe(0);
    expect(parseShipped('nope')).toBe(0);
  });
});
