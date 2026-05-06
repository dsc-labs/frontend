export type PriceSource = 'dexscreener' | 'cached' | 'env'

export type ResolvedUsdPrice = {
  usd: number
  source: PriceSource
}

type DexPair = {
  chainId?: string
  baseToken?: { address?: string }
  priceUsd?: string
  liquidity?: { usd?: number }
}

type DexTokensResponse = {
  pairs?: DexPair[]
}

function normalizeAddr(a: string): string {
  return a.trim().toLowerCase()
}

/** Best USD price for token when it is the pair baseToken on Base (highest liquidity). */
export function pickBestBaseTokenPriceUsd(pairs: DexPair[] | undefined, tokenAddress: string, chainId = 'base'): number | null {
  if (!pairs?.length) return null
  const t = normalizeAddr(tokenAddress)
  const candidates = pairs.filter(
    (p) => p.chainId === chainId && p.baseToken?.address && normalizeAddr(p.baseToken.address) === t && p.priceUsd,
  )
  if (!candidates.length) return null
  candidates.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))
  const n = Number(candidates[0]?.priceUsd)
  return Number.isFinite(n) && n > 0 ? n : null
}

export async function fetchDexscreenerUsdPricesForTokens(tokenAddresses: string[]): Promise<Map<string, number | null>> {
  const out = new Map<string, number | null>()
  const unique = [...new Set(tokenAddresses.map(normalizeAddr))]
  unique.forEach((a) => out.set(a, null))

  if (!unique.length) return out

  const url = `https://api.dexscreener.com/latest/dex/tokens/${unique.join(',')}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return out

  const json = (await res.json()) as DexTokensResponse
  const pairs = json.pairs ?? []
  for (const addr of unique) {
    out.set(addr, pickBestBaseTokenPriceUsd(pairs, addr))
  }
  return out
}

export function resolveUsdPrice(params: {
  dexPrice: number | null
  cachedPrice: number | undefined
  envPrice: number
}): ResolvedUsdPrice {
  if (params.dexPrice !== null && Number.isFinite(params.dexPrice) && params.dexPrice > 0) {
    return { usd: params.dexPrice, source: 'dexscreener' }
  }
  if (
    params.cachedPrice !== undefined &&
    Number.isFinite(params.cachedPrice) &&
    params.cachedPrice > 0
  ) {
    return { usd: params.cachedPrice, source: 'cached' }
  }
  const fallback = Number.isFinite(params.envPrice) && params.envPrice > 0 ? params.envPrice : 0.02
  return { usd: fallback, source: 'env' }
}
