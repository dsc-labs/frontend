import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatPercent,
  formatTokenAmount,
  formatUtcDate,
  shortenHex,
} from '../src/pages/StrikeToken/tokenFormat.ts'
import {
  BURN_PAGE_PREVIEW,
  SR_TOKEN_ADDRESS,
  TOKEN_OVERVIEW_PREVIEW,
} from '../src/pages/StrikeToken/tokenPreviewData.ts'

test('token amount formatting preserves integer precision and decimal text', () => {
  assert.equal(formatTokenAmount('14850290'), '14,850,290')
  assert.equal(formatTokenAmount('900719925474099312345678.1250'), '900,719,925,474,099,312,345,678.125')
  assert.equal(formatTokenAmount('0'), '0')
})

test('token metadata helpers format percentages, UTC dates, and hashes', () => {
  assert.equal(formatPercent('14.85029'), '14.85%')
  assert.equal(formatUtcDate('2025-02-24T14:32:10.000Z'), 'Feb 24, 2025, 14:32:10 UTC')
  assert.equal(shortenHex('0x82f91234567890abcdef92f1'), '0x82f9...92f1')
})

test('preview data is deterministic and cannot impersonate live chain data', () => {
  assert.equal(SR_TOKEN_ADDRESS, '0x10c56F005a379f8eAfc88ff5c3f40d30F0031AC9')
  assert.equal(TOKEN_OVERVIEW_PREVIEW.source, 'preview')
  assert.equal(BURN_PAGE_PREVIEW.source, 'preview')
  assert.equal(TOKEN_OVERVIEW_PREVIEW.supply.initialSupply, '100000000')
  assert.equal(TOKEN_OVERVIEW_PREVIEW.history.length, 5)
  assert.equal(BURN_PAGE_PREVIEW.events.length, 5)
  assert.ok(BURN_PAGE_PREVIEW.events.every((event) => event.transactionUrl === null))
})
