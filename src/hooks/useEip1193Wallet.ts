import { useCallback, useEffect, useState } from 'react'
import { useWallets, useLogin, useLogout, usePrivy } from '@privy-io/react-auth'
import { clearStoredWalletAddress, shortenAddress, storeWalletAddress } from '../lib/walletStorage'

export { shortenAddress }

export function useEip1193Wallet() {
  const { ready, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const [localAddress, setLocalAddress] = useState<string | null>(null)
  const [sessionHidden, setSessionHidden] = useState(false)

  const { login } = useLogin({
    onComplete: ({ user }) => {
      setSessionHidden(false)
      const walletAccount = user.linkedAccounts.find(
        (a) => a.type === 'wallet' && 'address' in a,
      ) as { address: string } | undefined
      if (walletAccount?.address) {
        setLocalAddress(walletAccount.address)
      }
    },
  })

  const { logout } = useLogout({
    onSuccess: () => {
      setLocalAddress(null)
      clearStoredWalletAddress()
    },
  })

  // Keep localAddress in sync with Privy wallet state
  const privyAddress = wallets[0]?.address ?? null
  useEffect(() => {
    if (!sessionHidden && privyAddress) setLocalAddress(privyAddress)
  }, [privyAddress, sessionHidden])

  const address = sessionHidden ? null : localAddress ?? privyAddress

  useEffect(() => {
    if (address) {
      storeWalletAddress(address)
    } else {
      clearStoredWalletAddress()
    }
  }, [address])

  const disconnect = useCallback(() => {
    setSessionHidden(true)
    setLocalAddress(null)
    clearStoredWalletAddress()
    if (!ready || !authenticated) return
    logout().catch(() => {
      /* ignore if session already gone */
    })
  }, [logout, ready, authenticated])

  return {
    address,
    shortAddress: address ? shortenAddress(address) : null,
    hasProvider: ready,
    connect: login,
    disconnect,
    sessionHidden,
  }
}
