import { apiRequest, createIdempotencyKey } from './apiClient';

const STATUS_LABELS = {
  pending_payment: 'Awaiting Payment',
  payment_confirmed: 'Placed',
  processing: 'Accepted',
  in_transit: 'Shipped',
  delivered: 'Delivered',
  completed: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Returned',
  disputed: 'In Review',
};

export function formatOrder(order) {
  const lines = order.lines || [];
  const address = order.deliveryAddress || {};
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    date: order.createdAt,
    merchantName: order.merchantName || 'Marketplace Merchant',
    merchantId: order.merchantId,
    status: STATUS_LABELS[order.status] || order.status,
    apiStatus: order.status,
    totalAmount: Number(order.totalAmountMinor) / 100,
    deliveryFee: Number(order.deliveryFeeMinor) / 100,
    trackingNumber: order.trackingCode,
    items: lines.map((line) => ({
      id: line.variantId,
      name: line.productTitle,
      quantity: line.quantity,
      price: Number(line.unitPriceMinor) / 100,
    })),
    shippingAddress: {
      recipient: address.contactName,
      phone: address.contactPhone,
      street: address.streetAddress,
      city: address.lga,
      state: address.state,
    },
  };
}

export async function listOrders() {
  const orders = await apiRequest('/v1/orders');
  return orders.map(formatOrder);
}

export async function getOrder(orderId) {
  return formatOrder(await apiRequest(`/v1/orders/${orderId}`));
}

export function cancelOrder(orderId, reason) {
  return apiRequest(`/v1/orders/${orderId}/cancel`, {
    method: 'POST',
    idempotencyKey: createIdempotencyKey('cancel'),
    body: { reason },
  });
}
