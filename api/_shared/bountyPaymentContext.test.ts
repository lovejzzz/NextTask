import { describe, expect, it } from 'vitest';

import { createPaymentContext } from './bountyPaymentContext.js';
import { BOUNTY_CHECK_URL } from './bountyRoute.js';

describe('createPaymentContext', () => {
  it('uses the canonical paid resource URL instead of the caller-controlled Host header', () => {
    const context = createPaymentContext({
      method: 'POST',
      url: '/api/x402/bounty-check',
      headers: {
        host: 'attacker.example',
        'payment-signature': 'signed-payment',
      },
      query: {},
      body: { issueUrl: 'https://github.com/owner/repo/issues/1' },
      socket: {},
    });

    expect(context.adapter.getUrl()).toBe(BOUNTY_CHECK_URL);
    expect(context.paymentHeader).toBe('signed-payment');
  });
});
