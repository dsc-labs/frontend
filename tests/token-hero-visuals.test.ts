import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { TokenBurnHeroVisual, TokenSupplyHeroVisual } from '../src/pages/StrikeToken/TokenHeroVisuals'

function secondPointX(markup: string) {
  const coordinates = markup.match(/<polyline points="([^"]+)"/)
  assert.ok(coordinates, 'hero visualization has a line')
  return Number(coordinates[1].split(' ')[1].split(',')[0])
}

test('supply preview line places samples according to their UTC timestamps', () => {
  const markup = renderToStaticMarkup(TokenSupplyHeroVisual())
  // 2024-05-24 is about 25% through the Feb 2024–Feb 2025 fixture period.
  assert.ok(secondPointX(markup) > 120 && secondPointX(markup) < 140)
})

test('burn preview line places samples according to their UTC timestamps', () => {
  const markup = renderToStaticMarkup(TokenBurnHeroVisual())
  assert.ok(secondPointX(markup) > 120 && secondPointX(markup) < 140)
})

test('supply preview legend names all four fixture allocations', () => {
  const markup = renderToStaticMarkup(TokenSupplyHeroVisual())
  const legend = markup.match(/<div class="strike-token__hero-legend">([\s\S]*?)<\/div>/)
  assert.ok(legend, 'hero visualization has a legend')
  assert.match(legend[1], /Other/)
  assert.match(legend[1], /2\.9%/)
})
