import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { idempotencyKeys } from '../db/schema.js';
import { errors } from '../lib/errors.js';

interface IdempotencyRecord {
  status: number;
  body: unknown;
}

const memoryCache = new Map<string, IdempotencyRecord>();

export function idempotency(scope: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = req.headers['idempotency-key'];
    if (!key || typeof key !== 'string') {
      next();
      return;
    }

    if (!req.user) {
      next(errors.unauthorized('Idempotency requires authentication.'));
      return;
    }

    const cacheKey = `${scope}:${req.user.id}:${key}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      res.status(cached.status).json(cached.body);
      return;
    }

    let stored: { responseStatus: number; responseBody: unknown } | undefined;
    try {
      const inserted = await db
        .insert(idempotencyKeys)
        .values({
          key: cacheKey,
          scope,
          responseStatus: 102,
          responseBody: {},
        })
        .onConflictDoNothing()
        .returning({ key: idempotencyKeys.key });

      if (inserted.length === 0) {
        const rows = await db
          .select({ responseStatus: idempotencyKeys.responseStatus, responseBody: idempotencyKeys.responseBody })
          .from(idempotencyKeys)
          .where(eq(idempotencyKeys.key, cacheKey))
          .limit(1);
        stored = rows[0];
      }
    } catch (err) {
      next(err);
      return;
    }

    if (stored) {
      if (stored.responseStatus === 102) {
        res.status(409).json({
          success: false,
          error: { code: 'REQUEST_IN_PROGRESS', message: 'An identical request is already being processed.' },
        });
        return;
      }
      memoryCache.set(cacheKey, { status: stored.responseStatus, body: stored.responseBody });
      res.status(stored.responseStatus).json(stored.responseBody);
      return;
    }

    const originalJson = res.json.bind(res);
    let persisted = false;

    res.json = ((body: any) => {
      if (!persisted && res.statusCode < 500) {
        persisted = true;
        memoryCache.set(cacheKey, { status: res.statusCode, body });
        void db
          .update(idempotencyKeys)
          .set({
            responseStatus: res.statusCode,
            responseBody: body ?? {},
          })
          .where(eq(idempotencyKeys.key, cacheKey));
      } else if (!persisted && res.statusCode >= 500) {
        persisted = true;
        void db.delete(idempotencyKeys).where(eq(idempotencyKeys.key, cacheKey));
      }
      return originalJson(body);
    }) as typeof res.json;

    next();
  };
}
