import { describe, expect, it } from 'vitest';

import { generateProposals } from './proposals';

const ideas = [
  { title: 'Add an LLM intent-fallback', description: 'x', priority: 'high' as const },
  { title: 'Cache the model weights', description: 'y', priority: 'normal' as const },
  { title: 'Zen mode', description: 'z', priority: 'low' as const },
];

describe('generateProposals', () => {
  it('leads with clearing overdue when there is any', () => {
    const [first] = generateProposals({ overdue: 3, ideas: [] });
    expect(first.kind).toBe('clear_overdue');
    expect(first.summary).toContain('3 overdue');
  });

  it('omits the overdue proposal when nothing is overdue', () => {
    expect(generateProposals({ overdue: 0, ideas: [] })).toEqual([]);
  });

  it('surfaces at most two upgrade wants', () => {
    const proposals = generateProposals({ overdue: 0, ideas });
    expect(proposals).toHaveLength(2);
    expect(proposals.every((p) => p.kind === 'upgrade')).toBe(true);
  });

  it('gives each proposal a stable, unique id', () => {
    const ids = generateProposals({ overdue: 1, ideas }).map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('offers to finish a skill when its first step just happened', () => {
    const proposals = generateProposals({
      overdue: 0,
      ideas: [],
      continuation: { name: 'morning', firstStep: 'clear overdue', remaining: ['plan my day'] },
    });
    expect(proposals[0].kind).toBe('run_skill');
    expect(proposals[0].summary).toContain('finish your "morning" skill');
  });

  it('leads with a learned-skill proposal when Boardy spots a repeated pattern', () => {
    const proposals = generateProposals({ overdue: 0, ideas: [], learned: ['clear overdue', 'plan my day'] });
    expect(proposals[0].kind).toBe('save_skill');
    expect(proposals[0].summary).toContain('save it as a skill');
  });

  it('shows restraint: never piles on more than three asks at once', () => {
    const proposals = generateProposals({
      overdue: 3,
      ideas,
      learned: ['clear overdue', 'plan my day'],
      continuation: { name: 'morning', firstStep: 'clear overdue', remaining: ['plan my day'] },
    });
    expect(proposals.length).toBeLessThanOrEqual(3);
  });

  it("leads with the human's needs and lets his own wants yield when the Desk is busy", () => {
    const proposals = generateProposals({
      overdue: 3,
      ideas,
      learned: ['clear overdue', 'plan my day'],
      continuation: { name: 'morning', firstStep: 'clear overdue', remaining: ['plan my day'] },
    });
    // Crowded Desk → his self-serving upgrade asks are the first to be dropped.
    expect(proposals.some((p) => p.kind === 'upgrade')).toBe(false);
    expect(proposals[0].kind).toBe('run_skill'); // finishing your flow comes first
    expect(proposals.map((p) => p.kind)).toContain('clear_overdue');
  });

  it('respects a tighter limit when asked to stay especially quiet', () => {
    expect(generateProposals({ overdue: 3, ideas, learned: ['a', 'b'] }, 1)).toHaveLength(1);
  });
});
