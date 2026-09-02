import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { requireAuth } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { idempotency } from '../../middleware/idempotency.js';
import { db } from '../../db/client.js';
import {
  orders,
  orderLines,
  orderStatusEvents,
  paymentAttempts,
  inventoryLevels,
  inventoryReservations,
  productVariants,
  products,
  merchants,
  deliveryZones,
  outboxEvents,
  shipmentEvents,
  shipments,
} from '../../db/schema.js';
import { config } from '../../lib/config.js';
import { AppError, errors, sendError } from '../../lib/errors.js';
import { PaystackClient } from '../../lib/paystack.js';
import { transitionOrder } from './orderStateMachine.js';

export const ordersRouter = Router();

const CheckoutSchema = z.object({
  merchantId: z.string().uuid(),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().positive().max(999),
      })
    )
    .min(1)
    .max(50),
  deliveryAddress: z.object({
    contactName: z.string().min(2).max(120),
    contactPhone: z.string().min(8).max(20),
    state: z.string().min(2).max(60),
    lga: z.string().min(2).max(60),
    streetAddress: z.string().min(5).max(240),
    landmark: z.string().max(240).optional(),
  }),
});

const CancelSchema = z.object({
  reason: z.string().min(2).max(500).optional(),
});

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function newOrderNumber(): string {
  const now = new Date();
  const stamp = now.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
  return `ORD-${stamp}-${rand}`;
}

async function resolveDeliveryFee(exec: typeof db | Tx, state: string, lga: string): Promise<number> {
  const [exact] = await exec
    .select({ feeMinor: deliveryZones.feeMinor })
    .from(deliveryZones)
    .where(sql`${deliveryZones.state} = ${state} AND ${deliveryZones.lga} = ${lga} AND ${deliveryZones.isActive} = TRUE`)
    .limit(1);

  if (exact) return exact.feeMinor;
  return config.pricing.defaultDeliveryFeeMinor;
}

