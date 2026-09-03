import { Router, Request, Response } from 'express';
import { db } from '../../db/client.js';
import { categories, products, productVariants, productMedia, merchants, inventoryLevels } from '../../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

export const catalogRouter = Router();

// GET /v1/catalog/categories
catalogRouter.get('/categories', async (_req: Request, res: Response) => {
  try {
    const list = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.sortOrder);

    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'CATALOG_ERROR', message: err.message } });
  }
});

// GET /v1/catalog/products
catalogRouter.get('/products', async (req: Request, res: Response) => {
  try {
    const { categoryId, featured } = req.query;

    const conditions = [eq(products.status, 'published')];
    if (categoryId && typeof categoryId === 'string') {
      conditions.push(eq(products.categoryId, categoryId));
    }
    if (featured === 'true') {
      conditions.push(eq(products.isFeatured, true));
    }

    const productList = await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        description: products.description,
        brand: products.brand,
        condition: products.condition,
        basePriceMinor: products.basePriceMinor,
        comparePriceMinor: products.comparePriceMinor,
        weightKg: products.weightKg,
        dimensionsCm: products.dimensionsCm,
        returnPolicy: products.returnPolicy,
        warranty: products.warranty,
        tags: products.tags,
        currency: products.currency,
        isFeatured: products.isFeatured,
        merchantId: products.merchantId,
        merchantName: merchants.businessName,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(products)
      .leftJoin(merchants, eq(products.merchantId, merchants.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions));

    if (productList.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    const productIds = productList.map((product) => product.id);
    const [variants, media] = await Promise.all([
      db
        .select({
          id: productVariants.id,
          productId: productVariants.productId,
          sku: productVariants.sku,
          title: productVariants.title,
          optionSize: productVariants.optionSize,
          optionColor: productVariants.optionColor,
          priceMinor: productVariants.priceMinor,
          attributes: productVariants.attributes,
          availableQuantity: inventoryLevels.availableQuantity,
        })
        .from(productVariants)
        .leftJoin(inventoryLevels, eq(inventoryLevels.variantId, productVariants.id))
        .where(inArray(productVariants.productId, productIds)),
      db.select().from(productMedia).where(inArray(productMedia.productId, productIds)).orderBy(productMedia.sortOrder),
    ]);

    res.json({
      success: true,
      data: productList.map((product) => ({
        ...product,
        variants: variants.filter((variant) => variant.productId === product.id),
        media: media.filter((item) => item.productId === product.id),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'CATALOG_ERROR', message: err.message } });
  }
});

// GET /v1/catalog/products/:id
catalogRouter.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [product] = await db
      .select({
        id: products.id,
        merchantId: products.merchantId,
        categoryId: products.categoryId,
        brandId: products.brandId,
        title: products.title,
        slug: products.slug,
        description: products.description,
        brand: products.brand,
        condition: products.condition,
        basePriceMinor: products.basePriceMinor,
        comparePriceMinor: products.comparePriceMinor,
        weightKg: products.weightKg,
        dimensionsCm: products.dimensionsCm,
        returnPolicy: products.returnPolicy,
        warranty: products.warranty,
        tags: products.tags,
        currency: products.currency,
        isFeatured: products.isFeatured,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(and(eq(products.id, id), eq(products.status, 'published')))
      .limit(1);

    if (!product) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found.' } });
      return;
    }

    const variants = await db
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        sku: productVariants.sku,
        title: productVariants.title,
        optionSize: productVariants.optionSize,
        optionColor: productVariants.optionColor,
        priceMinor: productVariants.priceMinor,
        attributes: productVariants.attributes,
        availableQuantity: inventoryLevels.availableQuantity,
      })
      .from(productVariants)
      .leftJoin(inventoryLevels, eq(inventoryLevels.variantId, productVariants.id))
      .where(eq(productVariants.productId, id));

    const media = await db
      .select()
      .from(productMedia)
      .where(eq(productMedia.productId, id))
      .orderBy(productMedia.sortOrder);

    res.json({
      success: true,
      data: {
        ...product,
        variants,
        media,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'CATALOG_ERROR', message: err.message } });
  }
});
