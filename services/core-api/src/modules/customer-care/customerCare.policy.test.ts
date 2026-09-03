import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError } from '../../lib/errors.js';
import { assertDisputeEligibility, assertReturnEligibility } from './customerCare.policy.js';

test('allows a delivered order inside the configured return window', () => {
  assert.doesNotThrow(() => assertReturnEligibility({
    orderStatus: 'delivered',
    deliveredAt: new Date('2026-09-01T12:00:00Z'),
    now: new Date('2026-09-07T12:00:00Z'),
    returnWindowDays: 7,
  }));
});

test('rejects undelivered orders and expired return windows with stable codes', () => {
  assert.throws(
    () => assertReturnEligibility({ orderStatus: 'in_transit', deliveredAt: null, returnWindowDays: 7 }),
    (error) => error instanceof AppError && error.code === 'ORDER_NOT_RETURNABLE'
  );
  assert.throws(
    () => assertReturnEligibility({
      orderStatus: 'delivered',
      deliveredAt: new Date('2026-09-01T12:00:00Z'),
      now: new Date('2026-09-09T12:00:00Z'),
      returnWindowDays: 7,
    }),
    (error) => error instanceof AppError && error.code === 'RETURN_WINDOW_CLOSED'
  );
});

test('only allows disputes while fulfilment or buyer protection is active', () => {
  for (const status of ['processing', 'in_transit', 'delivered']) {
    assert.doesNotThrow(() => assertDisputeEligibility(status));
  }
  assert.throws(
    () => assertDisputeEligibility('pending_payment'),
    (error) => error instanceof AppError && error.code === 'ORDER_NOT_DISPUTABLE'
  );
  assert.throws(
    () => assertDisputeEligibility('completed'),
    (error) => error instanceof AppError && error.code === 'ORDER_NOT_DISPUTABLE'
  );
});
