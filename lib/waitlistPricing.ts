import type { WaitlistState } from './waitlistStore'
import {
  fetchDexscreenerUsdPricesForTokens,
  resolveUsdPrice,
  type ResolvedUsdPrice,
} from './dexscreenerPrices'

export const WAITLIST_SR_TOKEN = '0x10c56F005a379f8eAfc88ff5c3f40d30F0031AC9'
export const WAITLIST_VVV_TOKEN = '0xacfE6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf'

/** Shared Dex → cache → env resolution for register + snapshot runs. */
export async function fetchResolvedSrVvvUsd(state: WaitlistState): Promise<{
  resolvedSr: ResolvedUsdPrice
  resolvedVvv: ResolvedUsdPrice
  dexSr: number | null
  dexVvv: number | null
}> {
  const envSrUsd = Number(process.env.SR_USD_PRICE ?? '0.02')
  const envVvvUsd = Number(process.env.VVV_USD_PRICE ?? '0.02')

  let dexMap = new Map<string, number | null>()
  try {
    dexMap = await fetchDexscreenerUsdPricesForTokens([WAITLIST_SR_TOKEN, WAITLIST_VVV_TOKEN])
  } catch {
    dexMap = new Map([
      [WAITLIST_SR_TOKEN.toLowerCase(), null],
      [WAITLIST_VVV_TOKEN.toLowerCase(), null],
    ])
  }

  const dexSr = dexMap.get(WAITLIST_SR_TOKEN.toLowerCase()) ?? null
  const dexVvv = dexMap.get(WAITLIST_VVV_TOKEN.toLowerCase()) ?? null
  const cachedSr = state.lastUsdPrices?.srUsd
  const cachedVvv = state.lastUsdPrices?.vvvUsd

  const resolvedSr = resolveUsdPrice({
    dexPrice: dexSr,
    cachedPrice: cachedSr,
    envPrice: envSrUsd,
  })
  const resolvedVvv = resolveUsdPrice({
    dexPrice: dexVvv,
    cachedPrice: cachedVvv,
    envPrice: envVvvUsd,
  })

  return { resolvedSr, resolvedVvv, dexSr, dexVvv }
}
