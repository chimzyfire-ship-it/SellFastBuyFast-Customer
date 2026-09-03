import crypto from 'node:crypto';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  auditEvents,
  merchantMembers,
  merchantVerifications,
  merchants,
  outboxEvents,
  orders,
  products,
  profiles,
  returnRequests,
} from '../../db/schema.js';
import { errors, sendError } from '../../lib/errors.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';
import { assertVerificationSubmissionAllowed, VerificationStatus } from './vendor.policy.js';

export const vendorRouter = Router();
vendorRouter.use(requireAuth);

const BusinessProfileSchema = z.object({
  businessName: z.string().trim().min(3).max(180).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  contactEmail: z.string().trim().email().max(254).optional(),
  contactPhone: z.string().trim().min(7).max(40).optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one field is required.');

const VerificationSchema = z.object({
  cacNumber: z.string().trim().min(4).max(80),
  tinNumber: z.string().trim().min(5).max(80).optional(),
  idType: z.enum(['national_id', 'passport', 'drivers_license', 'voters_card']),
  idDocumentUrl: z.string().url().max(2000),
  utilityBillUrl: z.string().url().max(2000),
});

const MerchantOnboardingSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  businessName: z.string().trim().min(3).max(180),
  description: z.string().trim().min(10).max(5000).optional(),
  contactEmail: z.string().trim().email().max(254),
  contactPhone: z.string().trim().min(7).max(40),
  state: z.string().trim().min(2).max(80),
  lga: z.string().trim().min(2).max(120),
  address: z.string().trim().min(8).max(500),
  cacNumber: z.string().trim().min(4).max(80),
  tinNumber: z.string().trim().min(5).max(80).optional(),
  idType: z.enum(['national_id', 'passport', 'drivers_license', 'voters_card']),
  idDocumentUrl: z.string().url().max(2000),
  utilityBillUrl: z.string().url().max(2000),
});

const VerificationReviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: z.string().trim().min(3).max(1000),
});

function merchantSlugFor(businessName: string): string {
  const base = businessName.toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
  return `${base || 'merchant'}-${crypto.randomBytes(4).toString('hex')}`;
}

function assertMerchantAccess(req: Request, merchantId: string): void {
  if (!req.user!.merchantIds.includes(merchantId)) throw errors.forbidden('You do not belong to this merchant.');
}

function assertMerchantOwner(req: Request, merchantId: string): void {
  assertMerchantAccess(req, merchantId);
  if (req.user!.merchantRoles[merchantId] !== 'owner') {
    throw errors.forbidden('Only this merchant’s owner can change business or verification details.');
  }
}

function safeMerchant(merchant: typeof merchants.$inferSelect) {
  return {
    id: merchant.id,
    slug: merchant.slug,
    businessName: merchant.businessName,
    description: merchant.description,
    logoUrl: merchant.logoUrl,
    contactEmail: merchant.contactEmail,
    contactPhone: merchant.contactPhone,
    state: merchant.state,
    lga: merchant.lga,
    address: merchant.address,
    status: merchant.status,
    updatedAt: merchant.updatedAt,
  };
}

async function merchantForRequest(req: Request, merchantId: string) {
  assertMerchantAccess(req, merchantId);
  const [merchant] = await db.select().from(merchants).where(eq(merchants.id, merchantId)).limit(1);
  if (!merchant) throw errors.notFound('Merchant not found.');
  return merchant;
}

vendorRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const memberships = req.user!.merchantIds.length === 0
      ? []
      : await db.select({ merchant: merchants, memberRole: merchantMembers.role })
        .from(merchantMembers)
        .innerJoin(merchants, eq(merchants.id, merchantMembers.merchantId))
        .where(eq(merchantMembers.userId, req.user!.id))
        .orderBy(asc(merchants.businessName));
    res.json({
      success: true,
      data: {
        user: { id: req.user!.id, email: req.user!.email },
        merchants: memberships.map(({ merchant, memberRole }) => ({ ...safeMerchant(merchant), memberRole })),
      },
    });
  } catch (err) {
    sendError(res, err);
  }
});

