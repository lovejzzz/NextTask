import { describe, expect, it } from 'vitest';

import { LEARNINGS, describeLearnings, findLearning, formatLearnings, type Learning } from './knowledge';

describe('supervised knowledge — vetted, sourced, durable', () => {
  it('every learning carries its provenance (never a bare claim)', () => {
    expect(LEARNINGS.length).toBeGreaterThan(0);
    for (const learning of LEARNINGS) {
      expect(learning.insight.trim().length).toBeGreaterThan(0);
      expect(learning.source.title.trim().length).toBeGreaterThan(0);
      expect(learning.source.url).toMatch(/^https?:\/\//); // a real, checkable source
      expect(learning.learnedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('formats a prompt creed, and says nothing when he has learned nothing', () => {
    expect(formatLearnings()).toContain('vetted sources');
    expect(formatLearnings([])).toBe('');
  });

  it('describes each learning with its source for the glass-box panel', () => {
    const lines = describeLearnings();
    expect(lines[0]).toContain('Work-in-progress');
    expect(lines[0]).toContain('learned from');
  });

  it('answers from what he was actually taught, by relevance', () => {
    expect(findLearning('what do you know about WIP limits?')?.id).toBe('wip-limits');
    expect(findLearning('tell me about the two minute rule')?.id).toBe('two-minute-rule');
  });

  it('returns null when nothing he was taught is close (no guessing)', () => {
    expect(findLearning('what do you know about marine biology')).toBeNull();
    expect(findLearning('')).toBeNull();
  });

  it('matches against a single newly-taught learning', () => {
    const one: Learning[] = [
      { id: 'eat-the-frog', topic: 'Eat the frog', insight: 'Do the hardest task first.', source: { title: 'x', url: 'https://x.test' }, learnedOn: '2026-06-23' },
    ];
    expect(findLearning('should I eat the frog', one)?.id).toBe('eat-the-frog');
  });
});
