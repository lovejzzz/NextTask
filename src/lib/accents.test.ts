import { describe, expect, it } from 'vitest';

import { ACCENTS, accentById, nextAccentId } from './accents';

describe('nextAccentId', () => {
  it('advances to the next accent', () => {
    expect(nextAccentId('indigo')).toBe('emerald');
  });

  it('wraps around at the end of the list', () => {
    const last = ACCENTS[ACCENTS.length - 1].id;
    expect(nextAccentId(last)).toBe('indigo');
  });

  it('falls back to the first accent for an unknown id', () => {
    // index -1 → (−1 + 1) % len = 0 → first accent
    expect(nextAccentId('does-not-exist')).toBe('indigo');
  });
});

describe('accentById', () => {
  it('returns the matching accent', () => {
    expect(accentById('rose').label).toBe('Rose');
  });

  it('defaults to indigo for an unknown id', () => {
    expect(accentById('nope').id).toBe('indigo');
  });
});
