import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  orders,
  outboxEvents,
  returnRequests,
  shipmentEvents,
  shipments,
} from '../../db/schema.js';
import { config } from '../../lib/config.js';
import { errors, sendError } from '../../lib/errors.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';
import { LedgerService, merchantLedgerCode } from '../ledger/ledger.service.js';
import { transitionOrder } from '../orders/orderStateMachine.js';

export const fulfilmentRouter = Router();

const ShipmentSchema = z.object({
  carrier: z.string().min(2).max(100),
  trackingCode: z.string().min(2).max(160),
  pickupEvidenceUrl: z.string().url().optional(),
});

const DeliverySchema = z.object({
  deliveryEvidenceUrl: z.string().url(),
  note: z.string().max(500).optional(),
});

const platformRoles = new Set([
  'support_agent',
  'catalogue_moderator',
  'finance_reviewer',
  'operations_admin',
  'security_admin',
]);

function assertMerchantAccess(req: Request, merchantId: string): void {
  const staff = req.user!.roles.some((role) => platformRoles.has(role));
  if (!staff && !req.user!.merchantIds.includes(merchantId)) throw errors.forbidden();
}

fulfilmentRouter.get('/merchant/:merchantId/orders', requireAuth, async (req: Request, res: Response) => {
  try {
    assertMerchantAccess(req, req.params.merchantId);
    const list = await db
      .select()
      .from(orders)
      .where(eq(orders.merchantId, req.params.merchantId))
      .orderBy(desc(orders.createdAt))
      .limit(100);
    res.json({ success: true, data: list });
  } catch (err) {
    sendError(res, err);
  }
});

fulfilmentRouter.post(
  '/orders/:orderId/accept',
  requireAuth,
  requireRole('merchant_owner', 'merchant_staff', 'staff'),
  idempotency('fulfilment-accept'),
  async (req: Request, res: Response) => {
    try {
      const result = await db.transaction(async (tx) => {
        const [order] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, req.params.orderId))
          .limit(1)
          .for('update');
        if (!order) throw errors.notFound('Order not found.');
        assertMerchantAccess(req, order.merchantId);

        await transitionOrder(tx, order.id, 'processing', req.user!.id, 'Accepted by merchant');
        const inserted = await tx
          .insert(shipments)
          .values({ orderId: order.id, status: 'pending' })
          .onConflictDoNothing()
          .returning();
        const shipment = inserted[0] ?? (
          await tx.select().from(shipments).where(eq(shipments.orderId, order.id)).limit(1)
        )[0];
        await tx.insert(shipmentEvents).values({
          shipmentId: shipment.id,
          status: 'pending',
          note: 'Order accepted by merchant',
        });
        await tx.insert(outboxEvents).values({ type: 'order.accepted', payload: { orderId: order.id } });
        return { orderId: order.id, status: 'processing', shipmentId: shipment.id };
      });
      res.json({ success: true, data: result });
    } catch (err) {
      sendError(res, err);
    }
  }
);

fulfilmentRouter.post(
  '/orders/:orderId/pack',
  requireAuth,
  requireRole('merchant_owner', 'merchant_staff', 'staff'),
  idempotency('fulfilment-pack'),
  async (req: Request, res: Response) => {
    try {
      const result = await db.transaction(async (tx) => {
        const [order] = await tx.select().from(orders).where(eq(orders.id, req.params.orderId)).limit(1).for('update');
        if (!order) throw errors.notFound('Order not found.');
        assertMerchantAccess(req, order.merchantId);
        if (order.status !== 'processing') throw errors.invalidTransition('Only processing orders can be packed.');

        const [shipment] = await tx.select().from(shipments).where(eq(shipments.orderId, order.id)).limit(1).for('update');
        if (!shipment) throw errors.notFound('Shipment not found.');
        if (shipment.status !== 'pending') throw errors.conflict('SHIPMENT_ALREADY_PACKED', 'Shipment is not awaiting packing.');

        await tx.update(shipments).set({ status: 'packed', updatedAt: new Date() }).where(eq(shipments.id, shipment.id));
        await tx.insert(shipmentEvents).values({ shipmentId: shipment.id, status: 'packed', note: 'Packed by merchant' });
        return { orderId: order.id, status: 'processing', shipmentStatus: 'packed' };
      });
      res.json({ success: true, data: result });
    } catch (err) {
      sendError(res, err);
    }
  }
);

fulfilmentRouter.post(
  '/orders/:orderId/ship',
  requireAuth,
  requireRole('merchant_owner', 'merchant_staff', 'staff'),
  idempotency('fulfilment-ship'),
  async (req: Request, res: Response) => {
    try {
      const parsed = ShipmentSchema.safeParse(req.body);
      if (!parsed.success) throw errors.validation(parsed.error.message);

      const result = await db.transaction(async (tx) => {
        const [order] = await tx.select().from(orders).where(eq(orders.id, req.params.orderId)).limit(1).for('update');
        if (!order) throw errors.notFound('Order not found.');
        assertMerchantAccess(req, order.merchantId);
        if (order.status !== 'processing') throw errors.invalidTransition('Only processing orders can be shipped.');

        const [shipment] = await tx.select().from(shipments).where(eq(shipments.orderId, order.id)).limit(1).for('update');
        if (!shipment) throw errors.notFound('Shipment not found.');
        if (shipment.status !== 'packed') throw errors.conflict('SHIPMENT_NOT_PACKED', 'Shipment must be packed first.');

        const now = new Date();
        await tx
          .update(shipments)
          .set({
            status: 'in_transit',
            carrier: parsed.data.carrier,
            trackingCode: parsed.data.trackingCode,
            pickupEvidenceUrl: parsed.data.pickupEvidenceUrl,
            shippedAt: now,
            updatedAt: now,
          })
          .where(eq(shipments.id, shipment.id));
        await tx.insert(shipmentEvents).values({ shipmentId: shipment.id, status: 'in_transit', note: 'Handed to carrier' });
        await transitionOrder(tx, order.id, 'in_transit', req.user!.id, 'Shipment handed to carrier');
        await tx.update(orders).set({ trackingCode: parsed.data.trackingCode }).where(eq(orders.id, order.id));
        await tx.insert(outboxEvents).values({ type: 'order.shipped', payload: { orderId: order.id, shipmentId: shipment.id } });
        return { orderId: order.id, status: 'in_transit', trackingCode: parsed.data.trackingCode };
      });
      res.json({ success: true, data: result });
    } catch (err) {
      sendError(res, err);
    }
  }
);

