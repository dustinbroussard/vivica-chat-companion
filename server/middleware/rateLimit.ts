import type { Request, Response, NextFunction } from 'express';

const WINDOW_MS = 60_000;
const LIMIT = 20;
const buckets = new Map<string, { count: number; ts: number }>();

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip;
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (bucket && now - bucket.ts < WINDOW_MS) {
    if (bucket.count >= LIMIT) {
      return res.status(429).json({ error: { type: 'RATE_LIMIT', message: 'Too many requests', status: 429 } });
    }
    bucket.count++;
  } else {
    buckets.set(ip, { count: 1, ts: now });
  }
  next();
}
