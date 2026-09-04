import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError } from '../../lib/errors.js';
import {
  assertRegistrationSubmissionAllowed,
  assertStoreSlugAllowed,
  assertVerificationSubmissionAllowed,
  isNigerianPhone,
  normalizeNigerianPhone,
  normalizeStoreSlug,
  verificationIsActionable,
} from './vendor.policy.js';

test('allows a merchant to submit or resubmit a pending or rejected verification', () => {
  assert.doesNotThrow(() => assertVerificationSubmissionAllowed());
  assert.doesNotThrow(() => assertVerificationSubmissionAllowed('pending'));
  assert.doesNotThrow(() => assertVerificationSubmissionAllowed('rejected'));
  assert.equal(verificationIsActionable('pending'), true);
  assert.equal(verificationIsActionable('rejected'), true);
});

test('prevents merchant changes after verification has been approved', () => {
  assert.equal(verificationIsActionable('approved'), false);
  assert.throws(
    () => assertVerificationSubmissionAllowed('approved'),
    (error) => error instanceof AppError && error.code === 'VERIFICATION_LOCKED'
  );
});

test('normalizes valid Nigerian phones and enforces safe storefront handles', () => {
  assert.equal(normalizeNigerianPhone('0803 456 7890'), '+2348034567890');
  assert.equal(normalizeNigerianPhone('234-812-345-6789'), '+2348123456789');
  assert.equal(isNigerianPhone('+2348034567890'), true);
  assert.equal(isNigerianPhone('+2346034567890'), false);

  const slug = normalizeStoreSlug('Chímzy Luxury!!!');
  assert.equal(slug, 'chimzy-luxury');
  assert.doesNotThrow(() => assertStoreSlugAllowed(slug));
  assert.throws(
    () => assertStoreSlugAllowed('admin'),
    (error) => error instanceof AppError && error.code === 'SLUG_RESERVED'
  );
});

test('allows registration after rejection but locks approved and in-review records', () => {
  assert.doesNotThrow(() => assertRegistrationSubmissionAllowed('not_registered', 'rejected'));
  assert.throws(
    () => assertRegistrationSubmissionAllowed('in_review', 'pending'),
    (error) => error instanceof AppError && error.code === 'REGISTRATION_UNDER_REVIEW'
  );
  assert.throws(
    () => assertRegistrationSubmissionAllowed('registered', 'approved'),
    (error) => error instanceof AppError && error.code === 'REGISTRATION_LOCKED'
  );
});
