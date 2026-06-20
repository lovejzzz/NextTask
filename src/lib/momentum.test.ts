import { describe, expect, it } from 'vitest';

import { dayKey, lastNDayKeys, parseShipped, storageKey } from './momentum';

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

describe('lastNDayKeys', () => {
  it('returns N keys oldest-first ending with today', () => {
    const keys = lastNDayKeys(7, new Date(2026, 5, 20));
    expect(keys).toHaveLength(7);
    expect(keys[6]).toBe('next-task:shipped:2026-06-20');
    expect(keys[0]).toBe('next-task:shipped:2026-06-14');
  });

  it('crosses month boundaries correctly', () => {
    const keys = lastNDayKeys(3, new Date(2026, 6, 1));
    expect(keys).toEqual([
      'next-task:shipped:2026-06-29',
      'next-task:shipped:2026-06-30',
      'next-task:shipped:2026-07-01',
    ]);
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