// POST /v1/orders/checkout
ordersRouter.post(
  '/checkout',
  requireAuth,
  rateLimit({ windowMs: 60_000, max: 10, keyBy: (req) => req.user?.id ?? req.ip ?? 'anon' }),
  idempotency('checkout'),
  async (req: Request, res: Response) => {
    try {
      if (config.paymentMode !== 'paystack') {
        throw new AppError(
          'PAYMENT_MODULE_DEFERRED',
          'Checkout is unavailable while the payment module is in mock mode.',
          503
        );
      }
      const parseResult = CheckoutSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw errors.validation(parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
      }

      const { merchantId, items, deliveryAddress } = parseResult.data;
      const buyerId = req.user!.id;
      const variantIds = items.map((i) => i.variantId);
      const duplicateIds = variantIds.filter((id, i) => variantIds.indexOf(id) !== i);
      if (duplicateIds.length > 0) {
        throw errors.validation('Duplicate items in cart must be merged into one line.');
      }

      const result = await db.transaction(async (tx) => {
        // Lock inventory rows in deterministic order to serialize concurrent checkouts
        const lockedInventory = await tx
          .select({ variantId: inventoryLevels.variantId, availableQuantity: inventoryLevels.availableQuantity })
          .from(inventoryLevels)
          .where(inArray(inventoryLevels.variantId, variantIds))
          .orderBy(asc(inventoryLevels.variantId))
          .for('update');

        const inventoryByVariant = new Map(lockedInventory.map((row) => [row.variantId, row.availableQuantity]));

        const dbVariants = await tx
          .select({
            variantId: productVariants.id,
            variantTitle: productVariants.title,
            priceMinor: productVariants.priceMinor,
            productId: products.id,
            productTitle: products.title,
            productStatus: products.status,
            merchantId: products.merchantId,
          })
          .from(productVariants)
          .innerJoin(products, eq(productVariants.productId, products.id))
          .where(inArray(productVariants.id, variantIds));

        if (dbVariants.length !== variantIds.length) {
          throw errors.validation('One or more items in cart are invalid.');
        }

        for (const v of dbVariants) {
          if (v.productStatus !== 'published') {
            throw errors.validation(`Product '${v.productTitle}' is not available for purchase.`);
          }
          if (v.merchantId !== merchantId) {
            throw errors.conflict('MULTI_MERCHANT_NOT_ALLOWED', 'V1 checkout is limited to a single merchant.');
          }
        }

        for (const item of items) {
          const available = inventoryByVariant.get(item.variantId) ?? 0;
          const v = dbVariants.find((d) => d.variantId === item.variantId)!;
          if (available < item.quantity) {
            throw errors.insufficientStock(`Insufficient stock for ${v.productTitle}.`);
          }
        }

        // Server-side totals: single commission source (per-line, sum preserved)
        const bps = config.pricing.platformCommissionBps;
        let subtotalMinor = 0;
        let platformCommissionMinor = 0;

        const lineItemsData = items.map((item) => {
          const v = dbVariants.find((d) => d.variantId === item.variantId)!;
          const lineTotal = v.priceMinor * item.quantity;
          const lineCommission = Math.round((lineTotal * bps) / 10_000);
          subtotalMinor += lineTotal;
          platformCommissionMinor += lineCommission;
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

        const deliveryFeeMinor = await resolveDeliveryFee(tx, deliveryAddress.state, deliveryAddress.lga);
        const totalAmountMinor = subtotalMinor + deliveryFeeMinor;

        const orderNumber = newOrderNumber();
        const reference = `SFBF-${orderNumber}`;

        const [newOrder] = await tx
          .insert(orders)
          .values({
            orderNumber,
            buyerId,
            merchantId,
            deliveryAddress,
            currency: config.pricing.currency,
            subtotalMinor,
            deliveryFeeMinor,
            platformCommissionMinor,
            totalAmountMinor,
            status: 'pending_payment',
            paymentMethod: 'paystack',
          })
          .returning();

        await tx.insert(orderLines).values(lineItemsData.map((line) => ({ ...line, orderId: newOrder.id })));

        const expiresAt = new Date(Date.now() + config.checkout.reservationTtlMinutes * 60_000);
        await tx.insert(inventoryReservations).values(
          items.map((item) => ({
            orderId: newOrder.id,
            variantId: item.variantId,
            quantity: item.quantity,
            expiresAt,
            status: 'active' as const,
          }))
        );

        // Reserve stock atomically: available moves to reserved while rows are locked
        for (const item of items) {
          await tx
            .update(inventoryLevels)
            .set({
              availableQuantity: sql`${inventoryLevels.availableQuantity} - ${item.quantity}`,
              reservedQuantity: sql`${inventoryLevels.reservedQuantity} + ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(inventoryLevels.variantId, item.variantId));
        }

        const [attempt] = await tx
          .insert(paymentAttempts)
          .values({
            orderId: newOrder.id,
            provider: 'paystack',
            providerReference: reference,
            amountMinor: totalAmountMinor,
            currency: config.pricing.currency,
            status: 'initialized',
          })
          .returning();

        return { order: newOrder, attempt };
      });

      let authorizationUrl: string | null = null;
      try {
        const init = await PaystackClient.initializeTransaction({
          reference: result.attempt.providerReference,
          amountMinor: result.order.totalAmountMinor,
          email: req.user!.email,
          callbackUrl: process.env.PAYSTACK_CALLBACK_URL,
          metadata: { orderId: result.order.id, orderNumber: result.order.orderNumber },
        });
        authorizationUrl = init.authorizationUrl;
        await db
          .update(paymentAttempts)
          .set({ accessCode: init.accessCode, updatedAt: new Date() })
          .where(eq(paymentAttempts.id, result.attempt.id));
      } catch {
        authorizationUrl = null;
      }

      res.status(201).json({
        success: true,
        data: {
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
          reference: result.attempt.providerReference,
          amountMinor: result.order.totalAmountMinor,
          currency: result.order.currency,
          status: result.order.status,
          paymentAuthorizationUrl: authorizationUrl,
        },
      });
    } catch (err) {
      sendError(res, err);
    }
  }
);

// GET /v1/orders
ordersRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const list = await db
      .select({ order: orders, merchantName: merchants.businessName })
      .from(orders)
      .innerJoin(merchants, eq(merchants.id, orders.merchantId))
      .where(eq(orders.buyerId, req.user!.id))
      .orderBy(desc(orders.createdAt))
      .limit(100);

    const ids = list.map((item) => item.order.id);
    const lines = ids.length > 0
      ? await db.select().from(orderLines).where(inArray(orderLines.orderId, ids))
      : [];
    res.json({
      success: true,
      data: list.map(({ order, merchantName }) => ({
        ...order,
        merchantName,
        lines: lines.filter((line) => line.orderId === order.id),
      })),
    });
  } catch (err) {
    sendError(res, err);
  }
});

// GET /v1/orders/:id
ordersRouter.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw errors.validation('Invalid order id.');

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order || order.buyerId !== req.user!.id) throw errors.notFound('Order not found.');

    const lines = await db.select().from(orderLines).where(eq(orderLines.orderId, order.id));
    const events = await db
      .select()
      .from(orderStatusEvents)
      .where(eq(orderStatusEvents.orderId, order.id))
      .orderBy(asc(orderStatusEvents.createdAt));

    const [shipment] = await db.select().from(shipments).where(eq(shipments.orderId, order.id)).limit(1);
    const logisticsEvents = shipment
      ? await db.select().from(shipmentEvents)
          .where(eq(shipmentEvents.shipmentId, shipment.id))
          .orderBy(asc(shipmentEvents.occurredAt))
      : [];

    res.json({ success: true, data: { ...order, lines, statusEvents: events, shipment, shipmentEvents: logisticsEvents } });
  } catch (err) {
    sendError(res, err);
  }
});

// POST /v1/orders/:id/cancel (buyer, only before merchant acceptance)
ordersRouter.post('/:id/cancel', requireAuth, idempotency('order-cancel'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw errors.validation('Invalid order id.');
    const parsed = CancelSchema.safeParse(req.body);
    if (!parsed.success) throw errors.validation(parsed.error.message);

    const cancelled = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, id)).limit(1).for('update');
      if (!order || order.buyerId !== req.user!.id) throw errors.notFound('Order not found.');

      await transitionOrder(tx, id, 'cancelled', req.user!.id, parsed.data.reason ?? 'Cancelled by buyer');

      const activeReservations = await tx
        .select()
        .from(inventoryReservations)
        .where(sql`${inventoryReservations.orderId} = ${id} AND ${inventoryReservations.status} = 'active'`);

      for (const reservation of activeReservations) {
        await tx
          .update(inventoryReservations)
          .set({ status: 'released' })
          .where(eq(inventoryReservations.id, reservation.id));

        await tx
          .update(inventoryLevels)
          .set({
            availableQuantity: sql`${inventoryLevels.availableQuantity} + ${reservation.quantity}`,
            reservedQuantity: sql`${inventoryLevels.reservedQuantity} - ${reservation.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(inventoryLevels.variantId, reservation.variantId));
      }

      await tx.insert(outboxEvents).values({
        type: 'order.cancelled',
        payload: { orderId: id, wasPaid: order.status === 'payment_confirmed', reason: parsed.data.reason },
      });

      return { order };
    });

    if (cancelled.order.status === 'payment_confirmed') {
      await db.insert(outboxEvents).values({
        type: 'refund.requested',
        payload: { orderId: id, reason: parsed.data.reason ?? 'buyer_cancel_after_payment' },
      });
    }

    res.json({ success: true, data: { orderId: id, status: 'cancelled' } });
  } catch (err) {
    sendError(res, err);
  }
});
