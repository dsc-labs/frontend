import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('token dashboard composes the shared site shell and all reference sections', async () => {
  const [page, shell] = await Promise.all([
    read('src/pages/StrikeToken/StrikeTokenDashboard.tsx'),
    read('src/pages/StrikeToken/TokenPageShell.tsx'),
  ])

  assert.match(shell, /<Navbar\s*\/>/)
  assert.match(shell, /<Footer\s*\/>/)
  assert.match(page, /Strike Robot Token/)
  assert.match(page, /Token supply/)
  assert.match(page, /Supply over time/)
  assert.match(page, /Token details/)
  assert.match(shell, /Preview data/)
  assert.match(shell, /aria-current/)
  assert.doesNotMatch(page, /Sign In|Get Started/)
})

test('burn tracker includes the required history, explanation, and activity areas', async () => {
  const page = await read('src/pages/StrikeToken/StrikeTokenBurns.tsx')

  assert.match(page, /Track every token burn\./)
  assert.match(page, /Burn history/)
  assert.match(page, /How burns work/)
  assert.match(page, /Burn activity/)
  assert.match(page, /aria-label="Burn history"/)
  assert.match(page, /Back to Token Dashboard/)
  assert.match(page, /transactionUrl\s*\?/) // only verified live events can link to the explorer
})