fulfilmentRouter.post(
  '/orders/:orderId/deliver',
  requireAuth,
  requireRole('operations_admin', 'support_agent'),
  idempotency('fulfilment-deliver'),
  async (req: Request, res: Response) => {
    try {
      const parsed = DeliverySchema.safeParse(req.body);
      if (!parsed.success) throw errors.validation(parsed.error.message);

      const result = await db.transaction(async (tx) => {
        const [order] = await tx.select().from(orders).where(eq(orders.id, req.params.orderId)).limit(1).for('update');
        if (!order) throw errors.notFound('Order not found.');
        const [shipment] = await tx.select().from(shipments).where(eq(shipments.orderId, order.id)).limit(1).for('update');
        if (!shipment) throw errors.notFound('Shipment not found.');
        if (shipment.status !== 'in_transit') throw errors.invalidTransition('Shipment is not in transit.');

        const now = new Date();
        await tx
          .update(shipments)
          .set({ status: 'delivered', deliveryEvidenceUrl: parsed.data.deliveryEvidenceUrl, deliveredAt: now, updatedAt: now })
          .where(eq(shipments.id, shipment.id));
        await tx.insert(shipmentEvents).values({ shipmentId: shipment.id, status: 'delivered', note: parsed.data.note });
        await transitionOrder(tx, order.id, 'delivered', req.user!.id, 'Delivery evidence recorded');
        await tx.insert(outboxEvents).values({
          type: 'order.delivered',
          payload: { orderId: order.id, returnWindowEndsAt: new Date(now.getTime() + config.fulfilment.returnWindowDays * 86_400_000) },
        });
        return { orderId: order.id, status: 'delivered', deliveredAt: now };
      });
      res.json({ success: true, data: result });
    } catch (err) {
      sendError(res, err);
    }
  }
);

fulfilmentRouter.post(
  '/orders/:orderId/complete',
  requireAuth,
  requireRole('operations_admin', 'finance_reviewer'),
  idempotency('fulfilment-complete'),
  async (req: Request, res: Response) => {
    try {
      const result = await db.transaction(async (tx) => {
        const [order] = await tx.select().from(orders).where(eq(orders.id, req.params.orderId)).limit(1).for('update');
        if (!order) throw errors.notFound('Order not found.');
        if (order.status !== 'delivered') throw errors.invalidTransition('Only delivered orders can be completed.');

        const [shipment] = await tx.select().from(shipments).where(eq(shipments.orderId, order.id)).limit(1).for('update');
        if (!shipment?.deliveredAt) throw errors.conflict('DELIVERY_EVIDENCE_REQUIRED', 'Delivery evidence is required.');
        const releaseAt = new Date(shipment.deliveredAt.getTime() + config.fulfilment.returnWindowDays * 86_400_000);
        if (releaseAt > new Date()) throw errors.conflict('RETURN_WINDOW_OPEN', `Funds cannot be released before ${releaseAt.toISOString()}.`);

        const [openReturn] = await tx
          .select({ id: returnRequests.id })
          .from(returnRequests)
          .where(sql`${returnRequests.orderId} = ${order.id} AND ${returnRequests.status} NOT IN ('rejected', 'completed')`)
          .limit(1);
        if (openReturn) throw errors.conflict('RETURN_OPEN', 'An open return blocks merchant fund release.');

        await LedgerService.ensureMerchantAccounts(tx, order.merchantId);
        const merchantShare = order.subtotalMinor - order.platformCommissionMinor;
        await LedgerService.postJournalEntry(
          {
            reference: `merchant-release:${order.id}`,
            entryType: 'merchant_funds_release',
            narration: `Release merchant funds for ${order.orderNumber}`,
            currency: order.currency,
            lines: [
              { accountCode: merchantLedgerCode(order.merchantId, 'pending'), direction: 'debit', amountMinor: merchantShare },
              { accountCode: merchantLedgerCode(order.merchantId, 'available'), direction: 'credit', amountMinor: merchantShare },
            ],
          },
          tx
        );
        await transitionOrder(tx, order.id, 'completed', req.user!.id, 'Return window elapsed; merchant funds released');
        await tx.insert(outboxEvents).values({ type: 'order.completed', payload: { orderId: order.id } });
        return { orderId: order.id, status: 'completed', releasedAmountMinor: merchantShare };
      });
      res.json({ success: true, data: result });
    } catch (err) {
      sendError(res, err);
    }
  }
);
