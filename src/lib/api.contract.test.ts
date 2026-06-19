import { describe, expect, it } from 'vitest';

import { api } from './api';
import { mockApi } from './mockApi';

// Guards against the local-demo mockApi drifting from the real API surface:
// any method added to one must exist on the other, or this fails.
describe('mockApi / api contract', () => {
  it('exposes exactly the same method names', () => {
    expect(Object.keys(mockApi).sort()).toEqual(Object.keys(api).sort());
  });

  it('implements every real api method as a function on mockApi', () => {
    for (const key of Object.keys(api)) {
      expect(typeof (mockApi as Record<string, unknown>)[key]).toBe('function');
    }
  });
});
