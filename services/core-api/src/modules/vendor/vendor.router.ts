import crypto from 'node:crypto';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  auditEvents,
  merchantMembers,
  merchantProfileDrafts,
  merchantVerifications,
  merchants,
  orders,
  products,
  profiles,
  returnRequests,
} from '../../db/schema.js';
import { encryptKycValue } from '../../lib/kyc.js';
import { errors, sendError } from '../../lib/errors.js';
import { supabaseAdmin } from '../../lib/supabase.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';
import {
  assertRegistrationSubmissionAllowed,
  assertStoreSlugAllowed,
  isNigerianPhone,
  normalizeNigerianPhone,
  normalizeStoreSlug,
  RegistrationState,
  VerificationStatus,
} from './vendor.policy.js';

export const vendorRouter = Router();
vendorRouter.use(requireAuth);

const NIGERIAN_STATES = [
  'Lagos State', 'Abuja FCT', 'Rivers State', 'Ogun State', 'Oyo State', 'Kano State',
  'Kaduna State', 'Enugu State', 'Delta State', 'Edo State', 'Anambra State', 'Akwa Ibom State',
  'Abia State', 'Ondo State', 'Osun State', 'Imo State', 'Plateau State', 'Kwara State',
  'Cross River State', 'Benue State', 'Ekiti State', 'Kogi State', 'Nasarawa State', 'Niger State',
  'Bauchi State', 'Borno State', 'Adamawa State', 'Gombe State', 'Taraba State', 'Yobe State',
  'Jigawa State', 'Katsina State', 'Kebbi State', 'Sokoto State', 'Zamfara State', 'Bayelsa State',
  'Ebonyi State',
] as const;

const NigerianStateSchema = z.enum(NIGERIAN_STATES);
const FulfillmentSlaSchema = z.enum(['same_day', 'next_day', '48_hours']);
const IdentityDocumentTypeSchema = z.enum(['national_id', 'passport', 'drivers_license', 'voters_card']);
const KycDocumentKindSchema = z.enum(['identity_document', 'utility_bill']);
const KycContentTypeSchema = z.enum(['application/pdf', 'image/jpeg', 'image/png']);
const HttpsUrlSchema = z.string().trim().url().max(2_000)
  .refine((value) => new URL(value).protocol === 'https:', 'Must be an HTTPS URL.');
const NigerianPhoneSchema = z.string().trim()
  .transform(normalizeNigerianPhone)
  .refine(isNigerianPhone, 'Use a valid Nigerian mobile number, for example +2348034567890.');
const StoreSlugSchema = z.string().trim().min(1).max(160)
  .transform(normalizeStoreSlug)
  .refine(
    (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length >= 3 && value.length <= 80,
    'Store handle must be 3–80 lowercase letters, numbers, and single hyphens.'
  );
const CacNumberSchema = z.string().trim().toUpperCase()
  .regex(/^(?:RC|BN)-?[0-9]{4,12}$/, 'CAC number must use RC or BN followed by digits.');
const TinNumberSchema = z.string().trim()
  .regex(/^[0-9]{8,14}(?:-[0-9]{1,6})?$/, 'TIN must contain digits, optionally followed by a suffix.');
const DirectorNinSchema = z.string().trim().regex(/^[0-9]{11}$/, 'Director NIN must contain exactly 11 digits.');

const ProfileFields = {
  businessName: z.string().trim().min(2).max(100),
  slug: StoreSlugSchema,
  description: z.string().trim().max(1_000).nullable(),
  logoUrl: HttpsUrlSchema.nullable(),
  bannerUrl: HttpsUrlSchema.nullable(),
  contactEmail: z.string().trim().email().max(254),
  contactPhone: NigerianPhoneSchema,
  whatsappPhone: NigerianPhoneSchema.nullable(),
  address: z.string().trim().min(5).max(240),
  lga: z.string().trim().min(2).max(100),
  state: NigerianStateSchema,
  dispatchContactName: z.string().trim().min(2).max(120).nullable(),
  dispatchContactPhone: NigerianPhoneSchema.nullable(),
  fulfillmentSla: FulfillmentSlaSchema,
};

const StoreProfilePatchSchema = z.object(ProfileFields).partial().strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one profile field is required.');
const StoreProfileDraftSchema = z.object(ProfileFields).partial().strict()
  .refine((value) => Object.keys(value).length > 0, 'A draft must contain at least one profile field.');
const RegistrationSubmissionSchema = z.object({
  ...ProfileFields,
  dispatchContactName: z.string().trim().min(2).max(120),
  dispatchContactPhone: NigerianPhoneSchema,
  cacNumber: CacNumberSchema,
  tinNumber: TinNumberSchema.nullable(),
  directorNin: DirectorNinSchema,
  idType: IdentityDocumentTypeSchema,
  idDocumentPath: z.string().trim().min(1).max(500),
  utilityBillPath: z.string().trim().min(1).max(500),
}).strict();
const KycUploadUrlSchema = z.object({
  kind: KycDocumentKindSchema,
  contentType: KycContentTypeSchema,
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
}).strict();
const VacationModeSchema = z.object({
  enabled: z.boolean(),
  reason: z.string().trim().min(3).max(500),
}).strict();
const RegistrationDecisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z.string().trim().min(3).max(1_000),
}).strict();

