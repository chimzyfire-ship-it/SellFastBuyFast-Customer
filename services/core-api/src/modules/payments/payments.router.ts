import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../../db/client.js';
import { orders, paymentAttempts, providerEvents, inventoryReservations, inventoryLevels } from '../../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { LedgerService } from '../ledger/ledger.service.js';

export const paymentsRouter = Router();

// POST /v1/payments/webhook/paystack
paymentsRouter.post('/webhook/paystack', async (req: Request, res: Response): Promise<void> => {
  try {
    const paystackSignature = req.headers['x-paystack-signature'] as string;
    const secretKey = process.env.PAYSTACK_SECRET_KEY || '';

    if (!paystackSignature && process.env.NODE_ENV === 'production') {
      res.status(401).json({ success: false, message: 'Missing Paystack signature' });
      return;
    }

    // Verify HMAC-SHA512 signature if secret key is present
    if (secretKey && secretKey !== 'sk_test_placeholder') {
      const hash = crypto
        .createHmac('sha512', secretKey)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (hash !== paystackSignature) {
        res.status(401).json({ success: false, message: 'Invalid webhook signature' });
        return;
      }
    }

    const event = req.body;
    const eventId = event?.data?.id ? String(event.data.id) : `evt-${Date.now()}`;
    const eventType = event?.event || 'charge.success';

    // 1. Idempotency Check: Save event
    try {
      await db.insert(providerEvents).values({
        eventId,
        provider: 'paystack',
        eventType,
        payload: event,
        processedAt: new Date(),
      });
    } catch {
      // Event already recorded and processed
      res.status(200).json({ status: 'already_processed' });
      return;
    }

    // 2. Handle successful charge
    if (eventType === 'charge.success') {
      const reference = event.data.reference;
      const amountPaidMinor = event.data.amount; // Paystack sends amounts in Kobo

      const [attempt] = await db
        .select()
        .from(paymentAttempts)
        .where(eq(paymentAttempts.providerReference, reference))
        .limit(1);

      if (!attempt) {
        res.status(200).json({ status: 'unknown_reference_ignored' });
        return;
      }

      // Update payment attempt
      await db
        .update(paymentAttempts)
        .set({ status: 'successful', updatedAt: new Date() })
        .where(eq(paymentAttempts.id, attempt.id));

      // Fetch Order
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, attempt.orderId))
        .limit(1);

      if (order && order.status === 'pending_payment') {
        // Update Order Status to payment_confirmed
        await db
          .update(orders)
          .set({ status: 'payment_confirmed', updatedAt: new Date() })
          .where(eq(orders.id, order.id));

        // Commit Inventory Reservations & Deduct Available Stock
        const reservations = await db
          .select()
          .from(inventoryReservations)
          .where(eq(inventoryReservations.orderId, order.id));

        for (const resItem of reservations) {
          await db
            .update(inventoryReservations)
            .set({ status: 'committed' })
            .where(eq(inventoryReservations.id, resItem.id));

          await db
            .update(inventoryLevels)
            .set({
              availableQuantity: sql`${inventoryLevels.availableQuantity} - ${resItem.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(inventoryLevels.variantId, resItem.variantId));
        }

        // Post Double-Entry Journal Entry
        // Debit: Paystack Clearing Account (Asset)
        // Credit: Merchant Payable (Liability)
        // Credit: Platform Commission Revenue (Revenue)
        const commission = order.platformCommissionMinor;
        const merchantShare = order.subtotalMinor - commission;
        const total = order.totalAmountMinor;

        await LedgerService.postJournalEntry({
          reference: `JRN-${order.orderNumber}`,
          entryType: 'order_payment',
          narration: `Payment settlement for Order #${order.orderNumber}`,
          lines: [
            { accountCode: '1000', direction: 'debit', amountMinor: total }, // Debit Asset (Paystack)
            { accountCode: '2000', direction: 'credit', amountMinor: merchantShare }, // Credit Merchant Liability
            { accountCode: '4000', direction: 'credit', amountMinor: commission + order.deliveryFeeMinor }, // Credit Platform Revenue
          ],
        });
      }
    }

    res.status(200).json({ status: 'success' });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
