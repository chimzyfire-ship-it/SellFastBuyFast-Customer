import { Request, Response, NextFunction } from 'express';

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyBy?: (req: Request) => string;
}

export function rateLimit(options: RateLimitOptions) {
  const refillRate = options.max / options.windowMs;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = options.keyBy ? options.keyBy(req) : req.ip ?? 'unknown';
    const now = Date.now();

    const bucket = buckets.get(key) ?? { tokens: options.max, updatedAt: now };
    const elapsed = now - bucket.updatedAt;
    bucket.tokens = Math.min(options.max, bucket.tokens + elapsed * refillRate);
    bucket.updatedAt = now;

    if (bucket.tokens < 1) {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
      });
      return;
    }

    bucket.tokens -= 1;
    buckets.set(key, bucket);

    if (buckets.size > 50_000) {
      for (const [k, b] of buckets) {
        if (now - b.updatedAt > options.windowMs * 2) buckets.delete(k);
      }
    }

    next();
  };
}
