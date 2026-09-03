import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError } from '../../lib/errors.js';
import {
  assertProductReadyForSubmission,
  assertProductTransition,
  requiresRemoderation,
} from './catalogManagement.policy.js';

test('allows merchant submission and moderator decisions', () => {
  assert.doesNotThrow(() => assertProductTransition('draft', 'pending_approval'));
  assert.doesNotThrow(() => assertProductTransition('pending_approval', 'published'));
  assert.doesNotThrow(() => assertProductTransition('pending_approval', 'draft'));
});

test('requires complete submission data and only remoderates listing-affecting edits', () => {
  assert.doesNotThrow(() => assertProductReadyForSubmission({
    description: 'Handcrafted leather Oxford shoes with cushioned insoles.',
    category: { isActive: true, parentId: 'fashion-root' },
    variants: [{ sku: 'SFBF-OXFORD-42', priceMinor: 4_500_000 }],
    media: [{ mediaType: 'image' }],
  }));
  assert.throws(
    () => assertProductReadyForSubmission({
      description: 'Too short',
      category: { isActive: true, parentId: 'fashion-root' },
      variants: [{ sku: 'SFBF-OXFORD-42', priceMinor: 4_500_000 }],
      media: [{ mediaType: 'image' }],
    }),
    (error) => error instanceof AppError && error.code === 'PRODUCT_INCOMPLETE'
  );
  assert.equal(requiresRemoderation({ comparePriceMinor: 5_500_000 } as any), false);
  assert.equal(requiresRemoderation({ title: 'Updated product title' }), true);
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
