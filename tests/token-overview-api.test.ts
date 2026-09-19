import assert from 'node:assert/strict'
import test from 'node:test'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { TokenOverviewResponse } from '../lib/tokenOverviewTypes.ts'
import { createTokenOverviewHandler } from '../api/token/overview.ts'
import { readTokenOverview } from '../lib/tokenOnchainOverview.ts'

const fakeOverview: TokenOverviewResponse = {
  status: 'live',
  source: 'onchain',
  token: {
    name: 'Strike Robot', symbol: 'SR', network: 'Base Mainnet', standard: 'ERC-20',
    decimals: 18, contractAddress: '0x10c56F005a379f8eAfc88ff5c3f40d30F0031AC9',
  },
  supply: {
    totalSupply: '1000000000', initialSupply: null, circulatingSupply: null,
    lockedSupply: null, totalBurned: null,
  },
  indexedBlock: 51_503_377,
  updatedAt: '2026-09-19T00:00:00.000Z',
}

function fakeResponse() {
  const headers = new Map<string, string>()
  const res = {
    statusCode: 200,
    body: '',
    setHeader(name: string, value: string) { headers.set(name.toLowerCase(), value); return this },
    status(code: number) { this.statusCode = code; return this },
    end(body?: string) { this.body = body ?? ''; return this },
  }
  return { response: res as unknown as VercelResponse, state: res, headers }
}

async function withRpcEnv(value: string | undefined, run: () => Promise<void>) {
  const previous = process.env.BASE_RPC_URL
  if (value === undefined) delete process.env.BASE_RPC_URL
  else process.env.BASE_RPC_URL = value
  try { await run() } finally {
    if (previous === undefined) delete process.env.BASE_RPC_URL
    else process.env.BASE_RPC_URL = previous
  }
}

test('GET returns verified supply with short cache and unknowns null', async () => {
  await withRpcEnv('https://example.invalid/private-key', async () => {
    const { response, state, headers } = fakeResponse()
    const handler = createTokenOverviewHandler(async () => fakeOverview)
    await handler({ method: 'GET' } as VercelRequest, response)
    assert.equal(state.statusCode, 200)
    assert.equal(headers.get('cache-control'), 'public, s-maxage=30')
    const body = JSON.parse(state.body) as TokenOverviewResponse
    assert.equal(body.supply.totalSupply, '1000000000')
    assert.equal(body.supply.totalBurned, null)
    assert.equal(body.indexedBlock, 51_503_377)
  })
})

test('rejects non-GET requests before accessing the RPC', async () => {
  await withRpcEnv('https://example.invalid/private-key', async () => {
    const { response, state, headers } = fakeResponse()
    const handler = createTokenOverviewHandler(async () => { throw new Error('must not call RPC') })
    await handler({ method: 'POST' } as VercelRequest, response)
    assert.equal(state.statusCode, 405)
    assert.equal(headers.get('allow'), 'GET')
  })
})

test('missing private RPC does not use a public VITE fallback', async () => {
  await withRpcEnv(undefined, async () => {
    const { response, state, headers } = fakeResponse()
    const handler = createTokenOverviewHandler(async () => fakeOverview)
    await handler({ method: 'GET' } as VercelRequest, response)
    assert.equal(state.statusCode, 503)
    assert.equal(headers.get('cache-control'), 'no-store')
    assert.deepEqual(JSON.parse(state.body), { error: 'TOKEN_DATA_UNAVAILABLE' })
  })
})

test('provider error returns safe 503 without the secret URL', async () => {
  const secret = 'https://example.invalid/private-key'
  await withRpcEnv(secret, async () => {
    const { response, state, headers } = fakeResponse()
    const handler = createTokenOverviewHandler(async () => { throw new Error(`failed at ${secret}`) })
    await handler({ method: 'GET' } as VercelRequest, response)
    assert.equal(state.statusCode, 503)
    assert.equal(headers.get('cache-control'), 'no-store')
    assert.doesNotMatch(state.body, /private-key|example\.invalid/)
  })
})

test('malformed RPC envelope returns only safe 503 and no stale token figures', async () => {
  await withRpcEnv('https://example.invalid/private-key', async () => {
    const { response, state } = fakeResponse()
    const invalidRpc = (async () => Response.json({ jsonrpc: '2.0', id: 99, result: '0x2105' })) as typeof fetch
    const handler = createTokenOverviewHandler((url) => readTokenOverview(url, invalidRpc))
    await handler({ method: 'GET' } as VercelRequest, response)
    assert.equal(state.statusCode, 503)
    assert.deepEqual(JSON.parse(state.body), { error: 'TOKEN_DATA_UNAVAILABLE' })
    assert.doesNotMatch(state.body, /private-key|totalSupply|Strike Robot/)
  })
})
