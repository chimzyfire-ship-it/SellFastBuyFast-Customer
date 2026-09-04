import assert from 'node:assert/strict';
import test from 'node:test';

test('encrypts KYC identity values with authenticated encryption and never returns plaintext', async () => {
  process.env.KYC_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  const { decryptKycValue, encryptKycValue } = await import('./kyc.js');
  const nin = '83920194821';
  const encrypted = encryptKycValue(nin);

  assert.match(encrypted, /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.equal(encrypted.includes(nin), false);
  assert.equal(decryptKycValue(encrypted), nin);
});
