import { describe, expect, it } from 'vitest';

import { APP_VERSION, CHANGELOG } from './changelog';

describe('changelog', () => {
  it('keeps the displayed current release aligned with the build version', () => {
    expect(CHANGELOG[0]?.version).toBe(APP_VERSION);
    expect(new Set(CHANGELOG.map((entry) => entry.version)).size).toBe(CHANGELOG.length);
  });
});
