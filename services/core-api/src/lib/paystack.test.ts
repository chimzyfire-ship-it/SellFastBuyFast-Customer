import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { computePaystackSignature } from './paystack.js';

test('computes the Paystack HMAC-SHA512 signature from raw bytes', () => {
  const raw = Buffer.from('{"event":"charge.success","data":{"id":42}}');
  const secret = 'sk_test_known_secret';
  const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex');
  assert.equal(computePaystackSignature(raw, secret), expected);
});

test('different raw payloads produce different signatures', () => {
  const secret = 'sk_test_known_secret';
  assert.notEqual(
    computePaystackSignature(Buffer.from('{"amount":100}'), secret),
    computePaystackSignature(Buffer.from('{"amount":101}'), secret)
  );
});
