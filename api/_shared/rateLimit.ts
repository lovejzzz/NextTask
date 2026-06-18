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

  const userLimit = readLimit('API_WRITE_LIMIT_PER_MINUTE', 45);
  const ipLimit = readLimit('API_IP_WRITE_LIMIT_PER_MINUTE', 120);
  const ip = clientIp(req);

  checkBucket(`user:${userId}`, userLimit, 'Too many write requests. Please wait a minute and try again.');
  checkBucket(`ip:${ip}`, ipLimit, 'Too many write requests from this network. Please wait a minute and try again.');
}

function readLimit(key: string, fallback: number) {
  const raw = process.env[key];
  if (!raw) return fallback;

  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function checkBucket(key: string, limit: number | null, message: string) {
  if (!limit) return;

  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    cleanup(now);
    return;
  }

  existing.count += 1;
  if (existing.count > limit) {
    throw new ApiHttpError('too_many_requests', message, 429);
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
