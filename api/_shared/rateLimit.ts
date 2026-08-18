import type { SupabaseClient } from '@supabase/supabase-js';

import { isMissingRpcFunction } from './database.js';
import { ApiHttpError } from './http.js';
import type { VercelRequest } from './vercel.js';

type Bucket = {
  count: number;
  resetAt: number;
};

type MemoryRateLimiterOptions = {
  windowMs?: number;
  maxBuckets?: number;
  now?: () => number;
};

export class MemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly windowMs: number;
  private readonly maxBuckets: number;
  private readonly now: () => number;

  constructor({ windowMs = 60_000, maxBuckets = 2_000, now = Date.now }: MemoryRateLimiterOptions = {}) {
    this.windowMs = windowMs;
    this.maxBuckets = Math.max(1, maxBuckets);
    this.now = now;
  }

  check(key: string, limit: number | null, message: string) {
    if (!limit) return;

    const now = this.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      if (existing) this.buckets.delete(key);
      this.makeRoom(now);
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return;
    }

    existing.count += 1;
    if (existing.count > limit) {
      throw new ApiHttpError('too_many_requests', message, 429);
    }
  }

  get size() {
    return this.buckets.size;
  }

  private makeRoom(now: number) {
    if (this.buckets.size < this.maxBuckets) return;

    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }

    while (this.buckets.size >= this.maxBuckets) {
      const oldestKey = this.buckets.keys().next().value;
      if (oldestKey === undefined) break;
      this.buckets.delete(oldestKey);
    }
  }
}

const limiter = new MemoryRateLimiter();

export function enforceIpWriteRateLimit(req: VercelRequest) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method ?? 'GET')) return;

  const ipLimit = readLimit('API_IP_WRITE_LIMIT_PER_MINUTE', 120);
  const ip = clientIp(req);

  limiter.check(`ip:${ip}`, ipLimit, 'Too many write requests from this network. Please wait a minute and try again.');
}

export function enforceUserWriteRateLimit(req: VercelRequest, userId: string) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method ?? 'GET')) return;

  const userLimit = readLimit('API_WRITE_LIMIT_PER_MINUTE', 45);
  limiter.check(`user:${userId}`, userLimit, 'Too many write requests. Please wait a minute and try again.');
}

let warnedMissingDurableLimiter = false;

/**
 * Cross-instance authenticated write limiting backed by Postgres. The existing
 * memory bucket remains a fast first line of defense and the pre-auth IP guard;
 * this RPC closes the serverless-instance reset gap for authenticated writes.
 */
export async function enforceDurableUserWriteRateLimit(req: VercelRequest, supabase: SupabaseClient) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method ?? 'GET')) return;

  const limit = readLimit('API_WRITE_LIMIT_PER_MINUTE', 45);
  if (!limit) return;

  const { data, error } = await supabase.rpc('consume_api_rate_limit', {
    rate_scope: 'api-write',
    maximum_requests: limit,
    window_seconds: 60,
  });

  // Compatibility during local development or a staged migration rollout. The
  // bounded in-memory user/IP limit has already run, so protection is reduced
  // but never silently disabled.
  if (error && isMissingRpcFunction(error)) {
    if (!warnedMissingDurableLimiter) {
      warnedMissingDurableLimiter = true;
      console.warn('Durable API rate-limit RPC is unavailable. Apply migration 004_workspace_collaboration.sql.');
    }
    return;
  }
  if (error) throw new ApiHttpError('server_error', error.message, 500);
  if (data !== true) {
    throw new ApiHttpError('too_many_requests', 'Too many write requests. Please wait a minute and try again.', 429);
  }
}

export function readLimit(key: string, fallback: number) {
  const raw = process.env[key];
  if (!raw) return fallback;
  if (raw === '0') return null;

  const value = Number(raw);
  // A malformed production value must not silently disable abuse protection.
  // Zero remains an explicit local-test escape hatch; everything else falls
  // back to the conservative built-in limit.
  if (!Number.isSafeInteger(value) || value < 1) return fallback;
  return value;
}

function clientIp(req: VercelRequest) {
  const forwarded = req.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (value) return normalizeAddress(value.split(',')[0]);

  const realIp = req.headers['x-real-ip'];
  if (Array.isArray(realIp)) return normalizeAddress(realIp[0]);
  return normalizeAddress(realIp ?? req.socket.remoteAddress);
}

function normalizeAddress(value: string | undefined) {
  return value?.trim().slice(0, 128) || 'unknown';
}
