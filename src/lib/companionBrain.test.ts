import { describe, expect, it } from 'vitest';

import { buildBrainMessages, cleanLine, type BrainContext } from './companionBrain';

const ctx: BrainContext = {
  active: 5,
  overdue: 2,
  inProgress: 1,
  shippedToday: 3,
  titles: ['Wire the API', 'Polish the drawer', 'Write tests', 'Ignored fourth'],
};

describe('buildBrainMessages', () => {
  it('produces a system + user turn with the mood and board facts', () => {
    const [system, user] = buildBrainMessages('exasperated', ctx);
    expect(system.role).toBe('system');
    expect(system.content).toContain('exasperated');
    expect(user.role).toBe('user');
    expect(user.content).toContain('5 active');
    expect(user.content).toContain('2 overdue');
  });

  it('includes at most three sample task titles', () => {
    const [, user] = buildBrainMessages('content', ctx);
    expect(user.content).toContain('Wire the API');
    expect(user.content).toContain('Write tests');
    expect(user.content).not.toContain('Ignored fourth');
  });

  it('omits the sample clause when there are no titles', () => {
    const [, user] = buildBrainMessages('bored', { ...ctx, titles: [] });
    expect(user.content).not.toContain('A few tasks');
  });
});

describe('cleanLine', () => {
  it('strips surrounding quotes and keeps the first line', () => {
    expect(cleanLine('"Finish something for once."')).toBe('Finish something for once.');
    expect(cleanLine('First thought.\nSecond thought.')).toBe('First thought.');
  });

  it('truncates very long output', () => {
    const long = 'x'.repeat(200);
    expect(cleanLine(long).endsWith('…')).toBe(true);
    expect(cleanLine(long).length).toBeLessThanOrEqual(160);
  });
});
