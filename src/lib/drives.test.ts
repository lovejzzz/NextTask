import { describe, expect, it } from 'vitest';

import { motivate, strongestDrive, topInitiative, type WorldState } from './drives';

const calm: WorldState = {
  overdue: 0,
  stale: 0,
  active: 0,
  shippedRecently: 0,
  idleDays: 0,
  repeatedPattern: null,
  capabilityGap: null,
  ownBacklog: 0,
};

describe('motivate — self-generated goals, no prompt required', () => {
  it('wants nothing when the world is genuinely calm (contentment is valid)', () => {
    expect(motivate(calm)).toEqual([]);
    expect(strongestDrive(calm)).toBeNull();
  });

  it('forms an order intention, unprompted, when work is overdue', () => {
    const wants = motivate({ ...calm, overdue: 4, active: 6 });
    expect(wants[0].drive).toBe('order');
    expect(wants[0].summary).toContain('4 overdue');
  });

  it('wants to grow: turn a repeated routine into a tool', () => {
    const wants = motivate({ ...calm, repeatedPattern: ['clear overdue', 'plan my day'] });
    expect(wants.some((w) => w.drive === 'growth' && w.kind === 'compose_tool')).toBe(true);
  });

  it('asks for a resource — not faking — when it hits a capability gap', () => {
    const wants = motivate({ ...calm, capabilityGap: 'recurring tasks' });
    const ask = wants.find((w) => w.kind === 'request_resource' && w.drive === 'growth');
    expect(ask?.summary).toContain('recurring tasks');
  });

  it('keeps its own agenda — a self drive when it has upgrades it wants', () => {
    expect(motivate({ ...calm, ownBacklog: 3 }).some((w) => w.drive === 'self')).toBe(true);
  });

  it('offers help gently (care) but ranks it below real board problems', () => {
    const wants = motivate({ ...calm, overdue: 3, active: 5, idleDays: 2 });
    const order = wants.findIndex((w) => w.drive === 'order');
    const care = wants.findIndex((w) => w.drive === 'care');
    expect(order).toBeGreaterThanOrEqual(0);
    expect(care).toBeGreaterThan(order); // care is the low simmer, never the loudest
  });

  it('ranks the most pressing want first', () => {
    const wants = motivate({ ...calm, overdue: 5, active: 8, ownBacklog: 2, idleDays: 2 });
    expect(wants[0].drive).toBe('order');
    expect(wants[0].intensity).toBeGreaterThanOrEqual(wants[wants.length - 1].intensity);
  });
});

describe('topInitiative — what he puts on the Desk unprompted', () => {
  it('surfaces his strongest actionable initiative', () => {
    const it_ = topInitiative({ ...calm, overdue: 3, active: 5 });
    expect(it_?.drive).toBe('order');
  });

  it('never surfaces the soft drives (no Desk nags)', () => {
    // only care/curiosity-eligible state → nothing concrete to put on the Desk
    expect(topInitiative({ ...calm, active: 4, idleDays: 5 })).toBeNull();
  });

  it("skips a drive the Desk already covers, so he doesn't say it twice", () => {
    const world: WorldState = { ...calm, overdue: 3, active: 5, repeatedPattern: ['clear overdue', 'plan my day'] };
    // His loudest is 'order' (clear overdue) — but the Desk's clear-overdue card
    // already has it. Exclude it and he offers the next new initiative: growth.
    expect(topInitiative(world)?.drive).toBe('order');
    expect(topInitiative(world, ['order'])?.drive).toBe('growth');
  });

  it('is null when nothing new is pulling at him', () => {
    expect(topInitiative(calm)).toBeNull();
  });
});
