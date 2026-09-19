import { useEffect, useRef, useState } from 'react'
import type { TokenOverviewResponse } from '../../../lib/tokenOverviewTypes'

export type TokenLoad =
  | { state: 'loading'; data: null }
  | { state: 'live'; data: TokenOverviewResponse }
  | { state: 'error'; data: null }

function isTokenOverview(value: unknown): value is TokenOverviewResponse {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<TokenOverviewResponse>
  return candidate.status === 'live' && candidate.source === 'onchain' &&
    candidate.token?.contractAddress === '0x10c56F005a379f8eAfc88ff5c3f40d30F0031AC9' &&
    candidate.token.network === 'Base Mainnet' &&
    candidate.token.standard === 'ERC-20' &&
    typeof candidate.token.name === 'string' &&
    typeof candidate.token.symbol === 'string' &&
    typeof candidate.token.decimals === 'number' &&
    typeof candidate.supply?.totalSupply === 'string' &&
    /^\d+(?:\.\d+)?$/.test(candidate.supply.totalSupply) &&
    candidate.supply.initialSupply === null &&
    candidate.supply.circulatingSupply === null &&
    candidate.supply.lockedSupply === null &&
    candidate.supply.totalBurned === null &&
    typeof candidate.indexedBlock === 'number' && Number.isSafeInteger(candidate.indexedBlock) &&
    typeof candidate.updatedAt === 'string' && !Number.isNaN(Date.parse(candidate.updatedAt))
}

export function useTokenOverview() {
  const [load, setLoad] = useState<TokenLoad>({ state: 'loading', data: null })
  const [generation, setGeneration] = useState(0)
  const sequence = useRef(0)

  useEffect(() => {
    const requestId = ++sequence.current
    const controller = new AbortController()
    setLoad({ state: 'loading', data: null })

    void (async () => {
      try {
        const response = await fetch('/api/token/overview', { signal: controller.signal })
        if (!response.ok) throw new Error('Token overview unavailable')
        const payload: unknown = await response.json()
        if (!isTokenOverview(payload)) throw new Error('Invalid token overview')
        if (!controller.signal.aborted && requestId === sequence.current) {
          setLoad({ state: 'live', data: payload })
        }
      } catch {
        if (!controller.signal.aborted && requestId === sequence.current) {
          setLoad({ state: 'error', data: null })
        }
      }
    })()

    return () => controller.abort()
  }, [generation])

  return { ...load, retry: () => setGeneration((value) => value + 1) }
}
