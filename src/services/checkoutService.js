import { apiRequest, createIdempotencyKey } from './apiClient';

const redirectUrl = 'sellfastbuyfast://payment/callback';

function checkoutAddress(address) {
  return {
    contactName: address.recipient || address.contactName,
    contactPhone: address.phone || address.contactPhone,
    state: address.state,
    lga: address.lga || address.city,
    streetAddress: address.street || address.streetAddress,
    landmark: address.landmark || undefined,
  };
}

export async function createCheckout(cart, address) {
  if (!cart.length) throw new Error('Your bag is empty.');
  const merchantId = cart[0].product?.merchantId;
  const items = cart.map((item) => ({
    variantId: item.variantId || item.product?.defaultVariantId,
    quantity: item.quantity,
  }));
  if (!merchantId || items.some((item) => !item.variantId)) {
    throw new Error('This bag contains preview products that are not available for live checkout.');
  }

  return apiRequest('/v1/orders/checkout', {
    method: 'POST',
    idempotencyKey: createIdempotencyKey('checkout'),
    body: { merchantId, items, deliveryAddress: checkoutAddress(address) },
    timeoutMs: 20_000,
  });
}

export function initializePayment(orderId) {
  return apiRequest('/v1/payments/initialize', {
    method: 'POST',
    idempotencyKey: createIdempotencyKey('payment'),
    body: { orderId, callbackUrl: redirectUrl },
    timeoutMs: 20_000,
  });
}

export function verifyPayment(reference) {
  return apiRequest(`/v1/payments/verify/${encodeURIComponent(reference)}`, { timeoutMs: 20_000 });
}

export { redirectUrl };
