import type { HTTPAdapter, HTTPRequestContext } from '@x402/core/server';

import { BOUNTY_CHECK_PATH, BOUNTY_CHECK_URL } from './bountyRoute.js';
import type { VercelRequest } from './vercel.js';

export function createPaymentContext(req: VercelRequest): HTTPRequestContext {
  const adapter: HTTPAdapter = {
    getHeader(name) {
      const value = req.headers[name.toLowerCase()];
      return Array.isArray(value) ? value[0] : value;
    },
    getMethod: () => req.method ?? 'POST',
    getPath: () => BOUNTY_CHECK_PATH,
    // Payment requirements advertise one canonical production resource. Never
    // let a caller-controlled Host header change the URL used for verification.
    getUrl: () => BOUNTY_CHECK_URL,
    getAcceptHeader() {
      const value = req.headers.accept;
      return Array.isArray(value) ? value[0] ?? '*/*' : value ?? '*/*';
    },
    getUserAgent() {
      const value = req.headers['user-agent'];
      return Array.isArray(value) ? value[0] ?? '' : value ?? '';
    },
    getBody: () => req.body,
  };
  return {
    adapter,
    path: BOUNTY_CHECK_PATH,
    method: req.method ?? 'POST',
    paymentHeader: adapter.getHeader('payment-signature') ?? adapter.getHeader('x-payment'),
  };
}
