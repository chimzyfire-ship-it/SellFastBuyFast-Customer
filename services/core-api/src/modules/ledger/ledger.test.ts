import test from 'node:test';
import assert from 'node:assert/strict';
import { merchantLedgerCode, validateJournalLines } from './ledger.service.js';

test('accepts a balanced journal', () => {
  assert.doesNotThrow(() => validateJournalLines([
    { accountCode: '1000', direction: 'debit', amountMinor: 25_000 },
    { accountCode: '2000', direction: 'credit', amountMinor: 20_000 },
    { accountCode: '4000', direction: 'credit', amountMinor: 5_000 },
  ]));
});

test('rejects unbalanced, fractional, and non-positive journal amounts', () => {
  assert.throws(() => validateJournalLines([
    { accountCode: '1000', direction: 'debit', amountMinor: 10_000 },
    { accountCode: '2000', direction: 'credit', amountMinor: 9_999 },
  ]));
  assert.throws(() => validateJournalLines([
    { accountCode: '1000', direction: 'debit', amountMinor: 1.5 },
    { accountCode: '2000', direction: 'credit', amountMinor: 1.5 },
  ]));
  assert.throws(() => validateJournalLines([
    { accountCode: '1000', direction: 'debit', amountMinor: 0 },
    { accountCode: '2000', direction: 'credit', amountMinor: 0 },
  ]));
});

test('merchant account codes are isolated by merchant and balance state', () => {
  assert.equal(merchantLedgerCode('merchant-a', 'available'), 'merchant:merchant-a:available');
  assert.notEqual(merchantLedgerCode('merchant-a', 'available'), merchantLedgerCode('merchant-b', 'available'));
  assert.notEqual(merchantLedgerCode('merchant-a', 'available'), merchantLedgerCode('merchant-a', 'hold'));
});
