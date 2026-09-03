import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateReturnWindowEndsAt } from './fulfilment.service.js';

test('calculates the exact buyer-protection deadline from the delivery timestamp', () => {
  const deliveredAt = new Date('2026-09-03T09:30:00.000Z');
  assert.equal(
    calculateReturnWindowEndsAt(deliveredAt, 7).toISOString(),
    '2026-09-10T09:30:00.000Z'
  );
});
