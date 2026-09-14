import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('API landing content matches the deployed Developer API contract', async () => {
  const [content, page] = await Promise.all([
    read('src/pages/StrikeApi/apiContent.ts'),
    read('src/pages/StrikeApi/StrikeApi.tsx'),
  ])

  assert.match(content, /https:\/\/strikerobot\.ai\/sr-platform\/app\/api\/v1/)
  assert.match(content, /\$\{API_BASE\}\/environments/)
  assert.match(content, /"id": "op_/)
  assert.match(content, /"status": "queued"/)
  assert.match(content, /"prompt":/)
  assert.match(content, /"robotId":/)
  assert.match(content, /"model":/)
  assert.match(content, /\/v1\/assets\/\{assetId\}\/visual/)
  assert.doesNotMatch(content, /api\.strikerobot\.ai/)
  assert.doesNotMatch(content, /scene_type|physics_rigor|"operation_id"|"QUEUED"/)
  assert.doesNotMatch(content, /from strikerobot|@strikerobot\/sdk|WEBHOOKS/)
  assert.doesNotMatch(content, /--fail-with-body|venice\/|op_01J8|env_01J8/)
  assert.match(content, /"model": "your_model_id"/)
  assert.match(content, /"Idempotency-Key: your_unique_request_id"/)
  assert.doesNotMatch(page, /140ms|99\.99%|USD \/ GLTF \/ URDF|OpenAPI 3\.1/)
})

test('all Developer API calls to action use the in-platform reference', async () => {
  const [page, navigation] = await Promise.all([
    read('src/pages/StrikeApi/StrikeApi.tsx'),
    read('src/strike/lib/navigate.ts'),
  ])

  assert.match(
    navigation,
    /srPlatformDeveloperApi:\s*'https:\/\/strikerobot\.ai\/sr-platform\/app\/docs\/api'/,
  )
  assert.equal((page.match(/EXTERNAL_LINKS\.srPlatformDeveloperApi/g) ?? []).length, 3)
})

test('Caddy example scopes Paddle-compatible browser headers to SR Platform', async () => {
  const caddy = await read('Caddyfile.example')

  assert.match(caddy, /handle \/sr-platform\/app\/\*/)
  assert.match(caddy, /reverse_proxy https:\/\/eastworlds\.strikerobot\.ai/)
  assert.match(caddy, /-Cross-Origin-Embedder-Policy/)
  assert.match(caddy, /Cross-Origin-Opener-Policy "same-origin-allow-popups"/)
})