vendorRouter.post('/onboarding', idempotency('vendor-onboarding'), async (req: Request, res: Response) => {
  try {
    const parsed = MerchantOnboardingSchema.safeParse(req.body);
    if (!parsed.success) throw errors.validation(parsed.error.message);
    const result = await db.transaction(async (tx) => {
      const existingMembership = await tx.select({ id: merchantMembers.id }).from(merchantMembers)
        .where(eq(merchantMembers.userId, req.user!.id)).limit(1).for('update');
      if (existingMembership.length > 0) {
        throw errors.conflict('MERCHANT_ALREADY_EXISTS', 'This account already belongs to a merchant workspace.');
      }

      const [profile] = await tx.select().from(profiles).where(eq(profiles.id, req.user!.id)).limit(1).for('update');
      if (profile) {
        await tx.update(profiles).set({
          fullName: parsed.data.fullName,
          phone: parsed.data.contactPhone,
          updatedAt: new Date(),
        }).where(eq(profiles.id, profile.id));
      } else {
        await tx.insert(profiles).values({
          id: req.user!.id,
          email: req.user!.email || parsed.data.contactEmail,
          fullName: parsed.data.fullName,
          phone: parsed.data.contactPhone,
        });
      }

      const [merchant] = await tx.insert(merchants).values({
        slug: merchantSlugFor(parsed.data.businessName),
        businessName: parsed.data.businessName,
        description: parsed.data.description,
        contactEmail: parsed.data.contactEmail,
        contactPhone: parsed.data.contactPhone,
        state: parsed.data.state,
        lga: parsed.data.lga,
        address: parsed.data.address,
        status: 'pending_verification',
      }).returning();
      await tx.insert(merchantMembers).values({ merchantId: merchant.id, userId: req.user!.id, role: 'owner' });
      const [verification] = await tx.insert(merchantVerifications).values({
        merchantId: merchant.id,
        cacNumber: parsed.data.cacNumber,
        tinNumber: parsed.data.tinNumber,
        idType: parsed.data.idType,
        idDocumentUrl: parsed.data.idDocumentUrl,
        utilityBillUrl: parsed.data.utilityBillUrl,
        status: 'pending',
      }).returning();
      await tx.insert(auditEvents).values({
        actorId: req.user!.id,
        action: 'merchant.onboarding_submitted',
        resourceType: 'merchant',
        resourceId: merchant.id,
        metadata: { verificationId: verification.id },
        ipAddress: req.ip,
      });
      await tx.insert(outboxEvents).values({
        type: 'merchant.verification_submitted',
        payload: { merchantId: merchant.id, verificationId: verification.id, submittedBy: req.user!.id },
      });
      return { merchant, verification };
    });
    res.status(201).json({
      success: true,
      data: {
        merchant: { ...safeMerchant(result.merchant), memberRole: 'owner' },
        verification: { status: result.verification.status, updatedAt: result.verification.updatedAt },
      },
    });
  } catch (err) {
    sendError(res, err);
  }
});

vendorRouter.get('/merchant/:merchantId/overview', async (req: Request, res: Response) => {
  try {
    const merchant = await merchantForRequest(req, req.params.merchantId);
    const merchantId = merchant.id;
    const [productRows, orderRows, returnRows, verificationRows] = await Promise.all([
      db.select({ id: products.id, status: products.status }).from(products)
        .where(eq(products.merchantId, merchantId)).limit(10_000),
      db.select({ id: orders.id, status: orders.status, createdAt: orders.createdAt }).from(orders)
        .where(eq(orders.merchantId, merchantId)).orderBy(desc(orders.createdAt)).limit(100),
      db.select({ id: returnRequests.id, status: returnRequests.status }).from(returnRequests)
        .where(eq(returnRequests.merchantId, merchantId)).limit(100),
      db.select({ status: merchantVerifications.status, rejectionReason: merchantVerifications.rejectionReason, updatedAt: merchantVerifications.updatedAt })
        .from(merchantVerifications).where(eq(merchantVerifications.merchantId, merchantId))
        .orderBy(desc(merchantVerifications.updatedAt)).limit(1),
    ]);

    const catalogue = { total: productRows.length, draft: 0, pendingApproval: 0, published: 0, rejected: 0, archived: 0 };
    for (const product of productRows) {
      if (product.status === 'draft') catalogue.draft += 1;
      if (product.status === 'pending_approval') catalogue.pendingApproval += 1;
      if (product.status === 'published') catalogue.published += 1;
      if (product.status === 'rejected') catalogue.rejected += 1;
      if (product.status === 'archived') catalogue.archived += 1;
    }
    const fulfilment = {
      awaitingAcceptance: orderRows.filter((order) => order.status === 'payment_confirmed').length,
      awaitingPacking: orderRows.filter((order) => order.status === 'processing').length,
      inTransit: orderRows.filter((order) => order.status === 'in_transit').length,
    };
    const returnsSummary = {
      open: returnRows.filter((request) => ['requested', 'approved', 'received', 'refund_initiated'].includes(request.status)).length,
      requested: returnRows.filter((request) => request.status === 'requested').length,
    };
    const verification = verificationRows[0] ?? { status: 'pending', rejectionReason: null, updatedAt: null };

    res.json({
      success: true,
      data: {
        merchant: safeMerchant(merchant),
        viewer: { memberRole: req.user!.merchantRoles[merchantId], isOwner: req.user!.merchantRoles[merchantId] === 'owner' },
        catalogue,
        fulfilment,
        returnRequests: returnsSummary,
        verification,
        paymentModule: { status: 'deferred', message: 'Payouts, settlement balances, and bank-recipient setup are unavailable until the dedicated payment module is released.' },
      },
    });
  } catch (err) {
    sendError(res, err);
  }
});

