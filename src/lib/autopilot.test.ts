import { describe, expect, it } from 'vitest';

import {
  AUTOPILOT_PREFIX,
  diagnoseFromSelfTest,
  isOuroborosTask,
  ouroborosTasks,
  proposeImprovements,
  stripOuroborosPrefix,
} from './autopilot';

describe('proposeImprovements', () => {
  it('returns the requested number of distinct proposals', () => {
    const proposals = proposeImprovements(0, 3);
    expect(proposals).toHaveLength(3);
    const titles = new Set(proposals.map((p) => p.title));
    expect(titles.size).toBe(3);
  });

  it('rotates through the backlog by seed', () => {
    expect(proposeImprovements(0, 2)[0].title).not.toBe(proposeImprovements(1, 2)[0].title);
  });

  it('wraps the seed safely and clamps the count', () => {
    expect(proposeImprovements(-1, 1)).toHaveLength(1);
    expect(proposeImprovements(999, 99).length).toBeGreaterThan(0);
  });

  it('skips ideas already on the board (no re-filing its own work)', () => {
    const all = proposeImprovements(0, 8);
    const existing = [`🤖 ${all[0].title}`]; // already filed, with the marker
    const next = proposeImprovements(0, 8, existing);
    expect(next.some((p) => p.title === all[0].title)).toBe(false);
  });

  it('returns nothing when the whole wishlist is already queued', () => {
    const everything = proposeImprovements(0, 99).map((p) => p.title);
    expect(proposeImprovements(0, 3, everything)).toEqual([]);
  });

  it('every proposal has a title, description, and valid priority', () => {
    for (const p of proposeImprovements(3, 5)) {
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
      expect(['low', 'normal', 'high']).toContain(p.priority);
    }
  });

  it('exposes a marker prefix for AI-authored tickets', () => {
    expect(AUTOPILOT_PREFIX.trim()).toBe('🤖');
  });
});

describe('ouroboros task tagging', () => {
  const tasks = [{ title: '🤖 Add LLM intent-fallback' }, { title: 'Email Sam' }, { title: '🤖 Cache the weights' }];
  it('identifies and filters the loop’s own tickets', () => {
    expect(isOuroborosTask(tasks[0])).toBe(true);
    expect(isOuroborosTask(tasks[1])).toBe(false);
    expect(ouroborosTasks(tasks)).toHaveLength(2);
  });
  it('strips the marker for clean display', () => {
    expect(stripOuroborosPrefix('🤖 Cache the weights')).toBe('Cache the weights');
  });
});

describe('diagnoseFromSelfTest', () => {
  it('files a high-priority fix ticket when the score is weak', () => {
    const ticket = diagnoseFromSelfTest(4, 12, 'grounded');
    expect(ticket).not.toBeNull();
    expect(ticket?.priority).toBe('high');
    expect(ticket?.title).toContain('grounded');
    expect(ticket?.description).toMatch(/grounding/i);
  });

  it('stays quiet when the brain is healthy (≥75%)', () => {
    expect(diagnoseFromSelfTest(10, 12, 'concise')).toBeNull();
    expect(diagnoseFromSelfTest(0, 0, null)).toBeNull();
  });
});
