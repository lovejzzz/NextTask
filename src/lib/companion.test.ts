import { describe, expect, it } from 'vitest';

import { IDLE_THRESHOLD_MS, quipFor, readMood, type CompanionSignals } from './companion';

const base: CompanionSignals = {
  active: 4,
  overdue: 0,
  inProgress: 1,
  shippedToday: 0,
  fidgets: 0,
  idleMs: 0,
};

describe('readMood', () => {
  it('is bored with an empty board', () => {
    expect(readMood({ ...base, active: 0 })).toBe('bored');
  });

  it('feels neglected when idle with work waiting', () => {
    expect(readMood({ ...base, idleMs: IDLE_THRESHOLD_MS + 1 })).toBe('neglected');
  });

  it('does not feel neglected when the board is empty', () => {
    expect(readMood({ ...base, active: 0, idleMs: IDLE_THRESHOLD_MS + 1 })).toBe('bored');
  });

  it('is proud after a strong shipping day', () => {
    expect(readMood({ ...base, shippedToday: 3 })).toBe('proud');
  });

  it('escalates from anxious to exasperated as overdue piles up', () => {
    expect(readMood({ ...base, overdue: 1 })).toBe('anxious');
    expect(readMood({ ...base, overdue: 3 })).toBe('exasperated');
  });

  it('is overwhelmed by too much in progress', () => {
    expect(readMood({ ...base, inProgress: 4 })).toBe('overwhelmed');
  });

  it('calls out fidgeting when nothing is shipping', () => {
    expect(readMood({ ...base, fidgets: 3 })).toBe('restless');
  });

  it('thrives after a single ship, and is content otherwise', () => {
    expect(readMood({ ...base, shippedToday: 1 })).toBe('thriving');
    expect(readMood(base)).toBe('content');
  });

  it('lets overdue panic override fidget snark', () => {
    expect(readMood({ ...base, overdue: 3, fidgets: 5 })).toBe('exasperated');
  });
});

describe('quipFor', () => {
  it('returns a line from the mood pool and wraps the seed', () => {
    expect(typeof quipFor('proud', 0)).toBe('string');
    expect(quipFor('proud', 0)).toBe(quipFor('proud', 3));
  });

  it('handles negative seeds safely', () => {
    expect(typeof quipFor('anxious', -1)).toBe('string');
  });
});
