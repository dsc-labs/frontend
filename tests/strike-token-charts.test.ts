import assert from 'node:assert/strict'
import test from 'node:test'
import { BURN_PAGE_PREVIEW, TOKEN_OVERVIEW_PREVIEW } from '../src/pages/StrikeToken/tokenPreviewData.ts'
import { chartScaleMax, filterBurnEvents, historyWithinDays } from '../src/pages/StrikeToken/tokenChartData.ts'

test('range controls select actual UTC windows anchored to the latest sample', () => {
  const supply = TOKEN_OVERVIEW_PREVIEW.history
  const burns = BURN_PAGE_PREVIEW.activity
  assert.deepEqual(historyWithinDays(supply, 30).map((point) => point.label), [
    'T-29D', 'T-23D', 'T-14D', 'T-6D', 'Latest preview',
  ])
  assert.deepEqual(historyWithinDays(burns, 7).map((point) => point.label), [
    'T-6D', 'Latest preview',
  ])
  assert.deepEqual(historyWithinDays(burns, 90).map((point) => point.label), [
    'T-30D', 'T-29D', 'T-23D', 'T-14D', 'T-6D', 'Latest preview',
  ])
})

test('chart axis derives from data and can display a billion SR', () => {
  assert.equal(chartScaleMax(['97000000', '85149710']), 100_000_000)
  assert.equal(chartScaleMax(['1000000000', '980000000']), 1_000_000_000)
  assert.equal(chartScaleMax([]), 1)
})

test('burn filters retain only the selected event type', () => {
  const events = BURN_PAGE_PREVIEW.events
  assert.equal(filterBurnEvents(events, 'all').length, 5)
  assert.equal(filterBurnEvents(events, 'protocol-buyback').length, 3)
  assert.equal(filterBurnEvents(events, 'scheduled-reduction').length, 2)
})