vendorRouter.get('/merchant/:merchantId/returns', async (req: Request, res: Response) => {
  try {
    await merchantForRequest(req, req.params.merchantId);
    const list = await db.select({ request: returnRequests, order: orders })
      .from(returnRequests)
      .innerJoin(orders, eq(orders.id, returnRequests.orderId))
      .where(eq(returnRequests.merchantId, req.params.merchantId))
      .orderBy(desc(returnRequests.createdAt)).limit(100);
    res.json({
      success: true,
      data: list.map(({ request, order }) => ({
        ...request,
        order: { id: order.id, orderNumber: order.orderNumber, status: order.status, createdAt: order.createdAt },
      })),
    });
  } catch (err) {
    sendError(res, err);
  }
});

vendorRouter.get('/merchant/:merchantId/team', async (req: Request, res: Response) => {
  try {
    await merchantForRequest(req, req.params.merchantId);
    const list = await db.select({
      id: merchantMembers.id,
      role: merchantMembers.role,
      createdAt: merchantMembers.createdAt,
      fullName: profiles.fullName,
      email: profiles.email,
      avatarUrl: profiles.avatarUrl,
    }).from(merchantMembers)
      .innerJoin(profiles, eq(profiles.id, merchantMembers.userId))
      .where(eq(merchantMembers.merchantId, req.params.merchantId))
      .orderBy(asc(merchantMembers.createdAt));
    res.json({ success: true, data: list });
  } catch (err) {
    sendError(res, err);
  }
});

vendorRouter.patch('/merchant/:merchantId/profile', idempotency('vendor-business-profile-update'), async (req: Request, res: Response) => {
  try {
    const parsed = BusinessProfileSchema.safeParse(req.body);
    if (!parsed.success) throw errors.validation(parsed.error.message);
    assertMerchantOwner(req, req.params.merchantId);
    const updated = await db.transaction(async (tx) => {
      const [merchant] = await tx.select().from(merchants).where(eq(merchants.id, req.params.merchantId)).limit(1).for('update');
      if (!merchant) throw errors.notFound('Merchant not found.');
      const [saved] = await tx.update(merchants).set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(merchants.id, merchant.id)).returning();
      await tx.insert(auditEvents).values({
        actorId: req.user!.id,
        action: 'merchant.business_profile_updated',
        resourceType: 'merchant',
        resourceId: merchant.id,
        metadata: { fields: Object.keys(parsed.data) },
        ipAddress: req.ip,
      });
      return saved;
    });
    res.json({ success: true, data: safeMerchant(updated) });
  } catch (err) {
    sendError(res, err);
  }
});

vendorRouter.get('/merchant/:merchantId/verification', async (req: Request, res: Response) => {
  try {
    assertMerchantOwner(req, req.params.merchantId);
    const [verification] = await db.select({
      status: merchantVerifications.status,
      rejectionReason: merchantVerifications.rejectionReason,
      updatedAt: merchantVerifications.updatedAt,
      createdAt: merchantVerifications.createdAt,
    }).from(merchantVerifications).where(eq(merchantVerifications.merchantId, req.params.merchantId))
      .orderBy(desc(merchantVerifications.updatedAt)).limit(1);
    res.json({ success: true, data: verification ?? { status: 'pending', rejectionReason: null, createdAt: null, updatedAt: null } });
  } catch (err) {
    sendError(res, err);
  }
});

