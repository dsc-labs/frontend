import { jsonRpc } from './baseJsonRpc'

type BlockHeader = {
  number: string
  timestamp: string
}

function parseBlockNumber(hex: string): number {
  return Number.parseInt(hex, 16)
}

function parseBlockTimestamp(hex: string): number {
  return Number.parseInt(hex, 16)
}

export function blockNumberToHex(n: number): `0x${string}` {
  return `0x${n.toString(16)}` as `0x${string}`
}

async function getBlockByNumber(rpcUrl: string, blockNumber: number): Promise<BlockHeader> {
  return jsonRpc<BlockHeader>(rpcUrl, 'eth_getBlockByNumber', [blockNumberToHex(blockNumber), false])
}

/**
 * Largest block whose `timestamp` (seconds) is **≤** `targetTimestampSec`.
 * Requires an archive/full node for old targets.
 */
export async function findBlockNumberAtOrBefore(
  rpcUrl: string,
  targetTimestampSec: number,
): Promise<{ blockNumber: number; blockTimestampSec: number }> {
  const latestHex = await jsonRpc<string>(rpcUrl, 'eth_blockNumber', [])
  let hi = parseBlockNumber(latestHex)
  const latest = await getBlockByNumber(rpcUrl, hi)
  const latestTs = parseBlockTimestamp(latest.timestamp)
  if (targetTimestampSec >= latestTs) {
    return { blockNumber: hi, blockTimestampSec: latestTs }
  }

  let lo = 0
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2)
    const block = await getBlockByNumber(rpcUrl, mid)
    const ts = parseBlockTimestamp(block.timestamp)
    if (ts <= targetTimestampSec) lo = mid
    else hi = mid - 1
  }

  const chosen = await getBlockByNumber(rpcUrl, lo)
  return {
    blockNumber: lo,
    blockTimestampSec: parseBlockTimestamp(chosen.timestamp),
  }
}
