import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('token dashboard composes the shared site shell and all reference sections', async () => {
  const [page, shell, hero] = await Promise.all([
    read('src/pages/StrikeToken/StrikeTokenDashboard.tsx'),
    read('src/pages/StrikeToken/TokenPageShell.tsx'),
    read('src/pages/StrikeToken/TokenHeroVisuals.tsx'),
  ])

  assert.match(shell, /<Navbar\s*\/>/)
  assert.match(shell, /<Footer\s*\/>/)
  assert.match(page, /Strike Robot Token/)
  assert.match(page, /Token supply/)
  assert.match(page, /Supply over time/)
  assert.match(page, /Token details/)
  assert.match(hero, /Preview data/)
  assert.match(page, /Explore Burn Tracker/)
  assert.doesNotMatch(page, /Sign In|Get Started/)
})

test('burn tracker includes the required history, explanation, and activity areas', async () => {
  const page = await read('src/pages/StrikeToken/StrikeTokenBurns.tsx')

  assert.match(page, /<h1>Burn Tracker<\/h1>/)
  assert.match(page, /Burn history/)
  assert.match(page, /How burns work/)
  assert.match(page, /Burn activity/)
  assert.match(page, /aria-label="Burn history"/)
  assert.match(page, /Back to Token Dashboard/)
  assert.match(page, /transactionUrl\s*\?/) // only verified live events can link to the explorer
})

test('token uses a split hero without a sticky tab layer', async () => {
  const [shell, dashboard, burns, css, navbar, constants] = await Promise.all([
    read('src/pages/StrikeToken/TokenPageShell.tsx'),
    read('src/pages/StrikeToken/StrikeTokenDashboard.tsx'),
    read('src/pages/StrikeToken/StrikeTokenBurns.tsx'),
    read('src/pages/StrikeToken/StrikeToken.css'),
    read('src/strike/components/layout/Navbar.tsx'),
    read('src/strike/lib/constants.ts'),
  ])

  assert.match(shell, /<div className="strike-token__hero-band">[\s\S]*?\{hero\}/)
  assert.match(dashboard, /hero=\{[\s\S]*?<h1>Strike Robot Token<\/h1>/)
  assert.match(dashboard, /<TokenSupplyHeroVisual/)
  assert.match(burns, /<TokenBurnHeroVisual/)
  assert.match(burns, /Explore Token Dashboard/)
  assert.match(css, /--token-canvas:\s*#e5e5e5/)
  assert.match(css, /\.strike-token__hero\s*\{[^}]*display:\s*grid/s)
  assert.doesNotMatch(css, /\.strike-token__subnav-wrap/)
  assert.doesNotMatch(shell, /strike-token__subnav-wrap/)
  assert.match(constants, /label: "Token", href: ROUTES\.token, hasDropdown: true/)
  assert.match(navbar, /TOKEN_LINKS/)
  assert.match(navbar, /aria-expanded=\{isDropdown \? desktopDropdown === item\.label : undefined\}/)
})
