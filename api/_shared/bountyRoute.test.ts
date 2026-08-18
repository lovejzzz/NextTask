import { describe, expect, it } from 'vitest';

import { BOUNTY_CHECK_PATH, isBountyCheckRequest } from './bountyRoute.js';

describe('isBountyCheckRequest', () => {
  it('recognizes both the public rewrite path and the internal rewrite query', () => {
    expect(isBountyCheckRequest({ query: {}, url: `${BOUNTY_CHECK_PATH}?source=test` })).toBe(true);
    expect(isBountyCheckRequest({ query: { mode: 'bounty-check' }, url: '/api/stats' })).toBe(true);
  });

  it('does not route ordinary stats requests to the paid endpoint', () => {
    expect(isBountyCheckRequest({ query: {}, url: '/api/stats' })).toBe(false);
    expect(isBountyCheckRequest({ query: {}, url: `${BOUNTY_CHECK_PATH}-lookalike` })).toBe(false);
  });
});
