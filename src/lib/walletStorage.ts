/** Persisted EIP-155 address for contributor identity (same origin only; not a secret). */

export const WALLET_ADDRESS_KEY = 'mma_robot_wallet_address'

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/

export function isLikelyEthAddress(s: string): boolean {
  return ETH_ADDRESS_RE.test(s.trim())
}

export function readStoredWalletAddress(): string | null {
  try {
    const raw = localStorage.getItem(WALLET_ADDRESS_KEY)?.trim()
    if (!raw || !isLikelyEthAddress(raw)) return null
    return raw
  } catch {
    return null
  }
}

export function storeWalletAddress(address: string) {
  const a = address.trim()
  if (!isLikelyEthAddress(a)) return
  try {
    localStorage.setItem(WALLET_ADDRESS_KEY, a)
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearStoredWalletAddress() {
  try {
    localStorage.removeItem(WALLET_ADDRESS_KEY)
  } catch {
    /* ignore */
  }
}
