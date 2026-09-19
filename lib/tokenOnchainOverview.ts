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
  const body = await response.json() as { result?: T; error?: unknown }
  if (body.error || body.result === undefined || body.result === null) throw new Error(`RPC ${method} failed`)
  return body.result
}

function hexNumber(raw: string): number {
  if (typeof raw !== 'string' || !/^0x[0-9a-fA-F]+$/.test(raw)) throw new Error('Invalid ABI hex')
  const value = Number(BigInt(raw))
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid ABI integer')
  return value
}

function uint256(raw: string): bigint {
  if (typeof raw !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(raw)) throw new Error('Invalid ABI uint256')
  return BigInt(raw)
}

function abiString(raw: string): string {
  if (typeof raw !== 'string' || !/^0x(?:[0-9a-fA-F]{2})+$/.test(raw)) throw new Error('Invalid ABI string')
  const body = raw.slice(2)
  const offset = hexNumber(`0x${body.slice(0, 64)}`) * 2
  if (offset !== 64 || body.length < offset + 64) throw new Error('Invalid ABI string offset')
  const length = hexNumber(`0x${body.slice(offset, offset + 64)}`)
  if (length < 1 || length > 128 || body.length < offset + 64 + length * 2) {
    throw new Error('Invalid ABI string length')
  }
  const value = Buffer.from(body.slice(offset + 64, offset + 64 + length * 2), 'hex').toString('utf8')
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
  const indexedBlock = hexNumber(blockTag)
  if (indexedBlock === 0) throw new Error('Invalid Base block')
  const block = await rpc<{ number: string; timestamp: string }>(transport, rpcUrl, 'eth_getBlockByNumber', [blockTag, false])
  if (hexNumber(block.number) !== indexedBlock) throw new Error('Mismatched Base block')
  const timestamp = hexNumber(block.timestamp)
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
