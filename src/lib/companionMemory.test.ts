import { describe, expect, it } from 'vitest';

import { daysBetween, emptyMemory, recordShip, recordVisit, summarizeMemory } from './companionMemory';

const DAY = 86_400_000;

describe('daysBetween', () => {
  it('counts whole calendar days', () => {
    const a = new Date(2026, 5, 18, 23).getTime();
    const b = new Date(2026, 5, 20, 1).getTime();
    expect(daysBetween(a, b)).toBe(2);
  });
});

describe('recordVisit', () => {
  it('bumps the session count and recency', () => {
    const mem = emptyMemory(1000);
    const next = recordVisit(mem, 5000);
    expect(next.sessions).toBe(2);
    expect(next.lastSeen).toBe(5000);
  });
});

describe('recordShip', () => {
  it('starts a streak on the first ship', () => {
    const mem = recordShip(emptyMemory(), new Date(2026, 5, 20));
    expect(mem.totalShipped).toBe(1);
    expect(mem.currentStreak).toBe(1);
    expect(mem.bestStreak).toBe(1);
  });

  it('keeps the streak flat for a second ship the same day', () => {
    let mem = recordShip(emptyMemory(), new Date(2026, 5, 20));
    mem = recordShip(mem, new Date(2026, 5, 20));
    expect(mem.totalShipped).toBe(2);
    expect(mem.currentStreak).toBe(1);
  });

  it('extends the streak on consecutive days and resets after a gap', () => {
    let mem = recordShip(emptyMemory(), new Date(2026, 5, 20));
    mem = recordShip(mem, new Date(2026, 5, 21));
    expect(mem.currentStreak).toBe(2);
    expect(mem.bestStreak).toBe(2);
    mem = recordShip(mem, new Date(2026, 5, 25)); // 4-day gap
    expect(mem.currentStreak).toBe(1);
    expect(mem.bestStreak).toBe(2);
  });
});

describe('summarizeMemory', () => {
  it('greets a brand-new relationship', () => {
    const now = Date.now();
    expect(summarizeMemory(emptyMemory(now), now)).toContain('just met today');
  });

  it('mentions totals and time away for a returning user', () => {
    const now = Date.now();
    const mem = { ...emptyMemory(now - 7 * DAY), lastSeen: now - 2 * DAY, totalShipped: 23, bestStreak: 4, sessions: 6 };
    const summary = summarizeMemory(mem, now);
    expect(summary).toContain('23 task');
    expect(summary).toContain('best streak 4');
    expect(summary).toContain('away 2 day');
  });
});
