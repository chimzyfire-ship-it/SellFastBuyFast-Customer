import crypto from 'node:crypto';
import { config } from './config.js';
import { errors } from './errors.js';

const CIPHER_VERSION = 'v1';
const IV_BYTES = 12;

function encryptionKey(): Buffer {
  const key = Buffer.from(config.kycEncryptionKey, 'base64');
  if (key.length !== 32) {
    throw errors.unavailable(
      'KYC_ENCRYPTION_UNAVAILABLE',
      'Merchant registration is unavailable until KYC encryption is configured.'
    );
  }
  return key;
}

/**
 * Encrypts legal identity data before it reaches PostgreSQL. The ciphertext is
 * versioned so a future key-rotation job can distinguish encryption schemes.
 */
export function encryptKycValue(value: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    CIPHER_VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

export function decryptKycValue(payload: string): string {
  const [version, ivEncoded, tagEncoded, ciphertextEncoded] = payload.split('.');
  if (version !== CIPHER_VERSION || !ivEncoded || !tagEncoded || !ciphertextEncoded) {
    throw errors.internal('Stored KYC data has an unsupported encryption format.');
  }
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivEncoded, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextEncoded, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch (error) {
    if (error instanceof Error && error.message.includes('KYC encryption is configured')) throw error;
    throw errors.internal('Stored KYC data could not be decrypted.');
  }
}
