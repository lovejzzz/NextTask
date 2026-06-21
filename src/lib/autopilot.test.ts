import { describe, expect, it } from 'vitest';

import { AUTOPILOT_PREFIX, proposeImprovements } from './autopilot';

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
