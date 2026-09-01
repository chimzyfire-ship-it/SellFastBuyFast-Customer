import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  auditEvents,
  journalLines,
  ledgerAccounts,
  merchantBankAccounts,
  outboxEvents,
  payouts,
} from '../../db/schema.js';
import { errors, sendError } from '../../lib/errors.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';
import { LedgerService, merchantLedgerCode } from '../ledger/ledger.service.js';

export const payoutsRouter = Router();

const RequestSchema = z.object({
  merchantId: z.string().uuid(),
  bankAccountId: z.string().uuid(),
  amountMinor: z.number().int().positive(),
});

const DecisionSchema = z.object({ note: z.string().max(500).optional() });

const platformRoles = new Set(['finance_reviewer', 'operations_admin', 'security_admin']);

function assertMerchantAccess(req: Request, merchantId: string): void {
  const staff = req.user!.roles.some((role) => platformRoles.has(role));
  if (!staff && !req.user!.merchantIds.includes(merchantId)) throw errors.forbidden();
}

async function accountBalance(accountId: string, exec: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]) {
  const [row] = await exec
    .select({
      balance: sql<number>`COALESCE(SUM(CASE WHEN ${journalLines.direction} = 'credit' THEN ${journalLines.amountMinor} ELSE -${journalLines.amountMinor} END), 0)`.mapWith(Number),
    })
    .from(journalLines)
    .where(eq(journalLines.accountId, accountId));
  return row?.balance ?? 0;
}

payoutsRouter.get('/merchant/:merchantId', requireAuth, async (req: Request, res: Response) => {
  try {
    assertMerchantAccess(req, req.params.merchantId);
    const list = await db
      .select()
      .from(payouts)
      .where(eq(payouts.merchantId, req.params.merchantId))
      .orderBy(desc(payouts.createdAt))
      .limit(100);
    res.json({ success: true, data: list });
  } catch (err) {
    sendError(res, err);
  }
});

payoutsRouter.get('/merchant/:merchantId/balance', requireAuth, async (req: Request, res: Response) => {
  try {
    assertMerchantAccess(req, req.params.merchantId);
    await LedgerService.ensureMerchantAccounts(db, req.params.merchantId);
    const [account] = await db
      .select()
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.accountCode, merchantLedgerCode(req.params.merchantId, 'available')))
      .limit(1);
    const availableMinor = account ? await accountBalance(account.id, db) : 0;
    res.json({ success: true, data: { merchantId: req.params.merchantId, availableMinor, currency: 'NGN' } });
  } catch (err) {
    sendError(res, err);
  }
});

payoutsRouter.post(
  '/request',
  requireAuth,
  requireRole('merchant_owner', 'merchant_staff', 'staff'),
  idempotency('payout-request'),
  async (req: Request, res: Response) => {
    try {
      const parsed = RequestSchema.safeParse(req.body);
      if (!parsed.success) throw errors.validation(parsed.error.message);
      assertMerchantAccess(req, parsed.data.merchantId);

      const payout = await db.transaction(async (tx) => {
        const [bank] = await tx
          .select()
          .from(merchantBankAccounts)
          .where(eq(merchantBankAccounts.id, parsed.data.bankAccountId))
          .limit(1);
        if (!bank || bank.merchantId !== parsed.data.merchantId) throw errors.notFound('Bank account not found.');
        if (!bank.isVerified || !bank.paystackRecipientCode) {
          throw errors.conflict('BANK_ACCOUNT_NOT_VERIFIED', 'A verified Paystack recipient bank account is required.');
        }

        await LedgerService.ensureMerchantAccounts(tx, parsed.data.merchantId);
        const [availableAccount] = await tx
          .select()
          .from(ledgerAccounts)
          .where(eq(ledgerAccounts.accountCode, merchantLedgerCode(parsed.data.merchantId, 'available')))
          .limit(1)
          .for('update');
        const availableMinor = await accountBalance(availableAccount.id, tx);
        if (availableMinor < parsed.data.amountMinor) {
          throw errors.conflict('INSUFFICIENT_AVAILABLE_BALANCE', 'Requested payout exceeds available merchant funds.');
        }

        const [created] = await tx
          .insert(payouts)
          .values({
            merchantId: parsed.data.merchantId,
            bankAccountId: parsed.data.bankAccountId,
            amountMinor: parsed.data.amountMinor,
            currency: 'NGN',
            status: 'pending_approval',
            requestedBy: req.user!.id,
          })
          .returning();

        await LedgerService.postJournalEntry(
          {
            reference: `payout-hold:${created.id}`,
            entryType: 'payout_hold',
            narration: `Reserve merchant funds for payout ${created.id}`,
            lines: [
              { accountCode: merchantLedgerCode(created.merchantId, 'available'), direction: 'debit', amountMinor: created.amountMinor },
              { accountCode: merchantLedgerCode(created.merchantId, 'hold'), direction: 'credit', amountMinor: created.amountMinor },
            ],
          },
          tx
        );
        await tx.insert(auditEvents).values({
          actorId: req.user!.id,
          action: 'payout.requested',
          resourceType: 'payout',
          resourceId: created.id,
          metadata: { merchantId: created.merchantId, amountMinor: created.amountMinor },
          ipAddress: req.ip,
        });
        return created;
      });
      res.status(201).json({ success: true, data: payout });
    } catch (err) {
      sendError(res, err);
    }
  }
);

