import { describe, expect, it } from 'vitest';

import { detectRepeatedSequence, suggestSkillContinuation, suggestSkillName } from './skills';

describe('detectRepeatedSequence', () => {
  it('finds a 2-step pattern Boardy keeps repeating', () => {
    const history = ['clear overdue', 'plan my day', "what's overdue", 'clear overdue', 'plan my day'];
    expect(detectRepeatedSequence(history)).toEqual(['clear overdue', 'plan my day']);
  });

  it('prefers a longer repeated sequence', () => {
    const history = ['a', 'b', 'c', 'a', 'b', 'c'];
    expect(detectRepeatedSequence(history)).toEqual(['a', 'b', 'c']);
  });

  it('returns null when nothing repeats', () => {
    expect(detectRepeatedSequence(['a', 'b', 'c', 'd'])).toBeNull();
  });

  it('ignores trivial all-identical repeats', () => {
    expect(detectRepeatedSequence(['poke', 'poke', 'poke', 'poke'])).toBeNull();
  });
});

describe('suggestSkillContinuation', () => {
  const tools = [{ name: 'morning', steps: ['clear overdue', 'plan my day'] }];

  it('offers the rest of a skill when its first step was just done', () => {
    expect(suggestSkillContinuation('clear overdue', tools)).toEqual({
      name: 'morning',
      firstStep: 'clear overdue',
      remaining: ['plan my day'],
    });
  });

  it('stays quiet for an unrelated command or a single-step tool', () => {
    expect(suggestSkillContinuation('what is next', tools)).toBeNull();
    expect(suggestSkillContinuation('clear overdue', [{ name: 'x', steps: ['clear overdue'] }])).toBeNull();
  });
});

describe('suggestSkillName', () => {
  it('builds a readable kebab name from the steps, dropping filler', () => {
    expect(suggestSkillName(['clear overdue', 'plan my day'])).toBe('clear-overdue-plan');
  });

  it('falls back to a default when there are no meaningful words', () => {
    expect(suggestSkillName(['to', 'a'])).toBe('routine');
  });
});
