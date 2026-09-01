import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { outboxEvents, payouts } from '../../db/schema.js';
import { errors } from '../../lib/errors.js';
import { LedgerService, merchantLedgerCode } from '../ledger/ledger.service.js';

export type TransferOutcome = 'successful' | 'failed' | 'reversed';

export async function settlePayoutTransfer(input: {
  reference: string;
  outcome: TransferOutcome;
  transferCode?: string;
  raw?: unknown;
}) {
  return db.transaction(async (tx) => {
    const [payout] = await tx
      .select()
      .from(payouts)
      .where(eq(payouts.providerReference, input.reference))
      .limit(1)
      .for('update');
    if (!payout) throw errors.notFound('Payout provider reference not found.');

    if (['successful', 'failed', 'reversed'].includes(payout.status)) {
      return { payoutId: payout.id, status: payout.status, alreadyProcessed: true };
    }
    if (payout.status !== 'processing') {
      throw errors.conflict('PAYOUT_NOT_PROCESSING', 'Payout is not awaiting a provider outcome.');
    }

    await LedgerService.ensureMerchantAccounts(tx, payout.merchantId);
    if (input.outcome === 'successful') {
      await LedgerService.postJournalEntry(
        {
          reference: `payout-settled:${payout.id}`,
          entryType: 'payout_settlement',
          narration: `Settle payout ${payout.id}`,
          currency: payout.currency,
          lines: [
            { accountCode: merchantLedgerCode(payout.merchantId, 'in_transit'), direction: 'debit', amountMinor: payout.amountMinor },
            { accountCode: '1010', direction: 'credit', amountMinor: payout.amountMinor },
          ],
        },
        tx
      );
    } else {
      await LedgerService.postJournalEntry(
        {
          reference: `payout-returned:${payout.id}`,
          entryType: 'payout_return',
          narration: `Return unsuccessful payout ${payout.id} to available funds`,
          currency: payout.currency,
          lines: [
            { accountCode: merchantLedgerCode(payout.merchantId, 'in_transit'), direction: 'debit', amountMinor: payout.amountMinor },
            { accountCode: merchantLedgerCode(payout.merchantId, 'available'), direction: 'credit', amountMinor: payout.amountMinor },
          ],
        },
        tx
      );
    }

    const [updated] = await tx
      .update(payouts)
      .set({ status: input.outcome, paystackTransferCode: input.transferCode, updatedAt: new Date() })
      .where(eq(payouts.id, payout.id))
      .returning();
    await tx.insert(outboxEvents).values({
      type: `payout.${input.outcome}`,
      payload: { payoutId: payout.id, transferCode: input.transferCode },
    });
    return { payoutId: updated.id, status: updated.status, alreadyProcessed: false };
  });
}
