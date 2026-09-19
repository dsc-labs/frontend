import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('token routes and global navigation are registered together', async () => {
  const [app, constants, navigate] = await Promise.all([
    read('src/App.tsx'),
    read('src/strike/lib/constants.ts'),
    read('src/strike/lib/navigate.ts'),
  ])

  assert.match(navigate, /token:\s*'\/token'/)
  assert.match(navigate, /tokenBurns:\s*'\/token\/burns'/)
  assert.match(constants, /\{ label: "Token", href: ROUTES\.token \}/)
  assert.match(app, /path="\/token"/)
  assert.match(app, /path="\/token\/burns"/)
})
