import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError } from '../../lib/errors.js';
import { assertVerificationSubmissionAllowed, verificationIsActionable } from './vendor.policy.js';

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
