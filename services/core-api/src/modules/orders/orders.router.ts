import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { db } from '../../db/client.js';
import { orders, orderLines, paymentAttempts, inventoryLevels, inventoryReservations, productVariants, products } from '../../db/schema.js';
import { eq, inArray } from 'drizzle-orm';

export const ordersRouter = Router();

const CheckoutSchema = z.object({
  merchantId: z.string().uuid(),
  items: z.array(
    z.object({
      variantId: z.string().uuid(),
      quantity: z.number().int().positive(),
    })
  ).min(1),
  deliveryAddress: z.object({
    contactName: z.string().min(2),
    contactPhone: z.string().min(8),
    state: z.string().min(2),
    lga: z.string().min(2),
    streetAddress: z.string().min(5),
    landmark: z.string().optional(),
  }),
});

// POST /v1/orders/checkout
ordersRouter.post('/checkout', requireAuth, async (req: Request, res: Response) => {
  try {
    const parseResult = CheckoutSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parseResult.error.message }
      });
      return;
    }

    const { merchantId, items, deliveryAddress } = parseResult.data;
    const buyerId = req.user!.id;

    // 1. Fetch variant data & verify single merchant
    const variantIds = items.map((i) => i.variantId);
    const dbVariants = await db
      .select({
        variantId: productVariants.id,
        variantTitle: productVariants.title,
        priceMinor: productVariants.priceMinor,
        productId: products.id,
        productTitle: products.title,
        merchantId: products.merchantId,
        availableQuantity: inventoryLevels.availableQuantity,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .leftJoin(inventoryLevels, eq(productVariants.id, inventoryLevels.variantId))
      .where(inArray(productVariants.id, variantIds));

    if (dbVariants.length !== items.length) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_VARIANTS', message: 'One or more items in cart are invalid.' }
      });
      return;
    }

    // Verify all items belong to selected merchant
    const crossMerchantItem = dbVariants.find((v) => v.merchantId !== merchantId);
    if (crossMerchantItem) {
      res.status(400).json({
        success: false,
        error: { code: 'MULTI_MERCHANT_NOT_ALLOWED', message: 'V1 checkout is limited to a single merchant.' }
      });
      return;
    }

    // 2. Check Inventory Levels
    for (const item of items) {
      const v = dbVariants.find((dbv) => dbv.variantId === item.variantId);
      if (!v || (v.availableQuantity ?? 0) < item.quantity) {
        res.status(400).json({
          success: false,
          error: { code: 'INSUFFICIENT_STOCK', message: `Insufficient stock for ${v?.productTitle || 'item'}.` }
        });
        return;
      }
    }

    // 3. Calculate Totals
    let subtotalMinor = 0;
    const lineItemsData = items.map((item) => {
      const v = dbVariants.find((dbv) => dbv.variantId === item.variantId)!;
      const lineTotal = v.priceMinor * item.quantity;
      const lineCommission = Math.round(lineTotal * 0.1); // 10% platform commission
      subtotalMinor += lineTotal;

      return {
        variantId: v.variantId,
        productTitle: v.productTitle,
        variantTitle: v.variantTitle,
        unitPriceMinor: v.priceMinor,
        quantity: item.quantity,
        totalMinor: lineTotal,
        commissionMinor: lineCommission,
      };
    });

    const deliveryFeeMinor = 250000; // Flat ₦2,500.00 in minor units
    const platformCommissionMinor = Math.round(subtotalMinor * 0.1);
    const totalAmountMinor = subtotalMinor + deliveryFeeMinor;

    const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const reference = `SFBF-${orderNumber}`;

    // 4. Create Order & Order Lines
    const [newOrder] = await db
      .insert(orders)
      .values({
        orderNumber,
        buyerId,
        merchantId,
        deliveryAddress,
        currency: 'NGN',
        subtotalMinor,
        deliveryFeeMinor,
        platformCommissionMinor,
        totalAmountMinor,
        status: 'pending_payment',
        paymentMethod: 'paystack',
      })
      .returning();

    // Insert Order Lines
    await db.insert(orderLines).values(
      lineItemsData.map((line) => ({
        ...line,
        orderId: newOrder.id,
      }))
    );

    // 5. Reserve Inventory (15 minute lock)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await db.insert(inventoryReservations).values(
      items.map((item) => ({
        orderId: newOrder.id,
        variantId: item.variantId,
        quantity: item.quantity,
        expiresAt,
        status: 'active' as const,
      }))
    );

    // 6. Record Payment Attempt
    await db.insert(paymentAttempts).values({
      orderId: newOrder.id,
      provider: 'paystack',
      providerReference: reference,
      amountMinor: totalAmountMinor,
      currency: 'NGN',
      status: 'initialized',
    });

    res.status(201).json({
      success: true,
      data: {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        reference,
        amountMinor: totalAmountMinor,
        currency: 'NGN',
        status: newOrder.status,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'CHECKOUT_ERROR', message: err.message } });
  }
});
