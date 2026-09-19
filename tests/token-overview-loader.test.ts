import assert from 'node:assert/strict'
import test from 'node:test'
import { createTokenOverviewLoader } from '../src/pages/StrikeToken/tokenOverviewLoader.ts'

const overview = {
  status: 'live', source: 'onchain',
  token: {
    name: 'Strike Robot', symbol: 'SR', network: 'Base Mainnet', standard: 'ERC-20',
    decimals: 18, contractAddress: '0x10c56F005a379f8eAfc88ff5c3f40d30F0031AC9',
  },
  supply: {
    totalSupply: '1000000000', initialSupply: null, circulatingSupply: null,
    lockedSupply: null, totalBurned: null,
  },
  indexedBlock: 51_503_377, updatedAt: '2026-09-19T00:00:00.000Z',
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

test('loads verified overview and moves loading to live', async () => {
  const states: string[] = []
  const transport = (async () => Response.json(overview)) as typeof fetch
  const loader = createTokenOverviewLoader(transport)
  await loader.load((load) => states.push(load.state))
  assert.deepEqual(states, ['loading', 'live'])
})

test('invalid payload and HTTP failure become errors; retry can recover', async () => {
  let requests = 0
  const transport = (async () => {
    requests += 1
    if (requests === 1) return Response.json({ ...overview, supply: { ...overview.supply, totalBurned: '123' } })
    if (requests === 2) return new Response('unavailable', { status: 503 })
    return Response.json(overview)
  }) as typeof fetch
  const states: string[] = []
  const loader = createTokenOverviewLoader(transport)
  for (let i = 0; i < 3; i += 1) await loader.load((load) => states.push(load.state))
  assert.deepEqual(states, ['loading', 'error', 'loading', 'error', 'loading', 'live'])
})

test('superseded and disposed requests never publish stale data', async () => {
  const first = deferred<Response>()
  const second = deferred<Response>()
  let requests = 0
  const transport = (async () => {
    requests += 1
    return requests === 1 ? first.promise : second.promise
  }) as typeof fetch
  const states: string[] = []
  const loader = createTokenOverviewLoader(transport)
  const oldRequest = loader.load((load) => states.push(load.state))
  const newRequest = loader.load((load) => states.push(load.state))
  first.resolve(Response.json(overview))
  await oldRequest
  assert.deepEqual(states, ['loading', 'loading'])
  loader.dispose()
  second.resolve(Response.json(overview))
  await newRequest
  assert.deepEqual(states, ['loading', 'loading'])
})
