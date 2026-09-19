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
  assert.match(constants, /\{ label: "Token", href: ROUTES\.token, hasDropdown: true \}/)
  assert.match(app, /path="\/token"/)
  assert.match(app, /path="\/token\/burns"/)
})

test('global navigation uses the mobile menu until the extra token item fits', async () => {
  const navbar = await read('src/strike/components/layout/Navbar.tsx')
  assert.match(navbar, /hidden w-full items-center justify-between gap-6 p-6 lg:flex/)
  assert.match(navbar, /pointer-events-auto px-3 lg:hidden/)
  assert.match(navbar, /z-\[1001\] flex flex-col gap-3 overflow-hidden p-3 lg:hidden/)
})
