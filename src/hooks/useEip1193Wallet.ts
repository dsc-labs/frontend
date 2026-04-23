/**
 * Browser wallet (EIP-1193) — same flow as Mujoco_web `src/wallet.js`:
 * `eth_requestAccounts` / `eth_accounts` + `accountsChanged`.
 */

import { useCallback, useEffect, useState } from 'react'
import { clearStoredWalletAddress, storeWalletAddress } from '../lib/walletStorage'

type EthereumLike = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
}

function getEthereum(): EthereumLike | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { ethereum?: EthereumLike }).ethereum
}

export function shortenAddress(addr: string) {
  if (addr.length < 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function useEip1193Wallet() {
  const [address, setAddress] = useState<string | null>(null)
  /** User clicked Disconnect — hide session until they Connect again (extension may still be authorized). */
  const [sessionHidden, setSessionHidden] = useState(false)

  const readAccounts = useCallback(async () => {
    const eth = getEthereum()
    if (!eth || sessionHidden) return
    try {
      const accounts = (await eth.request({ method: 'eth_accounts' })) as string[]
      const next = accounts[0] ?? null
      if (next) {
        storeWalletAddress(next)
        setAddress(next)
      } else {
        clearStoredWalletAddress()
        setAddress(null)
      }
    } catch {
      clearStoredWalletAddress()
      setAddress(null)
    }
  }, [sessionHidden])

  useEffect(() => {
    void readAccounts()
  }, [readAccounts])

  useEffect(() => {
    const eth = getEthereum()
    if (!eth?.on) return
    const handler = (accounts: unknown) => {
      if (sessionHidden) return
      const list = accounts as string[]
      const next = list?.[0] ?? null
      if (next) {
        storeWalletAddress(next)
        setAddress(next)
      } else {
        clearStoredWalletAddress()
        setAddress(null)
      }
    }
    eth.on('accountsChanged', handler)
    return () => eth.removeListener?.('accountsChanged', handler)
  }, [sessionHidden])

  const connect = useCallback(async () => {
    const eth = getEthereum()
    if (!eth) {
      window.alert('No Ethereum wallet found. Install MetaMask or another EIP-1193 wallet.')
      return
    }
    try {
      setSessionHidden(false)
      const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[]
      const next = accounts[0] ?? null
      if (next) storeWalletAddress(next)
      setAddress(next)
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code
      if (code !== 4001) {
        console.error('Wallet connection error:', err)
      }
    }
  }, [])

  const disconnect = useCallback(() => {
    setSessionHidden(true)
    clearStoredWalletAddress()
    setAddress(null)
  }, [])

  return {
    address,
    shortAddress: address ? shortenAddress(address) : null,
    hasProvider: typeof window !== 'undefined' && !!getEthereum(),
    connect,
    disconnect,
    sessionHidden,
  }
}
