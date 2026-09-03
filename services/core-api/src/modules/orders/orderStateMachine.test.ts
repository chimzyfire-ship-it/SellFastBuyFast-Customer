import test from 'node:test';
import assert from 'node:assert/strict';
import { assertTransition } from './orderStateMachine.js';

test('allows the intended happy-path order transitions', () => {
  const path = [
    ['pending_payment', 'payment_confirmed'],
    ['payment_confirmed', 'processing'],
    ['processing', 'in_transit'],
    ['in_transit', 'delivered'],
    ['delivered', 'completed'],
  ];
  for (const [from, to] of path) assert.doesNotThrow(() => assertTransition(from, to));
});

test('rejects skipped and terminal-state transitions', () => {
  assert.throws(() => assertTransition('pending_payment', 'delivered'));
  assert.throws(() => assertTransition('completed', 'processing'));
  assert.throws(() => assertTransition('completed', 'disputed'));
  assert.throws(() => assertTransition('cancelled', 'payment_confirmed'));
});
