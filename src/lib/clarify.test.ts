import { describe, expect, it } from 'vitest';

import { learnClarification, recallClarifiedTitle, type Clarifications } from './clarify';

describe('clarify — learning from a clarification', () => {
  it('remembers a clarified phrase and recalls it', () => {
    const map = learnClarification({}, 'the login task', 'Fix login bug');
    expect(recallClarifiedTitle(map, 'the login task')).toBe('Fix login bug');
  });

  it('keys on normalized phrasing — casing, spacing, trailing punctuation', () => {
    const map = learnClarification({}, 'the Login task', 'Fix login bug');
    expect(recallClarifiedTitle(map, '  the   login task?? ')).toBe('Fix login bug');
  });

  it('returns null for a phrase never clarified', () => {
    expect(recallClarifiedTitle({}, 'the deploy task')).toBeNull();
  });

  it('updates the choice if clarified differently later', () => {
    let map: Clarifications = learnClarification({}, 'login', 'Fix login bug');
    map = learnClarification(map, 'login', 'Login page redesign');
    expect(recallClarifiedTitle(map, 'login')).toBe('Login page redesign');
  });

  it('ignores empty phrase or title', () => {
    expect(learnClarification({}, '  ', 'X')).toEqual({});
    expect(learnClarification({}, 'x', '   ')).toEqual({});
  });
});
