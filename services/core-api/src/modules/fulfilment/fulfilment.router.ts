import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  orderLines,
  orders,
  notifications,
  outboxEvents,
  shipmentEvents,
  shipments,
  providerEvents,
} from '../../db/schema.js';
import { config } from '../../lib/config.js';
import { errors, sendError } from '../../lib/errors.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';
import { transitionOrder } from '../orders/orderStateMachine.js';
import { completeDeliveredOrder, recordDeliveredOrder } from './fulfilment.service.js';
import {
  carrierWebhookKey,
  isDeliveredWebhookEvent,
  verifyLogisticsWebhookSignature,
} from './logistics.policy.js';

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

const LogisticsWebhookSchema = z.object({
  eventId: z.string().trim().min(1).max(200),
  event: z.string().trim().min(1).max(120),
  orderId: z.string().uuid(),
  deliveryEvidenceUrl: z.string().url().max(2_000).optional(),
  note: z.string().trim().max(500).optional(),
  occurredAt: z.coerce.date().optional(),
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
    if (list.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }
    const orderIds = list.map((order) => order.id);
    const [lines, shipmentRows] = await Promise.all([
      db.select().from(orderLines).where(inArray(orderLines.orderId, orderIds)),
      db.select().from(shipments).where(inArray(shipments.orderId, orderIds)),
    ]);
    res.json({
      success: true,
      data: list.map((order) => ({
        ...order,
        lines: lines.filter((line) => line.orderId === order.id),
        shipment: shipmentRows.find((shipment) => shipment.orderId === order.id) ?? null,
      })),
    });
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
        await tx.insert(notifications).values({
          userId: order.buyerId,
          type: 'order_accepted',
          title: 'Order accepted',
          body: 'The merchant has accepted your order and is preparing it.',
          data: { orderId: order.id },
        });
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
        await tx.insert(notifications).values({
          userId: order.buyerId,
          type: 'order_shipped',
          title: 'Order shipped',
          body: `Your order is in transit with ${parsed.data.carrier}.`,
          data: { orderId: order.id, shipmentId: shipment.id, trackingCode: parsed.data.trackingCode },
        });
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

      const result = await db.transaction((tx) => recordDeliveredOrder(tx, {
        orderId: req.params.orderId,
        deliveryEvidenceUrl: parsed.data.deliveryEvidenceUrl,
        actorId: req.user!.id,
        note: parsed.data.note,
      }));
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
      const result = await db.transaction((tx) => completeDeliveredOrder(tx, {
        orderId: req.params.orderId,
        actorId: req.user!.id,
      }));
      res.json({ success: true, data: result });
    } catch (err) {
      sendError(res, err);
    }
  }
);

/**
 * Carrier callbacks are intentionally separate from authenticated staff routes.
 * A carrier must be configured in LOGISTICS_WEBHOOK_SECRETS and sign its raw JSON
 * payload with HMAC-SHA256 in x-logistics-signature (a sha256= prefix is allowed).
 */
fulfilmentRouter.post('/webhooks/:carrier', async (req: Request, res: Response) => {
  const carrier = carrierWebhookKey(req.params.carrier);
  const secret = config.fulfilment.logisticsWebhookSecrets[carrier];
  if (!secret) {
    res.status(404).json({ success: false, error: { code: 'UNKNOWN_CARRIER', message: 'Carrier webhook is not configured.' } });
    return;
  }

  const signatureHeader = req.headers['x-logistics-signature'] ?? req.headers['x-webhook-signature'];
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!verifyLogisticsWebhookSignature(rawBody, signature, secret)) {
    res.status(401).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Invalid carrier webhook signature.' } });
    return;
  }

  try {
    const parsed = LogisticsWebhookSchema.safeParse(req.body);
    if (!parsed.success) throw errors.validation(parsed.error.message);
    const event = parsed.data;
    const providerEventId = `logistics:${carrier}:${event.eventId}`;

    const result = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(providerEvents)
        .values({
          eventId: providerEventId,
          provider: `logistics:${carrier}`,
          eventType: event.event,
          payload: req.body,
        })
        .onConflictDoNothing()
        .returning({ id: providerEvents.id, processedAt: providerEvents.processedAt });
      const providerEvent = inserted[0] ?? (
        await tx
          .select({ id: providerEvents.id, processedAt: providerEvents.processedAt })
          .from(providerEvents)
          .where(eq(providerEvents.eventId, providerEventId))
          .limit(1)
          .for('update')
      )[0];
      if (!providerEvent) throw errors.internal('Unable to persist carrier webhook event.');
      if (providerEvent.processedAt) return { status: 'already_processed' as const };

      if (!isDeliveredWebhookEvent(event.event)) {
        await tx.update(providerEvents).set({ processedAt: new Date() }).where(eq(providerEvents.id, providerEvent.id));
        return { status: 'ignored' as const };
      }
      if (!event.deliveryEvidenceUrl) {
        throw errors.validation('A delivered carrier event requires deliveryEvidenceUrl.');
      }
      if (event.occurredAt && event.occurredAt.getTime() > Date.now() + 5 * 60_000) {
        throw errors.validation('Carrier delivery time cannot be in the future.');
      }

      const delivery = await recordDeliveredOrder(tx, {
        orderId: event.orderId,
        deliveryEvidenceUrl: event.deliveryEvidenceUrl,
        note: event.note ?? `Carrier webhook: ${carrier}`,
        deliveredAt: event.occurredAt,
      });
      await tx.update(providerEvents).set({ processedAt: new Date() }).where(eq(providerEvents.id, providerEvent.id));
      return { status: 'processed' as const, delivery };
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    sendError(res, err);
  }
});
