import { db } from '../../db/client.js';
import { inventoryTransactions } from '../../db/schema.js';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type InventoryAction =
  | 'merchant_set'
  | 'checkout_reserve'
  | 'checkout_release'
  | 'order_fulfilled'
  | 'return_restock'
  | 'admin_adjustment';

/**
 * The inventory transaction log is append-only. It records the sellable stock
 * delta; movements solely between reserved and committed stock use delta zero.
 */
export async function recordInventoryTransaction(
  tx: Tx,
  input: {
    variantId: string;
    delta: number;
    actionType: InventoryAction;
    balanceAfter: number;
    referenceId?: string;
    actorId?: string;
    note?: string;
  }
): Promise<void> {
  await tx.insert(inventoryTransactions).values({
    variantId: input.variantId,
    delta: input.delta,
    actionType: input.actionType,
    balanceAfter: input.balanceAfter,
    referenceId: input.referenceId,
    actorId: input.actorId,
    note: input.note,
  });
}
