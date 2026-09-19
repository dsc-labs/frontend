import assert from 'node:assert/strict'
import test from 'node:test'
import { readTokenOverview } from '../lib/tokenOnchainOverview.ts'

const rpcUrl = 'https://example.invalid/private-key'
const blockTag = '0x311e111'

function abiString(value: string): string {
  const data = Buffer.from(value, 'utf8').toString('hex')
  const word = (n: bigint) => n.toString(16).padStart(64, '0')
  return `0x${word(32n)}${word(BigInt(data.length / 2))}${data.padEnd(Math.ceil(data.length / 64) * 64, '0')}`
}

function uint(value: bigint): string {
  return `0x${value.toString(16).padStart(64, '0')}`
}

type RpcCall = { method: string; params: unknown[]; signal: AbortSignal | undefined }

function fakeRpc(overrides: Record<string, unknown> = {}) {
  const calls: RpcCall[] = []
  const transport = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body)) as { method: string; params: unknown[] }
    calls.push({ method: request.method, params: request.params, signal: init?.signal as AbortSignal | undefined })
    const selector = request.method === 'eth_call'
      ? (request.params[0] as { data: string }).data
      : request.method
    const results: Record<string, unknown> = {
      eth_chainId: '0x2105',
      eth_blockNumber: blockTag,
      eth_getBlockByNumber: { number: blockTag, timestamp: '0x68cc0e00' },
      '0x06fdde03': abiString('Strike Robot'),
      '0x95d89b41': abiString('SR'),
      '0x313ce567': uint(18n),
      '0x18160ddd': uint(1_000_000_000n * 10n ** 18n),
      ...overrides,
    }
    return Response.json({ jsonrpc: '2.0', id: 1, result: results[selector] })
  }) as typeof fetch
  return { transport, calls }
}

test('reads verified metadata and exact total supply at one Base block', async () => {
  const { transport, calls } = fakeRpc()
  const result = await readTokenOverview(rpcUrl, transport)
  assert.equal(result.source, 'onchain')
  assert.equal(result.token.name, 'Strike Robot')
  assert.equal(result.token.symbol, 'SR')
  assert.equal(result.token.decimals, 18)
  assert.equal(result.supply.totalSupply, '1000000000')
  assert.equal(result.supply.totalBurned, null)
  assert.equal(result.indexedBlock, 51_503_377)
  assert.ok(calls.filter((call) => call.method === 'eth_call').every((call) => call.params[1] === blockTag))
  assert.ok(calls.every((call) => call.signal instanceof AbortSignal))
})

test('preserves fractional token units without Number rounding', async () => {
  const raw = 9_007_199_254_740_993_123_456_789_125_000_000_000n
  const { transport } = fakeRpc({ '0x18160ddd': uint(raw) })
  const result = await readTokenOverview(rpcUrl, transport)
  assert.equal(result.supply.totalSupply, '9007199254740993123.456789125')
})

test('rejects RPC configured for a non-Base chain', async () => {
  const { transport: wrongChainFetch } = fakeRpc({ eth_chainId: '0x1' })
  await assert.rejects(readTokenOverview(rpcUrl, wrongChainFetch), /Base Mainnet/)
})

test('rejects malformed ABI instead of publishing partial data', async () => {
  const { transport: malformedAbiFetch } = fakeRpc({ '0x06fdde03': '0x' })
  await assert.rejects(readTokenOverview(rpcUrl, malformedAbiFetch), /ABI/)
})

test('propagates transport failure without returning preview data', async () => {
  const transport = (async () => { throw new Error('network unavailable') }) as typeof fetch
  await assert.rejects(readTokenOverview(rpcUrl, transport), /network unavailable/)
})

test('rejects ABI strings with missing padding or invalid UTF-8', async () => {
  const missingPadding = abiString('Strike Robot').slice(0, -2)
  const { transport: truncated } = fakeRpc({ '0x06fdde03': missingPadding })
  await assert.rejects(readTokenOverview(rpcUrl, truncated), /ABI/)

  const valid = abiString('SR')
  const invalidUtf8 = `${valid.slice(0, 130)}ff${valid.slice(132)}`
  const { transport: invalid } = fakeRpc({ '0x95d89b41': invalidUtf8 })
  await assert.rejects(readTokenOverview(rpcUrl, invalid), /UTF-8|ABI/)
})

test('rejects oversized ABI result and noncanonical block quantity', async () => {
  const oversized = `${abiString('SR')}${'00'.repeat(64 * 1024)}`
  const { transport: large } = fakeRpc({ '0x95d89b41': oversized })
  await assert.rejects(readTokenOverview(rpcUrl, large), /large|ABI/i)

  const { transport: leadingZero } = fakeRpc({ eth_blockNumber: '0x000311e111' })
  await assert.rejects(readTokenOverview(rpcUrl, leadingZero), /quantity|ABI/i)
})

test('rejects malformed JSON-RPC envelope instead of treating it as live', async () => {
  const { transport: regular } = fakeRpc()
  const wrongEnvelope = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body)) as { method: string }
    if (request.method === 'eth_chainId') return Response.json({ jsonrpc: '1.0', id: 999, result: '0x2105' })
    return regular(input, init)
  }) as typeof fetch
  await assert.rejects(readTokenOverview(rpcUrl, wrongEnvelope), /RPC/)
})

test('rejects one failed contract call and invalid decimals', async () => {
  const { transport: regular } = fakeRpc()
  const failedSupply = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body)) as { method: string; params: { data?: string }[] }
    if (request.method === 'eth_call' && request.params[0]?.data === '0x18160ddd') {
      return Response.json({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'call failed' } })
    }
    return regular(input, init)
  }) as typeof fetch
  await assert.rejects(readTokenOverview(rpcUrl, failedSupply), /RPC/)

  const { transport: badDecimals } = fakeRpc({ '0x313ce567': uint(255n) })
  await assert.rejects(readTokenOverview(rpcUrl, badDecimals), /decimals/)
})

test('rejects aborted provider request and over-limit streamed JSON', async () => {
  const aborted = (async () => { throw new DOMException('request timed out', 'AbortError') }) as typeof fetch
  await assert.rejects(readTokenOverview(rpcUrl, aborted), /timed out/)

  const huge = (async () => new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: 'x'.repeat(9_000) }))) as typeof fetch
  await assert.rejects(readTokenOverview(rpcUrl, huge), /too large/)
})

test('rejects invalid block timestamp instead of attaching a false freshness date', async () => {
  const { transport } = fakeRpc({ eth_getBlockByNumber: { number: blockTag, timestamp: '0x00' } })
  await assert.rejects(readTokenOverview(rpcUrl, transport), /quantity/)
})
