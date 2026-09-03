import crypto from 'node:crypto';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  auditEvents,
  brands,
  categories,
  inventoryLevels,
  merchants,
  merchantMembers,
  notifications,
  outboxEvents,
  productMedia,
  productModerationLogs,
  products,
  productVariants,
} from '../../db/schema.js';
import { errors, sendError } from '../../lib/errors.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';
import {
  assertProductReadyForSubmission,
  assertProductTransition,
  ProductStatus,
  requiresRemoderation,
} from './catalogManagement.policy.js';
import { recordInventoryTransaction } from '../inventory/inventory.service.js';

export const catalogManagementRouter = Router();
catalogManagementRouter.use(requireAuth);

const ConditionSchema = z.enum(['brand_new', 'open_box', 'refurbished']);
const ReturnPolicySchema = z.enum(['7_day_escrow', 'inspection_only']);
const WarrantySchema = z.enum(['no_warranty', '30_days', '6_months', '1_year']);
const TagsSchema = z.array(z.string().trim().min(1).max(60)).max(20)
  .transform((tags) => [...new Set(tags.map((tag) => tag.toLowerCase()))]);
const WeightKgSchema = z.number().finite().positive().max(9_999.99);

const VariantSchema = z.object({
  sku: z.string().trim().min(2).max(80).optional(),
  title: z.string().trim().min(1).max(120).default('Default'),
  optionSize: z.string().trim().min(1).max(20).optional(),
  optionColor: z.string().trim().min(1).max(30).optional(),
  priceMinor: z.number().int().positive().safe(),
  attributes: z.record(z.unknown()).default({}),
  availableQuantity: z.number().int().min(0).max(1_000_000).default(0),
  lowStockThreshold: z.number().int().min(0).max(100_000).default(3),
});
const MediaSchema = z.object({
  mediaUrl: z.string().url().max(2000),
  mediaType: z.enum(['image', 'video']).default('image'),
  altText: z.string().trim().max(240).optional(),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});
const CreateProductSchema = z.object({
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(180),
  brand: z.string().trim().min(2).max(100).default('SellFast Signature'),
  condition: ConditionSchema.default('brand_new'),
  description: z.string().trim().min(10).max(10_000),
  comparePriceMinor: z.number().int().positive().safe().optional(),
  weightKg: WeightKgSchema.default(0.85),
  dimensionsCm: z.string().trim().min(3).max(60).default('33 × 21 × 12'),
  returnPolicy: ReturnPolicySchema.default('7_day_escrow'),
  warranty: WarrantySchema.default('30_days'),
  tags: TagsSchema.default([]),
  variants: z.array(VariantSchema).min(1).max(100),
  media: z.array(MediaSchema).max(30).default([]),
}).superRefine((value, ctx) => {
  const base = Math.min(...value.variants.map((variant) => variant.priceMinor));
  if (value.comparePriceMinor !== undefined && value.comparePriceMinor <= base) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['comparePriceMinor'], message: 'Compare price must exceed the lowest variant price.' });
  }
});
const UpdateProductSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  brandId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(3).max(180).optional(),
  brand: z.string().trim().min(2).max(100).optional(),
  condition: ConditionSchema.optional(),
  description: z.string().trim().min(10).max(10_000).optional(),
  comparePriceMinor: z.number().int().positive().safe().nullable().optional(),
  weightKg: WeightKgSchema.optional(),
  dimensionsCm: z.string().trim().min(3).max(60).optional(),
  returnPolicy: ReturnPolicySchema.optional(),
  warranty: WarrantySchema.optional(),
  tags: TagsSchema.optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one field is required.');
