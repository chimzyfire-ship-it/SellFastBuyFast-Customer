import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { orders, outboxEvents, paymentAttempts, providerEvents } from '../../db/schema.js';
import { requireAuth } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { AppError, errors, sendError } from '../../lib/errors.js';
import { PaystackClient } from '../../lib/paystack.js';
import { completeSuccessfulPayment } from './payments.service.js';
import { settlePayoutTransfer, TransferOutcome } from '../payouts/payouts.service.js';

export const paymentsRouter = Router();

const InitializeSchema = z.object({
  orderId: z.string().uuid(),
  callbackUrl: z.string().url().optional(),
});

paymentsRouter.post(
  '/initialize',
  requireAuth,
  rateLimit({ windowMs: 60_000, max: 10, keyBy: (req) => req.user?.id ?? req.ip ?? 'anon' }),
  idempotency('payment-initialize'),
  async (req: Request, res: Response) => {
    try {
      const parsed = InitializeSchema.safeParse(req.body);
      if (!parsed.success) throw errors.validation(parsed.error.message);

      const [order] = await db.select().from(orders).where(eq(orders.id, parsed.data.orderId)).limit(1);
      if (!order || order.buyerId !== req.user!.id) throw errors.notFound('Order not found.');
      if (order.status !== 'pending_payment') {
        throw errors.conflict('ORDER_NOT_PAYABLE', 'This order is no longer awaiting payment.');
      }

      const reference = `SFBF-RETRY-${crypto.randomUUID()}`;
      const [attempt] = await db
        .insert(paymentAttempts)
        .values({
          orderId: order.id,
          provider: 'paystack',
          providerReference: reference,
          amountMinor: order.totalAmountMinor,
          currency: order.currency,
          status: 'initialized',
        })
        .returning();

      const initialized = await PaystackClient.initializeTransaction({
        reference,
        amountMinor: order.totalAmountMinor,
        email: req.user!.email,
        callbackUrl: parsed.data.callbackUrl ?? process.env.PAYSTACK_CALLBACK_URL,
        metadata: { orderId: order.id, orderNumber: order.orderNumber },
      });

      await db
        .update(paymentAttempts)
        .set({ accessCode: initialized.accessCode, updatedAt: new Date() })
        .where(eq(paymentAttempts.id, attempt.id));

      res.status(201).json({
        success: true,
        data: {
          orderId: order.id,
          reference,
          authorizationUrl: initialized.authorizationUrl,
          accessCode: initialized.accessCode,
        },
      });
    } catch (err) {
      sendError(res, err);
    }
  }
);

paymentsRouter.get('/verify/:reference', requireAuth, async (req: Request, res: Response) => {
  try {
    const reference = req.params.reference;
    const [owned] = await db
      .select({ attempt: paymentAttempts, order: orders })
      .from(paymentAttempts)
      .innerJoin(orders, eq(orders.id, paymentAttempts.orderId))
      .where(eq(paymentAttempts.providerReference, reference))
      .limit(1);

    if (!owned || owned.order.buyerId !== req.user!.id) throw errors.notFound('Payment attempt not found.');
    const verified = await PaystackClient.verifyTransaction(reference);

    if (verified.status !== 'success') {
      if (verified.status === 'failed' || verified.status === 'abandoned') {
        await db
          .update(paymentAttempts)
          .set({ status: verified.status, rawResponse: verified.raw, updatedAt: new Date() })
          .where(eq(paymentAttempts.id, owned.attempt.id));
      }
      res.json({ success: true, data: { reference, status: verified.status } });
      return;
    }

    const result = await completeSuccessfulPayment({
      reference,
      amountMinor: verified.amountMinor,
      currency: verified.currency,
      raw: verified.raw,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    sendError(res, err);
  }
});

paymentsRouter.post('/webhook/paystack', async (req: Request, res: Response) => {
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const signature = req.headers['x-paystack-signature'];
  if (!rawBody || !PaystackClient.verifyWebhookSignature(rawBody, typeof signature === 'string' ? signature : undefined)) {
    res.status(401).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature.' } });
    return;
  }

  const event = req.body as { event?: string; data?: Record<string, any> };
  const eventType = event.event;
  const eventId = event.data?.id;
  if (!eventType || eventId === undefined || eventId === null) {
    res.status(400).json({ success: false, error: { code: 'INVALID_EVENT', message: 'Malformed Paystack event.' } });
    return;
  }

  const providerEventId = String(eventId);
  let [providerEvent] = await db
    .select({ id: providerEvents.id, processedAt: providerEvents.processedAt })
    .from(providerEvents)
    .where(eq(providerEvents.eventId, providerEventId))
    .limit(1);

  if (!providerEvent) {
    const inserted = await db
      .insert(providerEvents)
      .values({ eventId: providerEventId, provider: 'paystack', eventType, payload: event })
      .onConflictDoNothing()
      .returning({ id: providerEvents.id, processedAt: providerEvents.processedAt });
    providerEvent = inserted[0] ?? (
      await db
        .select({ id: providerEvents.id, processedAt: providerEvents.processedAt })
        .from(providerEvents)
        .where(eq(providerEvents.eventId, providerEventId))
        .limit(1)
    )[0];
  }

  if (!providerEvent) {
    res.status(503).json({ success: false, error: { code: 'WEBHOOK_PERSISTENCE_ERROR', message: 'Could not persist provider event.' } });
    return;
  }
  if (providerEvent.processedAt) {
    res.status(200).json({ status: 'already_received' });
    return;
  }

  try {
    if (eventType === 'charge.success') {
      const reference = String(event.data?.reference ?? '');
      if (!reference) throw errors.validation('Paystack charge event has no reference.');

      const verified = await PaystackClient.verifyTransaction(reference);
      if (verified.status !== 'success') {
        throw errors.paymentFailed('Paystack did not independently verify the transaction as successful.');
      }
      await completeSuccessfulPayment({
        reference,
        amountMinor: verified.amountMinor,
        currency: verified.currency,
        raw: verified.raw,
      });
    } else if (['transfer.success', 'transfer.failed', 'transfer.reversed'].includes(eventType)) {
      const reference = String(event.data?.reference ?? '');
      if (!reference) throw errors.validation('Paystack transfer event has no reference.');
      const verified = await PaystackClient.verifyTransfer(reference);
      const outcomeMap: Record<string, TransferOutcome> = {
        success: 'successful',
        failed: 'failed',
        reversed: 'reversed',
      };
      const outcome = outcomeMap[verified.status];
      if (!outcome) throw errors.paymentFailed(`Unexpected Paystack transfer status: ${verified.status}.`);
      await settlePayoutTransfer({
        reference,
        outcome,
        transferCode: verified.transferCode,
        raw: verified.raw,
      });
    }

    await db
      .update(providerEvents)
      .set({ processedAt: new Date() })
      .where(eq(providerEvents.id, providerEvent.id));
    res.status(200).json({ status: 'processed' });
  } catch (err) {
    if (err instanceof AppError && (err.code === 'PAYMENT_MISMATCH' || err.code === 'NOT_FOUND')) {
      await db.transaction(async (tx) => {
        await tx.insert(outboxEvents).values({
          type: 'payment.exception',
          payload: { providerEventId: providerEvent.id, code: err.code, message: err.message },
        });
        await tx
          .update(providerEvents)
          .set({ processedAt: new Date() })
          .where(eq(providerEvents.id, providerEvent.id));
      });
      res.status(200).json({ status: 'exception_recorded' });
      return;
    }
    sendError(res, err);
  }
});
