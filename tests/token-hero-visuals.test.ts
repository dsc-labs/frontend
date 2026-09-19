import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { TokenBurnHeroVisual, TokenSupplyHeroVisual } from '../src/pages/StrikeToken/TokenHeroVisuals'
import type { TokenOverviewResponse } from '../lib/tokenOverviewTypes'

const live: TokenOverviewResponse = {
  status: 'live', source: 'onchain',
  token: {
    name: 'Strike Robot', symbol: 'SR', network: 'Base Mainnet', standard: 'ERC-20',
    decimals: 18, contractAddress: '0x10c56F005a379f8eAfc88ff5c3f40d30F0031AC9',
  },
  supply: { totalSupply: '1000000000', initialSupply: null, circulatingSupply: null, lockedSupply: null, totalBurned: null },
  indexedBlock: 51_503_377, updatedAt: '2026-09-19T00:00:00.000Z',
}

test('supply hero labels the verified one-billion total without preview allocation or chart', () => {
  const markup = renderToStaticMarkup(TokenSupplyHeroVisual({ data: live, state: 'live' }))
  assert.match(markup, /1B/)
  assert.match(markup, /On-chain data/)
  assert.match(markup, /Not yet verified/)
  assert.doesNotMatch(markup, /Preview data|<polyline|strike-token__hero-allocation/)
})

test('burn hero reports unverified data without preview burn totals or a chart', () => {
  const markup = renderToStaticMarkup(TokenBurnHeroVisual())
  assert.match(markup, /Not yet verified/)
  assert.doesNotMatch(markup, /Preview data|14\.85M|<polyline|Latest preview event/)
})

test('supply hero does not claim on-chain data while loading', () => {
  const markup = renderToStaticMarkup(TokenSupplyHeroVisual({ data: null, state: 'loading' }))
  assert.doesNotMatch(markup, /On-chain data|1B|Preview data/)
  assert.match(markup, /Loading/)
})
