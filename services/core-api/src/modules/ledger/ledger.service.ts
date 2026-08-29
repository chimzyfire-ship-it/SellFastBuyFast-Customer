import { db } from '../../db/client.js';
import { journalEntries, journalLines, ledgerAccounts } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

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

export class LedgerService {
  /**
   * Posts a balanced double-entry journal.
   * Enforces invariant: SUM(debit amounts) === SUM(credit amounts)
   */
  static async postJournalEntry(input: PostJournalInput) {
    const { reference, entryType, narration, currency = 'NGN', lines } = input;

    // 1. Verify Balance Invariant
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of lines) {
      if (line.amountMinor <= 0) {
        throw new Error(`Invalid line amount: ${line.amountMinor}. Must be positive integer.`);
      }
      if (line.direction === 'debit') totalDebit += line.amountMinor;
      if (line.direction === 'credit') totalCredit += line.amountMinor;
    }

    if (totalDebit !== totalCredit) {
      throw new Error(
        `Ledger Invariant Violation: Debits (₦${totalDebit / 100}) do not equal Credits (₦${totalCredit / 100}).`
      );
    }

    // 2. Fetch Accounts
    const accountMap = new Map<string, string>();
    for (const line of lines) {
      if (!accountMap.has(line.accountCode)) {
        const [acc] = await db
          .select()
          .from(ledgerAccounts)
          .where(eq(ledgerAccounts.accountCode, line.accountCode))
          .limit(1);

        if (!acc) {
          throw new Error(`Ledger account ${line.accountCode} not found in chart of accounts.`);
        }
        accountMap.set(line.accountCode, acc.id);
      }
    }

    // 3. Insert Journal Entry and Lines
    const [entry] = await db
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

    await db.insert(journalLines).values(lineInserts);

    return entry;
  }
}