payoutsRouter.post(
  '/:id/approve',
  requireAuth,
  requireRole('finance_reviewer', 'operations_admin'),
  idempotency('payout-approve'),
  async (req: Request, res: Response) => {
    try {
      const parsed = DecisionSchema.safeParse(req.body);
      if (!parsed.success) throw errors.validation(parsed.error.message);
      const approved = await db.transaction(async (tx) => {
        const [payout] = await tx.select().from(payouts).where(eq(payouts.id, req.params.id)).limit(1).for('update');
        if (!payout) throw errors.notFound('Payout not found.');
        if (payout.status !== 'pending_approval') throw errors.conflict('PAYOUT_NOT_REVIEWABLE', 'Payout is not pending review.');
        if (payout.requestedBy === req.user!.id) throw errors.forbidden('A requester cannot approve their own payout.');

        const [updated] = await tx
          .update(payouts)
          .set({ status: 'approved', approvedBy: req.user!.id, updatedAt: new Date() })
          .where(eq(payouts.id, payout.id))
          .returning();
        await tx.insert(auditEvents).values({
          actorId: req.user!.id,
          action: 'payout.approved',
          resourceType: 'payout',
          resourceId: payout.id,
          metadata: { note: parsed.data.note },
          ipAddress: req.ip,
        });
        return updated;
      });
      res.json({ success: true, data: approved });
    } catch (err) {
      sendError(res, err);
    }
  }
);

payoutsRouter.post(
  '/:id/reject',
  requireAuth,
  requireRole('finance_reviewer', 'operations_admin'),
  idempotency('payout-reject'),
  async (req: Request, res: Response) => {
    try {
      const parsed = DecisionSchema.safeParse(req.body);
      if (!parsed.success) throw errors.validation(parsed.error.message);
      const rejected = await db.transaction(async (tx) => {
        const [payout] = await tx.select().from(payouts).where(eq(payouts.id, req.params.id)).limit(1).for('update');
        if (!payout) throw errors.notFound('Payout not found.');
        if (payout.status !== 'pending_approval') throw errors.conflict('PAYOUT_NOT_REVIEWABLE', 'Payout is not pending review.');

        await LedgerService.ensureMerchantAccounts(tx, payout.merchantId);
        await LedgerService.postJournalEntry(
          {
            reference: `payout-release:${payout.id}`,
            entryType: 'payout_hold_release',
            narration: `Release rejected payout hold ${payout.id}`,
            lines: [
              { accountCode: merchantLedgerCode(payout.merchantId, 'hold'), direction: 'debit', amountMinor: payout.amountMinor },
              { accountCode: merchantLedgerCode(payout.merchantId, 'available'), direction: 'credit', amountMinor: payout.amountMinor },
            ],
          },
          tx
        );
        const [updated] = await tx
          .update(payouts)
          .set({ status: 'rejected', updatedAt: new Date() })
          .where(eq(payouts.id, payout.id))
          .returning();
        await tx.insert(auditEvents).values({
          actorId: req.user!.id,
          action: 'payout.rejected',
          resourceType: 'payout',
          resourceId: payout.id,
          metadata: { note: parsed.data.note },
          ipAddress: req.ip,
        });
        return updated;
      });
      res.json({ success: true, data: rejected });
    } catch (err) {
      sendError(res, err);
    }
  }
);

payoutsRouter.post(
  '/:id/dispatch',
  requireAuth,
  requireRole('finance_reviewer', 'operations_admin'),
  idempotency('payout-dispatch'),
  async (req: Request, res: Response) => {
    try {
      const dispatched = await db.transaction(async (tx) => {
        const [payout] = await tx.select().from(payouts).where(eq(payouts.id, req.params.id)).limit(1).for('update');
        if (!payout) throw errors.notFound('Payout not found.');
        if (payout.status !== 'approved') throw errors.conflict('PAYOUT_NOT_APPROVED', 'Payout must be approved before dispatch.');

        const reference = `SFBF-PAYOUT-${crypto.randomUUID()}`;
        await LedgerService.ensureMerchantAccounts(tx, payout.merchantId);
        await LedgerService.postJournalEntry(
          {
            reference: `payout-dispatch:${payout.id}`,
            entryType: 'payout_dispatch',
            narration: `Move payout ${payout.id} into transfer`,
            lines: [
              { accountCode: merchantLedgerCode(payout.merchantId, 'hold'), direction: 'debit', amountMinor: payout.amountMinor },
              { accountCode: merchantLedgerCode(payout.merchantId, 'in_transit'), direction: 'credit', amountMinor: payout.amountMinor },
            ],
          },
          tx
        );
        const [updated] = await tx
          .update(payouts)
          .set({ status: 'processing', providerReference: reference, updatedAt: new Date() })
          .where(eq(payouts.id, payout.id))
          .returning();
        await tx.insert(outboxEvents).values({
          type: 'payout.transfer_requested',
          payload: { payoutId: payout.id, reference },
        });
        return updated;
      });
      res.json({ success: true, data: dispatched });
    } catch (err) {
      sendError(res, err);
    }
  }
);
