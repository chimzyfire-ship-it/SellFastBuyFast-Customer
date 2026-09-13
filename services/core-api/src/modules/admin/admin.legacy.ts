import { RequestHandler } from "express";
import { sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { errors, sendError } from "../../lib/errors.js";
import { idempotency } from "../../middleware/idempotency.js";
import { Note, staffRoles, sectionPolicy } from "./admin.policy.js";
import {
  audit,
  financeReady,
  freshStaff,
  lockRecord,
  notifyMerchant,
  query,
} from "./admin.store.js";
import { queueRefundReview } from "./admin.commands.js";
export const requireFinancialEnabled: RequestHandler = (_req, _res, next) => {
  if (!financeReady())
    next(
      errors.unavailable(
        "PAYMENTS_DEFERRED",
        "The dedicated financial integration is not enabled.",
      ),
    );
  else next();
};
/** Wrap existing domain handlers in the same atomic request receipt and record lock. */
export function reviewCommand(
  scope: string,
  section: string,
  action: (body: Record<string, unknown>) => string,
): RequestHandler[] {
  const preflight: RequestHandler = async (req, _res, next) => {
    try {
      if (
        !req.user?.roles.some((r) =>
          staffRoles.includes(r as (typeof staffRoles)[number]),
        )
      ) {
        next();
        return;
      }
      if (!req.get("Idempotency-Key"))
        throw errors.validation("An Idempotency-Key is required.");
      await freshStaff(req.user, sectionPolicy(section, req.user).roles);
      if (section === "payouts" && !financeReady())
        throw errors.unavailable(
          "PAYMENTS_DEFERRED",
          "The dedicated financial integration is not enabled.",
        );
      next();
    } catch (e) {
      next(e);
    }
  };
  const lock: RequestHandler = async (req, res, next) => {
    try {
      if (
        !req.user?.roles.some((r) =>
          staffRoles.includes(r as (typeof staffRoles)[number]),
        )
      ) {
        next();
        return;
      }
      const actor = await freshStaff(
        req.user,
        sectionPolicy(section, req.user).roles,
      );
      const id = req.params.id ?? req.params.merchantId;
      if (section === "returns")
        await db.execute(
          sql`select o.id from orders o join return_requests r on r.order_id=o.id where r.id=${id} for update of o`,
        );
      const r = await lockRecord(section, id, req.get("If-Match"), actor);
      const key = action(req.body ?? {});
      if (!r.allowedActions?.includes(key))
        throw errors.conflict(
          "ACTION_NOT_AVAILABLE",
          "The decision is not available for this record.",
        );
      const note =
        key === "reply_ticket"
          ? "Customer support reply sent"
          : Note.parse(req.body.note);
      const original = res.json.bind(res);
      res.json = ((body: unknown) => {
        if (res.statusCode >= 400) return original(body);
        void (async () => {
          await audit(
            actor,
            section,
            id,
            key,
            note,
            res.getHeader("X-Request-ID") as string,
          );
          if (section === "merchants")
            await notifyMerchant(id, key, note, { merchantId: id });
          if (section === "catalogue")
            await notifyMerchant(String(r.merchantId), key, note, {
              productId: id,
            });
          if (key === "receive_return")
            await queueRefundReview(String(r.orderId), actor.id, note, id);
          original(body);
        })().catch((e) => {
          res.json = original;
          sendError(res, e);
        });
        return res;
      }) as typeof res.json;
      next();
    } catch (e) {
      next(e);
    }
  };
  return [preflight, idempotency(scope), lock];
}
