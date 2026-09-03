import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import {
  carrierWebhookKey,
  isDeliveredWebhookEvent,
  verifyLogisticsWebhookSignature,
} from './logistics.policy.js';

test('normalizes carrier names and recognizes only final-delivery events', () => {
  assert.equal(carrierWebhookKey('GIG Logistics'), 'gig-logistics');
  assert.equal(isDeliveredWebhookEvent('DELIVERED_TO_RECIPIENT'), true);
  assert.equal(isDeliveredWebhookEvent('out_for_delivery'), false);
});

test('verifies HMAC-SHA256 carrier signatures against the exact raw request bytes', () => {
  const rawBody = Buffer.from('{"eventId":"evt-1","event":"DELIVERED_TO_RECIPIENT"}');
  const secret = 'carrier-webhook-secret';
  const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  assert.equal(verifyLogisticsWebhookSignature(rawBody, `sha256=${signature}`, secret), true);
  assert.equal(verifyLogisticsWebhookSignature(Buffer.from('{}'), signature, secret), false);
  assert.equal(verifyLogisticsWebhookSignature(rawBody, signature, 'wrong-secret'), false);
});
