import { eq, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  notifications,
  orders,
  outboxEvents,
  returnRequests,
  shipmentEvents,
  shipments,
} from '../../db/schema.js';
import { config } from '../../lib/config.js';
import { errors } from '../../lib/errors.js';
import { LedgerService, merchantLedgerCode } from '../ledger/ledger.service.js';
import { transitionOrder } from '../orders/orderStateMachine.js';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const DAY_MS = 86_400_000;

export function calculateReturnWindowEndsAt(deliveredAt: Date, returnWindowDays: number): Date {
  return new Date(deliveredAt.getTime() + returnWindowDays * DAY_MS);
}

export function getReturnWindowEndsAt(deliveredAt: Date): Date {
  return calculateReturnWindowEndsAt(deliveredAt, config.fulfilment.returnWindowDays);
}

/**
 * Records delivery only after a platform actor or a verified carrier webhook has
 * supplied proof. This is deliberately not exposed to merchant-facing actions.
 */
export async function recordDeliveredOrder(
  tx: Tx,
  input: {
    orderId: string;
    deliveryEvidenceUrl: string;
    actorId?: string;
    note?: string;
    deliveredAt?: Date;
  }
) {
  const [order] = await tx
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId))
    .limit(1)
    .for('update');
  if (!order) throw errors.notFound('Order not found.');

  const [shipment] = await tx
    .select()
    .from(shipments)
    .where(eq(shipments.orderId, order.id))
    .limit(1)
    .for('update');
  if (!shipment) throw errors.notFound('Shipment not found.');
  if (shipment.status !== 'in_transit') throw errors.invalidTransition('Shipment is not in transit.');

  const deliveredAt = input.deliveredAt ?? new Date();
  const returnWindowEndsAt = getReturnWindowEndsAt(deliveredAt);
  await tx
    .update(shipments)
    .set({
      status: 'delivered',
      deliveryEvidenceUrl: input.deliveryEvidenceUrl,
      deliveredAt,
      updatedAt: new Date(),
    })
    .where(eq(shipments.id, shipment.id));
  await tx.insert(shipmentEvents).values({
    shipmentId: shipment.id,
    status: 'delivered',
    note: input.note,
    occurredAt: deliveredAt,
  });
  await tx
    .update(orders)
    .set({ returnWindowEndsAt, updatedAt: new Date() })
    .where(eq(orders.id, order.id));
  await transitionOrder(tx, order.id, 'delivered', input.actorId, 'Delivery evidence recorded');
  await tx.insert(outboxEvents).values({
    type: 'order.delivered',
    payload: { orderId: order.id, returnWindowEndsAt },
  });
  await tx.insert(notifications).values({
    userId: order.buyerId,
    type: 'order_delivered',
    title: 'Order delivered',
    body: 'Delivery evidence has been recorded. Your seven-day return window is now open.',
    data: { orderId: order.id, returnWindowEndsAt: returnWindowEndsAt.toISOString() },
  });

  return { orderId: order.id, status: 'delivered' as const, deliveredAt, returnWindowEndsAt };
}

/**
 * Releases a delivered order's escrow after its inspection window. The row lock
 * makes the open-return check and the ledger posting one indivisible operation.
 */
export async function completeDeliveredOrder(
  tx: Tx,
  input: { orderId: string; actorId?: string; now?: Date; note?: string }
) {
  const [order] = await tx
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId))
    .limit(1)
    .for('update');
  if (!order) throw errors.notFound('Order not found.');
  if (order.status !== 'delivered') throw errors.invalidTransition('Only delivered orders can be completed.');

  const [shipment] = await tx
    .select()
    .from(shipments)
    .where(eq(shipments.orderId, order.id))
    .limit(1)
    .for('update');
  if (!shipment?.deliveredAt) {
    throw errors.conflict('DELIVERY_EVIDENCE_REQUIRED', 'Delivery evidence is required.');
  }

  const releaseAt = order.returnWindowEndsAt ?? getReturnWindowEndsAt(shipment.deliveredAt);
  const now = input.now ?? new Date();
  if (releaseAt > now) {
    throw errors.conflict('RETURN_WINDOW_OPEN', `Funds cannot be released before ${releaseAt.toISOString()}.`);
  }

  const [openReturn] = await tx
    .select({ id: returnRequests.id })
    .from(returnRequests)
    .where(sql`${returnRequests.orderId} = ${order.id} AND ${returnRequests.status} NOT IN ('rejected', 'completed')`)
    .limit(1);
  if (openReturn) throw errors.conflict('RETURN_OPEN', 'An open return blocks merchant fund release.');

  const merchantShare = order.subtotalMinor - order.platformCommissionMinor;
  if (!Number.isSafeInteger(merchantShare) || merchantShare < 0) {
    throw errors.internal(`Order ${order.id} has an invalid merchant commission split.`);
  }

  await LedgerService.ensureMerchantAccounts(tx, order.merchantId);
  await LedgerService.postJournalEntry(
    {
      reference: `escrow-release:${order.id}`,
      entryType: 'escrow_release',
      narration: `Release escrow for ${order.orderNumber} after the return window`,
      currency: order.currency,
      lines: [
        { accountCode: '2001', direction: 'debit', amountMinor: order.subtotalMinor },
        ...(order.platformCommissionMinor > 0
          ? [{ accountCode: '4000', direction: 'credit' as const, amountMinor: order.platformCommissionMinor }]
          : []),
        ...(merchantShare > 0
          ? [{ accountCode: merchantLedgerCode(order.merchantId, 'available'), direction: 'credit' as const, amountMinor: merchantShare }]
          : []),
      ],
    },
    tx
  );
  await transitionOrder(
    tx,
    order.id,
    'completed',
    input.actorId,
    input.note ?? 'Return window elapsed; escrow released to merchant balance'
  );
  await tx.insert(outboxEvents).values({ type: 'order.completed', payload: { orderId: order.id } });
  await tx.insert(notifications).values({
    userId: order.buyerId,
    type: 'order_completed',
    title: 'Order complete',
    body: 'The return window has elapsed and the order is complete.',
    data: { orderId: order.id },
  });

  return { orderId: order.id, status: 'completed' as const, releasedAmountMinor: merchantShare };
}