function validationError(parsed: { error: z.ZodError }): never {
  throw errors.validation(parsed.error.issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`).join('; '));
}

function assertPayloadSlug(value: { slug?: string }): void {
  if (value.slug) assertStoreSlugAllowed(value.slug);
}

function assertMerchantAccess(req: Request, merchantId: string): void {
  if (!req.user!.merchantIds.includes(merchantId)) throw errors.forbidden('You do not belong to this merchant.');
}

function assertMerchantProfileEditor(req: Request, merchantId: string): void {
  assertMerchantAccess(req, merchantId);
  if (!['owner', 'manager'].includes(req.user!.merchantRoles[merchantId])) {
    throw errors.forbidden('Only the merchant owner or manager can edit store-profile details.');
  }
}

function assertMerchantOwner(req: Request, merchantId: string): void {
  assertMerchantAccess(req, merchantId);
  if (req.user!.merchantRoles[merchantId] !== 'owner') {
    throw errors.forbidden('Only this merchant’s owner can submit or change legal-entity information.');
  }
}

function safeMerchant(merchant: typeof merchants.$inferSelect) {
  return {
    id: merchant.id,
    merchantId: merchant.id,
    slug: merchant.slug,
    businessName: merchant.businessName,
    description: merchant.description,
    logoUrl: merchant.logoUrl,
    bannerUrl: merchant.bannerUrl,
    contactEmail: merchant.contactEmail,
    contactPhone: merchant.contactPhone,
    whatsappPhone: merchant.whatsappPhone,
    state: merchant.state,
    lga: merchant.lga,
    address: merchant.address,
    dispatchContactName: merchant.dispatchContactName,
    dispatchContactPhone: merchant.dispatchContactPhone,
    fulfillmentSla: merchant.fulfillmentSla,
    vacationMode: merchant.vacationMode,
    registrationState: merchant.registrationState,
    status: merchant.status,
    updatedAt: merchant.updatedAt,
  };
}

function safeVerification(verification: typeof merchantVerifications.$inferSelect | undefined) {
  if (!verification) {
    return {
      status: 'not_submitted' as const,
      cacNumber: null,
      tinNumber: null,
      directorNinLast4: null,
      rejectionReason: null,
      createdAt: null,
      updatedAt: null,
    };
  }
  return {
    status: verification.status,
    cacNumber: verification.cacNumber,
    tinNumber: verification.tinNumber,
    directorNinLast4: verification.directorNinLast4,
    rejectionReason: verification.rejectionReason,
    createdAt: verification.createdAt,
    updatedAt: verification.updatedAt,
  };
}

async function merchantForRequest(req: Request, merchantId: string) {
  assertMerchantAccess(req, merchantId);
  const [merchant] = await db.select().from(merchants).where(eq(merchants.id, merchantId)).limit(1);
  if (!merchant) throw errors.notFound('Merchant not found.');
  return merchant;
}

function sendVendorError(res: Response, error: unknown): void {
  const code = typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: unknown }).code : undefined;
  if (code === '23505') {
    sendError(res, errors.conflict('SLUG_ALREADY_EXISTS', 'This store handle is already claimed by another merchant.'));
    return;
  }
  sendError(res, error);
}

function kycObjectPath(merchantId: string, path: string): boolean {
  return new RegExp(`^${merchantId}/(?:identity_document|utility_bill)/[a-f0-9-]{36}\\.(?:pdf|jpg|png)$`).test(path);
}

function extensionForKycContentType(contentType: z.infer<typeof KycContentTypeSchema>): 'pdf' | 'jpg' | 'png' {
  if (contentType === 'application/pdf') return 'pdf';
  if (contentType === 'image/jpeg') return 'jpg';
  return 'png';
}

async function assertPrivateKycObjectExists(merchantId: string, path: string): Promise<void> {
  if (!kycObjectPath(merchantId, path)) {
    throw errors.validation('KYC document paths must be issued for this merchant by the upload endpoint.');
  }
  const lastSlash = path.lastIndexOf('/');
  const folder = path.slice(0, lastSlash);
  const filename = path.slice(lastSlash + 1);
  const { data, error } = await supabaseAdmin.storage.from('merchant-kyc').list(folder, { limit: 1, search: filename });
  if (error || !data?.some((item) => item.name === filename)) {
    throw errors.validation('Upload both KYC documents before submitting registration.');
  }
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
  } catch (error) {
    sendError(res, error);
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
    const role = req.user!.merchantRoles[merchantId];
    const verification = verificationRows[0] ?? { status: 'not_submitted', rejectionReason: null, updatedAt: null };

    res.json({
      success: true,
      data: {
        merchant: safeMerchant(merchant),
        viewer: {
          memberRole: role,
          isOwner: role === 'owner',
          canEditProfile: role === 'owner' || role === 'manager',
          canSubmitRegistration: role === 'owner',
        },
        catalogue,
        fulfilment,
        returnRequests: returnsSummary,
        verification,
        paymentModule: { status: 'deferred', message: 'Payouts, settlement balances, and bank-recipient setup are unavailable until the dedicated payment module is released.' },
      },
    });
  } catch (error) {
    sendError(res, error);
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
  } catch (error) {
    sendError(res, error);
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
  } catch (error) {
    sendError(res, error);
  }
});

vendorRouter.patch('/merchant/:merchantId/profile', idempotency('vendor-store-profile-update'), async (req: Request, res: Response) => {
  try {
    const parsed = StoreProfilePatchSchema.safeParse(req.body);
    if (!parsed.success) validationError(parsed);
    assertPayloadSlug(parsed.data);
    assertMerchantProfileEditor(req, req.params.merchantId);
    const updated = await db.transaction(async (tx) => {
      const [merchant] = await tx.select().from(merchants).where(eq(merchants.id, req.params.merchantId)).limit(1).for('update');
      if (!merchant) throw errors.notFound('Merchant not found.');
      const [saved] = await tx.update(merchants).set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(merchants.id, merchant.id)).returning();
      await tx.insert(auditEvents).values({
        actorId: req.user!.id,
        action: 'merchant.store_profile_updated',
        resourceType: 'merchant',
        resourceId: merchant.id,
        metadata: { fields: Object.keys(parsed.data) },
        ipAddress: req.ip,
      });
      return saved;
    });
    res.json({ success: true, data: safeMerchant(updated) });
  } catch (error) {
    sendVendorError(res, error);
  }
});

vendorRouter.get('/merchant/:merchantId/profile/draft', async (req: Request, res: Response) => {
  try {
    assertMerchantProfileEditor(req, req.params.merchantId);
    const [draft] = await db.select().from(merchantProfileDrafts)
      .where(eq(merchantProfileDrafts.merchantId, req.params.merchantId)).limit(1);
    res.json({ success: true, data: draft ? { draft: draft.data, updatedAt: draft.updatedAt } : null });
  } catch (error) {
    sendError(res, error);
  }
});

vendorRouter.put('/merchant/:merchantId/profile/draft', idempotency('vendor-store-profile-draft'), async (req: Request, res: Response) => {
  try {
    const parsed = StoreProfileDraftSchema.safeParse(req.body);
    if (!parsed.success) validationError(parsed);
    assertPayloadSlug(parsed.data);
    assertMerchantProfileEditor(req, req.params.merchantId);
    const saved = await db.transaction(async (tx) => {
      const [merchant] = await tx.select({ id: merchants.id }).from(merchants)
        .where(eq(merchants.id, req.params.merchantId)).limit(1).for('update');
      if (!merchant) throw errors.notFound('Merchant not found.');
      const now = new Date();
      const [draft] = await tx.insert(merchantProfileDrafts).values({
        merchantId: merchant.id,
        data: parsed.data,
        updatedBy: req.user!.id,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: merchantProfileDrafts.merchantId,
        set: { data: parsed.data, updatedBy: req.user!.id, updatedAt: now },
      }).returning();
      await tx.insert(auditEvents).values({
        actorId: req.user!.id,
        action: 'merchant.store_profile_draft_saved',
        resourceType: 'merchant',
        resourceId: merchant.id,
        metadata: { fields: Object.keys(parsed.data) },
        ipAddress: req.ip,
      });
      return draft;
    });
    res.json({ success: true, data: { draft: saved.data, updatedAt: saved.updatedAt } });
  } catch (error) {
    sendVendorError(res, error);
  }
});

vendorRouter.delete('/merchant/:merchantId/profile/draft', idempotency('vendor-store-profile-draft-discard'), async (req: Request, res: Response) => {
  try {
    assertMerchantProfileEditor(req, req.params.merchantId);
    const deleted = await db.transaction(async (tx) => {
      const [merchant] = await tx.select({ id: merchants.id }).from(merchants)
        .where(eq(merchants.id, req.params.merchantId)).limit(1).for('update');
      if (!merchant) throw errors.notFound('Merchant not found.');
      const removed = await tx.delete(merchantProfileDrafts)
        .where(eq(merchantProfileDrafts.merchantId, merchant.id)).returning({ merchantId: merchantProfileDrafts.merchantId });
      await tx.insert(auditEvents).values({
        actorId: req.user!.id,
        action: 'merchant.store_profile_draft_discarded',
        resourceType: 'merchant',
        resourceId: merchant.id,
        metadata: {},
        ipAddress: req.ip,
      });
      return removed.length > 0;
    });
    res.json({ success: true, data: { deleted } });
  } catch (error) {
    sendError(res, error);
  }
});

vendorRouter.post('/merchant/:merchantId/registration/upload-url', idempotency('vendor-registration-upload-url'), async (req: Request, res: Response) => {
  try {
    const parsed = KycUploadUrlSchema.safeParse(req.body);
    if (!parsed.success) validationError(parsed);
    assertMerchantOwner(req, req.params.merchantId);
    const [merchant] = await db.select({ id: merchants.id, registrationState: merchants.registrationState })
      .from(merchants).where(eq(merchants.id, req.params.merchantId)).limit(1);
    if (!merchant) throw errors.notFound('Merchant not found.');
    if (merchant.registrationState === 'registered') {
      throw errors.conflict('REGISTRATION_LOCKED', 'Approved legal-entity information cannot be changed by the merchant.');
    }
    if (merchant.registrationState === 'in_review') {
      throw errors.conflict('REGISTRATION_UNDER_REVIEW', 'This registration is already under review.');
    }
    const extension = extensionForKycContentType(parsed.data.contentType);
    const path = `${merchant.id}/${parsed.data.kind}/${crypto.randomUUID()}.${extension}`;
    const { data, error } = await supabaseAdmin.storage.from('merchant-kyc').createSignedUploadUrl(path);
    if (error || !data) throw errors.unavailable('KYC_UPLOAD_UNAVAILABLE', 'A private document-upload URL could not be created.');
    res.status(201).json({
      success: true,
      data: { path, token: data.token, signedUrl: data.signedUrl, expiresInSeconds: 120 },
    });
  } catch (error) {
    sendError(res, error);
  }
});

vendorRouter.post('/merchant/:merchantId/registration', idempotency('vendor-registration-submit'), async (req: Request, res: Response) => {
  try {
    const parsed = RegistrationSubmissionSchema.safeParse(req.body);
    if (!parsed.success) validationError(parsed);
    assertPayloadSlug(parsed.data);
    assertMerchantOwner(req, req.params.merchantId);
    await Promise.all([
      assertPrivateKycObjectExists(req.params.merchantId, parsed.data.idDocumentPath),
      assertPrivateKycObjectExists(req.params.merchantId, parsed.data.utilityBillPath),
    ]);
    const result = await db.transaction(async (tx) => {
      const [merchant] = await tx.select().from(merchants).where(eq(merchants.id, req.params.merchantId)).limit(1).for('update');
      if (!merchant) throw errors.notFound('Merchant not found.');
      const [existing] = await tx.select().from(merchantVerifications)
        .where(eq(merchantVerifications.merchantId, merchant.id))
        .orderBy(desc(merchantVerifications.updatedAt)).limit(1).for('update');
      assertRegistrationSubmissionAllowed(
        merchant.registrationState as RegistrationState,
        existing?.status as VerificationStatus | undefined
      );

      const {
        cacNumber,
        tinNumber,
        directorNin,
        idType,
        idDocumentPath,
        utilityBillPath,
        ...profile
      } = parsed.data;
      const now = new Date();
      const [savedMerchant] = await tx.update(merchants).set({
        ...profile,
        registrationState: 'in_review',
        status: 'pending_verification',
        vacationMode: false,
        updatedAt: now,
      }).where(eq(merchants.id, merchant.id)).returning();
      const verificationValues = {
        cacNumber,
        tinNumber,
        directorNinEncrypted: encryptKycValue(directorNin),
        directorNinLast4: directorNin.slice(-4),
        idType,
        idDocumentUrl: idDocumentPath,
        utilityBillUrl: utilityBillPath,
        status: 'pending' as const,
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null,
        updatedAt: now,
      };
      const [verification] = existing
        ? await tx.update(merchantVerifications).set(verificationValues).where(eq(merchantVerifications.id, existing.id)).returning()
        : await tx.insert(merchantVerifications).values({ merchantId: merchant.id, ...verificationValues }).returning();
      await tx.delete(merchantProfileDrafts).where(eq(merchantProfileDrafts.merchantId, merchant.id));
      await tx.insert(auditEvents).values({
        actorId: req.user!.id,
        action: existing ? 'merchant.registration_resubmitted' : 'merchant.registration_submitted',
        resourceType: 'merchant_verification',
        resourceId: verification.id,
        metadata: { merchantId: merchant.id },
        ipAddress: req.ip,
      });
      return { merchant: savedMerchant, verification };
    });
    res.status(202).json({
      success: true,
      data: { merchant: safeMerchant(result.merchant), verification: safeVerification(result.verification) },
    });
  } catch (error) {
    sendVendorError(res, error);
  }
});

vendorRouter.post('/merchant/:merchantId/vacation-mode', idempotency('vendor-vacation-mode'), async (req: Request, res: Response) => {
  try {
    const parsed = VacationModeSchema.safeParse(req.body);
    if (!parsed.success) validationError(parsed);
    assertMerchantProfileEditor(req, req.params.merchantId);
    const updated = await db.transaction(async (tx) => {
      const [merchant] = await tx.select().from(merchants).where(eq(merchants.id, req.params.merchantId)).limit(1).for('update');
      if (!merchant) throw errors.notFound('Merchant not found.');
      if (merchant.status !== 'active' || merchant.registrationState !== 'registered') {
        throw errors.conflict('MERCHANT_NOT_ELIGIBLE', 'Only an active, registered merchant can change vacation mode.');
      }
      const [saved] = await tx.update(merchants).set({ vacationMode: parsed.data.enabled, updatedAt: new Date() })
        .where(eq(merchants.id, merchant.id)).returning();
      await tx.insert(auditEvents).values({
        actorId: req.user!.id,
        action: 'merchant.vacation_mode_changed',
        resourceType: 'merchant',
        resourceId: merchant.id,
        metadata: { enabled: parsed.data.enabled, reason: parsed.data.reason },
        ipAddress: req.ip,
      });
      return saved;
    });
    res.json({ success: true, data: safeMerchant(updated) });
  } catch (error) {
    sendError(res, error);
  }
});

vendorRouter.get('/merchant/:merchantId/verification', async (req: Request, res: Response) => {
  try {
    assertMerchantOwner(req, req.params.merchantId);
    const [verification] = await db.select().from(merchantVerifications)
      .where(eq(merchantVerifications.merchantId, req.params.merchantId))
      .orderBy(desc(merchantVerifications.updatedAt)).limit(1);
    res.json({ success: true, data: safeVerification(verification) });
  } catch (error) {
    sendError(res, error);
  }
});

vendorRouter.post(
  '/merchant/:merchantId/registration/decision',
  requireRole('operations_admin', 'security_admin'),
  idempotency('merchant-registration-decision'),
  async (req: Request, res: Response) => {
    try {
      const parsed = RegistrationDecisionSchema.safeParse(req.body);
      if (!parsed.success) validationError(parsed);
      const result = await db.transaction(async (tx) => {
        const [merchant] = await tx.select().from(merchants).where(eq(merchants.id, req.params.merchantId)).limit(1).for('update');
        if (!merchant) throw errors.notFound('Merchant not found.');
        if (merchant.registrationState !== 'in_review') {
          throw errors.conflict('REGISTRATION_NOT_UNDER_REVIEW', 'Only registrations under review can be decided.');
        }
        const [verification] = await tx.select().from(merchantVerifications)
          .where(eq(merchantVerifications.merchantId, merchant.id))
          .orderBy(desc(merchantVerifications.updatedAt)).limit(1).for('update');
        if (!verification || verification.status !== 'pending') {
          throw errors.conflict('VERIFICATION_NOT_PENDING', 'A pending verification is required before this decision.');
        }
        const now = new Date();
        const approved = parsed.data.decision === 'approve';
        const [savedVerification] = await tx.update(merchantVerifications).set({
          status: approved ? 'approved' : 'rejected',
          rejectionReason: approved ? null : parsed.data.note,
          reviewedBy: req.user!.id,
          reviewedAt: now,
          updatedAt: now,
        }).where(eq(merchantVerifications.id, verification.id)).returning();
        const [savedMerchant] = await tx.update(merchants).set({
          registrationState: approved ? 'registered' : 'not_registered',
          status: approved ? 'active' : 'rejected',
          updatedAt: now,
        }).where(eq(merchants.id, merchant.id)).returning();
        await tx.insert(auditEvents).values({
          actorId: req.user!.id,
          action: approved ? 'merchant.registration_approved' : 'merchant.registration_rejected',
          resourceType: 'merchant_verification',
          resourceId: verification.id,
          metadata: { merchantId: merchant.id, note: parsed.data.note },
          ipAddress: req.ip,
        });
        return { merchant: savedMerchant, verification: savedVerification };
      });
      res.json({
        success: true,
        data: { merchant: safeMerchant(result.merchant), verification: safeVerification(result.verification) },
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

/**
 * Legacy verification submission is intentionally retired. Registration must
 * submit the complete profile and encrypted director identity atomically.
 */
vendorRouter.post('/merchant/:merchantId/verification', (_req: Request, _res: Response) => {
  throw errors.conflict('VERIFICATION_ENDPOINT_RETIRED', 'Use POST /registration to submit legal-entity verification.');
});
