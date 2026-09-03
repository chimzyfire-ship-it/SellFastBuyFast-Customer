import { eq, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  inventoryLevels,
  inventoryReservations,
  notifications,
  orders,
  outboxEvents,
  paymentAttempts,
} from '../../db/schema.js';
import { errors } from '../../lib/errors.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { recordInventoryTransaction } from '../inventory/inventory.service.js';
import { transitionOrder } from '../orders/orderStateMachine.js';

export interface VerifiedPayment {
  reference: string;
  amountMinor: number;
  currency: string;
  raw: unknown;
}

export async function completeSuccessfulPayment(input: VerifiedPayment) {
  return db.transaction(async (tx) => {
    const [attempt] = await tx
      .select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.providerReference, input.reference))
      .limit(1)
      .for('update');

    if (!attempt) throw errors.notFound('Payment reference was not issued by this platform.');
    if (attempt.amountMinor !== input.amountMinor || attempt.currency !== input.currency.toUpperCase()) {
      throw errors.conflict('PAYMENT_MISMATCH', 'Provider amount or currency does not match the payment attempt.');
    }

    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, attempt.orderId))
      .limit(1)
      .for('update');
    if (!order) throw errors.notFound('Order for payment attempt was not found.');

    if (attempt.status === 'successful') {
      return { orderId: order.id, status: order.status, alreadyProcessed: true, requiresRefund: false };
    }

    await tx
      .update(paymentAttempts)
      .set({ status: 'successful', rawResponse: input.raw, updatedAt: new Date() })
      .where(eq(paymentAttempts.id, attempt.id));

    if (order.status !== 'pending_payment') {
      const requiresRefund = order.status === 'cancelled';
      if (requiresRefund) {
        await tx.insert(outboxEvents).values({
          type: 'refund.requested',
          payload: { orderId: order.id, paymentAttemptId: attempt.id, reason: 'payment_after_cancellation' },
        });
      }
      return { orderId: order.id, status: order.status, alreadyProcessed: false, requiresRefund };
    }

    const reservations = await tx
      .select()
      .from(inventoryReservations)
      .where(eq(inventoryReservations.orderId, order.id))
      .for('update');

    const now = new Date();
    const active = reservations.filter((reservation) => reservation.status === 'active');
    const reservationInvalid =
      active.length !== reservations.length ||
      active.length === 0 ||
      active.some((reservation) => reservation.expiresAt <= now);

    if (reservationInvalid) {
      for (const reservation of active) {
        await tx
          .update(inventoryReservations)
          .set({ status: 'released' })
          .where(eq(inventoryReservations.id, reservation.id));
        const [updatedInventory] = await tx
          .update(inventoryLevels)
          .set({
            availableQuantity: sql`${inventoryLevels.availableQuantity} + ${reservation.quantity}`,
            reservedQuantity: sql`${inventoryLevels.reservedQuantity} - ${reservation.quantity}`,
            updatedAt: now,
          })
          .where(eq(inventoryLevels.variantId, reservation.variantId))
          .returning({ availableQuantity: inventoryLevels.availableQuantity });
        await recordInventoryTransaction(tx, {
          variantId: reservation.variantId,
          delta: reservation.quantity,
          actionType: 'checkout_release',
          balanceAfter: updatedInventory.availableQuantity,
          referenceId: order.id,
          note: 'Reserved stock released because payment arrived after reservation expiry.',
        });
      }

      await transitionOrder(tx, order.id, 'cancelled', undefined, 'Payment arrived after stock reservation expired');
      await LedgerService.postJournalEntry(
        {
          reference: `payment:${attempt.providerReference}:refund-due`,
          entryType: 'payment_refund_due',
          narration: `Late payment requiring refund for ${order.orderNumber}`,
          lines: [
            { accountCode: '1000', direction: 'debit', amountMinor: order.totalAmountMinor },
            { accountCode: '2030', direction: 'credit', amountMinor: order.totalAmountMinor },
          ],
        },
        tx
      );
      await tx.insert(outboxEvents).values({
        type: 'refund.requested',
        payload: { orderId: order.id, paymentAttemptId: attempt.id, reason: 'reservation_expired' },
      });
      return { orderId: order.id, status: 'cancelled', alreadyProcessed: false, requiresRefund: true };
    }

    await transitionOrder(tx, order.id, 'payment_confirmed', undefined, 'Verified Paystack payment');

    for (const reservation of active) {
      await tx
        .update(inventoryReservations)
        .set({ status: 'committed' })
        .where(eq(inventoryReservations.id, reservation.id));
      const [updatedInventory] = await tx
        .update(inventoryLevels)
        .set({
          reservedQuantity: sql`${inventoryLevels.reservedQuantity} - ${reservation.quantity}`,
          updatedAt: now,
        })
        .where(eq(inventoryLevels.variantId, reservation.variantId))
        .returning({ availableQuantity: inventoryLevels.availableQuantity });
      await recordInventoryTransaction(tx, {
        variantId: reservation.variantId,
        delta: 0,
        actionType: 'order_fulfilled',
        balanceAfter: updatedInventory.availableQuantity,
        referenceId: order.id,
        note: 'Reserved stock committed after verified payment.',
      });
    }

    await LedgerService.postJournalEntry(
      {
        reference: `payment:${attempt.providerReference}`,
        entryType: 'order_payment_escrowed',
        narration: `Verified payment held in escrow for ${order.orderNumber}`,
        currency: order.currency,
        lines: [
          { accountCode: '1000', direction: 'debit', amountMinor: order.totalAmountMinor },
          { accountCode: '2001', direction: 'credit', amountMinor: order.subtotalMinor },
          ...(order.deliveryFeeMinor > 0
            ? [{ accountCode: '4010', direction: 'credit' as const, amountMinor: order.deliveryFeeMinor }]
            : []),
        ],
      },
      tx
    );

    await tx.insert(outboxEvents).values({
      type: 'payment.confirmed',
      payload: { orderId: order.id, paymentAttemptId: attempt.id },
    });
    await tx.insert(notifications).values({
      userId: order.buyerId,
      type: 'payment_confirmed',
      title: 'Payment confirmed',
      body: `Your payment for ${order.orderNumber} has been verified.`,
      data: { orderId: order.id },
    });

    return { orderId: order.id, status: 'payment_confirmed', alreadyProcessed: false, requiresRefund: false };
  });
}
