import { describe, expect, it } from 'vitest';

import { MemoryRateLimiter, enforceIpWriteRateLimit, readLimit } from './rateLimit.js';
import type { VercelRequest } from './vercel.js';

describe('MemoryRateLimiter', () => {
  it('rejects requests over the configured limit until the window expires', () => {
    let now = 1_000;
    const limiter = new MemoryRateLimiter({ windowMs: 100, now: () => now });

    limiter.check('user:one', 2, 'Slow down');
    limiter.check('user:one', 2, 'Slow down');
    expect(() => limiter.check('user:one', 2, 'Slow down')).toThrowError(
      expect.objectContaining({ code: 'too_many_requests', status: 429 }),
    );

    now += 100;
    expect(() => limiter.check('user:one', 2, 'Slow down')).not.toThrow();
  });

  it('keeps the process-local bucket map bounded', () => {
    const limiter = new MemoryRateLimiter({ maxBuckets: 3 });

    for (let index = 0; index < 20; index += 1) {
      limiter.check(`ip:${index}`, 10, 'Slow down');
    }

    expect(limiter.size).toBe(3);
  });

  it('supports explicitly disabled limits', () => {
    const limiter = new MemoryRateLimiter({ maxBuckets: 1 });
    limiter.check('user:one', null, 'Slow down');
    expect(limiter.size).toBe(0);
  });
});

describe('enforceIpWriteRateLimit', () => {
  it('throttles write attempts before a valid user is known', () => {
    const previous = process.env.API_IP_WRITE_LIMIT_PER_MINUTE;
    process.env.API_IP_WRITE_LIMIT_PER_MINUTE = '1';
    const uniqueIp = `192.0.2.${Math.floor(Math.random() * 200) + 1}-${Date.now()}`;
    const req = {
      method: 'POST',
      headers: { 'x-forwarded-for': uniqueIp },
      socket: {},
    } as unknown as VercelRequest;

    try {
      enforceIpWriteRateLimit(req);
      expect(() => enforceIpWriteRateLimit(req)).toThrowError(
        expect.objectContaining({ code: 'too_many_requests', status: 429 }),
      );
    } finally {
      if (previous === undefined) delete process.env.API_IP_WRITE_LIMIT_PER_MINUTE;
      else process.env.API_IP_WRITE_LIMIT_PER_MINUTE = previous;
    }
  });
});

describe('readLimit', () => {
  it('only disables a limit for an explicit zero', () => {
    const key = 'NEXTTASK_TEST_RATE_LIMIT';
    const previous = process.env[key];

    try {
      delete process.env[key];
      expect(readLimit(key, 45)).toBe(45);
      process.env[key] = '0';
      expect(readLimit(key, 45)).toBeNull();
      process.env[key] = 'invalid';
      expect(readLimit(key, 45)).toBe(45);
      process.env[key] = '-2';
      expect(readLimit(key, 45)).toBe(45);
      process.env[key] = '1.5';
      expect(readLimit(key, 45)).toBe(45);
      process.env[key] = '12';
      expect(readLimit(key, 45)).toBe(12);
    } finally {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
  });
});
