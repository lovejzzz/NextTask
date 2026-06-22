import { describe, expect, it } from 'vitest';

import type { Intention, WorldState } from './drives';
import { adoptPursuit, reviewPursuit } from './pursuit';

const DAY = 86_400_000;
const NOW = 1_000 * DAY;

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

describe('adoptPursuit', () => {
  it('records a baseline from the world at commitment time', () => {
    const pursuit = adoptPursuit(orderIntent, world({ overdue: 5, stale: 2 }), NOW);
    expect(pursuit.metric).toBe('order');
    expect(pursuit.baseline).toBe(7); // overdue + stale
    expect(pursuit.adoptedAt).toBe(NOW);
  });
});

describe('reviewPursuit', () => {
  it('recognizes real progress against the baseline', () => {
    const pursuit = adoptPursuit(orderIntent, world({ overdue: 5, stale: 2 }), NOW);
    const review = reviewPursuit(pursuit, world({ overdue: 1, stale: 1 }), NOW + 4 * DAY);
    expect(review.direction).toBe('progress');
    expect(review.reflection).toMatch(/7 → 2/);
    expect(review.reflection).toMatch(/4 days ago/);
  });

  it('admits when it has slipped the wrong way', () => {
    const pursuit = adoptPursuit(orderIntent, world({ overdue: 2 }), NOW);
    const review = reviewPursuit(pursuit, world({ overdue: 6 }), NOW + DAY);
    expect(review.direction).toBe('slipped');
    expect(review.reflection).toMatch(/refocus/);
  });

  it('admits a stall when nothing has moved', () => {
    const pursuit = adoptPursuit(orderIntent, world({ overdue: 3 }), NOW);
    expect(reviewPursuit(pursuit, world({ overdue: 3 }), NOW).direction).toBe('stalled');
  });

  it('handles a throughput goal where higher is better', () => {
    const grow: Intention = { drive: 'growth', kind: 'compose_tool', intensity: 0.5, summary: 'learn', rationale: 'x' };
    const pursuit = adoptPursuit(grow, world({ shippedRecently: 1 }), NOW);
    expect(pursuit.metric).toBe('throughput');
    expect(reviewPursuit(pursuit, world({ shippedRecently: 4 }), NOW).direction).toBe('progress');
  });
});