vendorRouter.post('/merchant/:merchantId/verification', idempotency('vendor-verification-submit'), async (req: Request, res: Response) => {
  try {
    const parsed = VerificationSchema.safeParse(req.body);
    if (!parsed.success) throw errors.validation(parsed.error.message);
    assertMerchantOwner(req, req.params.merchantId);
    const verification = await db.transaction(async (tx) => {
      const [merchant] = await tx.select().from(merchants).where(eq(merchants.id, req.params.merchantId)).limit(1).for('update');
      if (!merchant) throw errors.notFound('Merchant not found.');
      const [existing] = await tx.select().from(merchantVerifications)
        .where(eq(merchantVerifications.merchantId, merchant.id)).orderBy(desc(merchantVerifications.updatedAt)).limit(1).for('update');
      assertVerificationSubmissionAllowed(existing?.status as VerificationStatus | undefined);
      const now = new Date();
      const values = { ...parsed.data, status: 'pending' as const, rejectionReason: null, reviewedBy: null, reviewedAt: null, updatedAt: now };
      const [saved] = existing
        ? await tx.update(merchantVerifications).set(values).where(eq(merchantVerifications.id, existing.id)).returning()
        : await tx.insert(merchantVerifications).values({ merchantId: merchant.id, ...values }).returning();
      await tx.insert(auditEvents).values({
        actorId: req.user!.id,
        action: existing ? 'merchant.verification_resubmitted' : 'merchant.verification_submitted',
        resourceType: 'merchant_verification',
        resourceId: saved.id,
        metadata: { merchantId: merchant.id },
        ipAddress: req.ip,
      });
      return saved;
    });
    res.status(201).json({
      success: true,
      data: { status: verification.status, rejectionReason: verification.rejectionReason, updatedAt: verification.updatedAt },
    });
  } catch (err) {
    sendError(res, err);
  }
});

vendorRouter.post(
  '/merchant/:merchantId/verification/review',
  requireRole('operations_admin', 'security_admin'),
  idempotency('vendor-verification-review'),
  async (req: Request, res: Response) => {
    try {
      const parsed = VerificationReviewSchema.safeParse(req.body);
      if (!parsed.success) throw errors.validation(parsed.error.message);
      const result = await db.transaction(async (tx) => {
        const [merchant] = await tx.select().from(merchants)
          .where(eq(merchants.id, req.params.merchantId)).limit(1).for('update');
        if (!merchant) throw errors.notFound('Merchant not found.');
        const [verification] = await tx.select().from(merchantVerifications)
          .where(eq(merchantVerifications.merchantId, merchant.id))
          .orderBy(desc(merchantVerifications.updatedAt)).limit(1).for('update');
        if (!verification) throw errors.notFound('Merchant verification not found.');
        if (verification.status !== 'pending') {
          throw errors.conflict('VERIFICATION_NOT_REVIEWABLE', 'Only pending verifications can be reviewed.');
        }
        const now = new Date();
        const [savedVerification] = await tx.update(merchantVerifications).set({
          status: parsed.data.decision,
          rejectionReason: parsed.data.decision === 'rejected' ? parsed.data.note : null,
          reviewedBy: req.user!.id,
          reviewedAt: now,
          updatedAt: now,
        }).where(eq(merchantVerifications.id, verification.id)).returning();
        const [savedMerchant] = await tx.update(merchants).set({
          status: parsed.data.decision === 'approved' ? 'active' : 'rejected',
          updatedAt: now,
        }).where(eq(merchants.id, merchant.id)).returning();
        await tx.insert(auditEvents).values({
          actorId: req.user!.id,
          action: `merchant.verification_${parsed.data.decision}`,
          resourceType: 'merchant_verification',
          resourceId: savedVerification.id,
          metadata: { merchantId: merchant.id, note: parsed.data.note },
          ipAddress: req.ip,
        });
        await tx.insert(outboxEvents).values({
          type: `merchant.verification_${parsed.data.decision}`,
          payload: { merchantId: merchant.id, verificationId: savedVerification.id, reviewedBy: req.user!.id, note: parsed.data.note },
        });
        return { merchant: savedMerchant, verification: savedVerification };
      });
      res.json({
        success: true,
        data: {
          merchant: safeMerchant(result.merchant),
          verification: { status: result.verification.status, rejectionReason: result.verification.rejectionReason, updatedAt: result.verification.updatedAt },
        },
      });
    } catch (err) {
      sendError(res, err);
    }
  }
);
