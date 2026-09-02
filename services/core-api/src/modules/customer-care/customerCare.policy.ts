import { errors } from '../../lib/errors.js';

const RETURNABLE_ORDER_STATUSES = new Set(['delivered']);
const DISPUTABLE_ORDER_STATUSES = new Set(['processing', 'in_transit', 'delivered', 'completed']);

export function assertReturnEligibility(input: {
  orderStatus: string;
  deliveredAt: Date | null;
  now?: Date;
  returnWindowDays: number;
}): void {
  if (!RETURNABLE_ORDER_STATUSES.has(input.orderStatus) || !input.deliveredAt) {
    throw errors.conflict('ORDER_NOT_RETURNABLE', 'Only a delivered order can be returned.');
  }

  const now = input.now ?? new Date();
  const closesAt = new Date(input.deliveredAt.getTime() + input.returnWindowDays * 86_400_000);
  if (closesAt < now) {
    throw errors.conflict('RETURN_WINDOW_CLOSED', `The return window closed at ${closesAt.toISOString()}.`);
  }
}

export function assertDisputeEligibility(orderStatus: string): void {
  if (!DISPUTABLE_ORDER_STATUSES.has(orderStatus)) {
    throw errors.conflict('ORDER_NOT_DISPUTABLE', 'This order is not eligible for a dispute.');
  }
}
