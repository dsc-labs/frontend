import { Buffer } from 'node:buffer'
import type { TokenOverviewResponse } from './tokenOverviewTypes'

const SR_ADDRESS = '0x10c56F005a379f8eAfc88ff5c3f40d30F0031AC9'
const BASE_CHAIN_ID = '0x2105'

async function rpc<T>(transport: typeof fetch, url: string, method: string, params: unknown[]): Promise<T> {
  const response = await transport(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error(`RPC ${method} failed`)
  const maxBytes = method === 'eth_getBlockByNumber' ? 1_048_576 : 8_192
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new Error('RPC response too large')
  if (!response.body) throw new Error(`RPC ${method} returned no body`)
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let bytes = 0
  let complete = false
  try {
    while (!complete) {
      const chunk = await reader.read()
      if (chunk.done) {
        complete = true
        continue
      }
      bytes += chunk.value.byteLength
      if (bytes > maxBytes) {
        await reader.cancel()
        throw new Error('RPC response too large')
      }
      chunks.push(chunk.value)
    }
  } finally {
    reader.releaseLock()
  }
  let body: unknown
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))
    body = JSON.parse(text)
  } catch {
    throw new Error(`RPC ${method} returned invalid JSON`)
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new Error(`RPC ${method} returned invalid envelope`)
  const envelope = body as { jsonrpc?: unknown; id?: unknown; result?: T; error?: unknown }
  const hasResult = Object.prototype.hasOwnProperty.call(envelope, 'result')
  const hasError = Object.prototype.hasOwnProperty.call(envelope, 'error')
  if (envelope.jsonrpc !== '2.0' || envelope.id !== 1 || hasResult === hasError || hasError || envelope.result == null) {
    throw new Error(`RPC ${method} returned invalid envelope`)
  }
  return envelope.result
}

function hexQuantity(raw: string): number {
  if (typeof raw !== 'string' || !/^0x(?:0|[1-9a-fA-F][0-9a-fA-F]{0,15})$/.test(raw)) {
    throw new Error('Invalid RPC quantity')
  }
  const value = Number(BigInt(raw))
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid RPC quantity')
  return value
}

function uint256(raw: string): bigint {
  if (typeof raw !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(raw)) throw new Error('Invalid ABI uint256')
  return BigInt(raw)
}

function abiString(raw: string): string {
  if (typeof raw !== 'string' || !/^0x(?:[0-9a-fA-F]{2})+$/.test(raw)) throw new Error('Invalid ABI string')
  const body = raw.slice(2)
  if (body.length < 128 || Number(uint256(`0x${body.slice(0, 64)}`)) !== 32) {
    throw new Error('Invalid ABI string offset')
  }
  const length = Number(uint256(`0x${body.slice(64, 128)}`))
  const expectedLength = 128 + Math.ceil(length / 32) * 64
  if (!Number.isSafeInteger(length) || length < 1 || length > 128 || body.length !== expectedLength) {
    throw new Error('Invalid ABI string length')
  }
  const dataEnd = 128 + length * 2
  if (!/^0*$/.test(body.slice(dataEnd))) throw new Error('Invalid ABI string padding')
  let value: string
  try {
    value = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(body.slice(128, dataEnd), 'hex'))
  } catch {
    throw new Error('Invalid ABI UTF-8')
  }
  if (!value.trim()) throw new Error('Invalid ABI string value')
  return value
}

function tokenUnits(raw: bigint, decimals: number): string {
  const unit = 10n ** BigInt(decimals)
  const whole = raw / unit
  const fraction = (raw % unit).toString().padStart(decimals, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

export async function readTokenOverview(
  rpcUrl: string,
  transport: typeof fetch = fetch,
): Promise<TokenOverviewResponse> {
  const chainId = await rpc<string>(transport, rpcUrl, 'eth_chainId', [])
  if (typeof chainId !== 'string' || chainId.toLowerCase() !== BASE_CHAIN_ID) {
    throw new Error('RPC is not Base Mainnet')
  }

  const blockTag = await rpc<string>(transport, rpcUrl, 'eth_blockNumber', [])
  const indexedBlock = hexQuantity(blockTag)
  if (indexedBlock === 0) throw new Error('Invalid Base block')
  const block = await rpc<{ number: string; timestamp: string }>(transport, rpcUrl, 'eth_getBlockByNumber', [blockTag, false])
  if (hexQuantity(block.number) !== indexedBlock) throw new Error('Mismatched Base block')
  const timestamp = hexQuantity(block.timestamp)
  const date = new Date(timestamp * 1000)
  if (timestamp === 0 || !Number.isFinite(date.getTime())) throw new Error('Invalid Base timestamp')

  const call = (selector: string) => rpc<string>(transport, rpcUrl, 'eth_call', [{ to: SR_ADDRESS, data: selector }, blockTag])
  const [nameRaw, symbolRaw, decimalsRaw, supplyRaw] = await Promise.all([
    call('0x06fdde03'), call('0x95d89b41'), call('0x313ce567'), call('0x18160ddd'),
  ])
  const name = abiString(nameRaw)
  const symbol = abiString(symbolRaw)
  const decimals = Number(uint256(decimalsRaw))
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new Error('Invalid ABI decimals')

  return {
    status: 'live',
    source: 'onchain',
    token: { name, symbol, network: 'Base Mainnet', standard: 'ERC-20', decimals, contractAddress: SR_ADDRESS },
    supply: {
      totalSupply: tokenUnits(uint256(supplyRaw), decimals),
      initialSupply: null,
      circulatingSupply: null,
      lockedSupply: null,
      totalBurned: null,
    },
    indexedBlock,
    updatedAt: date.toISOString(),
  }
}