const UpdateVariantSchema = z.object({
  sku: z.string().trim().min(2).max(80).optional(),
  title: z.string().trim().min(1).max(120).optional(),
  optionSize: z.string().trim().min(1).max(20).nullable().optional(),
  optionColor: z.string().trim().min(1).max(30).nullable().optional(),
  attributes: z.record(z.unknown()).optional(),
  priceMinor: z.number().int().positive().safe().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one field is required.');
const UpdateMediaSchema = z.object({
  mediaUrl: z.string().url().max(2_000).optional(),
  altText: z.string().trim().max(240).nullable().optional(),
  sortOrder: z.number().int().min(0).max(1_000).optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one field is required.');
const InventorySchema = z.object({
  availableQuantity: z.number().int().min(0).max(1_000_000),
  lowStockThreshold: z.number().int().min(0).max(100_000).optional(),
});
const ModerationSchema = z.object({
  decision: z.enum(['publish', 'reject']),
  note: z.string().trim().min(3).max(1000),
});

const platformRoles = new Set(['catalogue_moderator', 'operations_admin', 'security_admin']);
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function assertMerchantAccess(req: Request, merchantId: string): void {
  const platform = req.user!.roles.some((role) => platformRoles.has(role));
  if (!platform && !req.user!.merchantIds.includes(merchantId)) throw errors.forbidden();
}

function slugFor(title: string): string {
  const base = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
  return `${base || 'product'}-${crypto.randomBytes(4).toString('hex')}`;
}

async function notifyMerchantMembers(
  tx: Tx,
  merchantId: string,
  input: { type: string; title: string; body: string; data: Record<string, unknown> }
): Promise<void> {
  const members = await tx
    .select({ userId: merchantMembers.userId })
    .from(merchantMembers)
    .where(eq(merchantMembers.merchantId, merchantId));
  if (members.length === 0) return;
  await tx.insert(notifications).values(members.map((member) => ({ userId: member.userId, ...input })));
}

async function detailedProducts(merchantId: string) {
  const list = await db.select().from(products).where(eq(products.merchantId, merchantId))
    .orderBy(asc(products.createdAt));
  if (list.length === 0) return [];
  const ids = list.map((product) => product.id);
  const [variants, media] = await Promise.all([
    db.select({ variant: productVariants, inventory: inventoryLevels })
      .from(productVariants)
      .leftJoin(inventoryLevels, eq(inventoryLevels.variantId, productVariants.id))
      .where(inArray(productVariants.productId, ids)),
    db.select().from(productMedia).where(inArray(productMedia.productId, ids)).orderBy(asc(productMedia.sortOrder)),
  ]);
  return list.map((product) => ({
    ...product,
    variants: variants.filter((item) => item.variant.productId === product.id).map((item) => ({
      ...item.variant,
      availableQuantity: item.inventory?.availableQuantity ?? 0,
      reservedQuantity: item.inventory?.reservedQuantity ?? 0,
      lowStockThreshold: item.inventory?.lowStockThreshold ?? 3,
    })),
    media: media.filter((item) => item.productId === product.id),
  }));
}

catalogManagementRouter.get('/merchant/:merchantId/products', async (req: Request, res: Response) => {
  try {
    assertMerchantAccess(req, req.params.merchantId);
    res.json({ success: true, data: await detailedProducts(req.params.merchantId) });
  } catch (err) {
    sendError(res, err);
  }
});

catalogManagementRouter.post(
  '/merchant/:merchantId/products',
  requireRole('merchant_owner', 'merchant_staff', 'staff'),
  idempotency('catalog-product-create'),
  async (req: Request, res: Response) => {
    try {
      const parsed = CreateProductSchema.safeParse(req.body);
      if (!parsed.success) throw errors.validation(parsed.error.message);
      assertMerchantAccess(req, req.params.merchantId);
      const result = await db.transaction(async (tx) => {
        const [merchant] = await tx.select().from(merchants)
          .where(eq(merchants.id, req.params.merchantId)).limit(1).for('update');
        if (!merchant) throw errors.notFound('Merchant not found.');
        if (merchant.status !== 'active') {
          throw errors.conflict('MERCHANT_NOT_ACTIVE', 'Only an active merchant can create catalogue products.');
        }
        if (parsed.data.categoryId) {
          const [category] = await tx.select({ id: categories.id }).from(categories)
            .where(eq(categories.id, parsed.data.categoryId)).limit(1);
          if (!category) throw errors.validation('Category does not exist.');
        }
        if (parsed.data.brandId) {
          const [brand] = await tx.select({ id: brands.id }).from(brands)
            .where(eq(brands.id, parsed.data.brandId)).limit(1);
          if (!brand) throw errors.validation('Brand does not exist.');
        }
        const basePriceMinor = Math.min(...parsed.data.variants.map((variant) => variant.priceMinor));
        const [product] = await tx.insert(products).values({
          merchantId: merchant.id,
          categoryId: parsed.data.categoryId,
          brandId: parsed.data.brandId,
          brand: parsed.data.brand,
          condition: parsed.data.condition,
          title: parsed.data.title,
          slug: slugFor(parsed.data.title),
          description: parsed.data.description,
          basePriceMinor,
          comparePriceMinor: parsed.data.comparePriceMinor,
          weightKg: parsed.data.weightKg.toFixed(2),
          dimensionsCm: parsed.data.dimensionsCm,
          returnPolicy: parsed.data.returnPolicy,
          warranty: parsed.data.warranty,
          tags: parsed.data.tags,
          currency: 'NGN',
          status: 'draft',
        }).returning();
        const variants = await tx.insert(productVariants).values(parsed.data.variants.map((variant) => ({
          productId: product.id,
          sku: variant.sku,
          title: variant.title,
          optionSize: variant.optionSize,
          optionColor: variant.optionColor,
          priceMinor: variant.priceMinor,
          attributes: variant.attributes,
        }))).returning();
        await tx.insert(inventoryLevels).values(variants.map((variant, index) => ({
          variantId: variant.id,
          availableQuantity: parsed.data.variants[index].availableQuantity,
          reservedQuantity: 0,
          lowStockThreshold: parsed.data.variants[index].lowStockThreshold,
        })));
        await Promise.all(variants.map((variant, index) => recordInventoryTransaction(tx, {
          variantId: variant.id,
          delta: parsed.data.variants[index].availableQuantity,
          actionType: 'merchant_set',
          balanceAfter: parsed.data.variants[index].availableQuantity,
          referenceId: product.id,
          actorId: req.user!.id,
          note: 'Initial stock set when product draft was created',
        })));
        const media = parsed.data.media.length > 0
          ? await tx.insert(productMedia).values(parsed.data.media.map((item) => ({ ...item, productId: product.id }))).returning()
          : [];
        await tx.insert(auditEvents).values({
          actorId: req.user!.id,
          action: 'catalog.product_created',
          resourceType: 'product',
          resourceId: product.id,
          metadata: { merchantId: merchant.id },
          ipAddress: req.ip,
        });
        await tx.insert(outboxEvents).values({
          type: 'catalog.product_created',
          payload: { productId: product.id, merchantId: merchant.id },
        });
        return { ...product, variants, media };
      });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      sendError(res, err);
    }
  }
);

catalogManagementRouter.patch(
  '/variants/:id',
  requireRole('merchant_owner', 'merchant_staff', 'staff'),
  idempotency('catalog-variant-update'),
  async (req: Request, res: Response) => {
    try {
      const parsed = UpdateVariantSchema.safeParse(req.body);
      if (!parsed.success) throw errors.validation(parsed.error.message);
      const result = await db.transaction(async (tx) => {
        const [variant] = await tx.select().from(productVariants)
          .where(eq(productVariants.id, req.params.id)).limit(1).for('update');
        if (!variant) throw errors.notFound('Product variant not found.');
        const [product] = await tx.select().from(products)
          .where(eq(products.id, variant.productId)).limit(1).for('update');
        if (!product) throw errors.notFound('Product not found.');
        assertMerchantAccess(req, product.merchantId);
        if (!['draft', 'published', 'rejected'].includes(product.status)) {
          throw errors.conflict('PRODUCT_NOT_EDITABLE', 'A product under review cannot be edited.');
        }
        if (parsed.data.sku) {
          const [duplicate] = await tx.select({ id: productVariants.id }).from(productVariants)
            .where(and(
              eq(productVariants.productId, product.id),
              eq(productVariants.sku, parsed.data.sku),
              ne(productVariants.id, variant.id)
            )).limit(1);
          if (duplicate) throw errors.conflict('DUPLICATE_SKU', 'Another variant on this product already uses that SKU.');
        }
        const [updated] = await tx.update(productVariants).set({ ...parsed.data, updatedAt: new Date() })
          .where(eq(productVariants.id, variant.id)).returning();
        const variants = await tx.select({ priceMinor: productVariants.priceMinor }).from(productVariants)
          .where(eq(productVariants.productId, product.id));
        const basePriceMinor = Math.min(...variants.map((item) => item.priceMinor));
        if (product.comparePriceMinor !== null && product.comparePriceMinor <= basePriceMinor) {
          throw errors.validation('Compare price must exceed the lowest variant price.');
        }
        const returnedToDraft = product.status === 'published' || product.status === 'rejected';
        const [updatedProduct] = await tx.update(products).set({
          basePriceMinor,
          status: returnedToDraft ? 'draft' : product.status,
          rejectionReason: returnedToDraft ? null : product.rejectionReason,
          updatedAt: new Date(),
        }).where(eq(products.id, product.id)).returning();
        if (returnedToDraft) {
          await tx.insert(productModerationLogs).values({
            productId: product.id,
            action: 'reapproval_required',
            actorId: req.user!.id,
            note: product.status === 'rejected'
              ? 'Rejected product variant was corrected.'
              : 'Published product variant was changed.',
          });
          await notifyMerchantMembers(tx, product.merchantId, {
            type: 'catalog_reapproval_required',
            title: 'Product requires re-approval',
            body: `“${product.title}” was returned to draft because its variant details changed. Submit it for Operations review.`,
            data: { productId: product.id },
          });
        }
        await tx.insert(auditEvents).values({
          actorId: req.user!.id,
          action: 'catalog.variant_updated',
          resourceType: 'product_variant',
          resourceId: variant.id,
          metadata: { productId: product.id, fields: Object.keys(parsed.data), basePriceMinor, returnedToDraft },
          ipAddress: req.ip,
        });
        await tx.insert(outboxEvents).values({
          type: returnedToDraft ? 'catalog.product_reapproval_required' : 'catalog.product_updated',
          payload: { productId: product.id, merchantId: product.merchantId, changed: 'variant' },
        });
        return { ...updated, basePriceMinor, productStatus: updatedProduct.status };
      });
      res.json({ success: true, data: result });
    } catch (err) {
      sendError(res, err);
    }
  }
);

catalogManagementRouter.patch(
  '/media/:id',
  requireRole('merchant_owner', 'merchant_staff', 'staff'),
  idempotency('catalog-media-update'),
  async (req: Request, res: Response) => {
    try {
      const parsed = UpdateMediaSchema.safeParse(req.body);
      if (!parsed.success) throw errors.validation(parsed.error.message);
      const result = await db.transaction(async (tx) => {
        const [media] = await tx.select().from(productMedia)
          .where(eq(productMedia.id, req.params.id)).limit(1).for('update');
        if (!media) throw errors.notFound('Product media not found.');
        const [product] = await tx.select().from(products)
          .where(eq(products.id, media.productId)).limit(1).for('update');
        if (!product) throw errors.notFound('Product not found.');
        assertMerchantAccess(req, product.merchantId);
        if (!['draft', 'published', 'rejected'].includes(product.status)) {
          throw errors.conflict('PRODUCT_NOT_EDITABLE', 'A product under review cannot be edited.');
        }
        const visualChanged = parsed.data.mediaUrl !== undefined && parsed.data.mediaUrl !== media.mediaUrl;
        const returnedToDraft = product.status === 'rejected' || (product.status === 'published' && visualChanged);
        const [updatedMedia] = await tx.update(productMedia).set(parsed.data).where(eq(productMedia.id, media.id)).returning();
        let updatedProduct = product;
        if (returnedToDraft) {
          [updatedProduct] = await tx.update(products).set({ status: 'draft', rejectionReason: null, updatedAt: new Date() })
            .where(eq(products.id, product.id)).returning();
          await tx.insert(productModerationLogs).values({
            productId: product.id,
            action: 'reapproval_required',
            actorId: req.user!.id,
            note: product.status === 'rejected' ? 'Rejected product media was corrected.' : 'Published product image changed.',
          });
          await notifyMerchantMembers(tx, product.merchantId, {
            type: 'catalog_reapproval_required',
            title: 'Product requires re-approval',
            body: `“${product.title}” was returned to draft because its product image changed. Submit it for Operations review.`,
            data: { productId: product.id },
          });
        }
        await tx.insert(auditEvents).values({
          actorId: req.user!.id,
          action: 'catalog.media_updated',
          resourceType: 'product_media',
          resourceId: media.id,
          metadata: { productId: product.id, fields: Object.keys(parsed.data), returnedToDraft },
          ipAddress: req.ip,
        });
        await tx.insert(outboxEvents).values({
          type: returnedToDraft ? 'catalog.product_reapproval_required' : 'catalog.product_updated',
          payload: { productId: product.id, merchantId: product.merchantId, changed: 'media' },
        });
        return { media: updatedMedia, productStatus: updatedProduct.status };
      });
      res.json({ success: true, data: result });
    } catch (err) {
      sendError(res, err);
    }
  }
);

catalogManagementRouter.post(
  '/products/:id/media',
  requireRole('merchant_owner', 'merchant_staff', 'staff'),
  idempotency('catalog-media-create'),
  async (req: Request, res: Response) => {
    try {
      const parsed = MediaSchema.safeParse(req.body);
      if (!parsed.success) throw errors.validation(parsed.error.message);
      const result = await db.transaction(async (tx) => {
        const [product] = await tx.select().from(products)
          .where(eq(products.id, req.params.id)).limit(1).for('update');
        if (!product) throw errors.notFound('Product not found.');
        assertMerchantAccess(req, product.merchantId);
        if (!['draft', 'published', 'rejected'].includes(product.status)) {
          throw errors.conflict('PRODUCT_NOT_EDITABLE', 'A product under review cannot be edited.');
        }
        const returnedToDraft = product.status === 'published' || product.status === 'rejected';
        const [media] = await tx.insert(productMedia).values({ ...parsed.data, productId: product.id }).returning();
        let updatedProduct = product;
        if (returnedToDraft) {
          [updatedProduct] = await tx.update(products).set({ status: 'draft', rejectionReason: null, updatedAt: new Date() })
            .where(eq(products.id, product.id)).returning();
          await tx.insert(productModerationLogs).values({
            productId: product.id,
            action: 'reapproval_required',
            actorId: req.user!.id,
            note: product.status === 'rejected' ? 'Rejected product media was corrected.' : 'Media was added to a published product.',
          });
          await notifyMerchantMembers(tx, product.merchantId, {
            type: 'catalog_reapproval_required',
            title: 'Product requires re-approval',
            body: `“${product.title}” was returned to draft because product media changed. Submit it for Operations review.`,
            data: { productId: product.id },
          });
        }
        await tx.insert(auditEvents).values({
          actorId: req.user!.id,
          action: 'catalog.media_created',
          resourceType: 'product_media',
          resourceId: media.id,
          metadata: { productId: product.id, returnedToDraft },
          ipAddress: req.ip,
        });
        await tx.insert(outboxEvents).values({
          type: returnedToDraft ? 'catalog.product_reapproval_required' : 'catalog.product_updated',
          payload: { productId: product.id, merchantId: product.merchantId, changed: 'media' },
        });
        return { media, productStatus: updatedProduct.status };
      });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      sendError(res, err);
    }
  }
);

catalogManagementRouter.patch(
  '/products/:id',
  requireRole('merchant_owner', 'merchant_staff', 'staff'),
  idempotency('catalog-product-update'),
  async (req: Request, res: Response) => {
  try {
    const parsed = UpdateProductSchema.safeParse(req.body);
    if (!parsed.success) throw errors.validation(parsed.error.message);
    const updated = await db.transaction(async (tx) => {
      const [product] = await tx.select().from(products).where(eq(products.id, req.params.id)).limit(1).for('update');
      if (!product) throw errors.notFound('Product not found.');
      assertMerchantAccess(req, product.merchantId);
      if (!['draft', 'published', 'rejected'].includes(product.status)) {
        throw errors.conflict('PRODUCT_NOT_EDITABLE', 'A product under review cannot be edited.');
      }
      if (parsed.data.categoryId) {
        const [category] = await tx.select({ id: categories.id }).from(categories)
          .where(eq(categories.id, parsed.data.categoryId)).limit(1);
        if (!category) throw errors.validation('Category does not exist.');
      }
      if (parsed.data.brandId) {
        const [brand] = await tx.select({ id: brands.id }).from(brands)
          .where(eq(brands.id, parsed.data.brandId)).limit(1);
        if (!brand) throw errors.validation('Brand does not exist.');
      }
      if (
        parsed.data.comparePriceMinor !== undefined &&
        parsed.data.comparePriceMinor !== null &&
        parsed.data.comparePriceMinor <= product.basePriceMinor
      ) {
        throw errors.validation('Compare price must exceed the current base price.');
      }
      const { weightKg, ...productPatch } = parsed.data;
      const returnedToDraft = product.status === 'rejected' ||
        (product.status === 'published' && requiresRemoderation(parsed.data));
      const [saved] = await tx.update(products).set({
        ...productPatch,
        ...(weightKg === undefined ? {} : { weightKg: weightKg.toFixed(2) }),
        status: returnedToDraft ? 'draft' : product.status,
        rejectionReason: returnedToDraft ? null : product.rejectionReason,
        updatedAt: new Date(),
      }).where(eq(products.id, product.id)).returning();
      await tx.insert(auditEvents).values({
        actorId: req.user!.id,
        action: 'catalog.product_updated',
        resourceType: 'product',
        resourceId: product.id,
        metadata: { fields: Object.keys(parsed.data), returnedToDraft },
        ipAddress: req.ip,
      });
      if (returnedToDraft) {
        await tx.insert(productModerationLogs).values({
          productId: product.id,
          action: 'reapproval_required',
          actorId: req.user!.id,
          note: product.status === 'rejected'
            ? 'Rejected product specifications were corrected.'
            : 'Published listing taxonomy or specifications changed.',
        });
        await tx.insert(outboxEvents).values({
          type: 'catalog.product_reapproval_required',
          payload: { productId: product.id, merchantId: product.merchantId, fields: Object.keys(parsed.data) },
        });
        await notifyMerchantMembers(tx, product.merchantId, {
          type: 'catalog_reapproval_required',
          title: 'Product requires re-approval',
          body: `“${saved.title}” was returned to draft because listing details changed. Submit it for Operations review.`,
          data: { productId: saved.id },
        });
      }
      return saved;
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    sendError(res, err);
  }
  }
);

catalogManagementRouter.patch(
  '/variants/:id/inventory',
  requireRole('merchant_owner', 'merchant_staff', 'staff'),
  idempotency('catalog-inventory-set'),
  async (req: Request, res: Response) => {
  try {
    const parsed = InventorySchema.safeParse(req.body);
    if (!parsed.success) throw errors.validation(parsed.error.message);
    const result = await db.transaction(async (tx) => {
      const [record] = await tx.select({ variant: productVariants, product: products })
        .from(productVariants).innerJoin(products, eq(products.id, productVariants.productId))
        .where(eq(productVariants.id, req.params.id)).limit(1).for('update');
      if (!record) throw errors.notFound('Product variant not found.');
      assertMerchantAccess(req, record.product.merchantId);
      const [existing] = await tx.select().from(inventoryLevels)
        .where(eq(inventoryLevels.variantId, record.variant.id)).limit(1).for('update');
      const [inventory] = existing
        ? await tx.update(inventoryLevels)
          .set({
            availableQuantity: parsed.data.availableQuantity,
            ...(parsed.data.lowStockThreshold === undefined ? {} : { lowStockThreshold: parsed.data.lowStockThreshold }),
            updatedAt: new Date(),
          })
          .where(eq(inventoryLevels.variantId, record.variant.id)).returning()
        : await tx.insert(inventoryLevels).values({
          variantId: record.variant.id,
          availableQuantity: parsed.data.availableQuantity,
          reservedQuantity: 0,
          lowStockThreshold: parsed.data.lowStockThreshold ?? 3,
        }).returning();
      await recordInventoryTransaction(tx, {
        variantId: record.variant.id,
        delta: parsed.data.availableQuantity - (existing?.availableQuantity ?? 0),
        actionType: 'merchant_set',
        balanceAfter: inventory.availableQuantity,
        referenceId: req.headers['idempotency-key'] as string | undefined,
        actorId: req.user!.id,
        note: 'Merchant set available inventory; active reservations were preserved.',
      });
      await tx.insert(auditEvents).values({
        actorId: req.user!.id,
        action: 'catalog.inventory_set',
        resourceType: 'product_variant',
        resourceId: record.variant.id,
        metadata: {
          availableQuantity: inventory.availableQuantity,
          reservedQuantity: inventory.reservedQuantity,
          lowStockThreshold: inventory.lowStockThreshold,
        },
        ipAddress: req.ip,
      });
      await tx.insert(outboxEvents).values({
        type: 'catalog.inventory_updated',
        payload: {
          productId: record.product.id,
          variantId: record.variant.id,
          availableQuantity: inventory.availableQuantity,
          reservedQuantity: inventory.reservedQuantity,
          lowStockThreshold: inventory.lowStockThreshold,
        },
      });
      return inventory;
    });
    res.json({ success: true, data: result });
  } catch (err) {
    sendError(res, err);
  }
  }
);

catalogManagementRouter.post(
  '/products/:id/submit',
  requireRole('merchant_owner', 'merchant_staff', 'staff'),
  idempotency('catalog-product-submit'),
  async (req: Request, res: Response) => {
  try {
    const result = await db.transaction(async (tx) => {
      const [product] = await tx.select().from(products).where(eq(products.id, req.params.id)).limit(1).for('update');
      if (!product) throw errors.notFound('Product not found.');
      assertMerchantAccess(req, product.merchantId);
      assertProductTransition(product.status as ProductStatus, 'pending_approval');
      const [categoryRows, variants, media] = await Promise.all([
        product.categoryId
          ? tx.select({ isActive: categories.isActive, parentId: categories.parentId }).from(categories)
            .where(eq(categories.id, product.categoryId)).limit(1)
          : Promise.resolve([]),
        tx.select({ sku: productVariants.sku, priceMinor: productVariants.priceMinor }).from(productVariants)
          .where(eq(productVariants.productId, product.id)),
        tx.select({ mediaType: productMedia.mediaType }).from(productMedia)
          .where(eq(productMedia.productId, product.id)),
      ]);
      assertProductReadyForSubmission({
        description: product.description,
        category: categoryRows[0] ?? null,
        variants,
        media,
      });
      const [updated] = await tx.update(products).set({ status: 'pending_approval', updatedAt: new Date() })
        .where(eq(products.id, product.id)).returning();
      await tx.insert(outboxEvents).values({ type: 'catalog.product_submitted', payload: { productId: product.id } });
      await tx.insert(productModerationLogs).values({
        productId: product.id,
        action: 'submitted',
        actorId: req.user!.id,
      });
      await tx.insert(auditEvents).values({
        actorId: req.user!.id,
        action: 'catalog.product_submitted',
        resourceType: 'product',
        resourceId: product.id,
        metadata: { merchantId: product.merchantId },
        ipAddress: req.ip,
      });
      return updated;
    });
    res.json({ success: true, data: result });
  } catch (err) {
    sendError(res, err);
  }
  }
);

catalogManagementRouter.get(
  '/moderation/queue',
  requireRole('catalogue_moderator', 'operations_admin'),
  async (req: Request, res: Response) => {
    try {
      const parsed = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }).safeParse(req.query);
      if (!parsed.success) throw errors.validation(parsed.error.message);
      const queue = await db
        .select({ product: products, merchantName: merchants.businessName, categoryName: categories.name })
        .from(products)
        .innerJoin(merchants, eq(merchants.id, products.merchantId))
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .where(eq(products.status, 'pending_approval'))
        .orderBy(asc(products.createdAt))
        .limit(parsed.data.limit);
      if (queue.length === 0) {
        res.json({ success: true, data: [] });
        return;
      }

      const productIds = queue.map((item) => item.product.id);
      const [variants, media] = await Promise.all([
        db.select({ variant: productVariants, inventory: inventoryLevels })
          .from(productVariants)
          .leftJoin(inventoryLevels, eq(inventoryLevels.variantId, productVariants.id))
          .where(inArray(productVariants.productId, productIds)),
        db.select().from(productMedia).where(inArray(productMedia.productId, productIds)).orderBy(asc(productMedia.sortOrder)),
      ]);
      res.json({
        success: true,
        data: queue.map(({ product, merchantName, categoryName }) => ({
          ...product,
          merchantName,
          categoryName,
          variants: variants.filter((item) => item.variant.productId === product.id).map((item) => ({
            ...item.variant,
            availableQuantity: item.inventory?.availableQuantity ?? 0,
            reservedQuantity: item.inventory?.reservedQuantity ?? 0,
            lowStockThreshold: item.inventory?.lowStockThreshold ?? 3,
          })),
          media: media.filter((item) => item.productId === product.id),
        })),
      });
    } catch (err) {
      sendError(res, err);
    }
  }
);

catalogManagementRouter.post(
  '/products/:id/moderate',
  requireRole('catalogue_moderator', 'operations_admin'),
  idempotency('catalog-product-moderate'),
  async (req: Request, res: Response) => {
    try {
      const parsed = ModerationSchema.safeParse(req.body);
      if (!parsed.success) throw errors.validation(parsed.error.message);
      const result = await db.transaction(async (tx) => {
        const [product] = await tx.select().from(products).where(eq(products.id, req.params.id)).limit(1).for('update');
        if (!product) throw errors.notFound('Product not found.');
        const next: ProductStatus = parsed.data.decision === 'publish' ? 'published' : 'rejected';
        assertProductTransition(product.status as ProductStatus, next);
        const [updated] = await tx.update(products).set({
          status: next,
          rejectionReason: parsed.data.decision === 'reject' ? parsed.data.note : null,
          moderatedBy: req.user!.id,
          moderatedAt: new Date(),
          updatedAt: new Date(),
        })
          .where(eq(products.id, product.id)).returning();
        await tx.insert(auditEvents).values({
          actorId: req.user!.id,
          action: `catalog.product_${parsed.data.decision === 'publish' ? 'published' : 'rejected'}`,
          resourceType: 'product',
          resourceId: product.id,
          metadata: { note: parsed.data.note },
          ipAddress: req.ip,
        });
        await tx.insert(productModerationLogs).values({
          productId: product.id,
          action: parsed.data.decision === 'publish' ? 'published' : 'rejected',
          actorId: req.user!.id,
          note: parsed.data.note,
        });
        await tx.insert(outboxEvents).values({
          type: `catalog.product_${parsed.data.decision === 'publish' ? 'published' : 'rejected'}`,
          payload: {
            productId: product.id,
            merchantId: product.merchantId,
            note: parsed.data.note,
            indexAction: parsed.data.decision === 'publish' ? 'upsert' : 'remove',
          },
        });
        await notifyMerchantMembers(tx, product.merchantId, {
          type: parsed.data.decision === 'publish' ? 'catalog_product_published' : 'catalog_product_rejected',
          title: parsed.data.decision === 'publish' ? 'Product published' : 'Product needs changes',
          body: parsed.data.decision === 'publish'
            ? `“${updated.title}” is now visible to shoppers.`
            : `“${updated.title}” was rejected: ${parsed.data.note}. Correct the listing to return it to draft, then submit it again.`,
          data: { productId: updated.id, decision: parsed.data.decision },
        });
        return updated;
      });
      res.json({ success: true, data: result });
    } catch (err) {
      sendError(res, err);
    }
  }
);
