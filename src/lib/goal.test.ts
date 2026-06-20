import { describe, expect, it } from 'vitest';

import { GOAL_OPTIONS, goalProgress, nextGoal } from './goal';

describe('nextGoal', () => {
  it('cycles through the options and wraps', () => {
    expect(nextGoal(GOAL_OPTIONS[0])).toBe(GOAL_OPTIONS[1]);
    expect(nextGoal(GOAL_OPTIONS[GOAL_OPTIONS.length - 1])).toBe(GOAL_OPTIONS[0]);
  });

  it('falls back to the first option for an unknown value', () => {
    expect(nextGoal(999)).toBe(GOAL_OPTIONS[0]);
  });
});

describe('goalProgress', () => {
  it('is a clamped ratio of shipped to goal', () => {
    expect(goalProgress(0, 3)).toBe(0);
    expect(goalProgress(3, 3)).toBe(1);
    expect(goalProgress(9, 3)).toBe(1);
    expect(goalProgress(1, 4)).toBe(0.25);
  });

  it('handles a zero goal safely', () => {
    expect(goalProgress(2, 0)).toBe(0);
  });
});
