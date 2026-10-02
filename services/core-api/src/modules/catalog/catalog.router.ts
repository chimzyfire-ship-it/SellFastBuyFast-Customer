import { storefrontContent } from '../admin/admin.workers.js';
import { sendError } from '../../lib/errors.js';
import { Router, Request, Response } from 'express';
import { db } from '../../db/client.js';
import { categories, products, productVariants, productMedia, merchants, inventoryLevels } from '../../db/schema.js';
import { eq, and, inArray, isNull, ilike } from 'drizzle-orm';

export const catalogRouter = Router();

catalogRouter.get('/content', async (_req, res) => {try {res.json({success:true,data:await storefrontContent()});}catch(error){sendError(res,error);}});

// GET /v1/catalog/categories/taxonomy
catalogRouter.get('/categories/taxonomy', async (_req: Request, res: Response) => {
  try {
    const allActive = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.sortOrder);

    const roots = allActive.filter((c) => !c.parentId);
    const taxonomy = roots.map((root) => {
      const children = allActive.filter((child) => child.parentId === root.id);
      return {
        id: root.id,
        name: root.name,
        slug: root.slug,
        icon: root.icon,
        bannerTitle: 'SEE ALL PRODUCTS',
        subcategories: children,
      };
    });

    res.json({ success: true, data: taxonomy });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'CATALOG_ERROR', message: err.message } });
  }
});

// GET /v1/catalog/categories/:slug/taxonomy
catalogRouter.get('/categories/:slug/taxonomy', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.slug, slug), eq(categories.isActive, true)))
      .limit(1);

    if (!category) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found.' } });
      return;
    }

    const subcategories = await db
      .select()
      .from(categories)
      .where(and(eq(categories.parentId, category.id), eq(categories.isActive, true)))
      .orderBy(categories.sortOrder);

    res.json({
      success: true,
      data: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        bannerTitle: 'SEE ALL PRODUCTS',
        subcategories,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'CATALOG_ERROR', message: err.message } });
  }
});

// GET /v1/catalog/categories
catalogRouter.get('/categories', async (req: Request, res: Response) => {
  try {
    const { parentId, tree, root } = req.query;

    const baseConditions = [eq(categories.isActive, true)];
    if (parentId && typeof parentId === 'string') {
      baseConditions.push(eq(categories.parentId, parentId));
    } else if (root === 'true') {
      baseConditions.push(isNull(categories.parentId));
    }

    const list = await db
      .select()
      .from(categories)
      .where(and(...baseConditions))
      .orderBy(categories.sortOrder);

    if (tree === 'true') {
      const allActive = await db
        .select()
        .from(categories)
        .where(eq(categories.isActive, true))
        .orderBy(categories.sortOrder);

      const roots = allActive.filter((c) => !c.parentId);
      const treeData = roots.map((parent) => ({
        ...parent,
        subcategories: allActive.filter((child) => child.parentId === parent.id),
      }));

      res.json({ success: true, data: treeData });
      return;
    }

    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'CATALOG_ERROR', message: err.message } });
  }
});

// GET /v1/catalog/products
catalogRouter.get('/products', async (req: Request, res: Response) => {
  try {
    const { categoryId, categorySlug, featured, search } = req.query;

    // Approval controls listing visibility. Store registration is reviewed separately;
    // inactive merchants remain hidden.
    const conditions = [
      eq(products.status, 'published'),
      eq(merchants.status, 'active'),
    ];
    if (categoryId && typeof categoryId === 'string') {
      conditions.push(eq(products.categoryId, categoryId));
    } else if (categorySlug && typeof categorySlug === 'string' && categorySlug !== 'all') {
      conditions.push(eq(categories.slug, categorySlug));
    }
    if (featured === 'true') {
      conditions.push(eq(products.isFeatured, true));
    }
    if (search && typeof search === 'string' && search.trim()) {
      conditions.push(ilike(products.title, `%${search.trim()}%`));
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
        merchantSlug: merchants.slug,
        merchantVacationMode: merchants.vacationMode,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(products)
      .innerJoin(merchants, eq(products.merchantId, merchants.id))
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
        merchantName: merchants.businessName,
        merchantSlug: merchants.slug,
        merchantVacationMode: merchants.vacationMode,
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
      .innerJoin(merchants, eq(products.merchantId, merchants.id))
      .where(and(
        eq(products.id, id),
        eq(products.status, 'published'),
        eq(merchants.status, 'active'),
      ))
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
