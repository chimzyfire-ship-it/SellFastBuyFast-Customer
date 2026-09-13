import { Request, Response, NextFunction } from "express";
import { sql } from "drizzle-orm";
import { db, withDatabase, Database } from "../db/client.js";
import { errors } from "../lib/errors.js";
import { requestFingerprint } from "../modules/admin/admin.policy.js";
export async function atomicCommand<T>(
  scope: string,
  actorId: string,
  key: string,
  hash: string,
  work: () => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) =>
    withDatabase(tx as unknown as Database, async () => {
      // Transaction-scoped serialization; a crash rolls back both the command and its receipt.
      await db.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${scope + ":" + actorId + ":" + key},0))`,
      );
      const cacheKey = `${scope}:${actorId}:${key}`;
      const existing = await db.execute(
        sql`select request_hash,response_body from idempotency_keys where key=${cacheKey}`,
      );
      if (existing[0]) {
        if (existing[0].request_hash !== hash)
          throw errors.conflict(
            "IDEMPOTENCY_CONFLICT",
            "This request key belongs to different input.",
          );
        return existing[0].response_body as T;
      }
      const result = await work();
      await db.execute(
        sql`insert into idempotency_keys(key,scope,request_hash,response_status,response_body) values(${cacheKey},${scope},${hash},200,${JSON.stringify(result)}::jsonb)`,
      );
      return result;
    }),
  );
}
class RejectedResponse extends Error {
  constructor(readonly packet: { status: number; body: unknown }) {
    super("Command rejected");
  }
}
export function idempotency(scope: string) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const key = req.get("Idempotency-Key");
    if (!key) {
      next();
      return;
    }
    if (!req.user) {
      next(errors.unauthorized());
      return;
    }
    if (key.length > 200) {
      next(errors.validation("Request key is too long."));
      return;
    }
    const originalJson = res.json.bind(res);
    const hash = requestFingerprint(
      req.method,
      req.originalUrl,
      req.body,
      req.get("If-Match"),
    );
    try {
      const packet = await atomicCommand(
        scope,
        req.user.id,
        key,
        hash,
        () =>
          new Promise<{ status: number; body: unknown }>((resolve, reject) => {
            const timer = setTimeout(
              () =>
                reject(
                  errors.unavailable(
                    "COMMAND_TIMEOUT",
                    "The request timed out. Retry with the same request key.",
                  ),
                ),
              120000,
            );
            res.json = ((body: unknown) => {
              clearTimeout(timer);
              const packet = { status: res.statusCode, body };
              if (res.statusCode >= 400) reject(new RejectedResponse(packet));
              else resolve(packet);
              return res;
            }) as Response["json"];
            next();
          }),
      );
      res.json = originalJson;
      res.status(packet.status).json(packet.body);
    } catch (error) {
      res.json = originalJson;
      if (error instanceof RejectedResponse)
        res.status(error.packet.status).json(error.packet.body);
      else next(error);
    }
  };
}
