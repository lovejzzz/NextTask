import { describe, expect, it } from 'vitest';

import { describeStop, nextStopReason, type RoundResult } from './loop';
import { adoptPursuit, reviewPursuit, type Pursuit } from './pursuit';
import type { Intention, WorldState } from './drives';
import type { OutcomeReview } from './reviewOutcome';

const world = (over: Partial<WorldState> = {}): WorldState => ({
  overdue: 0,
  stale: 0,
  active: 0,
  shippedRecently: 0,
  idleDays: 0,
  repeatedPattern: null,
  capabilityGap: null,
  ownBacklog: 0,
  ...over,
});

const orderIntent: Intention = { drive: 'order', kind: 'propose', intensity: 0.9, summary: 'clear overdue', rationale: 'x' };

const review = (verdict: OutcomeReview['verdict']): OutcomeReview => ({ verdict, score: verdict === 'pass' ? 1 : 0, max: 1, steps: [], summary: 'x' });
const round = (verdict: OutcomeReview['verdict'] | null, pursuitAfter: RoundResult['pursuitAfter'] = null): RoundResult => ({
  review: verdict ? review(verdict) : null,
  pursuitAfter,
});

describe('nextStopReason', () => {
  it('continues with no history', () => {
    expect(nextStopReason([], null)).toBeNull();
  });

  it('stops at max_rounds unconditionally, even on a winning streak', () => {
    const history = Array.from({ length: 5 }, () => round('pass'));
    expect(nextStopReason(history, null, 5)).toBe('max_rounds');
  });

  it('stops on goal_met only when the pursuit truly reached its floor', () => {
    const pursuit: Pursuit = adoptPursuit(orderIntent, world({ overdue: 5 }), 0);
    const met = reviewPursuit(pursuit, world({ overdue: 0 }), 0);
    const notMet = reviewPursuit(pursuit, world({ overdue: 2 }), 0);
    expect(nextStopReason([round('pass', met)], pursuit)).toBe('goal_met');
    expect(nextStopReason([round('pass', notMet)], pursuit)).toBeNull();
  });

  it('never reports goal_met with no active pursuit', () => {
    expect(nextStopReason([round('pass', null)], null)).toBeNull();
  });

  it('stops after DRY_WINDOW consecutive rounds with no clean pass (loop-until-dry)', () => {
    expect(nextStopReason([round('fail'), round('partial'), round(null)], null)).toBe('no_improvement');
    // fewer than the window — keep going
    expect(nextStopReason([round('fail'), round('fail')], null)).toBeNull();
    // a clean pass anywhere in the window breaks the streak
    expect(nextStopReason([round('fail'), round('pass'), round('fail')], null)).toBeNull();
  });

  it('only looks at the most recent DRY_WINDOW rounds for dryness', () => {
    // an old pass followed by 3 fresh misses should still stop
    expect(nextStopReason([round('pass'), round('fail'), round('fail'), round('fail')], null)).toBe('no_improvement');
  });
});

describe('describeStop', () => {
  it('gives a distinct, honest line per reason, and nothing for null', () => {
    expect(describeStop('goal_met')).toMatch(/goal's met/);
    expect(describeStop('no_improvement')).toMatch(/hold off/);
    expect(describeStop('max_rounds')).toMatch(/five rounds/);
    expect(describeStop(null)).toBe('');
  });
});
