import { db } from '../../db/client.js';
import { journalEntries, journalLines, ledgerAccounts } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { errors } from '../../lib/errors.js';

export interface JournalLineInput {
  accountCode: string;
  direction: 'debit' | 'credit';
  amountMinor: number;
}

export interface PostJournalInput {
  reference: string;
  entryType: string;
  narration: string;
  currency?: string;
  lines: JournalLineInput[];
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type LedgerExecutor = typeof db | Tx;

export function validateJournalLines(lines: JournalLineInput[]): void {
  if (lines.length < 2) {
    throw errors.ledgerUnbalanced('A journal entry requires at least two lines.');
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    if (!Number.isSafeInteger(line.amountMinor) || line.amountMinor <= 0) {
      throw errors.ledgerUnbalanced(`Invalid line amount: ${line.amountMinor}.`);
    }
    if (line.direction === 'debit') totalDebit += line.amountMinor;
    if (line.direction === 'credit') totalCredit += line.amountMinor;
  }

  if (totalDebit !== totalCredit) {
    throw errors.ledgerUnbalanced(`Debits (${totalDebit}) do not equal credits (${totalCredit}).`);
  }
}

export function merchantLedgerCode(
  merchantId: string,
  state: 'pending' | 'available' | 'hold' | 'in_transit'
): string {
  return `merchant:${merchantId}:${state}`;
}

export class LedgerService {
  static async ensureAccount(
    exec: LedgerExecutor,
    input: {
      accountCode: string;
      accountName: string;
      accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
      currency?: string;
      merchantId?: string;
    }
  ) {
    const [existing] = await exec
      .select()
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.accountCode, input.accountCode))
      .limit(1);

    if (existing) return existing;

    const [created] = await exec
      .insert(ledgerAccounts)
      .values({
        accountCode: input.accountCode,
        accountName: input.accountName,
        accountType: input.accountType,
        currency: input.currency ?? 'NGN',
        merchantId: input.merchantId,
      })
      .onConflictDoNothing()
      .returning();

    if (created) return created;

    const [concurrent] = await exec
      .select()
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.accountCode, input.accountCode))
      .limit(1);
    if (!concurrent) throw errors.internal('Unable to create ledger account.');
    return concurrent;
  }

  static async ensureMerchantAccounts(exec: LedgerExecutor, merchantId: string): Promise<void> {
    for (const state of ['pending', 'available', 'hold', 'in_transit'] as const) {
      await this.ensureAccount(exec, {
        accountCode: merchantLedgerCode(merchantId, state),
        accountName: `Merchant ${state.replace('_', ' ')} funds`,
        accountType: 'liability',
        merchantId,
      });
    }
  }

  static async postJournalEntry(input: PostJournalInput, exec: LedgerExecutor = db) {
    const { reference, entryType, narration, currency = 'NGN', lines } = input;
    validateJournalLines(lines);

    // 2. Fetch Accounts
    const accountMap = new Map<string, string>();
    for (const line of lines) {
      if (!accountMap.has(line.accountCode)) {
        const [acc] = await exec
          .select()
          .from(ledgerAccounts)
          .where(eq(ledgerAccounts.accountCode, line.accountCode))
          .limit(1);

        if (!acc) {
          throw errors.internal(`Ledger account ${line.accountCode} not found.`);
        }
        accountMap.set(line.accountCode, acc.id);
      }
    }

    // 3. Insert Journal Entry and Lines
    const [entry] = await exec
      .insert(journalEntries)
      .values({
        reference,
        entryType,
        narration,
        currency,
      })
      .returning();

    const lineInserts = lines.map((l) => ({
      journalEntryId: entry.id,
      accountId: accountMap.get(l.accountCode)!,
      direction: l.direction,
      amountMinor: l.amountMinor,
    }));

    await exec.insert(journalLines).values(lineInserts);

    return entry;
  }
}
