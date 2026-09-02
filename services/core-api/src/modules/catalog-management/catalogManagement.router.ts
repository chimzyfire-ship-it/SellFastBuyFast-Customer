import crypto from 'node:crypto';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asc, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  auditEvents,
  brands,
  categories,
  inventoryLevels,
  merchants,
  outboxEvents,
  productMedia,
  products,
  productVariants,
} from '../../db/schema.js';
import { errors, sendError } from '../../lib/errors.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';
import { assertProductTransition, ProductStatus } from './catalogManagement.policy.js';

export const catalogManagementRouter = Router();
catalogManagementRouter.use(requireAuth);

const VariantSchema = z.object({
  sku: z.string().trim().min(2).max(80).optional(),
  title: z.string().trim().min(1).max(120).default('Default'),
  priceMinor: z.number().int().positive().safe(),
  attributes: z.record(z.unknown()).default({}),
  availableQuantity: z.number().int().min(0).max(1_000_000).default(0),
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
  description: z.string().trim().min(10).max(10_000),
  comparePriceMinor: z.number().int().positive().safe().optional(),
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
  description: z.string().trim().min(10).max(10_000).optional(),
  comparePriceMinor: z.number().int().positive().safe().nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one field is required.');
const InventorySchema = z.object({ availableQuantity: z.number().int().min(0).max(1_000_000) });
const ModerationSchema = z.object({
  decision: z.enum(['publish', 'reject']),
  note: z.string().trim().min(3).max(1000),
});

const platformRoles = new Set(['catalogue_moderator', 'operations_admin', 'security_admin']);

function assertMerchantAccess(req: Request, merchantId: string): void {
  const platform = req.user!.roles.some((role) => platformRoles.has(role));
  if (!platform && !req.user!.merchantIds.includes(merchantId)) throw errors.forbidden();
}

function slugFor(title: string): string {
  const base = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
  return `${base || 'product'}-${crypto.randomBytes(4).toString('hex')}`;
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
          title: parsed.data.title,
          slug: slugFor(parsed.data.title),
          description: parsed.data.description,
          basePriceMinor,
          comparePriceMinor: parsed.data.comparePriceMinor,
          currency: 'NGN',
          status: 'draft',
        }).returning();
        const variants = await tx.insert(productVariants).values(parsed.data.variants.map((variant) => ({
          productId: product.id,
          sku: variant.sku,
          title: variant.title,
          priceMinor: variant.priceMinor,
          attributes: variant.attributes,
        }))).returning();
        await tx.insert(inventoryLevels).values(variants.map((variant, index) => ({
          variantId: variant.id,
          availableQuantity: parsed.data.variants[index].availableQuantity,
          reservedQuantity: 0,
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
        return { ...product, variants, media };
      });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      sendError(res, err);
    }
  }
);

catalogManagementRouter.patch('/products/:id', idempotency('catalog-product-update'), async (req: Request, res: Response) => {
  try {
    const parsed = UpdateProductSchema.safeParse(req.body);
    if (!parsed.success) throw errors.validation(parsed.error.message);
    const updated = await db.transaction(async (tx) => {
      const [product] = await tx.select().from(products).where(eq(products.id, req.params.id)).limit(1).for('update');
      if (!product) throw errors.notFound('Product not found.');
      assertMerchantAccess(req, product.merchantId);
      if (!['draft', 'published'].includes(product.status)) {
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
      const [saved] = await tx.update(products).set({
        ...parsed.data,
        status: product.status === 'published' ? 'draft' : product.status,
        updatedAt: new Date(),
      }).where(eq(products.id, product.id)).returning();
      await tx.insert(auditEvents).values({
        actorId: req.user!.id,
        action: 'catalog.product_updated',
        resourceType: 'product',
        resourceId: product.id,
        metadata: { fields: Object.keys(parsed.data), returnedToDraft: product.status === 'published' },
        ipAddress: req.ip,
      });
      return saved;
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    sendError(res, err);
  }
});

catalogManagementRouter.patch('/variants/:id/inventory', idempotency('catalog-inventory-set'), async (req: Request, res: Response) => {
  try {
    const parsed = InventorySchema.safeParse(req.body);
    if (!parsed.success) throw errors.validation(parsed.error.message);
    const result = await db.transaction(async (tx) => {
      const [record] = await tx.select({ variant: productVariants, product: products })
        .from(productVariants).innerJoin(products, eq(products.id, productVariants.productId))
        .where(eq(productVariants.id, req.params.id)).limit(1);
      if (!record) throw errors.notFound('Product variant not found.');
      assertMerchantAccess(req, record.product.merchantId);
      const [inventory] = await tx.insert(inventoryLevels).values({
        variantId: record.variant.id,
        availableQuantity: parsed.data.availableQuantity,
        reservedQuantity: 0,
      }).onConflictDoUpdate({
        target: inventoryLevels.variantId,
        set: { availableQuantity: parsed.data.availableQuantity, updatedAt: new Date() },
      }).returning();
      await tx.insert(auditEvents).values({
        actorId: req.user!.id,
        action: 'catalog.inventory_set',
        resourceType: 'product_variant',
        resourceId: record.variant.id,
        metadata: { availableQuantity: parsed.data.availableQuantity },
        ipAddress: req.ip,
      });
      return inventory;
    });
    res.json({ success: true, data: result });
  } catch (err) {
    sendError(res, err);
  }
});

catalogManagementRouter.post('/products/:id/submit', idempotency('catalog-product-submit'), async (req: Request, res: Response) => {
  try {
    const result = await db.transaction(async (tx) => {
      const [product] = await tx.select().from(products).where(eq(products.id, req.params.id)).limit(1).for('update');
      if (!product) throw errors.notFound('Product not found.');
      assertMerchantAccess(req, product.merchantId);
      assertProductTransition(product.status as ProductStatus, 'pending_approval');
      const [variant] = await tx.select({ id: productVariants.id }).from(productVariants)
        .where(eq(productVariants.productId, product.id)).limit(1);
      const [media] = await tx.select({ id: productMedia.id }).from(productMedia)
        .where(eq(productMedia.productId, product.id)).limit(1);
      if (!variant || !media || !product.description || !product.categoryId) {
        throw errors.conflict('PRODUCT_INCOMPLETE', 'A category, description, variant, and product image are required.');
      }
      const [updated] = await tx.update(products).set({ status: 'pending_approval', updatedAt: new Date() })
        .where(eq(products.id, product.id)).returning();
      await tx.insert(outboxEvents).values({ type: 'catalog.product_submitted', payload: { productId: product.id } });
      return updated;
    });
    res.json({ success: true, data: result });
  } catch (err) {
    sendError(res, err);
  }
});

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
        const next = parsed.data.decision === 'publish' ? 'published' : 'draft';
        assertProductTransition(product.status as ProductStatus, next);
        const [updated] = await tx.update(products).set({ status: next, updatedAt: new Date() })
          .where(eq(products.id, product.id)).returning();
        await tx.insert(auditEvents).values({
          actorId: req.user!.id,
          action: `catalog.product_${parsed.data.decision === 'publish' ? 'published' : 'rejected'}`,
          resourceType: 'product',
          resourceId: product.id,
          metadata: { note: parsed.data.note },
          ipAddress: req.ip,
        });
        await tx.insert(outboxEvents).values({
          type: `catalog.product_${parsed.data.decision === 'publish' ? 'published' : 'rejected'}`,
          payload: { productId: product.id, merchantId: product.merchantId, note: parsed.data.note },
        });
        return updated;
      });
      res.json({ success: true, data: result });
    } catch (err) {
      sendError(res, err);
    }
  }
);
