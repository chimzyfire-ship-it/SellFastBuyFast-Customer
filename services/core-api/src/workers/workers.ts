import { and, asc, eq, inArray, lt, lte, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  inventoryLevels,
  inventoryReservations,
  merchantBankAccounts,
  orders,
  outboxEvents,
  payouts,
} from '../db/schema.js';
import { config } from '../lib/config.js';
import { PaystackClient } from '../lib/paystack.js';
import { transitionOrder } from '../modules/orders/orderStateMachine.js';
import { settlePayoutTransfer, TransferOutcome } from '../modules/payouts/payouts.service.js';

export async function releaseExpiredReservations(limit = 100): Promise<number> {
  const candidates = await db
    .selectDistinct({ orderId: inventoryReservations.orderId })
    .from(inventoryReservations)
    .where(and(eq(inventoryReservations.status, 'active'), lte(inventoryReservations.expiresAt, new Date())))
    .limit(limit);

  let released = 0;
  for (const candidate of candidates) {
    released += await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, candidate.orderId))
        .limit(1)
        .for('update');
      if (!order || order.status !== 'pending_payment') return 0;

      const reservations = await tx
        .select()
        .from(inventoryReservations)
        .where(and(eq(inventoryReservations.orderId, order.id), eq(inventoryReservations.status, 'active')))
        .for('update');
      if (reservations.length === 0 || reservations.every((item) => item.expiresAt > new Date())) return 0;

      for (const reservation of reservations) {
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
      await transitionOrder(tx, order.id, 'cancelled', undefined, 'Payment reservation expired');
      await tx.insert(outboxEvents).values({ type: 'order.expired', payload: { orderId: order.id } });
      return reservations.length;
    });
  }
  return released;
}

async function claimPayoutEvent() {
  return db.transaction(async (tx) => {
    const [event] = await tx
      .select()
      .from(outboxEvents)
      .where(
        and(
          eq(outboxEvents.type, 'payout.transfer_requested'),
          inArray(outboxEvents.status, ['pending', 'failed']),
          lt(outboxEvents.attempts, 5),
          lte(outboxEvents.availableAt, new Date())
        )
      )
      .orderBy(asc(outboxEvents.createdAt))
      .limit(1)
      .for('update', { skipLocked: true });
    if (!event) return null;

    await tx
      .update(outboxEvents)
      .set({ status: 'processing', attempts: event.attempts + 1, lastError: null })
      .where(eq(outboxEvents.id, event.id));
    return { ...event, attempts: event.attempts + 1 };
  });
}

function terminalTransferOutcome(status: string): TransferOutcome | null {
  if (status === 'success') return 'successful';
  if (status === 'failed') return 'failed';
  if (status === 'reversed') return 'reversed';
  return null;
}

export async function processPayoutOutbox(): Promise<boolean> {
  const event = await claimPayoutEvent();
  if (!event) return false;

  try {
    const payload = event.payload as { payoutId?: string; reference?: string };
    if (!payload.payoutId || !payload.reference) throw new Error('Malformed payout outbox event.');

    const [record] = await db
      .select({ payout: payouts, bank: merchantBankAccounts })
      .from(payouts)
      .innerJoin(merchantBankAccounts, eq(merchantBankAccounts.id, payouts.bankAccountId))
      .where(eq(payouts.id, payload.payoutId))
      .limit(1);
    if (!record || record.payout.status !== 'processing') throw new Error('Payout is not ready for transfer.');
    if (!record.bank.paystackRecipientCode) throw new Error('Payout bank account has no Paystack recipient code.');

    const result = await PaystackClient.createTransfer({
      amountMinor: record.payout.amountMinor,
      recipientCode: record.bank.paystackRecipientCode,
      reference: payload.reference,
      reason: `Marketplace payout ${record.payout.id}`,
    });
    await db
      .update(payouts)
      .set({ paystackTransferCode: result.transferCode, updatedAt: new Date() })
      .where(eq(payouts.id, record.payout.id));

    const outcome = terminalTransferOutcome(result.status);
    if (outcome) {
      await settlePayoutTransfer({ reference: payload.reference, outcome, transferCode: result.transferCode });
    }
    await db
      .update(outboxEvents)
      .set({ status: 'processed', processedAt: new Date() })
      .where(eq(outboxEvents.id, event.id));
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown payout worker error.';
    const delayMs = Math.min(30 * 60_000, 30_000 * 2 ** Math.max(0, event.attempts - 1));
    await db
      .update(outboxEvents)
      .set({ status: 'failed', lastError: message, availableAt: new Date(Date.now() + delayMs) })
      .where(eq(outboxEvents.id, event.id));
    return false;
  }
}

export async function reconcileProcessingPayouts(limit = 20): Promise<number> {
  const processing = await db
    .select()
    .from(payouts)
    .where(eq(payouts.status, 'processing'))
    .orderBy(asc(payouts.updatedAt))
    .limit(limit);

  let reconciled = 0;
  for (const payout of processing) {
    if (!payout.providerReference) continue;
    try {
      const verified = await PaystackClient.verifyTransfer(payout.providerReference);
      const outcome = terminalTransferOutcome(verified.status);
      if (!outcome) continue;
      await settlePayoutTransfer({
        reference: payout.providerReference,
        outcome,
        transferCode: verified.transferCode,
        raw: verified.raw,
      });
      reconciled += 1;
    } catch {
      // The next reconciliation cycle retries provider/network failures.
    }
  }
  return reconciled;
}

export function startWorkers(): () => void {
  const run = (job: () => Promise<unknown>) => void job().catch((err) => console.error('Worker job failed:', err));
  run(() => releaseExpiredReservations());
  run(() => processPayoutOutbox());
  run(() => reconcileProcessingPayouts());

  const timers = [
    setInterval(() => run(() => releaseExpiredReservations()), config.worker.reservationSweepIntervalMs),
    setInterval(() => run(() => processPayoutOutbox()), config.worker.outboxIntervalMs),
    setInterval(() => run(() => reconcileProcessingPayouts()), config.worker.payoutReconcileIntervalMs),
  ];
  return () => timers.forEach(clearInterval);
}
