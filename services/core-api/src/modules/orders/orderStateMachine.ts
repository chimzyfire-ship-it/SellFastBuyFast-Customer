import { db } from '../../db/client.js';
import { orders, orderStatusEvents } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { errors } from '../../lib/errors.js';

export const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['payment_confirmed', 'cancelled'],
  payment_confirmed: ['processing', 'cancelled', 'refunded'],
  processing: ['in_transit', 'disputed'],
  in_transit: ['delivered', 'disputed'],
  delivered: ['completed', 'disputed'],
  completed: [],
  disputed: ['completed', 'refunded'],
  cancelled: [],
  refunded: [],
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function assertTransition(from: string, to: string): void {
  const allowed = ORDER_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw errors.invalidTransition(`Cannot transition order from '${from}' to '${to}'.`);
  }
}

export async function transitionOrder(
  exec: typeof db | Tx,
  orderId: string,
  to: string,
  actorId?: string,
  note?: string
) {
  const [order] = await exec.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw errors.notFound('Order not found.');

  assertTransition(order.status, to);

  await exec
    .update(orders)
    .set({ status: to as any, updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  await exec.insert(orderStatusEvents).values({
    orderId,
    fromStatus: order.status as any,
    toStatus: to as any,
    actorId: actorId ?? null,
    note: note ?? null,
  });

  return { ...order, status: to };
}
