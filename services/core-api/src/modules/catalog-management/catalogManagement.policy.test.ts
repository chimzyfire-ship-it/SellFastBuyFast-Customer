import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError } from '../../lib/errors.js';
import { assertProductTransition } from './catalogManagement.policy.js';

test('allows merchant submission and moderator decisions', () => {
  assert.doesNotThrow(() => assertProductTransition('draft', 'pending_approval'));
  assert.doesNotThrow(() => assertProductTransition('pending_approval', 'published'));
  assert.doesNotThrow(() => assertProductTransition('pending_approval', 'draft'));
});

test('rejects publishing without moderation and editing a pending product', () => {
  assert.throws(
    () => assertProductTransition('draft', 'published'),
    (error) => error instanceof AppError && error.code === 'INVALID_PRODUCT_TRANSITION'
  );
  assert.throws(
    () => assertProductTransition('pending_approval', 'archived'),
    (error) => error instanceof AppError && error.code === 'INVALID_PRODUCT_TRANSITION'
  );
});
