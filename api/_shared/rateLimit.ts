import type { VercelRequest } from '@vercel/node';
import { ApiHttpError } from './http.js';

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const windowMs = 60_000;

export function enforceWriteRateLimit(req: VercelRequest, userId: string) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method ?? 'GET')) return;

  const limit = Number(process.env.API_WRITE_LIMIT_PER_MINUTE ?? 45);
  if (!Number.isFinite(limit) || limit <= 0) return;

  const now = Date.now();
  const key = `${userId}:${clientIp(req)}`;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    cleanup(now);
    return;
  }

  existing.count += 1;
  if (existing.count > limit) {
    throw new ApiHttpError('too_many_requests', 'Too many write requests. Please wait a minute and try again.', 429);
  }
}

function clientIp(req: VercelRequest) {
  const forwarded = req.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (value) return value.split(',')[0]?.trim() || 'unknown';

  const realIp = req.headers['x-real-ip'];
  if (Array.isArray(realIp)) return realIp[0] ?? 'unknown';
  return realIp ?? req.socket.remoteAddress ?? 'unknown';
}

function cleanup(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
