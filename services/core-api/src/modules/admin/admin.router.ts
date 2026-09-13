import { operationalHealth } from "../operations/runtime.js";
import { textArray } from "./admin.policy.js";
import { Router, Request, Response, NextFunction } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { config } from "../../lib/config.js";
import { errors } from "../../lib/errors.js";
import { requireAuth } from "../../middleware/auth.js";
import { atomicCommand } from "../../middleware/idempotency.js";
import {
  Actor,
  ListQuery,
  sectionPolicy,
  sections,
  staffRoles,
  requestFingerprint,
} from "./admin.policy.js";
import {
  audit,
  detailRecord,
  financeReady,
  freshStaff,
  listRecords,
  query,
  readRecord,
} from "./admin.store.js";
import { addNoteOrAssign, decide, saveCampaign } from "./admin.commands.js";
import { acceptDeliveredInvitation, manageAccess } from "./admin.access.js";
export const adminRouter = Router();
const handle =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res).catch(next);
  };
const uuid = (value: string) => z.string().uuid().parse(value);
adminRouter.use(requireAuth);
adminRouter.get(
  "/me",
  handle(async (req, res) => {
    await acceptDeliveredInvitation(
      req.user!,
      Boolean(req.user!.emailConfirmed),
    );
    const actor = await freshStaff(req.user!, staffRoles, false);
    const [profile] = await query(
      sql`select full_name from profiles where id=${actor.id}`,
    );
    res.json({
      success: true,
      data: {
        id: actor.id,
        email: actor.email,
        name: profile.full_name,
        roles: actor.roles.filter((r) =>
          staffRoles.includes(r as (typeof staffRoles)[number]),
        ),
        requireMfa: config.admin.requireMfa,
        capabilities: [
          ...(actor.roles.includes("operations_admin")
            ? ["content:create"]
            : []),
          ...(actor.roles.includes("security_admin") ? ["access:invite"] : []),
        ],
      },
    });
  }),
);
adminRouter.use((req, res, next) => {
  void freshStaff(req.user!)
    .then((actor) => {
      req.user = { ...req.user!, ...actor };
      next();
    })
    .catch(next);
});
adminRouter.get(
  "/overview",
  handle(async (req, res) => {
    const actor = req.user!;
    const permitted = Object.entries(sections)
      .filter(([, s]) => actor.roles.some((r) => s.roles.includes(r)))
      .map(([key]) => key);
    const counts = await query(
      sql`select section,status,count(*)::int as count from admin_workspace_records where section=any(${textArray(permitted)}) group by section,status`,
    );
    const definitions = [
      ["merchants", "in_review", "Merchant registrations"],
      ["catalogue", "pending_approval", "Listings to review"],
      ["support", "open", "Open conversations"],
      ["disputes", "open", "Open disputes"],
      ["returns", "requested", "Return requests"],
      ["payouts", "pending_approval", "Payout reviews"],
      ["reconciliation", "unmatched", "Unmatched provider events"],
    ];
    const queues = definitions
      .filter(([section]) => permitted.includes(section))
      .map(([section, status, label]) => ({
        section,
        status,
        label,
        count: Number(
          counts.find((c) => c.section === section && c.status === status)
            ?.count ?? 0,
        ),
        description: "Open the review queue",
      }));
    const resources = permitted.map((s) => sections[s].resource);
    const activity = await query(
      sql`select a.id,a.action,p.full_name as "actorName",a.created_at as "createdAt",a.metadata->>'note' as note from audit_events a left join profiles p on p.id=a.actor_id where a.resource_type=any(${textArray(resources)}) order by a.created_at desc limit 12`,
    );
    res.json({
      success: true,
      data: {
        asOf: new Date().toISOString(),
        metrics: queues
          .slice(0, 4)
          .map((q) => ({ ...q, value: q.count, format: "count" })),
        queues,
        activity,
      },
    });
  }),
);
adminRouter.get(
  "/services",
  handle(async (_req, res) => {
    await db.execute(sql`select 1`);
    const worker = await operationalHealth();
    res.json({
      success: true,
      data: {
        services: [
          { name: "Core API & database", status: "healthy" },
          {
            name: "Scheduled maintenance",
            status: worker.status,
            lastCheckedAt: worker.lastSucceededAt,
          },
          { name: "Identity provider", status: "verified" },
          {
            name: "Financial operations",
            status: financeReady() ? "enabled" : "deferred",
          },
          {
            name: "Invitation email",
            status:
              config.admin.smtpUrl && config.admin.mailFrom
                ? "configured"
                : "unconfigured",
          },
        ],
      },
    });
  }),
);
adminRouter.get(
  "/:section/:id/assignees",
  handle(async (req, res) => {
    const p = sectionPolicy(req.params.section, req.user!);
    const record = await readRecord(
      req.params.section,
      uuid(req.params.id),
      req.user!,
    );
    if (!record.allowedActions?.includes("assign")) throw errors.forbidden();
    const items = await query(
      sql`select distinct p.id,p.full_name as name,p.email from profiles p join user_roles r on r.user_id=p.id left join admin_staff_access a on a.id=p.id where r.role::text=any(${textArray([...p.roles])}) and coalesce(a.status,'active')='active' order by p.email limit 250`,
    );
    res.json({ success: true, data: { items } });
  }),
);
adminRouter.get(
  "/:section/:id/documents/:documentId/access",
  handle(async (req, res) => {
    const { section, documentId } = req.params,
      id = uuid(req.params.id);
    const record = await readRecord(section, id, req.user!);
    const [documentUuid, kind] = documentId.split(":");
    uuid(documentUuid);
    let path: string | undefined,
      name = "Supporting evidence",
      bucket = "",
      prefixes: string[] = [];
    if (section === "merchants" && ["identity", "utility"].includes(kind)) {
      const [r] = await query(
        sql`select id_document_url,utility_bill_url from merchant_verifications where id=${documentUuid} and merchant_id=${id}`,
      );
      path = r
        ? String(kind === "identity" ? r.id_document_url : r.utility_bill_url)
        : undefined;
      bucket = "merchant-kyc";
      prefixes = [id];
      name = kind === "identity" ? "Identity document" : "Utility bill";
    } else if (section === "orders" && ["pickup", "delivery"].includes(kind)) {
      const [r] = await query(
        sql`select pickup_evidence_url,delivery_evidence_url from shipments where id=${documentUuid} and order_id=${id}`,
      );
      path = r
        ? String(
            kind === "pickup" ? r.pickup_evidence_url : r.delivery_evidence_url,
          )
        : undefined;
      prefixes = [id, String(record.merchantId)];
    } else if (
      section === "returns" &&
      kind === "return" &&
      documentUuid === id
    ) {
      const [r] = await query(
        sql`select evidence_url from return_requests where id=${id}`,
      );
      path = r?.evidence_url ? String(r.evidence_url) : undefined;
      prefixes = [id, String(record.orderId), String(record.customerId)];
    }
    if (!path || path === "null") throw errors.notFound("Document not found.");
    let url: string,
      expiresAt: string | null = null;
    if (!bucket) {
      const parsed = new URL(path);
      if (parsed.protocol !== "https:" || parsed.username || parsed.password)
        throw errors.validation("Evidence URL is not secure.");
      if (parsed.origin === new URL(config.supabaseUrl).origin) {
        const match = parsed.pathname.match(
          /^\/storage\/v1\/object\/(?:public|sign)\/(return-evidence|shipment-evidence)\/(.+)$/,
        );
        if (!match)
          throw errors.forbidden("Unsupported evidence storage location.");
        bucket = match[1];
        path = decodeURIComponent(match[2]);
      } else url = parsed.href;
    }
    if (bucket) {
      if (
        !prefixes.some((prefix) => path!.startsWith(prefix + "/")) ||
        path.split("/").includes("..")
      )
        throw errors.forbidden("Document ownership could not be verified.");
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(path, 120);
      if (error || !data)
        throw errors.unavailable(
          "DOCUMENT_UNAVAILABLE",
          "The secure document could not be opened.",
        );
      url = data.signedUrl;
      expiresAt = new Date(Date.now() + 120000).toISOString();
    }
    await audit(
      req.user!,
      section,
      id,
      "document.accessed",
      `Opened ${kind} evidence`,
      res.getHeader("X-Request-ID") as string,
    );
    res.json({
      success: true,
      data: { url: url!, name, expiresAt, external: !bucket },
    });
  }),
);
adminRouter.get(
  "/:section/:id",
  handle(async (req, res) =>
    res.json({
      success: true,
      data: await detailRecord(
        req.params.section,
        uuid(req.params.id),
        req.user!,
      ),
    }),
  ),
);
adminRouter.get(
  "/:section",
  handle(async (req, res) =>
    res.json({
      success: true,
      data: await listRecords(
        req.params.section,
        ListQuery.parse(req.query),
        req.user!,
      ),
    }),
  ),
);
async function command(
  req: Request,
  res: Response,
  work: () => Promise<unknown>,
) {
  const key = req.get("Idempotency-Key");
  if (!key || key.length > 200)
    throw errors.validation("A valid Idempotency-Key is required.");
  const data = await atomicCommand(
    "admin",
    req.user!.id,
    key,
    requestFingerprint(
      req.method,
      req.originalUrl,
      req.body,
      req.get("If-Match"),
    ),
    work,
  );
  res.json({ success: true, data });
}
adminRouter.post(
  "/content",
  handle((req, res) =>
    command(req, res, () =>
      saveCampaign(
        req.user!,
        req.body,
        undefined,
        undefined,
        res.getHeader("X-Request-ID") as string,
      ),
    ),
  ),
);
adminRouter.patch(
  "/content/:id",
  handle((req, res) =>
    command(req, res, () =>
      saveCampaign(
        req.user!,
        req.body,
        uuid(req.params.id),
        req.get("If-Match"),
        res.getHeader("X-Request-ID") as string,
      ),
    ),
  ),
);
adminRouter.post(
  "/access/invitations",
  handle((req, res) =>
    command(req, res, () =>
      manageAccess(
        req.user!,
        "invite",
        req.body,
        undefined,
        undefined,
        res.getHeader("X-Request-ID") as string,
      ),
    ),
  ),
);
adminRouter.post(
  "/access/:id/:action",
  handle((req, res) =>
    command(req, res, () => {
      const action = z.enum(["roles", "revoke"]).parse(req.params.action);
      return manageAccess(
        req.user!,
        action,
        req.body,
        uuid(req.params.id),
        req.get("If-Match"),
        res.getHeader("X-Request-ID") as string,
      );
    }),
  ),
);
adminRouter.post(
  "/:section/:id/:action",
  handle((req, res) =>
    command(req, res, async () => {
      const { section, action } = req.params,
        id = uuid(req.params.id);
      const requestId = res.getHeader("X-Request-ID") as string;
      if (["notes", "assign"].includes(action))
        return addNoteOrAssign(
          req.user!,
          section,
          id,
          action,
          req.get("If-Match"),
          req.body,
          requestId,
        );
      if (section === "refunds" && action === "review") {
        sectionPolicy(section, req.user!);
        throw errors.unavailable(
          "REFUND_PROCESSING_DEFERRED",
          "Provider refund dispatch remains in the dedicated payments release. The refund review is retained.",
        );
      }
      const routes: Record<string, string[]> = {
        customers: ["restrict", "restore", "privacy-review"],
        merchants: ["suspend", "restore"],
        catalogue: ["withdraw"],
        orders: ["escalate"],
        returns: ["escalate"],
        disputes: ["resolve"],
        support: ["reopen"],
        reconciliation: ["investigate", "recheck"],
        content: ["publish", "archive"],
      };
      if (!Object.hasOwn(routes, section) || !routes[section].includes(action))
        throw errors.notFound();
      return decide(
        req.user!,
        section,
        id,
        action,
        req.get("If-Match"),
        req.body,
        requestId,
      );
    }),
  ),
);
