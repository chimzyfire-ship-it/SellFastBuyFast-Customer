import crypto from 'node:crypto';

export function carrierWebhookKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function isDeliveredWebhookEvent(value: string): boolean {
  return ['delivered', 'delivered-to-recipient', 'delivered-to-destination', 'delivery-completed']
    .includes(carrierWebhookKey(value));
}

export function verifyLogisticsWebhookSignature(
  rawBody: Buffer | undefined,
  signature: string | undefined,
  secret: string
): boolean {
  if (!rawBody || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const received = signature.replace(/^sha256=/i, '');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');
  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
